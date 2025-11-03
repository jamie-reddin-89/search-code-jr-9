import React from "react";
import { useTooltips } from "@/contexts/TooltipContext";

export const Tooltip: React.FC<{ content: string; children: React.ReactElement }> = ({ content, children }) => {
  const { enabled } = useTooltips();
  // Simple implementation: clone child and add title when enabled
  return React.cloneElement(children, {
    title: enabled ? content : undefined,
  });
};
