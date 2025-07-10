import { calculateBearing } from "../utils/calculateBearing";
import { getCompassOffset } from "../context/DisplaySettingsContext";
import tzlookup from "tz-lookup";
import { DateTime } from "luxon";

// Spoofed GPS coordinates for testing - a realistic sailing route
let spoofedIndex = 0;
let spoofedDataEnabled = false; // Toggle for spoofed data
const spoofedCoordinates = [
  // Start at Port Washington marina
  { lat: 43.3875, lon: -87.8750, speed: 4.5, heading: 90 },   // Start - heading east
  
  // Straight line east for about 300 feet (0.05 nautical miles)
  { lat: 43.3875, lon: -87.8740, speed: 4.8, heading: 90 },   // 300ft east
  { lat: 43.3875, lon: -87.8730, speed: 5.1, heading: 90 },   // 600ft east
  { lat: 43.3875, lon: -87.8720, speed: 5.3, heading: 90 },   // 900ft east
  { lat: 43.3875, lon: -87.8710, speed: 5.0, heading: 90 },   // 1200ft east
  { lat: 43.3875, lon: -87.8700, speed: 4.7, heading: 90 },   // 1500ft east
  
  // First turn - tack to port (northeast)
  { lat: 43.3880, lon: -87.8695, speed: 4.9, heading: 45 },   // Turn NE
  { lat: 43.3885, lon: -87.8690, speed: 5.2, heading: 45 },   // Continue NE
  { lat: 43.3890, lon: -87.8685, speed: 5.4, heading: 45 },   // Continue NE
  
  // Second turn - tack to starboard (southeast)
  { lat: 43.3895, lon: -87.8680, speed: 5.1, heading: 135 },  // Turn SE
  { lat: 43.3890, lon: -87.8675, speed: 4.8, heading: 135 },  // Continue SE
  { lat: 43.3885, lon: -87.8670, speed: 4.6, heading: 135 },  // Continue SE
  
  // Third turn - tack back to port (northeast)
  { lat: 43.3880, lon: -87.8665, speed: 4.9, heading: 45 },   // Turn NE
  { lat: 43.3885, lon: -87.8660, speed: 5.3, heading: 45 },   // Continue NE
  { lat: 43.3890, lon: -87.8655, speed: 5.5, heading: 45 },   // Continue NE
  
  // Fourth turn - broad reach (southeast)
  { lat: 43.3895, lon: -87.8650, speed: 5.8, heading: 120 },  // Broad reach SE
  { lat: 43.3900, lon: -87.8645, speed: 6.1, heading: 120 },  // Continue SE
  { lat: 43.3905, lon: -87.8640, speed: 6.3, heading: 120 },  // Continue SE
  
  // Fifth turn - run downwind (south)
  { lat: 43.3910, lon: -87.8635, speed: 5.9, heading: 180 },  // Run downwind S
  { lat: 43.3915, lon: -87.8630, speed: 5.6, heading: 180 },  // Continue S
  { lat: 43.3920, lon: -87.8625, speed: 5.4, heading: 180 },  // Continue S
  
  // Final turn - beat back upwind (northwest)
  { lat: 43.3925, lon: -87.8620, speed: 4.8, heading: 315 },  // Beat upwind NW
  { lat: 43.3930, lon: -87.8615, speed: 4.5, heading: 315 },  // Continue NW
  { lat: 43.3935, lon: -87.8610, speed: 4.2, heading: 315 },  // Continue NW
];

// Function to enable/disable spoofed data
function enableSpoofedData(enabled = true) {
  spoofedDataEnabled = enabled;
  spoofedIndex = 0; // Reset to start of route
  console.log(`Spoofed GPS data ${enabled ? 'enabled' : 'disabled'}`);
}

// Function to manually advance spoofed position
function advanceSpoofedPosition() {
  if (spoofedDataEnabled) {
    spoofedIndex = (spoofedIndex + 1) % spoofedCoordinates.length;
    console.log(`Manually advanced to index ${spoofedIndex}`);
  } else {
    console.log('Spoofed data not enabled. Use enableSpoofedData(true) first.');
  }
}

// Function to reset spoofed position to start
function resetSpoofedPosition() {
  spoofedIndex = 0;
  console.log('Spoofed position reset to start');
}

// Function to get spoofed GPS data
function getSpoofedGPSData() {
  if (spoofedIndex >= spoofedCoordinates.length) {
    spoofedIndex = 0; // Loop back to start
  }
  
  const coord = spoofedCoordinates[spoofedIndex];
  console.log(`Spoofed GPS: Index ${spoofedIndex}, Lat: ${coord.lat}, Lon: ${coord.lon}, Speed: ${coord.speed}, Heading: ${coord.heading}`);
  spoofedIndex++;
  
  return {
    lat: coord.lat,
    lon: coord.lon,
    speed: coord.speed,
    speedKnots: coord.speed,
    heading: coord.heading,
    compass: coord.heading,
    sats: 8,
    fix: 3,
    gpsTime: new Date().toISOString(),
    // Add some wind data for realism
    trueWindSpeed: 12 + Math.random() * 5,
    trueWindDirection: coord.heading + 45 + (Math.random() * 30 - 15),
    apparentWindSpeed: 10 + Math.random() * 3,
    apparentWindDirection: coord.heading + 30 + (Math.random() * 20 - 10),
    // Add some sensor data
    temperature: 72 + Math.random() * 5,
    humidity: 60 + Math.random() * 20,
    pressure: 1013 + Math.random() * 10,
    depthFeet: 25 + Math.random() * 10,
    heel: Math.random() * 10 - 5,
    pitch: Math.random() * 5 - 2.5,
  };
}

