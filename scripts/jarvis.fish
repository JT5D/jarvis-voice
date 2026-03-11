function jarvis --description "Launch Jarvis Voice chat"
    set -l jarvis_dir "/Users/jamestunick/Applications/happy/31126/rn-jarvis"

    # Kill any existing Jarvis server
    lsof -ti:3456 2>/dev/null | xargs kill 2>/dev/null

    # Build if dist is stale
    if not test -f "$jarvis_dir/dist/bin/cli.js"
        echo "Building Jarvis..."
        npm --prefix $jarvis_dir run build
    end

    # Pass through env vars for premium providers
    echo "Starting Jarvis Voice at http://localhost:3456"
    node "$jarvis_dir/dist/bin/cli.js" $argv
end
