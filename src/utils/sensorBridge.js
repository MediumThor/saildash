import liveData from './liveData.js';
import BACKEND_URL from '../config/backend.js';

// Function to send current sensor data to the AI backend
export async function updateAISensorData() {
  try {
    const currentData = liveData.get();
    // Only include compass if it is not null
    const compassHeading = liveData.getCompassHeading();
    const dataToSend = { ...currentData };
    if (compassHeading != null) {
      dataToSend.compass = compassHeading;
    }
    
    // Send data even if GPS is not available - environmental sensors can work independently
    const response = await fetch(`${BACKEND_URL}/api/sensors/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataToSend),
    });
    
    if (response.ok) {
      console.log('Sensor data sent to AI backend successfully');
      return true;
    } else {
      console.warn('Failed to send sensor data to AI backend');
      return false;
    }
  } catch (error) {
    console.error('Error sending sensor data to AI backend:', error);
    return false;
  }
}

// Function to start periodic sensor data updates
export function startSensorDataSync(intervalMs = 5000) {
  // Send initial data
  updateAISensorData();
  
  // Set up periodic updates
  const intervalId = setInterval(updateAISensorData, intervalMs);
  
  // Return function to stop the sync
  return () => {
    clearInterval(intervalId);
    console.log('Sensor data sync stopped');
  };
}

// Function to get current sensor data from AI backend
export async function getAISensorData() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/sensors`);
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.warn('Failed to get sensor data from AI backend');
      return null;
    }
  } catch (error) {
    console.error('Error getting sensor data from AI backend:', error);
    return null;
  }
} 