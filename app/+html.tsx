import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// This file controls the HTML shell for the web build.
// It runs on the server (SSR) and during static export.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="theme-color" content="#080c18" />
        <title>VaultQuest — Play. Earn. Grow.</title>

        {/*
          Inline @font-face declarations load the icon fonts immediately,
          before any JS executes. This prevents the blank-icon flash that
          happens when useFonts() loads fonts asynchronously.
          Paths match where expo export places assets bundled via require().
        */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @font-face {
              font-family: 'Ionicons';
              src: url('/assets/fonts/Ionicons.ttf') format('truetype');
              font-weight: normal;
              font-style: normal;
              font-display: swap;
            }
            @font-face {
              font-family: 'MaterialIcons';
              src: url('/assets/fonts/MaterialIcons.ttf') format('truetype');
              font-weight: normal;
              font-style: normal;
              font-display: swap;
            }
            html, body, #root {
              height: 100%;
              background-color: #080c18;
            }
            /* Prevent unstyled icon flash */
            [style*="font-family: Ionicons"],
            [style*="font-family: MaterialIcons"] {
              visibility: hidden;
            }
            .fonts-loaded [style*="font-family: Ionicons"],
            .fonts-loaded [style*="font-family: MaterialIcons"] {
              visibility: visible;
            }
          `
        }} />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
