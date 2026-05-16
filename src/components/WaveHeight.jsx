import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../context/WebSocketContext';

export default function WaveHeight({ nightMode = false }) {
  const { liveData } = useWebSocket();
  const [waveHistory, setWaveHistory] = useState([]);
  const canvasRef = useRef(null);
  const maxHistoryLength = 100;

  useEffect(() => {
    const interval = setInterval(() => {
      const currentHeight = liveData.getWaveHeight();
      if (currentHeight !== null) {
        setWaveHistory(prev => {
          const newHistory = [...prev, { height: currentHeight, time: Date.now() }];
          if (newHistory.length > maxHistoryLength) {
            return newHistory.slice(-maxHistoryLength);
          }
          return newHistory;
        });
      }
    }, 100); // Update every 100ms for smooth animation

    return () => clearInterval(interval);
  }, [liveData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveHistory.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find min/max for scaling
    const heights = waveHistory.map(h => h.height);
    const minHeight = Math.min(...heights);
    const maxHeight = Math.max(...heights);
    const range = maxHeight - minHeight || 1;

    // Draw waveform
    ctx.strokeStyle = nightMode ? '#60a5fa' : '#2563eb';
    ctx.lineWidth = 2;
    ctx.beginPath();

    waveHistory.forEach((point, index) => {
      const x = (index / (maxHistoryLength - 1)) * width;
      const y = height - ((point.height - minHeight) / range) * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw center line
    ctx.strokeStyle = nightMode ? '#374151' : '#9ca3af';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

  }, [waveHistory, nightMode]);

  const currentHeight = liveData.getWaveHeight();
  const avgHeight = liveData.getAvgWaveHeight();
  const maxHeight = liveData.getMaxWaveHeight();
  const wavePeriod = liveData.getWavePeriod();
  const waveCount = liveData.getWaveCount();

  return (
    <div className={`bg-zinc-800 rounded-lg p-4 ${nightMode ? 'text-white' : 'text-gray-900'}`}>
      <h3 className="text-xl font-bold mb-4">Wave Height</h3>

      {/* Waveform Chart */}
      <div className="mb-4">
        <canvas
          ref={canvasRef}
          width={300}
          height={100}
          className="w-full h-24 bg-zinc-900 rounded-lg"
        />
      </div>

      {/* Wave Statistics */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">
            {currentHeight !== null ? `${currentHeight.toFixed(2)}m` : '—'}
          </div>
          <div className="text-zinc-400">Current</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">
            {avgHeight !== null ? `${avgHeight.toFixed(2)}m` : '—'}
          </div>
          <div className="text-zinc-400">Average</div>
        </div>

        <div className="text-center">
          <div className="text-xl font-bold text-red-400">
            {maxHeight !== null ? `${maxHeight.toFixed(2)}m` : '—'}
          </div>
          <div className="text-zinc-400">Maximum</div>
        </div>

        <div className="text-center">
          <div className="text-xl font-bold text-yellow-400">
            {wavePeriod !== null ? `${wavePeriod.toFixed(1)}s` : '—'}
          </div>
          <div className="text-zinc-400">Period</div>
        </div>
      </div>

      {/* Wave Count */}
      <div className="mt-4 text-center">
        <div className="text-lg font-semibold text-purple-400">
          {waveCount !== null ? waveCount : '0'} waves detected
        </div>
      </div>
    </div>
  );
}
