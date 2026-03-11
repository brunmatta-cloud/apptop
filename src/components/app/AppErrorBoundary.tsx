import React from 'react';

type Props = {
  children: React.ReactNode;
  title?: string;
  description?: string;
};

type State = {
  hasError: boolean;
  retryCount: number;
};

const MAX_SILENT_RETRIES = 6;
const RETRY_DELAY_MS = 1200;

class AppErrorBoundary extends React.Component<Props, State> {
  private retryTimer: number | null = null;

  state: State = { hasError: false, retryCount: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Erro de renderizacao capturado pela AppErrorBoundary:', error, errorInfo);
    if (this.retryTimer != null) {
      window.clearTimeout(this.retryTimer);
    }
    this.retryTimer = window.setTimeout(() => {
      this.setState((current) => {
        if (current.retryCount >= MAX_SILENT_RETRIES) {
          return current;
        }
        return {
          hasError: false,
          retryCount: current.retryCount + 1,
        };
      });
      this.retryTimer = null;
    }, RETRY_DELAY_MS);
  }

  componentWillUnmount() {
    if (this.retryTimer != null) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, retryCount: 0 });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">
            Recarregando interface...
          </p>
          {this.state.retryCount >= MAX_SILENT_RETRIES && (
            <button
              type="button"
              onClick={this.handleRetry}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-semibold"
            >
              Tentar novamente
            </button>
          )}
          <div className="hidden">
            <h2>{this.props.title || 'Nao foi possivel carregar esta tela'}</h2>
            <p>{this.props.description || 'Um erro inesperado foi interceptado antes de derrubar a aplicacao inteira.'}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
