"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/resume", label: "Resume Editor" },
  { href: "/pricing", label: "Pricing" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
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
        <Link href="/dashboard" className="btn btn-ghost">
          Log in
        </Link>
        <Link href="/pricing" className="btn btn-primary">
          Get Started
        </Link>
      </div>
    </nav>
  );
}
