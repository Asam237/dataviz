import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ChartFlow - Outil d'analyse et de visualisation",
  description: "Créez des graphiques et analysez vos données facilement",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

