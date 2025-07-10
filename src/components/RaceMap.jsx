import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import liveData from "../utils/liveData";
import { useNavpoints } from "../context/NavpointsContext";
import { useRace } from "../context/RaceContext";

export default function RaceMap() {
  const { navpoints } = useNavpoints();
  const { 
    course, 
    currentMarkIndex, 
    startLine 
  } = useRace();
  
  const [data, setData] = useState(liveData.get());
  const fallbackLatLon = [43.3875, -87.8750]; // Port Washington, WI
  const liveLat = data?.lat;
  const liveLon = data?.lon;
  const isValidCoord = (v) => typeof v === "number" && !isNaN(v);
  
  const lat = isValidCoord(liveLat) ? liveLat : fallbackLatLon[0];
  const lon = isValidCoord(liveLon) ? liveLon : fallbackLatLon[1];
  const center = [lat, lon];
  const compass = liveData.getCompassHeading();

  useEffect(() => {
    const interval = setInterval(() => {
      setData(liveData.get());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const tileBase =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:8085"
      : `http://${window.location.hostname}:8085`;

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden">
      <MapContainer
        center={center}
        zoom={13}
        minZoom={8}
        maxZoom={18}
        scrollWheelZoom={true}
        touchZoom={true}
        zoomControl={false}
        dragging={true}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        {/* Base Tile Layer */}
        <TileLayer
          attribution="NOAA ENC styled with QGIS"
          url={`${tileBase}/tiles/{z}/{x}/{y}.png`}
          maxZoom={18}
        />

        {/* GPS Marker */}
        {isValidCoord(lat) && isValidCoord(lon) && (
          <Marker
            position={[lat, lon]}
            icon={L.divIcon({
              className: "boat-marker",
              html: `
                <img
                  src="icons/boat.png"
                  style="
                    width: 48px;
                    height: 48px;
                    transform: translate(-50%, -50%) rotate(${compass}deg);
                    transition: transform 0.2s linear;
                    position: absolute;
                    top: 50%;
                    left: 50%;
                  "
                />
              `,
              iconSize: [48, 48],
              iconAnchor: [24, 24],
            })}
          >
            <Popup>Your Position</Popup>
          </Marker>
        )}

        {/* Navpoints */}
        {Array.isArray(navpoints) &&
          navpoints.filter(p => isValidCoord(p.lat) && isValidCoord(p.lon)).map((point, index) => (
            <Marker 
              key={index} 
              position={[point.lat, point.lon]}
              icon={L.divIcon({
                className: "navpoint-marker",
                html: `
                  <div style="
                    background: #3b82f6;
                    color: white;
                    border: 2px solid white;
                    border-radius: 50%;
                    width: 16px;
                    height: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 10px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                  ">
                    •
                  </div>
                `,
                iconSize: [16, 16],
                iconAnchor: [8, 8],
              })}
            >
              <Popup>{point.name}</Popup>
            </Marker>
        ))}

        {/* Race Start Line */}
        {startLine.pin1 && startLine.pin2 && (
          <Polyline
            positions={[
              [startLine.pin1.lat, startLine.pin1.lon],
              [startLine.pin2.lat, startLine.pin2.lon],
            ]}
            color="green"
            weight={4}
            dashArray="10,5"
          />
        )}

        {/* Race Course Marks */}
        {course.length > 0 && course.map((mark, index) => (
          <Marker
            key={`race-mark-${index}`}
            position={[mark.lat, mark.lon]}
            icon={L.divIcon({
              className: "race-mark",
              html: `
                <div style="
                  background: ${index === currentMarkIndex ? '#ef4444' : '#22c55e'};
                  color: white;
                  border: 2px solid white;
                  border-radius: 50%;
                  width: 20px;
                  height: 20px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  font-size: 10px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                ">
                  ${index + 1}
                </div>
              `,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })}
          >
            <Popup>
              <div className="text-center">
                <div className="font-bold">Mark {index + 1}</div>
                <div className="text-sm">{mark.name}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Race Course Polyline */}
        {course.length > 1 && (
          <Polyline
            positions={course.map(mark => [mark.lat, mark.lon])}
            color="purple"
            weight={3}
            dashArray="8,4"
          />
        )}

        {/* GPS Warning */}
        {(!isValidCoord(liveLat) || !isValidCoord(liveLon)) && (
          <div className="absolute top-1 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold z-[2000]">
            ⚠️ No GPS
          </div>
        )}
      </MapContainer>
    </div>
  );
} 