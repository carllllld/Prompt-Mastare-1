import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface DetailsSectionProps {
  title: string;
  color: "blue" | "gold" | "green" | "purple" | "gray";
  children: React.ReactNode;
  defaultExpanded?: boolean;
  persistKey?: string;
}

const colorConfig = {
  blue: {
    border: "#D1D5DB",
    bg: "#F3F4F6",
    text: "#4B5563",
    badge: "bg-slate-100 text-slate-600",
  },
  gold: {
    border: "#D1D5DB",
    bg: "#F3F4F6",
    text: "#4B5563",
    badge: "bg-slate-100 text-slate-600",
  },
  green: {
    border: "#D1D5DB",
    bg: "#F3F4F6",
    text: "#4B5563",
    badge: "bg-slate-100 text-slate-600",
  },
  purple: {
    border: "#D1D5DB",
    bg: "#F3F4F6",
    text: "#4B5563",
    badge: "bg-slate-100 text-slate-600",
  },
  gray: {
    border: "#D1D5DB",
    bg: "#F3F4F6",
    text: "#4B5563",
    badge: "bg-slate-100 text-slate-600",
  },
};

export function DetailsSection({
  title,
  color,
  children,
  defaultExpanded = false,
  persistKey,
}: DetailsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Load persisted state
  useEffect(() => {
    if (persistKey) {
      try {
        const saved = localStorage.getItem(`details-section-${persistKey}`);
        if (saved !== null) {
          setIsExpanded(JSON.parse(saved));
        }
      } catch {
        // Ignore storage errors
      }
    }
  }, [persistKey]);

  // Persist state
  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (persistKey) {
      try {
        localStorage.setItem(`details-section-${persistKey}`, JSON.stringify(newState));
      } catch {
        // Ignore storage errors
      }
    }
  };

  const config = colorConfig[color];

  return (
    <div className="border" style={{ borderColor: config.border, backgroundColor: isExpanded ? config.bg : "transparent" }}>
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-2 transition-all text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: config.text }}>
          {title}
        </span>
        <div className="flex items-center gap-1">
          {!isExpanded && (
            <span className="text-xs px-1.5 py-0.5" style={{ color: config.text, backgroundColor: config.bg }}>
              Valfritt
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-3 h-3" style={{ color: config.text }} />
          ) : (
            <ChevronDown className="w-3 h-3" style={{ color: config.text }} />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="p-2 border-t" style={{ borderTopColor: config.border }}>
          {children}
        </div>
      )}
    </div>
  );
}
