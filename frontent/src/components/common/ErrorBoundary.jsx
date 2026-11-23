import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-2xl font-black tracking-tight mb-2">Something went wrong</h1>
            <p className="text-slate-400 text-sm mb-6">
              An unexpected UI error occurred while rendering this view. Our system has logged the event.
            </p>

            {this.state.error && (
              <div className="bg-slate-950 p-4 rounded-xl text-left text-xs font-mono text-red-400 mb-6 overflow-x-auto max-h-36">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Return to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
