import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { History, Clock, Copy, Check, ChevronDown, ChevronUp, AlertCircle, Trash2, Settings, Info } from "lucide-react";
import { useState } from "react";
import { type Optimization, type UserStatus } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function PromptHistory() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const { data: userStatus } = useQuery<UserStatus>({
    queryKey: ["/api/user/status"],
  });

  const isPro = userStatus?.plan === "pro" || userStatus?.plan === "premium";

  const { data: history, isLoading, error } = useQuery<Optimization[]>({
    queryKey: ["/api/history"],
    enabled: isPro,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/history/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/history");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
      setShowSettings(false);
    },
  });

  const handleCopy = async (text: string, id: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isPro) {
    return null;
  }

  if (error) {
    return (
      <Card className="p-6 border" style={{ background: "#FEF2F2", borderColor: "#FECACA" }}>
        <div className="flex items-center gap-2" style={{ color: "#DC2626" }}>
          <AlertCircle className="w-5 h-5" />
          <span>Kunde inte ladda historik. Försök igen senare.</span>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6 border" style={{ background: "#F8F6F1", borderColor: "#E8E5DE" }}>
        <div className="flex items-center gap-2" style={{ color: "#9CA3AF" }}>
          <History className="w-5 h-5 animate-spin" />
          <span>Laddar historik...</span>
        </div>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card className="p-6 border" style={{ background: "#F8F6F1", borderColor: "#E8E5DE" }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg border" style={{ background: "#F3E8FF", color: "#7C3AED", borderColor: "#DDD6FE" }}>
            <History className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold" style={{ color: "#1D2939" }}>Objektbeskrivningar</h3>
        </div>
        <p className="text-sm" style={{ color: "#9CA3AF" }}>Inga objektbeskrivningar ännu. Börja skapa beskrivningar för att bygga din historik.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 border" style={{ background: "#F8F6F1", borderColor: "#E8E5DE" }}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg border" style={{ background: "#F3E8FF", color: "#7C3AED", borderColor: "#DDD6FE" }}>
            <History className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold" style={{ color: "#1D2939" }}>Objektbeskrivningar</h3>
          <div className="text-xs px-2 py-1 rounded-md font-semibold" style={{ background: "#F3E8FF", color: "#7C3AED", border: "1px solid #DDD6FE" }}>Pro</div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          onClick={() => setShowSettings(!showSettings)}
          data-testid="button-history-settings"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {showSettings && (
        <div className="mb-4 p-4 rounded-lg border space-y-4" style={{ background: "#FAFAF7", borderColor: "#E8E5DE" }}>
          <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: "#1D2939" }}>
            <Settings className="w-4 h-4" />
            Inställningar
          </h4>

          <div className="flex items-start gap-2 p-3 rounded-lg border" style={{ background: "#FFFBEB", borderColor: "#FCD34D" }}>
            <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#D97706" }} />
            <p className="text-xs" style={{ color: "#92400E" }}>
              Din historik är kopplad till ditt konto. Om du raderar ditt konto kommer all historik att försvinna permanent.
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                data-testid="button-delete-all-history"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Radera all historik
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Är du säker?</AlertDialogTitle>
                <AlertDialogDescription>
                  Detta kommer permanent radera alla {history.length} sparade objektbeskrivningar. Denna åtgärd kan inte ångras.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  Avbryt
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => deleteAllMutation.mutate()}
                  data-testid="button-confirm-delete-all"
                >
                  {deleteAllMutation.isPending ? "Raderar..." : "Ja, radera allt"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <ScrollArea className="h-[400px] pr-4" data-testid="history-scroll-area">
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-lg border transition-colors hover:shadow-sm"
              style={{ background: "#fff", borderColor: "#E8E5DE" }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-xs px-2 py-1 rounded-md font-semibold" style={{ background: "#F3F4F6", color: "#6B7280", border: "1px solid #E5E7EB" }}>
                    {item.category}
                  </div>
                  <span className="text-xs flex items-center gap-1" style={{ color: "#9CA3AF" }}>
                    <Clock className="w-3 h-3" />
                    {formatDate(item.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    onClick={() => handleCopy(item.improvedPrompt, item.id)}
                    data-testid={`button-copy-history-${item.id}`}
                  >
                    {copiedId === item.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        data-testid={`button-delete-history-${item.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Radera objektbeskrivning?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Denna objektbeskrivning kommer permanent raderas och kan inte återställas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          Avbryt
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => deleteMutation.mutate(item.id)}
                          data-testid={`button-confirm-delete-${item.id}`}
                        >
                          Radera
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <p className="text-sm whitespace-pre-wrap line-clamp-3" style={{ color: "#374151" }} data-testid={`text-history-improved-${item.id}`}>
                {item.improvedPrompt}
              </p>

              <Button
                variant="ghost"
                size="sm"
                className="mt-3 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 gap-1 px-2"
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                data-testid={`button-expand-history-${item.id}`}
              >
                {expanded === item.id ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    Dölj original
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    Visa original
                  </>
                )}
              </Button>

              {expanded === item.id && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: "#E8E5DE" }}>
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Originaldata</span>
                  <p className="mt-2 text-sm whitespace-pre-wrap p-3 rounded-lg" style={{ color: "#6B7280", background: "#FAFAF7" }} data-testid={`text-history-original-${item.id}`}>
                    {item.originalPrompt}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
