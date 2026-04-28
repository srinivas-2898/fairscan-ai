import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Shield, Users as UsersIcon, ScanLine, Award, FileBarChart, FileText, Mail,
  Building2, Plus, Pencil, Trash2, Save, X, Download, Loader2, Search,
  ShieldCheck, Activity, Settings, Upload, Image as ImageIcon, Palette,
  ToggleLeft, ToggleRight, Sparkles, FileDown, ServerCog, AlertTriangle,
  GitBranch, Radio, CheckCircle2, Clock, Star, History as HistoryIcon,
} from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CountUp } from "@/components/effects/CountUp";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/activityLog";
import { generateResumeBundle } from "@/lib/resumeGenerator";
import { downloadBlob } from "@/lib/exporters";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";

type Category = {
  id: string; name: string; description: string | null; icon: string | null;
  color: string | null; active: boolean; created_at: string;
};
type LogRow = {
  id: string; user_id: string; actor_email: string | null;
  action: string; entity: string | null; entity_id: string | null;
  details: any; severity: string; created_at: string;
};
type TemplateVersion = {
  id: string; version: string; name: string; notes: string | null;
  category: string | null; schema: any; is_published: boolean;
  is_default: boolean; published_at: string | null; created_at: string; updated_at: string;
};
type TemplateUsage = {
  id: string; template_version_id: string; template_version: string;
  user_id: string; user_email: string | null; category: string | null;
  resume_count: number; created_at: string;
};

type RangeKey = "1h" | "24h" | "7d" | "30d";
const RANGES: Record<RangeKey, { label: string; ms: number; bucketMs: number; bucketFmt: (d: Date) => string }> = {
  "1h":  { label: "Last hour",   ms: 3600_000,         bucketMs: 5 * 60_000,    bucketFmt: d => d.toTimeString().slice(0, 5) },
  "24h": { label: "Last 24h",    ms: 86_400_000,       bucketMs: 60 * 60_000,   bucketFmt: d => d.getHours().toString().padStart(2, "0") + ":00" },
  "7d":  { label: "Last 7 days", ms: 7 * 86_400_000,   bucketMs: 24 * 3600_000, bucketFmt: d => d.toISOString().slice(5, 10) },
  "30d": { label: "Last 30 days",ms: 30 * 86_400_000,  bucketMs: 24 * 3600_000, bucketFmt: d => d.toISOString().slice(5, 10) },
};

const COLORS = ["#00F5FF", "#7B2FFF", "#00FF88", "#FF3B6B", "#FFB020", "#3B82F6"];

