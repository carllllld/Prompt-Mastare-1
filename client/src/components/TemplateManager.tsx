import { useState } from "react";
import { Save, FolderOpen, Trash2, Check, Building2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { useTemplates } from "@/hooks/use-templates";
import type { FormTemplate } from "@shared/schema";

interface TemplateManagerProps {
  currentFormData: Record<string, any>;
  onLoadTemplate: (data: Record<string, any>) => void;
}

export function TemplateManager({ currentFormData, onLoadTemplate }: TemplateManagerProps) {
  const { templates, createTemplate, deleteTemplate, useTemplate, isLoading } = useTemplates();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    createTemplate({
      name: templateName.trim(),
      description: undefined,
      templateData: currentFormData,
    });
    setTemplateName("");
    setShowSaveDialog(false);
  };

  const handleLoadTemplate = (template: FormTemplate) => {
    useTemplate(template.id);
    onLoadTemplate(template.templateData);
    setShowLoadDialog(false);
  };

  const handleDeleteTemplate = (id: number) => {
    if (confirm("Ta bort denna mall?")) {
      deleteTemplate(id);
    }
  };

  // Extract summary from template data
  const getTemplateSummary = (data: Record<string, any>) => {
    const parts: string[] = [];
    if (data.propertyType) {
      const types: Record<string, string> = { apartment: "Lägenhet", house: "Hus", townhouse: "Radhus", villa: "Villa" };
      parts.push(types[data.propertyType] || data.propertyType);
    }
    if (data.area) parts.push(data.area);
    if (data.livingArea) parts.push(`${data.livingArea} kvm`);
    return parts.join(" · ") || "Ingen data";
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <Building2 className="w-4 h-4 text-gray-400" />
      <span className="text-xs text-gray-500">Mallar:</span>

      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="text-xs text-gray-600 hover:text-gray-900 underline underline-offset-2"
          >
            Hämta ({templates.length})
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sparade mallar</DialogTitle>
            <DialogDescription>
              Fyll i formuläret snabbt med sparad objektdata — BRF-info, områdesbeskrivningar, 
              standardvärden du använder ofta.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-6 text-center text-gray-500 text-sm">Laddar...</div>
          ) : templates.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-gray-600 mb-1">Inga mallar ännu</p>
              <p className="text-xs text-gray-500">
                Fyll i formuläret och klicka "Spara" för att skapa en mall
              </p>
            </div>
          ) : (
            <div className="space-y-2 py-2 max-h-[50vh] overflow-y-auto">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2.5 hover:border-gray-400 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">{template.name}</div>
                    <div className="text-xs text-gray-500">{getTemplateSummary(template.templateData)}</div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleLoadTemplate(template)} className="h-7 text-xs px-2">
                      <Check className="w-3 h-3 mr-1" />
                      Använd
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <span className="text-gray-300">|</span>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="text-xs text-gray-600 hover:text-gray-900 underline underline-offset-2"
          >
            Spara nuvarande
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Spara som mall</DialogTitle>
            <DialogDescription>
              Spara formulärets nuvarande värden. Bra för BRF-info, områdesbeskrivningar 
              eller standardvärden du återanvänder.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Input
              placeholder="T.ex. BRF Storgatan, Villaområde Söder..."
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveTemplate()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Avbryt</Button>
            <Button onClick={handleSaveTemplate} disabled={!templateName.trim()}>
              <Save className="w-4 h-4 mr-1.5" />
              Spara
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
