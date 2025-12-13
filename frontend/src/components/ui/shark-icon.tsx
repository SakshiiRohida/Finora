
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function SharkIcon({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      role="img"
      aria-label="shark"
      className={cn("select-none pointer-events-none", className)}
      {...props}
    >
      🦈
    </span>
  );
}
