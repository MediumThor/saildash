import React, { useState } from 'react';
import { useNavpoints } from '../context/NavpointsContext';
import { useRace } from '../context/RaceContext';

export default function StartLineSelector({ onClose }) {
  const { navpoints } = useNavpoints();
  const { setStartLine } = useRace();
  const [selectedPin1, setSelectedPin1] = useState(null);
  const [selectedPin2, setSelectedPin2] = useState(null);

  // Filter out bad data (e.g., lat/lon strings or missing fields)
  const validNavpoints = navpoints.filter(
    (p) =>
      typeof p.lat === "number" &&
      typeof p.lon === "number" &&
      !isNaN(p.lat) &&
      !isNaN(p.lon)
  );

  const handlePin1Select = (point) => {
    setSelectedPin1(point);
  };

  const handlePin2Select = (point) => {
    setSelectedPin2(point);
  };

  const handleSetStartLine = () => {
    if (selectedPin1 && selectedPin2) {
      setStartLine({
        pin1: selectedPin1,
        pin2: selectedPin2,
      });
      onClose();
    }
  };

  const handleClearStartLine = () => {
    setStartLine({ pin1: null, pin2: null });
    setSelectedPin1(null);
    setSelectedPin2(null);
  };

  const handleBackdropClick = (e) => {
    // Only close if clicking the backdrop itself, not the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 z-[10001] flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="p-8 bg-zinc-800 rounded-2xl shadow-xl space-y-6 max-w-2xl w-full mx-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-3xl font-bold text-white text-center mb-6">Set Start Line</h2>
        
        {validNavpoints.length < 2 ? (
          <div className="text-zinc-400 text-center text-lg">Need at least two navpoints to set start line.</div>
        ) : (
          <>
            {/* Pin 1 Selection */}
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-white">Select Start Line Pin 1</h3>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {validNavpoints.map((point, index) => {
                  const isSelected = selectedPin1 && 
                    selectedPin1.lat === point.lat && 
                    selectedPin1.lon === point.lon && 
                    selectedPin1.name === point.name;

                  return (
                    <button
                      key={index}
                      onClick={() => handlePin1Select(point)}
                      className={`w-full flex items-center gap-4 ${
                        isSelected ? "bg-blue-700" : "bg-zinc-700"
                      } hover:bg-blue-800 text-white font-bold py-4 px-6 rounded-lg text-lg`}
                    >
                      <div className="w-10 text-left text-amber-400 text-xl">
                        {isSelected ? "1" : ""}
                      </div>
                      <div className="flex-1 text-left">
                        {point.name} ({point.lat.toFixed(2)}, {point.lon.toFixed(2)})
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pin 2 Selection */}
            {selectedPin1 && (
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-white">Select Start Line Pin 2</h3>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {validNavpoints.map((point, index) => {
                    const isSelected = selectedPin2 && 
                      selectedPin2.lat === point.lat && 
                      selectedPin2.lon === point.lon && 
                      selectedPin2.name === point.name;

                    return (
                      <button
                        key={index}
                        onClick={() => handlePin2Select(point)}
                        className={`w-full flex items-center gap-4 ${
                          isSelected ? "bg-blue-700" : "bg-zinc-700"
                        } hover:bg-blue-800 text-white font-bold py-4 px-6 rounded-lg text-lg`}
                      >
                        <div className="w-10 text-left text-amber-400 text-xl">
                          {isSelected ? "2" : ""}
                        </div>
                        <div className="flex-1 text-left">
                          {point.name} ({point.lat.toFixed(2)}, {point.lon.toFixed(2)})
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Start Line Info */}
            {selectedPin1 && selectedPin2 && (
              <div className="bg-zinc-700 p-6 rounded-lg text-white">
                <div className="font-semibold mb-3 text-lg">Start Line:</div>
                <div className="text-base space-y-2">
                  <div>Pin 1: {selectedPin1.name}</div>
                  <div>Pin 2: {selectedPin2.name}</div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                onClick={handleSetStartLine}
                disabled={!selectedPin1 || !selectedPin2}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 text-white py-4 px-6 rounded-lg font-bold text-lg"
              >
                Set Start Line
              </button>
              <button
                onClick={handleClearStartLine}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 px-6 rounded-lg font-bold text-lg"
              >
                Clear
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-zinc-600 hover:bg-zinc-700 text-white py-4 px-6 rounded-lg font-bold text-lg"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 