import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Barcelona Cultural Calendar",
  description: "A personal calendar of independent and emerging cultural events in Barcelona.",
};

// Loaded via a plain <link>, not next/font/google: next/font fetches font
// files at build time, which fails on a network with no route to
// fonts.googleapis.com (as some CI/sandboxed build environments have). A
// runtime <link> degrades gracefully to the fallback stack in globals.css
// instead of failing the build outright.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- this rule
            targets the pages/ router's per-page <Head>; the App Router's root
            layout is the documented place for a global font <link> like this. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
