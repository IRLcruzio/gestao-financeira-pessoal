import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import { HiddenValuesProvider } from "@/components/hidden-values";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gestão Financeira Pessoal",
  description: "Rendimentos, despesas, subscrições e investimentos — num só lugar.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Finanças",
  },
};

export const viewport: Viewport = {
  themeColor: "#121115",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={`${inter.variable} ${plexMono.variable}`}>
      <body>
        <HiddenValuesProvider>{children}</HiddenValuesProvider>
      </body>
    </html>
  );
}
