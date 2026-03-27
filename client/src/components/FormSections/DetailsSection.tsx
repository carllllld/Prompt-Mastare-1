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
    border: "#E8E5DE",
    bg: "#FAFAF8",
    text: "#1D2939",
    badge: "bg-gray-100 text-gray-600",
  },
  gold: {
    border: "#E8E5DE",
    bg: "#FAFAF8",
    text: "#1D2939",
    badge: "bg-gray-100 text-gray-600",
  },
  green: {
    border: "#E8E5DE",
    bg: "#FAFAF8",
    text: "#1D2939",
    badge: "bg-gray-100 text-gray-600",
  },
  purple: {
    border: "#E8E5DE",
    bg: "#FAFAF8",
    text: "#1D2939",
    badge: "bg-gray-100 text-gray-600",
  },
  gray: {
    border: "#E8E5DE",
    bg: "#FAFAF8",
    text: "#1D2939",
    badge: "bg-gray-100 text-gray-600",
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
    <div className="border rounded-lg overflow-hidden" style={{ borderColor: config.border, backgroundColor: isExpanded ? config.bg : "transparent" }}>
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-3 transition-all text-left hover:bg-opacity-80"
      >
        <span className="text-sm font-medium" style={{ color: config.text }}>
          {title}
        </span>
        <div className="flex items-center gap-2">
          {!isExpanded && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: "#9CA3AF", backgroundColor: "#F3F4F6" }}>
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
        <div className="p-3 border-t" style={{ borderTopColor: config.border }}>
          {children}
        </div>
      )}
    </div>
  );
}
