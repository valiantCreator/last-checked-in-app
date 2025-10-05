import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "firebase-messaging-sw.js",
      manifest: {
        name: "Last Checked In",
        short_name: "LCI",
        description:
          "A Personal Relationship Manager to nurture your connections.",
        theme_color: "#1a1a1a",
        background_color: "#1a1a1a",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            // Gemini COMMENT: FIX - This now points to the single, existing LogoV1.png file.
            src: "/LogoV1.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            // Gemini COMMENT: FIX - We reference the same file for the larger size. The browser will handle scaling.
            src: "/LogoV1.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
