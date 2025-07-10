import React, { useEffect, useRef } from 'react';
import { Polyline, Marker, Popup } from 'react-leaflet';
import { useTrip } from '../context/TripContext';
import L from 'leaflet';

export default function TripPlayback({ mapRef }) {
  const {
    trackingData,
    playbackMode,
    playbackIndex,
    playbackSpeed,
    isPaused,
    savedTrips,
    selectedTripId,
    updatePlaybackIndex,
    stopPlayback,
  } = useTrip();

  const playbackIntervalRef = useRef(null);
  const currentPlaybackTrip = useRef(null);

  // Handle playback animation
  useEffect(() => {
    if (!playbackMode || !currentPlaybackTrip.current) {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
      return;
    }

    const trip = currentPlaybackTrip.current;
    const tripData = trip.data || [];
    
    console.log(`Playback: Index ${playbackIndex}/${tripData.length}, Mode: ${playbackMode}, Speed: ${playbackSpeed}, Paused: ${isPaused}`);

    // If paused, don't advance but keep current position visible
    if (isPaused) {
      console.log('Playback paused - keeping current position');
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
      return;
    }

    if (playbackIndex >= tripData.length) {
      console.log('Playback finished - keeping trip visible');
      // Don't stop playback, just stop the animation
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
      return;
    }

    // Center map on current playback position
    const currentPoint = tripData[playbackIndex];
    if (currentPoint && mapRef.current) {
      console.log(`Centering map on point ${playbackIndex}: ${currentPoint.lat}, ${currentPoint.lon}`);
      mapRef.current.setView([currentPoint.lat, currentPoint.lon], mapRef.current.getZoom());
    }

    // Auto-advance playback
    const intervalTime = 2000 / playbackSpeed; // 2 seconds per point at normal speed
    console.log(`Setting playback interval: ${intervalTime}ms`);
    
    playbackIntervalRef.current = setInterval(() => {
      console.log(`Advancing playback from ${playbackIndex} to ${playbackIndex + 1}`);
      updatePlaybackIndex(playbackIndex + 1);
    }, intervalTime);

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    };
  }, [playbackMode, playbackIndex, playbackSpeed, isPaused, updatePlaybackIndex, mapRef]);

  // Get current playback trip data
  useEffect(() => {
    console.log('=== TRIP SELECTION DEBUG ===');
    console.log('Playback mode:', playbackMode);
    console.log('Saved trips count:', savedTrips.length);
    console.log('Selected trip ID:', selectedTripId);
    console.log('All saved trips:', savedTrips);
    
    if (playbackMode && savedTrips.length > 0) {
      // Use the selected trip ID, or fall back to the most recent trip
      const selectedTrip = selectedTripId 
        ? savedTrips.find(trip => trip.id === selectedTripId)
        : savedTrips[savedTrips.length - 1];
      
      console.log('Found selected trip:', selectedTrip);
      console.log('Trip data length:', selectedTrip?.data?.length);
      console.log('Trip data sample:', selectedTrip?.data?.slice(0, 3));
      
      currentPlaybackTrip.current = selectedTrip;
      console.log('Set currentPlaybackTrip.current:', currentPlaybackTrip.current);
    } else {
      currentPlaybackTrip.current = null;
      console.log('Set currentPlaybackTrip.current to null');
    }
    console.log('=== END TRIP SELECTION DEBUG ===');
  }, [playbackMode, savedTrips, selectedTripId]);

  // Render tracking path
  const renderTrackingPath = () => {
    if (playbackMode && currentPlaybackTrip.current) {
      const tripData = currentPlaybackTrip.current.data || [];
      console.log('=== PATH RENDERING DEBUG ===');
      console.log('Playback mode:', playbackMode);
      console.log('Current playback trip:', currentPlaybackTrip.current);
      console.log('Trip data length:', tripData.length);
      console.log('Trip data:', tripData);
      
      // Validate that we have valid coordinates
      const validPoints = tripData.filter(point => 
        point && typeof point.lat === 'number' && typeof point.lon === 'number' &&
        !isNaN(point.lat) && !isNaN(point.lon)
      );
      
      console.log('Valid points count:', validPoints.length);
      console.log('Valid points:', validPoints);
      
      // Check if coordinates might be nested differently
      if (validPoints.length === 0 && tripData.length > 0) {
        console.log('No valid points found, checking for nested coordinates...');
        console.log('First point structure:', tripData[0]);
        console.log('First point keys:', Object.keys(tripData[0] || {}));
        
        // Try different possible coordinate field names
        const possibleLatFields = ['lat', 'latitude', 'Lat', 'Latitude'];
        const possibleLonFields = ['lon', 'lng', 'longitude', 'Lon', 'Lng', 'Longitude'];
        
        for (const point of tripData.slice(0, 3)) {
          console.log('Checking point:', point);
          for (const latField of possibleLatFields) {
            if (point[latField] !== undefined) {
              console.log(`Found lat field: ${latField} = ${point[latField]}`);
            }
          }
          for (const lonField of possibleLonFields) {
            if (point[lonField] !== undefined) {
              console.log(`Found lon field: ${lonField} = ${point[lonField]}`);
            }
          }
        }
        
        // Try to extract coordinates with fallback field names
        const fallbackValidPoints = tripData.filter(point => {
          if (!point) return false;
          
          // Try to find lat/lon with different field names
          const lat = point.lat || point.latitude || point.Lat || point.Latitude;
          const lon = point.lon || point.lng || point.longitude || point.Lon || point.Lng || point.Longitude;
          
          return typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon);
        });
        
        if (fallbackValidPoints.length > 0) {
          console.log(`Found ${fallbackValidPoints.length} points with fallback coordinate extraction`);
          validPoints.length = 0; // Clear the array
          validPoints.push(...fallbackValidPoints); // Add the fallback points
        }
      }
      
      if (validPoints.length < 2) {
        console.log('Not enough valid coordinate points:', validPoints.length);
        return null;
      }

      // Create path coordinates
      let pathCoords;
      
      // Helper function to extract coordinates with fallback
      const extractCoords = (point) => {
        const lat = point.lat || point.latitude || point.Lat || point.Latitude;
        const lon = point.lon || point.lng || point.longitude || point.Lon || point.Lng || point.Longitude;
        return [lat, lon];
      };
      
      if (isPaused) {
        // Paused mode - show progressive line up to current point (not the whole trip)
        pathCoords = validPoints.slice(0, playbackIndex + 1).map(extractCoords);
        console.log(`Paused mode: Drawing progressive path with ${pathCoords.length} points up to index ${playbackIndex}`);
      } else {
        // Active playback mode - show progressive line up to current point
        pathCoords = validPoints.slice(0, playbackIndex + 1).map(extractCoords);
        console.log(`Active playback: Drawing path with ${pathCoords.length} points up to index ${playbackIndex}`);
      }
      
      console.log('Final path coordinates:', pathCoords);
      console.log('=== END PATH RENDERING DEBUG ===');
      
      return (
        <Polyline
          positions={pathCoords}
          pathOptions={{
            color: '#3B82F6',
            weight: 3,
            opacity: 0.8,
          }}
        />
      );
    }

    // Show current tracking path
    if (trackingData.length >= 2) {
      const pathCoords = trackingData.map(point => [point.lat, point.lon]);
      
      return (
        <Polyline
          positions={pathCoords}
          pathOptions={{
            color: '#EF4444',
            weight: 3,
            opacity: 0.8,
            dashArray: '5, 5',
          }}
        />
      );
    }

    return null;
  };

  // Render playback position marker
  const renderPlaybackMarker = () => {
    if (!playbackMode || !currentPlaybackTrip.current) return null;

    const tripData = currentPlaybackTrip.current.data || [];
    let currentPoint;
    
    // Helper function to extract coordinates with fallback
    const extractCoords = (point) => {
      const lat = point.lat || point.latitude || point.Lat || point.Latitude;
      const lon = point.lon || point.lng || point.longitude || point.Lon || point.Lng || point.Longitude;
      return { lat, lon };
    };
    
    // Always show marker at current playback point
    currentPoint = tripData[playbackIndex];
    const isPlaybackFinished = playbackIndex >= tripData.length - 1;
    console.log(`Showing marker at point ${playbackIndex}, finished: ${isPlaybackFinished}`);

    if (!currentPoint) return null;

    const coords = extractCoords(currentPoint);
    if (!coords.lat || !coords.lon) return null;

    const playbackIcon = L.divIcon({
      className: 'playback-marker',
      html: `
        <div style="
          width: 20px;
          height: 20px;
          background: ${isPlaybackFinished ? '#F59E0B' : (isPaused ? '#F59E0B' : '#3B82F6')};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          animation: ${isPaused || isPlaybackFinished ? 'none' : 'pulse 1s infinite'};
        "></div>
        <style>
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
          }
        </style>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    return (
      <Marker
        position={[coords.lat, coords.lon]}
        icon={playbackIcon}
      />
    );
  };

  // Render tracking points
  const renderTrackingPoints = () => {
    if (playbackMode && currentPlaybackTrip.current) {
      const tripData = currentPlaybackTrip.current.data || [];
      console.log(`Rendering ${tripData.length} points for playback, speed: ${playbackSpeed}, paused: ${isPaused}`);
      
      // Validate that we have valid coordinates
      const validPoints = tripData.filter(point => 
        point && typeof point.lat === 'number' && typeof point.lon === 'number' &&
        !isNaN(point.lat) && !isNaN(point.lon)
      );
      
      console.log(`Valid points for rendering: ${validPoints.length}`);
      
      return validPoints.map((point, index) => {
        const isCurrentPoint = index === playbackIndex;
        const isLastPoint = index === validPoints.length - 1;
        const isPlaybackFinished = playbackIndex >= validPoints.length - 1;
        
        // Highlight current playback point, or last point if playback is finished
        const shouldHighlight = isCurrentPoint || (isLastPoint && isPlaybackFinished);
        
        console.log(`Point ${index}: isCurrentPoint=${isCurrentPoint}, isLastPoint=${isLastPoint}, isPlaybackFinished=${isPlaybackFinished}, shouldHighlight=${shouldHighlight}, playbackSpeed=${playbackSpeed}, totalPoints=${validPoints.length}`);
        
        const pointIcon = L.divIcon({
          className: 'tracking-point',
          html: `
            <div style="
              width: ${shouldHighlight ? '20px' : '16px'};
              height: ${shouldHighlight ? '20px' : '16px'};
              background: ${shouldHighlight ? (isPlaybackFinished && isLastPoint ? '#F59E0B' : (isPaused ? '#F59E0B' : '#3B82F6')) : '#6B7280'};
              border-radius: 50%;
              border: 2px solid white;
              cursor: pointer;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            "></div>
          `,
          iconSize: [shouldHighlight ? 20 : 16, shouldHighlight ? 20 : 16],
          iconAnchor: [shouldHighlight ? 10 : 8, shouldHighlight ? 10 : 8],
        });

        // Format timestamp
        const timestamp = new Date(point.timestamp).toLocaleTimeString();
        
        // Create popup content with point data
        const popupContent = `
          <div style="min-width: 250px;">
            <h4 style="margin: 0 0 12px 0; color: #3B82F6; font-size: 16px;">Point ${index + 1}</h4>
            <div style="font-size: 14px; line-height: 1.6;">
              <div style="margin-bottom: 6px;"><strong>Time:</strong> ${timestamp}</div>
              <div style="margin-bottom: 6px;"><strong>Position:</strong> ${point.lat.toFixed(6)}, ${point.lon.toFixed(6)}</div>
              <div style="margin-bottom: 6px;"><strong>Speed:</strong> ${point.speed ? point.speed.toFixed(1) : 'N/A'} kt</div>
              <div style="margin-bottom: 6px;"><strong>Heading:</strong> ${point.heading ? point.heading.toFixed(0) : 'N/A'}°</div>
              ${point.trueWindSpeed ? `<div style="margin-bottom: 6px;"><strong>True Wind:</strong> ${point.trueWindSpeed.toFixed(1)} kt @ ${point.trueWindDirection ? point.trueWindDirection.toFixed(0) : 'N/A'}°</div>` : ''}
              ${point.apparentWindSpeed ? `<div style="margin-bottom: 6px;"><strong>Apparent Wind:</strong> ${point.apparentWindSpeed.toFixed(1)} kt @ ${point.apparentWindDirection ? point.apparentWindDirection.toFixed(0) : 'N/A'}°</div>` : ''}
              ${point.depthFeet ? `<div style="margin-bottom: 6px;"><strong>Depth:</strong> ${point.depthFeet.toFixed(1)} ft</div>` : ''}
              ${point.temperature ? `<div style="margin-bottom: 6px;"><strong>Temp:</strong> ${point.temperature.toFixed(1)}°F</div>` : ''}
            </div>
          </div>
        `;

        // Helper function to extract coordinates with fallback
        const extractCoords = (point) => {
          const lat = point.lat || point.latitude || point.Lat || point.Latitude;
          const lon = point.lon || point.lng || point.longitude || point.Lon || point.Lng || point.Longitude;
          return [lat, lon];
        };

        const coords = extractCoords(point);
        if (!coords[0] || !coords[1]) return null;

        return (
          <Marker
            key={`${point.timestamp}-${index}`}
            position={coords}
            icon={pointIcon}
          >
            <Popup>
              <div dangerouslySetInnerHTML={{ __html: popupContent }} />
            </Popup>
          </Marker>
        );
      });
    }

    // Show current tracking points
    return trackingData.map((point, index) => {
      const pointIcon = L.divIcon({
        className: 'tracking-point',
        html: `
          <div style="
            width: 12px;
            height: 12px;
            background: #EF4444;
            border-radius: 50%;
            border: 2px solid white;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>
        `,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      // Format timestamp for current tracking
      const timestamp = new Date(point.timestamp).toLocaleTimeString();
      
      const popupContent = `
        <div style="min-width: 250px;">
          <h4 style="margin: 0 0 12px 0; color: #EF4444; font-size: 16px;">Current Point ${index + 1}</h4>
          <div style="font-size: 14px; line-height: 1.6;">
            <div style="margin-bottom: 6px;"><strong>Time:</strong> ${timestamp}</div>
            <div style="margin-bottom: 6px;"><strong>Position:</strong> ${point.lat.toFixed(6)}, ${point.lon.toFixed(6)}</div>
            <div style="margin-bottom: 6px;"><strong>Speed:</strong> ${point.speed ? point.speed.toFixed(1) : 'N/A'} kt</div>
            <div style="margin-bottom: 6px;"><strong>Heading:</strong> ${point.heading ? point.heading.toFixed(0) : 'N/A'}°</div>
            ${point.trueWindSpeed ? `<div style="margin-bottom: 6px;"><strong>True Wind:</strong> ${point.trueWindSpeed.toFixed(1)} kt @ ${point.trueWindDirection ? point.trueWindDirection.toFixed(0) : 'N/A'}°</div>` : ''}
            ${point.apparentWindSpeed ? `<div style="margin-bottom: 6px;"><strong>Apparent Wind:</strong> ${point.apparentWindSpeed.toFixed(1)} kt @ ${point.apparentWindDirection ? point.apparentWindDirection.toFixed(0) : 'N/A'}°</div>` : ''}
            ${point.depthFeet ? `<div style="margin-bottom: 6px;"><strong>Depth:</strong> ${point.depthFeet.toFixed(1)} ft</div>` : ''}
            ${point.temperature ? `<div style="margin-bottom: 6px;"><strong>Temp:</strong> ${point.temperature.toFixed(1)}°F</div>` : ''}
          </div>
        </div>
      `;

      return (
        <Marker
          key={`${point.timestamp}-${index}`}
          position={[point.lat, point.lon]}
          icon={pointIcon}
        >
          <Popup>
            <div dangerouslySetInnerHTML={{ __html: popupContent }} />
          </Popup>
        </Marker>
      );
    });
  };

  return (
    <>
      {renderTrackingPath()}
      {renderTrackingPoints()}
      {renderPlaybackMarker()}
    </>
  );
} 