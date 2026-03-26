"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UserButton, useUser } from "@clerk/nextjs";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/swipe", label: "Swipe" },
  { href: "/resume", label: "Resume Editor" },
  { href: "/pricing", label: "Pricing" },
];

export default function Nav() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="nav">
        <Link href="/" className="nav-logo">
          Jour<span>a</span>
        </Link>
        <div className="nav-links">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${pathname === item.href ? "active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="nav-actions">
          {isSignedIn ? (
            <UserButton />
          ) : (
            <>
              <Link href="/sign-in" className="btn btn-ghost" style={{ display: "var(--nav-btn-display, inline-flex)" }}>
                Log in
              </Link>
              <Link href="/sign-up" className="btn btn-primary" style={{ display: "var(--nav-btn-display, inline-flex)" }}>
                Get Started
              </Link>
            </>
          )}
          {/* Hamburger — mobile only */}
          <button
            className="nav-hamburger btn btn-ghost"
            style={{ padding: "8px 10px", fontSize: 20, lineHeight: 1, display: "none" }}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="nav-mobile-menu">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-mobile-link ${pathname === item.href ? "active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {!isSignedIn && (
            <div style={{ display: "flex", gap: 8, marginTop: 8, padding: "0 8px" }}>
              <Link href="/sign-in" className="btn btn-ghost" style={{ flex: 1, textAlign: "center" }}
                onClick={() => setMenuOpen(false)}>
                Log in
              </Link>
              <Link href="/sign-up" className="btn btn-primary" style={{ flex: 1, textAlign: "center" }}
                onClick={() => setMenuOpen(false)}>
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}
