"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/lib/client/use-reduced-motion";

/** Premium completion feedback: soft pulse + checkmark + points glide.
 * Falls back to an instant, static confirmation when the OS reduced-motion
 * preference is set. */
export function TaskCompletionAnimation({ points, onDone }: { points: number; onDone: () => void }) {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (reduced) {
      onDone();
      return;
    }
    const timer = setTimeout(() => {
      setVisible(false);
      onDone();
    }, 900);
    return () => clearTimeout(timer);
  }, [reduced, onDone]);

  if (reduced || !visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center overflow-hidden rounded-2xl">
      <div className="absolute h-16 w-16 animate-ping rounded-full bg-emerald-400/40" />
      <div className="relative flex flex-col items-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-white shadow-lg animate-[bounce_0.6s_ease-in-out]">
          ✓
        </div>
        <span className="mt-1 animate-[float-up_0.9s_ease-out] text-sm font-bold text-emerald-700">+{points} pts</span>
      </div>
      <style jsx>{`
        @keyframes float-up {
          0% {
            transform: translateY(0);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translateY(-18px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
