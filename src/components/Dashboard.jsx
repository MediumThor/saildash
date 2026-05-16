import React, { useEffect, useState } from "react";
import { useModal } from "../context/ModalContext";
import { useWebSocket } from "../context/WebSocketContext";
import ExpandableWindButton from "../instruments/ExpandableWindButton";
import liveData from "../utils/liveData";
import VisualCompass from "../components/VisualCompass";
import HeelBars from "../components/HeelBars";


export default function Dashboard() {
  const { openModal } = useModal();
  const { wsStatus, liveData: wsLiveData } = useWebSocket();
  const [data, setData] = useState(liveData.get());
  const [activeInstrument, setActiveInstrument] = useState("bme");

  useEffect(() => {
    const interval = setInterval(() => {
      setData(liveData.get());
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const renderInstrument = () => {
    switch (activeInstrument) {
      case "bme":
        return (
          <div className="space-y-14 text-center text-6xl font-bold">
            <div>Temp: {data?.temperature ? `${data.temperature}°F` : "—"}</div>
            <div>Humidity: {data?.humidity ? `${data.humidity}%` : "—"}</div>
            <div>Pressure: {data?.pressure ? `${data.pressure} hPa` : "—"}</div>
            <div>Water Temp 1: {data?.waterTemp1 ? `${data.waterTemp1}°F` : "—"}</div>
            <div>Water Temp 2: {data?.waterTemp2 ? `${data.waterTemp2}°F` : "—"}</div>
          </div>
        );

        case "compass":
          return (
            <div className="relative w-[900px] h-[900px] flex items-center justify-center">
              <VisualCompass
                heading={liveData.getCompassHeading() || 0}
                trueWindDirection={data?.trueWindDirection}
                apparentWindDirection={data?.apparentWindDirection}
                bearingToDestination={data?.bearingToDestination}
                heel={data?.heel || 0}

              />
              <HeelBars                
               heel={data?.heel || 0}
              />
            </div>
          );

      case "gps":
        return (
          <div className="space-y-14 text-center text-7xl font-semibold">
            {data?.lat ? (
              <>
                <div>Latitude: {data.lat}</div>
                <div>Longitude: {data.lon}</div>
                <div>Speed: {data.speedKnots} kn</div>
                <div>Course: {data.heading}°</div>
                <div>Satellites: {data.sats}</div>
              </>
            ) : (
              <div className="text-zinc-400">Waiting for GPS...</div>
            )}
          </div>
        );



        case "sog":
          return (
            <div className="flex flex-col items-center justify-center h-full">
              {liveData.getSpeed() != null ? (
                <>
                  <div className="text-[26rem] font-extrabold text-white leading-none">
                    {liveData.getSpeed().toFixed(1)}
                  </div>
                  <div className="text-6xl text-zinc-400 mt-20">SOG</div>
                </>
              ) : (
                <div className="text-[10rem] text-white">—</div>
              )}
            </div>
          );
        
          case "truewind":
            return (
              <div className="flex flex-col items-center justify-center h-full text-white">
                <div className="text-[22rem] font-extrabold leading-none">
                  {data?.trueWindSpeed != null ? `${data.trueWindSpeed.toFixed(1)}` : "—"}
                </div>
                <div className="text-6xl text-zinc-400 mt-12">TWS</div>
                <div className="text-[18rem] font-extrabold leading-none mt-20">
                  {data?.trueWindAngle != null ? `${Math.round(data.trueWindAngle)}°` : "—"}
                </div>
                <div className="text-6xl text-zinc-400 mt-4">TWA</div>
              </div>
            );
          
        
            case "apparentwind":
              return (
                <div className="flex flex-col items-center justify-center h-full text-white">
                  <div className="text-[22rem] font-extrabold leading-none">
                    {data?.apparentWindSpeed != null ? `${data.apparentWindSpeed.toFixed(1)}` : "—"}
                  </div>
                  <div className="text-6xl text-zinc-400 mt-12">AWS</div>
                  <div className="text-[18rem] font-extrabold leading-none mt-20">
                    {data?.apparentWindAngle != null ? `${Math.round(data.apparentWindAngle)}°` : "—"}
                  </div>
                  <div className="text-6xl text-zinc-400 mt-4">AWA</div>
                </div>
              );
            
        
          case "bearing":
  return (
    <div className="flex flex-col items-center justify-center h-full">
      {data?.bearingToDestination != null ? (
        <>
          <div className="text-[22rem] font-extrabold text-white leading-none">
            {data.bearingToDestination.toFixed(0)}
          </div>
          <div className="text-6xl text-white mt-4">Bearing</div>
        </>
      ) : (
        <div className="text-[10rem] text-white">—</div>
      )}
    </div>
  );

  case "trip":
  return (
    <div className="flex flex-col items-center justify-center h-full text-white">
      <div className="text-[14rem] font-extrabold leading-none">
      {data?.compass != null ? `${((data.compass % 360 + 360) % 360).toFixed(0)}°` : "—"}
      </div>
      <div className="text-5xl mb-12 text-zinc-400">Heading</div>
      <div className="text-[14rem] font-extrabold leading-none">
        {data?.bearingToDestination != null ? `${Math.round(data.bearingToDestination)}°` : "—"}
      </div>
      <div className="text-5xl mt-4 text-zinc-400">Bearing</div>
    </div>
  );


      default:
        return (
          <div className="text-center text-zinc-500 text-2xl">
            Select a panel
          </div>
        );
    }
  };

  const buttonClass = "btn w-60 h-30 text-xl rounded-2xl font-semibold";

  return (
<div className="grid grid-cols-3 gap-4 h-[calc(90vh)] px-4">
{/* Left Button Column */}
<div className="flex flex-col justify-center items-start gap-6">
  {/* Env Button shows Temperature */}
  <button
    onClick={() => setActiveInstrument("bme")}
    className={`${buttonClass} ${activeInstrument === "bme" ? "btn-active" : ""} flex flex-col items-center justify-center text-white`}
  >
    <div className="text-7xl font-extrabold leading-tight">
      {data?.temperature != null ? `${Math.round(data.temperature)}°` : "—"}
    </div>
    <div className="text-xlg mt-1">Env</div>
  </button>



  {/* Compass Button shows Compass Heading */}
  <button
    onClick={() => setActiveInstrument("compass")}
    className={`${buttonClass} ${activeInstrument === "compass" ? "btn-active" : ""} flex flex-col items-center justify-center text-white`}
  >
  <div className="text-7xl font-extrabold leading-tight">
  {liveData.getCompassHeading() != null
  ? `${Math.round(liveData.getCompassHeading())}°`
  : "—"}
</div>
    <div className="text-xlg mt-1">Compass</div>
  </button>
  <button
  onClick={() => setActiveInstrument("trip")}
  className={`${buttonClass} ${activeInstrument === "trip" ? "btn-active" : ""} flex flex-col items-center justify-center text-white`}
>
  <div className="text-7xl font-extrabold leading-tight">
  {liveData.getCompassHeading() != null && data?.bearingToDestination != null
  ? `${Math.round(liveData.getCompassHeading())}° ${Math.round(data.bearingToDestination)}°`
  : "—"}
  </div>
  <div className="text-xlg mt-1">Trip</div>
</button>

</div>




      {/* Center Display */}
      <div className="bg-zinc-900 text-white rounded-2xl shadow p-8 flex flex-col justify-center items-center">
        {renderInstrument()}
      </div>

      {/* Right Button Column */}
      <div className="flex flex-col justify-center items-end gap-6">
      <button
  onClick={() => setActiveInstrument("gps")}
  className={`${buttonClass} ${activeInstrument === "gps" ? "btn-active" : ""} flex flex-col items-center justify-center text-white`}
>
  <div className="text-7xl font-extrabold leading-tight">
    {data?.sats != null ? `${data.sats}` : "—"}
  </div>
  <div className="text-xlg mt-1">GPS</div>
</button>
     

        <button
          onClick={() => setActiveInstrument("sog")}
          className={`${buttonClass} ${activeInstrument === "sog" ? "btn-active" : ""} flex flex-col items-center justify-center text-white`}
        >
          <div className="text-7xl font-extrabold leading-tight">
            {liveData.getSpeed() != null ? liveData.getSpeed().toFixed(1) : "—"}
          </div>
          <div className="text-xlg mt-1">SOG</div>
        </button>
{/* True Wind Button */}
        <button
  onClick={() => setActiveInstrument("truewind")}
  className={`${buttonClass} ${activeInstrument === "truewind" ? "btn-active" : ""} flex flex-col items-center justify-center text-white`}
>
  <div className="text-7xl font-extrabold leading-tight">
    {data?.trueWindSpeed != null ? `${data.trueWindSpeed.toFixed(1)}` : "—"}
  </div>
  <div className="text-xl mt-1 text-zinc-300">
    {data?.trueWindAngle != null ? `${Math.round(data.trueWindAngle)}°` : "—"}
  </div>
  <div className="text-xlg mt-1">T. Wind</div>
</button>


{/* Apparent Wind Button */}

<button
  onClick={() => setActiveInstrument("apparentwind")}
  className={`${buttonClass} ${activeInstrument === "apparentwind" ? "btn-active" : ""} flex flex-col items-center justify-center text-white`}
>
  <div className="text-7xl font-extrabold leading-tight">
    {data?.apparentWindSpeed != null ? `${data.apparentWindSpeed.toFixed(1)}` : "—"}
  </div>
  <div className="text-xl mt-1 text-zinc-300">
    {data?.apparentWindAngle != null ? `${Math.round(data.apparentWindAngle)}°` : "—"}
  </div>
  <div className="text-xlg mt-1">A. Wind</div>
</button>

      
      </div>
    </div>
  );
}