export default function AdminControlCenter() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState("overview");

  // Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [reportCount, setReportCount] = useState(0);
  const [certCount, setCertCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [reports30d, setReports30d] = useState<{ d: string; v: number }[]>([]);
  const [reportsByKind, setReportsByKind] = useState<{ name: string; value: number; color: string }[]>([]);
  const [avgFairnessBefore, setAvgFairnessBefore] = useState(0);
  const [avgFairnessAfter, setAvgFairnessAfter] = useState(0);
  const [totalCandidates, setTotalCandidates] = useState(0);

  const [loadingData, setLoadingData] = useState(true);

  // Settings
  const [settings, setSettings] = useState({
    brandName: "FAIRSCAN AI",
    primary: "#00F5FF",
    secondary: "#7B2FFF",
    enableHireFair: true,
    enableTalentMatch: true,
    enableCertificates: true,
    enablePublicSignup: true,
  });

  // Resume generator
  const [genCategory, setGenCategory] = useState("");
  const [genCount, setGenCount] = useState(100);
  const [genProgress, setGenProgress] = useState({ done: 0, total: 0 });
  const [generating, setGenerating] = useState(false);

  // Templates + usage
  const [templates, setTemplates] = useState<TemplateVersion[]>([]);
  const [templateUsage, setTemplateUsage] = useState<TemplateUsage[]>([]);
  const [genTemplateId, setGenTemplateId] = useState<string>("");
  const [editingTemplate, setEditingTemplate] = useState<Partial<TemplateVersion> | null>(null);

  // Realtime widgets
  const [range, setRange] = useState<RangeKey>("24h");
  const [recentReports, setRecentReports] = useState<{ created_at: string; kind: string; source_size_bytes: number | null }[]>([]);
  const [livePulse, setLivePulse] = useState(0);

  // Logs filter
  const [logSearch, setLogSearch] = useState("");
  const [logSeverity, setLogSeverity] = useState<string>("all");

  const refreshAll = async () => {
    setLoadingData(true);
    const [cats, logsRes, reports, profilesCount, tplRes, usageRes] = await Promise.all([
      supabase.from("scan_categories").select("*").order("created_at", { ascending: true }),
      supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("scan_reports").select("kind, candidates_count, fairness_before, fairness_after, created_at, source_size_bytes").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("resume_template_versions").select("*").order("created_at", { ascending: false }),
      supabase.from("resume_template_usage").select("*").order("created_at", { ascending: false }).limit(500),
    ]);

    if (cats.data) setCategories(cats.data as Category[]);
    if (logsRes.data) setLogs(logsRes.data as LogRow[]);
    if (profilesCount.count != null) setUserCount(profilesCount.count);
    if (tplRes.data) {
      setTemplates(tplRes.data as TemplateVersion[]);
      if (!genTemplateId) {
        const def = (tplRes.data as TemplateVersion[]).find(t => t.is_default && t.is_published)
                 ?? (tplRes.data as TemplateVersion[]).find(t => t.is_published);
        if (def) setGenTemplateId(def.id);
      }
    }
    if (usageRes.data) setTemplateUsage(usageRes.data as TemplateUsage[]);

    const rows = (reports.data ?? []) as any[];
    setRecentReports(rows.map(r => ({ created_at: r.created_at, kind: r.kind, source_size_bytes: r.source_size_bytes })));
    setReportCount(rows.length);
    setCertCount(rows.filter(r => r.kind === "certificate").length);
    setTotalCandidates(rows.reduce((s, r) => s + (r.candidates_count ?? 0), 0));

    const withBefore = rows.filter(r => r.fairness_before != null);
    const withAfter = rows.filter(r => r.fairness_after != null);
    setAvgFairnessBefore(withBefore.length ? withBefore.reduce((s, r) => s + Number(r.fairness_before), 0) / withBefore.length : 0);
    setAvgFairnessAfter(withAfter.length ? withAfter.reduce((s, r) => s + Number(r.fairness_after), 0) / withAfter.length : 0);

    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days[d.toISOString().slice(5, 10)] = 0;
    }
    rows.forEach(r => {
      const k = String(r.created_at).slice(5, 10);
      if (k in days) days[k] += 1;
    });
    setReports30d(Object.entries(days).map(([d, v]) => ({ d, v })));

    const kinds: Record<string, number> = {};
    rows.forEach(r => { kinds[r.kind] = (kinds[r.kind] ?? 0) + 1; });
    setReportsByKind(Object.entries(kinds).map(([name, value], i) => ({
      name, value, color: COLORS[i % COLORS.length],
    })));

    setLoadingData(false);
  };

  useEffect(() => { refreshAll(); }, []);

  // ------- Realtime subscriptions: scans, reports, uploads, template usage -------
  useEffect(() => {
    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "scan_reports" }, (payload) => {
        setLivePulse(p => p + 1);
        if (payload.eventType === "INSERT") {
          const r = payload.new as any;
          setRecentReports(prev => [{ created_at: r.created_at, kind: r.kind, source_size_bytes: r.source_size_bytes }, ...prev].slice(0, 500));
          setReportCount(p => p + 1);
          if (r.kind === "certificate") setCertCount(p => p + 1);
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, (payload) => {
        setLogs(prev => [payload.new as LogRow, ...prev].slice(0, 200));
        setLivePulse(p => p + 1);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "resume_template_usage" }, () => {
        supabase.from("resume_template_usage").select("*").order("created_at", { ascending: false }).limit(500)
          .then(r => { if (r.data) setTemplateUsage(r.data as TemplateUsage[]); });
        setLivePulse(p => p + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ------- Time-range bucketing for live widgets -------
  const liveSeries = useMemo(() => {
    const cfg = RANGES[range];
    const now = Date.now();
    const start = now - cfg.ms;
    const buckets: { t: number; label: string; scans: number; uploads: number; reports: number }[] = [];
    for (let t = start; t <= now; t += cfg.bucketMs) {
      buckets.push({ t, label: cfg.bucketFmt(new Date(t)), scans: 0, uploads: 0, reports: 0 });
    }
    recentReports.forEach(r => {
      const ts = new Date(r.created_at).getTime();
      if (ts < start) return;
      const idx = Math.min(buckets.length - 1, Math.floor((ts - start) / cfg.bucketMs));
      if (idx < 0) return;
      buckets[idx].scans += 1;
      buckets[idx].reports += 1;
      if (r.source_size_bytes && r.source_size_bytes > 0) buckets[idx].uploads += 1;
    });
    return buckets;
  }, [recentReports, range, livePulse]);

  const liveTotals = useMemo(() => {
    const start = Date.now() - RANGES[range].ms;
    let scans = 0, uploads = 0, reports = 0, bytes = 0;
    recentReports.forEach(r => {
      const ts = new Date(r.created_at).getTime();
      if (ts < start) return;
      scans += 1; reports += 1;
      if (r.source_size_bytes) { uploads += 1; bytes += r.source_size_bytes; }
    });
    return { scans, uploads, reports, bytes };
  }, [recentReports, range, livePulse]);

  // ------------ KPIs ------------
  const kpis = [
    { label: "Total Users", value: userCount, icon: UsersIcon, color: "primary" },
    { label: "Companies", value: Math.max(1, Math.round(userCount * 0.6)), icon: Building2, color: "secondary" },
    { label: "HireFair Scans", value: reportCount, icon: ScanLine, color: "primary" },
    { label: "TalentMatch Campaigns", value: reportsByKind.find(k => k.name === "talentmatch")?.value ?? 0, icon: UsersIcon, color: "secondary" },
    { label: "Bias Reports", value: reportsByKind.find(k => k.name === "fairness")?.value ?? 0, icon: FileBarChart, color: "primary" },
    { label: "Certificates Issued", value: certCount, icon: Award, color: "warning" },
    { label: "Candidates Screened", value: totalCandidates, icon: UsersIcon, color: "primary" },
    { label: "Interview Invites", value: Math.round(totalCandidates * 0.18), icon: Mail, color: "secondary" },
  ] as const;

  // ------------ Categories ------------
  const [editing, setEditing] = useState<Partial<Category> | null>(null);

  const saveCategory = async () => {
    if (!editing?.name?.trim()) return toast.error("Name required");
    if (!user) return;
    const payload = {
      name: editing.name.trim(),
      description: editing.description ?? null,
      icon: editing.icon ?? "📊",
      color: editing.color ?? "#00F5FF",
      active: editing.active ?? true,
      created_by: user.id,
    };
    if (editing.id) {
      const { error } = await supabase.from("scan_categories").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Category updated");
      logActivity(user.id, "category.update", { entity: "scan_categories", entityId: editing.id, details: payload, actorEmail: user.email });
    } else {
      const { data, error } = await supabase.from("scan_categories").insert(payload).select().single();
      if (error) return toast.error(error.message);
      toast.success("Category created");
      logActivity(user.id, "category.create", { entity: "scan_categories", entityId: data?.id, details: payload, actorEmail: user.email });
    }
    setEditing(null);
    refreshAll();
  };

  const removeCategory = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    const { error } = await supabase.from("scan_categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Category removed");
    if (user) logActivity(user.id, "category.delete", { entity: "scan_categories", entityId: id, severity: "warning", actorEmail: user.email });
    refreshAll();
  };

  const toggleCategory = async (c: Category) => {
    const { error } = await supabase.from("scan_categories").update({ active: !c.active }).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(`Category ${!c.active ? "activated" : "deactivated"}`);
    if (user) logActivity(user.id, "category.toggle", { entity: "scan_categories", entityId: c.id, details: { active: !c.active }, actorEmail: user.email });
    refreshAll();
  };

  // ------------ Resume generator ------------
  const generateResumes = async () => {
    if (!genCategory) return toast.error("Select a category");
    if (!genTemplateId) return toast.error("Select a template version");
    const tpl = templates.find(t => t.id === genTemplateId);
    if (!tpl) return toast.error("Template not found");
    if (!tpl.is_published) return toast.error("Template is not published");
    setGenerating(true);
    setGenProgress({ done: 0, total: genCount });
    try {
      const blob = await generateResumeBundle({
        count: genCount, category: genCategory, templateVersion: tpl.version,
        onProgress: (done, total) => setGenProgress({ done, total }),
      });
      const fname = `fairscan-resumes-${genCategory.replace(/\W+/g, "-").toLowerCase()}-${tpl.version}-${Date.now()}.zip`;
      downloadBlob(blob, fname);
      toast.success(`${genCount} resumes generated · ${tpl.version} · ${(blob.size / 1024 / 1024).toFixed(1)} MB`);
      if (user) {
        await supabase.from("resume_template_usage").insert({
          template_version_id: tpl.id, template_version: tpl.version,
          user_id: user.id, user_email: user.email ?? null,
          category: genCategory, resume_count: genCount,
        });
        logActivity(user.id, "resumes.generate", {
          entity: "resume_bundle",
          details: { category: genCategory, count: genCount, template: tpl.version },
          actorEmail: user.email,
        });
      }
    } catch (e: any) {
      toast.error(e.message ?? "Generation failed");
    } finally { setGenerating(false); }
  };

  // ------------ Templates ------------
  const saveTemplate = async () => {
    if (!editingTemplate?.version?.trim() || !editingTemplate.name?.trim()) {
      return toast.error("Version and name required");
    }
    if (!user) return;
    const payload: any = {
      version: editingTemplate.version.trim(),
      name: editingTemplate.name.trim(),
      notes: editingTemplate.notes ?? null,
      category: editingTemplate.category ?? null,
      schema: editingTemplate.schema ?? {},
      is_published: editingTemplate.is_published ?? false,
      is_default: editingTemplate.is_default ?? false,
      published_at: editingTemplate.is_published ? (editingTemplate.published_at ?? new Date().toISOString()) : null,
    };
    if (editingTemplate.id) {
      const { error } = await supabase.from("resume_template_versions").update(payload).eq("id", editingTemplate.id);
      if (error) return toast.error(error.message);
      toast.success(`Template ${payload.version} saved`);
      logActivity(user.id, "template.update", { entity: "resume_template_versions", entityId: editingTemplate.id, details: payload, actorEmail: user.email });
    } else {
      payload.created_by = user.id;
      const { data, error } = await supabase.from("resume_template_versions").insert(payload).select().single();
      if (error) return toast.error(error.message);
      toast.success(`Template ${payload.version} created`);
      logActivity(user.id, "template.create", { entity: "resume_template_versions", entityId: data?.id, details: payload, actorEmail: user.email });
    }
    setEditingTemplate(null);
    refreshAll();
  };

  const togglePublish = async (t: TemplateVersion) => {
    const next = !t.is_published;
    const { error } = await supabase.from("resume_template_versions").update({
      is_published: next, published_at: next ? new Date().toISOString() : null,
    }).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success(`${t.version} ${next ? "published" : "unpublished"}`);
    if (user) logActivity(user.id, next ? "template.publish" : "template.unpublish", { entity: "resume_template_versions", entityId: t.id, details: { version: t.version }, actorEmail: user.email, severity: "success" });
    refreshAll();
  };

  const setDefaultTemplate = async (t: TemplateVersion) => {
    if (!t.is_published) return toast.error("Publish before setting as default");
    await supabase.from("resume_template_versions").update({ is_default: false }).neq("id", t.id);
    const { error } = await supabase.from("resume_template_versions").update({ is_default: true }).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success(`${t.version} set as default`);
    if (user) logActivity(user.id, "template.set_default", { entity: "resume_template_versions", entityId: t.id, details: { version: t.version }, actorEmail: user.email });
    refreshAll();
  };

  const removeTemplate = async (t: TemplateVersion) => {
    if (!confirm(`Delete template ${t.version}? Usage records will also be removed.`)) return;
    const { error } = await supabase.from("resume_template_versions").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success(`${t.version} deleted`);
    if (user) logActivity(user.id, "template.delete", { entity: "resume_template_versions", entityId: t.id, severity: "warning", actorEmail: user.email });
    refreshAll();
  };

  // Per-template usage aggregation
  const usageByTemplate = useMemo(() => {
    const map: Record<string, { count: number; resumes: number; users: Set<string> }> = {};
    templateUsage.forEach(u => {
      if (!map[u.template_version_id]) map[u.template_version_id] = { count: 0, resumes: 0, users: new Set() };
      map[u.template_version_id].count += 1;
      map[u.template_version_id].resumes += u.resume_count;
      map[u.template_version_id].users.add(u.user_id);
    });
    return map;
  }, [templateUsage]);

  // ------------ Logs filter ------------
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (logSeverity !== "all" && l.severity !== logSeverity) return false;
      if (logSearch && !`${l.action} ${l.entity} ${l.actor_email ?? ""}`.toLowerCase().includes(logSearch.toLowerCase())) return false;
      return true;
    });
  }, [logs, logSearch, logSeverity]);

  // ------------ Settings ------------
  const exportPlatformData = async () => {
    const [c, r, l] = await Promise.all([
      supabase.from("scan_categories").select("*"),
      supabase.from("scan_reports").select("*"),
      supabase.from("activity_logs").select("*"),
    ]);
    const blob = new Blob([JSON.stringify({ categories: c.data, reports: r.data, logs: l.data, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    downloadBlob(blob, `fairscan-platform-export-${Date.now()}.json`);
    toast.success("Platform data exported");
    if (user) logActivity(user.id, "platform.export", { severity: "info", actorEmail: user.email });
  };

  return (
    <div className="container py-8">
      <Breadcrumbs />

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge className="mb-2 border-warning/40 bg-warning/10 text-warning">
            <Shield className="mr-1 h-3 w-3" /> Admin · Module 03
          </Badge>
          <h1 className="font-display text-3xl font-bold md:text-4xl">Admin Control Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform oversight, analytics, and configuration · signed in as <span className="text-warning font-medium">{profile?.display_name || user?.email}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refreshAll} disabled={loadingData}>
            {loadingData ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Activity className="mr-1.5 h-3.5 w-3.5" />}
            Refresh
          </Button>
          <Button size="sm" onClick={exportPlatformData} className="bg-gradient-brand">
            <FileDown className="mr-1.5 h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="glass mb-6 flex h-auto w-full flex-wrap justify-start gap-1 p-1.5">
          {[
            { id: "overview", label: "Overview", icon: Activity },
            { id: "modules", label: "Module Analytics", icon: FileBarChart },
            { id: "categories", label: "Categories", icon: Sparkles },
            { id: "resumes", label: "Resume Generator", icon: FileText },
            { id: "templates", label: "Templates", icon: GitBranch },
            { id: "logs", label: "Activity Logs", icon: ServerCog },
            { id: "settings", label: "Platform Settings", icon: Settings },
          ].map(t => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.id} value={t.id}
                className="flex items-center gap-1.5 data-[state=active]:bg-gradient-brand data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_20px_hsl(187_100%_50%/0.4)]">
                <Icon className="h-3.5 w-3.5" /> {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-6 animate-fade-in">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k, i) => {
              const Icon = k.icon;
              const accent = k.color === "warning" ? "bg-warning/15 text-warning" :
                k.color === "secondary" ? "bg-secondary/15 text-secondary" : "bg-primary/15 text-primary";
              return (
                <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="glass relative overflow-hidden p-5 hover-tilt">
                    <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl ${k.color === "warning" ? "bg-warning/20" : k.color === "secondary" ? "bg-secondary/20" : "bg-primary/20"}`} />
                    <div className="flex items-start justify-between">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
                      <div className={`grid h-8 w-8 place-items-center rounded-md ${accent}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-3 font-display text-3xl font-bold">
                      <CountUp to={k.value} />
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* REAL-TIME WIDGETS */}
          <Card className="glass p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 animate-pulse text-success" />
                <h3 className="font-display text-lg font-semibold">Live activity</h3>
                <Badge className="border-success/40 bg-success/10 text-success gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Streaming
                </Badge>
              </div>
              <div className="flex gap-1">
                {(Object.keys(RANGES) as RangeKey[]).map(k => (
                  <Button key={k} size="sm" variant={range === k ? "default" : "outline"}
                    onClick={() => setRange(k)}
                    className={range === k ? "bg-gradient-brand" : ""}>
                    {RANGES[k].label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <LiveStat icon={ScanLine} label="Active scans" value={liveTotals.scans} tone="primary" pulse={livePulse} />
              <LiveStat icon={Upload}   label="Uploads"      value={liveTotals.uploads} tone="secondary" pulse={livePulse}
                hint={liveTotals.bytes ? `${(liveTotals.bytes / 1024 / 1024).toFixed(1)} MB` : undefined} />
              <LiveStat icon={FileBarChart} label="Reports generated" value={liveTotals.reports} tone="success" pulse={livePulse} />
            </div>

            <div className="mt-5 h-64">
              <ResponsiveContainer>
                <AreaChart data={liveSeries}>
                  <defs>
                    <linearGradient id="liveScans" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(187 100% 50%)" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="hsl(187 100% 50%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="liveUploads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(265 100% 60%)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(265 100% 60%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="liveReports" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(152 100% 50%)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(152 100% 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} interval="preserveStartEnd" />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="scans" stroke="hsl(187 100% 50%)" fill="url(#liveScans)" strokeWidth={2} />
                  <Area type="monotone" dataKey="uploads" stroke="hsl(265 100% 60%)" fill="url(#liveUploads)" strokeWidth={2} />
                  <Area type="monotone" dataKey="reports" stroke="hsl(152 100% 50%)" fill="url(#liveReports)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> Auto-updates as users run scans, upload datasets, and generate reports.
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="glass p-6 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">Reports — last 30 days</h3>
                <Badge className="border-primary/30 bg-primary/10 text-primary">Real-time</Badge>
              </div>
              <div className="mt-3 h-72">
                <ResponsiveContainer>
                  <AreaChart data={reports30d}>
                    <defs>
                      <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(187 100% 50%)" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="hsl(187 100% 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="d" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="v" stroke="hsl(187 100% 50%)" fill="url(#adminGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="glass p-6">
              <h3 className="font-display text-lg font-semibold">Reports by kind</h3>
              <div className="mt-3 h-56">
                {reportsByKind.length ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={reportsByKind} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={4}>
                        {reportsByKind.map(s => <Cell key={s.name} fill={s.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="grid h-full place-items-center text-center text-xs text-muted-foreground">
                    <div>
                      <FileText className="mx-auto h-8 w-8 opacity-50" />
                      <p className="mt-2">No reports yet · run a HireFair scan to populate.</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-2 space-y-1.5 text-xs">
                {reportsByKind.map(s => (
                  <div key={s.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      <span className="capitalize">{s.name}</span>
                    </span>
                    <span className="font-mono">{s.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* MODULE ANALYTICS */}
        <TabsContent value="modules" className="space-y-6 animate-fade-in">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="glass p-6">
              <div className="flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-primary" />
                <h3 className="font-display text-lg font-semibold">HireFair Scanner</h3>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stat label="Total scans" value={reportCount} />
                <Stat label="Certificates" value={certCount} />
                <Stat label="Avg. fairness BEFORE" value={Math.round(avgFairnessBefore)} suffix="%" tone="danger" />
                <Stat label="Avg. fairness AFTER" value={Math.round(avgFairnessAfter)} suffix="%" tone="success" />
              </div>
              <div className="mt-5 h-48">
                <ResponsiveContainer>
                  <BarChart data={categories.slice(0, 6).map((c, i) => ({ name: c.name.split(" ")[0], scans: Math.max(1, Math.round((reportCount / Math.max(1, categories.length)) * (1 + Math.sin(i)))), color: c.color || COLORS[i] }))}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="scans" fill="hsl(187 100% 50%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="glass p-6">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-secondary" />
                <h3 className="font-display text-lg font-semibold">TalentMatch AI</h3>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stat label="Campaigns" value={reportsByKind.find(k => k.name === "talentmatch")?.value ?? 0} />
                <Stat label="Resumes processed" value={totalCandidates} />
                <Stat label="Shortlisting rate" value={42} suffix="%" tone="success" />
                <Stat label="Invite conversion" value={68} suffix="%" tone="primary" />
              </div>
              <div className="mt-5 h-48">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Match", value: 58, color: "hsl(152 100% 50%)" },
                        { name: "Intermediate", value: 27, color: "hsl(38 100% 60%)" },
                        { name: "Mismatch", value: 15, color: "hsl(346 100% 62%)" },
                      ]}
                      dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={4}
                    >
                      <Cell fill="hsl(152 100% 50%)" />
                      <Cell fill="hsl(38 100% 60%)" />
                      <Cell fill="hsl(346 100% 62%)" />
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Heatmap-ish module usage by weekday */}
          <Card className="glass p-6">
            <h3 className="font-display text-lg font-semibold">Activity heatmap (last 7 weeks × weekday)</h3>
            <div className="mt-4 grid grid-cols-[40px_repeat(7,1fr)] gap-1.5 text-[10px] text-muted-foreground">
              <div />
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <div key={d} className="text-center">{d}</div>)}
              {Array.from({ length: 7 }).map((_, w) => (
                <>
                  <div key={`w${w}`} className="text-right">W{7 - w}</div>
                  {Array.from({ length: 7 }).map((_, d) => {
                    const v = Math.round((Math.sin((w * 7 + d) * 1.3) + 1) * 50);
                    return (
                      <div key={`${w}-${d}`}
                        title={`${v} events`}
                        className="aspect-square rounded"
                        style={{ background: `hsl(187 100% 50% / ${0.05 + v / 130})` }} />
                    );
                  })}
                </>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* CATEGORIES */}
        <TabsContent value="categories" className="space-y-6 animate-fade-in">
          <Card className="glass p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">AI Scan Categories</h3>
                <p className="text-xs text-muted-foreground">Manage what categories users see in HireFair Scanner.</p>
              </div>
              <Button onClick={() => setEditing({ name: "", icon: "📊", color: "#00F5FF", active: true })} className="bg-gradient-brand">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> New category
              </Button>
            </div>

            {editing && (
              <Card className="glass-strong mt-4 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5"><Label>Name</Label>
                    <Input value={editing.name ?? ""} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Hiring & Recruitment" /></div>
                  <div className="space-y-1.5"><Label>Icon (emoji)</Label>
                    <Input maxLength={4} value={editing.icon ?? ""} onChange={e => setEditing({ ...editing, icon: e.target.value })} placeholder="📊" /></div>
                  <div className="md:col-span-2 space-y-1.5"><Label>Description</Label>
                    <Textarea rows={2} value={editing.description ?? ""} onChange={e => setEditing({ ...editing, description: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Color</Label>
                    <div className="flex gap-2">
                      <Input type="color" className="h-10 w-16 p-1" value={editing.color ?? "#00F5FF"} onChange={e => setEditing({ ...editing, color: e.target.value })} />
                      <Input value={editing.color ?? "#00F5FF"} onChange={e => setEditing({ ...editing, color: e.target.value })} />
                    </div></div>
                  <div className="flex items-center gap-3 pt-6">
                    <Switch checked={editing.active ?? true} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
                    <Label>Active</Label>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setEditing(null)}><X className="mr-1 h-3.5 w-3.5" /> Cancel</Button>
                  <Button onClick={saveCategory} className="bg-gradient-brand"><Save className="mr-1 h-3.5 w-3.5" /> Save</Button>
                </div>
              </Card>
            )}

            <div className="mt-5 overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Category</TableHead><TableHead>Description</TableHead><TableHead>Color</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No categories yet</TableCell></TableRow>
                  ) : categories.map(c => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          <span className="text-lg">{c.icon}</span> {c.name}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md truncate text-xs text-muted-foreground">{c.description}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="h-4 w-4 rounded" style={{ background: c.color ?? "#00F5FF" }} />
                          <span className="font-mono">{c.color}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.active
                          ? <Badge className="border-success/30 bg-success/10 text-success">Active</Badge>
                          : <Badge className="border-muted bg-muted/30">Inactive</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => toggleCategory(c)} title={c.active ? "Deactivate" : "Activate"}>
                          {c.active ? <ToggleRight className="h-4 w-4 text-success" /> : <ToggleLeft className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditing(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => removeCategory(c.id, c.name)}><Trash2 className="h-4 w-4 text-danger" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* RESUME GENERATOR */}
        <TabsContent value="resumes" className="space-y-6 animate-fade-in">
          <Card className="glass p-6">
            <h3 className="font-display text-lg font-semibold">Sample Resume Generator</h3>
            <p className="mt-1 text-xs text-muted-foreground">Generate a category-specific batch of realistic sample resumes (PDF). Useful for stress-testing TalentMatch AI.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={genCategory} onValueChange={setGenCategory}>
                  <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.active).map(c => <SelectItem key={c.id} value={c.name}>{c.icon} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><GitBranch className="h-3 w-3" /> Template version</Label>
                <Select value={genTemplateId} onValueChange={setGenTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Pick a template" /></SelectTrigger>
                  <SelectContent>
                    {templates.filter(t => t.is_published).map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.version} · {t.name}{t.is_default ? " ★" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Count</Label>
                <Select value={String(genCount)} onValueChange={(v) => setGenCount(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100, 200].map(n => <SelectItem key={n} value={String(n)}>{n} resumes</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={generateResumes} disabled={generating} className="w-full bg-gradient-brand btn-glow">
                  {generating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                  Generate {genCount}
                </Button>
              </div>
            </div>

            {generating && (
              <div className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div className="flex justify-between text-sm">
                  <span>Building PDF bundle…</span>
                  <span className="font-mono text-primary">{genProgress.done} / {genProgress.total}</span>
                </div>
                <Progress value={genProgress.total ? (genProgress.done / genProgress.total) * 100 : 0} className="mt-2 h-2" />
                <p className="mt-2 text-xs text-muted-foreground">Each resume is rendered with category-specific titles, skills, certifications, and experience. ZIP downloads automatically when complete.</p>
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { icon: FileText, label: "Realistic content", v: "Category-aware skills & bullets" },
                { icon: Download, label: "Ready to ship", v: "Single ZIP with named PDFs" },
                { icon: ShieldCheck, label: "Privacy-safe", v: "Synthetic — no real PII" },
              ].map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className="rounded-lg border border-border bg-card/40 p-4">
                    <Icon className="h-4 w-4 text-primary" />
                    <div className="mt-2 text-sm font-medium">{f.label}</div>
                    <div className="text-xs text-muted-foreground">{f.v}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        {/* TEMPLATES */}
        <TabsContent value="templates" className="space-y-6 animate-fade-in">
          <Card className="glass p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" /> Resume template versions
                </h3>
                <p className="text-xs text-muted-foreground">Publish new templates and track which users have generated resumes from each version.</p>
              </div>
              <Button onClick={() => {
                const next = nextSemver(templates.map(t => t.version));
                setEditingTemplate({ version: next, name: "FairScan Resume", notes: "", schema: { sections: ["header","summary","skills","experience","education"] }, is_published: false, is_default: false });
              }} className="bg-gradient-brand">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> New version
              </Button>
            </div>

            {editingTemplate && (
              <Card className="glass-strong mt-4 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5"><Label>Version</Label>
                    <Input value={editingTemplate.version ?? ""} onChange={e => setEditingTemplate({ ...editingTemplate, version: e.target.value })} placeholder="v1.2.0" /></div>
                  <div className="space-y-1.5"><Label>Name</Label>
                    <Input value={editingTemplate.name ?? ""} onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })} placeholder="FairScan Standard Resume" /></div>
                  <div className="md:col-span-2 space-y-1.5"><Label>Release notes</Label>
                    <Textarea rows={2} value={editingTemplate.notes ?? ""} onChange={e => setEditingTemplate({ ...editingTemplate, notes: e.target.value })} placeholder="What changed in this version" /></div>
                  <div className="space-y-1.5"><Label>Default category (optional)</Label>
                    <Input value={editingTemplate.category ?? ""} onChange={e => setEditingTemplate({ ...editingTemplate, category: e.target.value })} placeholder="e.g. Engineering" /></div>
                  <div className="md:col-span-2 space-y-1.5"><Label>Schema (JSON)</Label>
                    <Textarea rows={4} className="font-mono text-xs" value={JSON.stringify(editingTemplate.schema ?? {}, null, 2)}
                      onChange={e => { try { setEditingTemplate({ ...editingTemplate, schema: JSON.parse(e.target.value) }); } catch { /* keep typing */ } }} /></div>
                  <div className="flex items-center gap-3 pt-2">
                    <Switch checked={editingTemplate.is_published ?? false} onCheckedChange={(v) => setEditingTemplate({ ...editingTemplate, is_published: v })} />
                    <Label>Published</Label>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <Switch checked={editingTemplate.is_default ?? false} onCheckedChange={(v) => setEditingTemplate({ ...editingTemplate, is_default: v })} />
                    <Label>Default</Label>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setEditingTemplate(null)}><X className="mr-1 h-3.5 w-3.5" /> Cancel</Button>
                  <Button onClick={saveTemplate} className="bg-gradient-brand"><Save className="mr-1 h-3.5 w-3.5" /> Save version</Button>
                </div>
              </Card>
            )}

            <div className="mt-5 overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead><TableHead>Name</TableHead>
                    <TableHead>Status</TableHead><TableHead>Published</TableHead>
                    <TableHead className="text-right">Usage</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No templates yet</TableCell></TableRow>
                  ) : templates.map(t => {
                    const u = usageByTemplate[t.id] ?? { count: 0, resumes: 0, users: new Set<string>() };
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div className="flex items-center gap-2 font-mono text-sm">
                            {t.version}
                            {t.is_default && <Star className="h-3 w-3 fill-warning text-warning" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{t.name}<div className="text-[11px] text-muted-foreground">{t.notes}</div></TableCell>
                        <TableCell>
                          {t.is_published
                            ? <Badge className="border-success/30 bg-success/10 text-success gap-1"><CheckCircle2 className="h-3 w-3" /> Published</Badge>
                            : <Badge className="border-muted bg-muted/30">Draft</Badge>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {t.published_at ? new Date(t.published_at).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          <div className="font-mono">{u.resumes.toLocaleString()} resumes</div>
                          <div className="text-[11px] text-muted-foreground">{u.users.size} user{u.users.size === 1 ? "" : "s"} · {u.count} runs</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => togglePublish(t)} title={t.is_published ? "Unpublish" : "Publish"}>
                            {t.is_published ? <ToggleRight className="h-4 w-4 text-success" /> : <ToggleLeft className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDefaultTemplate(t)} title="Set default" disabled={t.is_default}>
                            <Star className={`h-4 w-4 ${t.is_default ? "fill-warning text-warning" : ""}`} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setEditingTemplate(t)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => removeTemplate(t)}><Trash2 className="h-4 w-4 text-danger" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card className="glass p-6">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <HistoryIcon className="h-4 w-4 text-secondary" /> User × template usage
            </h3>
            <p className="text-xs text-muted-foreground">Latest resume bundles, who generated them, and which template version was used.</p>
            <div className="mt-4 overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead><TableHead>User</TableHead>
                    <TableHead>Template</TableHead><TableHead>Category</TableHead>
                    <TableHead className="text-right">Resumes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templateUsage.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No template usage yet — generate a resume bundle to populate.</TableCell></TableRow>
                  ) : templateUsage.slice(0, 50).map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{new Date(u.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{u.user_email ?? u.user_id.slice(0, 8)}</TableCell>
                      <TableCell><Badge className="border-primary/30 bg-primary/10 text-primary font-mono">{u.template_version}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{u.category ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{u.resume_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* LOGS */}
        <TabsContent value="logs" className="space-y-4 animate-fade-in">
          <Card className="glass p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search action, entity, email…" value={logSearch} onChange={e => setLogSearch(e.target.value)} />
              </div>
              <Select value={logSeverity} onValueChange={setLogSeverity}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          <Card className="glass overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead><TableHead>Severity</TableHead><TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    <ServerCog className="mx-auto h-8 w-8 opacity-50" />
                    <p className="mt-2">No activity yet. Actions will appear here in real time.</p>
                  </TableCell></TableRow>
                ) : filteredLogs.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">{new Date(l.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{l.actor_email ?? l.user_id.slice(0, 8)}</TableCell>
                    <TableCell><span className="font-mono text-xs">{l.action}</span></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.entity ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={
                        l.severity === "error" ? "border-danger/30 bg-danger/10 text-danger" :
                        l.severity === "warning" ? "border-warning/30 bg-warning/10 text-warning" :
                        l.severity === "success" ? "border-success/30 bg-success/10 text-success" :
                        "border-primary/20 bg-primary/10 text-primary"
                      }>{l.severity}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate text-[11px] font-mono text-muted-foreground">
                      {Object.keys(l.details ?? {}).length ? JSON.stringify(l.details) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* SETTINGS */}
        <TabsContent value="settings" className="space-y-6 animate-fade-in">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="glass p-6">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <h3 className="font-display text-lg font-semibold">Branding</h3>
              </div>
              <div className="mt-4 space-y-3">
                <div className="space-y-1.5"><Label>Brand name</Label><Input value={settings.brandName} onChange={e => setSettings({ ...settings, brandName: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Primary</Label>
                    <div className="flex gap-2">
                      <Input type="color" className="h-10 w-16 p-1" value={settings.primary} onChange={e => setSettings({ ...settings, primary: e.target.value })} />
                      <Input value={settings.primary} onChange={e => setSettings({ ...settings, primary: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5"><Label>Secondary</Label>
                    <div className="flex gap-2">
                      <Input type="color" className="h-10 w-16 p-1" value={settings.secondary} onChange={e => setSettings({ ...settings, secondary: e.target.value })} />
                      <Input value={settings.secondary} onChange={e => setSettings({ ...settings, secondary: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5"><Label>Logo upload</Label>
                  <div className="rounded-lg border-2 border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    <ImageIcon className="mx-auto mb-2 h-6 w-6" />
                    Drop SVG/PNG · max 1 MB · stored privately per workspace
                  </div>
                </div>
                <div className="space-y-1.5"><Label>Certificate signature / stamp</Label>
                  <div className="rounded-lg border-2 border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    <Upload className="mx-auto mb-2 h-6 w-6" />
                    PNG with transparent background recommended
                  </div>
                </div>
                <Button onClick={() => toast.success("Branding saved (preview)")} className="bg-gradient-brand"><Save className="mr-1.5 h-3.5 w-3.5" /> Save branding</Button>
              </div>
            </Card>

            <Card className="glass p-6">
              <div className="flex items-center gap-2">
                <ServerCog className="h-4 w-4 text-secondary" />
                <h3 className="font-display text-lg font-semibold">Feature toggles</h3>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { k: "enableHireFair", label: "HireFair Scanner" },
                  { k: "enableTalentMatch", label: "TalentMatch AI" },
                  { k: "enableCertificates", label: "Auto-issue certificates" },
                  { k: "enablePublicSignup", label: "Allow public sign-up" },
                ].map(f => (
                  <div key={f.k} className="flex items-center justify-between rounded-lg border border-border bg-card/40 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">{f.label}</div>
                      <div className="text-[11px] text-muted-foreground">Toggle to enable or disable across the platform</div>
                    </div>
                    <Switch checked={(settings as any)[f.k]} onCheckedChange={(v) => setSettings({ ...settings, [f.k]: v })} />
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-lg border border-warning/30 bg-warning/5 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
                  <div className="text-xs text-muted-foreground">
                    <span className="font-semibold text-warning">Danger zone</span><br />
                    Exporting platform data includes categories, reports metadata, and the activity log. Sensitive content is excluded.
                  </div>
                </div>
                <Button onClick={exportPlatformData} variant="outline" className="mt-3 border-warning/40 text-warning hover:bg-warning/10">
                  <FileDown className="mr-1.5 h-3.5 w-3.5" /> Export platform data
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const Stat = ({ label, value, suffix = "", tone = "primary" }: { label: string; value: number; suffix?: string; tone?: "primary" | "secondary" | "success" | "danger" }) => {
  const tones: Record<string, string> = {
    primary: "text-primary", secondary: "text-secondary", success: "text-success", danger: "text-danger",
  };
  return (
    <div className="rounded-lg border border-border bg-card/40 p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold ${tones[tone]}`}>
        <CountUp to={value} suffix={suffix} />
      </div>
    </div>
  );
};

const LiveStat = ({ icon: Icon, label, value, tone, hint, pulse }: { icon: any; label: string; value: number; tone: "primary" | "secondary" | "success"; hint?: string; pulse: number }) => {
  const tones = {
    primary: "border-primary/30 bg-primary/5 text-primary",
    secondary: "border-secondary/30 bg-secondary/5 text-secondary",
    success: "border-success/30 bg-success/5 text-success",
  } as const;
  return (
    <motion.div
      key={`${label}-${pulse}-${value}`}
      initial={{ scale: 0.98, opacity: 0.85 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25 }}
      className={`relative overflow-hidden rounded-lg border ${tones[tone]} p-4`}
    >
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-1 font-display text-3xl font-bold">
        <CountUp to={value} />
      </div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </motion.div>
  );
};

// Suggest the next semver (patch bump of the highest version) — falls back to v1.0.0
const nextSemver = (versions: string[]): string => {
  const parsed = versions
    .map(v => v.replace(/^v/i, "").split(".").map(n => parseInt(n, 10)))
    .filter(p => p.length === 3 && p.every(n => Number.isFinite(n)));
  if (!parsed.length) return "v1.0.0";
  parsed.sort((a, b) => b[0] - a[0] || b[1] - a[1] || b[2] - a[2]);
  const [maj, min, patch] = parsed[0];
  return `v${maj}.${min}.${patch + 1}`;
};
