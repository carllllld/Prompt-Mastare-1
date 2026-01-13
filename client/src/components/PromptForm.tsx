import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromptFormProps {
  onSubmit: (data: { prompt: string; type: string; platform: string }) => void;
  isPending: boolean;
  disabled?: boolean;
}

export function PromptForm({ onSubmit, isPending, disabled }: PromptFormProps) {
  const form = useForm({
    defaultValues: {
      prompt: "",
      type: "General",
    },
  });

  const onLocalSubmit = (values: any) => {
    onSubmit({ 
      prompt: values.prompt, 
      type: values.type, 
      platform: "general" 
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onLocalSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="!text-slate-700 font-bold uppercase tracking-wider text-xs">Category</FormLabel>
              <FormControl>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {["General", "Business", "Programming", "Creative"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => field.onChange(t)}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                        field.value === t ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="prompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="!text-slate-700 font-bold">Your Prompt</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  className="!bg-white !text-black border-slate-300 min-h-[140px] leading-relaxed focus:border-indigo-500 transition-all" 
                  placeholder="Paste the prompt you want to improve here..." 
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isPending || disabled}
          className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-lg shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Optimizing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Optimize Prompt
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
