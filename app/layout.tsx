import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import NextTopLoader from "nextjs-toploader";
import { ThemeProvider } from "@/components/theme/theme-provider"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Notedex",
  description: "Capture your ideas, anytime, anywhere.",
  keywords: [
    "Notedex",
    "note-taking app",
    "online notes",
    "cloud notes",
    "secure notes",
    "productivity",
  ],
  authors: [{ name: "Vinod Kumar", url: "https://www.vinodjangid.site" }],
  creator: "Vinod Kumar",
  openGraph: {
    title: "Notedex - Capture Your Ideas, Anytime, Anywhere",
    description:
      "A cloud-based note-taking app that helps you organize and access your notes securely from anywhere.",
    url: "https://notesync-site.netlify.app/",
    siteName: "Notedex",
    images: [
      {
        url: "https://notesync-site.netlify.app/images/ogimage.png",
        width: 1200,
        height: 630,
        alt: "Notedex - Capture Your Ideas, Anytime, Anywhere",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Notedex - Cloud-Based Note-Taking App",
    description:
      "Capture your ideas effortlessly with Notedex. Secure, fast, and accessible anytime, anywhere.",
    images: ["https://notesync-site.netlify.app/images/ogimage.png"],
    creator: "@Vinod_Jangid07",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased`}
      >
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
          <NextTopLoader color="#9333ea" showSpinner={false} />
          <Navbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}