import React, { useState, useEffect, useRef } from 'react';
import { Activity, X } from 'lucide-react';

interface PerformanceMonitorProps {
  isVisible: boolean;
  onToggle: () => void;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  isVisible,
  onToggle,
}) => {
  const [fps, setFps] = useState(0);
  const [frameTime, setFrameTime] = useState(0);
  const [memory, setMemory] = useState<{ used: number; total: number } | null>(null);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const frameTimesRef = useRef<number[]>([]);

  useEffect(() => {
    if (!isVisible) return;

    let rafId: number;
    const measure = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
      setFrameTime(avgFrameTime);
      setFps(Math.round(1000 / avgFrameTime));

      // Memory info (if available)
      if ('memory' in performance) {
        const mem = (performance as any).memory;
        setMemory({
          used: Math.round(mem.usedJSHeapSize / 1048576),
          total: Math.round(mem.totalJSHeapSize / 1048576),
        });
      }

      frameCountRef.current++;
      rafId = requestAnimationFrame(measure);
    };

    rafId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafId);
  }, [isVisible]);

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all hover:scale-105 z-50 shadow-lg"
        title="Show Performance Monitor"
      >
        <Activity size={18} />
      </button>
    );
  }

  const fpsColor = fps >= 55 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400';
  const frameTimeColor = frameTime < 20 ? 'text-green-400' : frameTime < 33 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="fixed bottom-4 right-4 bg-[#1a1a1a] border border-white/10 rounded-xl p-4 shadow-2xl z-50 min-w-[200px] animate-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-black uppercase text-[#ffdc5e] flex items-center gap-2">
          <Activity size={14} />
          Performance
        </h4>
        <button
          onClick={onToggle}
          className="p-1 text-slate-500 hover:text-white transition-all"
        >
          <X size={14} />
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">FPS</span>
          <span className={`text-sm font-mono font-black ${fpsColor}`}>
            {fps}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Frame Time</span>
          <span className={`text-sm font-mono font-black ${frameTimeColor}`}>
            {frameTime.toFixed(1)}ms
          </span>
        </div>
        {memory && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Memory</span>
            <span className="text-sm font-mono font-black text-slate-300">
              {memory.used}MB / {memory.total}MB
            </span>
          </div>
        )}
        <div className="pt-2 border-t border-white/5">
          <div className="h-1 bg-[#0a0a0a] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                fps >= 55 ? 'bg-green-500' : fps >= 30 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, (fps / 60) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

