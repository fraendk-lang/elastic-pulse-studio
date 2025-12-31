import React from 'react';
import { Diamond } from 'lucide-react';

interface ControlSliderProps {
  label: string;
  val: number;
  max?: number;
  onChange: (v: number) => void;
  onKeyframe?: () => void;
}

export const ControlSlider: React.FC<ControlSliderProps> = ({ label, val, max = 1, onChange, onKeyframe }) => (
  <div className="space-y-2.5 group">
    <div className="flex justify-between text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] transition-colors group-hover:text-slate-300">
       <span>{label}</span>
       <div className="flex items-center gap-4">
          {onKeyframe && <button onClick={onKeyframe} className="p-1 text-slate-800 hover:text-[#ffdc5e] transition-all hover:scale-150"><Diamond size={10}/></button>}
          <span className="text-[#ffdc5e] font-mono font-bold tracking-tight">{val.toFixed(2)}</span>
       </div>
    </div>
    <div className="h-6 w-full bg-[#0a0a0a] rounded-xl border border-white/5 relative overflow-hidden shadow-inner ring-1 ring-white/[0.02]">
      <div className="h-full bg-gradient-to-r from-[#ffdc5e]/30 via-[#ffdc5e]/60 to-[#ffdc5e]/90 transition-all shadow-[0_0_20px_rgba(255,220,94,0.4)]" style={{ width: `${(val / max) * 100}%` }} />
      <input type="range" min="0" max={max} step="0.01" value={val} onChange={e => onChange(parseFloat(e.target.value))} className="absolute inset-0 w-full opacity-0 cursor-pointer" />
    </div>
  </div>
);

