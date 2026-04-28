import { Link } from "react-router-dom";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Bell, Rocket, Sparkles, Zap, Globe2 } from "lucide-react";
import { ParticleBackground } from "@/components/effects/ParticleBackground";
import { CountUp } from "@/components/effects/CountUp";
import { toast } from "sonner";
import { useEffect, useState } from "react";

const ComingSoon = () => {
  const [target] = useState(() => Date.now() + 1000 * 60 * 60 * 24 * 47);
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const tick = () => {
      const ms = Math.max(0, target - Date.now());
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setT({ d, h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <div className="container relative py-12">
      <Breadcrumbs />
      <div className="relative mt-6 overflow-hidden rounded-3xl">
        <div className="absolute inset-0 -z-10"><ParticleBackground density={50} /></div>
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,hsl(263_100%_59%/0.3),transparent_60%)]" />

        <div className="relative px-6 py-20 md:px-16 md:py-32 text-center">
          <Badge className="mx-auto mb-4 inline-flex gap-1.5 border-secondary/40 bg-secondary/10 text-secondary">
            <Sparkles className="h-3 w-3" /> Module 03
          </Badge>

          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-2xl bg-gradient-brand glow-cyan animate-float-y">
            <Rocket className="h-10 w-10 text-primary-foreground" strokeWidth={2.2} />
          </div>

          <h1 className="font-display text-4xl font-bold leading-[1.05] md:text-6xl">
            <span className="text-gradient">New FAIRSCAN AI Module</span><br />
            Coming Soon
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            Continuous monitoring, model registry, regulatory submissions, and real-time AI Act compliance — all in one place.
          </p>

          {/* countdown */}
          <div className="mx-auto mt-10 grid max-w-xl grid-cols-4 gap-3">
            {[
              { l: "Days", v: t.d },
              { l: "Hours", v: t.h },
              { l: "Minutes", v: t.m },
              { l: "Seconds", v: t.s },
            ].map((u) => (
              <div key={u.l} className="glass-strong p-4">
                <div className="font-display text-3xl font-bold text-gradient md:text-4xl tabular-nums">{String(u.v).padStart(2, "0")}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{u.l}</div>
              </div>
            ))}
          </div>

          {/* Notify form */}
          <form className="mx-auto mt-10 flex max-w-md flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); toast.success("You're on the early access list."); }}>
            <Input type="email" placeholder="you@company.com" className="bg-card/60" required />
            <Button type="submit" className="bg-gradient-brand text-primary-foreground btn-glow">
              <Bell className="mr-1.5 h-4 w-4" /> Notify me
            </Button>
          </form>

          {/* Feature teasers */}
          <div className="mx-auto mt-14 grid max-w-3xl gap-4 md:grid-cols-3">
            {[
              { icon: Zap, title: "Real-time monitor", desc: "Drift, fairness, and accuracy alerts" },
              { icon: Globe2, title: "Global compliance", desc: "EU, US, APAC frameworks unified" },
              { icon: Sparkles, title: "Auto-remediation", desc: "Self-healing model pipelines" },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <Card key={f.title} className="glass p-5 text-left animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <Icon className="h-5 w-5 text-primary" />
                  <div className="mt-2.5 font-display font-semibold">{f.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{f.desc}</div>
                </Card>
              );
            })}
          </div>

          <div className="mt-12">
            <Button asChild variant="outline">
              <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" /> Back to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
