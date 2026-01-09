import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface Team {
  id: number;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: number;
  teamId: number;
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarColor: string | null;
  };
}

export interface SharedPrompt {
  id: number;
  teamId: number;
  creatorId: string;
  title: string;
  content: string;
  category: string | null;
  optimizedContent: string | null;
  status: string;
  isLocked: boolean | null;
  lockedBy: string | null;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromptComment {
  id: number;
  promptId: number;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarColor: string | null;
  };
}

export function useTeams() {
  const queryClient = useQueryClient();

  const { data: teams, isLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const createTeamMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/teams", { name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    },
  });

  return {
    teams: teams || [],
    isLoading,
    createTeam: createTeamMutation.mutateAsync,
    isCreatingTeam: createTeamMutation.isPending,
  };
}

export function useTeam(teamId: number | null) {
  const queryClient = useQueryClient();

  const { data: team, isLoading: isLoadingTeam } = useQuery<Team>({
    queryKey: ["/api/teams", teamId],
    enabled: !!teamId,
  });

  const { data: members, isLoading: isLoadingMembers } = useQuery<TeamMember[]>({
    queryKey: ["/api/teams", teamId, "members"],
    enabled: !!teamId,
  });

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", `/api/teams/${teamId}/invite`, { email });
      return response.json();
    },
  });

  return {
    team,
    members: members || [],
    isLoading: isLoadingTeam || isLoadingMembers,
    inviteMember: inviteMutation.mutateAsync,
    isInviting: inviteMutation.isPending,
  };
}

export function useSharedPrompts(teamId: number | null) {
  const queryClient = useQueryClient();

  const { data: prompts, isLoading } = useQuery<SharedPrompt[]>({
    queryKey: ["/api/teams", teamId, "prompts"],
    enabled: !!teamId,
  });

  const createPromptMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; category?: string }) => {
      const response = await apiRequest("POST", `/api/teams/${teamId}/prompts`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "prompts"] });
    },
  });

  const updatePromptMutation = useMutation({
    mutationFn: async ({ promptId, ...data }: { promptId: number; [key: string]: any }) => {
      const response = await apiRequest("PATCH", `/api/prompts/${promptId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "prompts"] });
    },
  });

  const deletePromptMutation = useMutation({
    mutationFn: async (promptId: number) => {
      await apiRequest("DELETE", `/api/prompts/${promptId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "prompts"] });
    },
  });

  return {
    prompts: prompts || [],
    isLoading,
    createPrompt: createPromptMutation.mutateAsync,
    updatePrompt: updatePromptMutation.mutateAsync,
    deletePrompt: deletePromptMutation.mutateAsync,
    isCreating: createPromptMutation.isPending,
  };
}

export function usePromptComments(promptId: number | null) {
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery<PromptComment[]>({
    queryKey: ["/api/prompts", promptId, "comments"],
    enabled: !!promptId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/prompts/${promptId}/comments`, { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prompts", promptId, "comments"] });
    },
  });

  return {
    comments: comments || [],
    isLoading,
    addComment: addCommentMutation.mutateAsync,
    isAdding: addCommentMutation.isPending,
  };
}
