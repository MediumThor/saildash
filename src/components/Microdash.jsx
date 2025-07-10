import React, { useEffect, useState } from "react";
import { useModal } from "../context/ModalContext";
import liveData from "../utils/liveData";
import { listenForValue } from "../utils/syncStorage";

export default function Microdash({ signalkData }) {
  const { openModal } = useModal();
  const [data, setData] = useState(liveData.get());
  const [activeInstrument, setActiveInstrument] = useState("bme");
  const CHANNEL_NAME = "saildash-data";

  useEffect(() => {
    listenForValue("bearingToDestination");
  }, []);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setData(liveData.get());
    }, 200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.hostname}:8081`);
    ws.onmessage = (event) => {
      try {
        const incoming = JSON.parse(event.data);
        liveData.set(incoming);
      } catch (err) {
        console.error("WebSocket error:", err);
      }
    };
    ws.onopen = () => console.log("📡 Connected to serial WebSocket");
    ws.onerror = (err) => console.error("WebSocket error:", err);
    ws.onclose = () => console.log("WebSocket closed");
    return () => ws.close();
  }, []);

  const renderInstrument = () => {
    switch (activeInstrument) {
      case "bme":
        return (
          <div className="flex flex-col items-center justify-start h-full space-y-8 text-center text-7xl font-bold">
            <div>Temp: {data?.temperature ? `${data.temperature}°F` : "—"}</div>
            <div>Humidity: {data?.humidity ? `${data.humidity}%` : "—"}</div>
            <div>Pressure: {data?.pressure ? `${data.pressure} hPa` : "—"}</div>
          </div>
        );

      case "compass":
        return (
          <div className="flex flex-col items-center justify-center h-full text-white">
            <div className="text-[22rem] font-extrabold text-white leading-none max-w-full overflow-hidden text-center">
              {liveData.getCompassHeading() != null ? `${Math.round(liveData.getCompassHeading())}°` : "—"}
            </div>
          </div>
        );

      case "sog":
        return (
          <div className="flex flex-col items-center justify-center h-full">
            {data?.speed != null ? (
              <div className="text-[22rem] font-extrabold text-white leading-none">
                {data.speed.toFixed(1)}
              </div>
            ) : (
              <div className="text-[10rem] text-white">—</div>
            )}
          </div>
        );

      case "truewind":
        return (
          <div className="flex flex-col items-center justify-center h-full text-white">
            <div className="text-[22rem] font-extrabold leading-none">
              {data?.trueWindSpeed != null
                ? `${data.trueWindSpeed.toFixed(1)}`
                : "—"}
            </div>
            <div className="text-3xl text-zinc-400 mt-12">TWS</div>
            <div className="text-[22rem] font-extrabold text-white leading-none">
              {data?.trueWindAngle != null
                ? `${Math.round(data.trueWindAngle)}°`
                : "—"}
            </div>
            <div className="text-3xl text-zinc-400 mt-4">TWA</div>
          </div>
        );

      case "apparentwind":
        return (
          <div className="flex flex-col items-center justify-center h-full text-white">
            <div className="text-[22rem] font-extrabold leading-none">
              {data?.apparentWindSpeed != null
                ? `${data.apparentWindSpeed.toFixed(1)}`
                : "—"}
            </div>
            <div className="text-3xl text-zinc-400 mt-12">AWS</div>
            <div className="text-[18rem] font-extrabold leading-none mt-20">
              {data?.apparentWindAngle != null
                ? `${Math.round(data.apparentWindAngle)}°`
                : "—"}
            </div>
            <div className="text-3xl text-zinc-400 mt-4">AWA</div>
          </div>
        );

      case "bearing":
        return (
          <div className="flex flex-col items-center justify-center h-full">
            {data?.bearingToDestination != null ? (
              <div className="text-[22rem] font-extrabold text-white leading-none">
                {data.bearingToDestination.toFixed(0)}
              </div>
            ) : (
              <div className="text-[10rem] text-white">—</div>
            )}
          </div>
        );

      case "trip":
        return (
          <div className="flex flex-col items-center justify-center h-full text-white">
            <div className="text-[22rem] font-extrabold text-white leading-none">
              {liveData.getCompassHeading() != null ? `${Math.round(liveData.getCompassHeading())}°` : "—"}
            </div>
            <div className="text-[14rem] font-extrabold leading-none">
              {data?.bearingToDestination != null
                ? `${Math.round(data.bearingToDestination)}°`
                : "—"}
            </div>
            <div className="text-3xl mt-4 text-zinc-400">Bearing</div>
          </div>
        );

      default:
        return (
          <div className="text-center text-zinc-500 text-3xl">
            Select a panel
          </div>
        );
    }
  };

  const buttonClass = "btn h-20 text-md rounded-xl font-semibold p-2";

  return (
    <div className="flex flex-col h-full w-full px-2 py-2">
      <div className="flex-1 bg-zinc-900 text-white rounded-2xl shadow p-6 flex items-center justify-center">
        {renderInstrument()}
      </div>

      <div className="grid grid-cols-4 gap-2 mt-4">
        <button
          onClick={() => setActiveInstrument("bme")}
          className={`${buttonClass} ${activeInstrument === "bme" ? "btn-active" : ""} flex flex-col items-center justify-center text-white`}
        >
          <div className="text-4xl font-extrabold">
            {data?.temperature != null ? `${Math.round(data.temperature)}°` : "—"}
          </div>
          <div className="text-sm">Env</div>
        </button>

        <button
          onClick={() => setActiveInstrument("compass")}
          className={`${buttonClass} ${activeInstrument === "compass" ? "btn-active" : ""} flex flex-col items-center justify-center text-white`}
        >
          <div className="text-3xl font-extrabold">
            {liveData.getCompassHeading() != null ? `${Math.round(liveData.getCompassHeading())}°` : "—"}
          </div>
          <div className="text-sm">Compass</div>
        </button>

        <button
          onClick={() => {
            setActiveInstrument("bearing");
            setData(liveData.get());
          }}
          className={`${buttonClass} ${activeInstrument === "bearing" ? "btn-active" : ""} flex flex-col items-center justify-center text-white`}
        >
          <div className="text-3xl font-extrabold">
            {data?.bearingToDestination != null ? `${data.bearingToDestination.toFixed(0)}°` : "—"}
          </div>
          <div className="text-sm">Bearing</div>
        </button>

        <button
          onClick={() => setActiveInstrument("sog")}
          className={`${buttonClass} ${activeInstrument === "sog" ? "btn-active" : ""} flex flex-col items-center justify-center text-white`}
        >
          <div className="text-3xl font-extrabold">
            {data?.speed != null ? `${data.speed.toFixed(1)}` : "—"}
          </div>
          <div className="text-sm">SOG</div>
        </button>
      </div>
    </div>
  );
}
