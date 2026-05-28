import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initMetaPixel } from "./lib/meta-pixel";

// Initialize the global Meta Pixel (no-op if VITE_META_PIXEL_ID is unset).
// This emits the base PageView. Landing pages may re-init with a page-specific
// Pixel ID override; the utility is idempotent.
initMetaPixel();

createRoot(document.getElementById("root")!).render(<App />);
