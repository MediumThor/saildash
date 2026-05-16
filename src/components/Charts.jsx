import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, Polyline, Circle, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import liveData from "../utils/liveData";
import { useDisplaySettings } from "../context/DisplaySettingsContext";
import { useNavpoints } from "../context/NavpointsContext";
import { useModal } from "../context/ModalContext";
import { useRace } from "../context/RaceContext";
import { useSidebar } from "../context/SidebarContext";
import AddNavpointModal from "../components/AddNavpointModal";
import SetDestinationModal from "../components/SetDestinationModal";
import { calculateBearing } from "../utils/calculateBearing";
import LaylineModal from "./LaylineModal";
import TripTracker from "./TripTracker";
import TripPlayback from "./TripPlayback";
import StartLineSelector from "./StartLineSelector";
import CourseSelector from "./CourseSelector";
import clsx from "clsx";
import { syncValue } from "../utils/syncStorage";
import { useTrip } from "../context/TripContext";
import { useFleet } from "../context/FleetContext";


// Click handler for adding marker
function ClickPopup({ setClickLatLng, openModal }) {
  useMapEvents({
    click(e) {
      const clickedLatLng = e.latlng;
      setClickLatLng(clickedLatLng); // Set the coordinates for the clicked location
      openModal("addNavpoint", clickedLatLng);
    },
  });
  return null;
}

