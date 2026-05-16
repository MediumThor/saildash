import React, { useEffect, useState } from "react";
import liveData from "../utils/liveData";
import { useNavpoints } from "../context/NavpointsContext";

export default function TripMicro() {
  const [data, setData] = useState(liveData.get());
  const { destinations } = useNavpoints();

  useEffect(() => {
    const interval = setInterval(() => {
      setData(liveData.get());
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const compass = liveData.getCompassHeading();
  const currentDestination = destinations.find((d) =>
    typeof d.lat === "number" && typeof d.lon === "number" && !isNaN(d.lat) && !isNaN(d.lon)
  );

  const bearingToDestination = currentDestination && data?.lat && data?.lon
    ? liveData.getBearingToDestination()
    : null;

  return (
    <div className="space-y-8 text-center">
      {/* Heading */}
      <div className="bg-zinc-800 rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-4 text-zinc-300">Heading</h2>
        <div className="text-6xl font-bold text-white">
          {compass !== null ? `${Math.round(compass)}°` : "—"}
        </div>
      </div>

      {/* Bearing to Destination */}
      <div className="bg-zinc-800 rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-4 text-zinc-300">Bearing</h2>
        <div className="text-6xl font-bold text-white">
          {bearingToDestination !== null ? `${Math.round(bearingToDestination)}°` : "—"}
        </div>
        <div className="text-lg text-zinc-400 mt-2">
          {currentDestination ? currentDestination.name : "No destination"}
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-zinc-800 rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-4 text-zinc-300">Info</h2>
        <div className="space-y-4 text-lg">
          <div>
            <span className="text-zinc-400">Speed: </span>
            <span className="text-white font-bold">
              {data?.speedKnots ? `${data.speedKnots.toFixed(1)} kn` : "—"}
            </span>
          </div>
          <div>
            <span className="text-zinc-400">Distance: </span>
            <span className="text-white font-bold">
              {currentDestination && data?.lat && data?.lon
                ? `${(liveData.getDistanceToDestination() || 0).toFixed(2)} nm`
                : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
