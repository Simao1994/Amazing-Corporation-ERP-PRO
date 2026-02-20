import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  // Optional children to handle cases where the boundary might be used without direct children in JSX
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * ErrorBoundary class component to catch rendering errors in its child component tree.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for debugging purposes.
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-red-100 max-w-md text-center">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-2">Ops! Algo correu mal</h1>
            <p className="text-slate-500 mb-8">
              Ocorreu um erro inesperado na interface. Não se preocupe, os seus dados estão seguros.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all"
            >
              <RefreshCw size={20} /> RECARREGAR SISTEMA
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
