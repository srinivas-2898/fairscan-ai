import { useState } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  LayoutDashboard, Plus, Upload, ScanLine, Users, Mail, BarChart3, Sparkles,
  ArrowRight, ArrowLeft, Search, Filter, Star, Send, Eye, GitCompare, CheckCircle2,
  Briefcase, MapPin, Clock, Loader2, FileText,
} from "lucide-react";
import { candidates, funnelData, trendData } from "@/lib/demoData";
import { CountUp } from "@/components/effects/CountUp";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { ResumeMultiUpload } from "@/components/ResumeMultiUpload";

const STEPS = [
  { id: 1, label: "Dashboard", icon: LayoutDashboard },
  { id: 2, label: "Campaign", icon: Plus },
  { id: 3, label: "Upload", icon: Upload },
  { id: 4, label: "AI Screen", icon: ScanLine },
  { id: 5, label: "Results", icon: Users },
  { id: 6, label: "Invite", icon: Mail },
  { id: 7, label: "Analytics", icon: BarChart3 },
];

const statusColor: Record<string, string> = {
  Match: "bg-success/15 text-success border-success/30",
  Intermediate: "bg-warning/15 text-warning border-warning/30",
  Mismatch: "bg-danger/15 text-danger border-danger/30",
};

const TalentMatch = () => {
  const [step, setStep] = useState(1);
  const [campaign, setCampaign] = useState({ title: "Senior ML Engineer", dept: "Engineering", location: "Remote", desc: "" });
  const [uploaded, setUploaded] = useState(0);
  const [screenProgress, setScreenProgress] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [shortlist, setShortlist] = useState<number[]>([]);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [showInvite, setShowInvite] = useState<number | null>(null);
  const [emailBody, setEmailBody] = useState("");

  const handleUpload = () => {
    setUploaded(0);
    const id = setInterval(() => {
      setUploaded(u => {
        if (u >= 247) { clearInterval(id); toast.success("247 resumes parsed"); return 247; }
        return u + 9;
      });
    }, 50);
  };

  const startScreen = () => {
    setStep(4);
    setScreenProgress(0);
    const id = setInterval(() => {
      setScreenProgress(p => {
        if (p >= 100) { clearInterval(id); setTimeout(() => setStep(5), 600); return 100; }
        return p + 2.5;
      });
    }, 60);
  };

  const filtered = candidates.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.skills.join(" ").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || c.status === filter;
    return matchSearch && matchFilter;
  });

  const toggleShortlist = (id: number) => {
    setShortlist(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
    toast(shortlist.includes(id) ? "Removed from shortlist" : "Added to shortlist");
  };

  const toggleCompare = (id: number) => {
    setCompareIds(s => {
      if (s.includes(id)) return s.filter(x => x !== id);
      if (s.length >= 3) { toast.error("Compare up to 3 candidates"); return s; }
      return [...s, id];
    });
  };

  const sendInvite = () => {
    toast.success(`Interview invite sent to ${candidates.find(c => c.id === showInvite)?.name}`);
    setShowInvite(null);
    setEmailBody("");
  };

  const statusBreakdown = [
    { name: "Match", value: candidates.filter(c => c.status === "Match").length, color: "hsl(152 100% 50%)" },
    { name: "Intermediate", value: candidates.filter(c => c.status === "Intermediate").length, color: "hsl(38 100% 60%)" },
    { name: "Mismatch", value: candidates.filter(c => c.status === "Mismatch").length, color: "hsl(346 100% 62%)" },
  ];

  return (
    <div className="container py-8">
      <Breadcrumbs />

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge className="mb-2 border-secondary/30 bg-secondary/10 text-secondary">Smart Hiring · Module 02</Badge>
          <h1 className="font-display text-3xl font-bold md:text-4xl">TalentMatch AI</h1>
          <p className="mt-1 text-sm text-muted-foreground">Run end-to-end AI hiring campaigns with built-in fairness.</p>
        </div>
      </div>

      {/* Tabs as workflow */}
      <Tabs value={`s${step}`} onValueChange={(v) => setStep(Number(v.slice(1)))} className="w-full">
        <TabsList className="glass mb-6 flex h-auto w-full flex-wrap justify-start gap-1 p-1.5">
          {STEPS.map(s => {
            const Icon = s.icon;
            return (
              <TabsTrigger key={s.id} value={`s${s.id}`}
                className="flex items-center gap-1.5 data-[state=active]:bg-gradient-brand data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_20px_hsl(187_100%_50%/0.4)]">
                <Icon className="h-3.5 w-3.5" /> {s.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="s1" className="space-y-6 animate-fade-in">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "Active Campaigns", v: 12, suffix: "", icon: Briefcase, color: "primary" },
              { label: "Applicants this month", v: 1248, suffix: "", icon: Users, color: "secondary" },
              { label: "Shortlisted", v: 184, suffix: "", icon: Star, color: "primary" },
              { label: "Avg. fairness", v: 94, suffix: "%", icon: CheckCircle2, color: "secondary" },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <Card key={s.label} className="glass relative overflow-hidden p-5 hover-tilt animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${s.color === "primary" ? "bg-primary/15" : "bg-secondary/15"} blur-2xl`} />
                  <div className="flex items-start justify-between">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
                    <Icon className={`h-4 w-4 ${s.color === "primary" ? "text-primary" : "text-secondary"}`} />
                  </div>
                  <div className="mt-3 font-display text-3xl font-bold"><CountUp to={s.v} suffix={s.suffix} /></div>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="glass p-6 lg:col-span-2">
              <h3 className="font-display text-lg font-semibold">Hiring trend (last 12 months)</h3>
              <div className="mt-3 h-72">
                <ResponsiveContainer>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="appGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(187 100% 50%)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(187 100% 50%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="hireGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(263 100% 59%)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(263 100% 59%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="applicants" stroke="hsl(187 100% 50%)" fill="url(#appGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="hires" stroke="hsl(263 100% 59%)" fill="url(#hireGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="glass p-6">
              <h3 className="font-display text-lg font-semibold">Candidate mix</h3>
              <div className="mt-3 h-56">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={statusBreakdown} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={4}>
                      {statusBreakdown.map(s => <Cell key={s.name} fill={s.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1.5 text-xs">
                {statusBreakdown.map(s => (
                  <div key={s.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}</span>
                    <span className="font-mono">{s.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} className="bg-gradient-brand text-primary-foreground btn-glow">
              <Plus className="mr-1 h-4 w-4" /> New Campaign
            </Button>
          </div>
        </TabsContent>

        {/* CAMPAIGN */}
        <TabsContent value="s2" className="animate-fade-in">
          <Card className="glass p-8 md:p-10">
            <h2 className="font-display text-2xl font-bold">Create Hiring Campaign</h2>
            <p className="mt-1 text-sm text-muted-foreground">Define role, criteria, and fairness guardrails.</p>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Role title</Label>
                <Input value={campaign.title} onChange={e => setCampaign({ ...campaign, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={campaign.dept} onValueChange={(v) => setCampaign({ ...campaign, dept: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Engineering", "Design", "Product", "Sales", "Operations"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input value={campaign.location} onChange={e => setCampaign({ ...campaign, location: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Min. experience (years)</Label>
                <Input type="number" defaultValue={5} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Job description</Label>
                <Textarea rows={4} placeholder="Skills, responsibilities, must-haves…" value={campaign.desc} onChange={e => setCampaign({ ...campaign, desc: e.target.value })} />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Fairness on", "Anonymized resumes", "Bias monitoring", "GDPR compliant"].map(t => (
                <span key={t} className="chip"><CheckCircle2 className="h-3 w-3 text-success" /> {t}</span>
              ))}
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
              <Button onClick={() => setStep(3)} className="bg-gradient-brand text-primary-foreground btn-glow">Continue <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </div>
          </Card>
        </TabsContent>

        {/* UPLOAD */}
        <TabsContent value="s3" className="animate-fade-in">
          <Card className="glass p-8 md:p-10">
            <h2 className="font-display text-2xl font-bold">Upload Applications</h2>
            <p className="mt-1 text-sm text-muted-foreground">Bulk upload resumes in PDF, DOCX, or import from your ATS.</p>

            <ResumeMultiUpload onTotalChange={setUploaded} />

            {uploaded > 0 && (
              <div className="mt-6">
                <div className="flex justify-between text-sm">
                  <span>Parsing resumes…</span>
                  <span className="font-mono text-primary">{uploaded} parsed</span>
                </div>
                <Progress value={Math.min(100, (uploaded / 247) * 100)} className="mt-2 h-2" />
              </div>
            )}
            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
              <Button onClick={startScreen} disabled={uploaded < 1} className="bg-gradient-brand text-primary-foreground btn-glow">
                <Sparkles className="mr-1 h-4 w-4" /> Run AI Screening
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* SCREEN */}
        <TabsContent value="s4" className="animate-fade-in">
          <Card className="glass relative overflow-hidden p-8 md:p-10">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-brand">
              <div className="h-full bg-background/30 transition-all" style={{ width: `${100 - screenProgress}%`, marginLeft: `${screenProgress}%` }} />
            </div>
            <h2 className="font-display text-2xl font-bold">AI Screening Engine</h2>
            <p className="mt-1 text-sm text-muted-foreground">Multi-model evaluation with fairness constraints.</p>
            <div className="mt-8 grid place-items-center py-8">
              <div className="relative">
                <Loader2 className="h-20 w-20 animate-spin text-secondary" />
                <ScanLine className="absolute inset-0 m-auto h-8 w-8 text-primary" />
              </div>
              <div className="mt-6 font-mono text-sm text-secondary">{Math.round(screenProgress)}% — Cross-validating…</div>
              <Progress value={screenProgress} className="mt-3 h-2 w-72" />
              <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                {["Skills extraction", "Experience mapping", "Culture fit", "Fairness check"].map((t, i) => (
                  <span key={t} className={`chip ${screenProgress > i * 25 ? "border-success/40 text-success" : ""}`}>
                    {screenProgress > i * 25 && <CheckCircle2 className="h-3 w-3" />} {t}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* RESULTS */}
        <TabsContent value="s5" className="space-y-4 animate-fade-in">
          <Card className="glass p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search by name or skill…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-44"><Filter className="mr-1 h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All candidates</SelectItem>
                  <SelectItem value="Match">Match only</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Mismatch">Mismatch</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" disabled={compareIds.length < 2} onClick={() => setShowCompare(true)}>
                <GitCompare className="mr-1.5 h-3.5 w-3.5" /> Compare ({compareIds.length})
              </Button>
              <Badge className="ml-auto bg-card text-muted-foreground">{filtered.length} candidates · {shortlist.length} shortlisted</Badge>
            </div>
          </Card>

          <div className="space-y-3">
            {filtered.map((c, i) => (
              <Card key={c.id} className="glass group p-5 transition-all hover:border-primary/40 animate-fade-in-up" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-brand text-sm font-bold text-primary-foreground">
                    {c.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{c.name}</span>
                      <Badge variant="outline" className={statusColor[c.status]}>{c.status}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {c.exp} yrs</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.location}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {c.availability}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {c.skills.map(s => <span key={s} className="rounded-md bg-card/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{s}</span>)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-3xl font-bold text-gradient">{c.match}<span className="text-sm text-muted-foreground">%</span></div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Match</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggleCompare(c.id)} className={compareIds.includes(c.id) ? "border-primary text-primary" : ""}>
                      <GitCompare className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleShortlist(c.id)} className={shortlist.includes(c.id) ? "border-warning text-warning" : ""}>
                      <Star className={`h-3.5 w-3.5 ${shortlist.includes(c.id) ? "fill-warning" : ""}`} />
                    </Button>
                    <Button size="sm" onClick={() => { setShowInvite(c.id); setEmailBody(`Hi ${c.name.split(" ")[0]},\n\nWe were impressed by your background and would love to invite you to interview for the ${campaign.title} role at FAIRSCAN AI.\n\nBest,\nAva`); }}
                      className="bg-gradient-brand text-primary-foreground btn-glow">
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(4)}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
            <Button onClick={() => setStep(7)} className="bg-gradient-brand text-primary-foreground btn-glow">View Analytics <ArrowRight className="ml-1 h-4 w-4" /></Button>
          </div>
        </TabsContent>

        {/* INVITE */}
        <TabsContent value="s6" className="animate-fade-in">
          <Card className="glass p-8">
            <h2 className="font-display text-2xl font-bold">Interview Invitations</h2>
            <p className="mt-1 text-sm text-muted-foreground">Personalized at scale. {shortlist.length} candidates shortlisted.</p>
            <div className="mt-6 grid gap-3">
              {shortlist.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  <Star className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  No shortlisted candidates yet. Star candidates from the Results tab.
                </div>
              )}
              {candidates.filter(c => shortlist.includes(c.id)).map(c => (
                <Card key={c.id} className="glass flex items-center gap-3 p-4">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-brand text-xs font-bold text-primary-foreground">{c.name.split(" ").map(n => n[0]).join("")}</div>
                  <div className="flex-1"><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.role}</div></div>
                  <Button size="sm" onClick={() => { setShowInvite(c.id); setEmailBody(`Hi ${c.name.split(" ")[0]},\n\nWe'd love to invite you to interview…`); }} className="bg-gradient-brand text-primary-foreground"><Send className="mr-1.5 h-3.5 w-3.5" /> Invite</Button>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ANALYTICS */}
        <TabsContent value="s7" className="space-y-6 animate-fade-in">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="glass p-6">
              <h3 className="font-display text-lg font-semibold">Recruitment funnel</h3>
              <div className="mt-4 space-y-2">
                {funnelData.map((f, i) => {
                  const max = funnelData[0].value;
                  const w = (f.value / max) * 100;
                  return (
                    <div key={f.stage} className="flex items-center gap-3">
                      <div className="w-24 text-xs text-muted-foreground">{f.stage}</div>
                      <div className="flex-1">
                        <div className="relative h-9 overflow-hidden rounded-md bg-card/60">
                          <div className="flex h-full items-center justify-end px-3 text-xs font-semibold text-primary-foreground transition-all"
                               style={{ width: `${w}%`, background: `linear-gradient(90deg, ${f.color}, hsl(187 100% 50%))`, animation: `fade-in 0.6s ${i * 0.1}s both` }}>
                            {f.value.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="w-12 text-right text-xs text-muted-foreground">{Math.round(w)}%</div>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card className="glass p-6">
              <h3 className="font-display text-lg font-semibold">Fairness over time</h3>
              <div className="mt-3 h-72">
                <ResponsiveContainer>
                  <LineChart data={trendData}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="fairness" stroke="hsl(152 100% 50%)" strokeWidth={3} dot={{ r: 4, fill: "hsl(152 100% 50%)" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="glass p-6 lg:col-span-2">
              <h3 className="font-display text-lg font-semibold">Source effectiveness (heatmap)</h3>
              <div className="mt-4 overflow-x-auto">
                <div className="grid gap-1" style={{ gridTemplateColumns: "120px repeat(6, minmax(60px, 1fr))" }}>
                  <div></div>
                  {["Match", "Intermediate", "Mismatch", "Hire", "Decline", "Diversity"].map(h => (
                    <div key={h} className="text-center text-[10px] uppercase tracking-wider text-muted-foreground">{h}</div>
                  ))}
                  {["LinkedIn", "Referrals", "GitHub", "Universities", "Job Boards", "Direct"].map((src, ri) => (
                    <>
                      <div key={src} className="text-xs font-medium text-muted-foreground">{src}</div>
                      {[0,1,2,3,4,5].map(ci => {
                        const v = Math.round(40 + Math.random() * 55 + (ri === 1 ? 10 : 0));
                        const intensity = v / 100;
                        return (
                          <div key={ci} className="grid h-9 place-items-center rounded text-xs font-mono"
                               style={{ background: `linear-gradient(135deg, hsl(187 100% 50% / ${intensity * 0.8}), hsl(263 100% 59% / ${intensity * 0.6}))`, color: intensity > 0.5 ? "white" : "hsl(var(--muted-foreground))" }}>
                            {v}
                          </div>
                        );
                      })}
                    </>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* COMPARE MODAL */}
      <Dialog open={showCompare} onOpenChange={setShowCompare}>
        <DialogContent className="glass-strong max-w-3xl">
          <DialogHeader><DialogTitle>Candidate comparison</DialogTitle></DialogHeader>
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${compareIds.length}, 1fr)` }}>
            {candidates.filter(c => compareIds.includes(c.id)).map(c => (
              <div key={c.id} className="rounded-xl border border-border bg-card/60 p-4">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-brand text-sm font-bold text-primary-foreground">{c.name.split(" ").map(n => n[0]).join("")}</div>
                <div className="mt-3 font-semibold">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.location}</div>
                <div className="mt-3 font-display text-2xl font-bold text-gradient">{c.match}%</div>
                <div className="mt-2 text-xs text-muted-foreground">{c.exp} yrs · {c.availability}</div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {c.skills.map(s => <span key={s} className="rounded bg-background/60 px-1.5 py-0.5 text-[10px]">{s}</span>)}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* INVITE MODAL */}
      <Dialog open={showInvite !== null} onOpenChange={(v) => !v && setShowInvite(null)}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle>Send Interview Invitation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-muted-foreground">To: </span>
              <span className="font-medium">{candidates.find(c => c.id === showInvite)?.name}</span>
            </div>
            <Input defaultValue={`Interview invitation — ${campaign.title} @ FAIRSCAN AI`} />
            <Textarea rows={8} value={emailBody} onChange={e => setEmailBody(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(null)}>Cancel</Button>
            <Button onClick={sendInvite} className="bg-gradient-brand text-primary-foreground btn-glow"><Send className="mr-1.5 h-4 w-4" /> Send invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TalentMatch;
