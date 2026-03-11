function jarvis --description "Launch Jarvis Voice chat"
    set -l jarvis_dir "/Users/jamestunick/Applications/happy/31126/rn-jarvis"

    # Kill any existing Jarvis server
    lsof -ti:3456 2>/dev/null | xargs kill 2>/dev/null

    # Load env vars from .env
    if test -f "$jarvis_dir/.env"
        for line in (grep -v '^#' "$jarvis_dir/.env" | grep '=')
            set -l key (echo $line | cut -d= -f1)
            set -l val (echo $line | cut -d= -f2-)
            set -gx $key $val
        end
    end

    # Build if dist is stale
    if not test -f "$jarvis_dir/dist/bin/cli.js"
        echo "Building Jarvis..."
        npm --prefix $jarvis_dir run build
    end

    echo "Starting Jarvis Voice at http://localhost:3456"
    node "$jarvis_dir/dist/bin/cli.js" $argv
end
