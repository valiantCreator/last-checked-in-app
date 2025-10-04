import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Gemini COMMENT: FIX - This is the final, correct configuration.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // This tells the PWA plugin to automatically update the service worker when new code is deployed.
      registerType: "autoUpdate",
      // We use the 'injectManifest' strategy because we have a custom service worker for Firebase.
      strategies: "injectManifest",
      // This tells the plugin where to find our source service worker file.
      srcDir: "src",
      filename: "firebase-messaging-sw.js",
      // This configuration generates the manifest.webmanifest file, a required part of a PWA.
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
            src: "LogoV1.png", // This path is relative to your `public` folder.
            sizes: "192x192",
            type: "image/png",
          },
          // You can add more icon sizes here if you have them.
        ],
      },
    }),
  ],
});
