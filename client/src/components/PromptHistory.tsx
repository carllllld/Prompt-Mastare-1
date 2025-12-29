import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  const isPro = userStatus?.plan === "pro";

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
    return date.toLocaleDateString("en-US", {
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
      <Card className="p-6 bg-red-500/10 border-red-500/20">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>Could not load history. Please try again later.</span>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6 bg-white/[0.02] border-white/[0.08]">
        <div className="flex items-center gap-2 text-white/50">
          <History className="w-5 h-5 animate-spin" />
          <span>Loading history...</span>
        </div>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card className="p-6 bg-white/[0.02] border-white/[0.08]">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400 border border-violet-500/20">
            <History className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Prompt History</h3>
        </div>
        <p className="text-white/50 text-sm">No optimizations yet. Start optimizing prompts to build your history.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white/[0.02] border-white/[0.08]">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400 border border-violet-500/20">
            <History className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">Prompt History</h3>
          <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30">Pro</Badge>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="text-white/50 hover:text-white hover:bg-white/10"
          onClick={() => setShowSettings(!showSettings)}
          data-testid="button-history-settings"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {showSettings && (
        <div className="mb-4 p-4 bg-white/[0.03] rounded-lg border border-white/[0.08] space-y-4">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </h4>
          
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-200/80">
              Your prompt history is linked to your account. If you delete your account, all history will be permanently lost.
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                data-testid="button-delete-all-history"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete all history
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-zinc-900 border-white/10">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Are you sure?</AlertDialogTitle>
                <AlertDialogDescription className="text-white/60">
                  This will permanently delete all {history.length} saved prompts. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => deleteAllMutation.mutate()}
                  data-testid="button-confirm-delete-all"
                >
                  {deleteAllMutation.isPending ? "Deleting..." : "Yes, delete all"}
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
              className="p-4 bg-white/[0.02] rounded-lg border border-white/[0.06] hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs bg-white/5 text-white/60 border-white/10">
                    {item.category}
                  </Badge>
                  <span className="text-xs text-white/40 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(item.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10"
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
                        className="h-8 w-8 text-white/50 hover:text-red-400 hover:bg-red-500/10"
                        data-testid={`button-delete-history-${item.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-zinc-900 border-white/10">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Delete prompt?</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/60">
                          This prompt will be permanently deleted and cannot be restored.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => deleteMutation.mutate(item.id)}
                          data-testid={`button-confirm-delete-${item.id}`}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <p className="text-white/80 text-sm whitespace-pre-wrap line-clamp-3" data-testid={`text-history-improved-${item.id}`}>
                {item.improvedPrompt}
              </p>

              <Button
                variant="ghost"
                size="sm"
                className="mt-3 text-xs text-white/40 hover:text-white/70 hover:bg-white/5 gap-1 px-2"
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                data-testid={`button-expand-history-${item.id}`}
              >
                {expanded === item.id ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    Hide original
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    Show original
                  </>
                )}
              </Button>

              {expanded === item.id && (
                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                  <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Original prompt</span>
                  <p className="mt-2 text-white/50 text-sm whitespace-pre-wrap bg-white/[0.02] p-3 rounded-lg" data-testid={`text-history-original-${item.id}`}>
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
