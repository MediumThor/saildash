const RACES_STORAGE_KEY = 'saildash_races';

export const saveRace = async (race) => {
  try {
    const existingRaces = await loadRaces();
    const updatedRaces = [...existingRaces, race];
    localStorage.setItem(RACES_STORAGE_KEY, JSON.stringify(updatedRaces));
    return true;
  } catch (error) {
    console.error('Failed to save race:', error);
    return false;
  }
};

export const loadRaces = async () => {
  try {
    const racesData = localStorage.getItem(RACES_STORAGE_KEY);
    if (!racesData) return [];
    
    const races = JSON.parse(racesData);
    return Array.isArray(races) ? races : [];
  } catch (error) {
    console.error('Failed to load races:', error);
    return [];
  }
};

export const deleteRace = async (raceId) => {
  try {
    const existingRaces = await loadRaces();
    const updatedRaces = existingRaces.filter(race => race.id !== raceId);
    localStorage.setItem(RACES_STORAGE_KEY, JSON.stringify(updatedRaces));
    return true;
  } catch (error) {
    console.error('Failed to delete race:', error);
    return false;
  }
};

export const exportRace = (race) => {
  try {
    const dataStr = JSON.stringify(race, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${race.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Failed to export race:', error);
    return false;
  }
};

export const importRace = async (file) => {
  try {
    const text = await file.text();
    const race = JSON.parse(text);
    
    // Validate race structure
    if (!race.id || !race.name || !race.startTime) {
      throw new Error('Invalid race file format');
    }
    
    // Generate new ID to avoid conflicts
    race.id = Date.now().toString();
    race.importedAt = new Date().toISOString();
    
    return race;
  } catch (error) {
    console.error('Failed to import race:', error);
    throw error;
  }
};

export const clearAllRaces = async () => {
  try {
    localStorage.removeItem(RACES_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear races:', error);
    return false;
  }
}; 