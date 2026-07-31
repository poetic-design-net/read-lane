import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { appConfig } from "@/lib/config";
import "./globals.css";

const sans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const serif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: appConfig.name,
    template: `%s · ${appConfig.name}`,
  },
  description: appConfig.description,
  metadataBase: new URL(appConfig.url),
  applicationName: appConfig.name,
  icons: {
    icon: [
      { url: "/brand/logo-symbol.avif", type: "image/avif", sizes: "512x512" },
      { url: "/brand/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/favicon-16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName: appConfig.name,
    title: appConfig.name,
    description: appConfig.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable} ${serif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            {children}
            <Toaster richColors closeButton position="top-center" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
