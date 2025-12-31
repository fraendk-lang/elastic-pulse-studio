import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { category: 'Playback', items: [
    { key: 'Space', desc: 'Play/Pause' },
    { key: 'R', desc: 'Reset to start' },
  ]},
  { category: 'Timeline', items: [
    { key: 'Cmd/Ctrl + C', desc: 'Copy clip' },
    { key: 'Cmd/Ctrl + V', desc: 'Paste clip' },
    { key: 'Cmd/Ctrl + X', desc: 'Cut clip' },
    { key: 'Cmd/Ctrl + M', desc: 'Add marker' },
    { key: 'Cmd/Ctrl + L', desc: 'Toggle loop region' },
  ]},
  { category: 'Project', items: [
    { key: 'Cmd/Ctrl + S', desc: 'Save project' },
    { key: 'Cmd/Ctrl + O', desc: 'Load project' },
    { key: 'Cmd/Ctrl + E', desc: 'Export video/frame' },
  ]},
  { category: 'Edit', items: [
    { key: 'Cmd/Ctrl + Z', desc: 'Undo' },
    { key: 'Cmd/Ctrl + Shift + Z', desc: 'Redo' },
    { key: 'Delete', desc: 'Delete selected clip' },
  ]},
  { category: 'Navigation', items: [
    { key: 'Escape', desc: 'Close context menu' },
    { key: 'Tab', desc: 'Switch inspector tabs' },
  ]},
  { category: 'Master Effects', items: [
    { key: '1', desc: 'Toggle Strobe' },
    { key: '2', desc: 'Toggle Blackout' },
    { key: '3', desc: 'Toggle Invert' },
    { key: '4', desc: 'Toggle Freeze' },
    { key: '5', desc: 'Toggle Edge Detection' },
    { key: '6', desc: 'Toggle Scanlines' },
    { key: '7', desc: 'Toggle Mirror Flip' },
    { key: '8', desc: 'Toggle Chroma Burst' },
    { key: '9', desc: 'Toggle Zoom Punch' },
  ]},
];

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black uppercase text-[#ffdc5e] flex items-center gap-3">
            <Keyboard size={20} />
            Keyboard Shortcuts
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {shortcuts.map((category, idx) => (
            <div key={idx} className="space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                {category.category}
              </h4>
              <div className="space-y-2">
                {category.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-xl border border-white/5"
                  >
                    <span className="text-sm text-slate-300">{item.desc}</span>
                    <kbd className="px-3 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs font-mono text-[#ffdc5e] font-black">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-white/5 text-center">
          <p className="text-xs text-slate-500">
            Press <kbd className="px-2 py-1 bg-[#0a0a0a] border border-white/10 rounded text-[#ffdc5e]">?</kbd> to toggle this help
          </p>
        </div>
      </div>
    </div>
  );
};

