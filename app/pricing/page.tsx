"use client";

import { useState } from "react";
import Link from "next/link";
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
    q: "How does auto-apply work?",
    a: "Premium users can enable auto-apply for jobs above a fit score threshold. Joura submits tailored applications with a customized resume and cover letter on your behalf.",
  },
  {
    q: "Is my resume data safe?",
    a: "Absolutely. Your data is encrypted at rest and in transit. We never share your personal information with employers without your explicit consent.",
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const plans = [
    {
      name: "Free",
      price: 0,
      desc: "Get started and explore your matches.",
      features: [
        { text: "Up to 20 job matches/day", included: true },
        { text: "Basic fit scoring", included: true },
        { text: "Job bookmarking", included: true },
        { text: "Resume builder (1 resume)", included: true },
        { text: "AI resume suggestions", included: false },
        { text: "Auto-apply", included: false },
        { text: "Employer reply alerts", included: false },
      ],
      cta: "Get Started",
      href: "/dashboard",
    },
    {
      name: "Basic",
      price: annual ? 9 : 12,
      desc: "For active job seekers who want the edge.",
      featured: true,
      features: [
        { text: "Unlimited job matches", included: true },
        { text: "Advanced AI fit scoring", included: true },
        { text: "Unlimited bookmarks", included: true },
        { text: "Resume builder (5 resumes)", included: true },
        { text: "AI resume suggestions", included: true },
        { text: "Auto-apply", included: false },
        { text: "Employer reply alerts", included: false },
      ],
      cta: "Start Free Trial",
      href: "/dashboard",
    },
    {
      name: "Premium",
      price: annual ? 19 : 24,
      desc: "Let Joura do the heavy lifting for you.",
      features: [
        { text: "Everything in Basic", included: true },
        { text: "Auto-apply (up to 50/day)", included: true },
        { text: "Tailored cover letters", included: true },
        { text: "Unlimited resumes", included: true },
        { text: "Employer reply alerts", included: true },
        { text: "Application analytics", included: true },
        { text: "Priority support", included: true },
      ],
      cta: "Go Premium",
      href: "/dashboard",
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
            <span className={`toggle-label ${!annual ? "active" : ""}`}>
              Monthly
            </span>
            <div
              className={`toggle ${annual ? "on" : ""}`}
              onClick={() => setAnnual(!annual)}
            >
              <div className="toggle-thumb" />
            </div>
            <span className={`toggle-label ${annual ? "active" : ""}`}>
              Annual
            </span>
            {annual && <span className="save-badge">Save 25%</span>}
          </div>
        </div>

        <div className="pricing-grid">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`pricing-card ${plan.featured ? "featured" : ""}`}
            >
              {plan.featured && (
                <div className="popular-badge">Most Popular</div>
              )}
              <div className="plan-name">{plan.name}</div>
              <div className="plan-price">
                {plan.price === 0 ? (
                  "Free"
                ) : (
                  <>
                    ${plan.price}
                    <span>/mo</span>
                  </>
                )}
              </div>
              <div className="plan-desc">{plan.desc}</div>
              <div className="plan-divider" />
              <ul className="plan-features">
                {plan.features.map((f) => (
                  <li
                    key={f.text}
                    className={`plan-feature ${f.included ? "included" : ""}`}
                  >
                    <span className={f.included ? "check" : "cross"}>
                      {f.included ? "✓" : "–"}
                    </span>
                    {f.text}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`btn btn-lg ${plan.featured ? "btn-primary" : "btn-outline"}`}
                style={{ width: "100%", display: "block", textAlign: "center" }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="faq">
          <h3>Frequently Asked Questions</h3>
          {faqs.map((faq, i) => (
            <div className="faq-item" key={i}>
              <div
                className="faq-q"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
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
