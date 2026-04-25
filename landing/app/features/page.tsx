import ComingSoon from "@/components/ComingSoon";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features — PennyPounce",
};

export default function FeaturesPage() {
  return (
    <ComingSoon
      title="Features Are On the Way"
      description="We're building something powerful — automatic coupon detection, AI-powered deal analysis, price history tracking, and more. Stay tuned."
    />
  );
}
