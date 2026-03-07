import { useMutation } from "@tanstack/react-query";
import { useRef, useCallback } from "react";
import { api, type OptimizeRequest, type OptimizeResponse } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { ErrorHandler } from "@/lib/error-handler";
import { queryClient } from "@/lib/queryClient";

interface LimitError extends Error {
  limitReached?: boolean;
}

interface ProgressEvent {
  type: "progress";
  step: number;
  total: number;
  message: string;
}

export type ProgressCallback = (event: ProgressEvent) => void;

async function streamOptimize(
  data: OptimizeRequest,
  onProgress?: ProgressCallback,
): Promise<OptimizeResponse> {
  const validated = api.optimize.input.parse(data);

  const response = await fetch(api.optimize.path, {
    method: api.optimize.method,
    headers: {
      "Content-Type": "application/json",
      "Accept": "text/event-stream",
    },
    body: JSON.stringify(validated),
    credentials: "include",
  });

  // Non-streaming error responses (4xx/5xx before stream starts)
  if (!response.ok) {
    const errorText = await response.text();
    let parsed: any = null;
    try { parsed = JSON.parse(errorText); } catch { }
    const error: any = new Error(parsed?.message || `HTTP ${response.status}: ${errorText}`);
    if (parsed?.limitReached || parsed?.upgradeRequired) error.limitReached = true;
    throw error;
  }

  // If server doesn't support streaming, fall back to JSON
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/event-stream")) {
    return response.json();
  }

  // Read NDJSON stream
  const reader = response.body?.getReader();
  if (!reader) return response.json();

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        if (event.type === "progress" && onProgress) {
          onProgress(event as ProgressEvent);
        } else if (event.type === "complete") {
          return event.data as OptimizeResponse;
        } else if (event.type === "error") {
          throw new Error(event.message || "Optimering misslyckades");
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue; // Skip malformed lines
        throw e;
      }
    }
  }

  // Process remaining buffer
  if (buffer.trim()) {
    try {
      const event = JSON.parse(buffer);
      if (event.type === "complete") return event.data as OptimizeResponse;
      if (event.type === "error") throw new Error(event.message);
    } catch { }
  }

  throw new Error("Strömmen avslutades utan resultat");
}

export function useOptimize() {
  const { toast } = useToast();
  const progressCallbackRef = useRef<ProgressCallback | undefined>();

  const setProgressCallback = useCallback((cb: ProgressCallback | undefined) => {
    progressCallbackRef.current = cb;
  }, []);

  const mutation = useMutation({
    mutationFn: async (data: OptimizeRequest): Promise<OptimizeResponse> => {
      return streamOptimize(data, progressCallbackRef.current);
    },
    onError: (error: LimitError) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/status"] });

      if (error.limitReached) {
        const appError = ErrorHandler.classifyError(error);
        ErrorHandler.logError(appError, 'useOptimize - limit reached');

        toast({
          title: 'Månadskvot uppnådd',
          description: error.message || 'Du har nått din månadsgräns. Uppgradera för fler genereringar.',
          variant: 'destructive',
        });
      } else {
        const appError = ErrorHandler.classifyError(error);
        ErrorHandler.logError(appError, 'useOptimize');

        const toastConfig = ErrorHandler.getToastConfig(appError);
        toast(toastConfig);
      }
    },
  });

  return { ...mutation, setProgressCallback };
}
