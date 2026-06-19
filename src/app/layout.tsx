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
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Nakama Bordados - Streetwear Anime Premium",
  description: "El puente entre la cultura anime y el streetwear de alta gama. Bordados de alta densidad y estampados exclusivos.",
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
