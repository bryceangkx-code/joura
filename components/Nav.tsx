"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/resume", label: "Resume Editor" },
  { href: "/pricing", label: "Pricing" },
];

export default function Nav() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();

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
        {isSignedIn ? (
          <UserButton />
        ) : (
          <>
            <Link href="/sign-in" className="btn btn-ghost">
              Log in
            </Link>
            <Link href="/sign-up" className="btn btn-primary">
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
