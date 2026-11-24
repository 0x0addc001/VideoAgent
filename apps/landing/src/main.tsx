import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DemoWorkspace } from "./demo/DemoWorkspace";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DemoWorkspace />
  </StrictMode>,
);
