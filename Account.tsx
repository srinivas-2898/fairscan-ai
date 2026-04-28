import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User as UserIcon, Building2, Mail, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function Account() {
  const { user, profile, roles, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
    setCompany(profile?.company ?? "");
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles")
      .update({ display_name: displayName, company })
      .eq("user_id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success("Profile updated");
  };

  return (
    <div className="container max-w-3xl py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Account</p>
        <h1 className="mt-1 font-display text-3xl font-bold">Profile & access</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage how you appear and review your role-based access.</p>
      </motion.div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card/60 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><UserIcon className="h-4 w-4 text-primary" /> Profile</h3>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Display name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Company</Label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={80} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" value={user?.email ?? ""} disabled />
              </div>
            </div>
            <Button disabled={busy} className="bg-gradient-brand">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save changes
            </Button>
          </form>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/60 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-success" /> Access & security</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Roles</span>
              <div className="flex gap-1">{roles.length ? roles.map(r => <Badge key={r} variant="outline" className="capitalize">{r}</Badge>) : <Badge variant="outline">user</Badge>}</div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">User ID</span>
              <span className="font-mono text-xs">{user?.id.slice(0, 8)}…</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Provider</span>
              <span className="capitalize">{user?.app_metadata?.provider ?? "email"}</span>
            </div>
            <div className="rounded-lg border border-border bg-background/40 p-3 text-xs text-muted-foreground">
              All your reports, files and certificates are stored privately in your account. Only you and FAIRSCAN administrators can access them.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
