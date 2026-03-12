import Link from "next/link";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Job Feed", href: "/dashboard" },
      { label: "Resume Editor", href: "/resume" },
      { label: "Analytics", href: "/dashboard" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <Link href="/" className="footer-logo">
            Jour<span>a</span>
          </Link>
          <div className="footer-desc">
            AI-powered job search that works as hard as you do. Find roles that
            actually fit.
          </div>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <div className="footer-col-title">{col.title}</div>
            <div className="footer-links">
              {col.links.map((link) => (
                <Link key={link.label} href={link.href} className="footer-link">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="footer-bottom">
        <div className="footer-copy">© 2026 Joura. All rights reserved.</div>
        <div style={{ display: "flex", gap: 16 }}>
          {["Twitter", "LinkedIn", "GitHub"].map((s) => (
            <span key={s} className="footer-link">
              {s}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
