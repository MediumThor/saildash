#!/bin/bash

# Proteus Mode Switcher
# Usage: ./switch-mode.sh [local|online]

if [ $# -eq 0 ]; then
    echo "Usage: ./switch-mode.sh [local|online]"
    echo ""
    echo "Current mode: $(grep '^PROTEUS_MODE=' proteus-config.env | cut -d'=' -f2)"
    echo ""
    echo "To switch to online mode:"
    echo "1. Edit proteus-config.env and set your API key"
    echo "2. Run: ./switch-mode.sh online"
    echo ""
    echo "To switch to local mode:"
    echo "Run: ./switch-mode.sh local"
    exit 1
fi

MODE=$1

if [ "$MODE" != "local" ] && [ "$MODE" != "online" ]; then
    echo "Error: Mode must be 'local' or 'online'"
    exit 1
fi

echo "Switching Proteus to $MODE mode..."

# Update the configuration
sed -i "s/^PROTEUS_MODE=.*/PROTEUS_MODE=$MODE/" proteus-config.env

if [ "$MODE" = "online" ]; then
    echo ""
    echo "⚠️  IMPORTANT: You need to set your API key!"
    echo "Edit proteus-config.env and replace 'your_api_key_here' with your actual API key"
    echo ""
    echo "Example:"
    echo "OPENAI_API_KEY=sk-your-actual-api-key-here"
    echo ""
fi

# Restart services
echo "Restarting Proteus services..."
./proteus-control.sh restart

echo ""
echo "✅ Proteus is now running in $MODE mode"
echo "Check status with: ./proteus-control.sh status" 