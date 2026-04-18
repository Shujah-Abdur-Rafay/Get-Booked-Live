import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as Sentry from "@sentry/react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
    
    // Log to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }

  private handleReload = () => {
    // A hard reload will clear application state and might fix intermittent issues
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans">
          <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center space-y-6 shadow-lg">
            <div className="flex justify-center">
              <div className="bg-destructive/10 p-4 rounded-full">
                <AlertTriangle className="w-12 h-12 text-destructive" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Something went wrong</h1>
              <p className="text-muted-foreground text-sm">
                We've encountered an unexpected error. Our engineering team has been notified.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-muted/50 p-4 rounded-md text-left overflow-auto max-h-32 text-xs text-muted-foreground border border-border/50 font-mono scrollbar-thin">
                {this.state.error.message}
              </div>
            )}

            <div className="pt-4">
              <Button onClick={this.handleReload} className="w-full gap-2">
                <RefreshCcw className="w-4 h-4" />
                Reload Application
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
