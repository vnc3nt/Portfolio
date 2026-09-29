import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeProvider";
import { LanguageProvider } from "../components/LanguageProvider";
import Navbar from "../components/Navbar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mein Portfolio",
  description: "Portfolio mit Next.js und Tailwind CSS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white transition-colors duration-300`}>
        <ThemeProvider>
              <LanguageProvider>
                <Navbar />
                {/* Ein Wrapper für den restlichen Inhalt, der Platz für die fixierte Navbar lässt */}
                <div className="pt-20">
                  {children}
                </div>
              </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}