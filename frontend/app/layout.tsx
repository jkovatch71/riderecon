import "./globals.css";
import "leaflet/dist/leaflet.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthStatus } from "@/components/AuthStatus";
import { FooterNav } from "@/components/FooterNav";
import { TextSizeProvider } from "@/components/TextSizeProvider";
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

export const metadata = {
  title: "Ride Recon",
  description: "Real-time MTB trail conditions",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" }
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"]
  },
  themeColor: "#020312"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${teko.variable} ${rajdhani.variable} font-sans bg-zinc-950 text-zinc-100`}>
        <AuthProvider>
          <TextSizeProvider>
            <div className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-4">
              <AuthStatus />
              {children}
            </div>

            <FooterNav />
          </TextSizeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}