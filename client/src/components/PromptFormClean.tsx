/**
 * PromptFormClean - Helt omdesignad, ren och professionell form
 * 
 * Design principer:
 * - Enkel, tydlig layout
 * - Minimal scrolling
 * - Fokus på att hjälpa användaren få bästa möjliga resultat
 * - Ser mänskligt designad ut, inte AI-genererad
 */

import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, HelpCircle } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FormData {
  propertyType: "apartment" | "house" | "townhouse" | "villa";
  address: string;
  area: string;
  livingArea: string;
  rooms: string;
  condition: string;
  keyFeatures: string;
  layoutDescription: string;
  platform: "hemnet" | "booli" | "general";
  writingStyle: "factual" | "balanced" | "selling";
}

interface Props {
  onSubmit: (data: any) => void;
  isPending: boolean;
  disabled?: boolean;
  isPro?: boolean;
}

export function PromptFormClean({ onSubmit, isPending, disabled, isPro = false }: Props) {
  const form = useForm<FormData>({
    defaultValues: {
      propertyType: "apartment",
      address: "",
      area: "",
      livingArea: "",
      rooms: "3",
      condition: "Gott skick",
      keyFeatures: "",
      layoutDescription: "",
      platform: "hemnet",
      writingStyle: "balanced",
    },
  });

  const handleSubmit = (values: FormData) => {
    // Bygg prompt från formulärdata
    const prompt = `
OBJEKTINFORMATION

Typ: ${values.propertyType === "apartment" ? "Lägenhet" : values.propertyType === "house" ? "Hus" : values.propertyType === "townhouse" ? "Radhus" : "Villa"}
Adress: ${values.address}
Område: ${values.area}
Boarea: ${values.livingArea} kvm
Antal rum: ${values.rooms}
Skick: ${values.condition}

VIKTIGA EGENSKAPER
${values.keyFeatures}

PLANLÖSNING
${values.layoutDescription}
    `.trim();

    onSubmit({
      prompt,
      type: values.propertyType,
      platform: values.platform,
      writingStyle: values.writingStyle,
      propertyData: values,
    });
  };

  return (
    <TooltipProvider>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          
          {/* Grundläggande information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <h3 className="text-sm font-semibold text-foreground">Grundläggande information</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-xs">Fyll i de viktigaste uppgifterna om fastigheten. Ju mer detaljer, desto bättre blir texten.</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="propertyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Typ av bostad</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="apartment">Lägenhet</SelectItem>
                        <SelectItem value="house">Hus</SelectItem>
                        <SelectItem value="townhouse">Radhus</SelectItem>
                        <SelectItem value="villa">Villa</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Adress</FormLabel>
                    <FormControl>
                      <Input placeholder="T.ex. Karlavägen 12" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Område/Stadsdel</FormLabel>
                    <FormControl>
                      <Input placeholder="T.ex. Östermalm" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="livingArea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Boarea (kvm)</FormLabel>
                    <FormControl>
                      <Input placeholder="T.ex. 76" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Antal rum</FormLabel>
                    <FormControl>
                      <Input placeholder="T.ex. 3" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Skick</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Nyskick">Nyskick</SelectItem>
                        <SelectItem value="Mycket gott skick">Mycket gott skick</SelectItem>
                        <SelectItem value="Gott skick">Gott skick</SelectItem>
                        <SelectItem value="Bra skick">Bra skick</SelectItem>
                        <SelectItem value="Behöver renoveras">Behöver renoveras</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Viktiga egenskaper */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <h3 className="text-sm font-semibold text-foreground">Vad gör bostaden speciell?</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-xs">Beskriv de viktigaste säljpunkterna. T.ex. renoverat kök, balkong i söderläge, nära tunnelbana.</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <FormField
              control={form.control}
              name="keyFeatures"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Viktiga egenskaper och säljpunkter</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="T.ex. Renoverat kök 2022, balkong i söderläge, nära T-bana, helkaklat badrum..."
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Planlösning */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <h3 className="text-sm font-semibold text-foreground">Planlösning (valfritt)</h3>
            </div>

            <FormField
              control={form.control}
              name="layoutDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium">Beskriv planlösningen</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="T.ex. Öppen planlösning mellan kök och vardagsrum, två sovrum mot gården..."
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Inställningar */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <h3 className="text-sm font-semibold text-foreground">Inställningar</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Plattform</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="hemnet">Hemnet</SelectItem>
                        <SelectItem value="booli">Booli</SelectItem>
                        <SelectItem value="general">Allmän</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="writingStyle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Skrivstil</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="factual">Faktabaserad</SelectItem>
                        <SelectItem value="balanced">Balanserad</SelectItem>
                        <SelectItem value="selling">Säljande</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4">
            <Button
              type="submit"
              disabled={isPending || disabled}
              className="w-full h-12 text-base font-medium"
              size="lg"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Genererar texter...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generera 5 texter
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </TooltipProvider>
  );
}
