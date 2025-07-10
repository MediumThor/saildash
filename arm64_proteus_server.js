import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const LLAMA_SERVER_URL = 'http://127.0.0.1:3002';
const MODEL_NAME = 'tinyllama-1.1b-chat-v1.0.Q4_0.gguf';

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

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

// Function to send a prompt to the llama-server HTTP API
async function getLLMResponse(userPrompt) {
    try {
        console.log('Sending request to llama-server...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(`${LLAMA_SERVER_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { 
                        role: 'system', 
                        content: 'You are Proteus, a marine navigation AI assistant. Keep responses concise and practical for sailing.' 
                    },
                    { role: 'user', content: userPrompt }
                ],
                model: MODEL_NAME,
                temperature: 0.7,
                max_tokens: 64, // Keep responses short
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
        console.log('LLM response received successfully');
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        } else {
            console.error('Invalid response format:', data);
            throw new Error('Invalid response format from llama-server');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('Request timed out after 30 seconds');
            throw new Error('Request timed out');
        }
        console.error('Error calling llama-server:', error);
        throw error;
    }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Proteus ARM64 server running (TinyLlama 1.1B)' });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        console.log('Chat endpoint called');
        const { message } = req.body;
        
        if (!message) {
            console.log('No message provided');
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log('Message received:', message.substring(0, 50) + '...');

        console.log('Sending prompt to LLM...');
        
        // Get response from LLM (no summary, just the current question)
        const aiResponse = await getLLMResponse(message);
        console.log('LLM response received, length:', aiResponse.length);
        console.log('Response preview:', aiResponse.substring(0, 100) + '...');
        
        console.log('Sending response to client...');
        res.json({ 
            response: aiResponse
        });
        console.log('Response sent successfully');
        
    } catch (error) {
        console.error('Chat error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Failed to process chat request', 
            details: error.message 
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Proteus AI server running on port ${PORT}`);
    console.log(`🔗 Connected to llama-server at ${LLAMA_SERVER_URL}`);
    console.log(`🤖 Using TinyLlama 1.1B model`);
    console.log(`⚓ Proteus is ready to assist with marine navigation and sailing decisions`);
}); 