import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Building2, Sparkles } from "lucide-react";

export default function CompanySetup() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [companyName, setCompanyName] = useState("");

  const createCompanyMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/b2b/companies", { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/b2b/status"] });
      toast({ title: "Company created successfully!" });
      setLocation("/support");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a company name",
        variant: "destructive",
      });
      return;
    }
    createCompanyMutation.mutate(companyName);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Set Up Your Company</CardTitle>
          <CardDescription>
            Create your company to start using the AI support system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter your company name"
                data-testid="input-company-name"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={createCompanyMutation.isPending}
              data-testid="button-create-company"
            >
              {createCompanyMutation.isPending ? (
                "Creating..."
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create Company
                </>
              )}
            </Button>

            <Link href="/">
              <Button variant="outline" className="w-full" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
