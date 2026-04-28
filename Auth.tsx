import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, User, Building2, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.string().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(8, "Min 8 characters").max(72);

export default function Auth() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as any)?.from || "/hirefair";
  const [tab, setTab] = useState<"signin" | "signup" | "reset">("signin");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", displayName: "", company: "" });

  if (loading) return null;
  if (user) return <Navigate to={from} replace />;

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(form.email); passwordSchema.parse(form.password);
    } catch (err: any) { toast.error(err.errors?.[0]?.message ?? "Invalid input"); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    nav(from, { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(form.email); passwordSchema.parse(form.password);
      if (!form.displayName.trim()) throw new Error("Display name required");
    } catch (err: any) {
      toast.error(err.errors?.[0]?.message ?? err.message ?? "Invalid input"); return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: form.displayName, company: form.company },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — check your email to confirm.");
    setTab("signin");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try { emailSchema.parse(form.email); } catch (err: any) { toast.error(err.errors?.[0]?.message); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Reset link sent — check your inbox.");
    setTab("signin");
  };

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if ((result as any).error) { setBusy(false); toast.error("Google sign-in failed"); return; }
    if ((result as any).redirected) return;
    nav(from, { replace: true });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(187_100%_50%/0.12),transparent_50%),radial-gradient(ellipse_at_bottom,hsl(263_100%_59%/0.12),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(hsl(var(--border)/0.15)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.15)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative grid min-h-screen place-items-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand shadow-[0_0_24px_hsl(187_100%_50%/0.45)]">
              <Shield className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">
              FAIRSCAN <span className="text-gradient">AI</span>
            </span>
          </Link>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-2xl backdrop-blur-xl">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
                <TabsTrigger value="reset">Reset</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-5 space-y-4">
                <form onSubmit={handleSignIn} className="space-y-3">
                  <Field icon={Mail} label="Email" type="email" value={form.email} onChange={set("email")} placeholder="you@company.com" />
                  <PasswordField value={form.password} onChange={set("password")} show={showPw} onToggle={() => setShowPw(s => !s)} />
                  <Button type="submit" disabled={busy} className="w-full bg-gradient-brand">
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Sign in
                  </Button>
                </form>
                <Divider />
                <GoogleButton onClick={handleGoogle} disabled={busy} />
              </TabsContent>

              <TabsContent value="signup" className="mt-5 space-y-4">
                <form onSubmit={handleSignUp} className="space-y-3">
                  <Field icon={User} label="Display name" value={form.displayName} onChange={set("displayName")} placeholder="Ava Chen" />
                  <Field icon={Building2} label="Company (optional)" value={form.company} onChange={set("company")} placeholder="Acme Corp" />
                  <Field icon={Mail} label="Email" type="email" value={form.email} onChange={set("email")} placeholder="you@company.com" />
                  <PasswordField value={form.password} onChange={set("password")} show={showPw} onToggle={() => setShowPw(s => !s)} />
                  <Button type="submit" disabled={busy} className="w-full bg-gradient-brand">
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Create account
                  </Button>
                </form>
                <Divider />
                <GoogleButton onClick={handleGoogle} disabled={busy} />
              </TabsContent>

              <TabsContent value="reset" className="mt-5 space-y-4">
                <p className="text-sm text-muted-foreground">Enter your email — we'll send a secure link to reset your password.</p>
                <form onSubmit={handleReset} className="space-y-3">
                  <Field icon={Mail} label="Email" type="email" value={form.email} onChange={set("email")} placeholder="you@company.com" />
                  <Button type="submit" disabled={busy} className="w-full bg-gradient-brand">
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Send reset link
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By continuing you agree to FAIRSCAN AI's <Link to="/" className="underline">Terms</Link> & <Link to="/" className="underline">Privacy Policy</Link>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

const Field = ({ icon: Icon, label, ...props }: any) => (
  <div className="space-y-1.5">
    <Label className="text-xs">{label}</Label>
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input className="pl-9" {...props} />
    </div>
  </div>
);

const PasswordField = ({ value, onChange, show, onToggle }: any) => (
  <div className="space-y-1.5">
    <Label className="text-xs">Password</Label>
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input className="pl-9 pr-9" type={show ? "text" : "password"} value={value} onChange={onChange} placeholder="At least 8 characters" autoComplete="current-password" />
      <button type="button" onClick={onToggle} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  </div>
);

const Divider = () => (
  <div className="relative my-2">
    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
    <div className="relative flex justify-center text-[11px] uppercase tracking-widest"><span className="bg-card/60 px-2 text-muted-foreground">or</span></div>
  </div>
);

const GoogleButton = ({ onClick, disabled }: any) => (
  <Button variant="outline" type="button" onClick={onClick} disabled={disabled} className="w-full">
    <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.3-.1-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5C29.6 34.7 26.9 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2.1-2 3.9-3.7 5.2l6.5 5.5C42.9 34.5 44 29.5 44 24c0-1.3-.2-2.3-.4-3.5z"/></svg>
    Continue with Google
  </Button>
);