export default function Charts({ layline, setLayline }) {
  const [geoData, setGeoData] = useState(null);
  const [longPressLatLng, setLongPressLatLng] = useState(null);
  const [clickLatLng, setClickLatLng] = useState(null);
  const [showStartLineModal, setShowStartLineModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [raceName, setRaceName] = useState("");
  const mapRef = useRef(null);
  const { autoAdvanceDistance } = useDisplaySettings();
  const { navpoints, destinations, setDestinations, addNavpoint } = useNavpoints();
  const { openModal, closeModal, modalType, modalProps } = useModal();
  const { isSidebarOpen } = useSidebar();
  const {
    startTime,
    countdownActive,
    raceStarted,
    elapsedTime,
    countdownDisplay,
    course,
    currentMarkIndex,
    startLine,
    distanceToStart,
    timeToStart,
    distanceToMark,
    timeToMark,
    bearingToMark,
    savedRaces,
    showRaceMode,
    setStartTime,
    setCourse,
    setStartLine,
    setShowRaceMode,
    saveCurrentRace,
    deleteSavedRace,
    resetRace
  } = useRace();
  const fallbackLatLon = [43.3875, -87.8750]; // Port Washington, WI
  const liveLat = liveData.get().lat;
  const liveLon = liveData.get().lon;
  const isValidCoord = (v) => typeof v === "number" && !isNaN(v);
  const lat = isValidCoord(liveLat) ? liveLat : fallbackLatLon[0];
  const lon = isValidCoord(liveLon) ? liveLon : fallbackLatLon[1];
  const center = [lat, lon];
  const currentDestination = destinations.find((d) => isValidCoord(d.lat) && isValidCoord(d.lon));
  const distanceToDestination = currentDestination && isValidCoord(lat) && isValidCoord(lon)
    ? L.latLng(lat, lon).distanceTo(L.latLng(currentDestination.lat, currentDestination.lon)) / 1852
    : null;
  const { mapSource } = useDisplaySettings();
  const [etaNextMin, setEtaNextMin] = useState(null);
  const [etaNextSec, setEtaNextSec] = useState(null);
  const [etaFullMin, setEtaFullMin] = useState(null);
  const [etaFullSec, setEtaFullSec] = useState(null);
  const speedRef = useRef();
  const headingRef = useRef();
  const [isSpeedPanelExpanded, setIsSpeedPanelExpanded] = useState(false);
  const [isHeadingPanelExpanded, setIsHeadingPanelExpanded] = useState(false);
  const [speedFocusKey, setSpeedFocusKey] = useState("speed");
  const [headingFocusKey, setHeadingFocusKey] = useState("heading");
  const [isWindPanelExpanded, setIsWindPanelExpanded] = useState(false);
  const [windFocusKey, setWindFocusKey] = useState("true");
  const windRef = useRef();
  const compass = liveData.getCompassHeading();
  const {
    showBathyShallow,
    showBathyDeep,
    showAutoAdvanceRadius,
    showWindPanel,
    showGpsMarker,
    showSoundings,
    showNavpoints,
  } = useDisplaySettings();
  const tileBase =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      ? "http://localhost:8085"
      : `http://${window.location.hostname}:8085`;
  const { isTracking } = useTrip();
  const [showTracker, setShowTracker] = useState(false);
  const { fleet, getVesselColor } = useFleet();
  console.log("Fleet array length:", fleet.length);


        {/* FLEET ICON SETTINGS */}

  const fleetIcon = (color) =>
    L.divIcon({
      className: "fleet-marker",
      html: `
        <div style="
          width: 26px;
          height: 26px;
          background: ${color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 0 6px rgba(0,0,0,0.5);
          animation: pulse 1s infinite;
        "></div>
        <style>
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
          }
        </style>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });


  useEffect(() => {
    fetch("/data/soundings.geojson")
      .then(res => res.json())
      .then(data => setGeoData(data));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const speed = liveData.getSpeed();
      if (speed > 0 && isValidCoord(lat) && isValidCoord(lon)) {
        if (currentDestination) {
          const distNM = L.latLng(lat, lon).distanceTo(L.latLng(currentDestination.lat, currentDestination.lon)) / 1852;
          const totalSecNext = Math.round((distNM / speed) * 3600);
          setEtaNextMin(formatEta(totalSecNext));
        }
        if (destinations.length > 0) {
          const distNM = calculateTotalTripDistance(lat, lon, destinations);
          const totalSecFull = Math.round((distNM / speed) * 3600);
          setEtaFullMin(formatEta(totalSecFull));
        }
      } else {
        setEtaNextMin(null);
        setEtaFullMin(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lat, lon, currentDestination, destinations]);

  const tempMarkerIcon = L.icon({
    iconUrl: "icons/location-pin.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  const navpointIcon = L.icon({
    iconUrl: "icons/location-pin.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  // Removed duplicate WebSocket connection - using centralized WebSocketContext instead

  const hasAdvancedRef = useRef(false);

  useEffect(() => {
    const firstWaypoint = destinations[0];
    if (
      firstWaypoint &&
      isValidCoord(lat) &&
      isValidCoord(lon) &&
      isValidCoord(firstWaypoint.lat) &&
      isValidCoord(firstWaypoint.lon)
    ) {
      const distanceMeters = L.latLng(lat, lon).distanceTo(
        L.latLng(firstWaypoint.lat, firstWaypoint.lon)
      );
      if (distanceMeters < autoAdvanceDistance && !hasAdvancedRef.current) {
        hasAdvancedRef.current = true;
        advanceToNextWaypoint();
        setTimeout(() => {
          hasAdvancedRef.current = false;
        }, 5000);
      }
    }
  }, [lat, lon, destinations, autoAdvanceDistance]);


  useEffect(() => {
    if (
      currentDestination &&
      isValidCoord(lat) &&
      isValidCoord(lon) &&
      isValidCoord(currentDestination.lat) &&
      isValidCoord(currentDestination.lon)
    ) {
      const bearing = calculateBearing(
        lat,
        lon,
        currentDestination.lat,
        currentDestination.lon
      );
      syncValue("bearingToDestination", bearing);  // ✅ this does everything
    } else {
      syncValue("bearingToDestination", null);
    }
  }, [lat, lon, currentDestination]);
  


  function formatEta(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  }

  function calculateTotalTripDistance(currentLat, currentLon, destinations) {
    const valid = destinations.filter(
      (d) => typeof d.lat === "number" && typeof d.lon === "number" && !isNaN(d.lat) && !isNaN(d.lon)
    );
    if (valid.length === 0) return 0;
    let total = 0;
    let prev = L.latLng(currentLat, currentLon);
    for (const dest of valid) {
      const next = L.latLng(dest.lat, dest.lon);
      total += prev.distanceTo(next);
      prev = next;
    }
    return total / 1852; // Convert meters to nautical miles
  }

  function getTimeToDestinationNM(currentLat, currentLon, destinations, speedKnots) {
    const tripDistance = calculateTotalTripDistance(currentLat, currentLon, destinations);
    if (speedKnots <= 0 || isNaN(speedKnots)) return null;
    const hours = tripDistance / speedKnots;
    return Math.floor(hours * 60); // Convert to minutes
  }

  function getTimeToNextWaypointNM(currentLat, currentLon, waypoint, speedKnots) {
    if (!waypoint || speedKnots <= 0 || isNaN(speedKnots)) return null;
    const dist = L.latLng(currentLat, currentLon).distanceTo(L.latLng(waypoint.lat, waypoint.lon)) / 1852;
    const hours = dist / speedKnots;
    return Math.floor(hours * 60); // minutes
  }

  function advanceToNextWaypoint() {
    if (destinations.length > 1) {
      const updated = [...destinations.slice(1)];
      setDestinations(updated); // You must have this from useNavpoints context
    } else {
      setDestinations([]); // All done
    }
  }



  function distanceToLineSegment(p, v, w) {
    // p: current position [lat, lon]
    // v and w: layline.from and layline.to as [lat, lon]
    const latLngP = L.latLng(p[0], p[1]);
    const latLngV = L.latLng(v[0], v[1]);
    const latLngW = L.latLng(w[0], w[1]);
  
    const l2 = latLngV.distanceTo(latLngW) ** 2;
    if (l2 === 0) return latLngP.distanceTo(latLngV);
  
    const t = Math.max(0, Math.min(1,
      ((latLngP.lat - latLngV.lat) * (latLngW.lat - latLngV.lat) +
       (latLngP.lng - latLngV.lng) * (latLngW.lng - latLngV.lng)) /
      ((latLngW.lat - latLngV.lat) ** 2 + (latLngW.lng - latLngV.lng) ** 2)
    ));
  
    const projection = L.latLng(
      latLngV.lat + t * (latLngW.lat - latLngV.lat),
      latLngV.lng + t * (latLngW.lng - latLngV.lng)
    );
  
    return latLngP.distanceTo(projection); // in meters
  }



  const legBearing = (
    destinations.length >= 2 &&
    isValidCoord(destinations[0]?.lat) &&
    isValidCoord(destinations[0]?.lon) &&
    isValidCoord(destinations[1]?.lat) &&
    isValidCoord(destinations[1]?.lon)
  )
    ? calculateBearing(
        destinations[0].lat,
        destinations[0].lon,
        destinations[1].lat,
        destinations[1].lon
      ).toFixed(0)
    : null;
  

  

  return (
    <div className="h-full w-full relative overflow-hidden">
      <MapContainer
        center={center}
        zoom={15}
        minZoom={8}
        maxZoom={20}
        scrollWheelZoom
        touchZoom
        zoomControl={false}
        whenCreated={(mapInstance) => {
          mapRef.current = mapInstance;
        }}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
        keepBuffer={4}
        updateWhenZooming={false}
        updateWhenIdle={true}
        preferCanvas={true}
      >



{showBathyShallow && (
  <TileLayer
    url="/charts/BathyShallow/{z}/{x}/{y}.png"
    attribution="NOAA Bathymetry Shallow"
    maxZoom={12}
    zIndex={500}
    keepBuffer={4}
    updateWhenZooming={false}
    updateWhenIdle={true}
  />
)}

{showBathyDeep && (
  <TileLayer
    url="/charts/BathyDeep/{z}/{x}/{y}.png"
    attribution="NOAA Bathymetry Deep"
    maxZoom={12}
    zIndex={700}  // ensures it's drawn over shallow
    keepBuffer={4}
    updateWhenZooming={false}
    updateWhenIdle={true}
  />
)}


<TileLayer
  attribution="NOAA ENC styled with QGIS"
  url={`${tileBase}/tiles/{z}/{x}/{y}.png`}
  maxZoom={18}
  keepBuffer={5}
  updateWhenZooming={false}
  updateWhenIdle={true}
  tileSize={256}
  zoomOffset={0}
/>

{mapSource === "esri" && navigator.onLine && (
  <TileLayer
    url="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    attribution="Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics"
    maxZoom={20}
    zIndex={1000} // draw on top
    keepBuffer={5}
    updateWhenZooming={true}
    updateWhenIdle={true}
  />
)}


        {/* ClickHandler Popup: Click to add marker */}
        <ClickPopup setClickLatLng={setClickLatLng} />

        {/* Trip Playback - renders tracking paths and playback markers */}
        <TripPlayback mapRef={mapRef} />

        {/* Show clicked Lat/Lon marker */}
        {clickLatLng && (
          <Marker
            position={[clickLatLng.lat, clickLatLng.lng]}
            icon={tempMarkerIcon}
          >
            <Popup autoClose={false} autoPan={false}>
              <div>
                Lat: {clickLatLng.lat.toFixed(4)}<br />
                Lon: {clickLatLng.lng.toFixed(4)}<br />
                <button
                  className="bg-green-500 text-white p-2 rounded mt-2"
                  onClick={() => openModal("addNavpoint", clickLatLng)}
                >
                  Add as Navpoint
                </button>
              </div>
            </Popup>
          </Marker>
        )}

{fleet.map((vessel, index) => (
  vessel.latitude && vessel.longitude && (
     <Marker
    key={`fleet-${index}`}
    position={[vessel.latitude, vessel.longitude]}
    icon={fleetIcon(getVesselColor(vessel.id))}
  >
    <Popup>
      <strong>{vessel.name}</strong><br />
      Lat: {vessel.latitude.toFixed(5)}<br />
      Lon: {vessel.longitude.toFixed(5)}<br />
      Battery: {vessel.battery}%
    </Popup>
  </Marker>
  )
))}



{showAutoAdvanceRadius && isValidCoord(lat) && isValidCoord(lon) && (
  <Circle
    center={[lat, lon]}
    radius={autoAdvanceDistance}
    pathOptions={{
      color: "orange",
      weight: 2,
      opacity: 0.6,
      dashArray: "4 6"
    }}
  />
)}

        {/* Soundings */}
        {showSoundings && geoData && (
          <GeoJSON
            data={geoData}
            pointToLayer={(feature, latlng) =>
              L.circleMarker(latlng, {
                radius: 4,
                fillColor: "#0066cc",
                color: "#fff",
                weight: 1,
                fillOpacity: 0.9,
              })
            }
          />
        )}


      {showWindPanel && (
      <div
      ref={windRef}
      className={clsx(
        "absolute bottom-4 left-4 z-[1000] text-white rounded-2xl shadow-xl bg-zinc-900 bg-opacity-60 transition-all duration-300",
        isWindPanelExpanded ? "px-8 py-6 w-[28rem] space-y-4" : "px-6 py-4 w-72 space-y-2"
      )}
    >
      {isWindPanelExpanded && (
        <button
          className="absolute top-2 right-2 text-white text-lg bg-zinc-700 hover:bg-zinc-600 rounded px-2"
          onClick={() => setIsWindPanelExpanded(false)}
        >
          ⤫
        </button>
      )}
    
      {isWindPanelExpanded ? (
        <div className="space-y-3 text-xl mt-4">
          {["true", "apparent"].map((key) => (
            <div
              key={key}
              onClick={() => setWindFocusKey(key)}
              className={clsx(
                "cursor-pointer transition-all",
                windFocusKey === key ? "text-7xl text-white font-extrabold" : "text-xl text-zinc-300"
              )}
            >
              {{
                apparent: `Apparent: ${liveData.get().apparentWindDirection}°  ${liveData.get().apparentWindSpeed} kn`,
                true: `True: ${liveData.get().trueWindDirection}°  ${liveData.get().trueWindSpeed} kn`,
              }[key]}
            </div>
          ))}
        </div>
      ) : (
        <div onClick={() => setIsWindPanelExpanded(true)} className="space-y-1 cursor-pointer">
          <div className="text-xl">
          Apparent: {liveData.get().apparentWindDirection}°  {liveData.get().apparentWindSpeed} kn
          </div>
          <div className="text-xl">
          True: {liveData.get().trueWindDirection}°  {liveData.get().trueWindSpeed} kn
          </div>
        </div>
      )}
    </div>
    
     
      )}

        {/* GPS Marker */}
        {showGpsMarker && isValidCoord(lat) && isValidCoord(lon) && (
  <Marker
    position={[lat, lon]}
    icon={L.divIcon({
      className: "boat-marker",
      html: `
        <img
          src="icons/boat.png"
          style="
            width: 64px;
            height: 64px;
            transform: translate(-50%, -50%) rotate(${compass}deg);

            transition: transform 0.2s linear;
            position: absolute;
            top: 50%;
            left: 50%;
          "
        />
      `,
      iconSize: [64, 64],
      iconAnchor: [32, 32],
    })}
  >
    <Popup>{localStorage.getItem("boatName") || "Your Position"}</Popup>
  </Marker>
)}


        {/* Navpoints */}
        {showNavpoints && Array.isArray(navpoints) &&
          navpoints.filter(p => isValidCoord(p.lat) && isValidCoord(p.lon)).map((point, index) => (
            <Marker key={index} position={[point.lat, point.lon]}>
              <Popup>{point.name}<br />{point.lat.toFixed(4)}, {point.lon.toFixed(4)}</Popup>
            </Marker>
        ))}

        {/* Destinations and Polyline */}
        {Array.isArray(destinations) && destinations.length > 0 && (
          <>
            {destinations.filter(d => isValidCoord(d.lat) && isValidCoord(d.lon)).map((dest, i) => (
              <Marker key={`dest-${i}`} position={[dest.lat, dest.lon]}>
                <Popup>{dest.name}</Popup>
              </Marker>
            ))}
            <Polyline
              positions={[
                [lat, lon],
                ...destinations.filter(d => isValidCoord(d.lat) && isValidCoord(d.lon)).map(d => [d.lat, d.lon]),
              ]}
              color="red"
              weight={5}
              dashArray="6,8"
            />
          </>
        )}

{layline.from && layline.to && (
  <Polyline
    positions={[
      [layline.from.lat, layline.from.lon],
      [layline.to.lat, layline.to.lon],
    ]}
    color="blue"
    weight={4}
    dashArray="2,6"
  />
)}

{/* Race Start Line */}
{startLine.pin1 && startLine.pin2 && (
  <Polyline
    positions={[
      [startLine.pin1.lat, startLine.pin1.lon],
      [startLine.pin2.lat, startLine.pin2.lon],
    ]}
    color="green"
    weight={6}
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
          background: ${index === currentMarkIndex ? '#ff4444' : '#44ff44'};
          color: white;
          border: 3px solid white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">
          ${index + 1}
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })}
  >
    <Popup>
      <div className="text-center">
        <div className="font-bold">Mark {index + 1}</div>
        <div className="text-sm">{mark.name}</div>
        <div className="text-xs text-gray-600">
          {mark.lat.toFixed(4)}, {mark.lon.toFixed(4)}
        </div>
      </div>
    </Popup>
  </Marker>
))}

{/* Race Course Polyline */}
{course.length > 1 && (
  <Polyline
    positions={course.map(mark => [mark.lat, mark.lon])}
    color="purple"
    weight={4}
    dashArray="8,4"
  />
)}

{(!isValidCoord(liveLat) || !isValidCoord(liveLon)) && (
  <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-md shadow-md z-[2000] text-sm font-semibold">
    ⚠️ GPS signal unavailable — showing fallback location (Port Washington)
  </div>
)}

      </MapContainer>

      {/* Bottom buttons: Tracker, Race Mode, and others */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-4 z-[1000]">
        {/* Tracker Button */}
        <button
          className="w-56 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full"
          onClick={() => setShowTracker(true)}
        >
          Tracker
        </button>
        {/* Race Mode Button */}
        <button
          className="w-56 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full"
          onClick={() => setShowRaceMode(!showRaceMode)}
        >
          {showRaceMode ? "Exit Race Mode" : "Race Mode"}
        </button>
        {/* Add Navpoint Button */}
        <button
          className="w-56 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-full"
          onClick={() => openModal("addNavpoint")}
        >
          ➕ Add Navpoint
        </button>
        {/* Set Destination Button */}
        {navpoints.length > 0 && (
          <button
            className="w-56 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-6 rounded-full"
            onClick={() => openModal("setDestination")}
          >
            Set Destination
          </button>
        )}
        {/* Show Rhumb Line Button */}
        <button
          className="w-56 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full"
          onClick={() => openModal("layline")}
        >
          ➤ Show Rhumb Line
        </button>
      </div>

     {/* Speed Display - Upper Right Expandable */}
     <div
  ref={speedRef}
  className={clsx(
    "absolute top-4 right-4 z-[1000] text-white rounded-2xl shadow-xl bg-zinc-900 bg-opacity-60 transition-all duration-300",
    isSpeedPanelExpanded ? "px-8 py-6 w-80 space-y-4" : "px-4 py-2 w-40 space-y-2"
  )}
>
  {/* Minimize Button */}
  {isSpeedPanelExpanded && (
    <button
      className="absolute top-2 right-2 text-white text-lg bg-zinc-700 hover:bg-zinc-600 rounded px-2"
      onClick={() => setIsSpeedPanelExpanded(false)}
    >
      ⤫
    </button>
  )}

  {/* Expanded State */}
  {isSpeedPanelExpanded ? (
    <div className="space-y-3 text-xl mt-4">
      {["speed", "heading", "wind", "depth"].map((key) => (
        <div
          key={key}
          onClick={() => setSpeedFocusKey(key)}
          className={clsx(
            "cursor-pointer transition-all",
            speedFocusKey === key ? "text-7xl text-white font-extrabold" : "text-xl text-zinc-300"
          )}
        >
          {{
            speed: `${liveData.getSpeed()?.toFixed(1) ?? "—"} kn`,
            heading: `HDG: ${compass.toFixed(0)}°`,
            wind: `Wind: ${liveData.get().windAngle?.toFixed(0) ?? "—"}°`,
            depth: `Depth: ${liveData.get().depthFeet?.toFixed(1) ?? "—"} ft`,
          }[key]}
        </div>
      ))}
    </div>
  ) : (
    // Collapsed: show dominant value only
    <div
      onClick={() => setIsSpeedPanelExpanded(true)}
      className="text-3xl font-bold cursor-pointer"
    >
      {(() => {
        switch (speedFocusKey) {
          case "heading":
            return `HDG: ${((compass + 360) % 360).toFixed(0)}°`;
          case "wind":
            return `WND: ${liveData.get().windAngle?.toFixed(0) ?? "—"}°`;
          case "depth":
            return `DP: ${liveData.get().depthFeet?.toFixed(1) ?? "—"}ft`;
          default:
            return `${liveData.getSpeed()?.toFixed(1) ?? "—"} kn`;
        }
      })()}
    </div>
  )}
</div>




{/* Heading Display - Upper Left Expandable */}
<div
  ref={headingRef}
  className={clsx(
    "absolute top-4 left-4 z-[1000] text-white rounded-2xl shadow-xl bg-zinc-900 bg-opacity-60 transition-all duration-300",
    isHeadingPanelExpanded ? "px-8 py-6 w-80 space-y-4" : "px-4 py-2 w-40 space-y-2"
  )}
>
  {/* Minimize Button */}
  {isHeadingPanelExpanded && (
    <button
      className="absolute top-2 right-2 text-white text-lg bg-zinc-700 hover:bg-zinc-600 rounded px-2"
      onClick={() => setIsHeadingPanelExpanded(false)}
    >
      ⤫
    </button>
  )}

  {/* Expanded View */}
  {isHeadingPanelExpanded ? (
    <div className="space-y-3 text-xl mt-4">
      {["heading", "heel", "pitch"].map((key) => (
        <div
          key={key}
          onClick={() => setHeadingFocusKey(key)}
          className={clsx(
            "cursor-pointer transition-all",
            headingFocusKey === key ? "text-7xl text-white font-extrabold" : "text-xl text-zinc-300"
          )}
        >
          {{
            heading: `HDG: ${((compass + 360) % 360).toFixed(0)}°`,
            heel: `Heel: ${liveData.get().heel?.toFixed(1) ?? "—"}°`,
            pitch: `Pitch: ${liveData.get().pitch?.toFixed(1) ?? "—"}°`,
          }[key]}
        </div>
      ))}
    </div>
  ) : (
    // Collapsed View
    <div
      onClick={() => setIsHeadingPanelExpanded(true)}
      className="text-3xl font-bold cursor-pointer"
    >
      {(() => {
        switch (headingFocusKey) {
          case "heel":
            return `Heel: ${liveData.get().heel?.toFixed(1) ?? "—"}°`;
          case "pitch":
            return `Pitch: ${liveData.get().pitch?.toFixed(1) ?? "—"}°`;
          default:
            return `${((compass + 360) % 360).toFixed(0)}°`;
        }
      })()}
    </div>
  )}
</div>


      {/* Time to Current Destination */}
      {currentDestination && distanceToDestination != null && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-zinc-800 bg-opacity-80 text-white rounded-2xl px-14 py-4 shadow-xl z-[1000] text-center space-y-3">
          <div className="flex items-center justify-center gap-6 text-8xl font-bold">
            <div>{calculateBearing(lat, lon, currentDestination.lat, currentDestination.lon).toFixed(0)}°</div>
            <div className="w-10 h-10" style={{
              transform: `rotate(${calculateBearing(lat, lon, currentDestination.lat, currentDestination.lon)}deg)`,
              transition: "transform 0.3s ease",
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"
                className="w-10 h-10 text-amber-400">
                <path d="M12 2l6 8h-4v8h-4v-8H6l6-8z" />
              </svg>
            </div>
            <div className="text-3xl">{distanceToDestination.toFixed(2)} nm</div>
          </div>
          {etaNextMin != null && (
          <div className="text-2xl font-medium text-zinc-300">
           ETA (Next): {etaNextMin} {etaNextSec}
           </div>
           )}

        </div>
      )}

        {destinations.length > 0 && isValidCoord(lat) && isValidCoord(lon) && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-zinc-800 bg-opacity-60 text-white rounded-full px-8 py-4 text-xl font-semibold shadow-xl z-[1000] text-center space-y-1">
         <div>Total Trip: {calculateTotalTripDistance(lat, lon, destinations).toFixed(2)} nm</div>
         {legBearing !== null && legBearing !== undefined && (
  <div className="text-2xl font-medium text-zinc-300">
    Next Leg: {legBearing}°
  </div>
)}
{liveData.getSpeed() > 0 && (
  <>
 <div>ETA (Full Trip): {etaFullMin}</div>
  </>
)}
        </div>
      )}

{layline.from && layline.to && isValidCoord(lat) && isValidCoord(lon) && (
  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-zinc-800 bg-opacity-60 text-white rounded-xl px-6 py-4 text-xl font-semibold shadow-lg z-[1000] text-center">
    <div>Off Layline:</div>
    <div className="text-4xl mt-1 font-bold">
      {(distanceToLineSegment(
        [lat, lon],
        [layline.from.lat, layline.from.lon],
        [layline.to.lat, layline.to.lon]
      ) / 1852).toFixed(2)} nm
    </div>
  </div>
)}


      {/* Trip Tracker Floating Box */}
      {showTracker && (
        <div
          style={{
            position: 'fixed',
            right: '1rem',
            bottom: '28rem',
            zIndex: 1000
          }}
          className="bg-zinc-900 bg-opacity-90 text-white rounded-2xl shadow-xl p-4 min-w-80 max-w-md"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold mb-0">Trip Tracker</h3>
            <button
              onClick={() => setShowTracker(false)}
              className="text-zinc-400 hover:text-white text-xl"
            >
              ×
            </button>
          </div>
          <TripTracker />
        </div>
      )}

      {/* Modals */}
      {modalType === "addNavpoint" && (
        <AddNavpointModal closeModal={closeModal} lat={clickLatLng?.lat} lon={clickLatLng?.lng} />
      )}
      {modalType === "setDestination" && <SetDestinationModal closeModal={closeModal} />}

      {/* Race Mode Overlay */}
      {showRaceMode && (
        <div
          style={{
            position: 'fixed',
            left: isSidebarOpen ? '21rem' : '1rem',
            top: '24rem',
            zIndex: 1000
          }}
          className="bg-zinc-900 bg-opacity-90 text-white rounded-2xl shadow-xl p-4 min-w-80 max-w-md"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold mb-0">Race Dashboard</h3>
          </div>
          {/* Countdown Display */}
          {countdownActive && (
            <div className={clsx(
              "text-lg font-bold mb-4 p-3 rounded-lg",
              raceStarted ? "bg-green-600" : "bg-red-600"
            )}>
              {raceStarted ? (
                <div>
                  <div className="text-sm">RACE IN PROGRESS</div>
                  <div className="text-xl">{formatElapsedTime(elapsedTime)}</div>
                </div>
              ) : (
                <div>
                  <div className="text-lg font-bold mb-2">⏱ Countdown</div>
                  <div className="text-6xl font-extrabold leading-none">
                    {countdownDisplay}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Start Line Info */}
          {startLine.pin1 && startLine.pin2 && (
            <div className="mb-4 bg-zinc-800 p-3 rounded-lg">
              <div className="text-sm font-semibold mb-2">Start Line</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-zinc-400">Distance</div>
                  <div className="font-bold">
                    {distanceToStart ? `${distanceToStart.toFixed(2)} nm` : "--"}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-400">Time</div>
                  <div className="font-bold">{formatTimeTo(timeToStart)}</div>
                </div>
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {startLine.pin1.name} → {startLine.pin2.name}
              </div>
            </div>
          )}
          {/* Course Info */}
          {course.length > 0 && (
            <div className="mb-4 bg-zinc-800 p-3 rounded-lg">
              <div className="text-sm font-semibold mb-2">
                Next: {course[currentMarkIndex]?.name || "Unknown"}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-zinc-400">Dist</div>
                  <div className="font-bold">
                    {distanceToMark ? `${distanceToMark.toFixed(2)} nm` : "--"}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-400">Brg</div>
                  <div className="font-bold">
                    {bearingToMark ? `${bearingToMark.toFixed(0)}°` : "--"}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-400">Time</div>
                  <div className="font-bold">{formatTimeTo(timeToMark)}</div>
                </div>
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                Mark {currentMarkIndex + 1} of {course.length}
              </div>
            </div>
          )}
          {/* Race Controls */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setShowStartLineModal(true)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
            >
              Set Start Line
            </button>
            <button
              onClick={() => setShowCourseModal(true)}
              className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm"
            >
              Set Course
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowSaveModal(true)}
              disabled={!startTime || course.length === 0}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 text-white rounded text-sm"
            >
              Save Race
            </button>
            <button
              onClick={resetRace}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {showStartLineModal && (
        <StartLineSelector onClose={() => setShowStartLineModal(false)} />
      )}

      {showCourseModal && (
        <CourseSelector onClose={() => setShowCourseModal(false)} />
      )}

      {showSaveModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 z-[10001] flex items-center justify-center"
          onClick={() => setShowSaveModal(false)}
        >
          <div className="bg-zinc-800 p-6 rounded-2xl shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Race</h3>
            <input
              type="text"
              value={raceName}
              onChange={(e) => setRaceName(e.target.value)}
              placeholder="Enter race name"
              className="w-full bg-zinc-700 text-white px-3 py-2 rounded mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveRace}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
              >
                Save
              </button>
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 bg-zinc-600 hover:bg-zinc-700 text-white py-2 px-4 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

  );
}

// Race-specific functions
const formatGPSTime = (gpsTimeString) => {
  if (!gpsTimeString) return "No GPS Time";
  
  if (gpsTimeString.includes(':') && gpsTimeString.split(':').length === 2) {
    return gpsTimeString;
  }
  
  if (gpsTimeString.includes('T') || gpsTimeString.includes(' ')) {
    const timePart = gpsTimeString.split('T')[1] || gpsTimeString.split(' ')[1];
    return timePart ? timePart.substring(0, 5) : gpsTimeString;
  }
  
  return gpsTimeString;
};

const formatElapsedTime = (milliseconds) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
};

const formatTimeTo = (seconds) => {
  if (!seconds || seconds <= 0) return "--";
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
};

const handleDeleteRace = (raceId) => {
  if (confirm('Are you sure you want to delete this race?')) {
    deleteSavedRace(raceId);
  }
};

const handleSaveRace = () => {
  if (raceName.trim()) {
    saveCurrentRace(raceName.trim());
    setShowSaveModal(false);
    setRaceName("");
  }
};


