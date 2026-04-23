import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pep Siter",
  description: "Research-products ecommerce MVP",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
