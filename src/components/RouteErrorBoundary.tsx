import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { reportError } from "@/lib/errorReporting";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, { componentStack: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            This page encountered an error. You can try reloading or go back to the homepage.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-transform active:scale-95"
            >
              Try Again
            </button>
            <Link
              to="/"
              className="rounded-full border border-border px-6 py-2.5 text-sm font-medium text-foreground transition-transform active:scale-95 hover:bg-surface"
            >
              Go Home
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;
