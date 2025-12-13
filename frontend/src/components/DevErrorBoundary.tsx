import { Component, ReactNode } from "react";

type DevErrorBoundaryState = {
  hasError: boolean;
  message?: string;
  stack?: string;
};

type DevErrorBoundaryProps = {
  children: ReactNode;
};

class DevErrorBoundary extends Component<DevErrorBoundaryProps, DevErrorBoundaryState> {
  state: DevErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(error: Error): DevErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message,
      stack: error?.stack
    };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    if (import.meta.env.DEV) {
      console.error("[DevErrorBoundary] component error", error, info);
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: "3rem",
          maxWidth: 960,
          margin: "0 auto"
        }}
      >
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem", color: "#b91c1c" }}>
          Oops! The Sampaket UI crashed.
        </h1>
        <p style={{ marginBottom: "1rem" }}>
          Check the browser console for the full stack trace. Once the issue is fixed the app will
          reload automatically.
        </p>
        {this.state.message && (
          <pre
            style={{
              background: "#fee2e2",
              border: "1px solid #fecaca",
              padding: "1rem",
              borderRadius: "0.75rem",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word"
            }}
          >
            {this.state.message}
            {this.state.stack ? `\n\n${this.state.stack}` : ""}
          </pre>
        )}
      </div>
    );
  }
}

export default DevErrorBoundary;

