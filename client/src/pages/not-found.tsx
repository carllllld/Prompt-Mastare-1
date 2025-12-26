import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4 shadow-xl border-gray-100">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 text-destructive items-center justify-center">
            <AlertCircle className="h-8 w-8" />
            <h1 className="text-2xl font-bold font-display text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600 text-center mb-6">
            Sidan du letar efter verkar ha försvunnit eller flyttats.
          </p>

          <div className="flex justify-center">
            <Link href="/">
              <Button className="w-full sm:w-auto font-semibold">
                Tillbaka till startsidan
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
