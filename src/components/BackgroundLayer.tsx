import React, { useEffect, useRef } from 'react';
import type { BackgroundType } from '../types';

interface BackgroundLayerProps {
  type: BackgroundType;
  time: number;
  width: number;
  height: number;
}

export const BackgroundLayer: React.FC<BackgroundLayerProps> = ({ type, time, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || type === 'none') {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const draw = () => {
      if (!canvas || !ctx) return;
      
      // Get container size
      const container = canvas.parentElement;
      let w = width || 1920;
      let h = height || 1080;
      
      if (container) {
        const rect = container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          w = rect.width;
          h = rect.height;
        }
      }
      
      // Set canvas size
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      
      if (w === 0 || h === 0) return;
      
      ctx.clearRect(0, 0, w, h);

      switch (type) {
        case 'gradient': {
          const gradient = ctx.createLinearGradient(0, 0, w, h);
          const hue = (time * 50) % 360;
          gradient.addColorStop(0, `hsl(${hue}, 70%, 40%)`);
          gradient.addColorStop(1, `hsl(${(hue + 60) % 360}, 70%, 30%)`);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, w, h);
          break;
        }

        case 'noise': {
          const imageData = ctx.createImageData(w, h);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const noise = Math.random() * 0.2;
            data[i] = noise * 255;
            data[i + 1] = noise * 255;
            data[i + 2] = noise * 255;
            data[i + 3] = 255;
          }
          ctx.putImageData(imageData, 0, 0);
          break;
        }

        case 'grid': {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1;
          const gridSize = 50;
          const offsetX = (time * 10) % gridSize;
          const offsetY = (time * 10) % gridSize;
          for (let x = -offsetX; x < w; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
          }
          for (let y = -offsetY; y < h; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }
          break;
        }

        case 'particles': {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = 'rgba(255, 220, 94, 0.7)';
          const particleCount = 50;
          for (let i = 0; i < particleCount; i++) {
            const x = (w * 0.5 + Math.sin(time + i) * w * 0.3 + (time * 20 + i * 10) % w) % w;
            const y = (h * 0.5 + Math.cos(time * 0.7 + i) * h * 0.3 + (time * 15 + i * 7) % h) % h;
            ctx.beginPath();
            ctx.arc(x, y, 3 + Math.sin(time + i) * 2, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case 'waves': {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = 'rgba(255, 220, 94, 0.5)';
          ctx.lineWidth = 2;
          for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            const amplitude = 30 + i * 10;
            const frequency = 0.01 + i * 0.005;
            for (let x = 0; x < w; x += 2) {
              const y = h / 2 + Math.sin(x * frequency + time * 2 + i) * amplitude;
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
          break;
        }

        case 'ken-burns-1': {
          const scale = 1 + (time % 10) * 0.02;
          const panX = (time % 10) * w * 0.05;
          const panY = (time % 10) * h * 0.03;
          
          ctx.save();
          ctx.translate(w / 2, h / 2);
          ctx.scale(scale, scale);
          ctx.translate(-w / 2 + panX, -h / 2 + panY);
          
          const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w);
          gradient.addColorStop(0, `hsl(${(time * 20) % 360}, 70%, 30%)`);
          gradient.addColorStop(1, `hsl(${(time * 20 + 60) % 360}, 70%, 15%)`);
          ctx.fillStyle = gradient;
          ctx.fillRect(-w, -h, w * 3, h * 3);
          
          ctx.fillStyle = `rgba(255, 220, 94, ${0.2 + Math.sin(time) * 0.1})`;
          ctx.beginPath();
          ctx.arc(w * 0.3, h * 0.3, 100 + Math.sin(time) * 20, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
          break;
        }

        case 'ken-burns-2': {
          const scale = 1.2 + Math.sin(time * 0.5) * 0.1;
          const panX = Math.sin(time * 0.3) * w * 0.2;
          const panY = Math.cos(time * 0.3) * h * 0.2;
          
          ctx.save();
          ctx.translate(w / 2, h / 2);
          ctx.scale(scale, scale);
          ctx.rotate(time * 0.1);
          ctx.translate(-w / 2 + panX, -h / 2 + panY);
          
          const gradient = ctx.createLinearGradient(0, 0, w, h);
          gradient.addColorStop(0, `hsl(${(time * 30) % 360}, 60%, 25%)`);
          gradient.addColorStop(0.5, `hsl(${(time * 30 + 120) % 360}, 60%, 15%)`);
          gradient.addColorStop(1, `hsl(${(time * 30 + 240) % 360}, 60%, 25%)`);
          ctx.fillStyle = gradient;
          ctx.fillRect(-w, -h, w * 3, h * 3);
          
          ctx.strokeStyle = `rgba(255, 220, 94, ${0.3 + Math.sin(time * 2) * 0.1})`;
          ctx.lineWidth = 3;
          for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            const angle = (Math.PI * 2 / 6) * i + time;
            const x = w / 2 + Math.cos(angle) * 150;
            const y = h / 2 + Math.sin(angle) * 150;
            ctx.moveTo(w / 2, h / 2);
            ctx.lineTo(x, y);
            ctx.stroke();
          }
          
          ctx.restore();
          break;
        }

        case 'ken-burns-3': {
          const scale = 1 + (time % 8) * 0.03;
          const panX = Math.cos(time * 0.4) * w * 0.15;
          const panY = Math.sin(time * 0.4) * h * 0.15;
          
          ctx.save();
          ctx.translate(w / 2, h / 2);
          ctx.scale(scale, scale);
          ctx.translate(-w / 2 + panX, -h / 2 + panY);
          
          const baseHue = (time * 15) % 360;
          const gradient = ctx.createRadialGradient(w * 0.7, h * 0.3, 0, w * 0.7, h * 0.3, w * 1.5);
          gradient.addColorStop(0, `hsla(${baseHue}, 80%, 35%, 0.9)`);
          gradient.addColorStop(1, `hsla(${(baseHue + 180) % 360}, 80%, 15%, 0.9)`);
          ctx.fillStyle = gradient;
          ctx.fillRect(-w, -h, w * 3, h * 3);
          
          ctx.fillStyle = `rgba(255, 220, 94, 0.6)`;
          for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 / 30) * i + time;
            const radius = 80 + Math.sin(time * 2 + i) * 30;
            const x = w * 0.7 + Math.cos(angle) * radius;
            const y = h * 0.3 + Math.sin(angle) * radius;
            ctx.beginPath();
            ctx.arc(x, y, 3 + Math.sin(time + i) * 2, 0, Math.PI * 2);
            ctx.fill();
          }
          
          ctx.restore();
          break;
        }
      }
    };

    draw();
    
    const animate = () => {
      draw();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [type, time, width, height]);

  if (type === 'none') return null;

  return (
    <div 
      className="absolute inset-0 w-full h-full pointer-events-none" 
      style={{ 
        zIndex: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ 
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
};
