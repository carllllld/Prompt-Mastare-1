import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface DetailsSectionProps {
  title: string;
  icon?: string;
  color: "blue" | "gold" | "green" | "purple" | "gray";
  children: React.ReactNode;
  defaultExpanded?: boolean;
  persistKey?: string;
}

const colorConfig = {
  blue: {
    border: "#2563EB",
    bg: "#F0F9FF",
    text: "#1E40AF",
    badge: "bg-blue-50 text-blue-600",
  },
  gold: {
    border: "#D4A574",
    bg: "#FFFBEB",
    text: "#92400E",
    badge: "bg-amber-50 text-amber-600",
  },
  green: {
    border: "#16A34A",
    bg: "#F0FDF4",
    text: "#15803D",
    badge: "bg-green-50 text-green-600",
  },
  purple: {
    border: "#A855F7",
    bg: "#FAF5FF",
    text: "#6B21A8",
    badge: "bg-purple-50 text-purple-600",
  },
  gray: {
    border: "#9CA3AF",
    bg: "#F9FAFB",
    text: "#374151",
    badge: "bg-gray-50 text-gray-600",
  },
};

export function DetailsSection({
  title,
  icon,
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
          {icon && <span className="text-lg">{icon}</span>}
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
