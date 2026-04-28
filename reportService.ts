import { supabase } from "@/integrations/supabase/client";
import { buildFairnessPdf, buildCertificatePdf, buildCsv, FairnessExport } from "./exporters";

export type SaveReportInput = {
  userId: string;
  title: string;
  kind: "fairness" | "certificate" | "talentmatch";
  fairnessBefore?: number;
  fairnessAfter?: number;
  candidatesCount?: number;
  sourceFilename?: string;
  sourceSizeBytes?: number;
  metrics: any;
  pdfBlob?: Blob;
  csvBlob?: Blob;
  onProgress?: (pct: number) => void;
};

export const saveReport = async (input: SaveReportInput) => {
  const { userId, onProgress } = input;
  let pdf_path: string | null = null;
  let csv_path: string | null = null;

  const ts = Date.now();
  const safe = (s: string) => s.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);

  if (input.pdfBlob) {
    pdf_path = `${userId}/${ts}-${safe(input.title)}.pdf`;
    const { error } = await supabase.storage.from("reports").upload(pdf_path, input.pdfBlob, {
      contentType: "application/pdf", upsert: false,
    });
    if (error) throw error;
    onProgress?.(60);
  }
  if (input.csvBlob) {
    csv_path = `${userId}/${ts}-${safe(input.title)}.csv`;
    const { error } = await supabase.storage.from("reports").upload(csv_path, input.csvBlob, {
      contentType: "text/csv", upsert: false,
    });
    if (error) throw error;
    onProgress?.(85);
  }

  const { data, error } = await supabase.from("scan_reports").insert({
    user_id: userId,
    title: input.title,
    kind: input.kind,
    fairness_before: input.fairnessBefore,
    fairness_after: input.fairnessAfter,
    candidates_count: input.candidatesCount,
    source_filename: input.sourceFilename,
    source_size_bytes: input.sourceSizeBytes,
    metrics: input.metrics,
    pdf_path, csv_path,
  }).select().single();
  if (error) throw error;
  onProgress?.(100);
  return data;
};

export const generateAndSaveFairness = async (
  userId: string,
  data: FairnessExport,
  meta: { sourceFilename?: string; sourceSizeBytes?: number; onProgress?: (pct: number) => void }
) => {
  meta.onProgress?.(15);
  const pdf = buildFairnessPdf(data);
  meta.onProgress?.(30);
  const csv = buildCsv(data.metrics.map(m => ({
    dimension: m.dim, before: m.before, after: m.after, improvement: m.after - m.before,
  })));
  meta.onProgress?.(45);
  return saveReport({
    userId,
    title: data.title,
    kind: "fairness",
    fairnessBefore: data.fairnessBefore,
    fairnessAfter: data.fairnessAfter,
    candidatesCount: data.candidatesCount,
    sourceFilename: meta.sourceFilename,
    sourceSizeBytes: meta.sourceSizeBytes,
    metrics: data.metrics,
    pdfBlob: pdf,
    csvBlob: csv,
    onProgress: meta.onProgress,
  });
};

export const generateAndSaveCertificate = async (
  userId: string, org: string, score: number,
  onProgress?: (pct: number) => void
) => {
  onProgress?.(20);
  const certId = `FSC-${Date.now().toString(36).toUpperCase()}`;
  const pdf = await buildCertificatePdf(org, score, certId);
  onProgress?.(50);
  return saveReport({
    userId,
    title: `Certificate · ${org}`,
    kind: "certificate",
    fairnessAfter: score,
    metrics: { certId, org, score },
    pdfBlob: pdf,
    onProgress,
  });
};

export const downloadReportFile = async (path: string, filename: string) => {
  const { data, error } = await supabase.storage.from("reports").createSignedUrl(path, 60);
  if (error) throw error;
  const a = document.createElement("a");
  a.href = data.signedUrl; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
};

export const deleteReport = async (id: string, paths: (string | null)[]) => {
  const valid = paths.filter(Boolean) as string[];
  if (valid.length) await supabase.storage.from("reports").remove(valid);
  await supabase.from("scan_reports").delete().eq("id", id);
};
