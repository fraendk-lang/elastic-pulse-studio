import React from 'react';
import { 
  Activity as Pulse, RotateCcw, RefreshCw, Video, Download, Upload, 
  Maximize2, Binary, FolderOpen, HelpCircle, Layers, X
} from 'lucide-react';
import type { OverlayType } from '../types';

interface SequencerHeaderProps {
  playhead: number;
  isPlaying: boolean;
  isExporting: boolean;
  overlayMode: OverlayType;
  canUndo: boolean;
  canRedo: boolean;
  onExit: () => void;
  onPlayPause: () => void;
  onReset: () => void;
  onExport: () => void;
  onSaveProject: () => void;
  onLoadProject: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCycleOverlay: () => void;
  onZenMode: () => void;
  audioRef: React.RefObject<HTMLAudioElement>;
  analyzerRef: React.RefObject<AnalyserNode | null>;
  initAudio: () => Promise<void>;
  setPlayhead: (value: number | ((prev: number) => number)) => void;
  setIsPlaying: (value: boolean | ((prev: boolean) => boolean)) => void;
  logoHold?: boolean;
  onLogoHold?: () => void;
}

export const SequencerHeader: React.FC<SequencerHeaderProps> = ({
  playhead,
  isPlaying,
  isExporting,
  overlayMode,
  canUndo,
  canRedo,
  onExit,
  onPlayPause,
  onReset,
  onExport,
  onSaveProject,
  onLoadProject,
  onUndo,
  onRedo,
  onCycleOverlay,
  onZenMode,
  onPresets,
  onHelp,
  audioRef,
  analyzerRef,
  initAudio,
  setPlayhead,
  setIsPlaying,
  logoHold = false,
  onLogoHold,
}) => {
  const handleReset = () => {
    setPlayhead(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
    setIsPlaying(false);
    onReset();
  };

  const handlePlayPause = () => {
    // Only call the parent handler - don't change state here
    onPlayPause();
  };

  return (
    <header className="flex justify-between items-center bg-[#1a1a1a] p-2.5 px-6 rounded-xl border border-white/5 shrink-0 z-50 relative overflow-hidden shadow-2xl">
      <div className="flex items-center gap-4 cursor-pointer group" onClick={onExit}>
        <div className="p-2 bg-[#ffdc5e]/10 rounded-lg group-hover:bg-[#ffdc5e]/20 transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(255,220,94,0.4)]">
          <Pulse className="text-[#ffdc5e] group-hover:animate-pulse" size={22}/>
        </div>
        <h2 className="font-black tracking-tighter text-sm text-slate-100 uppercase group-hover:text-[#ffdc5e] transition-colors duration-300">EP_STUDIO_V32_11</h2>
      </div>
      <div className="flex items-center gap-5 bg-[#0a0a0a] px-6 py-2 rounded-full border border-white/5 shadow-inner">
        <button 
          onClick={handleReset} 
          className="p-1.5 text-slate-500 hover:text-white transition-all duration-300 hover:rotate-[-90deg] hover:scale-110 active:scale-95"
          title="Reset Playhead"
        >
          <RotateCcw size={14}/>
        </button>
        <button 
          onClick={handlePlayPause} 
          className={`px-8 py-2 rounded-full text-[11px] font-black uppercase transition-all duration-300 transform ${isPlaying ? 'bg-[#ffdc5e] text-black shadow-[0_0_25px_#ffdc5e99] scale-105' : 'bg-[#2a2a2a] text-white hover:bg-[#333] hover:scale-105'} active:scale-95`}
        >
          {isPlaying ? 'Stop' : 'Play'}
        </button>
        <div className="font-mono font-bold text-2xl text-[#ffdc5e] min-w-[120px] text-center drop-shadow-[0_0_10px_#ffdc5e44]">
          {playhead.toFixed(2)}s
        </div>
      </div>
      <div className="flex gap-3">
        <button 
          onClick={onCycleOverlay} 
          className={`p-3 rounded-xl transition-all duration-300 transform ${overlayMode !== 'none' ? 'bg-[#ffdc5e] text-black shadow-[0_0_15px_#ffdc5e99] scale-105' : 'bg-[#2a2a2a] text-slate-400 hover:text-white hover:bg-[#333]'} hover:scale-110 active:scale-95`} 
          title="Cycle Neural Overlay Mode"
        >
          <Binary size={18}/>
        </button>
        {onPresets && (
          <button 
            onClick={onPresets} 
            className="p-3 bg-[#2a2a2a] rounded-xl text-slate-400 hover:text-white transition-all duration-300 hover:scale-110 hover:bg-[#333] active:scale-95 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)]" 
            title="Presets Manager"
          >
            <FolderOpen size={18}/>
          </button>
        )}
        <button 
          onClick={onExport} 
          disabled={isExporting} 
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] transition-all duration-300 border bg-[#2a2a2a] border-white/10 text-slate-200 hover:bg-[#333] hover:border-white/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100" 
          title="Export Video/Frame (Cmd+E)"
        >
          {isExporting ? <RefreshCw size={16} className="animate-spin"/> : <Video size={16} className="transition-transform group-hover:scale-110"/>} 
          {isExporting ? 'Exporting...' : 'Render'}
        </button>
        <button 
          onClick={onSaveProject} 
          className="p-3 bg-[#2a2a2a] rounded-xl text-slate-400 hover:text-white transition-all duration-300 hover:scale-110 hover:bg-[#333] active:scale-95 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)]" 
          title="Save Project (Cmd+S)"
        >
          <Download size={18}/>
        </button>
        <button 
          onClick={onLoadProject} 
          className="p-3 bg-[#2a2a2a] rounded-xl text-slate-400 hover:text-white transition-all duration-300 hover:scale-110 hover:bg-[#333] active:scale-95 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)]" 
          title="Load Project (Cmd+O)"
        >
          <Upload size={18}/>
        </button>
        <button 
          onClick={onUndo} 
          disabled={!canUndo} 
          className="p-3 bg-[#2a2a2a] rounded-xl text-slate-400 hover:text-white transition-all duration-300 hover:scale-110 hover:bg-[#333] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-[#2a2a2a]" 
          title="Undo (Cmd+Z)"
        >
          <RotateCcw size={18}/>
        </button>
        <button 
          onClick={onRedo} 
          disabled={!canRedo} 
          className="p-3 bg-[#2a2a2a] rounded-xl text-slate-400 hover:text-white transition-all duration-300 hover:scale-110 hover:bg-[#333] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-[#2a2a2a]" 
          title="Redo (Cmd+Shift+Z)"
        >
          <RotateCcw size={18} className="rotate-180"/>
        </button>
        <button 
          onClick={onZenMode} 
          className="p-3 bg-[#2a2a2a] rounded-xl text-slate-400 hover:text-white transition-all duration-300 hover:scale-110 hover:bg-[#333] active:scale-95 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)]" 
          title="Zen Mode"
        >
          <Maximize2 size={18}/>
        </button>
        {onHelp && (
          <button 
            onClick={onHelp} 
            className="p-3 bg-[#2a2a2a] rounded-xl text-slate-400 hover:text-white transition-all duration-300 hover:scale-110 hover:bg-[#333] active:scale-95 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)]" 
            title="Keyboard Shortcuts (?)"
          >
            <HelpCircle size={18}/>
          </button>
        )}
        {onLogoHold && (
          <button 
            onClick={onLogoHold} 
            className={`p-3 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 ${
              logoHold 
                ? 'bg-[#ffdc5e] text-black shadow-[0_0_15px_#ffdc5e99]' 
                : 'bg-[#2a2a2a] text-slate-400 hover:text-white hover:bg-[#333]'
            }`}
            title={logoHold ? "Logo freigeben" : "Logo halten"}
          >
            {logoHold ? <X size={18}/> : <Layers size={18}/>}
          </button>
        )}
      </div>
    </header>
  );
};

