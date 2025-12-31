import React, { useState, useEffect } from 'react';
import type { OverlayType, AudioTieBand } from '../types';

interface TextModeOverlayProps {
  analysis: Record<AudioTieBand, number>;
  isZen: boolean;
  mode: OverlayType;
}

export const TextModeOverlay: React.FC<TextModeOverlayProps> = ({ analysis, isZen, mode }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const bands = ['sub', 'bass', 'lowMid', 'mid', 'highMid', 'treble', 'presence'];

  useEffect(() => {
    if (mode === 'none') return;
    const interval = setInterval(() => {
      const peak = Object.values(analysis).some((v: any) => v > 0.8);
      if (peak || ['glitch', 'hacker', 'topology'].includes(mode)) {
        const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
        const randomHex = Math.random().toString(16).slice(2, 10).toUpperCase();
        const messages = {
          glitch: `ERR_CORE_OFFSET: 0x${randomHex}`,
          radar: `OBJ_TRK_LOCKED: SIG_${randomHex.slice(0,4)}`,
          hacker: `SUDO_INJECT: STACK_0x${randomHex}`,
          topology: `ISO_CURVE_CALC: NODE_${randomHex.slice(0,2)}`,
          circuit: `GATE_PULSE: TRANS_${randomHex.slice(0,4)}`,
          stars: `NAV_FIX: AZIMUTH_${Math.floor(Math.random()*360)}`,
          default: `SIGNAL_PEAK_DETECTED: 0x${randomHex}`
        };
        const msg = (messages as any)[mode] || messages.default;
        setLogs(prev => [`[${timestamp}] ${msg}`, ...prev].slice(0, 15));
      }
    }, mode === 'hacker' ? 80 : 150);
    return () => clearInterval(interval);
  }, [analysis, mode]);

  const themeColor = {
    terminal: '#ffdc5e',
    matrix: '#22c55e',
    blueprint: '#06b6d4',
    radar: '#10b981',
    glitch: '#f43f5e',
    hacker: '#f97316',
    topology: '#a855f7',
    circuit: '#94a3b8',
    stars: '#ffffff'
  }[mode as keyof typeof themeColor] || '#ffdc5e';

  return (
    <div className={`absolute inset-0 pointer-events-none flex flex-col font-mono text-[10px] z-30 mix-blend-screen p-6 overflow-hidden transition-all duration-500`} style={{ color: `${themeColor}aa`, filter: mode === 'hacker' ? 'contrast(1.2) brightness(1.1)' : 'none' }}>
      
      {/* Dynamic Backgrounds */}
      {mode === 'blueprint' && (
        <div className="absolute inset-0 opacity-10" style={{ background: `linear-gradient(${themeColor} 1px, transparent 1px) 0 0 / 40px 40px, linear-gradient(90deg, ${themeColor} 1px, transparent 1px) 0 0 / 40px 40px` }} />
      )}
      {mode === 'matrix' && (
        <div className="absolute inset-0 bg-black/10">
           <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 255, 255, 0.06))`, backgroundSize: '100% 2px, 3px 100%' }} />
        </div>
      )}
      {mode === 'radar' && (
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
           <div className="w-[80vw] h-[80vw] border-2 rounded-full flex items-center justify-center" style={{ borderColor: themeColor }}>
              <div className="w-[60vw] h-[60vw] border rounded-full flex items-center justify-center" style={{ borderColor: themeColor }}>
                <div className="w-[40vw] h-[40vw] border rounded-full" style={{ borderColor: themeColor }} />
              </div>
              <div className="absolute w-full h-1" style={{ background: `linear-gradient(90deg, transparent, ${themeColor})`, transformOrigin: 'center', animation: 'spin 4s linear infinite' }} />
           </div>
        </div>
      )}
      {mode === 'hacker' && (
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{ background: `repeating-linear-gradient(0deg, transparent 0px, rgba(0,0,0,0.5) 1px, transparent 2px)` }} />
      )}
      {mode === 'topology' && (
        <div className="absolute inset-0 opacity-10" style={{ background: `repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 40px, ${themeColor} 41px, transparent 42px)` }} />
      )}
      {mode === 'circuit' && (
        <div className="absolute inset-0 opacity-10" style={{ background: `linear-gradient(90deg, ${themeColor} 1px, transparent 1px) 0 0 / 100px 100px, linear-gradient(${themeColor} 1px, transparent 1px) 0 0 / 100px 100px, radial-gradient(${themeColor} 2px, transparent 2px) 50px 50px / 100px 100px` }} />
      )}
      {mode === 'stars' && (
        <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(1px 1px at 20px 30px, white, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 40px 70px, white, rgba(0,0,0,0)), radial-gradient(1px 1px at 50px 160px, white, rgba(0,0,0,0)), radial-gradient(1px 1px at 90px 40px, white, rgba(0,0,0,0)), radial-gradient(2px 2px at 130px 80px, white, rgba(0,0,0,0)), radial-gradient(1px 1px at 160px 120px, white, rgba(0,0,0,0))`, backgroundSize: '200px 200px' }} />
      )}

      {/* Header Info */}
      <div className={`flex justify-between w-full opacity-60 ${mode === 'glitch' ? 'animate-pulse' : ''}`}>
        <div className="flex flex-col gap-1">
          <span className="font-black">MODE_SELECTION: {mode.toUpperCase()}</span>
          <span>SIGNAL_ORIGIN: TITAN_CORE_V32</span>
          <span>SYNC_CLOCK: {performance.now().toFixed(0)}MS</span>
          <span>MODULATION_ID: {Math.random().toString(36).slice(2, 8).toUpperCase()}</span>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} /> LIVE_STREAM_ACTIVE</span>
          <span>LATENCY: 1.2MS</span>
          <span>BITRATE: 4096KBPS</span>
        </div>
      </div>
      
      {/* Central Data Stream */}
      <div className={`flex-grow flex justify-center items-center opacity-30 overflow-hidden ${mode === 'glitch' ? 'translate-x-[-2px] skew-x-1' : ''}`}>
        <div className="grid grid-cols-12 gap-10 whitespace-pre leading-none text-[8px]">
          {Array.from({ length: isZen ? 40 : 20 }).map((_, i) => (
            <div key={i} className="flex flex-col animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
              {Array.from({ length: 15 }).map((_, j) => {
                let char = '1';
                if (mode === 'matrix') char = String.fromCharCode(0x30A0 + Math.random() * 96);
                else if (mode === 'hacker') char = Math.random() > 0.5 ? '0' : 'X';
                else if (mode === 'glitch') char = String.fromCharCode(33 + Math.random() * 94);
                else if (mode === 'circuit') char = Math.random() > 0.8 ? '┼' : (Math.random() > 0.5 ? '─' : '│');
                else char = Math.random() > 0.5 ? '1' : '0';
                return <span key={j}>{char}</span>;
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Bars & Logs */}
      <div className="flex gap-10 h-32 items-end relative z-40">
        <div className="flex-grow space-y-1 overflow-hidden">
          {logs.map((log, i) => (
            <div key={i} className={`truncate opacity-80 transition-transform ${mode === 'glitch' && Math.random() > 0.8 ? 'translate-x-4' : ''}`} style={{ opacity: 1 - i * 0.07, transform: `translateX(${i * 2}px)` }}>{log}</div>
          ))}
        </div>
        <div className="w-64 space-y-2 opacity-80 shrink-0">
          {bands.map(b => (
            <div key={b} className="flex gap-3 items-center">
              <span className="w-16 uppercase text-[8px] tracking-tighter opacity-60">{b}</span>
              <div className="flex-grow flex gap-0.5">
                {Array.from({ length: 20 }).map((_, i) => (
                  <span key={i} className="transition-all duration-75" style={{ color: i < analysis[b as AudioTieBand] * 20 ? themeColor : 'rgba(255,255,255,0.05)' }}>
                    {mode === 'blueprint' ? '■' : (mode === 'radar' ? '●' : (mode === 'stars' ? '*' : '|'))}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.1)_100%)]" />
      
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

