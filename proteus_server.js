import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Load configuration from file
function loadConfig() {
    try {
        const configContent = readFileSync('./proteus-config.env', 'utf8');
        const config = {};
        
        configContent.split('\n').forEach(line => {
            if (line && !line.startsWith('#') && line.includes('=')) {
                const [key, value] = line.split('=');
                config[key.trim()] = value.trim();
            }
        });
        
        return config;
    } catch (error) {
        console.warn('Could not load config file, using defaults');
        return {};
    }
}

const envConfig = loadConfig();

// Configuration
let CONFIG = {
  // Mode: 'local' or 'online'
  mode: envConfig.PROTEUS_MODE || process.env.PROTEUS_MODE || 'local',
  
  // Local LLM settings
  local: {
    llamaServerUrl: envConfig.LLAMA_SERVER_URL || process.env.LLAMA_SERVER_URL || 'http://127.0.0.1:3002',
    modelName: envConfig.MODEL_NAME || process.env.MODEL_NAME || 'llama-3.2-3b-instruct-q4_k_m.gguf',
    maxTokens: parseInt(envConfig.MAX_TOKENS) || parseInt(process.env.MAX_TOKENS) || 500,
    temperature: parseFloat(envConfig.TEMPERATURE) || parseFloat(process.env.TEMPERATURE) || 0.7
  },
  
  // Online API settings
  online: {
    apiUrl: envConfig.OPENAI_API_URL || process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions',
    apiKey: envConfig.OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    model: envConfig.OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    maxTokens: parseInt(envConfig.ONLINE_MAX_TOKENS) || parseInt(process.env.ONLINE_MAX_TOKENS) || 500,
    temperature: parseFloat(envConfig.ONLINE_TEMPERATURE) || parseFloat(process.env.ONLINE_TEMPERATURE) || 0.7
  }
};

