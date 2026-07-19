"use client";

import dynamic from "next/dynamic";

const ARExperience = dynamic(() => import("@/components/ar/ARExperience"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-ar-bg">
      <span className="font-sans text-sm text-ar-accent">Loading AR…</span>
    </div>
  ),
});

export default function ARClient(props: {
  itemId: number;
  itemName: string;
  priceLabel: string;
  modelUrl: string;
  mindTargetUrl: string;
}) {
  return <ARExperience {...props} />;
}
