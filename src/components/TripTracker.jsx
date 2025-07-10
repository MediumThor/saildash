import React, { useState, useEffect } from 'react';
import { useTrip } from '../context/TripContext';
import { exportTrip, importTrip } from '../utils/tripStorage';
import liveData from '../utils/liveData';
import clsx from 'clsx';

export default function TripTracker() {
  const {
    isTracking,
    currentTrip,
    savedTrips,
    trackingData,
    startTracking,
    stopTracking,
    addTrackingPoint,
    saveCurrentTrip,
    deleteSavedTrip,
    importSavedTrip,
    startPlayback,
    pausePlayback,
    resumePlayback,
    stopPlayback,
    playbackMode,
    playbackSpeed,
    isPaused,
  } = useTrip();

  const [showSavedTrips, setShowSavedTrips] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [tripName, setTripName] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);

  // Auto-save tracking data when GPS position changes
  useEffect(() => {
    if (!isTracking) return;

    const interval = setInterval(() => {
      const data = liveData.get();
      if (data.lat && data.lon) {
        console.log('Adding tracking point:', { lat: data.lat, lon: data.lon, speed: data.speedKnots });
        addTrackingPoint({
          lat: data.lat,
          lon: data.lon,
          speed: data.speedKnots || data.speed,
          heading: data.heading,
          compass: data.compass,
          trueWindSpeed: data.trueWindSpeed,
          trueWindDirection: data.trueWindDirection,
          apparentWindSpeed: data.apparentWindSpeed,
          apparentWindDirection: data.apparentWindDirection,
          heel: data.heel,
          pitch: data.pitch,
          depth: data.depthFeet,
          temperature: data.temperature,
          pressure: data.pressure,
          humidity: data.humidity,
        });
      } else {
        console.log('No GPS data available:', data);
      }
    }, 5000); // Record every 5 seconds

    return () => clearInterval(interval);
  }, [isTracking, addTrackingPoint]);

  const handleStartTracking = () => {
    startTracking();
  };

  const handleStopTracking = () => {
    console.log('Stopping tracking, data points:', trackingData.length);
    if (trackingData.length > 0) {
      console.log('Showing save modal with data:', trackingData);
      setShowSaveModal(true);
      setTripName(currentTrip?.name || `Trip ${new Date().toLocaleString()}`);
    } else {
      console.log('No tracking data to save');
      stopTracking();
    }
  };

  const handleSaveTrip = async () => {
    if (tripName.trim()) {
      console.log('handleSaveTrip called with name:', tripName);
      console.log('Current tracking data length:', trackingData.length);
      console.log('Current trip object:', currentTrip);
      try {
        console.log('About to call saveCurrentTrip...');
        await saveCurrentTrip(tripName.trim());
        console.log('saveCurrentTrip completed successfully');
      setShowSaveModal(false);
      setTripName('');
        console.log('Modal closed and trip name reset');
        stopTracking();
      } catch (error) {
        console.error('Failed to save trip:', error);
        alert('Failed to save trip. Please try again.');
      }
    }
  };

  const handleCancelSave = () => {
    console.log('Canceling save, stopping tracking without saving');
    setShowSaveModal(false);
    setTripName('');
    stopTracking();
  };

  const handleDeleteTrip = (tripId) => {
    if (confirm('Are you sure you want to delete this trip?')) {
      deleteSavedTrip(tripId);
    }
  };

  const handleExportTrip = (trip) => {
    exportTrip(trip);
  };

  const handleImportTrip = async () => {
    if (!importFile) return;
    
    try {
      const trip = await importTrip(importFile);
      await importSavedTrip(trip);
      setShowImportModal(false);
      setImportFile(null);
    } catch (error) {
      alert('Failed to import trip: ' + error.message);
    }
  };

  const formatDuration = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatDistance = (distance) => {
    return `${distance.toFixed(2)} nm`;
  };

  const getCurrentTripStats = () => {
    if (!isTracking || trackingData.length === 0) return null;
    
    const startTime = trackingData[0]?.timestamp;
    const duration = startTime ? Date.now() - startTime : 0;
    
    let totalDistance = 0;
    for (let i = 1; i < trackingData.length; i++) {
      const prev = trackingData[i - 1];
      const curr = trackingData[i];
      if (prev.lat && prev.lon && curr.lat && curr.lon) {
        const distance = calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);
        totalDistance += distance;
      }
    }
    
    return { duration, totalDistance };
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 0.539957; // Convert to nautical miles
  };

  const currentStats = getCurrentTripStats();

  return (
    <>
      {/* Remove the Trip Tracker header here */}
      {/* Header removed for floating box */}
      {/* Current Trip Status */}
      <div className="space-y-3">
        {isTracking ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Recording...</span>
            </div>
            {currentStats && (
              <div className="text-xs space-y-1">
                <div>Duration: {formatDuration(currentStats.duration)}</div>
                <div>Distance: {formatDistance(currentStats.totalDistance)}</div>
                <div>Points: {trackingData.length}</div>
              </div>
            )}
            <button
              onClick={handleStopTracking}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium"
            >
              Stop Tracking
            </button>
          </div>
        ) : (
          <div className="space-y-2">
          <button
            onClick={handleStartTracking}
            className={clsx(
              "w-full py-2 px-4 rounded-lg font-medium",
              "bg-green-600 hover:bg-green-700 text-white"
            )}
          >
            Start Tracking
          </button>
            <button
              onClick={() => setShowSavedTrips(!showSavedTrips)}
              className="w-full py-2 px-4 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white"
            >
              {showSavedTrips ? 'Hide' : 'View'} Saved Trips ({savedTrips.length})
            </button>
          </div>
        )}
      </div>

      {/* Saved Trips */}
      {showSavedTrips && (
        <div className="mt-4 border-t border-zinc-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">Saved Trips</h4>
            <button
              onClick={() => setShowImportModal(true)}
              className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
            >
              Import
            </button>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {savedTrips.length === 0 ? (
              <div className="text-xs text-zinc-400 text-center py-4">
                No saved trips
              </div>
            ) : (
              savedTrips.map((trip) => (
                <div key={trip.id} className="bg-zinc-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-medium truncate">{trip.name}</h5>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleExportTrip(trip)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
                        title="Export"
                      >
                        
                      </button>
                      <button
                        onClick={() => handleDeleteTrip(trip.id)}
                        className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400 space-y-1">
                    <div>Distance: {formatDistance(trip.totalDistance || 0)}</div>
                    <div>Duration: {formatDuration(trip.duration || 0)}</div>
                    <div>Points: {trip.data?.length || 0}</div>
                    <div>Date: {new Date(trip.startTime).toLocaleDateString()}</div>
                  </div>
                  <div className="flex gap-1 mt-2">
                    <button
                      onClick={() => startPlayback(1, trip.id)}
                      className="flex-1 text-xs bg-green-600 hover:bg-green-700 py-1 px-2 rounded"
                    >
                      Play 1x
                    </button>
                    <button
                      onClick={() => startPlayback(2, trip.id)}
                      className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 py-1 px-2 rounded"
                    >
                      Play 2x
                    </button>
                    <button
                      onClick={() => startPlayback(5, trip.id)}
                      className="flex-1 text-xs bg-amber-600 hover:bg-amber-700 py-1 px-2 rounded"
                    >
                      Play 5x
                    </button>
                    <button
                      onClick={() => startPlayback(200, trip.id)}
                      className="flex-1 text-xs bg-purple-600 hover:bg-purple-700 py-1 px-2 rounded"
                    >
                      View Trip
                    </button>
                  </div>
                  {playbackMode && (
                    <div className="mt-2 text-xs text-center">
                      <div className="text-green-500 font-medium">
                        {playbackSpeed === 0 ? 'Viewing complete trip' : (isPaused ? 'Paused' : 'Playing back...')}
                      </div>
                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={stopPlayback}
                          className="flex-1 text-xs bg-red-600 hover:bg-red-700 py-1 px-2 rounded"
                        >
                          Stop
                        </button>
                        {playbackSpeed > 0 && !isPaused && (
                          <button
                            onClick={pausePlayback}
                            className="flex-1 text-xs bg-yellow-600 hover:bg-yellow-700 py-1 px-2 rounded"
                          >
                            Pause
                          </button>
                        )}
                        {playbackSpeed > 0 && isPaused && (
                  <button
                            onClick={resumePlayback}
                            className="flex-1 text-xs bg-green-600 hover:bg-green-700 py-1 px-2 rounded"
                  >
                            Resume
                  </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Save Trip Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-zinc-800 p-6 rounded-2xl shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Trip</h3>
            <input
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="Enter trip name"
              className="w-full bg-zinc-700 text-white px-3 py-2 rounded mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveTrip}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
              >
                Save
              </button>
              <button
                onClick={handleCancelSave}
                className="flex-1 bg-zinc-600 hover:bg-zinc-700 text-white py-2 px-4 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Trip Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-zinc-800 p-6 rounded-2xl shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Import Trip</h3>
            <input
              type="file"
              accept=".json"
              onChange={(e) => setImportFile(e.target.files[0])}
              className="w-full bg-zinc-700 text-white px-3 py-2 rounded mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={handleImportTrip}
                disabled={!importFile}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 text-white py-2 px-4 rounded"
              >
                Import
              </button>
              <button
                onClick={() => setShowImportModal(false)}
                className="flex-1 bg-zinc-600 hover:bg-zinc-700 text-white py-2 px-4 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 