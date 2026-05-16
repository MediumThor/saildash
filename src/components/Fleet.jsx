import React, { useState } from "react";
import { useFleet } from "../context/FleetContext";

export default function Fleet() {
  const { fleet } = useFleet();
  const [showTrack, setShowTrack] = useState({});

  const toggleTrack = (id) => {
    setShowTrack((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <h1 className="text-4xl font-bold mb-6">Fleet Dashboard</h1>
      {fleet.length === 0 ? (
        <div className="text-xl text-zinc-400">No vessels detected yet.</div>
      ) : (
        fleet.map((vessel) => (
          <div
            key={vessel.id}
            className="bg-zinc-800 p-6 rounded-2xl shadow-md flex justify-between items-center"
          >
            <div>
              <div className="text-2xl font-semibold">{vessel.name}</div>
              <div className="text-zinc-400 text-sm">
                {vessel.latitude.toFixed(4)}, {vessel.longitude.toFixed(4)}
              </div>
              <div className="text-zinc-400 text-sm">
                Battery: {vessel.battery ?? "?"}%
              </div>
            </div>
            <button
              onClick={() => toggleTrack(vessel.id)}
              className={`px-6 py-3 rounded-xl text-xl font-bold transition ${
                showTrack[vessel.id]
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-zinc-700 hover:bg-zinc-600"
              }`}
            >
              {showTrack[vessel.id] ? "Hide Track" : "Show Track"}
            </button>
          </div>
        ))
      )}
    </div>
  );
}
