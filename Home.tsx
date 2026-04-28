import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ScanLine, Users, Shield, ShieldCheck, Sparkles, Zap, Target, Award, Globe2, Building2, GraduationCap, Heart, Banknote, Quote, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ParticleBackground } from "@/components/effects/ParticleBackground";
import { CountUp } from "@/components/effects/CountUp";
import { Typewriter } from "@/components/effects/Typewriter";
import { Badge } from "@/components/ui/badge";
import { useAdminGate } from "@/hooks/useAdminGate";
import { useAuth } from "@/hooks/useAuth";

const productCards = [
  {
    to: "/hirefair",
    icon: ScanLine,
    title: "HireFair Scanner",
    sub: "Bias Detection & Fixing",
    desc: "Audit any AI decision system. Generate test profiles, scan for bias across protected attributes, and auto-mitigate with one click.",
    accent: "from-primary/20 to-secondary/10",
    glow: "glow-cyan",
    cta: "Start a scan",
  },
  {
    to: "/talentmatch",
    icon: Users,
    title: "TalentMatch AI",
    sub: "Smart Recruitment",
    desc: "Run end-to-end hiring campaigns. AI screens applicants, ranks candidates, sends invites, and reports recruitment analytics.",
    accent: "from-secondary/20 to-primary/10",
    glow: "glow-purple",
    cta: "Open dashboard",
  },
  {
    to: "/admin",
    icon: Shield,
    title: "Admin Control Center",
    sub: "Module 03 · Admins only",
    desc: "Platform analytics, real-time activity widgets, category management, resume template versioning, and full system audit logs.",
    accent: "from-warning/20 to-secondary/10",
    glow: "glow-cyan",
    cta: "Open admin",
  },
];

const stats = [
  { v: 1240000, suffix: "+", label: "AI decisions audited" },
  { v: 92, suffix: "%", label: "Avg fairness post-fix" },
  { v: 480, suffix: "+", label: "Enterprises onboarded" },
  { v: 34, suffix: "%", label: "Faster time-to-hire" },
];

const industries = [
  { icon: Banknote, label: "Finance & Lending" },
  { icon: Heart, label: "Healthcare" },
  { icon: GraduationCap, label: "Education" },
  { icon: Building2, label: "Enterprise HR" },
  { icon: Globe2, label: "Government" },
  { icon: ShieldCheck, label: "Insurance" },
];

const testimonials = [
  { name: "Dr. Elena Voss", role: "Head of AI Ethics, Northbank", quote: "FAIRSCAN AI exposed gender bias in our lending model that internal audits had missed for 18 months. The auto-fix recovered 22 points of fairness without sacrificing accuracy." },
  { name: "Rajiv Mehta", role: "VP People Ops, Helix Robotics", quote: "TalentMatch cut our screening time by 71% and surfaced incredible candidates we would have filtered out. Our diverse hire ratio doubled in one quarter." },
  { name: "Sophie Laurent", role: "CTO, MedScan Imaging", quote: "Their fairness certificate became the centerpiece of our regulatory submission. Best ethical-AI tooling we've evaluated, and we evaluated everyone." },
];

const faqs = [
  { q: "How does FAIRSCAN AI detect bias?", a: "We generate statistically representative synthetic profiles, run them through your model, and measure outcome disparities across protected attributes using demographic parity, equal opportunity, and disparate impact metrics." },
  { q: "Does my model or candidate data leave my environment?", a: "No. FAIRSCAN runs in your VPC or on-prem. We never store model weights, prompts, or candidate PII outside your perimeter." },
  { q: "What compliance frameworks do you support?", a: "EU AI Act, NYC Local Law 144, EEOC, GDPR, ISO/IEC 42001, and SOC 2 Type II. Generated reports map findings directly to each clause." },
  { q: "Can the auto-fix break my model?", a: "We use post-processing calibration and reweighting that preserve top-line accuracy within 1.5% in 96% of cases. You always review a before/after diff before promoting." },
  { q: "How is TalentMatch different from an ATS?", a: "Your ATS stores applications. TalentMatch reads, parses, ranks, communicates, and reports — and every decision is itself audited by HireFair Scanner." },
];

