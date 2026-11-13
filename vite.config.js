import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" permite publicar la carpeta dist/ dentro de una subcarpeta del sitio.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
