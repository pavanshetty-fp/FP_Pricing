import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { TablesLayout } from "@/components/tables-layout";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TablesLayout />
  </StrictMode>
);
