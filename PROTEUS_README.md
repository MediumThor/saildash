# Proteus AI - Marine Navigation Assistant

Proteus is an AI assistant designed specifically for marine navigation and sailing decisions, integrated into the SailDash system.

## Features

- **Local Mode**: Uses TinyLlama 1.1B model running locally on Raspberry Pi 5
- **Online Mode**: Can connect to OpenAI API for enhanced responses (Proteus+)
- **Marine-Focused**: Specialized in sailing, navigation, and maritime topics
- **Persistent**: Automatically starts on boot
- **Configurable**: Easy switching between local and online modes

## Current Setup

### Local Mode (Default)
- **Model**: TinyLlama 1.1B Chat (Q4_0 quantization)
- **Context**: 256 tokens
- **Threads**: 1 (optimized for ARM64)
- **Response Length**: 64 tokens (concise)
- **Temperature**: 0.7

### Online Mode (Proteus+)
- **Model**: GPT-3.5-turbo (configurable)
- **Response Length**: 150 tokens
- **Temperature**: 0.7
- **Requires**: OpenAI API key

## Quick Start

### Check Status
```bash
./proteus-control.sh status
```

### Start Services
```bash
./proteus-control.sh start
```

### Stop Services
```bash
./proteus-control.sh stop
```

### Restart Services
```bash
./proteus-control.sh restart
```

### View Configuration
```bash
./proteus-control.sh config
```

## Configuration

Edit `proteus-config.env` to change settings:

### Switch to Online Mode
```bash
# Change this line in proteus-config.env
PROTEUS_MODE=online

# Uncomment and set your API key
OPENAI_API_KEY=your_api_key_here
```

### Adjust Local Settings
```bash
# In proteus-config.env
MAX_TOKENS=64          # Response length
TEMPERATURE=0.7        # Creativity (0.0-1.0)
```

## API Endpoints

### Health Check
```bash
curl http://localhost:3001/api/health
```

### Chat
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the best way to anchor in 20 knots of wind?"}'
```

### Configuration
```bash
curl http://localhost:3001/api/config
```

## Frontend Integration

The AI Chat is accessible via:
- **Header**: Chat icon in the top-right corner
- **URL**: `http://localhost:5175/ai-chat`

## Auto-Start on Boot

Services are configured to start automatically on boot via crontab:
```bash
@reboot /home/pi5/saildash/proteus-startup.sh
```

## Logs

- **Proteus Server**: `proteus.log`
- **Llama Server**: `llama-server.log`
- **Boot Log**: `boot.log`

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 3001
sudo lsof -i :3001

# Kill the process
kill <PID>
```

### Services Not Starting
```bash
# Check logs
tail -f proteus.log
tail -f llama-server.log

# Restart services
./proteus-control.sh restart
```

### Model Loading Issues
```bash
# Check if model file exists
ls -la /home/pi5/models/tinyllama-1.1b-chat-v1.0.Q4_0.gguf

# Verify llama-server binary
ls -la /home/pi5/llama.cpp/build/bin/llama-server
```

## Performance

### Local Mode (TinyLlama 1.1B)
- **Memory Usage**: ~600MB
- **Response Time**: 2-5 seconds
- **Quality**: Good for basic marine navigation queries
- **Offline**: Works without internet

### Online Mode (GPT-3.5-turbo)
- **Memory Usage**: Minimal
- **Response Time**: 1-3 seconds
- **Quality**: Excellent, more detailed responses
- **Requires**: Internet connection and API key

## Security

- Services run as user `pi5`
- No privileged access
- CORS enabled for frontend
- API key stored in environment variables

## Files

- `proteus_server.js` - Main server application
- `proteus-control.sh` - Service management script
- `proteus-config.env` - Configuration file
- `proteus-startup.sh` - Boot startup script
- `llama-server.service` - Systemd service (backup)
- `proteus.service` - Systemd service (backup)

## Development

To modify the AI behavior, edit the system prompts in `proteus_server.js`:

```javascript
// Local mode prompt
content: 'You are Proteus, a marine navigation AI assistant. Keep responses concise and practical for sailing.'

// Online mode prompt  
content: 'You are Proteus+, an advanced marine navigation AI assistant. Provide concise, practical sailing advice and navigation support.'
``` 