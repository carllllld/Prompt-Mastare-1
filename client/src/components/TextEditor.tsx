import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wand2, Minus, Plus, RotateCcw, Loader2, PenLine, Sparkles, AlertTriangle } from "lucide-react";

interface TextEditorProps {
  text: string;
  onTextChange: (newText: string) => void;
}

const QUICK_ACTIONS = [
  { label: "Skriv om", instruction: "Skriv om texten med andra ord men behåll ALLA fakta. Matcha stilen i resten av objektbeskrivningen.", icon: Wand2, gradient: ["#2563EB", "#3B82F6"] },
  { label: "Lyft fakta", instruction: "Lyft fram de starkaste fakta tydligare: renoveringsår, material, mått, märken, avstånd. Hitta inte på nya uppgifter.", icon: Plus, gradient: ["#16A34A", "#22C55E"] },
  { label: "Kondensera", instruction: "Korta ner texten. Behåll konkreta fakta (mått, årtal, material). Ta bort utfyllnad och upprepningar.", icon: Minus, gradient: ["#EA580C", "#F97316"] },
  { label: "Mer säljande", instruction: "Lyft de starkaste säljargumenten (läge, skick, storlek, utsikt) genom att placera dem först. Sälj med FAKTA, inte adjektiv.", icon: Sparkles, gradient: ["#7C3AED", "#8B5CF6"] },
  { label: "Bättre flöde", instruction: "Förbättra textflödet: variera meningslängd, bind ihop hackiga meningar. Texten ska läsas som en vandring genom bostaden.", icon: PenLine, gradient: ["#4B5563", "#6B7280"] },
  { label: "Fixa klyschor", instruction: "Ersätt AI-klyschor med konkreta fakta. 'Generöst kök' → 'Kök om 15 kvm'. 'Ljust och luftigt' → 'Fönster i söder och väster'. Stryk meningar utan fakta.", icon: AlertTriangle, gradient: ["#DC2626", "#EF4444"] },
];

