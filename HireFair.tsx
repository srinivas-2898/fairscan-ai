import { useState, useMemo, useEffect } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Upload, FileText, ScanLine, BarChart3, FileDown, ScrollText, Wrench, Award,
  CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, Sparkles, Save,
  Gauge, ShieldCheck, Loader2, RefreshCw, QrCode, Download,
} from "lucide-react";
import { generateProfiles, biasMetrics, Profile } from "@/lib/demoData";
import { MatrixRain } from "@/components/effects/ParticleBackground";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from "recharts";
import confetti from "canvas-confetti";
import { FileUploadPanel } from "@/components/FileUploadPanel";
import { useAuth } from "@/hooks/useAuth";
import { generateAndSaveFairness, generateAndSaveCertificate } from "@/lib/reportService";
import { buildFairnessPdf, buildCsv, downloadBlob } from "@/lib/exporters";
import { useNavigate } from "react-router-dom";

const STEPS = [
  { id: 1, label: "Upload AI", icon: Upload },
  { id: 2, label: "Category", icon: FileText },
  { id: 3, label: "Profiles", icon: Sparkles },
  { id: 4, label: "Scan", icon: ScanLine },
  { id: 5, label: "Results", icon: BarChart3 },
  { id: 6, label: "Fairness", icon: Gauge },
  { id: 7, label: "Report", icon: FileDown },
  { id: 8, label: "License", icon: ScrollText },
  { id: 9, label: "Auto-Fix", icon: Wrench },
  { id: 10, label: "Certificate", icon: Award },
];

const radarData = [
  { dim: "Skills" }, { dim: "Gender" }, { dim: "Ethnicity" },
  { dim: "Age" }, { dim: "Disability" }, { dim: "Location" },
];

