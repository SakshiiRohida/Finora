import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AppStateProvider } from "./contexts/AppStateContext";
import DevErrorBoundary from "./components/DevErrorBoundary";

if (typeof window !== "undefined" && import.meta.env.DEV) {
  window.addEventListener("error", (event) => {
    console.error("[global] runtime error", event.error || event.message);
  });
  window.addEventListener("unhandledrejection", (event) => {
    console.error("[global] unhandled rejection", event.reason);
  });
  console.info("[main] Sampaket frontend booting");
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element with id 'root' was not found in index.html");
}

createRoot(rootElement).render(
  <DevErrorBoundary>
    <AppStateProvider>
      <App />
    </AppStateProvider>
  </DevErrorBoundary>
);
