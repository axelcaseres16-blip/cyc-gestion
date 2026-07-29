import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

interface Props {
  children?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.hash = '';
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-red-200 p-6 sm:p-8 max-w-lg w-full text-center space-y-5 shadow-xl animate-fade-in">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-red-50">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-800 px-3 py-1 rounded-full border border-red-200">
                Sistema de Resiliencia
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                No fue posible cargar la información del cliente
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                Ocurrió un inconveniente temporal de renderizado. Tus datos cargados están protegidos y resguardados.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-left text-[11px] font-mono text-slate-600 overflow-x-auto max-h-32">
                <strong>Detalle técnico:</strong> {this.state.error.toString()}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  this.setState({ hasError: false });
                  window.history.back();
                }}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition flex items-center justify-center space-x-1 active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>

              <button
                onClick={this.handleReset}
                className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center space-x-1 active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reintentar</span>
              </button>

              <button
                onClick={this.handleGoHome}
                className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center space-x-1 active:scale-95"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Inicio</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
