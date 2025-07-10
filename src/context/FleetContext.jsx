import React, { createContext, useContext, useState, useEffect } from "react";

const FleetContext = createContext();

export function FleetProvider({ children }) {
  const [fleet, setFleet] = useState([]);
  const vesselColors = {};
  const colors = ["#3B82F6", "#F59E0B", "#10B981", "#8B5CF6", "#EF4444", "#EC4899", "#14B8A6"];

  function getVesselColor(id) {
    if (!vesselColors[id]) {
      vesselColors[id] = colors[Object.keys(vesselColors).length % colors.length];
    }
    return vesselColors[id];
  }

  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.hostname}:8092`);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data)) {
          setFleet(data);
        } else if (Array.isArray(data.vessels)) {
          setFleet(data.vessels);
        } else {
          console.error("Fleet WS unexpected data:", data);
          setFleet([]);
        }
      } catch (err) {
        console.error("Fleet WS parse error:", err);
      }
    };
    ws.onerror = (error) => console.error("Fleet WS error:", error);
    ws.onclose = () => console.log("Fleet WS closed");
    return () => ws.close();
  }, []);

  return (
    <FleetContext.Provider value={{ fleet, getVesselColor }}>
      {children}
    </FleetContext.Provider>
  );
}

export function useFleet() {
  return useContext(FleetContext);
}
