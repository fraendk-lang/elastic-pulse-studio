import React, { useState } from 'react';
import { Save, FolderOpen, Trash2, X, Plus, Download, Upload } from 'lucide-react';
import type { TimelineClip, MasterFX } from '../types';

interface ClipPreset {
  id: string;
  name: string;
  clip: Partial<TimelineClip>;
}

interface MasterFXPreset {
  id: string;
  name: string;
  fx: MasterFX;
}

interface PresetsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  activeClip: TimelineClip | null;
  masterFX: MasterFX;
  onSaveClipPreset: (preset: ClipPreset) => void;
  onLoadClipPreset: (preset: ClipPreset) => void;
  onSaveMasterPreset: (preset: MasterFXPreset) => void;
  onLoadMasterPreset: (preset: MasterFXPreset) => void;
}

export const PresetsManager: React.FC<PresetsManagerProps> = ({
  isOpen,
  onClose,
  activeClip,
  masterFX,
  onSaveClipPreset,
  onLoadClipPreset,
  onSaveMasterPreset,
  onLoadMasterPreset,
}) => {
  const [activeTab, setActiveTab] = useState<'clip' | 'master'>('clip');
  const [clipPresets, setClipPresets] = useState<ClipPreset[]>(() => {
    const saved = localStorage.getItem('ep_clip_presets');
    return saved ? JSON.parse(saved) : [];
  });
  const [masterPresets, setMasterPresets] = useState<MasterFXPreset[]>(() => {
    const saved = localStorage.getItem('ep_master_presets');
    return saved ? JSON.parse(saved) : [];
  });
  const [newPresetName, setNewPresetName] = useState('');

  const saveClipPreset = () => {
    if (!activeClip || !newPresetName.trim()) return;
    const preset: ClipPreset = {
      id: `cp-${Date.now()}`,
      name: newPresetName.trim(),
      clip: {
        params: activeClip.params,
        automation: activeClip.automation,
        lfos: activeClip.lfos,
        blendMode: activeClip.blendMode,
        audioReactive: activeClip.audioReactive,
        audioTie: activeClip.audioTie,
        opacity: activeClip.opacity,
        fadeIn: activeClip.fadeIn,
        fadeOut: activeClip.fadeOut,
      },
    };
    const updated = [...clipPresets, preset];
    setClipPresets(updated);
    localStorage.setItem('ep_clip_presets', JSON.stringify(updated));
    onSaveClipPreset(preset);
    setNewPresetName('');
  };

  const saveMasterPreset = () => {
    if (!newPresetName.trim()) return;
    const preset: MasterFXPreset = {
      id: `mp-${Date.now()}`,
      name: newPresetName.trim(),
      fx: { ...masterFX },
    };
    const updated = [...masterPresets, preset];
    setMasterPresets(updated);
    localStorage.setItem('ep_master_presets', JSON.stringify(updated));
    onSaveMasterPreset(preset);
    setNewPresetName('');
  };

  const deleteClipPreset = (id: string) => {
    const updated = clipPresets.filter(p => p.id !== id);
    setClipPresets(updated);
    localStorage.setItem('ep_clip_presets', JSON.stringify(updated));
  };

  const deleteMasterPreset = (id: string) => {
    const updated = masterPresets.filter(p => p.id !== id);
    setMasterPresets(updated);
    localStorage.setItem('ep_master_presets', JSON.stringify(updated));
  };

  const exportPresets = () => {
    const data = {
      clipPresets,
      masterPresets,
      version: '1.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elastic-pulse-presets-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importPresets = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.clipPresets) {
            setClipPresets(data.clipPresets);
            localStorage.setItem('ep_clip_presets', JSON.stringify(data.clipPresets));
          }
          if (data.masterPresets) {
            setMasterPresets(data.masterPresets);
            localStorage.setItem('ep_master_presets', JSON.stringify(data.masterPresets));
          }
        } catch (e) {
          alert('Failed to import presets. Invalid file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-3xl w-full shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <h3 className="text-lg font-black uppercase text-[#ffdc5e] flex items-center gap-3">
            <FolderOpen size={20} />
            Presets Manager
          </h3>
          <div className="flex gap-2">
            <button
              onClick={exportPresets}
              className="p-2 text-slate-500 hover:text-white transition-all"
              title="Export Presets"
            >
              <Download size={18} />
            </button>
            <button
              onClick={importPresets}
              className="p-2 text-slate-500 hover:text-white transition-all"
              title="Import Presets"
            >
              <Upload size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-white transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-4 shrink-0">
          <button
            onClick={() => setActiveTab('clip')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${
              activeTab === 'clip'
                ? 'bg-[#ffdc5e] text-black'
                : 'bg-[#0a0a0a] text-slate-400 hover:text-white'
            }`}
          >
            Clip Presets
          </button>
          <button
            onClick={() => setActiveTab('master')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${
              activeTab === 'master'
                ? 'bg-[#ffdc5e] text-black'
                : 'bg-[#0a0a0a] text-slate-400 hover:text-white'
            }`}
          >
            Master FX Presets
          </button>
        </div>

        <div className="flex-grow overflow-hidden flex flex-col">
          {activeTab === 'clip' ? (
            <div className="flex flex-col gap-4 h-full overflow-hidden">
              <div className="bg-[#0a0a0a] p-4 rounded-xl border border-white/5 flex gap-2 shrink-0">
                <input
                  type="text"
                  value={newPresetName}
                  onChange={e => setNewPresetName(e.target.value)}
                  placeholder="Preset name..."
                  className="flex-grow bg-[#1a1a1a] border border-white/5 p-2 rounded-lg text-sm text-white outline-none focus:border-[#ffdc5e]"
                  onKeyDown={e => e.key === 'Enter' && saveClipPreset()}
                />
                <button
                  onClick={saveClipPreset}
                  disabled={!activeClip || !newPresetName.trim()}
                  className="px-4 py-2 bg-[#ffdc5e] text-black rounded-lg text-xs font-black uppercase hover:bg-[#f59e0b] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save size={16} />
                  Save
                </button>
              </div>
              <div className="flex-grow overflow-y-auto space-y-2 custom-scrollbar">
                {clipPresets.length === 0 ? (
                  <div className="text-center text-slate-500 text-sm py-8">
                    No clip presets saved. Create one from the active clip.
                  </div>
                ) : (
                  clipPresets.map(preset => (
                    <div
                      key={preset.id}
                      className="bg-[#0a0a0a] p-4 rounded-xl border border-white/5 flex items-center justify-between group"
                    >
                      <div className="flex-grow">
                        <div className="text-sm font-black uppercase text-white mb-1">{preset.name}</div>
                        <div className="text-xs text-slate-500 font-mono">
                          {Object.keys(preset.clip.params || {}).length} params, {preset.clip.lfos?.length || 0} LFOs
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onLoadClipPreset(preset)}
                          className="px-3 py-1.5 bg-[#ffdc5e] text-black rounded-lg text-xs font-black uppercase hover:bg-[#f59e0b] transition-all"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => deleteClipPreset(preset.id)}
                          className="p-1.5 text-red-500 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 h-full overflow-hidden">
              <div className="bg-[#0a0a0a] p-4 rounded-xl border border-white/5 flex gap-2 shrink-0">
                <input
                  type="text"
                  value={newPresetName}
                  onChange={e => setNewPresetName(e.target.value)}
                  placeholder="Preset name..."
                  className="flex-grow bg-[#1a1a1a] border border-white/5 p-2 rounded-lg text-sm text-white outline-none focus:border-[#ffdc5e]"
                  onKeyDown={e => e.key === 'Enter' && saveMasterPreset()}
                />
                <button
                  onClick={saveMasterPreset}
                  disabled={!newPresetName.trim()}
                  className="px-4 py-2 bg-[#ffdc5e] text-black rounded-lg text-xs font-black uppercase hover:bg-[#f59e0b] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save size={16} />
                  Save
                </button>
              </div>
              <div className="flex-grow overflow-y-auto space-y-2 custom-scrollbar">
                {masterPresets.length === 0 ? (
                  <div className="text-center text-slate-500 text-sm py-8">
                    No master FX presets saved. Create one from current master settings.
                  </div>
                ) : (
                  masterPresets.map(preset => (
                    <div
                      key={preset.id}
                      className="bg-[#0a0a0a] p-4 rounded-xl border border-white/5 flex items-center justify-between group"
                    >
                      <div className="flex-grow">
                        <div className="text-sm font-black uppercase text-white mb-1">{preset.name}</div>
                        <div className="text-xs text-slate-500 font-mono">
                          BPM: {preset.fx.bpm}, Bloom: {preset.fx.bloom.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onLoadMasterPreset(preset)}
                          className="px-3 py-1.5 bg-[#ffdc5e] text-black rounded-lg text-xs font-black uppercase hover:bg-[#f59e0b] transition-all"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => deleteMasterPreset(preset.id)}
                          className="p-1.5 text-red-500 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

