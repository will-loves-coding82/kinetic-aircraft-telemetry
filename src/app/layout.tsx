import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter_Tight } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face for the landing page's Palantir-esque headlines. Palantir's
// actual brand face is Neue Haas Grotesk (commercial); Inter Tight is the
// closest Google-Fonts equivalent — a tightened, display-oriented cut of
// Inter with the same neo-grotesque, Helvetica-like voice. Variable weight
// (100–900), so every font-weight utility renders a true instance.
const displayFont = Inter_Tight({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kinetic — Live Flight Telemetry",
  description:
    "Real-time aircraft telemetry on a 3D globe, powered by the OpenSky Network.",
};

/**
 * Applies the saved (or system) theme before first paint so there is no
 * light/dark flash. Mirrored into React by ThemeProvider.
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("kinetic-theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
