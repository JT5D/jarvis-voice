import React, { useCallback } from 'react';
import { useJarvis } from './useJarvis.js';

const STATUS_LABELS: Record<string, string> = {
  idle: 'Tap to talk', listening: 'Listening...', thinking: 'Thinking...', speaking: 'Speaking...', error: 'Error',
};

const STATUS_COLORS: Record<string, string> = {
  idle: '#4A90D9', listening: '#E74C3C', thinking: '#F39C12', speaking: '#2ECC71', error: '#95A5A6',
};

export interface JarvisVoiceButtonProps {
  size?: number;
  style?: React.CSSProperties;
}

export function JarvisVoiceButton({ size = 64, style }: JarvisVoiceButtonProps) {
  const { state, startListening, stopListening } = useJarvis();
  const { status } = state;

  const handlePress = useCallback(async () => {
    if (status === 'listening') await stopListening();
    else if (status === 'idle' || status === 'error') await startListening();
  }, [status, startListening, stopListening]);

  const color = STATUS_COLORS[status] ?? STATUS_COLORS.idle;
  const isActive = status === 'listening';

  return (
    <button
      onClick={handlePress}
      aria-label={STATUS_LABELS[status]}
      style={{
        width: size, height: size, borderRadius: '50%', backgroundColor: color,
        border: 'none', cursor: status === 'thinking' || status === 'speaking' ? 'wait' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s ease',
        transform: isActive ? 'scale(1.1)' : 'scale(1)',
        boxShadow: isActive ? `0 0 20px ${color}80` : '0 2px 8px rgba(0,0,0,0.2)',
        ...style,
      }}
    >
      <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="white">
        {status === 'listening'
          ? <rect x="6" y="6" width="12" height="12" rx="2" />
          : <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z" />
        }
      </svg>
    </button>
  );
}
