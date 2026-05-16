import React, { useEffect, useState } from "react";
import { useRace } from "../context/RaceContext";
import { useNavpoints } from "../context/NavpointsContext";
import StartLineSelector from "./StartLineSelector";
import CourseSelector from "./CourseSelector";
import RaceMap from "./RaceMap";
import liveData, { getLocalTimeFromGPS, getAdjustedUTCTime } from "../utils/liveData";
import clsx from "clsx";

export default function Race() {
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
    setShowRaceMode,
    saveCurrentRace,
    deleteSavedRace,
    resetRace,
  } = useRace();

  const { navpoints } = useNavpoints();
  const [data, setData] = useState(liveData.get());
  const [selectedHour, setSelectedHour] = useState("13");
  const [selectedMinute, setSelectedMinute] = useState("00");
  const [selectedSecond, setSelectedSecond] = useState("00");
  const [showStartLineModal, setShowStartLineModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [raceName, setRaceName] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setData(liveData.get());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Initialize time picker with current start time or GPS time
  useEffect(() => {
    if (startTime) {
      const timeParts = startTime.split(":");
      if (timeParts.length === 3) {
        setSelectedHour(timeParts[0]);
        setSelectedMinute(timeParts[1]);
        setSelectedSecond(timeParts[2]);
      } else if (timeParts.length === 2) {
        setSelectedHour(timeParts[0]);
        setSelectedMinute(timeParts[1]);
        setSelectedSecond("00");
      }
    } else {
      // Default to next full local hour
      const now = new Date();
      let nextHour = now.getHours() + 1;
      if (nextHour === 24) nextHour = 0;
      setSelectedHour(nextHour.toString().padStart(2, "0"));
      setSelectedMinute("00");
      setSelectedSecond("00");
    }
  }, [startTime]);

  // Format elapsed time
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

  // Format time to start/mark
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

  const handleSetStartTime = () => {
    const timeString = `${selectedHour}:${selectedMinute}:${selectedSecond}`;
    setStartTime(timeString);
  };

  const handleQuickTime = (minutesToAdd) => {
    // Parse current selected time
    let hour = parseInt(selectedHour, 10);
    let minute = parseInt(selectedMinute, 10);
    let second = parseInt(selectedSecond, 10);
    
    // Add minutes
    let totalMinutes = hour * 60 + minute + minutesToAdd;
    hour = Math.floor(totalMinutes / 60) % 24;
    minute = totalMinutes % 60;
    // Keep seconds unchanged

    setSelectedHour(hour.toString().padStart(2, "0"));
    setSelectedMinute(minute.toString().padStart(2, "0"));
    setSelectedSecond(second.toString().padStart(2, "0"));
  };

  const handleSaveRace = () => {
    if (raceName.trim()) {
      saveCurrentRace(raceName.trim());
      setShowSaveModal(false);
      setRaceName("");
    }
  };

  const handleDeleteRace = (raceId) => {
    if (confirm('Are you sure you want to delete this race?')) {
      deleteSavedRace(raceId);
    }
  };

  const currentMark = course[currentMarkIndex];
  const speed = liveData.getSpeed();
  const gpsTime = liveData.getGPSTime();
  const lat = data?.lat;
  const lon = data?.lon;
  const localTime = getLocalTimeFromGPS(gpsTime, lat, lon);

  // Get current adjusted time (GPS time = UTC + 19 seconds with timezone)
  const getCurrentTime = () => {
    return getAdjustedUTCTime();
  };

  return (
    <div className="h-screen px-2 text-white">
      {/* Top Row - Race Mode Toggle, Countdown, and Start Time */}
      <div className="flex justify-between items-start mb-4 gap-4 pt-2">
        {/* Start Time Setup - Upper Left */}
        <div className="bg-zinc-800 p-4 rounded-2xl w-72">
          <h3 className="text-sm font-semibold mb-3">Start Time</h3>
          {/* Current GPS Time */}
          <div className="mb-3 p-3 bg-zinc-700 rounded-lg">
            <div className="text-xs text-zinc-400">Current Time</div>
            <div className="text-lg font-mono text-green-400">{getCurrentTime()}</div>
          </div>
          {/* Time Picker */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <select
              value={selectedHour}
              onChange={(e) => setSelectedHour(e.target.value)}
              className="bg-zinc-700 text-white px-4 py-3 rounded-lg text-lg font-mono w-20 text-center"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i.toString().padStart(2, "0")}>{i.toString().padStart(2, "0")}</option>
              ))}
            </select>
            <span className="text-2xl font-bold">:</span>
            <select
              value={selectedMinute}
              onChange={(e) => setSelectedMinute(e.target.value)}
              className="bg-zinc-700 text-white px-4 py-3 rounded-lg text-lg font-mono w-20 text-center"
            >
              {Array.from({ length: 60 }, (_, i) => (
                <option key={i} value={i.toString().padStart(2, "0")}>{i.toString().padStart(2, "0")}</option>
              ))}
            </select>
            <span className="text-2xl font-bold">:</span>
            <select
              value={selectedSecond}
              onChange={(e) => setSelectedSecond(e.target.value)}
              className="bg-zinc-700 text-white px-4 py-3 rounded-lg text-lg font-mono w-20 text-center"
            >
              {Array.from({ length: 60 }, (_, i) => (
                <option key={i} value={i.toString().padStart(2, "0")}>{i.toString().padStart(2, "0")}</option>
              ))}
            </select>
          </div>
          {/* Quick Time Buttons */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <button onClick={() => handleQuickTime(5)} className="px-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">+5</button>
            <button onClick={() => handleQuickTime(10)} className="px-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">+10</button>
            <button onClick={() => handleQuickTime(15)} className="px-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">+15</button>
          </div>
          {/* Set Time Button */}
          <button onClick={handleSetStartTime} className="w-full px-3 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm">Set: {selectedHour}:{selectedMinute}:{selectedSecond}</button>
          {/* Current Start Time */}
          {startTime && (
            <div className="mt-3 p-2 bg-green-900 rounded-lg">
              <div className="text-xs text-green-300">Active: {startTime}</div>
            </div>
          )}
        </div>

        {/* Countdown Timer - Center */}
        <div className="flex-1 flex justify-center items-start">
          {countdownActive ? (
            <div className={clsx(
              "text-center p-6 rounded-2xl shadow-xl w-full max-w-md",
              raceStarted 
                ? "bg-green-600 text-white" 
                : "bg-red-600 text-white"
            )}>
              {raceStarted ? (
                <div>
                  <div className="text-7xl font-extrabold leading-none">
                    {countdownDisplay === 'START' ? 'START' : formatElapsedTime(elapsedTime)}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-7xl font-extrabold leading-none">{countdownDisplay}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-zinc-400 text-2xl">Set start time to begin countdown</div>
          )}
        </div>

        {/* Race Mode Toggle - Upper Right */}
        <button
          onClick={() => setShowRaceMode(!showRaceMode)}
          className="btn w-64 h-32 text-xl rounded-2xl font-semibold"
        >
          {showRaceMode ? "Exit Race Mode" : "Enter Race Mode"}
        </button>
      </div>

      {/* Main Layout */}
      <div className="flex gap-4 h-[calc(100vh-400px)] pb-4">
        
        {/* Left Column - Race Control Buttons */}
        <div className="flex flex-col gap-3 w-64">
          <button
            onClick={() => setShowStartLineModal(true)}
            className="btn w-full h-32 text-xl rounded-2xl font-semibold"
          >
            Set Start Line
          </button>
          <button
            onClick={() => setShowCourseModal(true)}
            className="btn w-full h-32 text-xl rounded-2xl font-semibold"
          >
            Set Course
          </button>
          <button
            onClick={resetRace}
            className="btn w-full h-32 text-xl rounded-2xl font-semibold"
          >
            Reset Race
          </button>
          
          {/* Save Race Button - Bottom */}
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={!startTime && !course.length}
            className="btn w-full h-32 text-xl rounded-2xl font-semibold disabled:bg-zinc-600 bg-green-600 hover:bg-green-700"
          >
            Save Race
          </button>
        </div>

        {/* Center Column - Race Map */}
        <div className="flex flex-col flex-1">
          
          {/* Race Map - Center */}
          <div className="bg-zinc-800 pt-6 px-6 pb-2 mt-4 rounded-2xl h-[34rem] mx-2">
            <div className="h-full">
              <RaceMap />
            </div>
            </div>
        </div>

        {/* Right Column - Race Information */}
        <div className="flex flex-col gap-3 w-80">
          
          {/* Start Line Information */}
          {startLine.pin1 && startLine.pin2 && (
            <div className="bg-zinc-800 p-3 rounded-2xl">
              <h3 className="text-sm font-semibold mb-2">Start Line</h3>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-zinc-400">Distance</div>
                  <div className="text-xl font-bold">
                    {distanceToStart ? `${distanceToStart.toFixed(2)} nm` : "--"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Time</div>
                  <div className="text-xl font-bold">
                    {formatTimeTo(timeToStart)}
                  </div>
                </div>
                <div className="text-xs text-zinc-500">
                  {startLine.pin1.name} → {startLine.pin2.name}
                </div>
              </div>
            </div>
          )}

          {/* Course Information */}
          {course.length > 0 && (
            <div className="bg-zinc-800 p-3 rounded-2xl">
              <h3 className="text-sm font-semibold mb-2">
                Next: {currentMark?.name || "Unknown"}
              </h3>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-zinc-400">Distance</div>
                  <div className="text-xl font-bold">
                    {distanceToMark ? `${distanceToMark.toFixed(2)} nm` : "--"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Bearing</div>
                  <div className="text-xl font-bold">
                    {bearingToMark ? `${bearingToMark.toFixed(0)}°` : "--"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Time</div>
                  <div className="text-xl font-bold">
                    {formatTimeTo(timeToMark)}
                  </div>
                </div>
                <div className="text-xs text-zinc-500">
                  Mark {currentMarkIndex + 1} of {course.length}
                </div>
              </div>
            </div>
          )}

          {/* Saved Races */}
          {savedRaces.length > 0 && (
            <div className="bg-zinc-800 p-3 rounded-2xl flex-1 overflow-hidden">
              <h3 className="text-sm font-semibold mb-2">Saved Races</h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {savedRaces.map((race) => (
                  <div key={race.id} className="bg-zinc-700 p-1 rounded-lg flex items-center justify-between">
                    <div className="text-left">
                      <div className="font-medium text-xs">{race.name}</div>
                      <div className="text-xs text-zinc-400">
                        {race.startTime} | {race.course.length} marks
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteRace(race.id)}
                      className="text-red-500 hover:text-red-400 px-1"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
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
          <div className="bg-zinc-800 p-8 rounded-2xl shadow-2xl max-w-lg w-full mx-6">
            <h3 className="text-2xl font-semibold mb-6 text-center">Save Race</h3>
            <input
              type="text"
              value={raceName}
              onChange={(e) => setRaceName(e.target.value)}
              placeholder="Enter race name"
              className="w-full bg-zinc-700 text-white px-4 py-3 rounded-lg mb-6 text-lg"
              autoFocus
            />
            <div className="flex gap-4">
              <button
                onClick={handleSaveRace}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg text-lg font-semibold"
              >
                Save
              </button>
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 bg-zinc-600 hover:bg-zinc-700 text-white py-3 px-6 rounded-lg text-lg font-semibold"
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
