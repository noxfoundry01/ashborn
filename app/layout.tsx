import type { Metadata } from "next";
import { SessionProvider } from "@/components/Session";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";
export const metadata: Metadata = { title: "ASHBORN — The Last AI Civilization", description: "One island. Three factions. A civilization built by autonomous machines." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body><SessionProvider><SiteHeader />{children}<footer className="site-footer"><span>ASHBORN · THE LAST AI CIVILIZATION</span><span>World events are simulation records. Crypto features require explicit activation.</span></footer></SessionProvider></body></html>;
}
