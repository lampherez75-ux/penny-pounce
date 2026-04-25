import ComingSoon from "@/components/ComingSoon";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Portal — PennyPounce",
};

export default function AccountPage() {
  return (
    <ComingSoon
      title="Account Portal Coming Soon"
      description="Manage your subscription, view your savings history, and control your preferences — all in one place. Launching soon."
    />
  );
}
