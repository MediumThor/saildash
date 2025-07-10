import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

// AI Chat API endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Forward to Python LLM API
    const llmRes = await fetch('http://localhost:5005/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: history || [] }),
    });
    if (!llmRes.ok) {
      throw new Error(`LLM API error: ${llmRes.status}`);
    }
    const data = await llmRes.json();
    res.json(data);
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