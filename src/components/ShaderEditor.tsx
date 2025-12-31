import React, { useState, useEffect } from 'react';
import type { Shader } from '../types';

// Lazy load Monaco Editor with proper error handling
let Editor: any = null;
let MonacoLoaded = false;
let MonacoLoadError = false;

const loadMonaco = async () => {
  if (MonacoLoaded || MonacoLoadError) return;
  try {
    if (typeof window !== 'undefined') {
      const module = await import('@monaco-editor/react');
      Editor = module.default;
      MonacoLoaded = true;
    }
  } catch (e) {
    console.warn('Monaco Editor failed to load:', e);
    MonacoLoadError = true;
  }
};

interface ShaderEditorProps {
  shader: Shader | undefined;
  error: string | null;
  onChange: (code: string) => void;
}

export const ShaderEditor: React.FC<ShaderEditorProps> = ({ shader, error, onChange }) => {
  const [monacoReady, setMonacoReady] = useState(false);

  useEffect(() => {
    loadMonaco().then(() => {
      if (Editor) setMonacoReady(true);
    });
  }, []);

  if (!shader) return null;

  return (
    <div className="space-y-4 animate-in fade-in duration-300 h-full flex flex-col">
      <div className="bg-[#0a0a0a] p-4 rounded-2xl border border-white/5 shadow-inner flex-grow flex flex-col overflow-hidden">
        <h3 className="text-[10px] font-black uppercase text-[#ffdc5e] mb-3 flex items-center gap-2 tracking-widest shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          Shader Source
        </h3>
        <div className="flex-grow overflow-hidden rounded-lg border border-white/5">
          {monacoReady && Editor ? (
            <Editor
              height="100%"
              defaultLanguage="glsl"
              value={shader.code}
              onChange={(value: string | undefined) => onChange(value || '')}
              theme="vs-dark"
              loading={<div className="text-slate-400 text-xs p-4">Loading editor...</div>}
              options={{
                minimap: { enabled: false },
                fontSize: 11,
                fontFamily: "'Fira Code', 'Monaco', 'Courier New', monospace",
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                formatOnPaste: false,
                formatOnType: false,
                suggestOnTriggerCharacters: false,
                quickSuggestions: false,
                acceptSuggestionOnEnter: 'off',
                bracketPairColorization: { enabled: true },
                colorDecorators: true,
                contextmenu: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                smoothScrolling: true,
                padding: { top: 8, bottom: 8 },
              }}
            />
          ) : (
            <textarea
              value={shader.code}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-full bg-transparent text-[10px] font-mono text-slate-300 outline-none resize-none custom-scrollbar leading-relaxed p-4"
              spellCheck={false}
              placeholder="Loading Monaco Editor..."
            />
          )}
        </div>
      </div>
      {error && (
        <div className="bg-red-950/30 border-2 border-red-500/40 p-4 rounded-xl space-y-2 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 text-[10px] font-black text-red-400 uppercase tracking-tighter">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Validation Failure
          </div>
          <div className="text-[9px] font-mono text-red-200/80 max-h-[120px] overflow-y-auto custom-scrollbar-red bg-black/40 p-2 rounded">
            {error}
          </div>
        </div>
      )}
    </div>
  );
};

