"use client";

import { useState } from "react";

type SafeImageProps = {
  src?: string | null;
  alt?: string;
  className?: string;
  priority?: boolean;
};

export default function SafeImage({
  src,
  alt = "",
  className = "",
  priority = false,
}: SafeImageProps) {
  const [failed, setFailed] =
    useState(false);

  const cleanSrc =
    typeof src === "string"
      ? src.trim()
      : "";

  if (!cleanSrc || failed) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-[#0d0d0d] ${className}`}
      >
        <div className="flex flex-col items-center gap-2 text-zinc-700">
          <span className="text-xl">
            ♪
          </span>

          <span className="text-[9px] font-bold tracking-[0.18em]">
            NO COVER
          </span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={cleanSrc}
      alt={alt}
      loading={
        priority
          ? "eager"
          : "lazy"
      }
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() =>
        setFailed(true)
      }
      className={className}
    />
  );
}
