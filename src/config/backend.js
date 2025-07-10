// Backend configuration that works across different environments
// This handles cases where the frontend runs on a different device than the backend

// Get the current hostname (works for both local and remote access)
const currentHostname = window.location.hostname;

// Determine the backend URL
// If we're accessing the frontend via IP, use the same IP for backend
// If we're accessing via localhost, use localhost for backend
// If we're accessing via hostname, use the same hostname for backend
const getBackendUrl = () => {
  // If accessing via localhost, use localhost for backend
  if (currentHostname === 'localhost' || currentHostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  
  // If accessing via IP address, use the same IP for backend
  if (currentHostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    return `http://${currentHostname}:3001`;
  }
  
  // If accessing via hostname, use the same hostname for backend
  return `http://${currentHostname}:3001`;
};

export const BACKEND_URL = getBackendUrl();

// Log the backend URL for debugging
console.log(`🔗 Backend URL configured as: ${BACKEND_URL}`);
console.log(`🌐 Current hostname: ${currentHostname}`);

export default BACKEND_URL; 