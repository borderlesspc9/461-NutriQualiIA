import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
          <p className="text-lg font-semibold text-foreground mb-2">Algo deu errado</p>
          <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium"
          >
            Voltar ao login
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
