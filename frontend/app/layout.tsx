import "./globals.css";
import "leaflet/dist/leaflet.css";
import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthStatus } from "@/components/AuthStatus";
import { FooterNav } from "@/components/FooterNav";
import { TextSizeProvider } from "@/components/TextSizeProvider";
import { AppBootProvider } from "@/components/AppBootProvider";
import { AppBootSplash } from "@/components/AppBootSplash";
import { Teko, Rajdhani } from "next/font/google";

const teko = Teko({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-teko",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-rajdhani",
});

export const metadata: Metadata = {
  title: "Ride Recon",
  description: "Real-time MTB trail conditions",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Ride Recon",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/favicon.ico", sizes: "any" },
      { url: "/icons/favicon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/icons/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/icons/favicon.ico"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1f14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />

        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1290x2796.png"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1170x2532.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1242x2688.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1125x2436.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
      </head>

      <body
        className={`${teko.variable} ${rajdhani.variable} font-sans bg-zinc-950 text-zinc-100`}
      >
        <AuthProvider>
          <TextSizeProvider>
            <AppBootProvider>
              <AppBootSplash />

              <div className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-2">
                <AuthStatus />
                {children}
              </div>

              <FooterNav />
            </AppBootProvider>
          </TextSizeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}