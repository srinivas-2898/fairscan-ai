import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Award, Download, Trash2, ExternalLink, Search, ScanLine, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { downloadReportFile, deleteReport } from "@/lib/reportService";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Report = {
  id: string;
  title: string;
  kind: string;
  fairness_before: number | null;
  fairness_after: number | null;
  candidates_count: number | null;
  pdf_path: string | null;
  csv_path: string | null;
  created_at: string;
};

export default function History() {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState<Report[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("scan_reports").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const filtered = rows.filter(r => r.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="container py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-primary">Account</p>
          <h1 className="mt-1 font-display text-3xl font-bold">My reports & certificates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every fairness report and certificate is saved securely to your account. {isAdmin && <Badge className="ml-2">admin view</Badge>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="w-64 pl-9" placeholder="Search reports…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button asChild className="bg-gradient-brand"><Link to="/hirefair"><ScanLine className="mr-2 h-4 w-4" /> New scan</Link></Button>
        </div>
      </motion.div>

      {loading ? (
        <div className="grid place-items-center py-24 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 py-20 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">No reports yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Run a scan and your generated PDF will appear here.</p>
          <Button asChild className="mt-4 bg-gradient-brand"><Link to="/hirefair">Start a scan</Link></Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => (
            <motion.div key={r.id} layout
              className="group flex flex-wrap items-center gap-4 rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur transition-all hover:border-primary/40">
              <div className={`grid h-11 w-11 place-items-center rounded-lg ${r.kind === "certificate" ? "bg-warning/15 text-warning" : "bg-gradient-brand-soft text-primary"}`}>
                {r.kind === "certificate" ? <Award className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()} ·{" "}
                  {r.candidates_count ? `${r.candidates_count} candidates · ` : ""}
                  {r.fairness_after != null && <span className="text-success">Fairness {Math.round(r.fairness_after)}/100</span>}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">{r.kind}</Badge>
              <div className="flex items-center gap-1">
                {r.pdf_path && (
                  <Button size="sm" variant="outline" onClick={() => downloadReportFile(r.pdf_path!, `${r.title}.pdf`)}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
                  </Button>
                )}
                {r.csv_path && (
                  <Button size="sm" variant="outline" onClick={() => downloadReportFile(r.csv_path!, `${r.title}.csv`)}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-danger"><Trash2 className="h-4 w-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this report?</AlertDialogTitle>
                      <AlertDialogDescription>This will permanently remove the saved PDF/CSV from your account. This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-danger hover:bg-danger/90"
                        onClick={async () => { await deleteReport(r.id, [r.pdf_path, r.csv_path]); toast.success("Report deleted"); load(); }}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
