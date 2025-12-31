import React, { useRef } from 'react';
import type { MasterFX } from '../types';

interface MasterXYPadProps {
  fx: MasterFX;
  onChange: (v: { x: number; y: number }) => void;
}

export const MasterXYPad: React.FC<MasterXYPadProps> = ({ fx, onChange }) => {
  const padRef = useRef<HTMLDivElement>(null);
  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    onChange({ x, y });
  };
  return (
    <div ref={padRef} onMouseMove={(e) => e.buttons === 1 && handleMove(e)} onMouseDown={handleMove} className="w-full aspect-square bg-[#080808] rounded-3xl border border-white/10 relative overflow-hidden cursor-crosshair shadow-2xl group transition-all ring-1 ring-white/5 mb-4">
       <div className="absolute inset-0 opacity-10 pointer-events-none"><div className="absolute inset-y-0 left-1/2 w-[1px] bg-white" /><div className="absolute inset-x-0 top-1/2 h-[1px] bg-white" /></div>
       <div className="absolute w-7 h-7 -ml-3.5 -mt-3.5 bg-[#ffdc5e] rounded-sm border-2 border-black pointer-events-none shadow-[0_0_35px_#ffdc5e] transition-all group-active:scale-125" style={{ left: `${(fx.feedback/20)*100}%`, top: `${(1-fx.bloom/1.5)*100}%`, transform: 'rotate(45deg)' }} />
    </div>
  );
};

