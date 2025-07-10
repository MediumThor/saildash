import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Dashboard from "./Dashboard";
import Settings from "./Settings";
import Charts from "./Charts";
import MicroCharts from "./MicroCharts";
import GPS from "./GPS";
import Weather from "./Weather";
import Wifi from "./Wifi";
import Music from "./Music";
import Microdisplay from "./Microdash";
import Race from "./Race"; // ✅ NEW
import AIChat from "./AIChat"; // ✅ NEW

import { useSidebar } from "../context/SidebarContext";
import { useModal } from "../context/ModalContext";
import AddNavpointModal from "./AddNavpointModal";
import SetDestinationModal from "./SetDestinationModal";
import LaylineModal from "./LaylineModal";
import WindowModal from "../context/WindowModal";
import currentLocation from "../utils/currentLocation";

export default function AppLayout({ nightMode, signalkData, setNightMode, brightness, setBrightness }) {
  const { lat, lon } = currentLocation;
  const [layline, setLayline] = useState({ from: null, to: null });

  const { isSidebarOpen } = useSidebar();
  const { modalType, closeModal } = useModal();
  const baseUrl = "https://embed.windy.com/embed.html";
  const isWeatherModal = ["radar", "liveWind", "forecast"].includes(modalType);

  const radarUrl = `${baseUrl}?type=map&location=coordinates&metricRain=in&metricTemp=°F&metricWind=kt&zoom=7&overlay=radar&product=radar&detail=false&level=surface&lat=${lat}&lon=${lon}`;
  const liveWindUrl = `${baseUrl}?type=map&location=coordinates&metricRain=in&metricTemp=°F&metricWind=kt&zoom=6&overlay=wind&product=ecmwf&detail=false&level=surface&lat=${lat}&lon=${lon}`;
  const forecastUrl = `${baseUrl}?type=map&location=coordinates&metricRain=in&metricTemp=°F&metricWind=kt&zoom=6&overlay=wind&product=ecmwf&level=surface&lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&detail=true`;

  return (
    <div className={`flex h-screen transition-all duration-300 bg-zinc-900 ${nightMode ? "text-amber-500" : "text-white"}`}
      style={{ filter: `brightness(${brightness / 100})` }}>
      <Sidebar nightMode={nightMode} boatName={localStorage.getItem("boatName")} />
      <div className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ${isSidebarOpen ? "ml-80" : "ml-0"}`}>
        <Header nightMode={nightMode} />
        <main className="flex-1 overflow-hidden h-full">
          <Routes>
            <Route path="/" element={<Dashboard signalkData={signalkData} />} />
            <Route path="/settings" element={
              <Settings
                nightMode={nightMode}
                setNightMode={setNightMode}
                brightness={brightness}
                setBrightness={setBrightness}
              />} />
            <Route path="/charts" element={<Charts layline={layline} setLayline={setLayline} />} />
            <Route path="/microcharts" element={<MicroCharts layline={layline} setLayline={setLayline} />} />
            <Route path="/gps" element={<GPS />} />
            <Route path="/weather" element={<Weather />} />
            <Route path="/wifi" element={<Wifi />} />
            <Route path="/music" element={<Music />} />
            <Route path="/microdisplay" element={<Microdisplay />} />
            <Route path="/race" element={<Race />} /> {/* ✅ NEW ROUTE */}
            <Route path="/ai-chat" element={<AIChat nightMode={nightMode} />} /> {/* ✅ NEW ROUTE */}
          </Routes>
        </main>
      </div>

      {!isWeatherModal && modalType && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999]" onClick={closeModal}>
          <div className="bg-zinc-800 p-8 rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto w-[90%] max-w-md"
            onClick={(e) => e.stopPropagation()}>
            {modalType === "addNavpoint" && <AddNavpointModal closeModal={closeModal} />}
            {modalType === "setDestination" && <SetDestinationModal closeModal={closeModal} />}
            {modalType === "layline" && (
              <LaylineModal closeModal={closeModal} setLayline={setLayline} layline={layline} />
            )}
          </div>
        </div>
      )}

      {isWeatherModal && (
        <>
          <WindowModal name="radar" url={radarUrl}>
            <iframe src={radarUrl} className="w-full h-full border-0" allowFullScreen />
          </WindowModal>
          <WindowModal name="liveWind" url={liveWindUrl}>
            <iframe src={liveWindUrl} className="w-full h-full border-0" allowFullScreen />
          </WindowModal>
          <WindowModal name="forecast" url={forecastUrl}>
            <iframe src={forecastUrl} className="w-full h-full border-0" allowFullScreen />
          </WindowModal>
        </>
      )}
    </div>
  );
}
