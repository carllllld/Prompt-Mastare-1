import { useState } from "react";
import { useTeams, useTeam, useSharedPrompts, type SharedPrompt } from "@/hooks/use-teams";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, FileText, ArrowLeft, Copy, Lock, Trash2 } from "lucide-react";

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

function getAvatarColor(userId: string, customColor: string | null): string {
  if (customColor) return customColor;
  const index = userId.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export default function Teams() {
  const { user, isAuthenticated } = useAuth();
  const { teams, isLoading: isLoadingTeams, createTeam, isCreatingTeam } = useTeams();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <CardTitle>Sign in Required</CardTitle>
            <CardDescription>Please sign in to access team collaboration features</CardDescription>
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

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    try {
      const team = await createTeam(newTeamName.trim());
      setSelectedTeamId(team.id);
      setNewTeamName("");
      setIsCreateDialogOpen(false);
      toast({ title: "Team created!", description: `${team.name} is ready for collaboration.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Could not create team", variant: "destructive" });
    }
  };

  if (selectedTeamId) {
    return <TeamDashboard teamId={selectedTeamId} onBack={() => setSelectedTeamId(null)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-home">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">My Teams</h1>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-team">
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a New Team</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  placeholder="Team name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
                  data-testid="input-team-name"
                />
                <Button 
                  className="w-full" 
                  onClick={handleCreateTeam}
                  disabled={isCreatingTeam || !newTeamName.trim()}
                  data-testid="button-submit-team"
                >
                  {isCreatingTeam ? "Creating..." : "Create Team"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isLoadingTeams ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : teams.length === 0 ? (
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-8 pb-8">
              <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No teams yet</h2>
              <p className="text-muted-foreground mb-6">
                Create a team to start collaborating on prompts with others
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-team">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Team
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map(team => (
              <Card 
                key={team.id} 
                className="hover-elevate cursor-pointer transition-all"
                onClick={() => setSelectedTeamId(team.id)}
                data-testid={`card-team-${team.id}`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {team.name}
                  </CardTitle>
                  <CardDescription>
                    Created {new Date(team.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function TeamDashboard({ teamId, onBack }: { teamId: number; onBack: () => void }) {
  const { team, members, isLoading, inviteMember, isInviting } = useTeam(teamId);
  const { prompts, isLoading: isLoadingPrompts, createPrompt, deletePrompt, isCreating } = useSharedPrompts(teamId);
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isNewPromptDialogOpen, setIsNewPromptDialogOpen] = useState(false);
  const [newPromptTitle, setNewPromptTitle] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState<SharedPrompt | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      const result = await inviteMember(inviteEmail.trim());
      const inviteUrl = `${window.location.origin}/teams/join/${result.token}`;
      await navigator.clipboard.writeText(inviteUrl);
      toast({ title: "Invite sent!", description: "The invite link has been copied to your clipboard." });
      setInviteEmail("");
      setIsInviteDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Could not create invite", variant: "destructive" });
    }
  };

  const handleCreatePrompt = async () => {
    if (!newPromptTitle.trim() || !newPromptContent.trim()) return;
    try {
      await createPrompt({ title: newPromptTitle.trim(), content: newPromptContent.trim() });
      setNewPromptTitle("");
      setNewPromptContent("");
      setIsNewPromptDialogOpen(false);
      toast({ title: "Prompt created!", description: "Your prompt has been added to the team library." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Could not create prompt", variant: "destructive" });
    }
  };

  const handleDeletePrompt = async (promptId: number) => {
    try {
      await deletePrompt(promptId);
      toast({ title: "Deleted", description: "Prompt has been removed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Could not delete prompt", variant: "destructive" });
    }
  };

  if (selectedPrompt) {
    return (
      <CollaborativeEditor 
        prompt={selectedPrompt} 
        teamId={teamId}
        onBack={() => setSelectedPrompt(null)} 
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-teams">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">{team?.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-invite-member">
                  <Users className="h-4 w-4 mr-2" />
                  Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    data-testid="input-invite-email"
                  />
                  <Button 
                    className="w-full" 
                    onClick={handleInvite}
                    disabled={isInviting || !inviteEmail.trim()}
                    data-testid="button-send-invite"
                  >
                    {isInviting ? "Creating invite..." : "Create Invite Link"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isNewPromptDialogOpen} onOpenChange={setIsNewPromptDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-prompt">
                  <Plus className="h-4 w-4 mr-2" />
                  New Prompt
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Shared Prompt</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    placeholder="Prompt title"
                    value={newPromptTitle}
                    onChange={(e) => setNewPromptTitle(e.target.value)}
                    data-testid="input-prompt-title"
                  />
                  <textarea
                    className="w-full min-h-[120px] rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Enter your prompt content..."
                    value={newPromptContent}
                    onChange={(e) => setNewPromptContent(e.target.value)}
                    data-testid="input-prompt-content"
                  />
                  <Button 
                    className="w-full" 
                    onClick={handleCreatePrompt}
                    disabled={isCreating || !newPromptTitle.trim() || !newPromptContent.trim()}
                    data-testid="button-submit-prompt"
                  >
                    {isCreating ? "Creating..." : "Create Prompt"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-4">
          <div className="lg:col-span-3 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Shared Prompts
              </h2>
              {isLoadingPrompts ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2, 3, 4].map(i => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : prompts.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No prompts yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first shared prompt to start collaborating</p>
                    <Button onClick={() => setIsNewPromptDialogOpen(true)} data-testid="button-create-first-prompt">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Prompt
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {prompts.map(prompt => (
                    <Card 
                      key={prompt.id} 
                      className="hover-elevate cursor-pointer"
                      onClick={() => setSelectedPrompt(prompt)}
                      data-testid={`card-prompt-${prompt.id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            {prompt.isLocked && <Lock className="h-4 w-4 text-orange-500" />}
                            {prompt.title}
                          </CardTitle>
                          <div className="flex items-center gap-1">
                            <Badge variant={prompt.status === "optimized" ? "default" : "secondary"} className="text-xs">
                              {prompt.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePrompt(prompt.id);
                              }}
                              data-testid={`button-delete-prompt-${prompt.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                        <CardDescription className="line-clamp-2 text-xs">
                          {prompt.content.slice(0, 100)}...
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground">
                          Updated {new Date(prompt.updatedAt).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members ({members.length})
              </h2>
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {members.map(member => (
                      <div key={member.id} className="flex items-center gap-3" data-testid={`member-${member.userId}`}>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback 
                            style={{ backgroundColor: getAvatarColor(member.userId, member.user.avatarColor) }}
                            className="text-white text-xs"
                          >
                            {getInitials(member.user.email, member.user.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member.user.displayName || member.user.email.split("@")[0]}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function CollaborativeEditor({ prompt, teamId, onBack }: { prompt: SharedPrompt; teamId: number; onBack: () => void }) {
  const [, setLocation] = useLocation();
  
  setLocation(`/prompts/${prompt.id}`);
  return null;
}
