import * as React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string;
  alt?: string;
  fallback?: string;
}

/** Avatar (size-5 default) with image + initials fallback. */
const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, src, alt, fallback, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "relative flex size-5 shrink-0 overflow-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={alt ?? ""} className="size-full object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center text-[10px] font-medium text-muted-foreground">
          {fallback}
        </span>
      )}
    </span>
  )
);
Avatar.displayName = "Avatar";

export { Avatar };
