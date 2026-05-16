import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { saveRace, loadRaces, deleteRace } from '../utils/raceStorage';
import { calculateBearing } from '../utils/calculateBearing';
import { calculateDistance } from '../utils/calculateDistance';
import liveData, { getAdjustedUTCTime } from '../utils/liveData';

const RaceContext = createContext();

const initialState = {
  // Race timing
  startTime: null, // HH:MM format
  countdownActive: false,
  raceStarted: false,
  raceStartTimestamp: null,
  elapsedTime: 0,
  countdownDisplay: '--', // Add countdown display

  // Course management
  course: [], // Array of navpoints
  currentMarkIndex: 0,

  // Start line
  startLine: {
    pin1: null, // { lat, lon, name }
    pin2: null, // { lat, lon, name }
  },

  // Race progress
  distanceToStart: null,
  timeToStart: null,
  distanceToMark: null,
  timeToMark: null,
  bearingToMark: null,

  // Saved races
  savedRaces: [],

  // Race status
  isRacing: false,

  // Race mode display
  showRaceMode: false,
};

const raceReducer = (state, action) => {
  switch (action.type) {
    case 'SET_START_TIME':
      return {
        ...state,
        startTime: action.payload,
        countdownActive: true,
        raceStarted: false,
      };

    case 'START_RACE':
      console.log('START_RACE action dispatched');
      return {
        ...state,
        raceStarted: true,
        raceStartTimestamp: Date.now(),
        isRacing: true,
        countdownActive: false, // Stop the countdown
      };

    case 'UPDATE_ELAPSED_TIME':
      return {
        ...state,
        elapsedTime: action.payload,
      };

    case 'UPDATE_COUNTDOWN':
      return {
        ...state,
        countdownDisplay: action.payload,
      };

    case 'SET_COURSE':
      return {
        ...state,
        course: action.payload,
        currentMarkIndex: 0,
      };

    case 'SET_START_LINE':
      return {
        ...state,
        startLine: action.payload,
      };

    case 'UPDATE_RACE_PROGRESS':
      return {
        ...state,
        ...action.payload,
      };

    case 'ADVANCE_TO_NEXT_MARK':
      return {
        ...state,
        currentMarkIndex: Math.min(state.currentMarkIndex + 1, state.course.length - 1),
      };

    case 'LOAD_SAVED_RACES':
      return {
        ...state,
        savedRaces: action.payload,
      };

    case 'SAVE_RACE':
      return {
        ...state,
        savedRaces: [...state.savedRaces, action.payload],
      };

    case 'DELETE_RACE':
      return {
        ...state,
        savedRaces: state.savedRaces.filter(race => race.id !== action.payload),
      };

    case 'RESET_RACE':
      return {
        ...initialState,
        savedRaces: state.savedRaces,
      };

    case 'TOGGLE_RACE_MODE':
      return {
        ...state,
        showRaceMode: !state.showRaceMode,
      };

    default:
      return state;
  }
};

