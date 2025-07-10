from flask import Flask, request, jsonify
from llama_cpp import Llama
import os
import json
from threading import Lock
import signal
import sys

MODEL_PATH = "/home/pi5/models/mistral-7b-instruct-v0.1.Q4_K_M.gguf"
HISTORY_FILE = "chat_history.json"
CONTEXT_WINDOW = 100

app = Flask(__name__)
llm = None
history_lock = Lock()

# Signal handler for graceful shutdown
def signal_handler(sig, frame):
    print("Shutting down gracefully...")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Load or initialize chat history
def load_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            print("Error loading history, starting fresh")
            return []
    return []

def save_history(history):
    try:
        with open(HISTORY_FILE, "w") as f:
            json.dump(history, f, indent=2)
    except IOError as e:
        print(f"Error saving history: {e}")

@app.before_first_request
def load_model():
    global llm
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model not found at {MODEL_PATH}")
    
    print("Loading Mistral-7B model...")
    try:
        # More conservative settings for Pi 5
        llm = Llama(
            model_path=MODEL_PATH,
            n_ctx=1024,  # Reduced context window
            n_batch=32,  # Smaller batch size
            n_threads=4,  # Limit threads
            verbose=False
        )
        print("Model loaded successfully.")
    except Exception as e:
        print(f"Error loading model: {e}")
        raise

@app.route("/chat", methods=["POST"])
def chat():
    global llm
    if llm is None:
        return jsonify({"error": "Model not loaded"}), 500
    
    try:
        data = request.get_json()
        message = data.get("message", "").strip()
        user_history = data.get("history", [])
        
        if not message:
            return jsonify({"error": "Message is required"}), 400

        # Load and update chat history
        with history_lock:
            history = load_history()
            # Append user message
            history.append({"role": "user", "content": message})
            # Keep only the last CONTEXT_WINDOW*2 messages (user+assistant)
            context = history[-CONTEXT_WINDOW*2:]

        # Build prompt from context (simplified for stability)
        prompt = ""
        for msg in context[-20:]:  # Limit to last 20 messages for stability
            if msg["role"] == "user":
                prompt += f"User: {msg['content']}\n"
            else:
                prompt += f"AI: {msg['content']}\n"
        prompt += "AI: "

        # Generate response with timeout and error handling
        try:
            output = llm(
                prompt, 
                max_tokens=64,  # Reduced for stability
                stop=["\nUser:", "\nAI:"], 
                echo=False,
                temperature=0.7
            )
            text = output["choices"][0]["text"].strip()
            
            if not text:
                text = "I'm sorry, I couldn't generate a response. Please try again."
                
        except Exception as e:
            print(f"Error generating response: {e}")
            text = "I'm experiencing some technical difficulties. Please try again in a moment."

        # Append assistant response to history and save
        with history_lock:
            history.append({"role": "assistant", "content": text})
            save_history(history)

        return jsonify({"role": "assistant", "content": text})
        
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "LLM API is running"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5005, threaded=False) 