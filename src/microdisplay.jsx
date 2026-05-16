import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import SidebarMicro from "./components/SidebarMicro";
import HeaderMicro from "./components/HeaderMicro";
import Microdash from "./components/Microdash";
import Charts from "./components/MicroCharts";
import Settings from "./components/Settings";


import { useSidebar } from "./context/SidebarContext";
import { useModal } from "./context/ModalContext";
import AddNavpointModal from "./components/AddNavpointModal";
import SetDestinationModal from "./components/SetDestinationModal";
import LaylineModal from "./components/LaylineModal";
import WindowModal from "./context/WindowModal";
import currentLocation from "./utils/currentLocation";

export default function Microdisplay({ nightMode, signalkData, setNightMode, brightness, setBrightness }) {
  const { lat, lon } = currentLocation;
  const [layline, setLayline] = useState({ from: null, to: null });
  const { isSidebarOpen } = useSidebar();
  const { modalType, closeModal } = useModal();

  const baseUrl = "https://embed.windy.com/embed.html";
  const isWeatherModal = ["radar", "liveWind", "forecast"].includes(modalType);

  const radarUrl = `${baseUrl}?overlay=radar&lat=${lat}&lon=${lon}`;
  const liveWindUrl = `${baseUrl}?overlay=wind&lat=${lat}&lon=${lon}`;
  const forecastUrl = `${baseUrl}?overlay=wind&lat=${lat}&lon=${lon}`;

  return (
    <div className={`flex h-screen transition-all duration-300 bg-zinc-900 ${nightMode ? "text-amber-500" : "text-white"}`} style={{ filter: `brightness(${brightness / 100})` }}>
      <SidebarMicro nightMode={nightMode} boatName={localStorage.getItem("boatName")} />
      <div className="flex flex-col flex-1 overflow-hidden transition-all duration-300">
        <HeaderMicro nightMode={nightMode} />
        <main className="flex-1 overflow-y-auto p-4">
          <Routes>
            <Route path="/" element={<Microdash />} />
            <Route path="charts" element={<Charts layline={layline} setLayline={setLayline} />} />

            <Route path="settings" element={<Settings />} />
          </Routes>
        </main>
      </div>

      {/* Modal display */}
      {!isWeatherModal && modalType && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999]" onClick={closeModal}>
          <div className="bg-zinc-800 p-8 rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto w-[90%] max-w-md" onClick={(e) => e.stopPropagation()}>
            {modalType === "addNavpoint" && <AddNavpointModal closeModal={closeModal} />}
            {modalType === "setDestination" && <SetDestinationModal closeModal={closeModal} />}
            {modalType === "layline" && <LaylineModal closeModal={closeModal} setLayline={setLayline} layline={layline} />}
          </div>
        </div>
      )}

      {/* Windy iframe windows */}
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
