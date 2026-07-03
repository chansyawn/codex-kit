"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/components/tooltip";
import { cn } from "@/ui/lib/utils";

type TooltipContentProps = ComponentProps<typeof TooltipContent>;

type EllipsisTooltipProps = {
  children: string;
  className?: string;
} & Pick<TooltipContentProps, "align" | "alignOffset" | "side" | "sideOffset">;

export function EllipsisTooltip({
  align,
  alignOffset,
  children,
  className,
  side,
  sideOffset,
}: EllipsisTooltipProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const updateOverflow = useCallback(() => {
    const textElement = textRef.current;

    setIsOverflowing(textElement ? textElement.scrollWidth > textElement.clientWidth : false);
  }, []);

  useLayoutEffect(() => {
    updateOverflow();
  }, [children, updateOverflow]);

  useEffect(() => {
    window.addEventListener("resize", updateOverflow);

    return () => window.removeEventListener("resize", updateOverflow);
  }, [updateOverflow]);

  useEffect(() => {
    const textElement = textRef.current;
    if (!textElement || typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(updateOverflow);
    observer.observe(textElement);

    return () => observer.disconnect();
  }, [updateOverflow]);

  const text = (
    <span ref={textRef} className={cn("min-w-0 truncate", className)}>
      {children}
    </span>
  );

  if (!isOverflowing) return text;

  return (
    <Tooltip>
      <TooltipTrigger render={text} />
      <TooltipContent align={align} alignOffset={alignOffset} side={side} sideOffset={sideOffset}>
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
