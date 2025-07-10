#!/bin/bash

# Proteus Control Script
# Usage: ./proteus-control.sh [start|stop|status|restart|config]

# Load configuration
if [ -f /home/pi5/saildash/proteus-config.env ]; then
    source /home/pi5/saildash/proteus-config.env
else
    echo "Warning: proteus-config.env not found, using defaults"
    PROTEUS_MODE=local
fi

case "$1" in
    start)
        echo "Starting Proteus services..."
        echo "Mode: $PROTEUS_MODE"
        
        if [ "$PROTEUS_MODE" = "local" ]; then
            # Start llama-server manually
            cd /home/pi5/llama.cpp/build/bin
            nohup ./llama-server -m /home/pi5/models/llama-3.2-3b-instruct-q4_k_m.gguf -c 512 -t 2 --repeat-penalty 1.1 --port 3002 > /home/pi5/saildash/llama-server.log 2>&1 &
            echo $! > /home/pi5/saildash/llama-server.pid
            
            # Wait for llama-server to start
            sleep 5
        fi
        
        # Start Proteus server with environment variables
        cd /home/pi5/saildash
        export PROTEUS_MODE
        export LLAMA_SERVER_URL
        export MODEL_NAME
        export MAX_TOKENS
        export TEMPERATURE
        export OPENAI_API_KEY
        export OPENAI_API_URL
        export OPENAI_MODEL
        export ONLINE_MAX_TOKENS
        export ONLINE_TEMPERATURE
        
        nohup node proteus_server.js > proteus.log 2>&1 &
        echo $! > proteus.pid
        
        echo "Proteus services started"
        if [ "$PROTEUS_MODE" = "local" ]; then
            echo "llama-server PID: $(cat llama-server.pid)"
        fi
        echo "proteus PID: $(cat proteus.pid)"
        ;;
    stop)
        echo "Stopping Proteus services..."
        if [ -f /home/pi5/saildash/llama-server.pid ]; then
            kill $(cat /home/pi5/saildash/llama-server.pid) 2>/dev/null
            rm /home/pi5/saildash/llama-server.pid
        fi
        if [ -f /home/pi5/saildash/proteus.pid ]; then
            kill $(cat /home/pi5/saildash/proteus.pid) 2>/dev/null
            rm /home/pi5/saildash/proteus.pid
        fi
        echo "Proteus services stopped"
        ;;
    status)
        echo "Proteus services status:"
        echo "Mode: $PROTEUS_MODE"
        
        if [ "$PROTEUS_MODE" = "local" ]; then
            if [ -f /home/pi5/saildash/llama-server.pid ]; then
                if kill -0 $(cat /home/pi5/saildash/llama-server.pid) 2>/dev/null; then
                    echo "llama-server: RUNNING (PID: $(cat /home/pi5/saildash/llama-server.pid))"
                else
                    echo "llama-server: NOT RUNNING"
                fi
            else
                echo "llama-server: NOT RUNNING"
            fi
        fi
        
        if [ -f /home/pi5/saildash/proteus.pid ]; then
            if kill -0 $(cat /home/pi5/saildash/proteus.pid) 2>/dev/null; then
                echo "proteus: RUNNING (PID: $(cat /home/pi5/saildash/proteus.pid))"
            else
                echo "proteus: NOT RUNNING"
            fi
        else
            echo "proteus: NOT RUNNING"
        fi
        
        # Check if ports are listening
        if [ "$PROTEUS_MODE" = "local" ]; then
            if netstat -tlnp 2>/dev/null | grep :3002 > /dev/null; then
                echo "Port 3002 (llama-server): LISTENING"
            else
                echo "Port 3002 (llama-server): NOT LISTENING"
            fi
        fi
        
        if netstat -tlnp 2>/dev/null | grep :3001 > /dev/null; then
            echo "Port 3001 (proteus): LISTENING"
        else
            echo "Port 3001 (proteus): NOT LISTENING"
        fi
        ;;
    config)
        echo "Current Proteus configuration:"
        echo "Mode: $PROTEUS_MODE"
        if [ "$PROTEUS_MODE" = "local" ]; then
            echo "Local LLM: $MODEL_NAME"
            echo "Server URL: $LLAMA_SERVER_URL"
            echo "Max Tokens: $MAX_TOKENS"
            echo "Temperature: $TEMPERATURE"
        else
            echo "Online API: $OPENAI_MODEL"
            echo "API Configured: $([ -n "$OPENAI_API_KEY" ] && echo "YES" || echo "NO")"
        fi
        ;;
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
    *)
        echo "Usage: $0 {start|stop|status|restart|config}"
        echo ""
        echo "Commands:"
        echo "  start   - Start Proteus services"
        echo "  stop    - Stop Proteus services"
        echo "  status  - Show service status"
        echo "  config  - Show current configuration"
        echo "  restart - Restart all services"
        echo ""
        echo "Configuration: Edit proteus-config.env to change settings"
        exit 1
        ;;
esac 