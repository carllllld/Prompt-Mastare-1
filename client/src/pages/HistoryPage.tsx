import { useQuery } from "@tanstack/react-query";
import { Optimization } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, History } from "lucide-react";

export default function HistoryPage() {
  const { data: history, isLoading } = useQuery<Optimization[]>({
    queryKey: ["/api/optimizations"],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-2 mb-8">
        <History className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold text-gray-900">Din Historik</h1>
      </div>

      {!history || history.length === 0 ? (
        <p className="text-gray-500 italic">Du har inte skapat några beskrivningar ännu.</p>
      ) : (
        <div className="grid gap-6">
          {history.map((item) => (
            <Card key={item.id} className="overflow-hidden border-l-4 border-l-primary">
              <CardHeader className="bg-gray-50/50">
                <CardTitle className="text-lg flex justify-between items-center">
                  <span>{item.category === "apartment" ? "Lägenhet" : "Villa"}</span>
                  <span className="text-sm font-normal text-gray-500">
                    {new Date(item.createdAt!).toLocaleDateString('sv-SE')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm text-primary mb-1 text-uppercase tracking-wider">Förbättrad Beskrivning</h4>
                    <p className="text-gray-700 whitespace-pre-wrap">{item.improvedPrompt}</p>
                  </div>
                  {item.socialCopy && (
                    <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                      <h4 className="font-semibold text-sm text-blue-800 mb-1">Social Media Copy</h4>
                      <p className="text-gray-700 whitespace-pre-wrap italic text-sm">{item.socialCopy}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}