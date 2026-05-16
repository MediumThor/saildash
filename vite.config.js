// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // ✅ Keeps it accessible across your network (e.g., pi5.local)
    port: 5173,
    allowedHosts: ['.ngrok-free.app', 'pi5.local'], // ✅ Combined allowed hosts

    watch: {
      ignored: [path.resolve(__dirname, 'public/charts/**')],
    },
    
  },
  build: {
    rollupOptions: {
      external: ['/charts/**']
    }
  }
});
