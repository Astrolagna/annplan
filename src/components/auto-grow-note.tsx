import { useLayoutEffect, useRef } from "react";

import { Textarea } from "@/components/ui/textarea";

export function AutoGrowNote({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder = "заметка…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  onBlur?: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);

  return (
    <Textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={e => onBlur?.(e.target.value)}
      placeholder={placeholder}
      className={
        "h-auto text-xs leading-tight bg-muted/30 border-0 shadow-none px-1.5 py-1 resize-none overflow-hidden focus-visible:ring-1 focus-visible:bg-card " +
        (className ?? "")
      }
    />
  );
}
