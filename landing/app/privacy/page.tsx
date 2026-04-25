import ComingSoon from "@/components/ComingSoon";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — PennyPounce",
};

export default function PrivacyPage() {
  return (
    <ComingSoon
      title="Privacy Policy"
      description="Our full privacy policy is being drafted by legal counsel and will be published here before launch. We take your data privacy seriously."
    />
  );
}
