import "./globals.css";
import { WorkspaceProvider } from "../contexts/WorkspaceContext";
import AppShell from "../components/layout/AppShell";
import ServiceWorkerRegister from "../components/pwa/ServiceWorkerRegister";

export const metadata = {
  title: "WedPlan — Wedding Budget",
  description: "A simple shared wedding budget and payment tracker.",
  applicationName: "WedPlan",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WedPlan"
  }
};

export const viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <WorkspaceProvider>
          <AppShell>{children}</AppShell>
        </WorkspaceProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
