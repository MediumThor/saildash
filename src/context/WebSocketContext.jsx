import React, { createContext, useContext, useEffect, useState } from 'react';
import liveData from '../utils/liveData';

const WebSocketContext = createContext();

export function WebSocketProvider({ children }) {
  const [wsStatus, setWsStatus] = useState('Connecting');
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [ws, setWs] = useState(null);

  const connectWebSocket = () => {
    console.log(`🔌 Attempting WebSocket connection (attempt ${connectionAttempts + 1})...`);

    const websocket = new WebSocket(`ws://${window.location.hostname}:8081`);

    websocket.onopen = () => {
      console.log('✅ WebSocket connected successfully');
      setWsStatus('Connected');
      setConnectionAttempts(0);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle heartbeat messages
        if (data.type === 'heartbeat') {
          console.log('💓 Heartbeat received:', data);
          return;
        }

        // Update live data
        liveData.set(data);
        setLastMessage(data);
        setWsStatus('Connected');

        // Debug: Log GPS and compass data updates (disabled for performance)
        // if (data.lat !== undefined || data.lon !== undefined || data.compass !== undefined) {
        //   console.log('📍 GPS/Compass update:', {
        //     lat: data.lat,
        //     lon: data.lon,
        //     compass: data.compass,
        //     timestamp: new Date().toISOString()
        //   });
        // }
      } catch (err) {
        console.error('❌ WebSocket parse error:', err);
        setWsStatus('Error');
      }
    };

    websocket.onerror = (err) => {
      console.error('❌ WebSocket error:', err);
      setWsStatus('Error');
    };

    websocket.onclose = (event) => {
      console.log(`🔌 WebSocket closed (code: ${event.code}, reason: ${event.reason})`);
      setWsStatus('Disconnected');

      // Don't reconnect if it was a clean close or too many attempts
      if (event.code === 1000 || connectionAttempts >= 5) {
        console.log('🛑 Stopping reconnection attempts');
        return;
      }

      // Attempt to reconnect
      setTimeout(() => {
        setConnectionAttempts(prev => prev + 1);
        connectWebSocket();
      }, 1000); // Reduced from 3000ms to 1000ms for faster reconnection
    };

    setWs(websocket);
  };

  useEffect(() => {
    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (ws) {
        ws.close(1000, 'Component unmounting');
      }
    };
  }, []);

  const sendMessage = (message) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ WebSocket not ready, cannot send message');
    }
  };

  const value = {
    wsStatus,
    lastMessage,
    connectionAttempts,
    sendMessage,
    liveData
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
