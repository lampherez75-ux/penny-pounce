"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface ComingSoonProps {
  title: string;
  description?: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  }

  return (
    <section className="flex-1 bg-[#fdf7ed] flex items-center justify-center px-4 py-20">
      <div className="max-w-lg w-full flex flex-col items-center text-center gap-6">
        {/* Fox mascot */}
        <div className="relative w-36 h-36">
          <Image
            src="/fox-jumping.png"
            alt="PennyPounce fox mascot"
            fill
            className="object-contain float-anim drop-shadow-lg"
          />
        </div>

        {/* Coming Soon badge */}
        <div className="inline-flex items-center gap-2 bg-[#fdf1dc] border border-[#f2d3a4] rounded-full px-5 py-2">
          <span className="w-2 h-2 rounded-full bg-[#f4a824] animate-pulse" />
          <span className="text-xs font-bold text-[#7a1740] uppercase tracking-widest">
            Coming Soon
          </span>
        </div>

        {/* Section title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#3b0820]">
          {title}
        </h1>

        {/* Description */}
        <p className="text-[#6b4c2c] text-base leading-relaxed max-w-sm">
          {description ??
            "We're working hard on this section. Be the first to know when it launches — drop your email and we'll notify you."}
        </p>

        {/* Email capture */}
        <div className="w-full max-w-sm">
          {submitted ? (
            <div className="flex flex-col items-center gap-2 bg-[#fdf1dc] border border-[#f2d3a4] rounded-2xl px-6 py-5">
              <span className="text-2xl">🎉</span>
              <p className="font-bold text-[#7a1740]">You&apos;re on the list!</p>
              <p className="text-sm text-[#6b4c2c]">
                We&apos;ll ping you at <strong>{email}</strong> when this goes live.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 bg-white border border-[#f2d3a4] rounded-full px-5 py-3 text-sm text-[#3b0820] placeholder-[#c4a882] focus:outline-none focus:ring-2 focus:ring-[#7a1740] transition"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-[#f4a824] hover:bg-[#e09718] disabled:bg-[#e2c48a] text-[#3b0820] font-bold px-6 py-3 rounded-full text-sm shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loading ? "..." : "Notify Me"}
              </button>
            </form>
          )}
        </div>

        {/* Back to home */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7a1740] hover:text-[#9b4b2d] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
      </div>
    </section>
  );
}
