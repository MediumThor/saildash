// Haversine formula to calculate distance in nautical miles
export function calculateDistance(lat1, lon1, lat2, lon2) {
    console.log('calculateDistance called with:', { lat1, lon1, lat2, lon2 });
    
    const R = 6371; // Radius of Earth in kilometers
    const toRad = (deg) => (deg * Math.PI) / 180;
  
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
  
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const km = R * c;
  
    const nauticalMiles = km * 0.539957;
    console.log('calculateDistance result:', nauticalMiles);
    return nauticalMiles;
  }
  