const FlowChart = ({ steps, color }: { steps: string[]; color: "primary" | "secondary" }) => (
  <div className="relative">
    <div className="hide-scrollbar -mx-4 flex items-stretch gap-3 overflow-x-auto px-4 pb-2 md:flex-wrap md:overflow-visible md:px-0">
      {steps.map((s, i) => (
        <div key={s} className="flex shrink-0 items-stretch gap-3">
          <div className={`gradient-border min-w-[160px] flex-1 px-4 py-3 ${color === "primary" ? "shadow-[0_0_24px_hsl(187_100%_50%/0.15)]" : "shadow-[0_0_24px_hsl(263_100%_59%/0.15)]"}`}>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <span className={`grid h-5 w-5 place-items-center rounded-full ${color === "primary" ? "bg-primary/15 text-primary" : "bg-secondary/20 text-secondary"} text-[10px] font-bold`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              STEP
            </div>
            <div className="mt-1 text-sm font-medium">{s}</div>
          </div>
          {i < steps.length - 1 && (
            <div className="hidden items-center md:flex">
              <ArrowRight className={`h-4 w-4 ${color === "primary" ? "text-primary" : "text-secondary"}`} />
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

const Home = () => {
  const { user } = useAuth();
  const { unlocked, openPrompt } = useAdminGate();
  const nav = useNavigate();
  const handleCardClick = (to: string) => (e: React.MouseEvent) => {
    if (to !== "/admin") return;
    e.preventDefault();
    if (!user) { nav("/auth"); return; }
    if (unlocked) nav("/admin");
    else openPrompt(() => nav("/admin"));
  };
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <ParticleBackground density={70} />
        </div>
        <div className="absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(ellipse_at_top,hsl(263_100%_59%/0.25),transparent_60%)]" />
        <div className="container relative pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="mx-auto max-w-4xl text-center">
            <Badge className="mx-auto mb-6 inline-flex gap-1.5 border-primary/30 bg-primary/10 text-primary hover:bg-primary/15">
              <Sparkles className="h-3 w-3" /> v3.2 — EU AI Act ready
            </Badge>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
              <span className="text-gradient bg-200 animate-gradient">FAIRSCAN AI</span>
            </h1>
            <p className="mt-6 font-display text-2xl font-medium md:text-3xl">
              Building Ethical & Intelligent AI <br className="hidden md:block" />
              <span className="text-muted-foreground">for </span>
              <Typewriter
                texts={["the Future.", "Enterprises.", "Every Hire.", "a Fairer World."]}
                className="text-gradient"
              />
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
              Detect and fix bias in any AI system. Automate hiring with explainable, fair, and explosively fast recruitment.
              One platform. Zero compromise on ethics.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-gradient-brand text-primary-foreground hover:opacity-90 btn-glow">
                <Link to="/hirefair">Launch HireFair Scanner <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-border bg-card/60 backdrop-blur">
                <Link to="/talentmatch">Try TalentMatch</Link>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
              {["EU AI Act", "ISO 42001", "SOC 2", "GDPR", "NYC LL 144"].map((c) => (
                <span key={c} className="chip">
                  <ShieldCheck className="h-3 w-3 text-success" /> {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT CARDS */}
      <section className="container -mt-8 mb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {productCards.map((p, idx) => {
            const Icon = p.icon;
            return (
              <Link key={p.title} to={p.to} onClick={handleCardClick(p.to)} className={`group hover-tilt gradient-border relative overflow-hidden p-8 animate-fade-in-up`} style={{ animationDelay: `${idx * 120}ms` }}>
                <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${p.accent} opacity-60`} />
                <div className="absolute right-0 top-0 -z-10 h-40 w-40 rounded-full bg-gradient-brand opacity-20 blur-3xl transition-opacity group-hover:opacity-40" />
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-[0_0_24px_hsl(187_100%_50%/0.4)]">
                  <Icon className="h-6 w-6" strokeWidth={2.2} />
                </div>
                <div className="mt-6">
                  <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{p.sub}</div>
                  <h3 className="mt-1 font-display text-2xl font-bold">{p.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
                </div>
                <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-transform group-hover:translate-x-1">
                  {p.cta} <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* WHAT FAIRSCAN DOES */}
      <section className="container mb-24">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Badge className="mb-3 border-secondary/30 bg-secondary/10 text-secondary">What we do</Badge>
          <h2 className="font-display text-4xl font-bold md:text-5xl">One platform. Two superpowers.</h2>
          <p className="mt-4 text-muted-foreground">From bias audits to end-to-end hiring, FAIRSCAN gives every team the tools to build AI you can trust.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass relative overflow-hidden p-8">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary"><ScanLine className="h-5 w-5" /></div>
              <h3 className="font-display text-xl font-bold">HireFair Scanner — Workflow</h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">From upload to certificate in under 5 minutes.</p>
            <div className="mt-6">
              <FlowChart steps={["Upload AI", "Generate Profiles", "Scan Bias", "Fix Bias", "Certificate"]} color="primary" />
            </div>
          </Card>

          <Card className="glass relative overflow-hidden p-8">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-secondary/20 blur-3xl" />
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary/15 text-secondary"><Users className="h-5 w-5" /></div>
              <h3 className="font-display text-xl font-bold">TalentMatch AI — Workflow</h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Hire 6× faster while doubling diversity outcomes.</p>
            <div className="mt-6">
              <FlowChart steps={["Create Campaign", "Upload Applicants", "AI Screen", "Rank", "Invite", "Analytics"]} color="secondary" />
            </div>
          </Card>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="container mb-24">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Target, title: "Demographic parity", desc: "Statistical fairness across all protected attributes." },
            { icon: Zap, title: "One-click auto-fix", desc: "Calibrated post-processing without retraining." },
            { icon: Award, title: "Audit certificates", desc: "Verifiable, QR-signed, regulator-ready PDFs." },
            { icon: ShieldCheck, title: "Privacy-first", desc: "Runs in your VPC. Zero data leaves your perimeter." },
          ].map((f, i) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="glass group p-6 hover-tilt animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand-soft text-primary transition-transform group-hover:scale-110">
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="mt-4 font-display font-semibold">{f.title}</h4>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* STATS */}
      <section className="container mb-24">
        <Card className="glass-strong relative overflow-hidden p-10">
          <div className="grid-bg absolute inset-0 -z-10 opacity-40" />
          <div className="grid gap-8 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-4xl font-bold md:text-5xl">
                  <span className="text-gradient"><CountUp to={s.v} suffix={s.suffix} /></span>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* INDUSTRIES */}
      <section className="container mb-24">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Industries we serve</h2>
          <p className="mt-3 text-muted-foreground">Wherever AI makes decisions about people, FAIRSCAN belongs.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {industries.map((ind, i) => {
            const Icon = ind.icon;
            return (
              <div key={ind.label} className="glass group flex flex-col items-center gap-3 p-6 text-center hover-tilt animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <Icon className="h-7 w-7 text-primary transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium">{ind.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="container mb-24">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <Badge className="mb-3 border-primary/30 bg-primary/10 text-primary">Loved by AI leaders</Badge>
          <h2 className="font-display text-3xl font-bold md:text-4xl">Trusted by teams shipping AI to millions.</h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <Card key={t.name} className="glass p-7 hover-tilt animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
              <Quote className="h-7 w-7 text-primary/50" />
              <p className="mt-4 text-sm leading-relaxed text-foreground/90">"{t.quote}"</p>
              <div className="mt-6 flex items-center gap-3 border-t border-border/60 pt-4">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-brand text-sm font-bold text-primary-foreground">
                  {t.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="container mb-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Frequently asked questions</h2>
          </div>
          <Accordion type="single" collapsible className="glass divide-y divide-border/60 px-6">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-0">
                <AccordionTrigger className="text-left font-display text-base font-semibold hover:no-underline">
                  <span className="flex items-center gap-3">
                    <Plus className="h-4 w-4 shrink-0 text-primary" />
                    {f.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pl-7 text-sm text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="container mb-24">
        <Card className="relative overflow-hidden border-0 p-10 md:p-16">
          <div className="absolute inset-0 bg-gradient-brand opacity-95" />
          <div className="grid-bg absolute inset-0 opacity-30 mix-blend-overlay" />
          <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="text-primary-foreground">
              <h2 className="font-display text-3xl font-bold md:text-4xl">Ready to ship AI you can defend?</h2>
              <p className="mt-3 max-w-xl opacity-90">Spin up your first audit in minutes. No credit card. SOC 2 from day one.</p>
            </div>
            <div className="flex gap-3">
              <Button asChild size="lg" className="bg-background text-foreground hover:bg-background/90">
                <Link to="/hirefair">Start free audit <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/talentmatch">Book a demo</Link>
              </Button>
            </div>
          </div>
        </Card>
      </section>
    </>
  );
};

export default Home;
