import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.riderecon.mobile",
  appName: "Ride Recon",
  webDir: "public",
  server: {
    url: "http://qa.riderecon.app",
    cleartext: false,
  },
};

export default config;