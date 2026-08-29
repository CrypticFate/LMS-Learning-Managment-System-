import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LMS (Learning Managment System)",
    template: "%s | LMS (Learning Managment System)",
  },
  description: "A role-aware learning management system built with Next.js and Strapi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
