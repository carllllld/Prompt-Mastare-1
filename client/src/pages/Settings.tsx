import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useStripePortal } from "@/hooks/use-stripe";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText, ArrowLeft, User, Crown, Shield, Trash2, Loader2,
  Check, KeyRound, CreditCard, Calendar, BarChart2,
} from "lucide-react";

const AVATAR_COLORS = [
  "#2D6A4F", "#1D4ED8", "#7C3AED", "#B45309", "#0F766E",
  "#C2410C", "#1E40AF", "#6D28D9", "#047857", "#9D174D",
];

interface AccountDetails {
  email: string;
  displayName: string | null;
  avatarColor: string | null;
  plan: "free" | "pro" | "premium";
  planStartAt: string;
  nextResetAt: string;
  createdAt: string;
  emailVerified: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  usage: {
    textsGenerated: number;
    textsLimit: number;
    textEditsUsed: number;
    textEditsLimit: number;
  };
}

function AvatarPreview({ color, name }: { color: string; name: string }) {
  const initials = name
    ? name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  return (
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
      style={{ background: color }}
    >
      {initials}
    </div>
  );
}

function DeleteAccountDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (password: string) => void;
  isDeleting: boolean;
}) {
  const [password, setPassword] = useState("");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">Radera konto permanent</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Detta raderar <strong>all din data</strong> — historik, personlig stil, teams och prenumeration — permanent.
              Åtgärden kan inte ångras.
            </p>
            <p className="mt-3 font-medium text-gray-700">Bekräfta med ditt lösenord:</p>
            <Input
              type="password"
              placeholder="Ditt lösenord"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1"
              autoFocus
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setPassword("")}>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => { onConfirm(password); setPassword(""); }}
            disabled={!password || isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Radera mitt konto
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function Settings() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: openPortal, isPending: isPortalPending } = useStripePortal();

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [profileDirty, setProfileDirty] = useState(false);

  const { data: details, isLoading } = useQuery<AccountDetails>({
    queryKey: ["/api/account/details"],
    enabled: isAuthenticated,
  });

  // Redirect unauthenticated users via effect (keeps hook order stable)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (details && !profileDirty) {
      setDisplayName(details.displayName || "");
      setSelectedColor(details.avatarColor || AVATAR_COLORS[0]);
    }
  }, [details]);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ displayName: displayName.trim() || null, avatarColor: selectedColor }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Kunde inte spara profil");
      }
      return res.json();
    },
    onSuccess: () => {
      setProfileDirty(false);
      queryClient.invalidateQueries({ queryKey: ["/api/account/details"] });
      queryClient.invalidateQueries({ queryKey: ["/auth/me"] });
      toast({ title: "Profil sparad", description: "Ditt visningsnamn och färg har uppdaterats." });
    },
    onError: (err: any) => {
      toast({ title: "Fel", description: err.message, variant: "destructive" });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Kunde inte radera kontot");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Konto raderat", description: "Allt ditt data har raderats." });
      logout();
      setLocation("/");
    },
    onError: (err: any) => {
      setDeleteDialogOpen(false);
      toast({ title: "Fel", description: err.message, variant: "destructive" });
    },
  });

  // Guard render after all hooks have been called
  if (!authLoading && !isAuthenticated) return null;

  const planLabel = details?.plan === "premium" ? "Premium" : details?.plan === "pro" ? "Pro" : "Gratis";
  const planColor = details?.plan === "premium" ? "#8B5CF6" : details?.plan === "pro" ? "#2D6A4F" : "#9CA3AF";

  const fmtDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" }) : "—";

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF7" }}>
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b" style={{ background: "#FAFAF7", borderColor: "#E8E5DE" }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 h-16">
          <Link href="/app" className="flex items-center gap-2.5 no-underline">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#2D6A4F" }}>
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold" style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939" }}>
              OptiPrompt
            </span>
          </Link>
          <Link href="/app" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors no-underline">
            <ArrowLeft className="w-4 h-4" />
            Tillbaka
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Lora', Georgia, serif", color: "#1D2939" }}>
            Kontoinställningar
          </h1>
          <p className="text-sm mt-1" style={{ color: "#9CA3AF" }}>
            Hantera din profil, prenumeration och kontosäkerhet.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 py-12 justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            <span className="text-sm text-gray-400">Laddar kontoinformation...</span>
          </div>
        ) : (
          <>
            {/* ── PROFILE ── */}
            <section className="bg-white rounded-xl border p-6 space-y-5" style={{ borderColor: "#E8E5DE" }}>
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4" style={{ color: "#2D6A4F" }} />
                <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Profil</h2>
              </div>

              <div className="flex items-center gap-4">
                <AvatarPreview color={selectedColor || AVATAR_COLORS[0]} name={displayName || user?.email?.split("@")[0] || "?"} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">E-post</p>
                  <p className="text-sm font-medium text-gray-800">{details?.email}</p>
                  {!details?.emailVerified && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium mt-1 inline-block">
                      E-post ej verifierad
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Visningsnamn (visas för teammedlemmar)</label>
                <Input
                  value={displayName}
                  onChange={e => { setDisplayName(e.target.value); setProfileDirty(true); }}
                  placeholder={user?.email?.split("@")[0] || "Ditt namn"}
                  maxLength={50}
                  className="max-w-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Avatarfärg</label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => { setSelectedColor(color); setProfileDirty(true); }}
                      className="w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center"
                      style={{
                        background: color,
                        borderColor: selectedColor === color ? "#1D2939" : "transparent",
                        transform: selectedColor === color ? "scale(1.15)" : "scale(1)",
                      }}
                    >
                      {selectedColor === color && <Check className="w-3 h-3 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => saveProfileMutation.mutate()}
                disabled={!profileDirty || saveProfileMutation.isPending}
                size="sm"
                className="font-medium"
                style={{ background: "#2D6A4F", color: "#fff" }}
              >
                {saveProfileMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Check className="w-3 h-3 mr-2" />}
                Spara profil
              </Button>
            </section>

            {/* ── SUBSCRIPTION ── */}
            <section className="bg-white rounded-xl border p-6 space-y-4" style={{ borderColor: "#E8E5DE" }}>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4" style={{ color: "#2D6A4F" }} />
                <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Prenumeration</h2>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold text-white"
                    style={{ background: planColor }}
                  >
                    <Crown className="w-3.5 h-3.5" />
                    {planLabel}
                  </div>
                  {details?.plan !== "free" && (
                    <p className="text-xs mt-1.5" style={{ color: "#9CA3AF" }}>
                      Aktiv sedan {fmtDate(details?.planStartAt)}
                    </p>
                  )}
                </div>
                {(details?.plan === "pro" || details?.plan === "premium") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPortal()}
                    disabled={isPortalPending}
                    className="text-xs"
                  >
                    {isPortalPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CreditCard className="w-3 h-3 mr-1" />}
                    Hantera fakturering
                  </Button>
                )}
              </div>

              {/* Usage this period */}
              <div className="rounded-lg p-4 space-y-3" style={{ background: "#F8F6F1" }}>
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Användning denna period</span>
                </div>
                <div className="space-y-2">
                  {/* Texts */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">Genereringar</span>
                      <span className="font-medium text-gray-800">
                        {details?.usage.textsGenerated} / {details?.usage.textsLimit === 999999 ? "∞" : details?.usage.textsLimit}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#E8E5DE" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          background: planColor,
                          width: details?.usage.textsLimit === 999999 ? "10%" :
                            `${Math.min(100, ((details?.usage.textsGenerated || 0) / (details?.usage.textsLimit || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  {/* Text edits */}
                  {(details?.plan === "pro" || details?.plan === "premium") && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">AI-textredigeringar</span>
                        <span className="font-medium text-gray-800">
                          {details?.usage.textEditsUsed} / {details?.usage.textEditsLimit === 999999 ? "∞" : details?.usage.textEditsLimit}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#E8E5DE" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            background: planColor,
                            width: details?.usage.textEditsLimit === 999999 ? "10%" :
                              `${Math.min(100, ((details?.usage.textEditsUsed || 0) / (details?.usage.textEditsLimit || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "#9CA3AF" }}>
                  <Calendar className="w-3 h-3" />
                  Återställs {fmtDate(details?.nextResetAt)}
                </div>
              </div>

              {details?.plan === "free" && (
                <Link href="/app" className="block">
                  <Button className="w-full font-medium" style={{ background: "#2D6A4F", color: "#fff" }}>
                    <Crown className="w-4 h-4 mr-2" />
                    Uppgradera till Pro — 299 kr/mån
                  </Button>
                </Link>
              )}
            </section>

            {/* ── SECURITY ── */}
            <section className="bg-white rounded-xl border p-6 space-y-4" style={{ borderColor: "#E8E5DE" }}>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4" style={{ color: "#2D6A4F" }} />
                <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>Säkerhet</h2>
              </div>

              <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "#F3F4F6" }}>
                <div>
                  <p className="text-sm font-medium text-gray-700">Lösenord</p>
                  <p className="text-xs text-gray-400">Byt till ett nytt lösenord</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setChangePasswordOpen(true)} className="text-xs">
                  <KeyRound className="w-3 h-3 mr-1" />
                  Ändra
                </Button>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-700">Konto skapat</p>
                  <p className="text-xs text-gray-400">{fmtDate(details?.createdAt)}</p>
                </div>
              </div>
            </section>

            {/* ── DANGER ZONE ── */}
            <section className="bg-white rounded-xl border-2 p-6 space-y-4" style={{ borderColor: "#FCA5A5" }}>
              <div className="flex items-center gap-2 mb-1">
                <Trash2 className="w-4 h-4 text-red-500" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-red-400">Radera konto</h2>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed">
                Permanent radering av ditt konto och all tillhörande data (historik, personlig stil, teams).
                Om du har en aktiv prenumeration avslutas den automatiskt. <strong>Åtgärden kan inte ångras.</strong>
              </p>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="text-red-600 border-red-200 hover:bg-red-50 font-medium"
              >
                <Trash2 className="w-3 h-3 mr-2" />
                Radera mitt konto
              </Button>
            </section>
          </>
        )}
      </main>

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={(pw) => deleteAccountMutation.mutate(pw)}
        isDeleting={deleteAccountMutation.isPending}
      />
    </div>
  );
}
