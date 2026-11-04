"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

interface ShareButtonProps {
  title: string;
  text: string;
  path: string;
  className?: string;
  // Icon-only button for the phone top bar.
  iconOnly?: boolean;
  style?: React.CSSProperties;
}

/** Opens the share sheet of the device, or copies the link when sharing is not supported. */
export function ShareButton({
  title,
  text,
  path,
  className = "btn o",
  iconOnly = false,
  style,
}: ShareButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  function share() {
    const url = `${window.location.origin}${path}`;

    if (navigator.share) {
      navigator.share({ title, text, url }).catch(() => {});

      return;
    }

    navigator.clipboard?.writeText(url).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }

  const Icon = isCopied ? Check : Share2;

  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={share}
      aria-label="Bagikan"
      title="Bagikan"
    >
      <Icon className="i" />
      {!iconOnly && (isCopied ? "Tersalin" : "Bagikan")}
    </button>
  );
}
