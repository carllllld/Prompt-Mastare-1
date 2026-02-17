import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wand2, Minus, Plus, RotateCcw, Loader2, PenLine, Sparkles } from "lucide-react";

interface TextEditorProps {
  text: string;
  onTextChange: (newText: string) => void;
}

const QUICK_ACTIONS = [
  { label: "Skriv om", instruction: "Skriv om texten med andra ord men behåll ALLA fakta. Använd korta meningar.", icon: Wand2 },
  { label: "Mer fakta", instruction: "Lägg till KONKRETA detaljer om rummet/objektet. Använd mått, material, årtal. Hitta inte på.", icon: Plus },
  { label: "Kondensera", instruction: "Gör texten kortare. Behåll bara viktigaste fakta. Inga utfyllnadsmeningar.", icon: Minus },
  { label: "Byt fokus", instruction: "Byt fokus till en annan egenskap. Om kök → fokusera på vitvaror/material. Om läge → fokusera på avstånd.", icon: PenLine },
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

  // Save undo history
  const pushHistory = useCallback(() => {
    setHistory((prev) => [...prev.slice(-10), text]);
  }, [text]);

  const undo = useCallback(() => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      onTextChange(prev);
      if (editorRef.current) editorRef.current.innerText = prev;
    }
  }, [history, onTextChange]);

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

  // Keyboard shortcut: Ctrl+Z for undo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && editorRef.current?.contains(document.activeElement as Node)) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo]);

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
        className="whitespace-pre-wrap leading-relaxed text-base font-serif outline-none rounded-lg p-1 -m-1 transition-colors focus:bg-[#FAFAF8] cursor-text"
        style={{
          fontFamily: "'Lora', Georgia, serif",
          color: "#1D2939",
          lineHeight: "1.6",
          minHeight: "100px",
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
                <div className="flex gap-1">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => doRewrite(action.instruction)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors hover:bg-gray-100"
                      style={{ color: "#374151" }}
                    >
                      <action.icon className="w-3 h-3" style={{ color: "#2D6A4F" }} />
                      {action.label}
                    </button>
                  ))}
                </div>

                {/* Custom instruction */}
                {!showCustomInput ? (
                  <button
                    onClick={() => setShowCustomInput(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors hover:bg-gray-50 border-t"
                    style={{ color: "#9CA3AF", borderColor: "#F3F4F6" }}
                  >
                    <Wand2 className="w-3 h-3" />
                    Egen instruktion...
                  </button>
                ) : (
                  <div className="flex gap-1 border-t pt-1" style={{ borderColor: "#F3F4F6" }}>
                    <input
                      autoFocus
                      value={customInstruction}
                      onChange={(e) => setCustomInstruction(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && customInstruction.trim()) {
                          doRewrite(customInstruction.trim());
                        }
                      }}
                      placeholder="T.ex. 'Gör det mer säljande'"
                      className="flex-1 text-[11px] px-2 py-1 rounded-md border outline-none focus:ring-1"
                      style={{ borderColor: "#E5E7EB", background: "#F9FAFB" }}
                    />
                    <Button
                      size="sm"
                      onClick={() => customInstruction.trim() && doRewrite(customInstruction.trim())}
                      className="h-7 text-[10px] px-2"
                      style={{ background: "#2D6A4F" }}
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
