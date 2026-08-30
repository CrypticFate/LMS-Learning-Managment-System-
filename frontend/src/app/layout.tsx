import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CPS Academy",
    template: "%s | CPS Academy",
  },
  description:
    "Structured competitive programming and job-ready software engineering courses with mentor-led guidance.",
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
