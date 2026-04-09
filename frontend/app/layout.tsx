import "./globals.css";
import "leaflet/dist/leaflet.css";
import type { Metadata } from "next";
import { AuthStatus } from "@/components/AuthStatus";
import { FooterNav } from "@/components/FooterNav";
import { TextSizeProvider } from "@/components/TextSizeProvider";

export const metadata: Metadata = {
  title: "San Antonio Trail Report",
  description: "Local MTB trail conditions for the San Antonio area.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100">
        <TextSizeProvider>
          <div className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-4">
            <AuthStatus />
            {children}
          </div>

          <FooterNav />
        </TextSizeProvider>
      </body>
    </html>
  );
}