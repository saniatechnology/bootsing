import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bootsing — Culture + Dancing Calendar",
  description:
    "Explore and save the events that matter to you — for the pleasure of having fun, meeting people, and learning things.",
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
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- see note above. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
