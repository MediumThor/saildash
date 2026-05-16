import React, { useState, useRef, useEffect } from "react";
import { startSensorDataSync, getAISensorData } from "../utils/sensorBridge.js";
import liveData from "../utils/liveData.js";
import BACKEND_URL from "../config/backend.js";

export default function AIChat({ nightMode }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Ahoy! I am Proteus, your onboard AI navigator. How can I assist your voyage today?" }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState("local"); // local or online
  const [modeDetails, setModeDetails] = useState({});
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  const [sensorData, setSensorData] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch current mode on component mount
  useEffect(() => {
    const fetchMode = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/health`);
        if (response.ok) {
          const data = await response.json();
          setCurrentMode(data.mode);
          setModeDetails(data);
        }
      } catch (error) {
        console.error("Error fetching mode:", error);
      }
    };
    fetchMode();
  }, []);

  // Start sensor data sync and fetch sensor data
  useEffect(() => {
    // Start syncing sensor data to AI backend
    const stopSync = startSensorDataSync(5000); // Update every 5 seconds
    
    // Fetch sensor data from AI backend
    const fetchSensorData = async () => {
      try {
        const data = await getAISensorData();
        if (data) {
          setSensorData(data);
        }
      } catch (error) {
        console.error("Error fetching sensor data:", error);
      }
    };

    // Fetch immediately
    fetchSensorData();
    
    // Then fetch every 10 seconds
    const interval = setInterval(fetchSensorData, 10000);
    
    return () => {
      stopSync();
      clearInterval(interval);
    };
  }, []);

  // Removed duplicate WebSocket connection - using centralized WebSocketContext instead
  // Data is now shared via liveData from WebSocketContext

  const handleModeSwitch = async () => {
    if (isSwitchingMode) return;
    
    setIsSwitchingMode(true);
    const newMode = currentMode === "local" ? "online" : "local";
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/mode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode: newMode }),
      });

      if (response.ok) {
        // Always fetch the actual mode from /api/health after switching
        const health = await fetch(`${BACKEND_URL}/api/health`);
        if (health.ok) {
          const healthData = await health.json();
          setCurrentMode(healthData.mode);
          setModeDetails(healthData);
        }
        // Add a system message to indicate mode change
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `🔄 Switched to ${newMode === "online" ? "Proteus+ (Online)" : "Proteus (Local)"} mode. Ready to assist!`
        }]);
      } else {
        console.error("Failed to switch mode");
      }
    } catch (error) {
      console.error("Error switching mode:", error);
    } finally {
      setIsSwitchingMode(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = { role: "user", content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    // Gather live sensor values
    const liveSensorData = {
      compass: liveData.getCompassHeading(),
      latitude: liveData.get()?.lat,
      longitude: liveData.get()?.lon,
      speed: liveData.get()?.speed,
      heading: liveData.get()?.heading,
      temperature: liveData.get()?.temperature,
      humidity: liveData.get()?.humidity,
      pressure: liveData.get()?.pressure,
      // Add more fields as needed
    };

    console.log('[AIChat] Sending liveSensorData with chat:', liveSensorData);
    console.log('[AIChat] Backend URL:', BACKEND_URL);
    console.log('[AIChat] Request body:', JSON.stringify({ message: inputMessage, sensors: liveSensorData }));

    // AI Chat is temporarily disabled for performance optimization
    setMessages(prev => [...prev, {
      role: "assistant",
      content: "🤖 AI Chat is currently disabled for performance optimization. The system is focused on providing fast, responsive navigation data. This feature will be re-enabled when performance targets are met."
    }]);
    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Mode indicator and display name
  const modeIndicator = currentMode === "local"
    ? { text: "Proteus", color: "bg-blue-600" }
    : { text: "Proteus+", color: "bg-green-600" };

  return (
    <div className={`h-full flex flex-col ${nightMode ? "text-amber-500" : "text-white"}`} style={{ fontSize: '1.5rem' }}>
      {/* Header */}
      <div className={`p-6 border-b ${nightMode ? "border-amber-500/20" : "border-white/20"}`}>
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold tracking-wide flex items-center gap-2">
            <span className={`inline-block w-4 h-4 rounded-full ${modeIndicator.color} mr-2`}></span>
            {modeIndicator.text} <span className="text-2xl font-normal opacity-60 ml-2">AI Navigator</span>
          </h1>
          <div className="flex gap-4">
            {/* Mode Toggle Button */}
            <button
              onClick={handleModeSwitch}
              disabled={isSwitchingMode}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-xl transition-colors border-2 ${
                isSwitchingMode
                  ? "opacity-50 cursor-not-allowed" 
                  : nightMode 
                    ? "border-amber-500/50 hover:bg-amber-500/10" 
                    : "border-blue-400/50 hover:bg-blue-400/10"
              }`}
              title={`Switch to ${currentMode === "local" ? "Online (Proteus+)" : "Local (Proteus)"} mode`}
            >
              {isSwitchingMode ? "Switching..." : `Switch to ${currentMode === "local" ? "Proteus+" : "Proteus"}`}
            </button>
          </div>
        </div>
        
        {/* Mode Details */}
        <div className="mt-4 text-lg opacity-70">
          {currentMode === "online" ? (
            <span>🌐 Connected to OpenAI API - Enhanced responses</span>
          ) : (
            <span>🤖 Running locally on Raspberry Pi 5 - 3B model</span>
          )}
        </div>
      </div>



      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] p-6 rounded-xl shadow-md border text-2xl leading-relaxed ${
                message.role === "user"
                  ? `${nightMode ? "bg-amber-500/20 border-amber-500/30" : "bg-blue-500/20 border-blue-400/20"} text-right`
                  : `${nightMode ? "bg-amber-500/10 border-amber-500/20" : "bg-sky-900 border-blue-400/10"} text-left`
              }`}
            >
              <p>
                {message.role === "assistant" && (
                  <span className={`font-semibold ${modeIndicator.color} mr-2`}>
                    {modeIndicator.text}:
                  </span>
                )}
                {message.content}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className={`max-w-[80%] p-6 rounded-xl ${nightMode ? "bg-amber-500/10" : "bg-gray-700"}`}>
              <div className="flex space-x-2">
                <div className="w-4 h-4 bg-current rounded-full animate-bounce"></div>
                <div className="w-4 h-4 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                <div className="w-4 h-4 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={`p-6 border-t ${nightMode ? "border-amber-500/20" : "border-white/20"}`}>
        <div className="flex space-x-4">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Ask ${modeIndicator.text} anything about your journey...`}
            disabled={isLoading}
            className={`flex-1 p-6 rounded-xl resize-none text-2xl ${
              nightMode 
                ? "bg-zinc-800 border border-amber-500/30 text-amber-500 placeholder-amber-500/50" 
                : "bg-zinc-700 border border-white/30 text-white placeholder-white/50"
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            rows={3}
            style={{ minHeight: '3.5em' }}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className={`px-8 py-4 rounded-xl font-bold text-2xl transition-colors ${
              isLoading || !inputMessage.trim()
                ? "opacity-50 cursor-not-allowed" 
                : nightMode 
                  ? "bg-amber-500 text-zinc-900 hover:bg-amber-400" 
                  : "bg-blue-500 text-white hover:bg-blue-400"
            }`}
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </div>
        <p className="text-sm opacity-50 mt-3 italic">
          Press Enter to send, Shift+Enter for new line &mdash; {modeIndicator.text} is always at the helm
        </p>
      </div>
    </div>
  );
}