export const RaceProvider = ({ children }) => {
  const [state, dispatch] = useReducer(raceReducer, initialState);

  // Load saved races on mount
  useEffect(() => {
    const loadSavedRaces = async () => {
      try {
        const races = await loadRaces();
        dispatch({ type: 'LOAD_SAVED_RACES', payload: races });
      } catch (error) {
        console.error('Failed to load saved races:', error);
      }
    };
    loadSavedRaces();
  }, []);

  // Update elapsed time when racing
  useEffect(() => {
    if (!state.raceStarted || !state.raceStartTimestamp) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - state.raceStartTimestamp;
      dispatch({ type: 'UPDATE_ELAPSED_TIME', payload: elapsed });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.raceStarted, state.raceStartTimestamp]);

  // Simple countdown timer
  useEffect(() => {
    if (!state.countdownActive || !state.startTime || state.raceStarted) {
      return;
    }

    let interval;

    const countdown = () => {
      // Get adjusted UTC time (GPS time = UTC + 19 seconds with timezone)
      const currentTimeString = getAdjustedUTCTime();

      // Parse start time
      const [startHour, startMinute, startSecond] = state.startTime.split(':').map(Number);
      const [currentHour, currentMinute, currentSecond] = currentTimeString.split(':').map(Number);

      // Calculate seconds until start
      let startSeconds = startHour * 3600 + startMinute * 60 + startSecond;
      let currentSeconds = currentHour * 3600 + currentMinute * 60 + currentSecond;
      let diff = startSeconds - currentSeconds;

      // If negative, add 24 hours (next day)
      if (diff <= 0) {
        diff += 24 * 3600;
      }

      // If 1 second or less, show START and start race
      if (diff <= 1) {
        console.log('Countdown finished - starting race!');
        dispatch({ type: 'START_RACE' });
        dispatch({ type: 'UPDATE_COUNTDOWN', payload: 'START' });
        if (interval) {
          clearInterval(interval);
        }
        return;
      }

      // Format countdown
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      let display;
      if (hours > 0) {
        display = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }

      dispatch({ type: 'UPDATE_COUNTDOWN', payload: display });
    };

    // Run immediately
    countdown();

    // Then every second
    interval = setInterval(countdown, 1000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [state.countdownActive, state.startTime]);

  // Update race progress
  useEffect(() => {
    // Calculate progress whenever we have start line or course data, not just when racing
    const hasStartLine = state.startLine.pin1 && state.startLine.pin2;
    const hasCourse = state.course.length > 0;

    console.log('Race Progress useEffect triggered:', {
      hasStartLine,
      hasCourse,
      startLine: state.startLine,
      courseLength: state.course.length
    });

    if (!hasStartLine && !hasCourse) {
      console.log('No start line or course, returning early');
      return;
    }

    console.log('Setting up race progress interval');

    const updateProgress = () => {
      const data = liveData.get();
      console.log('updateProgress called, data:', data);

      if (!data.lat || !data.lon) {
        console.log('No lat/lon data, returning');
        return;
      }

      console.log('Race Progress Update:', {
        lat: data.lat,
        lon: data.lon,
        speedKnots: data.speedKnots,
        speed: data.speed,
        hasStartLine: !!(state.startLine.pin1 && state.startLine.pin2),
        hasCourse: state.course.length > 0
      });

      const progress = calculateRaceProgress(data, state);
      console.log('Calculated Progress:', progress);

      dispatch({ type: 'UPDATE_RACE_PROGRESS', payload: progress });
    };

    // Run immediately
    updateProgress();

    const interval = setInterval(updateProgress, 1000);
    return () => clearInterval(interval);
  }, [state.startLine, state.course, state.currentMarkIndex]);

  const setStartTime = (time) => {
    dispatch({ type: 'SET_START_TIME', payload: time });
  };

  const setCourse = (course) => {
    dispatch({ type: 'SET_COURSE', payload: course });
  };

  const setStartLine = (startLine) => {
    dispatch({ type: 'SET_START_LINE', payload: startLine });
  };

  const advanceToNextMark = () => {
    dispatch({ type: 'ADVANCE_TO_NEXT_MARK' });
  };

  const saveCurrentRace = async (name) => {
    const raceToSave = {
      id: Date.now().toString(),
      name,
      startTime: state.startTime,
      course: state.course,
      startLine: state.startLine,
      createdAt: new Date().toISOString(),
    };

    try {
      await saveRace(raceToSave);
      dispatch({ type: 'SAVE_RACE', payload: raceToSave });
    } catch (error) {
      console.error('Failed to save race:', error);
    }
  };

  const deleteSavedRace = async (raceId) => {
    try {
      await deleteRace(raceId);
      dispatch({ type: 'DELETE_RACE', payload: raceId });
    } catch (error) {
      console.error('Failed to delete race:', error);
    }
  };

  const resetRace = () => {
    dispatch({ type: 'RESET_RACE' });
  };

  const setShowRaceMode = (show) => {
    dispatch({ type: 'TOGGLE_RACE_MODE' });
  };

  const value = {
    ...state,
    setStartTime,
    setCourse,
    setStartLine,
    advanceToNextMark,
    saveCurrentRace,
    deleteSavedRace,
    resetRace,
    setShowRaceMode,
  };

  return (
    <RaceContext.Provider value={value}>
      {children}
    </RaceContext.Provider>
  );
};

export const useRace = () => {
  const context = useContext(RaceContext);
  if (!context) {
    throw new Error('useRace must be used within a RaceProvider');
  }
  return context;
};

// Helper function to calculate race progress
const calculateRaceProgress = (data, state) => {
  const { lat, lon } = data;
  const speedKnots = liveData.getSpeed(); // Use the getSpeed function
  const progress = {};

  console.log('calculateRaceProgress inputs:', { lat, lon, speedKnots, rawSpeedKnots: data.speedKnots, rawSpeed: data.speed });

  // Calculate distance and time to start line
  if (state.startLine.pin1 && state.startLine.pin2) {
    const distanceToStart = calculateDistanceToStartLine(
      lat, lon,
      state.startLine.pin1,
      state.startLine.pin2
    );
    progress.distanceToStart = distanceToStart;

    console.log('Start line calculation:', {
      distanceToStart,
      speedKnots,
      hasSpeed: !!(speedKnots && speedKnots > 0)
    });

    if (speedKnots && speedKnots > 0) {
      progress.timeToStart = (distanceToStart / speedKnots) * 3600; // seconds
      console.log('Time to start calculated:', progress.timeToStart);
    } else {
      console.log('No valid speed for time calculation');
    }
  }

  // Calculate distance and time to next mark
  if (state.course.length > 0 && state.currentMarkIndex < state.course.length) {
    const nextMark = state.course[state.currentMarkIndex];
    const distanceToMark = calculateDistance(lat, lon, nextMark.lat, nextMark.lon);
    progress.distanceToMark = distanceToMark;
    progress.bearingToMark = calculateBearing(lat, lon, nextMark.lat, nextMark.lon);

    if (speedKnots && speedKnots > 0) {
      progress.timeToMark = (distanceToMark / speedKnots) * 3600; // seconds
    }
  }

  console.log('Final progress object:', progress);
  return progress;
};

// Helper function to calculate distance to start line (perpendicular distance to line segment)
const calculateDistanceToStartLine = (lat, lon, pin1, pin2) => {
  console.log('calculateDistanceToStartLine called with:', { lat, lon, pin1, pin2 });

  // First, find the closest point on the line segment
  const closestPoint = findClosestPointOnLine(lat, lon, pin1, pin2);
  console.log('Closest point found:', closestPoint);

  // Then calculate the distance to that closest point using proper nautical mile calculation
  const distance = calculateDistance(lat, lon, closestPoint.lat, closestPoint.lon);
  console.log('Distance calculated:', distance);

  return distance;
};

// Helper function to find the closest point on a line segment
const findClosestPointOnLine = (lat, lon, pin1, pin2) => {
  // Convert to radians for calculations
  const lat1 = pin1.lat * Math.PI / 180;
  const lon1 = pin1.lon * Math.PI / 180;
  const lat2 = pin2.lat * Math.PI / 180;
  const lon2 = pin2.lon * Math.PI / 180;
  const latP = lat * Math.PI / 180;
  const lonP = lon * Math.PI / 180;

  // Calculate the bearing from pin1 to pin2
  const bearing12 = Math.atan2(
    Math.sin(lon2 - lon1) * Math.cos(lat2),
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
  );

  // Calculate the bearing from pin1 to current position
  const bearing1P = Math.atan2(
    Math.sin(lonP - lon1) * Math.cos(latP),
    Math.cos(lat1) * Math.sin(latP) - Math.sin(lat1) * Math.cos(latP) * Math.cos(lonP - lon1)
  );

  // Calculate the distance from pin1 to current position
  const distance1P = Math.acos(
    Math.sin(lat1) * Math.sin(latP) + Math.cos(lat1) * Math.cos(latP) * Math.cos(lonP - lon1)
  );

  // Calculate the distance from pin1 to pin2
  const distance12 = Math.acos(
    Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
  );

  // Calculate the cross-track distance (perpendicular distance to line)
  const crossTrackDistance = Math.asin(Math.sin(distance1P) * Math.sin(bearing1P - bearing12));

  // Calculate the along-track distance (distance along the line from pin1)
  const alongTrackDistance = Math.acos(
    Math.cos(distance1P) / Math.cos(Math.abs(crossTrackDistance))
  );

  // Determine if the closest point is on the line segment
  if (alongTrackDistance <= 0) {
    // Closest point is pin1
    return { lat: pin1.lat, lon: pin1.lon };
  } else if (alongTrackDistance >= distance12) {
    // Closest point is pin2
    return { lat: pin2.lat, lon: pin2.lon };
  } else {
    // Closest point is on the line segment
    const ratio = alongTrackDistance / distance12;
    const closestLat = pin1.lat + ratio * (pin2.lat - pin1.lat);
    const closestLon = pin1.lon + ratio * (pin2.lon - pin1.lon);
    return { lat: closestLat, lon: closestLon };
  }
};
