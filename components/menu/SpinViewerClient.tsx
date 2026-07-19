"use client";

import dynamic from "next/dynamic";

const SpinViewer = dynamic(() => import("@/components/SpinViewer"), {
  ssr: false,
  loading: () => <div className="stripe h-full w-full" />,
});

export default function SpinViewerClient({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  return <SpinViewer src={src} className={className} />;
}
