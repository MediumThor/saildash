import React, { useEffect, useState } from "react";
import { useSidebar } from "../context/SidebarContext";
import liveData from "../utils/liveData";


export default function HeaderMicro({ nightMode }) {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const [isWifiConnected, setIsWifiConnected] = useState(false);
  const [boatName, setBoatName] = useState(() => localStorage.getItem("boatName") || "Saildash");
  const [gpsTime, setGpsTime] = useState(null);


useEffect(() => {
  let lastDate = null;

  const interval = setInterval(() => {
    const raw = liveData.getGPSTime();
    let date = null;

    if (raw) {
      const parsed = new Date(raw);
      if (!isNaN(parsed)) {
        lastDate = parsed;
      }
    }

    if (lastDate) {
      // Tick forward one second if no update this cycle
      lastDate = new Date(lastDate.getTime() + 1000);
      setGpsTime(lastDate.toLocaleTimeString());
    }
  }, 1000);

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
  

  return (
    <header className="bg-zinc-800 px-4 py-4 flex items-center justify-between shadow z-50 h-12 relative">
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

      {/* Clock & Wi-Fi */}
      <div className="flex items-center space-x-4 text-3xl text-right ml-auto">
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
