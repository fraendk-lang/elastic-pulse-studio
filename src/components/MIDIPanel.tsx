import React from 'react';
import { Radio, X, Zap, Music, Settings, Trash2 } from 'lucide-react';
import type { MIDIDevice, MIDILearn } from '../hooks/useMIDI';

interface MIDIPanelProps {
  devices: MIDIDevice[];
  isConnected: boolean;
  activeDevice: MIDIDevice | null;
  learnedMappings: MIDILearn[];
  learnMode: { parameter: string; type: 'cc' | 'note' } | null;
  bpm: number | null;
  onConnect: (deviceId: string) => void;
  onDisconnect: () => void;
  onStartLearn: (parameter: string, type: 'cc' | 'note') => void;
  onCancelLearn: () => void;
  onRemoveMapping: (parameter: string) => void;
  onUpdateMapping: (parameter: string, updates: Partial<MIDILearn>) => void;
}

export const MIDIPanel: React.FC<MIDIPanelProps> = ({
  devices,
  isConnected,
  activeDevice,
  learnedMappings,
  learnMode,
  bpm,
  onConnect,
  onDisconnect,
  onStartLearn,
  onCancelLearn,
  onRemoveMapping,
  onUpdateMapping,
}) => {
  const mappableParameters = [
    { id: 'masterBPM', label: 'Master BPM', type: 'cc' as const },
    { id: 'masterBloom', label: 'Master Bloom', type: 'cc' as const },
    { id: 'masterFeedback', label: 'Master Feedback', type: 'cc' as const },
    { id: 'playPause', label: 'Play/Pause', type: 'note' as const },
    { id: 'reset', label: 'Reset', type: 'note' as const },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-[#232323] p-5 rounded-2xl border border-white/5 space-y-4 shadow-xl">
        <h3 className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
          <Radio size={14} />
          MIDI Connection
        </h3>
        
        {!isConnected ? (
          <div className="space-y-3">
            {devices.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                <Radio size={32} className="mx-auto mb-3 opacity-30" />
                <p>No MIDI devices found</p>
                <p className="text-xs mt-2">Connect a MIDI device and refresh</p>
              </div>
            ) : (
              <div className="space-y-2">
                {devices.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => onConnect(device.id)}
                    className="w-full p-4 bg-[#0a0a0a] border border-white/5 rounded-xl hover:border-[#ffdc5e]/40 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-black uppercase text-white">{device.name}</div>
                        {device.manufacturer && (
                          <div className="text-xs text-slate-500 mt-1">{device.manufacturer}</div>
                        )}
                      </div>
                      <Radio size={18} className="text-slate-500 group-hover:text-[#ffdc5e] transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-[#0a0a0a] border border-[#ffdc5e]/30 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-black uppercase text-[#ffdc5e]">{activeDevice?.name}</div>
                <button
                  onClick={onDisconnect}
                  className="p-1.5 text-slate-500 hover:text-red-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              {bpm && (
                <div className="text-xs text-slate-400 font-mono">
                  MIDI Clock: {bpm} BPM
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isConnected && (
        <div className="bg-[#232323] p-5 rounded-2xl border border-white/5 space-y-4 shadow-xl">
          <h3 className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
            <Settings size={14} />
            MIDI Learn
          </h3>
          
          {learnMode && (
            <div className="p-4 bg-[#ffdc5e]/10 border-2 border-[#ffdc5e] rounded-xl animate-pulse">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black uppercase text-[#ffdc5e]">Learning...</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {learnMode.type === 'cc' ? 'Move a control' : 'Press a key'} on your MIDI device
                  </div>
                </div>
                <button
                  onClick={onCancelLearn}
                  className="p-2 text-slate-500 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {mappableParameters.map((param) => {
              const mapping = learnedMappings.find((m) => m.parameter === param.id);
              const isLearning = learnMode?.parameter === param.id;

              return (
                <div
                  key={param.id}
                  className="p-3 bg-[#0a0a0a] border border-white/5 rounded-xl"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase text-slate-300">{param.label}</span>
                    {mapping ? (
                      <button
                        onClick={() => onRemoveMapping(param.id)}
                        className="p-1 text-slate-500 hover:text-red-500 transition-colors"
                        title="Remove mapping"
                      >
                        <Trash2 size={12} />
                      </button>
                    ) : (
                      <button
                        onClick={() => onStartLearn(param.id, param.type)}
                        disabled={!!learnMode}
                        className="px-3 py-1 bg-[#ffdc5e]/10 border border-[#ffdc5e]/30 text-[#ffdc5e] rounded text-[9px] font-black uppercase hover:bg-[#ffdc5e]/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {isLearning ? 'Learning...' : 'Learn'}
                      </button>
                    )}
                  </div>
                  {mapping && (
                    <div className="text-[9px] font-mono text-slate-500">
                      {mapping.type === 'cc'
                        ? `CC ${mapping.controller} (Ch ${(mapping.channel || 0) + 1})`
                        : `Note ${mapping.note} (Ch ${(mapping.channel || 0) + 1})`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {learnedMappings.length > 0 && (
            <div className="pt-4 border-t border-white/5">
              <div className="text-[9px] font-black uppercase text-slate-500 mb-2">
                Active Mappings ({learnedMappings.length})
              </div>
              <div className="space-y-1">
                {learnedMappings.map((mapping) => (
                  <div
                    key={mapping.parameter}
                    className="text-[8px] font-mono text-slate-600 bg-[#0a0a0a] px-2 py-1 rounded"
                  >
                    {mapping.parameter}: {mapping.type === 'cc' ? `CC${mapping.controller}` : `Note${mapping.note}`}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

