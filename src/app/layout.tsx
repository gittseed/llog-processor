import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import "./globals.css";
import SupabaseProvider from "@/components/providers/SupabaseProvider";

const geist = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Log Processing System",
  description: "Real-time log file processing with BullMQ and Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <SupabaseProvider>
          <Toaster position="top-right" />
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
