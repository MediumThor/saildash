const TRIPS_STORAGE_KEY = 'saildash_trips';

export const saveTrip = async (trip) => {
  try {
    console.log('Saving trip:', trip.name, 'with ID:', trip.id);
    const existingTrips = await loadTrips();
    console.log('Existing trips:', existingTrips.length);
    const updatedTrips = [...existingTrips, trip];
    localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(updatedTrips));
    console.log('Trip saved successfully. Total trips:', updatedTrips.length);
    return true;
  } catch (error) {
    console.error('Failed to save trip:', error);
    return false;
  }
};

export const loadTrips = async () => {
  try {
    const tripsData = localStorage.getItem(TRIPS_STORAGE_KEY);
    console.log('Loading trips from localStorage:', tripsData ? 'data found' : 'no data');
    if (!tripsData) return [];
    
    const trips = JSON.parse(tripsData);
    console.log('Parsed trips:', trips.length);
    return Array.isArray(trips) ? trips : [];
  } catch (error) {
    console.error('Failed to load trips:', error);
    return [];
  }
};

export const deleteTrip = async (tripId) => {
  try {
    const existingTrips = await loadTrips();
    const updatedTrips = existingTrips.filter(trip => trip.id !== tripId);
    localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(updatedTrips));
    return true;
  } catch (error) {
    console.error('Failed to delete trip:', error);
    return false;
  }
};

export const exportTrip = (trip) => {
  try {
    const dataStr = JSON.stringify(trip, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${trip.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Failed to export trip:', error);
    return false;
  }
};

export const importTrip = async (file) => {
  try {
    const text = await file.text();
    const trip = JSON.parse(text);
    
    // Validate trip structure
    if (!trip.id || !trip.name || !trip.data || !Array.isArray(trip.data)) {
      throw new Error('Invalid trip file format');
    }
    
    // Generate new ID to avoid conflicts
    trip.id = Date.now().toString();
    trip.importedAt = new Date().toISOString();
    
    return trip;
  } catch (error) {
    console.error('Failed to import trip:', error);
    throw error;
  }
};

export const clearAllTrips = async () => {
  try {
    localStorage.removeItem(TRIPS_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear trips:', error);
    return false;
  }
}; 