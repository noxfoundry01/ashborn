"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/Session";
const links = [{ href: "/island", label: "Island" }, { href: "/my-agent", label: "My Agent" }, { href: "/factions", label: "Factions" }, { href: "/exchange", label: "Exchange" }, { href: "/chronicle", label: "Chronicle" }];
export function SiteHeader() {
  const path = usePathname();
  const { user, profile } = useSession();
  return <header className="site-header"><div className="header-inner">
    <Link className="brand" href="/" aria-label="ASHBORN home"><span className="brand-glyph">A<span>✦</span></span><span>ASHBORN</span></Link>
    <nav aria-label="Main navigation" className="main-nav">{links.map(link => <Link key={link.href} href={link.href} aria-current={path === link.href ? "page" : undefined}>{link.label}</Link>)}</nav>
    <div className="header-actions"><Link href="/chat" className="chat-link">◉ <span>Chat</span></Link><Link href={user ? "/profile" : "/auth"} className="account-link">{user ? (profile?.display_name ?? "Profile") : "Sign in"}</Link></div>
  </div></header>;
}
