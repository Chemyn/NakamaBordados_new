import { Suspense } from 'react';
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { LanguageProvider } from "./context/LanguageContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import WhatsAppButton from "./components/WhatsAppButton";
import MaintenanceWrapper from "./components/MaintenanceWrapper";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Sin maximumScale: bloquear el pinch-zoom en iOS/Android es una barrera
  // de accesibilidad (WCAG 1.4.4); el zoom por focus en inputs ya se evita
  // con font-size >= 16px en los campos.
};

export const metadata: Metadata = {
  title: "Nakama Bordados - Streetwear Anime Premium",
  description: "El puente entre la cultura anime y el streetwear de alta gama. Bordados de alta densidad y estampados exclusivos.",
  // Favicons generados a partir del logo del header (public/)
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <LanguageProvider>
            <CurrencyProvider>
              <CartProvider>
                <MaintenanceWrapper>
                  <Suspense fallback={<div style={{ height: "80px", background: "var(--nk-bg-card)" }} />}>
                    <Navbar />
                  </Suspense>
                  <div style={{ minHeight: "calc(100vh - 80px - 350px)" }}>
                    {children}
                  </div>
                  <Footer />
                  <WhatsAppButton />
                </MaintenanceWrapper>
              </CartProvider>
            </CurrencyProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
