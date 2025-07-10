import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { saveTrip, loadTrips, deleteTrip } from '../utils/tripStorage';

const TripContext = createContext();

const initialState = {
  isTracking: false,
  currentTrip: null,
  savedTrips: [],
  trackingStartTime: null,
  trackingData: [],
  playbackMode: false,
  playbackIndex: 0,
  playbackSpeed: 1,
  isPaused: false,
  selectedTripId: null,
};

const tripReducer = (state, action) => {
  switch (action.type) {
    case 'START_TRACKING':
      return {
        ...state,
        isTracking: true,
        currentTrip: {
          id: Date.now().toString(),
          name: `Trip ${new Date().toLocaleString()}`,
          startTime: new Date().toISOString(),
          data: [],
        },
        trackingStartTime: Date.now(),
        trackingData: [],
        playbackMode: false,
        playbackIndex: 0,
      };

    case 'STOP_TRACKING':
      return {
        ...state,
        isTracking: false,
        currentTrip: null,
        trackingStartTime: null,
        trackingData: [],
      };

    case 'ADD_TRACKING_POINT':
      if (!state.isTracking) return state;
      const newPoint = {
        timestamp: Date.now(),
        ...action.payload,
      };
      const updatedTrackingData = [...state.trackingData, newPoint];
      return {
        ...state,
        trackingData: updatedTrackingData,
        currentTrip: state.currentTrip ? {
          ...state.currentTrip,
          data: updatedTrackingData,
        } : null,
      };

    case 'SAVE_CURRENT_TRIP':
      if (!state.currentTrip) return state;
      const savedTrip = {
        ...state.currentTrip,
        name: action.payload.name || state.currentTrip.name,
        endTime: new Date().toISOString(),
        totalDistance: calculateTotalDistance(state.trackingData),
        duration: Date.now() - state.trackingStartTime,
        data: [...state.trackingData],
      };
      console.log('SAVE_CURRENT_TRIP reducer - saving trip:', savedTrip.name, 'with', state.trackingData.length, 'points');
      console.log('Current savedTrips count:', state.savedTrips.length);
      const newState = {
        ...state,
        savedTrips: [...state.savedTrips, savedTrip],
        currentTrip: null,
        trackingData: [],
      };
      console.log('New savedTrips count:', newState.savedTrips.length);
      return newState;

    case 'LOAD_SAVED_TRIPS':
      return {
        ...state,
        savedTrips: action.payload,
      };

    case 'DELETE_TRIP':
      return {
        ...state,
        savedTrips: state.savedTrips.filter(trip => trip.id !== action.payload),
      };

    case 'IMPORT_TRIP':
      return {
        ...state,
        savedTrips: [...state.savedTrips, action.payload],
      };

    case 'START_PLAYBACK':
      return {
        ...state,
        playbackMode: true,
        playbackIndex: 0,
        playbackSpeed: action.payload.speed || 1,
        isPaused: false,
        selectedTripId: action.payload.tripId || null,
      };

    case 'PAUSE_PLAYBACK':
      return {
        ...state,
        isPaused: true,
      };

    case 'RESUME_PLAYBACK':
      return {
        ...state,
        isPaused: false,
      };

    case 'STOP_PLAYBACK':
      return {
        ...state,
        playbackMode: false,
        playbackIndex: 0,
        playbackSpeed: 1,
        isPaused: false,
      };

    case 'UPDATE_PLAYBACK_INDEX':
      return {
        ...state,
        playbackIndex: action.payload,
      };

    case 'SET_SELECTED_TRIP':
      return {
        ...state,
        selectedTripId: action.payload,
      };

    default:
      return state;
  }
};

const calculateTotalDistance = (trackingData) => {
  if (trackingData.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 1; i < trackingData.length; i++) {
    const prev = trackingData[i - 1];
    const curr = trackingData[i];
    if (prev.lat && prev.lon && curr.lat && curr.lon) {
      const distance = calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);
      totalDistance += distance;
    }
  }
  return totalDistance;
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

export const TripProvider = ({ children }) => {
  const [state, dispatch] = useReducer(tripReducer, initialState);

  // Load saved trips on mount
  useEffect(() => {
    const loadSavedTrips = async () => {
      try {
        const trips = await loadTrips();
        dispatch({ type: 'LOAD_SAVED_TRIPS', payload: trips });
      } catch (error) {
        console.error('Failed to load saved trips:', error);
      }
    };
    loadSavedTrips();
  }, []);

  const startTracking = () => {
    dispatch({ type: 'START_TRACKING' });
  };

  const stopTracking = () => {
    dispatch({ type: 'STOP_TRACKING' });
  };

  const addTrackingPoint = (data) => {
    dispatch({ type: 'ADD_TRACKING_POINT', payload: data });
  };

  const saveCurrentTrip = async (name) => {
    console.log('saveCurrentTrip called with name:', name);
    console.log('state.currentTrip:', state.currentTrip);
    console.log('state.trackingData.length:', state.trackingData.length);
    
    if (state.currentTrip && state.trackingData.length > 0) {
      const tripToSave = {
        ...state.currentTrip,
        name: name,
        endTime: new Date().toISOString(),
        totalDistance: calculateTotalDistance(state.trackingData),
        duration: Date.now() - state.trackingStartTime,
        data: [...state.trackingData],
      };
      
      console.log('tripToSave object:', tripToSave);
      
      try {
        console.log('About to call saveTrip...');
        await saveTrip(tripToSave);
        console.log('saveTrip completed, now dispatching SAVE_CURRENT_TRIP');
      dispatch({ type: 'SAVE_CURRENT_TRIP', payload: { name } });
        console.log('SAVE_CURRENT_TRIP dispatched');
      } catch (error) {
        console.error('Failed to save trip:', error);
      }
    } else {
      console.log('Cannot save trip - missing currentTrip or trackingData');
    }
  };

  const deleteSavedTrip = async (tripId) => {
    try {
      await deleteTrip(tripId);
      dispatch({ type: 'DELETE_TRIP', payload: tripId });
    } catch (error) {
      console.error('Failed to delete trip:', error);
    }
  };

  const importSavedTrip = async (trip) => {
    try {
      await saveTrip(trip);
      dispatch({ type: 'IMPORT_TRIP', payload: trip });
    } catch (error) {
      console.error('Failed to import trip:', error);
      throw error;
    }
  };

  const startPlayback = (speed = 1, tripId = null) => {
    dispatch({ type: 'START_PLAYBACK', payload: { speed, tripId } });
  };

  const setSelectedTrip = (tripId) => {
    dispatch({ type: 'SET_SELECTED_TRIP', payload: tripId });
  };

  const pausePlayback = () => {
    dispatch({ type: 'PAUSE_PLAYBACK' });
  };

  const resumePlayback = () => {
    dispatch({ type: 'RESUME_PLAYBACK' });
  };

  const stopPlayback = () => {
    dispatch({ type: 'STOP_PLAYBACK' });
  };

  const updatePlaybackIndex = (index) => {
    dispatch({ type: 'UPDATE_PLAYBACK_INDEX', payload: index });
  };

  const value = {
    ...state,
    startTracking,
    stopTracking,
    addTrackingPoint,
    saveCurrentTrip,
    deleteSavedTrip,
    importSavedTrip,
    startPlayback,
    setSelectedTrip,
    pausePlayback,
    resumePlayback,
    stopPlayback,
    updatePlaybackIndex,
  };

  return (
    <TripContext.Provider value={value}>
      {children}
    </TripContext.Provider>
  );
};

export const useTrip = () => {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
}; 