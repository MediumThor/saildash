import { spawn } from 'child_process';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const HISTORY_FILE = "chat_history.json";

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

// Load or initialize chat history
function loadHistory() {
    if (fs.existsSync(HISTORY_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
        } catch (error) {
            console.log("Error loading history, starting fresh");
            return [];
        }
    }
    return [];
}

function saveHistory(history) {
    try {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    } catch (error) {
        console.log(`Error saving history: ${error}`);
    }
}

// AI Chat API endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Load and update chat history
        const chatHistory = loadHistory();
        chatHistory.push({ role: "user", content: message });
        
        // Keep only the last 100 exchanges for context
        const context = chatHistory.slice(-200); // 100 user + 100 assistant messages

        // Build context string for the LLM
        let contextString = "";
        for (const msg of context.slice(-20)) { // Limit to last 20 messages for stability
            if (msg.role === "user") {
                contextString += `User: ${msg.content}\n`;
            } else {
                contextString += `AI: ${msg.content}\n`;
            }
        }
        contextString += "AI: ";

        // Call the Python script with the context
        const pythonProcess = spawn('python3', ['/home/pi5/main.py', '--generate', contextString], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let response = '';
        let error = '';

        pythonProcess.stdout.on('data', (data) => {
            response += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            error += data.toString();
        });

        // Wait for the Python process to complete
        await new Promise((resolve, reject) => {
            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Python process exited with code ${code}`));
                }
            });
        });

        if (error) {
            console.error('Python error:', error);
        }

        // Extract the AI response
        const aiResponse = response.trim();
        
        // Add the response to history
        chatHistory.push({ role: "assistant", content: aiResponse });
        saveHistory(chatHistory);

        res.json({ role: "assistant", content: aiResponse });

    } catch (error) {
        console.error('Error processing chat request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'AI Chat server is running' });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`AI Chat server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
}); 