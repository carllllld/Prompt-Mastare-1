import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Clock, Search, ChevronDown, ChevronUp, Trash2, Copy, Check, X } from "lucide-react";

interface HistoryItem {
  id: number;
  originalPrompt: string;
  improvedPrompt: string;
  socialCopy?: string;
  headline?: string;
  instagramCaption?: string;
  showingInvitation?: string;
  shortAd?: string;
  category: string;
  improvements: string[];
  suggestions: string[];
  createdAt: string;
}

interface HistoryPanelProps {
  onLoadResult?: (text: string) => void;
}

export function HistoryPanel({ onLoadResult }: HistoryPanelProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Record<number, string>>({});

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/history", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const deleteItem = async (id: number) => {
    try {
      await fetch(`/api/history/${id}`, { method: "DELETE", credentials: "include" });
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const copyText = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = history.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.improvedPrompt.toLowerCase().includes(q) ||
      item.originalPrompt.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) return "Just nu";
    if (diffHours < 24) return `${Math.floor(diffHours)} tim sedan`;
    if (diffHours < 48) return "Igår";
    return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  };

  const getPreview = (text: string, maxLen: number = 120) => {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen).trim() + "...";
  };

  if (loading) {
    return (
      <div className="rounded-xl border p-6 text-center" style={{ background: "#F8F6F1", borderColor: "#E8E5DE" }}>
        <div className="text-xs" style={{ color: "#9CA3AF" }}>Laddar historik...</div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="rounded-xl border p-6 text-center" style={{ background: "#F8F6F1", borderColor: "#E8E5DE" }}>
        <Clock className="w-5 h-5 mx-auto mb-2" style={{ color: "#D1D5DB" }} />
        <p className="text-xs" style={{ color: "#9CA3AF" }}>Ingen historik ännu. Generera din första text!</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "#FFFFFF", borderColor: "#E8E5DE" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ background: "#F8F6F1", borderColor: "#E8E5DE" }}>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" style={{ color: "#2D6A4F" }} />
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6B7280" }}>
            Historik ({history.length})
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b" style={{ borderColor: "#F3F4F6" }}>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#D1D5DB" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sök i texter..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border outline-none focus:ring-1"
            style={{ borderColor: "#E5E7EB", background: "#F9FAFB" }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
            >
              <X className="w-3 h-3" style={{ color: "#9CA3AF" }} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="max-h-[400px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-xs" style={{ color: "#9CA3AF" }}>
            Inga resultat för "{searchQuery}"
          </div>
        ) : (
          filtered.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div key={item.id} className="border-b last:border-b-0" style={{ borderColor: "#F3F4F6" }}>
                {/* Summary row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "#1D2939" }}>
                      {getPreview(item.improvedPrompt, 80)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#F0EDE6", color: "#6B7280" }}>
                        {item.category}
                      </span>
                      <span className="text-[10px]" style={{ color: "#D1D5DB" }}>
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#9CA3AF" }} />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#9CA3AF" }} />
                  )}
                </button>

                {/* Expanded content */}
                {isExpanded && (() => {
                  const hasExtras = !!(item.headline || item.instagramCaption || item.showingInvitation || item.shortAd);
                  const tabs = [
                    { key: "description", label: "Beskrivning", text: item.improvedPrompt },
                    ...(item.headline ? [{ key: "headline", label: "Rubrik", text: item.headline }] : []),
                    ...(item.instagramCaption ? [{ key: "instagram", label: "Instagram", text: item.instagramCaption }] : []),
                    ...(item.showingInvitation ? [{ key: "showing", label: "Visning", text: item.showingInvitation }] : []),
                    ...(item.shortAd ? [{ key: "shortad", label: "Kortannons", text: item.shortAd }] : []),
                  ];
                  const currentTab = activeTab[item.id] || "description";
                  const currentText = tabs.find(t => t.key === currentTab)?.text || item.improvedPrompt;
                  return (
                    <div className="px-4 pb-3" style={{ background: "#FAFAF8" }}>
                      {/* Info för äldre poster */}
                      {!hasExtras && (
                        <p className="text-[10px] mb-2 italic" style={{ color: "#9CA3AF" }}>
                          Äldre post — rubrik och sociala texter sparas från och med nu.
                        </p>
                      )}
                      {/* Tab bar */}
                      {tabs.length > 1 && (
                        <div className="flex gap-1 mb-2 flex-wrap">
                          {tabs.map(tab => (
                            <button
                              key={tab.key}
                              onClick={() => setActiveTab(prev => ({ ...prev, [item.id]: tab.key }))}
                              className="px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
                              style={{
                                background: currentTab === tab.key ? "#2D6A4F" : "#F0EDE6",
                                color: currentTab === tab.key ? "#fff" : "#6B7280",
                              }}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      )}
                      <div
                        className="text-xs leading-relaxed whitespace-pre-wrap rounded-lg p-3 border mb-2"
                        style={{ color: "#4B5563", borderColor: "#E8E5DE", background: "#FFFFFF", maxHeight: "200px", overflowY: "auto" }}
                      >
                        {currentText}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyText(currentText, item.id)}
                          className="h-6 text-[10px] px-2"
                          style={{ color: "#6B7280" }}
                        >
                          {copiedId === item.id ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                          {copiedId === item.id ? "Kopierad" : "Kopiera"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteItem(item.id)}
                          className="h-6 text-[10px] px-2 hover:text-red-600"
                          style={{ color: "#D1D5DB" }}
                        >
                          <Trash2 className="w-3 h-3 mr-1" /> Ta bort
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
