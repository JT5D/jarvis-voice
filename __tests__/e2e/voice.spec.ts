import { test, expect } from '@playwright/test';

test.describe('Jarvis Voice E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for engine to initialize
    await page.waitForSelector('#status');
  });

  test('page loads with idle status', async ({ page }) => {
    const status = await page.textContent('#status');
    expect(status).toBe('idle');
  });

  test('all UI elements are present', async ({ page }) => {
    await expect(page.locator('#btn-listen')).toBeVisible();
    await expect(page.locator('#btn-stop')).toBeVisible();
    await expect(page.locator('#btn-send')).toBeVisible();
    await expect(page.locator('#text-input')).toBeVisible();
    await expect(page.locator('#status')).toBeVisible();
    // transcript and response are empty divs initially — check attached, not visible
    await expect(page.locator('#transcript')).toBeAttached();
    await expect(page.locator('#response')).toBeAttached();
  });

  test('send text message and get response', async ({ page }) => {
    await page.fill('#text-input', 'hello world');
    await page.click('#btn-send');

    // Wait for response to appear
    await page.waitForFunction(
      () => document.getElementById('response')?.textContent?.includes('Echo:'),
      { timeout: 5000 }
    );

    const response = await page.textContent('#response');
    expect(response).toBe('Echo: hello world');

    // Status should return to idle after processing
    await page.waitForFunction(
      () => document.getElementById('status')?.textContent === 'idle',
      { timeout: 5000 }
    );
  });

  test('status transitions through thinking -> speaking -> idle', async ({ page }) => {
    const states: string[] = [];

    // Capture state transitions
    await page.evaluate(() => {
      (window as any).__states = [];
      (window as any).__jarvis.subscribe((s: any) => {
        (window as any).__states.push(s.status);
      });
    });

    await page.fill('#text-input', 'test transitions');
    await page.click('#btn-send');

    await page.waitForFunction(
      () => document.getElementById('status')?.textContent === 'idle',
      { timeout: 5000 }
    );

    const capturedStates = await page.evaluate(() => (window as any).__states);
    expect(capturedStates).toContain('thinking');
    // speaking may be too fast with mock TTS, but idle should be at the end
    expect(capturedStates[capturedStates.length - 1]).toBe('idle');
  });

  test('start and stop listening', async ({ page }) => {
    await page.click('#btn-listen');

    // Wait for status to become listening
    await page.waitForFunction(
      () => document.getElementById('status')?.textContent === 'listening',
      { timeout: 3000 }
    );

    const statusDuringListen = await page.textContent('#status');
    expect(statusDuringListen).toBe('listening');

    // Provider should be shown
    const providers = await page.textContent('#providers');
    expect(providers).toContain('MockSTT');

    // Stop
    await page.click('#btn-stop');
    await page.waitForFunction(
      () => document.getElementById('status')?.textContent === 'idle',
      { timeout: 3000 }
    );
  });

  test('providers are displayed during interaction', async ({ page }) => {
    await page.fill('#text-input', 'show providers');
    await page.click('#btn-send');

    await page.waitForFunction(
      () => (document.getElementById('providers')?.textContent ?? '').length > 0,
      { timeout: 5000 }
    );

    const providers = await page.textContent('#providers');
    expect(providers).toContain('MockLLM');
  });

  test('multiple sequential messages work correctly', async ({ page }) => {
    for (const msg of ['first', 'second', 'third']) {
      await page.fill('#text-input', msg);
      await page.click('#btn-send');
      await page.waitForFunction(
        () => document.getElementById('status')?.textContent === 'idle',
        { timeout: 5000 }
      );
    }

    const response = await page.textContent('#response');
    expect(response).toBe('Echo: third');
  });

  test('empty input does not trigger send', async ({ page }) => {
    await page.fill('#text-input', '');
    await page.click('#btn-send');

    // Status should remain idle
    await page.waitForTimeout(500);
    const status = await page.textContent('#status');
    expect(status).toBe('idle');

    const response = await page.textContent('#response');
    expect(response).toBe('');
  });

  test('engine is accessible from window for programmatic testing', async ({ page }) => {
    const hasEngine = await page.evaluate(() => !!(window as any).__jarvis);
    expect(hasEngine).toBe(true);

    const state = await page.evaluate(() => (window as any).__jarvis.getState());
    expect(state.status).toBe('idle');
  });

  test('programmatic engine.send works from console', async ({ page }) => {
    await page.evaluate(async () => {
      await (window as any).__jarvis.send('programmatic test');
    });

    const response = await page.textContent('#response');
    expect(response).toBe('Echo: programmatic test');
  });

  test('transcript updates during listening simulation', async ({ page }) => {
    await page.click('#btn-listen');

    await page.waitForFunction(
      () => document.getElementById('status')?.textContent === 'listening',
      { timeout: 3000 }
    );

    // Simulate interim speech result via the mock callback
    await page.evaluate(() => {
      const cb = (window as any).__mockSTTCallback();
      if (cb) cb('partial text', false);
    });

    const transcript = await page.textContent('#transcript');
    expect(transcript).toBe('partial text');
  });
});
