import { useState } from "react";
import { Save, FolderOpen, Trash2, Edit2, Check, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
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
  const [templateDescription, setTemplateDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;

    createTemplate({
      name: templateName.trim(),
      description: templateDescription.trim() || undefined,
      templateData: currentFormData,
    });

    setTemplateName("");
    setTemplateDescription("");
    setShowSaveDialog(false);
  };

  const handleLoadTemplate = (template: FormTemplate) => {
    useTemplate(template.id);
    onLoadTemplate(template.templateData);
    setShowLoadDialog(false);
  };

  const handleDeleteTemplate = (id: number) => {
    if (confirm("Är du säker på att du vill ta bort denna mall?")) {
      deleteTemplate(id);
    }
  };

  return (
    <div className="flex gap-2">
      {/* Save Template Button */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Save className="w-4 h-4" />
            Spara som mall
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Spara formulär som mall</DialogTitle>
            <DialogDescription>
              Spara nuvarande formulärdata som en återanvändbar mall. Perfekt för BRF-info, 
              lägesbeskrivningar och annan information som återkommer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Mallnamn</label>
              <Input
                placeholder="T.ex. Storgatan BRF, Villaområde Söder..."
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveTemplate()}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Beskrivning (valfritt)</label>
              <Textarea
                placeholder="Vad innehåller denna mall?"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Avbryt
            </Button>
            <Button onClick={handleSaveTemplate} disabled={!templateName.trim()}>
              Spara mall
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Template Button */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <FolderOpen className="w-4 h-4" />
            Använd mall
            {templates.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium">
                {templates.length}
              </span>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Välj mall</DialogTitle>
            <DialogDescription>
              Ladda en sparad mall för att snabbt fylla i formuläret
            </DialogDescription>
          </DialogHeader>
          
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Laddar mallar...</div>
          ) : templates.length === 0 ? (
            <div className="py-8 text-center">
              <FolderOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600 mb-2">Inga sparade mallar än</p>
              <p className="text-sm text-gray-500">
                Fyll i formuläret och klicka "Spara som mall" för att skapa din första mall
              </p>
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 mb-1">{template.name}</h4>
                      {template.description && (
                        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>Använd {template.usedCount} gånger</span>
                        <span>•</span>
                        <span>
                          Skapad {new Date(template.createdAt).toLocaleDateString("sv-SE")}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleLoadTemplate(template)}
                        className="gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Använd
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
