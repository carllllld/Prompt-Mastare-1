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
    border: "#CBD5E1",
    bg: "#F8FAFC",
    text: "#475569",
    badge: "bg-slate-100 text-slate-600",
  },
  gold: {
    border: "#E2E8F0",
    bg: "#FAFAF9",
    text: "#64748B",
    badge: "bg-slate-100 text-slate-600",
  },
  green: {
    border: "#D1D5DB",
    bg: "#F9FAFB",
    text: "#6B7280",
    badge: "bg-slate-100 text-slate-600",
  },
  purple: {
    border: "#E5E7EB",
    bg: "#FAFBFC",
    text: "#6B7280",
    badge: "bg-slate-100 text-slate-600",
  },
  gray: {
    border: "#E5E7EB",
    bg: "#F9FAFB",
    text: "#6B7280",
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
    <div className="pro-section-card border-l-4" style={{ borderLeftColor: config.border }}>
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-3 rounded-lg transition-all"
        style={{ backgroundColor: isExpanded ? config.bg : "transparent" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: config.text }}>
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isExpanded && (
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${config.badge}`}>
              Valfritt
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" style={{ color: config.text }} />
          ) : (
            <ChevronDown className="w-4 h-4" style={{ color: config.text }} />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t" style={{ borderTopColor: config.bg }}>
          {children}
        </div>
      )}
    </div>
  );
}