// Function to reload configuration
function reloadConfig() {
    const newEnvConfig = loadConfig();
    CONFIG = {
        mode: newEnvConfig.PROTEUS_MODE || process.env.PROTEUS_MODE || 'local',
        local: {
            llamaServerUrl: newEnvConfig.LLAMA_SERVER_URL || 'http://127.0.0.1:3002',
            modelName: newEnvConfig.MODEL_NAME || 'llama-3.2-3b-instruct-q4_k_m.gguf',
            maxTokens: parseInt(newEnvConfig.MAX_TOKENS) || 500,
            temperature: parseFloat(newEnvConfig.TEMPERATURE) || 0.7
        },
        online: {
            apiUrl: newEnvConfig.OPENAI_API_URL || process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions',
            apiKey: newEnvConfig.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
            model: newEnvConfig.OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
            maxTokens: parseInt(newEnvConfig.ONLINE_MAX_TOKENS) || 500,
            temperature: parseFloat(newEnvConfig.ONLINE_TEMPERATURE) || 0.7
        }
    };
    console.log(`🔄 Configuration reloaded. Mode: ${CONFIG.mode}`);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Mock sensor data for demonstration (in production, this would come from real sensors)
let currentSensorData = null;

function getCurrentSensorData() {
  // If we have real sensor data from frontend, use it
  if (currentSensorData) {
    return currentSensorData;
  }
  // Otherwise, return null to indicate no real data
  return null;
}

// Function to format sensor data for AI context
function formatSensorDataForAI(sensorData) {
  if (!sensorData) {
    return 'No real sensor data available.';
  }
  const safe = (val, digits = 1) => (typeof val === 'number' && !isNaN(val) ? val.toFixed(digits) : null);
  const safe0 = (val) => (typeof val === 'number' && !isNaN(val) ? val.toFixed(0) : null);
  const safe4 = (val) => (typeof val === 'number' && !isNaN(val) ? val.toFixed(4) : null);

  let lines = [];
  if (safe4(sensorData.latitude) && safe4(sensorData.longitude)) {
    lines.push(`Position: ${safe4(sensorData.latitude)}°N, ${safe4(sensorData.longitude)}°W`);
  }
  // Show compass heading if available
  if (safe0(sensorData.compass)) {
    lines.push(`Compass: ${safe0(sensorData.compass)}°`);
  }
  // Show COG if available
  if (safe0(sensorData.cog)) {
    lines.push(`COG (Course Over Ground): ${safe0(sensorData.cog)}°`);
  }
  // Show GPS/course heading if available and not already shown as COG
  if (!safe0(sensorData.cog) && safe0(sensorData.heading)) {
    lines.push(`Heading: ${safe0(sensorData.heading)}°`);
  }
  if (safe(sensorData.speed)) {
    lines.push(`Speed (SOG): ${safe(sensorData.speed)} knots`);
  }
  if (safe(sensorData.temperature)) {
    lines.push(`Temperature: ${safe(sensorData.temperature)}°F`);
  }
  if (safe0(sensorData.humidity)) {
    lines.push(`Humidity: ${safe0(sensorData.humidity)}%`);
  }
  if (safe(sensorData.pressure)) {
    lines.push(`Pressure: ${safe(sensorData.pressure)} hPa`);
  }
  if (lines.length === 0) {
    return 'No real sensor data available.';
  }
  return `Current Vessel Status (Real Sensors):\n` + lines.join('\n');
}

// Function to get response from local LLM
async function getLocalLLMResponse(userPrompt, systemPrompt) {
    try {
        console.log('Sending request to local llama-server...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
        
        const response = await fetch(`${CONFIG.local.llamaServerUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { 
                        role: 'system', 
                        content: systemPrompt 
                    },
                    { role: 'user', content: userPrompt }
                ],
                model: CONFIG.local.modelName,
                temperature: CONFIG.local.temperature,
                max_tokens: CONFIG.local.maxTokens,
                stream: false
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Local LLM response received successfully');
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        } else {
            console.error('Invalid response format:', data);
            throw new Error('Invalid response format from llama-server');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('Request timed out after 60 seconds');
            throw new Error('Request timed out');
        }
        console.error('Error calling local llama-server:', error);
        throw error;
    }
}

// Function to get response from online API
async function getOnlineAPIResponse(userPrompt, systemPrompt) {
    try {
        console.log('Sending request to online API...');
        
        if (!CONFIG.online.apiKey) {
            throw new Error('OpenAI API key not configured');
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
        
        const response = await fetch(CONFIG.online.apiUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.online.apiKey}`
            },
            body: JSON.stringify({
                messages: [
                    { 
                        role: 'system', 
                        content: systemPrompt 
                    },
                    { role: 'user', content: userPrompt }
                ],
                model: CONFIG.online.model,
                max_tokens: CONFIG.online.maxTokens,
                temperature: CONFIG.online.temperature,
                stream: false
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Online API response received successfully');
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        } else {
            console.error('Invalid response format:', data);
            throw new Error('Invalid response format from online API');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('Request timed out after 60 seconds');
            throw new Error('Request timed out');
        }
        console.error('Error calling online API:', error);
        throw error;
    }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    const status = {
        status: 'ok',
        mode: CONFIG.mode,
        message: `Proteus ${CONFIG.mode === 'online' ? 'Plus' : 'AI'} server running`,
        timestamp: new Date().toISOString()
    };
    
    if (CONFIG.mode === 'local') {
        status.local = {
            model: CONFIG.local.modelName,
            serverUrl: CONFIG.local.llamaServerUrl
        };
    } else {
        status.online = {
            model: CONFIG.online.model,
            apiConfigured: !!CONFIG.online.apiKey
        };
    }
    
    res.json(status);
});

// Sensor data endpoint
app.get('/api/sensors', (req, res) => {
    try {
        const sensorData = getCurrentSensorData();
        const formattedData = formatSensorDataForAI(sensorData);
        
        res.json({
            raw: sensorData,
            formatted: formattedData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting sensor data:', error);
        res.status(500).json({ 
            error: 'Failed to get sensor data', 
            details: error.message 
        });
    }
});

// Update sensor data endpoint (for frontend to send real sensor data)
app.post('/api/sensors/update', (req, res) => {
    try {
        const sensorData = req.body;
        
        // Validate and transform the data
        const transformedData = {
            // GPS Data
            latitude: sensorData.lat || sensorData.latitude,
            longitude: sensorData.lon || sensorData.longitude,
            speed: sensorData.speedKnots || sensorData.speed,
            heading: sensorData.heading != null ? Number(sensorData.heading) : null, // GPS/course heading
            compass: sensorData.compass != null ? Number(sensorData.compass) : null, // Real compass value
            cog: sensorData.cog,
            gpsTime: sensorData.gpsTime,
            satellites: sensorData.sats,
            // Environmental Data
            temperature: sensorData.temperature,
            humidity: sensorData.humidity,
            pressure: sensorData.pressure,
            // Mark as real sensor data
            dataSource: 'real'
        };
        
        // Helper to safely format numbers for logging
        const safe = (val, digits = 1) => (typeof val === 'number' && !isNaN(val) ? val.toFixed(digits) : '—');
        const safe0 = (val) => (typeof val === 'number' && !isNaN(val) ? val.toFixed(0) : '—');
        const safe4 = (val) => (typeof val === 'number' && !isNaN(val) ? val.toFixed(4) : '—');
        
        // Update the current sensor data
        currentSensorData = transformedData;
        
        console.log('Real sensor data updated:', {
            position: `${safe4(transformedData.latitude)}, ${safe4(transformedData.longitude)}`,
            speed: safe(transformedData.speed),
            heading: safe0(transformedData.heading),
            compass: safe0(transformedData.compass),
            wind: `${safe(transformedData.trueWindSpeed)}kts @ ${safe0(transformedData.trueWindDirection)}°`
        });
        
        res.json({ 
            success: true, 
            message: 'Real sensor data updated successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating sensor data:', error);
        res.status(500).json({ 
            error: 'Failed to update sensor data', 
            details: error.message 
        });
    }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        console.log('Chat endpoint called');
        const { message, sensors } = req.body;
        console.log('[Proteus Backend] Received sensors in chat POST:', sensors);
        
        if (!message) {
            console.log('No message provided');
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log('Message received:', message.substring(0, 50) + '...');
        console.log('Using mode:', CONFIG.mode);

        // Use live sensor data from frontend if provided, else use stored snapshot
        const sensorData = sensors && Object.keys(sensors).length > 0 ? sensors : getCurrentSensorData();
        const sensorContext = formatSensorDataForAI(sensorData);
        
        // Create enhanced system prompt with sensor data
        const localSystemPrompt = `You are Proteus, a marine navigation AI assistant. Keep responses concise and practical for sailing.

${sensorContext}

Use this real-time vessel data to provide contextually relevant advice. If asked about current conditions, refer to the sensor data above.`;
        
        const onlineSystemPrompt = `You are Proteus+, an advanced marine navigation AI assistant. Provide concise, practical sailing advice and navigation support.

${sensorContext}

Use this real-time vessel data to provide contextually relevant advice. If asked about current conditions, refer to the sensor data above.`;

        let aiResponse;
        
        if (CONFIG.mode === 'local') {
            aiResponse = await getLocalLLMResponse(message, localSystemPrompt);
        } else {
            aiResponse = await getOnlineAPIResponse(message, onlineSystemPrompt);
        }
        
        console.log('AI response received, length:', aiResponse.length);
        console.log('Response preview:', aiResponse.substring(0, 100) + '...');
        
        console.log('Sending response to client...');
        res.json({ 
            response: aiResponse,
            mode: CONFIG.mode,
            sensorData: sensorData // Include sensor data in response for debugging
        });
        console.log('Response sent successfully');
        
    } catch (error) {
        console.error('Chat error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Failed to process chat request', 
            details: error.message,
            mode: CONFIG.mode
        });
    }
});

// Configuration endpoint
app.get('/api/config', (req, res) => {
    res.json({
        mode: CONFIG.mode,
        local: {
            modelName: CONFIG.local.modelName,
            maxTokens: CONFIG.local.maxTokens,
            temperature: CONFIG.local.temperature
        },
        online: {
            model: CONFIG.online.model,
            maxTokens: CONFIG.online.maxTokens,
            temperature: CONFIG.online.temperature,
            apiConfigured: !!CONFIG.online.apiKey
        }
    });
});

// Mode switching endpoint
app.post('/api/mode', (req, res) => {
    try {
        const { mode } = req.body;
        
        if (!mode || !['local', 'online'].includes(mode)) {
            return res.status(400).json({ error: 'Mode must be "local" or "online"' });
        }
        
        // Reload config to get latest from file
        reloadConfig();
        
        // Update the mode
        CONFIG.mode = mode;
        
        console.log(`🔄 Mode switched to: ${mode}`);
        
        res.json({ 
            success: true, 
            mode: CONFIG.mode,
            message: `Switched to ${mode} mode`
        });
        
    } catch (error) {
        console.error('Mode switch error:', error);
        res.status(500).json({ error: 'Failed to switch mode' });
    }
});

// Reload configuration endpoint
app.post('/api/reload', (req, res) => {
    try {
        reloadConfig();
        res.json({ 
            success: true, 
            mode: CONFIG.mode,
            message: 'Configuration reloaded'
        });
    } catch (error) {
        console.error('Reload error:', error);
        res.status(500).json({ error: 'Failed to reload configuration' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Proteus ${CONFIG.mode === 'online' ? 'Plus' : 'AI'} server running on port ${PORT}`);
    console.log(`🔧 Mode: ${CONFIG.mode}`);
    
    if (CONFIG.mode === 'local') {
        console.log(`🔗 Local LLM: ${CONFIG.local.llamaServerUrl}`);
        console.log(`🤖 Model: ${CONFIG.local.modelName}`);
    } else {
        console.log(`🌐 Online API: ${CONFIG.online.model}`);
        console.log(`🔑 API Configured: ${!!CONFIG.online.apiKey}`);
    }
    
    console.log(`⚓ Proteus is ready to assist with marine navigation and sailing decisions`);
}); 