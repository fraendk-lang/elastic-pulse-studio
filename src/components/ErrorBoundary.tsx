import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d] text-white p-8">
          <div className="max-w-2xl text-center space-y-6">
            <AlertCircle size={64} className="mx-auto text-red-500" />
            <h1 className="text-3xl font-black uppercase">RUNTIME_ERROR</h1>
            <p className="text-slate-400 font-mono text-sm">{this.state.error?.message || 'Unknown error occurred'}</p>
            <button 
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="px-8 py-3 bg-[#ffdc5e] text-black rounded-xl font-black uppercase hover:bg-white transition-all"
            >
              Restart Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

