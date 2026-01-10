import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOptimizationSchema } from "@shared/schema";
import { Form, FormControl,FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Building2, Home, Sparkles, Loader2, MapPin, Maximize, FileText } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface PromptFormProps {
  onSubmit: (data: { prompt: string; type: "apartment" | "house" }) => void;
  isPending: boolean;
  disabled?: boolean;
  clearOnSuccess?: boolean;
}

export function PromptForm({ onSubmit, isPending, disabled }: PromptFormProps) {
  const [propertyType, setPropertyType] = useState<"apartment" | "house">("apartment");

  const form = useForm({
    defaultValues: {
      address: "",
      size: "",
      features: "",
    },
  });

  const handleSubmit = (values: any) => {
    // Vi kombinerar fälten till en snygg prompt för AI:n
    const combinedPrompt = `
      Typ: ${propertyType === "apartment" ? "Lägenhet" : "Villa"}
      Adress: ${values.address}
      Storlek: ${values.size}
      Egenskaper/Anteckningar: ${values.features}
    `;
    onSubmit({ prompt: combinedPrompt, type: propertyType });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {/* Typ av bostad - Toggle */}
        <div className="flex justify-center p-1 bg-slate-100 rounded-xl w-fit mx-auto border border-slate-200">
          <button
            type="button"
            onClick={() => setPropertyType("apartment")}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all",
              propertyType === "apartment" 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Building2 className="w-4 h-4" />
            Lägenhet
          </button>
          <button
            type="button"
            onClick={() => setPropertyType("house")}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all",
              propertyType === "house" 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Home className="w-4 h-4" />
            Villa / Radhus
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Adress */}
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" /> Adress
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="t.ex. Vasagatan 12" 
                    {...field} 
                    className="bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 h-11"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Storlek */}
          <FormField
            control={form.control}
            name="size"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                  <Maximize className="w-4 h-4 text-slate-400" /> Antal rum & kvm
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="t.ex. 3 rok, 78 kvm" 
                    {...field} 
                    className="bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 h-11"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Egenskaper */}
        <FormField
          control={form.control}
          name="features"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" /> Beskriv bostaden
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Skriv in dina stödanteckningar här... (t.ex. nyrenoverat kök, öppen spis, söderbalkong, stabil förening)"
                  className="min-h-[150px] bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 resize-none p-4 leading-relaxed"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isPending || disabled}
          className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Skriver objektbeskrivning...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generera proffsig annonstext
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}