let latest = {
  temperature: null,
  humidity: null,
  pressure: null,
  waterTemp1: null,
  waterTemp2: null,
  lat: null,
  lon: null,
  alt: null,
  sats: null,
  fix: null,
  speed: null,
  heading: null,
  speedKnots: null,
  headingDeg: 237,
  windAngle: null,
  depthFeet: 28.5,
  trueWindSpeed: null,
  trueWindDirection: null,
  apparentWindDirection: null,
  apparentWindSpeed: null,

  // ➕ HWT901B fields
  heel: null,
  pitch: null,
  compass: null,

  // ➕ GPS enhancements
  cog: null,
  gpsTime: null,

  // ➕ Bearing to current destination
  bearingToDestination: null,
};

const liveData = {
  set(data) {
    const swapped = { ...data };

    // Flip reversed compass (if needed)
    // if (swapped.compass != null) {
    //   swapped.compass = (360 - swapped.compass) % 360;
    // }

    // Heel and pitch swap correction
    if ('heel' in swapped && 'pitch' in swapped) {
      const temp = swapped.heel;
      swapped.heel = swapped.pitch;
      swapped.pitch = temp;
    }

    // Apply compass flip and offset
    if (swapped.compass != null) {
      swapped.compass = (360 - swapped.compass + getCompassOffset()) % 360;
    }

    latest = { ...latest, ...swapped };
  },

  get() {
    // If spoofed data is enabled, return spoofed data regardless of real GPS
    if (spoofedDataEnabled) {
      const spoofedData = getSpoofedGPSData();
      return { ...latest, ...spoofedData };
    }
    // Return all available data, even if GPS is not available
    return { ...latest };
  },

  getTempF() {
    return latest.temperature;
  },

  getLatLon() {
    return [latest.lat, latest.lon];
  },

  getPressure() {
    return latest.pressure;
  },

  getHumidity() {
    return latest.humidity;
  },

  getHeading() {
    return latest.heading;
  },

  getSpeed() {
    return latest.speedKnots ?? latest.speed;
  },

  getCompassHeading() {
    if (latest.compass == null) return null;
    return (latest.compass + getCompassOffset() + 360) % 360;
  },

  getCOG() {
    return latest.cog != null ? Math.round(latest.cog) : null;
  },

  getGPSTime() {
    return latest.gpsTime ?? null;
  },

  getGPSTimeCentral() {
    const utcTime = latest.gpsTime;
    if (!utcTime) return null;
    
    // Convert UTC to Central Time (UTC-6 for CST, UTC-5 for CDT)
    // For simplicity, we'll use UTC-6 (Central Standard Time)
    // In a production app, you'd want to handle daylight saving time properly
    
    try {
      // If it's already in HH:MM format, convert it
      if (utcTime.includes(':') && utcTime.split(':').length === 2) {
        const [hour, minute] = utcTime.split(':').map(Number);
        let centralHour = hour - 6; // UTC-6 for Central Time
        
        // Handle day wrap-around
        if (centralHour < 0) {
          centralHour += 24;
        }
        
        return `${centralHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      }
      
      // If it's a full datetime string, parse it
      if (utcTime.includes('T') || utcTime.includes(' ')) {
        const date = new Date(utcTime);
        const centralDate = new Date(date.getTime() - (6 * 60 * 60 * 1000)); // Subtract 6 hours
        return centralDate.toTimeString().substring(0, 5); // Return HH:MM
      }
      
      return utcTime; // Return as-is if we can't parse it
    } catch (error) {
      console.error('Error converting GPS time to Central:', error);
      return utcTime; // Return original if conversion fails
    }
  },

  getHeel() {
    return latest.heel;
  },

  getPitch() {
    return latest.pitch;
  },

  getBearingToDestination() {
    return latest.bearingToDestination;
  },
};

// Add a function to get local time from GPS UTC time and lat/lon
export function getLocalTimeFromGPS(gpsUtcTime, lat, lon) {
  if (!gpsUtcTime || lat == null || lon == null) return null;
  let tz;
  try {
    tz = tzlookup(lat, lon); // e.g., "America/Chicago"
  } catch (e) {
    tz = "UTC";
  }
  let dt;
  if (gpsUtcTime.includes("T")) {
    dt = DateTime.fromISO(gpsUtcTime, { zone: "utc" });
  } else {
    // If only HH:MM, use today in UTC, then set the hour/minute manually
    const [hh, mm] = gpsUtcTime.split(":").map(Number);
    const today = DateTime.utc().set({ hour: hh, minute: mm, second: 0, millisecond: 0 });
    dt = today;
  }
  return dt.setZone(tz).toFormat("HH:mm");
}

export default liveData;

// Make spoofed data function available globally for testing
if (typeof window !== 'undefined') {
  window.enableSpoofedData = enableSpoofedData;
  window.advanceSpoofedPosition = advanceSpoofedPosition;
  window.resetSpoofedPosition = resetSpoofedPosition;
  console.log('Spoofed GPS testing available:');
  console.log('- enableSpoofedData(true/false) - enable/disable spoofed data');
  console.log('- advanceSpoofedPosition() - manually advance to next position');
  console.log('- resetSpoofedPosition() - reset to start of route');
}
