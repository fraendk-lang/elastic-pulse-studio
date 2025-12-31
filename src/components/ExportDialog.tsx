import React, { useState } from 'react';
import { X, Download, Video, Image, Settings } from 'lucide-react';

export type ExportPreset = 'high' | 'medium' | 'low' | 'custom';
export type ExportFormat = 'video' | 'frame' | 'mp4';

export interface ExportSettings {
  format: ExportFormat;
  preset: ExportPreset;
  fps: number;
  quality: number;
  resolution: { width: number; height: number };
  bitrate: number;
}

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (settings: ExportSettings) => void;
  isExporting: boolean;
  progress: number;
  currentFrame?: number;
  totalFrames?: number;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  onExport,
  isExporting,
  progress,
  currentFrame,
  totalFrames,
}) => {
  const [settings, setSettings] = useState<ExportSettings>({
    format: 'mp4',
    preset: 'high',
    fps: 30,
    quality: 0.9,
    resolution: { width: 1920, height: 1080 },
    bitrate: 8000000,
  });

  const presets = {
    high: { fps: 60, quality: 0.95, bitrate: 12000000, resolution: { width: 1920, height: 1080 } },
    medium: { fps: 30, quality: 0.85, bitrate: 6000000, resolution: { width: 1280, height: 720 } },
    low: { fps: 24, quality: 0.7, bitrate: 3000000, resolution: { width: 854, height: 480 } },
  };

  const applyPreset = (preset: ExportPreset) => {
    if (preset === 'custom') return;
    const presetData = presets[preset];
    setSettings(s => ({
      ...s,
      preset,
      ...presetData,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black uppercase text-[#ffdc5e] flex items-center gap-3">
            <Video size={20} />
            Export Settings
          </h3>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-2 text-slate-500 hover:text-white transition-all disabled:opacity-30"
          >
            <X size={20} />
          </button>
        </div>

        {isExporting ? (
          <div className="space-y-4">
            <div className="bg-[#0a0a0a] p-6 rounded-xl border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-black uppercase text-slate-400">Export Progress</span>
                <span className="text-sm font-mono text-[#ffdc5e]">
                  {currentFrame !== undefined && totalFrames !== undefined
                    ? `${currentFrame}/${totalFrames} frames`
                    : `${Math.round(progress)}%`}
                </span>
              </div>
              <div className="w-full h-3 bg-[#0a0a0a] rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-[#ffdc5e] to-[#f59e0b] transition-all duration-300 shadow-[0_0_20px_#ffdc5e44]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="text-center text-sm text-slate-400 font-mono">
              {settings.format === 'frame' ? 'Capturing frame...' : `Rendering ${settings.format.toUpperCase()}...`}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Format Selection */}
            <div>
              <label className="text-xs font-black uppercase text-slate-500 mb-3 block">Export Format</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setSettings(s => ({ ...s, format: 'video' }))}
                  className={`p-4 rounded-xl border transition-all flex items-center gap-3 ${
                    settings.format === 'video'
                      ? 'bg-[#ffdc5e]/10 border-[#ffdc5e] text-[#ffdc5e]'
                      : 'bg-[#0a0a0a] border-white/5 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <Video size={20} />
                  <span className="text-sm font-black uppercase">WebM</span>
                </button>
                <button
                  onClick={() => setSettings(s => ({ ...s, format: 'mp4' }))}
                  className={`p-4 rounded-xl border transition-all flex items-center gap-3 ${
                    settings.format === 'mp4'
                      ? 'bg-[#ffdc5e]/10 border-[#ffdc5e] text-[#ffdc5e]'
                      : 'bg-[#0a0a0a] border-white/5 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <Video size={20} />
                  <span className="text-sm font-black uppercase">MP4</span>
                </button>
                <button
                  onClick={() => setSettings(s => ({ ...s, format: 'frame' }))}
                  className={`p-4 rounded-xl border transition-all flex items-center gap-3 ${
                    settings.format === 'frame'
                      ? 'bg-[#ffdc5e]/10 border-[#ffdc5e] text-[#ffdc5e]'
                      : 'bg-[#0a0a0a] border-white/5 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <Image size={20} />
                  <span className="text-sm font-black uppercase">Frame</span>
                </button>
              </div>
            </div>

            {(settings.format === 'video' || settings.format === 'mp4') && (
              <>
                {/* Presets */}
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 mb-3 block">Quality Preset</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['high', 'medium', 'low', 'custom'] as ExportPreset[]).map(preset => (
                      <button
                        key={preset}
                        onClick={() => applyPreset(preset)}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all border ${
                          settings.preset === preset
                            ? 'bg-[#ffdc5e] border-[#ffdc5e] text-black'
                            : 'bg-[#0a0a0a] border-white/5 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Advanced Settings */}
                {settings.preset === 'custom' && (
                  <div className="space-y-4 bg-[#0a0a0a] p-4 rounded-xl border border-white/5">
                    <div>
                      <label className="text-xs font-black uppercase text-slate-500 mb-2 block">
                        FPS: {settings.fps}
                      </label>
                      <input
                        type="range"
                        min="24"
                        max="60"
                        step="1"
                        value={settings.fps}
                        onChange={e => setSettings(s => ({ ...s, fps: parseInt(e.target.value) }))}
                        className="w-full accent-[#ffdc5e]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase text-slate-500 mb-2 block">
                        Bitrate: {settings.bitrate / 1000000}Mbps
                      </label>
                      <input
                        type="range"
                        min="2000000"
                        max="20000000"
                        step="1000000"
                        value={settings.bitrate}
                        onChange={e => setSettings(s => ({ ...s, bitrate: parseInt(e.target.value) }))}
                        className="w-full accent-[#ffdc5e]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-black uppercase text-slate-500 mb-2 block">Width</label>
                        <input
                          type="number"
                          value={settings.resolution.width}
                          onChange={e =>
                            setSettings(s => ({
                              ...s,
                              resolution: { ...s.resolution, width: parseInt(e.target.value) },
                            }))
                          }
                          className="w-full bg-[#1a1a1a] border border-white/5 p-2 rounded-lg text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-black uppercase text-slate-500 mb-2 block">Height</label>
                        <input
                          type="number"
                          value={settings.resolution.height}
                          onChange={e =>
                            setSettings(s => ({
                              ...s,
                              resolution: { ...s.resolution, height: parseInt(e.target.value) },
                            }))
                          }
                          className="w-full bg-[#1a1a1a] border border-white/5 p-2 rounded-lg text-sm text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Export Button */}
            <div className="flex gap-3 pt-4 border-t border-white/5">
              <button
                onClick={onClose}
                disabled={isExporting}
                className="flex-1 px-6 py-3 bg-[#0a0a0a] border border-white/5 rounded-xl text-sm font-black uppercase text-slate-400 hover:text-white transition-all disabled:opacity-30"
              >
                Cancel
              </button>
              <button
                onClick={() => onExport(settings)}
                disabled={isExporting}
                className="flex-1 px-6 py-3 bg-[#ffdc5e] text-black rounded-xl text-sm font-black uppercase hover:bg-[#f59e0b] transition-all flex items-center justify-center gap-2 disabled:opacity-30"
              >
                <Download size={16} />
                Export {settings.format === 'video' ? 'Video' : 'Frame'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

