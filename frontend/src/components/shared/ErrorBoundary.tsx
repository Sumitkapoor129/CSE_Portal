import { Component } from 'react';
import type { ReactNode } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
          <Card className="w-full max-w-md text-center">
            <h1 className="text-lg font-semibold text-gray-900">Something went wrong</h1>
            <p className="mt-2 text-sm text-gray-500">
              An unexpected error occurred. Please try again.
            </p>
            <div className="mt-6">
              <Button onClick={() => window.location.reload()}>Reload page</Button>
            </div>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
