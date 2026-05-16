// src/components/SplashScreen.jsx
import React, { useEffect } from "react";

export default function SplashScreen({ onDone }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDone();
    }, 2200); // Show splash for 3 seconds
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center">
      <img
        src="/splash.png"
        alt="SailDash Logo"
        className="w-[60%] max-w-[1000px] object-contain"
      />
    </div>
  );
}
