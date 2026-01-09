import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  Send, 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle, 
  ArrowLeft,
  Copy,
  Settings,
  Building2
} from "lucide-react";

type CaseDecision = "respond" | "ask_more_info" | "escalate";

interface CaseResult {
  caseId: number;
  status: string;
  decision: CaseDecision;
  classification: {
    category: string;
    confidence: "high" | "low";
    riskLevel: "low" | "medium" | "high";
    missingInfo: boolean;
    aiAllowed: boolean;
  };
  generatedResponse: string | null;
  internalNotes: string;
}

export default function SupportDashboard() {
  const { toast } = useToast();
  const [customerMessage, setCustomerMessage] = useState("");
  const [caseType, setCaseType] = useState("");
  const [result, setResult] = useState<CaseResult | null>(null);

  const { data: b2bStatus, isLoading: statusLoading } = useQuery<{
    hasCompany: boolean;
    company: { id: number; name: string; slug: string } | null;
    role: string | null;
  }>({
    queryKey: ["/api/b2b/status"],
  });

  const submitCaseMutation = useMutation({
    mutationFn: async (data: { customerMessage: string; caseType?: string }) => {
      const res = await apiRequest("POST", "/api/b2b/cases", data);
      return res.json();
    },
    onSuccess: (data: CaseResult) => {
      setResult(data);
      toast({
        title: "Case processed",
        description: `Decision: ${data.decision}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!customerMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter the customer message",
        variant: "destructive",
      });
      return;
    }
    submitCaseMutation.mutate({ 
      customerMessage, 
      caseType: caseType || undefined 
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const resetForm = () => {
    setCustomerMessage("");
    setCaseType("");
    setResult(null);
  };

  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!b2bStatus?.hasCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              No Company Assigned
            </CardTitle>
            <CardDescription>
              You need to create or join a company to use the support system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/admin/setup">
              <Button className="w-full" data-testid="button-setup-company">
                Set Up Your Company
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Support Dashboard</h1>
              <p className="text-sm text-muted-foreground">{b2bStatus.company?.name}</p>
            </div>
          </div>
          {b2bStatus.role === "admin" && (
            <Link href="/admin/settings">
              <Button variant="outline" size="sm" data-testid="button-admin-settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>New Support Case</CardTitle>
              <CardDescription>
                Paste the customer message and let AI generate a response
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Customer Message</label>
                <Textarea
                  placeholder="Paste the customer's message here..."
                  value={customerMessage}
                  onChange={(e) => setCustomerMessage(e.target.value)}
                  rows={6}
                  data-testid="input-customer-message"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Case Type (optional)</label>
                <Select value={caseType} onValueChange={setCaseType}>
                  <SelectTrigger data-testid="select-case-type">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="technical">Technical Support</SelectItem>
                    <SelectItem value="product">Product Question</SelectItem>
                    <SelectItem value="complaint">Complaint</SelectItem>
                    <SelectItem value="returns">Returns/Refunds</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleSubmit} 
                disabled={submitCaseMutation.isPending || !customerMessage.trim()}
                className="w-full"
                data-testid="button-submit-case"
              >
                {submitCaseMutation.isPending ? (
                  "Processing..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Process Case
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Response</CardTitle>
              <CardDescription>
                {result ? "Case processed" : "Submit a case to see the response"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!result ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <p>No case submitted yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {result.decision === "respond" && (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Ready to Send
                      </Badge>
                    )}
                    {result.decision === "ask_more_info" && (
                      <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                        <HelpCircle className="h-3 w-3 mr-1" />
                        Needs More Info
                      </Badge>
                    )}
                    {result.decision === "escalate" && (
                      <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Escalated
                      </Badge>
                    )}
                    <Badge variant="outline">{result.classification.category}</Badge>
                    <Badge variant="outline">
                      Risk: {result.classification.riskLevel}
                    </Badge>
                  </div>

                  <Separator />

                  {result.generatedResponse ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Response</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(result.generatedResponse!)}
                          data-testid="button-copy-response"
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap">
                        {result.generatedResponse}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 dark:bg-red-950 p-4 rounded-md">
                      <p className="text-sm text-red-600 dark:text-red-400">
                        This case requires human handling. No AI response generated.
                      </p>
                    </div>
                  )}

                  <Separator />

                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Internal Notes:</p>
                    <p>{result.internalNotes}</p>
                  </div>

                  <Button variant="outline" onClick={resetForm} className="w-full" data-testid="button-new-case">
                    New Case
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
