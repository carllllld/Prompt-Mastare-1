import { useEffect, useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Users, Check, X } from "lucide-react";

export default function JoinTeam() {
  const [, params] = useRoute("/teams/join/:token");
  const token = params?.token;
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!token) return;
    setIsJoining(true);
    setError(null);
    try {
      const response = await apiRequest("POST", `/api/teams/join/${token}`, {});
      const team = await response.json();
      setJoined(true);
      toast({ title: "Welcome!", description: `You've joined ${team.name}` });
      setTimeout(() => {
        setLocation("/teams");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Could not join team");
      toast({ title: "Error", description: err.message || "Could not join team", variant: "destructive" });
    } finally {
      setIsJoining(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <Users className="h-12 w-12 mx-auto text-primary mb-4" />
            <CardTitle>Team Invitation</CardTitle>
            <CardDescription>Please sign in to accept this team invitation</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Link href="/">
              <Button data-testid="button-sign-in">Sign In to Join</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <div className="h-12 w-12 mx-auto bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>You're In!</CardTitle>
            <CardDescription>Redirecting to your teams...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <div className="h-12 w-12 mx-auto bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
              <X className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Unable to Join</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Link href="/teams">
              <Button data-testid="button-go-teams">Go to My Teams</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="max-w-md w-full mx-4">
        <CardHeader className="text-center">
          <Users className="h-12 w-12 mx-auto text-primary mb-4" />
          <CardTitle>Team Invitation</CardTitle>
          <CardDescription>
            You've been invited to join a team. Click below to accept the invitation.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button 
            onClick={handleJoin} 
            disabled={isJoining}
            className="w-full"
            data-testid="button-accept-invite"
          >
            {isJoining ? "Joining..." : "Accept Invitation"}
          </Button>
          <Link href="/teams">
            <Button variant="outline" className="w-full" data-testid="button-decline">
              Decline
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
