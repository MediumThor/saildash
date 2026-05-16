import React, { useState } from 'react';
import { useNavpoints } from '../context/NavpointsContext';
import { useRace } from '../context/RaceContext';

export default function CourseSelector({ onClose }) {
  const { navpoints } = useNavpoints();
  const { setCourse, course } = useRace();
  const [selectedMarks, setSelectedMarks] = useState(course.map(mark => mark.name));

  // Filter out bad data (e.g., lat/lon strings or missing fields)
  const validNavpoints = navpoints.filter(
    (p) =>
      typeof p.lat === "number" &&
      typeof p.lon === "number" &&
      !isNaN(p.lat) &&
      !isNaN(p.lon)
  );

  const handleMarkAdd = (point) => {
    setSelectedMarks(prev => [...prev, point]);
  };

  const handleSetCourse = () => {
    if (selectedMarks.length > 0) {
      setCourse(selectedMarks);
      onClose();
    }
  };

  const handleClearCourse = () => {
    setCourse([]);
    setSelectedMarks([]);
  };

  const moveMark = (fromIndex, toIndex) => {
    const newMarks = [...selectedMarks];
    const [movedMark] = newMarks.splice(fromIndex, 1);
    newMarks.splice(toIndex, 0, movedMark);
    setSelectedMarks(newMarks);
  };

  const removeMark = (index) => {
    setSelectedMarks(prev => prev.filter((_, i) => i !== index));
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
      <div className="p-8 bg-zinc-800 rounded-2xl shadow-xl space-y-6 max-w-2xl w-full mx-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-3xl font-bold text-white text-center mb-6">Set Race Course</h2>
        
        {validNavpoints.length === 0 ? (
          <div className="text-zinc-400 text-center text-lg">No valid navpoints found.</div>
        ) : (
          <>
            {/* Available Navpoints */}
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-white">Available Navpoints</h3>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {validNavpoints.map((point, index) => (
                  <button
                    key={index}
                    onClick={() => handleMarkAdd(point)}
                    className="w-full flex items-center gap-4 bg-zinc-700 hover:bg-blue-800 text-white font-bold py-4 px-6 rounded-lg text-lg"
                  >
                    <div className="w-10 text-left text-amber-400 text-xl">
                      +
                    </div>
                    <div className="flex-1 text-left">
                      {point.name} ({point.lat.toFixed(2)}, {point.lon.toFixed(2)})
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Course */}
            {selectedMarks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-white">Race Course Order</h3>
                <div className="space-y-3">
                  {selectedMarks.map((mark, index) => (
                    <div key={index} className="flex items-center justify-between bg-zinc-700 p-4 rounded-lg">
                      <span className="text-white font-medium text-lg">
                        {index + 1}. {mark.name}
                      </span>
                      <div className="flex gap-2">
                        {index > 0 && (
                          <button
                            onClick={() => moveMark(index, index - 1)}
                            className="text-sm bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white font-bold"
                          >
                            ↑
                          </button>
                        )}
                        {index < selectedMarks.length - 1 && (
                          <button
                            onClick={() => moveMark(index, index + 1)}
                            className="text-sm bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white font-bold"
                          >
                            ↓
                          </button>
                        )}
                        <button
                          onClick={() => removeMark(index)}
                          className="text-sm bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-white font-bold"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                onClick={handleSetCourse}
                disabled={selectedMarks.length === 0}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 text-white py-4 px-6 rounded-lg font-bold text-lg"
              >
                Set Course
              </button>
              <button
                onClick={handleClearCourse}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 px-6 rounded-lg font-bold text-lg"
              >
                Clear Course
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