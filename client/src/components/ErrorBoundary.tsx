import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("[ErrorBoundary] Caught error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[300px] flex flex-col items-center justify-center gap-4 p-8">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold" style={{ color: "#1F2937" }}>
              Något gick fel
            </h2>
            <p className="text-sm" style={{ color: "#6B7280" }}>
              Ett oväntat fel uppstod. Försök ladda om sidan.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-md text-sm font-medium text-white"
            style={{ background: "#2D6A4F" }}
          >
            Ladda om sidan
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
