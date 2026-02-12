import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { usePromptComments, type SharedPrompt, type PromptComment } from "@/hooks/use-teams";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Lock, Unlock, Sparkles, Send, Users, Copy, Check } from "lucide-react";

const AVATAR_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", 
  "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#6366f1"
];

function getInitials(email: string, displayName: string | null): string {
  if (displayName) {
    return displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  }
  return email[0].toUpperCase();
}

function getAvatarColor(userId: string, customColor?: string | null): string {
  if (customColor) return customColor;
  const index = userId.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

interface PresenceUser {
  userId: string;
  lastSeen: string;
  cursorPosition: number | null;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarColor: string | null;
  };
}

export default function PromptEditor() {
  const [, params] = useRoute("/prompts/:id");
  const promptId = params?.id ? parseInt(params.id) : null;
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: prompt, isLoading } = useQuery<SharedPrompt>({
    queryKey: ["/api/prompts", promptId],
    enabled: !!promptId,
  });

  const { data: presence } = useQuery<PresenceUser[]>({
    queryKey: ["/api/prompts", promptId, "presence"],
    enabled: !!promptId,
    refetchInterval: 5000,
  });

  const { comments, isLoading: isLoadingComments, addComment, isAdding } = usePromptComments(promptId);

  const [content, setContent] = useState("");
  const [optimizedContent, setOptimizedContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [copied, setCopied] = useState(false);

  const { isConnected, subscribe, updatePresence, lockPrompt, unlockPrompt, broadcastPromptUpdate } = useWebSocket(
    user?.id,
    prompt?.teamId || null,
    promptId
  );

  useEffect(() => {
    if (prompt) {
      setContent(prompt.content);
      setOptimizedContent(prompt.optimizedContent || "");
    }
  }, [prompt]);

  useEffect(() => {
    if (promptId && user?.id) {
      updatePresence(prompt?.teamId || null, promptId);
    }
  }, [promptId, user?.id, prompt?.teamId, updatePresence]);

  useEffect(() => {
    const unsubscribeLocked = subscribe("prompt:locked", (msg) => {
      if (msg.promptId === promptId) {
        queryClient.invalidateQueries({ queryKey: ["/api/prompts", promptId] });
      }
    });

    const unsubscribeUnlocked = subscribe("prompt:unlocked", (msg) => {
      if (msg.promptId === promptId) {
        queryClient.invalidateQueries({ queryKey: ["/api/prompts", promptId] });
      }
    });

    const unsubscribeUpdated = subscribe("prompt:updated", (msg) => {
      if (msg.promptId === promptId && msg.updatedBy !== user?.id) {
        if (msg.changes.content) setContent(msg.changes.content);
        if (msg.changes.optimizedContent) setOptimizedContent(msg.changes.optimizedContent);
      }
    });

    const unsubscribeComment = subscribe("comment:added", (msg) => {
      if (msg.promptId === promptId) {
        queryClient.invalidateQueries({ queryKey: ["/api/prompts", promptId, "comments"] });
      }
    });

    return () => {
      unsubscribeLocked();
      unsubscribeUnlocked();
      unsubscribeUpdated();
      unsubscribeComment();
    };
  }, [promptId, user?.id, subscribe, queryClient]);

  const updatePromptMutation = useMutation({
    mutationFn: async (data: { content?: string; optimizedContent?: string; status?: string }) => {
      const response = await apiRequest("PATCH", `/api/prompts/${promptId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prompts", promptId] });
    },
  });

  const lockMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/prompts/${promptId}/lock`, {});
      return response.json();
    },
    onSuccess: () => {
      setIsEditing(true);
      lockPrompt(promptId!);
      queryClient.invalidateQueries({ queryKey: ["/api/prompts", promptId] });
    },
    onError: (err: any) => {
      toast({ title: "Cannot edit", description: err.message || "This prompt is being edited by someone else", variant: "destructive" });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/prompts/${promptId}/unlock`, {});
      return response.json();
    },
    onSuccess: () => {
      setIsEditing(false);
      unlockPrompt(promptId!);
      queryClient.invalidateQueries({ queryKey: ["/api/prompts", promptId] });
    },
  });

  const handleSave = async () => {
    try {
      await updatePromptMutation.mutateAsync({ content, optimizedContent });
      broadcastPromptUpdate(promptId!, { content, optimizedContent });
      await unlockMutation.mutateAsync();
      toast({ title: "Saved", description: "Your changes have been saved." });
    } catch (err) {
      toast({ title: "Error", description: "Could not save changes", variant: "destructive" });
    }
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      const response = await apiRequest("POST", "/api/optimize", { prompt: content, type: "General" });
      const result = await response.json();
      setOptimizedContent(result.improvedPrompt);
      await updatePromptMutation.mutateAsync({ 
        optimizedContent: result.improvedPrompt,
        status: "optimized" 
      });
      broadcastPromptUpdate(promptId!, { optimizedContent: result.improvedPrompt });
      toast({ title: "Optimized!", description: "Your prompt has been enhanced." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Could not optimize prompt", variant: "destructive" });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await addComment(newComment.trim());
      setNewComment("");
    } catch (err) {
      toast({ title: "Error", description: "Could not add comment", variant: "destructive" });
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Text copied to clipboard." });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <CardTitle>Sign in Required</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Link href="/">
              <Button data-testid="button-go-home">Go to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !prompt) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-64" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
            <div>
              <Skeleton className="h-96" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  const canEdit = !prompt.isLocked || prompt.lockedBy === user?.id;
  const otherViewers = presence?.filter(p => p.userId !== user?.id) || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/teams">
              <Button variant="ghost" size="icon" data-testid="button-back-teams">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
            {otherViewers.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="flex -space-x-2">
                  {otherViewers.slice(0, 3).map(viewer => (
                    <Avatar key={viewer.userId} className="h-7 w-7 border-2 border-background">
                      <AvatarFallback 
                        style={{ backgroundColor: getAvatarColor(viewer.userId, viewer.user.avatarColor) }}
                        className="text-white text-xs"
                      >
                        {getInitials(viewer.user.email, viewer.user.displayName)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {otherViewers.length > 3 && (
                    <Avatar className="h-7 w-7 border-2 border-background">
                      <AvatarFallback className="text-xs">+{otherViewers.length - 3}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            )}

            {isEditing ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => unlockMutation.mutate()} data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={updatePromptMutation.isPending} data-testid="button-save">
                  {updatePromptMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            ) : (
              <Button 
                onClick={() => lockMutation.mutate()} 
                disabled={!canEdit || lockMutation.isPending}
                data-testid="button-edit"
              >
                {prompt.isLocked && prompt.lockedBy !== user?.id ? (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Locked
                  </>
                ) : (
                  "Edit"
                )}
              </Button>
            )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Original Prompt</CardTitle>
                  {!isEditing && (
                    <Button variant="ghost" size="sm" onClick={() => handleCopy(content)} data-testid="button-copy-original">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                    data-testid="textarea-prompt-content"
                  />
                ) : (
                  <div className="min-h-[200px] p-3 rounded-lg bg-muted font-mono text-sm whitespace-pre-wrap">
                    {content}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Optimized Prompt
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {optimizedContent && (
                      <Button variant="ghost" size="sm" onClick={() => handleCopy(optimizedContent)} data-testid="button-copy-optimized">
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      onClick={handleOptimize}
                      disabled={isOptimizing || !content.trim()}
                      data-testid="button-optimize"
                    >
                      {isOptimizing ? "Optimizing..." : "Optimize"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="min-h-[200px] p-3 rounded-lg bg-muted font-mono text-sm whitespace-pre-wrap">
                  {optimizedContent || (
                    <span className="text-muted-foreground italic">
                      Click "Optimize" to enhance this prompt with AI
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Comments ({comments.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                    data-testid="input-comment"
                  />
                  <Button 
                    size="icon" 
                    onClick={handleAddComment}
                    disabled={isAdding || !newComment.trim()}
                    data-testid="button-add-comment"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                {isLoadingComments ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No comments yet. Be the first to comment!
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {comments.map(comment => (
                      <div key={comment.id} className="flex gap-3" data-testid={`comment-${comment.id}`}>
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback 
                            style={{ backgroundColor: getAvatarColor(comment.userId, comment.user.avatarColor) }}
                            className="text-white text-xs"
                          >
                            {getInitials(comment.user.email, comment.user.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {comment.user.displayName || comment.user.email.split("@")[0]}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
