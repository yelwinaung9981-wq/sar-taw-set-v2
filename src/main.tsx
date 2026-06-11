import {StrictMode, Component, ErrorInfo, ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';

// Safe observer patch to prevent crashing on invalid/null refs passed to IntersectionObserver or ResizeObserver by libraries
if (typeof window !== 'undefined') {
  if (window.IntersectionObserver) {
    const originalObserve = IntersectionObserver.prototype.observe;
    IntersectionObserver.prototype.observe = function (this: any, target: any) {
      if (target instanceof Element) {
        originalObserve.call(this, target);
      } else {
        console.warn('IntersectionObserver.observe: target is not an Element', target);
      }
    };
  }

  if (window.ResizeObserver) {
    const originalObserve = ResizeObserver.prototype.observe;
    ResizeObserver.prototype.observe = function (this: any, target: any, options?: any) {
      if (target instanceof Element) {
        originalObserve.call(this, target, options);
      } else {
        console.warn('ResizeObserver.observe: target is not an Element', target);
      }
    };
  }
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, fontFamily: 'sans-serif', color: '#e11d48' }}>
          <h2>Something went wrong.</h2>
          <p>Please refresh the page.</p>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

console.log("main.tsx running...");

const rootEl = document.getElementById('root');
console.log("Root element found:", !!rootEl);

if (rootEl) {
  try {
    console.log("Starting render...");
    const root = createRoot(rootEl);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>
    );
    console.log("App render command issued.");
  } catch (error) {
    console.error("Render error caught in main.tsx:", error);
  }
} else {
  console.error("Root element NOT found!");
}
