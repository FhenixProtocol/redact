import { TokenStoreFetcher } from "./TokenStoreFetcher";
import { GoogleAnalytics } from "@next/third-parties/google";
import "@rainbow-me/rainbowkit/styles.css";
import { GlobalModals } from "~~/components/GlobalModals";
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Redact Money",
  description: "Send and receive confidential transactions",
});

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=0.9" />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <ScaffoldEthAppWithProviders>
            {children}
            <TokenStoreFetcher />
            <GlobalModals />
          </ScaffoldEthAppWithProviders>
        </ThemeProvider>
      </body>
      <GoogleAnalytics gaId="G-DSS4E3M9Q1" />
    </html>
  );
};

export default ScaffoldEthApp;
