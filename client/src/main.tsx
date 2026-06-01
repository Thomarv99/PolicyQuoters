import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initMetaPixel } from "./lib/meta-pixel";
import { initGa } from "./lib/ga";

// Initialize the global Meta Pixel (no-op if VITE_META_PIXEL_ID is unset).
// This emits the base PageView. Landing pages may re-init with a page-specific
// Pixel ID override; the utility is idempotent.
initMetaPixel();

// Initialize Google Analytics 4 globally. The SPA router (App.tsx) sends
// page_view events on every route change, so gtag's auto page_view is disabled.
initGa();

createRoot(document.getElementById("root")!).render(<App />);
