import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import PWARegister from "@/components/PWARegister";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Transporte Universitário - São João Batista",
  description: "Sistema de gestão de transporte universitário da Prefeitura de São João Batista - SC",
  manifest: "/manifest.json",
  icons: {
    apple: "/logo.png",
    icon: "/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a2744",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased bg-gray-50 text-gray-900`} suppressHydrationWarning>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
