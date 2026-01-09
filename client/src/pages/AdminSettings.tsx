import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  BookOpen,
  Shield,
  Building2
} from "lucide-react";

interface Policy {
  id: number;
  companyId: number;
  tone: string;
  addressForm: string;
  emojiUsage: string;
  forbiddenActions: string[];
  forbiddenLanguage: string[];
  maxResponseLength: number;
  mandatoryClosing: string | null;
  responseStructure: string[];
}

interface KnowledgeBlock {
  id: number;
  companyId: number;
  title: string;
  content: string;
  category: string | null;
  isActive: boolean;
}

export default function AdminSettings() {
  const { toast } = useToast();
  
  const { data: b2bStatus } = useQuery<{
    hasCompany: boolean;
    company: { id: number; name: string } | null;
    role: string | null;
  }>({
    queryKey: ["/api/b2b/status"],
  });

  const { data: policy, isLoading: policyLoading } = useQuery<Policy>({
    queryKey: ["/api/b2b/policy"],
    enabled: !!b2bStatus?.hasCompany,
  });

  const { data: knowledge, isLoading: knowledgeLoading } = useQuery<KnowledgeBlock[]>({
    queryKey: ["/api/b2b/knowledge"],
    enabled: !!b2bStatus?.hasCompany,
  });

  const [policyForm, setPolicyForm] = useState<Partial<Policy>>({});
  const [forbiddenActionsInput, setForbiddenActionsInput] = useState("");
  const [forbiddenLanguageInput, setForbiddenLanguageInput] = useState("");
  const [newKnowledge, setNewKnowledge] = useState({ title: "", content: "", category: "" });

  useEffect(() => {
    if (policy) {
      setPolicyForm(policy);
      setForbiddenActionsInput((policy.forbiddenActions || []).join(", "));
      setForbiddenLanguageInput((policy.forbiddenLanguage || []).join(", "));
    }
  }, [policy]);

  const updatePolicyMutation = useMutation({
    mutationFn: async (data: Partial<Policy>) => {
      const res = await apiRequest("PUT", "/api/b2b/policy", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/b2b/policy"] });
      toast({ title: "Policy updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addKnowledgeMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; category?: string }) => {
      const res = await apiRequest("POST", "/api/b2b/knowledge", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/b2b/knowledge"] });
      setNewKnowledge({ title: "", content: "", category: "" });
      toast({ title: "Knowledge block added" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteKnowledgeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/b2b/knowledge/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/b2b/knowledge"] });
      toast({ title: "Knowledge block removed" });
    },
  });

  const handleSavePolicy = () => {
    const forbiddenActions = forbiddenActionsInput
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
    const forbiddenLanguage = forbiddenLanguageInput
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    updatePolicyMutation.mutate({
      ...policyForm,
      forbiddenActions,
      forbiddenLanguage,
    });
  };

  if (!b2bStatus?.hasCompany || b2bStatus.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only company administrators can access settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/support">
              <Button className="w-full" data-testid="button-back-dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
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
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/support">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Company Settings</h1>
            <p className="text-sm text-muted-foreground">{b2bStatus.company?.name}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs defaultValue="policy">
          <TabsList className="mb-6">
            <TabsTrigger value="policy" data-testid="tab-policy">
              <Shield className="h-4 w-4 mr-2" />
              Policy
            </TabsTrigger>
            <TabsTrigger value="knowledge" data-testid="tab-knowledge">
              <BookOpen className="h-4 w-4 mr-2" />
              Knowledge Base
            </TabsTrigger>
          </TabsList>

          <TabsContent value="policy">
            <Card>
              <CardHeader>
                <CardTitle>Response Policy</CardTitle>
                <CardDescription>
                  Configure how AI generates responses for your company
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>Tone</Label>
                    <Select
                      value={policyForm.tone || "professional"}
                      onValueChange={(v) => setPolicyForm({ ...policyForm, tone: v })}
                    >
                      <SelectTrigger data-testid="select-tone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="concise">Concise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Address Form</Label>
                    <Select
                      value={policyForm.addressForm || "du"}
                      onValueChange={(v) => setPolicyForm({ ...policyForm, addressForm: v })}
                    >
                      <SelectTrigger data-testid="select-address">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="du">Du (informal)</SelectItem>
                        <SelectItem value="ni">Ni (formal)</SelectItem>
                        <SelectItem value="you">You (English)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Emoji Usage</Label>
                    <Select
                      value={policyForm.emojiUsage || "never"}
                      onValueChange={(v) => setPolicyForm({ ...policyForm, emojiUsage: v })}
                    >
                      <SelectTrigger data-testid="select-emoji">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="limited">Limited</SelectItem>
                        <SelectItem value="allowed">Allowed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Max Response Length (words)</Label>
                  <Input
                    type="number"
                    value={policyForm.maxResponseLength || 300}
                    onChange={(e) => setPolicyForm({ ...policyForm, maxResponseLength: parseInt(e.target.value) })}
                    data-testid="input-max-length"
                  />
                </div>

                <div>
                  <Label>Forbidden Actions (comma separated)</Label>
                  <Textarea
                    value={forbiddenActionsInput}
                    onChange={(e) => setForbiddenActionsInput(e.target.value)}
                    placeholder="e.g., Promise refunds without approval, Share internal pricing"
                    rows={2}
                    data-testid="input-forbidden-actions"
                  />
                </div>

                <div>
                  <Label>Forbidden Language (comma separated)</Label>
                  <Textarea
                    value={forbiddenLanguageInput}
                    onChange={(e) => setForbiddenLanguageInput(e.target.value)}
                    placeholder="e.g., I don't know, Not my problem"
                    rows={2}
                    data-testid="input-forbidden-language"
                  />
                </div>

                <div>
                  <Label>Mandatory Closing Sentence</Label>
                  <Input
                    value={policyForm.mandatoryClosing || ""}
                    onChange={(e) => setPolicyForm({ ...policyForm, mandatoryClosing: e.target.value })}
                    placeholder="e.g., Thank you for contacting us!"
                    data-testid="input-closing"
                  />
                </div>

                <Button 
                  onClick={handleSavePolicy} 
                  disabled={updatePolicyMutation.isPending}
                  data-testid="button-save-policy"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updatePolicyMutation.isPending ? "Saving..." : "Save Policy"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="knowledge">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Add Knowledge Block</CardTitle>
                  <CardDescription>
                    Add information that AI can use when responding to customers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={newKnowledge.title}
                        onChange={(e) => setNewKnowledge({ ...newKnowledge, title: e.target.value })}
                        placeholder="e.g., Return Policy"
                        data-testid="input-knowledge-title"
                      />
                    </div>
                    <div>
                      <Label>Category (optional)</Label>
                      <Input
                        value={newKnowledge.category}
                        onChange={(e) => setNewKnowledge({ ...newKnowledge, category: e.target.value })}
                        placeholder="e.g., Policies"
                        data-testid="input-knowledge-category"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Content</Label>
                    <Textarea
                      value={newKnowledge.content}
                      onChange={(e) => setNewKnowledge({ ...newKnowledge, content: e.target.value })}
                      placeholder="Enter the knowledge content..."
                      rows={4}
                      data-testid="input-knowledge-content"
                    />
                  </div>
                  <Button 
                    onClick={() => addKnowledgeMutation.mutate(newKnowledge)}
                    disabled={!newKnowledge.title || !newKnowledge.content || addKnowledgeMutation.isPending}
                    data-testid="button-add-knowledge"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Knowledge Block
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Knowledge Base</CardTitle>
                  <CardDescription>
                    {knowledge?.length || 0} knowledge blocks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {knowledgeLoading ? (
                    <p className="text-muted-foreground">Loading...</p>
                  ) : !knowledge?.length ? (
                    <p className="text-muted-foreground">No knowledge blocks yet. Add some above.</p>
                  ) : (
                    <div className="space-y-4">
                      {knowledge.map((block) => (
                        <div key={block.id} className="border rounded-md p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{block.title}</h4>
                                {block.category && (
                                  <Badge variant="outline">{block.category}</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-3">
                                {block.content}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteKnowledgeMutation.mutate(block.id)}
                              data-testid={`button-delete-knowledge-${block.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
