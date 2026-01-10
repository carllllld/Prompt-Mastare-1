import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Home, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface PromptFormProps {
  onSubmit: (data: { prompt: string; type: "apartment" | "house" }) => void;
  isPending: boolean;
  disabled?: boolean;
}

export function PromptForm({ onSubmit, isPending, disabled }: PromptFormProps) {
  const [propertyType, setPropertyType] = useState<"apartment" | "house">("apartment");

  const form = useForm({
    defaultValues: { address: "", size: "", features: "" },
  });

  const onLocalSubmit = (values: any) => {
    const combinedPrompt = `Typ: ${propertyType}, Adress: ${values.address}, Storlek: ${values.size}, Info: ${values.features}`;
    onSubmit({ prompt: combinedPrompt, type: propertyType });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onLocalSubmit)} className="space-y-6">
        {/* Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setPropertyType("apartment")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all",
              propertyType === "apartment" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
            )}
          >
            <Building2 className="w-4 h-4" /> Lägenhet
          </button>
          <button
            type="button"
            onClick={() => setPropertyType("house")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all",
              propertyType === "house" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
            )}
          >
            <Home className="w-4 h-4" /> Villa
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="!text-slate-800 font-bold">Adress</FormLabel>
                <FormControl>
                  <Input {...field} className="!bg-white !text-black border-slate-300 h-12" placeholder="Gata 1" />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="size"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="!text-slate-800 font-bold">Storlek</FormLabel>
                <FormControl>
                  <Input {...field} className="!bg-white !text-black border-slate-300 h-12" placeholder="t.ex. 3 rok, 75 kvm" />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="features"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="!text-slate-800 font-bold">Information</FormLabel>
              <FormControl>
                <Textarea {...field} className="!bg-white !text-black border-slate-300 min-h-[120px]" placeholder="Berätta om bostaden..." />
              </FormControl>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isPending || disabled}
          className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-lg transition-transform active:scale-[0.98]"
        >
          {isPending ? <Loader2 className="animate-spin" /> : <><Sparkles className="mr-2" /> Skapa annons</>}
        </Button>
      </form>
    </Form>
  );
}