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

// Fields that are reusable across objects in the same area/BRF
const REUSABLE_FIELDS = [
  "area", "brfName", "neighborhood", "transport",
  "heating", "konstruktionMaterial", "taktyp",
  "platform", "writingStyle",
] as const;

interface TemplateManagerProps {
  currentFormData: Record<string, any>;
  onLoadTemplate: (data: Record<string, any>) => void;
}

export function TemplateManager({ currentFormData, onLoadTemplate }: TemplateManagerProps) {
  const { templates, createTemplate, deleteTemplate, useTemplate, isLoading } = useTemplates();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");

  // Only save reusable fields (area/BRF data, not object-specific)
  const extractReusableData = (data: Record<string, any>) => {
    const reusable: Record<string, any> = {};
    for (const key of REUSABLE_FIELDS) {
      if (data[key] && String(data[key]).trim()) {
        reusable[key] = data[key];
      }
    }
    return reusable;
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    const reusableData = extractReusableData(currentFormData);
    createTemplate({
      name: templateName.trim(),
      description: undefined,
      templateData: reusableData,
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

  const getTemplateSummary = (data: Record<string, any>) => {
    const parts: string[] = [];
    if (data.brfName) parts.push(data.brfName);
    if (data.area) parts.push(data.area);
    if (data.neighborhood) parts.push("Område");
    if (data.transport) parts.push("Kommunikationer");
    return parts.join(" · ") || "Tom mall";
  };

  const hasReusableData = REUSABLE_FIELDS.some(
    (key) => currentFormData[key] && String(currentFormData[key]).trim()
  );

  return (
    <div className="flex items-center gap-2 text-sm">
      <Building2 className="w-3.5 h-3.5 text-gray-400" />

      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogTrigger asChild>
          <button type="button" className="text-xs text-gray-600 hover:text-gray-900 underline underline-offset-2">
            Områdesmallar{templates.length > 0 ? ` (${templates.length})` : ""}
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Områdesmallar</DialogTitle>
            <DialogDescription>
              Säljer du flera objekt i samma BRF eller område? Spara gemensam info 
              (förening, kommunikationer, område) och fyll i formuläret med ett klick. 
              Objektspecifik data som adress, rum och kök sparas aldrig.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-6 text-center text-gray-500 text-sm">Laddar...</div>
          ) : templates.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-gray-600 mb-1">Inga mallar ännu</p>
              <p className="text-xs text-gray-500">
                Fyll i BRF-namn, område och kommunikationer, sedan klicka "Spara"
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

      {hasReusableData && (
        <>
          <span className="text-gray-300">|</span>
          <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <DialogTrigger asChild>
              <button type="button" className="text-xs text-gray-600 hover:text-gray-900 underline underline-offset-2">
                Spara område
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Spara områdesmall</DialogTitle>
                <DialogDescription>
                  Sparar BRF-namn, område, kommunikationer, uppvärmning och plattformsinställningar. 
                  Objektspecifik data (adress, rum, kök etc.) sparas inte.
                </DialogDescription>
              </DialogHeader>
              <div className="py-3">
                <Input
                  placeholder="T.ex. BRF Storgatan, Södermalm, Villaområde Enskede..."
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
        </>
      )}
    </div>
  );
}
