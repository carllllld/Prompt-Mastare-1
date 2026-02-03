import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Optimization } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, ArrowLeft, Trash2, Copy, Clock } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function HistoryPage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: history, isLoading } = useQuery<Optimization[]>({
    queryKey: ["/api/history"],
    enabled: isAuthenticated,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/history/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
      toast({ title: "Raderat", description: "Beskrivningen har tagits bort." });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Kopierat!", description: "Texten finns nu i ditt urklipp." });
  };

  const getDaysRemaining = (createdAt: Date | string) => {
    const created = new Date(createdAt);
    const expires = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return Math.max(0, daysLeft);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <CardTitle>Logga in för att se historik</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Link href="/">
              <Button data-testid="button-go-home">Gå till startsidan</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen !bg-white !text-slate-900 flex flex-col" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <nav className="border-b border-slate-200 !bg-white sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-gray-800" data-testid="button-back-home">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Tillbaka
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="bg-gray-800 p-1.5 rounded-lg text-white">
                <History className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg !text-slate-900">Historik</span>
            </div>
          </div>
          <Badge className="bg-gray-100 text-gray-700 border-gray-300">
            <Clock className="h-3 w-3 mr-1" />
            Sparas i 30 dagar
          </Badge>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {!history || history.length === 0 ? (
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-8 pb-8">
              <History className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Ingen historik än</h2>
              <p className="text-muted-foreground mb-6">
                Dina objektbeskrivningar sparas här i 30 dagar
              </p>
              <Link href="/">
                <Button data-testid="button-create-first">Skapa din första beskrivning</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {history.map((item) => {
              const daysLeft = getDaysRemaining(item.createdAt!);
              return (
                <Card key={item.id} className="overflow-hidden" data-testid={`card-history-${item.id}`}>
                  <CardHeader className="bg-slate-50/50 pb-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Badge variant={item.category === "apartment" ? "default" : "secondary"}>
                          {item.category === "apartment" ? "Lägenhet" : "Villa"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(item.createdAt!).toLocaleDateString('sv-SE')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={daysLeft <= 7 ? "text-orange-600 border-orange-200" : ""}>
                          <Clock className="h-3 w-3 mr-1" />
                          {daysLeft} dagar kvar
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(item.improvedPrompt)}
                          data-testid={`button-copy-${item.id}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(item.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-sm text-primary mb-2 uppercase tracking-wider">Objektbeskrivning</h4>
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>{item.improvedPrompt}</p>
                      </div>
                      {item.socialCopy && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-sm text-gray-800">Social Media</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => copyToClipboard(item.socialCopy!)}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Kopiera
                            </Button>
                          </div>
                          <p className="text-slate-700 whitespace-pre-wrap italic text-sm">{item.socialCopy}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}