import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@conciergeiq/ui';

export interface ErrorBoundaryProperties {
  children: ReactNode;
  fallbackRender?: (caughtError: Error, resetErrorBoundary: () => void) => ReactNode;
  onErrorCaught?: (caughtError: Error, errorInformation: ErrorInfo) => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  caughtError: Error | null;
}

/**
 * Top-level React error boundary that intercepts unhandled rendering exceptions,
 * preventing blank screens and offering a clean application reload recovery mechanism.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProperties, ErrorBoundaryState> {
  constructor(properties: ErrorBoundaryProperties) {
    super(properties);
    this.state = {
      hasError: false,
      caughtError: null,
    };
  }

  static getDerivedStateFromError(caughtError: Error): ErrorBoundaryState {
    return {
      hasError: true,
      caughtError,
    };
  }

  componentDidCatch(caughtError: Error, errorInformation: ErrorInfo): void {
    if (this.props.onErrorCaught) {
      this.props.onErrorCaught(caughtError, errorInformation);
    }
  }

  handleResetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      caughtError: null,
    });
  };

  handleReloadApplication = (): void => {
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallbackRender && this.state.caughtError) {
        return this.props.fallbackRender(
          this.state.caughtError,
          this.handleResetErrorBoundary
        );
      }

      return (
        <div
          role="alert"
          data-testid="error-boundary-fallback"
          className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto space-y-4"
        >
          <div className="w-16 h-16 rounded-full bg-status-danger/10 text-status-danger flex items-center justify-center shadow-elevation-low">
            <AlertTriangle className="w-8 h-8" aria-hidden="true" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-text">Something went wrong</h1>
            <p className="text-xs text-text-muted leading-relaxed">
              An unexpected error occurred while loading this view. You can reload the application to try again.
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            data-testid="reload-application-button"
            onClick={this.handleReloadApplication}
            className="w-full flex items-center justify-center gap-2 mt-2"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>Reload Application</span>
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