const Stepper = ({ current }: { current: number }) => (
  <div className="hide-scrollbar -mx-4 overflow-x-auto px-4">
    <div className="flex min-w-max items-center gap-1 pb-2">
      {STEPS.map((s, i) => {
        const done = current > s.id;
        const active = current === s.id;
        const Icon = s.icon;
        return (
          <div key={s.id} className="flex items-center">
            <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              active ? "bg-gradient-brand text-primary-foreground shadow-[0_0_20px_hsl(187_100%_50%/0.4)]" :
              done ? "bg-success/15 text-success" :
              "bg-card text-muted-foreground"
            }`}>
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.id}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-1 h-px w-4 ${done ? "bg-success" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  </div>
);

const FairnessGauge = ({ value }: { value: number }) => {
  const angle = (value / 100) * 180 - 90;
  const color = value >= 80 ? "hsl(var(--success))" : value >= 60 ? "hsl(var(--warning))" : "hsl(var(--danger))";
  return (
    <div className="relative mx-auto h-44 w-72">
      <svg viewBox="0 0 200 110" className="h-full w-full">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(346 100% 62%)" />
            <stop offset="50%" stopColor="hsl(38 100% 60%)" />
            <stop offset="100%" stopColor="hsl(152 100% 50%)" />
          </linearGradient>
        </defs>
        <path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke="hsl(var(--muted))" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M 10 100 A 90 90 0 0 1 190 100"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray="283"
          strokeDashoffset={283 - (283 * value) / 100}
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
        <line
          x1="100" y1="100" x2="100" y2="22"
          stroke={color} strokeWidth="3" strokeLinecap="round"
          style={{ transformOrigin: "100px 100px", transform: `rotate(${angle}deg)`, transition: "transform 1.4s cubic-bezier(0.22,1,0.36,1)" }}
        />
        <circle cx="100" cy="100" r="6" fill={color} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="font-display text-4xl font-bold" style={{ color }}>{Math.round(value)}</div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Fairness score</div>
      </div>
    </div>
  );
};

const HireFair = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [category, setCategory] = useState<string>("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [genProgress, setGenProgress] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [showLicense, setShowLicense] = useState(false);
  const [licenseAgreed, setLicenseAgreed] = useState(false);
  const [fixed, setFixed] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [savingCert, setSavingCert] = useState(false);

  const metrics = fixed ? biasMetrics.after : biasMetrics.before;
  const fairnessScore = metrics.overall;

  const fixedProfiles = useMemo(() => {
    if (!fixed) return profiles;
    return profiles.map(p => ({
      ...p,
      score: Math.min(98, p.score + (p.gender !== "Male" ? 8 : 2) + (p.ethnicity !== "White" ? 6 : 1)),
      selected: true,
    })).map(p => ({ ...p, selected: p.score >= 65 }));
  }, [profiles, fixed]);

  const radarChartData = radarData.map(d => ({
    dim: d.dim,
    Before: (biasMetrics.before as any)[d.dim.toLowerCase()] ? 60 : 55 + Math.random() * 10,
    After: 90,
  })).map((d, i) => ({
    dim: d.dim,
    Before: [62, 51, 55, 49, 44, 67][i],
    After: [91, 93, 92, 90, 89, 92][i],
  }));

  // step 3: animate profile generation
  useEffect(() => {
    if (step !== 3) return;
    setGenProgress(0);
    setProfiles([]);
    const total = 100;
    let count = 0;
    const all = generateProfiles(total);
    const id = setInterval(() => {
      count += 4;
      setGenProgress(Math.min(100, count));
      setProfiles(all.slice(0, Math.min(total, count)));
      if (count >= total) {
        clearInterval(id);
        toast.success("100 test profiles generated");
      }
    }, 60);
    return () => clearInterval(id);
  }, [step]);

  // step 4: scanning animation
  useEffect(() => {
    if (step !== 4) return;
    setScanProgress(0);
    const id = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) { clearInterval(id); return 100; }
        return p + 2.5;
      });
    }, 60);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (step === 4 && scanProgress >= 100) {
      const t = setTimeout(() => setStep(5), 500);
      return () => clearTimeout(t);
    }
  }, [scanProgress, step]);

  const buildExportPayload = () => ({
    title: `Fairness Audit · ${fileName ?? "Untitled"}`,
    generatedFor: fileName ?? "Untitled model",
    candidatesCount: profiles.length || 100,
    fairnessBefore: biasMetrics.before.overall,
    fairnessAfter: biasMetrics.after.overall,
    metrics: radarChartData.map(r => ({ dim: r.dim, before: r.Before, after: r.After })),
    candidates: (fixed ? fixedProfiles : profiles).slice(0, 30).map(p => ({
      name: p.name, gender: p.gender, ethnicity: p.ethnicity, score: p.score, selected: p.selected,
    })),
  });

  const onDownloadPdfNow = () => {
    const payload = buildExportPayload();
    downloadBlob(buildFairnessPdf(payload), `${payload.title}.pdf`);
    toast.success("PDF downloaded");
  };

  const onDownloadCsvNow = () => {
    const payload = buildExportPayload();
    const rows = payload.metrics.map(m => ({ dimension: m.dim, before: m.before, after: m.after, improvement: m.after - m.before }));
    downloadBlob(buildCsv(rows), `${payload.title}.csv`);
    toast.success("CSV downloaded");
  };

  const onSaveReportToAccount = async () => {
    if (!user) return;
    setSavingReport(true);
    try {
      await generateAndSaveFairness(user.id, buildExportPayload(), {
        sourceFilename: fileName ?? undefined,
        sourceSizeBytes: fileSize || undefined,
      });
      toast.success("Saved to your account · view in My Reports");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save report");
    } finally { setSavingReport(false); }
  };

  const onSaveCertificate = async () => {
    if (!user) return;
    setSavingCert(true);
    try {
      const org = fileName?.replace(/\.[^.]+$/, "") ?? "Acme AI Model";
      await generateAndSaveCertificate(user.id, org, biasMetrics.after.overall);
      toast.success("Certificate saved to your account");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally { setSavingCert(false); }
  };


  const startAutoFix = () => {
    if (!licenseAgreed) { setShowLicense(true); return; }
    setFixing(true);
    setTimeout(() => {
      setFixing(false);
      setFixed(true);
      toast.success("Bias mitigated. Fairness restored to 92.");
      setStep(10);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#00F5FF", "#7B2FFF", "#00FF88"] });
    }, 2200);
  };

  const next = () => setStep(s => Math.min(10, s + 1));
  const prev = () => setStep(s => Math.max(1, s - 1));

  return (
    <div className="container py-8">
      <Breadcrumbs />

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge className="mb-2 border-primary/30 bg-primary/10 text-primary">Bias Detection · Module 01</Badge>
          <h1 className="font-display text-3xl font-bold md:text-4xl">HireFair Scanner</h1>
          <p className="mt-1 text-sm text-muted-foreground">Detect, quantify, and auto-fix bias in any AI decision system.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.success("Draft saved")}><Save className="mr-1.5 h-3.5 w-3.5" /> Save Draft</Button>
          <Button variant="outline" size="sm" onClick={() => { setStep(1); setFixed(false); setFileName(null); setProfiles([]); toast("Session reset"); }}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>

      <Card className="glass mb-6 p-4">
        <Stepper current={step} />
      </Card>

      {/* STEP 1 */}
      {step === 1 && (
        <Card className="glass p-8 md:p-10 animate-fade-in">
          <h2 className="font-display text-2xl font-bold">1. Upload your AI / Criteria</h2>
          <p className="mt-1 text-sm text-muted-foreground">Drop a model file, scoring rubric, or hiring dataset. We scan every upload for safety before processing.</p>
          <div className="mt-6">
            <FileUploadPanel
              label="Drop your dataset, model card, or hiring rubric"
              hint="CSV, JSON or Excel · max 10 MB · automatically scanned"
              onComplete={({ file }) => { setFileName(file.name); setFileSize(file.size); }}
            />
          </div>
          <div className="mt-8 flex justify-end">
            <Button onClick={next} disabled={!fileName} className="bg-gradient-brand text-primary-foreground btn-glow">
              Continue <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <Card className="glass p-8 md:p-10 animate-fade-in">
          <h2 className="font-display text-2xl font-bold">2. Select AI Use Category</h2>
          <p className="mt-1 text-sm text-muted-foreground">Helps us tune fairness benchmarks to your domain.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              "Hiring & Recruitment", "Lending & Credit", "Insurance Underwriting",
              "Healthcare Triage", "Education Admissions", "Criminal Justice",
              "Content Moderation", "Customer Eligibility",
            ].map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  category === c ? "border-primary bg-primary/10 shadow-[0_0_24px_hsl(187_100%_50%/0.25)]" : "border-border bg-card/60 hover:border-primary/50"
                }`}
              >
                <div className="font-medium">{c}</div>
                <div className="mt-1 text-xs text-muted-foreground">Benchmarked against 240+ models</div>
              </button>
            ))}
          </div>
          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={prev}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
            <Button onClick={next} disabled={!category} className="bg-gradient-brand text-primary-foreground btn-glow">
              Continue <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <Card className="glass p-8 md:p-10 animate-fade-in">
          <h2 className="font-display text-2xl font-bold">3. Generating 100 Test Profiles</h2>
          <p className="mt-1 text-sm text-muted-foreground">Statistically representative synthetic candidates with balanced protected attributes.</p>
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono text-primary">{profiles.length} / 100</span>
              <span className="text-muted-foreground">{Math.round(genProgress)}%</span>
            </div>
            <Progress value={genProgress} className="mt-2 h-2" />
          </div>
          <div className="mt-6 grid max-h-80 grid-cols-2 gap-2 overflow-y-auto pr-2 sm:grid-cols-4 lg:grid-cols-5">
            {profiles.slice(0, 30).map((p) => (
              <div key={p.id} className="glass animate-scale-in rounded-lg border border-border/60 p-2.5">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-brand text-[10px] font-bold text-primary-foreground">
                    {p.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium">{p.name}</div>
                    <div className="truncate text-[10px] text-muted-foreground">{p.gender} · {p.age}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={prev}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
            <Button onClick={next} disabled={genProgress < 100} className="bg-gradient-brand text-primary-foreground btn-glow">
              Run Scan <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 4 — Scanning with Matrix Rain */}
      {step === 4 && (
        <Card className="glass relative overflow-hidden p-8 md:p-10 animate-fade-in">
          <div className="absolute inset-0 opacity-30"><MatrixRain /></div>
          <div className="relative">
            <h2 className="font-display text-2xl font-bold">4. Scanning AI for bias…</h2>
            <p className="mt-1 text-sm text-muted-foreground">Running profiles through your model & measuring outcome disparities.</p>
            <div className="mt-8 grid place-items-center py-8">
              <div className="relative grid h-32 w-32 place-items-center">
                <div className="absolute inset-0 animate-pulse-glow rounded-full" />
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
              </div>
              <div className="mt-6 font-mono text-sm text-primary">{Math.round(scanProgress)}% — Evaluating disparate impact</div>
              <Progress value={scanProgress} className="mt-3 h-2 w-72" />
            </div>
          </div>
        </Card>
      )}

      {/* STEP 5 */}
      {step === 5 && (
        <Card className="glass p-6 md:p-8 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold">5. Scan Results</h2>
              <p className="mt-1 text-sm text-muted-foreground">Selected vs rejected by your AI.</p>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="chip"><span className="h-2 w-2 rounded-full bg-success" /> Selected: {(fixed ? fixedProfiles : profiles).filter(p => p.selected).length}</span>
              <span className="chip"><span className="h-2 w-2 rounded-full bg-danger" /> Rejected: {(fixed ? fixedProfiles : profiles).filter(p => !p.selected).length}</span>
            </div>
          </div>
          <div className="mt-5 max-h-[460px] overflow-auto rounded-lg border border-border/60">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card/80 backdrop-blur">
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">#</th><th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Gender</th><th className="px-4 py-3">Ethnicity</th>
                  <th className="px-4 py-3">Age</th><th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Result</th>
                </tr>
              </thead>
              <tbody>
                {(fixed ? fixedProfiles : profiles).slice(0, 40).map(p => (
                  <tr key={p.id} className="border-b border-border/40 transition-colors hover:bg-card/60">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{String(p.id).padStart(3, "0")}</td>
                    <td className="px-4 py-2.5 font-medium">{p.name}</td>
                    <td className="px-4 py-2.5">{p.gender}</td>
                    <td className="px-4 py-2.5">{p.ethnicity}</td>
                    <td className="px-4 py-2.5">{p.age}</td>
                    <td className="px-4 py-2.5 font-mono">{p.score}</td>
                    <td className="px-4 py-2.5">
                      {p.selected
                        ? <span className="inline-flex items-center gap-1 rounded-md bg-success/15 px-2 py-0.5 text-xs font-medium text-success"><CheckCircle2 className="h-3 w-3" /> Selected</span>
                        : <span className="inline-flex items-center gap-1 rounded-md bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger"><AlertTriangle className="h-3 w-3" /> Rejected</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={prev}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
            <Button onClick={next} className="bg-gradient-brand text-primary-foreground btn-glow">Analyze Fairness <ArrowRight className="ml-1 h-4 w-4" /></Button>
          </div>
        </Card>
      )}

      {/* STEP 6 */}
      {step === 6 && (
        <div className="grid gap-6 lg:grid-cols-3 animate-fade-in">
          <Card className="glass p-6 lg:col-span-1">
            <h3 className="font-display text-lg font-semibold">Overall Fairness</h3>
            <FairnessGauge value={fairnessScore} />
            <div className="mt-4 text-center text-xs text-muted-foreground">
              {fairnessScore >= 80 ? "Compliant ✓" : "Bias detected — mitigation recommended"}
            </div>
          </Card>
          <Card className="glass p-6 lg:col-span-2">
            <h3 className="font-display text-lg font-semibold">Selection rate by gender</h3>
            <div className="mt-3 h-64">
              <ResponsiveContainer>
                <BarChart data={Object.entries(metrics.gender).map(([k, v]) => ({ group: k, rate: v }))}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(187 100% 50%)" />
                      <stop offset="100%" stopColor="hsl(263 100% 59%)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="group" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="rate" fill="url(#barGrad)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="glass p-6 lg:col-span-3">
            <h3 className="font-display text-lg font-semibold">Fairness across attributes</h3>
            <div className="mt-3 h-72">
              <ResponsiveContainer>
                <RadarChart data={radarChartData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="dim" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <Radar name="Before" dataKey="Before" stroke="hsl(var(--danger))" fill="hsl(var(--danger))" fillOpacity={0.25} />
                  <Radar name="After Fix" dataKey="After" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.25} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <div className="lg:col-span-3 flex justify-between">
            <Button variant="outline" onClick={prev}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
            <Button onClick={next} className="bg-gradient-brand text-primary-foreground btn-glow">Generate Report <ArrowRight className="ml-1 h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* STEP 7 */}
      {step === 7 && (
        <Card className="glass p-8 md:p-10 animate-fade-in">
          <h2 className="font-display text-2xl font-bold">7. Audit Report</h2>
          <p className="mt-1 text-sm text-muted-foreground">Regulator-ready PDF with full methodology, findings, and recommendations.</p>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="gradient-border p-6">
              <FileText className="h-10 w-10 text-primary" />
              <h3 className="mt-3 font-display text-lg font-semibold">FAIRSCAN_Audit_{Date.now().toString().slice(-6)}.pdf</h3>
              <p className="mt-1 text-xs text-muted-foreground">42 pages · 3.8 MB · Signed</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Methodology & test set</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Bias findings (28 flagged)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> EU AI Act mapping</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Mitigation roadmap</li>
              </ul>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Button className="col-span-2 bg-gradient-brand text-primary-foreground btn-glow" onClick={onSaveReportToAccount} disabled={savingReport || !user}>
                  {savingReport ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                  Save PDF + CSV to my account
                </Button>
                <Button variant="outline" size="sm" onClick={onDownloadPdfNow}><Download className="mr-1.5 h-3.5 w-3.5" /> PDF</Button>
                <Button variant="outline" size="sm" onClick={onDownloadCsvNow}><Download className="mr-1.5 h-3.5 w-3.5" /> CSV</Button>
                <Button variant="ghost" size="sm" className="col-span-2 text-xs text-muted-foreground" onClick={() => nav("/history")}>
                  View all my reports →
                </Button>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card/60 p-6 text-sm">
              <h4 className="font-display font-semibold">Executive summary</h4>
              <p className="mt-2 text-muted-foreground">Your model exhibits <span className="font-semibold text-danger">significant disparate impact</span> against female and non-white applicants (4/5 ratio violation). Selection rate gap reaches 26 percentage points.</p>
              <p className="mt-3 text-muted-foreground">Auto-fix can restore parity without retraining and recover top-line accuracy within ±0.8%.</p>
            </div>
          </div>
          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={prev}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
            <Button onClick={() => { setShowLicense(true); setStep(8); }} className="bg-gradient-brand text-primary-foreground btn-glow">Proceed to Auto-Fix <ArrowRight className="ml-1 h-4 w-4" /></Button>
          </div>
        </Card>
      )}

      {/* STEP 8 / 9 — license + auto-fix */}
      {(step === 8 || step === 9) && (
        <Card className="glass p-8 md:p-10 animate-fade-in">
          <h2 className="font-display text-2xl font-bold">{step === 8 ? "8. License Agreement" : "9. Auto-Fix Bias"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{step === 8 ? "Review and accept terms before mitigation." : "Calibrated post-processing applied to your model."}</p>

          {step === 8 ? (
            <div className="mt-6">
              <div className="max-h-64 overflow-y-auto rounded-xl border border-border bg-card/60 p-5 text-xs leading-relaxed text-muted-foreground">
                <p>By proceeding, you grant FAIRSCAN AI a limited, non-transferable license to apply post-processing fairness calibrations to the uploaded model artifact. All transformations are auditable, reversible, and logged with cryptographic hashes…</p>
                <p className="mt-2">FAIRSCAN AI does not retain model weights, gradients, or training data after the session ends. Output certificates are signed with EdDSA and verifiable via the public registry…</p>
                <p className="mt-2">You retain all IP. SLA: 99.95% uptime. SOC 2 Type II, ISO 42001…</p>
              </div>
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card/40 p-4">
                <Checkbox checked={licenseAgreed} onCheckedChange={(v) => setLicenseAgreed(!!v)} />
                <span className="text-sm">I have read and agree to the FAIRSCAN AI Mitigation License v3.2.</span>
              </label>
              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep(7)}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
                <Button disabled={!licenseAgreed} onClick={() => setStep(9)} className="bg-gradient-brand text-primary-foreground btn-glow">Accept & Continue</Button>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              {!fixed ? (
                <div className="grid place-items-center py-10">
                  <div className="relative grid h-32 w-32 place-items-center">
                    {fixing && <div className="absolute inset-0 animate-pulse-glow rounded-full" />}
                    <Wrench className={`h-14 w-14 text-primary ${fixing ? "animate-spin" : ""}`} />
                  </div>
                  <p className="mt-6 max-w-md text-center text-sm text-muted-foreground">
                    {fixing ? "Reweighting outputs · calibrating thresholds · validating accuracy…" : "Click below to apply mitigation."}
                  </p>
                  <Button onClick={startAutoFix} disabled={fixing} className="mt-6 bg-gradient-success text-success-foreground btn-glow">
                    {fixing ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Mitigating</> : <><Sparkles className="mr-1.5 h-4 w-4" /> Run Auto-Fix</>}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {(["before", "after"] as const).map((k) => (
                    <div key={k} className={`rounded-xl border p-5 ${k === "after" ? "border-success/40 bg-success/5" : "border-danger/40 bg-danger/5"}`}>
                      <div className="flex items-center justify-between">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">{k}</div>
                        <Badge className={k === "after" ? "bg-success/20 text-success" : "bg-danger/20 text-danger"}>
                          {biasMetrics[k].overall} fairness
                        </Badge>
                      </div>
                      <div className="mt-3 space-y-2">
                        {Object.entries(biasMetrics[k].gender).map(([g, v]) => (
                          <div key={g}>
                            <div className="flex justify-between text-xs"><span>{g}</span><span className="font-mono">{v}%</span></div>
                            <div className="mt-1 h-1.5 rounded-full bg-muted">
                              <div className="h-full rounded-full" style={{ width: `${v}%`, background: k === "after" ? "hsl(var(--success))" : "hsl(var(--danger))" }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* STEP 10 — premium gold certificate */}
      {step === 10 && (
        <div className="animate-fade-in">
          <Card className="relative overflow-hidden p-6 md:p-10" style={{ background: "linear-gradient(135deg, hsl(230 60% 9%) 0%, hsl(222 50% 14%) 100%)" }}>
            <div className="grid-bg absolute inset-0 opacity-10" />
            {/* Gold ornate border */}
            <div className="relative rounded-2xl p-6 md:p-10" style={{
              background: "linear-gradient(135deg, hsl(45 70% 55% / 0.18), hsl(45 70% 35% / 0.05) 50%, hsl(45 70% 55% / 0.18))",
              border: "2px solid hsl(45 75% 55%)",
              boxShadow: "0 0 0 1px hsl(45 75% 55% / 0.4) inset, 0 0 60px hsl(45 75% 55% / 0.15)",
            }}>
              {/* Inner thin gold frame */}
              <div className="pointer-events-none absolute inset-3 rounded-xl border border-[hsl(45_75%_55%/0.4)]" />

              {/* Corner gold flourishes */}
              {[
                { c: "left-2 top-2", r: "" },
                { c: "right-2 top-2", r: "rotate-90" },
                { c: "right-2 bottom-2", r: "rotate-180" },
                { c: "left-2 bottom-2", r: "-rotate-90" },
              ].map((p) => (
                <svg key={p.c} viewBox="0 0 60 60" className={`pointer-events-none absolute h-10 w-10 ${p.c} ${p.r}`}>
                  <path d="M2 2 L40 2 M2 2 L2 40 M2 2 L18 18 M14 6 L26 6 M6 14 L6 26" stroke="hsl(45 75% 60%)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                  <circle cx="20" cy="20" r="2" fill="hsl(45 80% 65%)" />
                </svg>
              ))}

              {/* Top ribbon */}
              <div className="relative mx-auto -mt-12 mb-6 w-fit rounded-md px-6 py-2 text-center"
                   style={{ background: "linear-gradient(180deg, hsl(45 80% 60%), hsl(45 70% 45%))", boxShadow: "0 6px 20px hsl(45 75% 50% / 0.4)" }}>
                <div className="font-display text-xs font-bold tracking-[0.35em] text-[hsl(230_60%_8%)]">FAIRSCAN AI · ETHICAL AI VERIFIED</div>
              </div>

              <div className="relative text-center">
                <div className="font-display italic text-sm tracking-wide" style={{ color: "hsl(45 80% 70%)" }}>
                  Independent Bias & Fairness Audit
                </div>
                <h2 className="mt-3 font-display text-4xl font-bold leading-none md:text-5xl" style={{
                  background: "linear-gradient(180deg, #fff 0%, hsl(45 70% 80%) 100%)",
                  WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
                  textShadow: "0 0 40px hsl(45 75% 60% / 0.3)",
                }}>
                  Certificate of Fairness
                </h2>
                <div className="mx-auto mt-3 flex items-center justify-center gap-2">
                  <span className="h-px w-24" style={{ background: "linear-gradient(90deg, transparent, hsl(45 75% 60%))" }} />
                  <span className="h-1.5 w-1.5 rotate-45" style={{ background: "hsl(45 80% 65%)" }} />
                  <span className="h-px w-24" style={{ background: "linear-gradient(90deg, hsl(45 75% 60%), transparent)" }} />
                </div>

                <p className="mt-6 text-sm" style={{ color: "hsl(45 30% 85%)" }}>This certifies that</p>
                <div className="mt-2 font-display text-3xl font-bold italic md:text-4xl" style={{ color: "hsl(45 80% 70%)" }}>
                  {fileName?.replace(/\.[^.]+$/, "") ?? "Acme AI Model"}
                </div>
                <p className="mx-auto mt-3 max-w-2xl text-xs leading-relaxed text-muted-foreground md:text-sm">
                  has successfully completed an independent FAIRSCAN AI audit for bias, demographic parity, and ethical AI compliance under the
                  <span className="font-semibold text-foreground"> EU AI Act</span>,
                  <span className="font-semibold text-foreground"> ISO/IEC 42001</span>,
                  and <span className="font-semibold text-foreground">SOC 2 Type II</span> frameworks.
                </p>

                <div className="mt-8 grid items-center gap-6 md:grid-cols-3">
                  {/* Big gold seal with score (left) */}
                  <div className="grid place-items-center">
                    <div className="relative" style={{ animation: "drop-stamp 1s cubic-bezier(0.22,1,0.36,1) both", animationDelay: "0.3s" }}>
                      <div className="grid h-36 w-36 place-items-center rounded-full"
                           style={{
                             background: "radial-gradient(circle at 30% 30%, hsl(45 90% 70%), hsl(45 70% 40%))",
                             boxShadow: "0 0 30px hsl(45 75% 50% / 0.5), inset 0 0 20px hsl(45 100% 80% / 0.4)",
                           }}>
                        <div className="grid h-28 w-28 place-items-center rounded-full border-2 border-[hsl(45_80%_75%)] bg-[hsl(230_60%_10%)]">
                          <div className="text-center">
                            <div className="text-[8px] font-bold tracking-[0.25em]" style={{ color: "hsl(45 70% 70%)" }}>FAIRNESS</div>
                            <div className="font-display text-3xl font-bold" style={{ color: "hsl(45 85% 65%)" }}>{biasMetrics.after.overall}</div>
                            <div className="text-[8px]" style={{ color: "hsl(45 30% 75%)" }}>/ 100</div>
                          </div>
                        </div>
                      </div>
                      {/* Verdict ribbon */}
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded px-2 py-0.5 text-[9px] font-bold tracking-wider"
                           style={{ background: "hsl(45 80% 55%)", color: "hsl(230 60% 10%)" }}>
                        PLATINUM TIER
                      </div>
                    </div>
                  </div>

                  {/* Verdict text (center) */}
                  <div className="space-y-3 text-center">
                    <Badge className="border-[hsl(45_75%_55%/0.4)] bg-[hsl(45_75%_55%/0.15)]" style={{ color: "hsl(45 80% 70%)" }}>
                      <ShieldCheck className="mr-1 h-3 w-3" /> Verified by FAIRSCAN AI
                    </Badge>
                    <div className="space-y-2 text-left text-xs">
                      <div className="flex justify-between border-b border-[hsl(45_75%_55%/0.2)] pb-1.5">
                        <span className="text-muted-foreground">Category</span>
                        <span className="font-semibold">{category || "Hiring & Recruitment"}</span>
                      </div>
                      <div className="flex justify-between border-b border-[hsl(45_75%_55%/0.2)] pb-1.5">
                        <span className="text-muted-foreground">Profiles tested</span>
                        <span className="font-mono">{profiles.length || 100}</span>
                      </div>
                      <div className="flex justify-between border-b border-[hsl(45_75%_55%/0.2)] pb-1.5">
                        <span className="text-muted-foreground">Accuracy Δ</span>
                        <span className="font-mono">−0.8%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valid until</span>
                        <span className="font-semibold">12 months</span>
                      </div>
                    </div>
                  </div>

                  {/* QR (right) */}
                  <div className="grid place-items-center">
                    <div className="rounded-lg bg-white p-3 shadow-2xl">
                      <QrCode className="h-24 w-24 text-[hsl(230_60%_10%)]" strokeWidth={1.4} />
                    </div>
                    <div className="mt-2 text-[10px] font-bold tracking-[0.2em]" style={{ color: "hsl(45 75% 70%)" }}>SCAN TO VERIFY</div>
                  </div>
                </div>

                {/* Signature row */}
                <div className="mt-10 grid gap-6 md:grid-cols-2">
                  <div className="text-center">
                    <div className="mx-auto h-10 w-56 border-b border-[hsl(45_75%_55%/0.5)]">
                      <div className="font-display text-2xl italic" style={{ color: "hsl(45 80% 70%)" }}>Dr. E. Voss</div>
                    </div>
                    <div className="mt-2 text-[10px] font-bold tracking-wider" style={{ color: "hsl(45 70% 70%)" }}>DR. ELENA VOSS · CHIEF AUDIT OFFICER</div>
                    <div className="text-[9px] text-muted-foreground">FAIRSCAN AI · Ethics Board</div>
                  </div>
                  <div className="text-center">
                    <div className="mx-auto h-10 w-56 border-b border-[hsl(45_75%_55%/0.5)]">
                      <div className="font-display text-lg font-bold tracking-wider" style={{ color: "hsl(45 80% 70%)" }}>
                        {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] font-bold tracking-wider" style={{ color: "hsl(45 70% 70%)" }}>DATE OF ISSUE</div>
                    <div className="text-[9px] text-muted-foreground">Valid for 12 months from issue</div>
                  </div>
                </div>

                {/* Footer ID */}
                <div className="mt-8 rounded border border-[hsl(45_75%_55%/0.4)] bg-[hsl(230_60%_8%/0.6)] py-2">
                  <div className="font-mono text-xs tracking-[0.2em]" style={{ color: "hsl(45 75% 65%)" }}>
                    CERTIFICATE ID · FSAI-{Date.now().toString(36).toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Button onClick={onSaveCertificate} disabled={savingCert || !user} className="bg-gradient-brand text-primary-foreground btn-glow">
                {savingCert ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Award className="mr-1.5 h-4 w-4" />}
                Save certificate to my account
              </Button>
              <Button variant="outline" onClick={onDownloadPdfNow}>
                <Download className="mr-1.5 h-4 w-4" /> Quick PDF
              </Button>
              <Button variant="outline" onClick={() => nav("/history")}>
                <FileText className="mr-1.5 h-4 w-4" /> My reports
              </Button>
              <Button variant="outline" onClick={() => { setStep(1); setFixed(false); setFileName(null); setProfiles([]); }}>
                <RefreshCw className="mr-1.5 h-4 w-4" /> New Scan
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* License modal (alternate trigger) */}
      <Dialog open={showLicense && step !== 8} onOpenChange={setShowLicense}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle>License Required</DialogTitle>
            <DialogDescription>Please accept the FAIRSCAN AI Mitigation License before applying auto-fix.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => { setShowLicense(false); setStep(8); }}>Review License</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HireFair;
