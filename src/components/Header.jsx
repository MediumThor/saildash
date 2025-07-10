import React, { useEffect, useState } from "react";
import { useSidebar } from "../context/SidebarContext";
import { Link } from "react-router-dom";
import liveData from "../utils/liveData";
import BACKEND_URL from "../config/backend.js";


export default function Header({ nightMode }) {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const [isWifiConnected, setIsWifiConnected] = useState(false);
  const [boatName, setBoatName] = useState(() => localStorage.getItem("boatName") || "Saildash");
  const [gpsTime, setGpsTime] = useState(null);
  const [currentMode, setCurrentMode] = useState("local");

  useEffect(() => {
    let lastSecond = null;
  
    const interval = setInterval(() => {
      const raw = liveData.getGPSTime();
      if (raw) {
        const date = new Date(raw);
        if (!isNaN(date)) {
          const seconds = date.getSeconds();
  
          // Only update if the second value has changed
          if (seconds !== lastSecond) {
            lastSecond = seconds;
            setGpsTime(date.toLocaleTimeString());
          }
        }
      }
    }, 200); // check 5x/sec but only update once per actual second
  
    return () => clearInterval(interval);
  }, []);
  

  useEffect(() => {
    const updateFromStorage = () => {
      setBoatName(localStorage.getItem("boatName") || "Saildash");
    };
    window.addEventListener("storage", updateFromStorage);
    return () => window.removeEventListener("storage", updateFromStorage);
  }, []);

  useEffect(() => {
    const checkWifi = async () => {
      try {
        const res = await fetch("http://localhost:8085/api/wifi/status");
        const data = await res.json();
        setIsWifiConnected(data.connected);
      } catch {
        setIsWifiConnected(false);
      }
    };
  
    checkWifi();                      // run once
    const interval = setInterval(checkWifi, 5000);  // poll every 5 seconds
  
    return () => clearInterval(interval);
  }, []);

  // Fetch current AI mode
  useEffect(() => {
    const fetchMode = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/health`);
        if (response.ok) {
          const data = await response.json();
          setCurrentMode(data.mode);
        }
      } catch (error) {
        console.error("Error fetching AI mode:", error);
      }
    };
    fetchMode();
    
    // Refresh mode every 30 seconds
    const interval = setInterval(fetchMode, 30000);
    return () => clearInterval(interval);
  }, []);

  const getModeIndicator = () => {
    if (currentMode === "online") {
      return {
        text: "Proteus+",
        color: "text-green-400",
        bgColor: "bg-green-500/20",
        borderColor: "border-green-500/30"
      };
    } else {
      return {
        text: "Proteus",
        color: "text-blue-400",
        bgColor: "bg-blue-500/20",
        borderColor: "border-blue-500/30"
      };
    }
  };

  const modeIndicator = getModeIndicator();

  return (
    <header className="bg-zinc-800 px-4 py-4 flex items-center justify-between shadow z-50 h-24 relative">
      {/* Sidebar Hamburger Button */}
      {!isSidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="p-4 w-16 h-24 flex items-center justify-center focus:outline-none"
          aria-label="Toggle Sidebar"
        >
          <div className="space-y-2">
            <div className="w-8 h-1 bg-white rounded"></div>
            <div className="w-8 h-1 bg-white rounded"></div>
            <div className="w-8 h-1 bg-white rounded"></div>
          </div>
        </button>
      )}

      {/* Centered Title */}
      <h1
  className={`text-4xl font-warrior font-bold absolute left-1/2 transform -translate-x-1/2 ${
    nightMode ? "text-amber-500" : "text-white"
  }`}
>
  {boatName}
</h1>

      {/* AI Chat Link and Mode Indicator */}
      <div className="flex items-center space-x-4 text-3xl text-right ml-auto">
        {/* AI Mode Indicator */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${modeIndicator.bgColor} ${modeIndicator.borderColor} border`}>
          <div className={`w-2 h-2 rounded-full ${currentMode === "online" ? "bg-green-400" : "bg-blue-400"} animate-pulse`}></div>
          <span className={`text-sm font-medium ${modeIndicator.color}`}>
            {modeIndicator.text}
          </span>
        </div>

        <Link
          to="/ai-chat"
          className={`p-2 rounded-lg hover:bg-zinc-700 transition-colors ${
            nightMode ? "text-amber-500 hover:bg-amber-500/10" : "text-white hover:bg-zinc-700"
          }`}
          aria-label="AI Chat"
        >
          <svg
            className="w-8 h-8"
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
        </Link>
        
        {isWifiConnected && (
          <img
            src="/icons/wifi.png"
            alt="WiFi Connected"
            className="w-8 h-8"
          />
        )}
        <div className={`${nightMode ? "text-amber-300" : "text-zinc-300"}`}>
          {gpsTime || <span className="text-zinc-400">—:—:—</span>}
        </div>
      </div>
    </header>
  );
}
