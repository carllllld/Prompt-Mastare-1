import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wand2, Minus, Plus, RotateCcw, Loader2, PenLine, Sparkles, AlertTriangle } from "lucide-react";

interface TextEditorProps {
  text: string;
  onTextChange: (newText: string) => void;
}

const QUICK_ACTIONS = [
  { label: "Skriv om", instruction: "Skriv om texten med andra ord men behåll ALLA fakta. Använd korta meningar.", icon: Wand2, color: "bg-blue-500" },
  { label: "Mer fakta", instruction: "Lägg till KONKRETA detaljer om rummet/objektet. Använd mått, material, årtal. Hitta inte på.", icon: Plus, color: "bg-green-500" },
  { label: "Kondensera", instruction: "Gör texten kortare. Behåll bara viktigaste fakta. Inga utfyllnadsmeningar.", icon: Minus, color: "bg-orange-500" },
  { label: "Mer säljande", instruction: "Gör texten mer säljande genom att lyfta de starkaste fakta tydligare. Inga klyschor.", icon: Sparkles, color: "bg-purple-500" },
  { label: "Mer formell", instruction: "Gör texten mer formell och professionell. Använd korrekta fastighetstermer.", icon: PenLine, color: "bg-gray-500" },
  { label: "Fixa klyschor", instruction: "Ersätt alla klyschor och vaga påståenden med konkreta fakta. Inga 'erbjuder', 'bjuder på', 'fantastisk'.", icon: AlertTriangle, color: "bg-red-500" },
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
      top: rect.top - editorRect.top - 52,
      left: Math.max(0, Math.min(rect.left - editorRect.left + rect.width / 2 - 150, editorRect.width - 320)),
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
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" style={{ color: "#2D6A4F" }} />
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>
            Markera text för AI-redigering
          </span>
        </div>
        {history.length > 0 && (
          <Button variant="ghost" size="sm" onClick={undo} className="h-6 text-[10px] px-2" style={{ color: "#9CA3AF" }}>
            <RotateCcw className="w-3 h-3 mr-1" /> Ångra
          </Button>
        )}
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
            className="rounded-xl shadow-lg border p-1.5 flex flex-col gap-1"
            style={{ background: "#FFFFFF", borderColor: "#E5E7EB", minWidth: "280px" }}
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
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-medium transition-all hover:scale-105 hover:shadow-md border border-transparent"
                      style={{
                        color: "#FFFFFF",
                        background: `linear-gradient(135deg, ${action.color.replace('bg-', '#').replace('500', '600')}, ${action.color.replace('bg-', '#').replace('500', '500')})`,
                        borderColor: `${action.color.replace('bg-', '#').replace('500', '400')}20`
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
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium transition-all hover:scale-105 border-t"
                    style={{
                      color: "#6B7280",
                      borderColor: "#F3F4F6",
                      background: "linear-gradient(135deg, #F9FAFB, #FFFFFF)"
                    }}
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Egen instruktion...</span>
                    <span className="text-[10px] opacity-60">⌘K</span>
                  </button>
                ) : (
                  <div className="flex gap-2 border-t pt-2" style={{ borderColor: "#F3F4F6" }}>
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
                      placeholder="T.ex. 'Gör det mer säljande för unga köpare'"
                      className="flex-1 text-[11px] px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      style={{
                        borderColor: "#E5E7EB",
                        background: "#FFFFFF",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => customInstruction.trim() && doRewrite(customInstruction.trim())}
                      className="h-8 text-[10px] px-3 font-medium transition-all hover:scale-105"
                      style={{ background: "linear-gradient(135deg, #2D6A4F, #40916C)" }}
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
