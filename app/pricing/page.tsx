"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";

const faqs = [
  {
    q: "How does the fit score work?",
    a: "Our AI analyzes your resume, skills, and preferences against job descriptions to produce a fit score. It weighs skills match, seniority, location, and compensation alignment.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, you can cancel your subscription at any time. You'll retain access until the end of your billing period.",
  },
  {
    q: "How does AI fit scoring work?",
    a: "Premium users can trigger an AI-powered fit score on any job using Claude — it analyzes your profile against the job details to give a precise match score.",
  },
  {
    q: "Is my resume data safe?",
    a: "Absolutely. Your data is encrypted at rest and in transit. We never share your personal information with employers without your explicit consent.",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleSubscribe(plan: "basic" | "premium") {
    setError("");
    setLoading(plan);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong. Please try again.");
      setLoading(null);
      return;
    }
    const { url } = await res.json();
    if (url) {
      window.location.href = url;
    } else {
      setError("Could not create checkout session.");
      setLoading(null);
    }
  }

  const plans = [
    {
      name: "Free",
      price: 0,
      desc: "Get started and explore your matches.",
      features: [
        { text: "3 job matches preview", included: true },
        { text: "Basic profile setup", included: true },
        { text: "Resume upload (1 resume)", included: true },
        { text: "Full job feed", included: false },
        { text: "Fit scoring", included: false },
        { text: "AI Polish", included: false },
        { text: "AI fit scoring", included: false },
      ],
      cta: "Get Started",
      action: "free" as const,
    },
    {
      name: "Basic",
      price: annual ? 9 : 12,
      desc: "For active job seekers who want the edge.",
      featured: true,
      features: [
        { text: "Unlimited job matches", included: true },
        { text: "Full job feed", included: true },
        { text: "Keyword fit scoring", included: true },
        { text: "Resume upload & editor", included: true },
        { text: "Job bookmarking", included: true },
        { text: "AI Polish", included: false },
        { text: "AI fit scoring", included: false },
      ],
      cta: "Start Basic",
      action: "basic" as const,
    },
    {
      name: "Premium",
      price: annual ? 19 : 24,
      desc: "Let Joura do the heavy lifting for you.",
      features: [
        { text: "Everything in Basic", included: true },
        { text: "AI Polish (ATS + rewrites)", included: true },
        { text: "AI fit scoring (Claude)", included: true },
        { text: "Resume rewrite", included: true },
        { text: "Unlimited resumes", included: true },
        { text: "Priority support", included: true },
        { text: "Early access to new features", included: true },
      ],
      cta: "Go Premium",
      action: "premium" as const,
    },
  ];

  return (
    <>
      <div className="pricing-page">
        <div className="pricing-header">
          <div className="section-label">Pricing</div>
          <h2>Simple, transparent pricing.</h2>
          <p>Start free. Upgrade when you&apos;re ready to accelerate.</p>
          <div className="pricing-toggle">
            <span className={`toggle-label ${!annual ? "active" : ""}`}>Monthly</span>
            <div className={`toggle ${annual ? "on" : ""}`} onClick={() => setAnnual(!annual)}>
              <div className="toggle-thumb" />
            </div>
            <span className={`toggle-label ${annual ? "active" : ""}`}>Annual</span>
            {annual && <span className="save-badge">Save 25%</span>}
          </div>
        </div>

        {error && (
          <div style={{
            maxWidth: 480, margin: "0 auto 24px", padding: "12px 16px",
            background: "rgba(224,92,92,0.1)", border: "1px solid rgba(224,92,92,0.3)",
            borderRadius: 8, fontSize: 13, color: "var(--red)", textAlign: "center",
          }}>
            {error}
          </div>
        )}

        <div className="pricing-grid">
          {plans.map((plan) => (
            <div key={plan.name} className={`pricing-card ${plan.featured ? "featured" : ""}`}>
              {plan.featured && <div className="popular-badge">Most Popular</div>}
              <div className="plan-name">{plan.name}</div>
              <div className="plan-price">
                {plan.price === 0 ? (
                  "Free"
                ) : (
                  <>
                    ${plan.price}<span>/mo</span>
                  </>
                )}
              </div>
              <div className="plan-desc">{plan.desc}</div>
              <div className="plan-divider" />
              <ul className="plan-features">
                {plan.features.map((f) => (
                  <li key={f.text} className={`plan-feature ${f.included ? "included" : ""}`}>
                    <span className={f.included ? "check" : "cross"}>{f.included ? "✓" : "–"}</span>
                    {f.text}
                  </li>
                ))}
              </ul>

              {plan.action === "free" ? (
                <button
                  className="btn btn-lg btn-outline"
                  style={{ width: "100%" }}
                  onClick={() => router.push("/dashboard")}
                >
                  {plan.cta}
                </button>
              ) : (
                <button
                  className={`btn btn-lg ${plan.featured ? "btn-primary" : "btn-outline"}`}
                  style={{ width: "100%" }}
                  onClick={() => handleSubscribe(plan.action as "basic" | "premium")}
                  disabled={loading !== null}
                >
                  {loading === plan.action ? "Redirecting…" : plan.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="faq">
          <h3>Frequently Asked Questions</h3>
          {faqs.map((faq, i) => (
            <div className="faq-item" key={i}>
              <div className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                {faq.q}
                <span>{openFaq === i ? "−" : "+"}</span>
              </div>
              {openFaq === i && <div className="faq-a">{faq.a}</div>}
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}
