import React, { useEffect, useState } from "react";
import { useSidebar } from "../context/SidebarContext";
import { Link } from "react-router-dom";
import liveData, { getAdjustedUTCTime } from "../utils/liveData";
import BACKEND_URL from "../config/backend.js";


export default function Header({ nightMode }) {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const [isWifiConnected, setIsWifiConnected] = useState(false);
  const [boatName, setBoatName] = useState(() => localStorage.getItem("boatName") || "");
  const [gpsTime, setGpsTime] = useState(null);
  const [currentMode, setCurrentMode] = useState("local");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second (GPS time = UTC + 19 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const utcTime = new Date();
      const gpsTime = new Date(utcTime.getTime() + 19000); // Add 19 seconds
      setCurrentTime(gpsTime);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
      setBoatName(localStorage.getItem("boatName") || "");
    };

    // Listen for storage events (from other windows/tabs)
    window.addEventListener("storage", updateFromStorage);

    // Also check localStorage periodically for changes within the same window
    const interval = setInterval(() => {
      const currentBoatName = localStorage.getItem("boatName") || "";
      if (currentBoatName !== boatName) {
        setBoatName(currentBoatName);
      }
    }, 1000);

    return () => {
      window.removeEventListener("storage", updateFromStorage);
      clearInterval(interval);
    };
  }, [boatName]);

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
      <button
        onClick={toggleSidebar}
        className="p-4 w-16 h-24 flex items-center justify-center focus:outline-none z-[10000]"
        aria-label="Toggle Sidebar"
      >
        <div className="space-y-2">
          <div className="w-8 h-1 bg-white rounded"></div>
          <div className="w-8 h-1 bg-white rounded"></div>
          <div className="w-8 h-1 bg-white rounded"></div>
        </div>
      </button>

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
        {/* AI Mode Indicator - Disabled */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-500/20 border-gray-500/30 border">
          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
          <span className="text-sm font-medium text-gray-400">
            AI Disabled
          </span>
        </div>

        <Link
          to="/ai-chat"
          className={`p-2 rounded-lg transition-colors opacity-50 cursor-not-allowed ${
            nightMode ? "text-gray-400" : "text-gray-400"
          }`}
          aria-label="AI Chat (Disabled)"
          title="AI Chat is disabled for performance optimization"
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
        {/* Current Time Display */}
        <div className={`${nightMode ? "text-amber-300" : "text-zinc-300"} text-lg font-mono`}>
          {currentTime.toLocaleTimeString()}
        </div>
      </div>
    </header>
  );
}
