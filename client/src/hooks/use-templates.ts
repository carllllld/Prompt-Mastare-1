import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";
import type { FormTemplate } from "@shared/schema";

interface CreateTemplateData {
  name: string;
  description?: string;
  templateData: Record<string, any>;
}

interface UpdateTemplateData {
  name?: string;
  description?: string;
  templateData?: Record<string, any>;
}

export function useTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all templates
  const { data: templates = [], isLoading } = useQuery<FormTemplate[]>({
    queryKey: ["/api/templates"],
  });

  // Create template
  const createTemplate = useMutation({
    mutationFn: async (data: CreateTemplateData) => {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Kunde inte spara mall");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Mall sparad!",
        description: "Mallen har sparats och kan nu återanvändas",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Kunde inte spara mall",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update template
  const updateTemplate = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateTemplateData }) => {
      const response = await fetch(`/api/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Kunde inte uppdatera mall");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Mall uppdaterad!",
        description: "Ändringarna har sparats",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Kunde inte uppdatera mall",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete template
  const deleteTemplate = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/templates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Kunde inte ta bort mall");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Mall borttagen",
        description: "Mallen har tagits bort",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Kunde inte ta bort mall",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Use template (increment usage count)
  const useTemplate = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/templates/${id}/use`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Kunde inte använda mall");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
    },
  });

  return {
    templates,
    isLoading,
    createTemplate: createTemplate.mutate,
    updateTemplate: updateTemplate.mutate,
    deleteTemplate: deleteTemplate.mutate,
    useTemplate: useTemplate.mutate,
    isCreating: createTemplate.isPending,
    isUpdating: updateTemplate.isPending,
    isDeleting: deleteTemplate.isPending,
  };
}
