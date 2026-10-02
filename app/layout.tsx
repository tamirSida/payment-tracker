import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { AppProvider } from "@/components/AppProvider";
import { ToastProvider } from "@/components/Toast";

config.autoAddCss = false;

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Tally",
  description: "Track recurring payments and what you owe.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f3ee",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        <AppProvider>
          <ToastProvider>
            <main className="app">{children}</main>
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}