export function TextEditor({ text, onTextChange }: TextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState("");
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });
  const [isRewriting, setIsRewriting] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [futureHistory, setFutureHistory] = useState<string[]>([]);

  // Save undo history
  const pushHistory = useCallback(() => {
    setHistory((prev: string[]) => [...prev.slice(-10), text]);
  }, [text]);

  const undo = useCallback(() => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      const currentText = text;

      setHistory((h: string[]) => h.slice(0, -1));
      setFutureHistory((f: string[]) => [...f, currentText]);
      setHistoryIndex(history.length - 2);
      onTextChange(prev);
      if (editorRef.current) editorRef.current.innerText = prev;
    }
  }, [history, text, onTextChange]);

  const redo = useCallback(() => {
    if (futureHistory.length > 0) {
      const next = futureHistory[futureHistory.length - 1];
      const currentText = text;

      setFutureHistory((f: string[]) => f.slice(0, -1));
      setHistory((h: string[]) => [...h, currentText]);
      setHistoryIndex(history.length);
      onTextChange(next);
      if (editorRef.current) editorRef.current.innerText = next;
    }
  }, [futureHistory, text, history.length, onTextChange]);

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !editorRef.current) {
      // Small delay to avoid hiding toolbar when clicking a toolbar button
      setTimeout(() => {
        const active = document.activeElement;
        if (!toolbarRef.current?.contains(active as Node)) {
          setShowToolbar(false);
          setShowCustomInput(false);
        }
      }, 200);
      return;
    }

    const selText = selection.toString().trim();
    if (selText.length < 3) {
      setShowToolbar(false);
      return;
    }

    setSelectedText(selText);

    // Position toolbar above selection
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();

    setToolbarPos({
      top: rect.top - editorRect.top - 220,
      left: Math.max(8, Math.min(rect.left - editorRect.left + rect.width / 2 - 160, editorRect.width - 340)),
    });
    setShowToolbar(true);
    setShowCustomInput(false);
  }, []);

  // Handle manual text editing
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const newText = editorRef.current.innerText;
      if (newText !== text) {
        pushHistory();
        onTextChange(newText);
      }
    }
  }, [text, onTextChange, pushHistory]);

  // AI rewrite
  const doRewrite = useCallback(async (instruction: string) => {
    if (!selectedText || !instruction) return;
    setIsRewriting(true);
    pushHistory();

    try {
      const response = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ selectedText, fullText: text, instruction }),
      });

      if (!response.ok) throw new Error("Rewrite failed");
      const data = await response.json();

      if (data.newFullText) {
        onTextChange(data.newFullText);
        if (editorRef.current) editorRef.current.innerText = data.newFullText;
      }
    } catch (err) {
      console.error("Rewrite error:", err);
    } finally {
      setIsRewriting(false);
      setShowToolbar(false);
      setShowCustomInput(false);
      setCustomInstruction("");
      window.getSelection()?.removeAllRanges();
    }
  }, [selectedText, text, onTextChange, pushHistory]);

  // Sync text prop → editor content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerText !== text) {
      editorRef.current.innerText = text;
    }
  }, [text]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === "z" && e.shiftKey || e.key === "y")) {
        e.preventDefault();
        redo();
      }

      // Quick actions with keyboard shortcuts
      if ((e.metaKey || e.ctrlKey) && selectedText) {
        switch (e.key) {
          case "k":
            e.preventDefault();
            setShowCustomInput(true);
            break;
          case "1":
            e.preventDefault();
            doRewrite("Skriv om texten med andra ord men behåll ALLA fakta. Använd korta meningar.");
            break;
          case "2":
            e.preventDefault();
            doRewrite("Lägg till KONKRETA detaljer om rummet/objektet. Använd mått, material, årtal. Hitta inte på.");
            break;
          case "3":
            e.preventDefault();
            doRewrite("Gör texten kortare. Behåll bara viktigaste fakta. Inga utfyllnadsmeningar.");
            break;
        }
      }

      // Escape to close toolbar
      if (e.key === "Escape" && showToolbar) {
        setShowToolbar(false);
        setShowCustomInput(false);
        setCustomInstruction("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [history, historyIndex, undo, redo, selectedText, showToolbar]);

  return (
    <div className="relative">
      {/* Editor label */}
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" style={{ color: "#2D6A4F" }} />
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>
            Markera text för AI-redigering
          </span>
          {selectedText && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#ECFDF5", color: "#166534" }}>
              {selectedText.split(/\s+/).filter(Boolean).length} ord markerade
            </span>
          )}
        </div>
        {history.length > 0 && (
          <Button variant="ghost" size="sm" onClick={undo} className="h-6 text-[10px] px-2" style={{ color: "#9CA3AF" }}>
            <RotateCcw className="w-3 h-3 mr-1" /> Ångra
          </Button>
        )}
      </div>

      <div className="mb-3 rounded-lg border px-3.5 py-3 text-xs" style={{ background: "#FAFAF7", borderColor: "#E8E5DE", color: "#6B7280" }}>
        Skriv direkt i texten eller markera en mening, ett stycke eller ett rumsparti för att förbättra just den delen med AI.
      </div>

      {/* Editable text area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onMouseUp={handleMouseUp}
        onInput={handleInput}
        className="whitespace-pre-wrap leading-relaxed text-base font-serif outline-none rounded-lg p-4 -m-1 transition-all focus:bg-[#FAFAF8] cursor-text border-2 shadow-sm"
        style={{
          fontFamily: "'Lora', Georgia, serif",
          color: "#1D2939",
          lineHeight: "1.6",
          minHeight: "120px",
          backgroundColor: "#FFFFFF",
          borderColor: "#D1D5DB",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        }}
      >
        {text}
      </div>

      {/* Floating AI toolbar */}
      {showToolbar && (
        <div
          ref={toolbarRef}
          className="absolute z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
          style={{ top: toolbarPos.top, left: toolbarPos.left }}
        >
          <div
            className="rounded-xl shadow-2xl border p-2 flex flex-col gap-1.5"
            style={{ background: "#FFFFFF", borderColor: "#D1D5DB", minWidth: "320px", boxShadow: "0 20px 60px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)" }}
          >
            {isRewriting ? (
              <div className="flex items-center gap-2 px-3 py-2 text-xs" style={{ color: "#6B7280" }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#2D6A4F" }} />
                AI skriver om...
              </div>
            ) : (
              <>
                {/* Quick action buttons */}
                <div className="grid grid-cols-2 gap-1.5">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => doRewrite(action.instruction)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.03] hover:shadow-md active:scale-[0.98]"
                      style={{
                        color: "#FFFFFF",
                        background: `linear-gradient(135deg, ${action.gradient[0]}, ${action.gradient[1]})`,
                        boxShadow: `0 2px 6px ${action.gradient[0]}40`
                      }}
                    >
                      <action.icon className="w-3.5 h-3.5" />
                      {action.label}
                    </button>
                  ))}
                </div>

                {/* Custom instruction */}
                {!showCustomInput ? (
                  <button
                    onClick={() => setShowCustomInput(true)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-[1.02] border mt-0.5"
                    style={{
                      color: "#374151",
                      borderColor: "#E5E7EB",
                      background: "#F9FAFB"
                    }}
                  >
                    <Wand2 className="w-3.5 h-3.5" style={{ color: "#2D6A4F" }} />
                    <span>Egen instruktion...</span>
                    <span className="ml-auto text-[10px] rounded border px-1.5 py-0.5" style={{ color: "#9CA3AF", borderColor: "#E5E7EB" }}>⌘K</span>
                  </button>
                ) : (
                  <div className="flex gap-2 border-t pt-2 mt-0.5" style={{ borderColor: "#E5E7EB" }}>
                    <input
                      autoFocus
                      value={customInstruction}
                      onChange={(e) => setCustomInstruction(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && customInstruction.trim()) {
                          e.preventDefault();
                          doRewrite(customInstruction.trim());
                        } else if (e.key === "Escape") {
                          setShowCustomInput(false);
                          setCustomInstruction("");
                        }
                      }}
                      placeholder="Ex: Lyft fram kökets material och renoveringsår tydligare utan att ändra fakta"
                      className="flex-1 text-xs px-3 py-2.5 rounded-lg border-2 outline-none focus:border-green-600 transition-all"
                      style={{
                        borderColor: "#D1D5DB",
                        background: "#F9FAFB",
                        color: "#1F2937"
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => customInstruction.trim() && doRewrite(customInstruction.trim())}
                      className="h-9 text-xs px-4 font-semibold transition-all hover:scale-[1.03] active:scale-[0.98]"
                      style={{ background: "linear-gradient(135deg, #2D6A4F, #40916C)", color: "#FFFFFF" }}
                    >
                      Kör
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
          {/* Arrow pointer */}
          <div
            className="w-3 h-3 rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-b border-r"
            style={{ background: "#FFFFFF", borderColor: "#E5E7EB" }}
          />
        </div>
      )}
    </div>
  );
}
