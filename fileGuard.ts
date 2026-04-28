// Client-side safety checks for uploaded files.
// Two profiles:
//  - "data"   → CSVs, JSON, Excel for HireFair Scanner (10 MB)
//  - "resume" → PDF / DOCX / DOC for TalentMatch (5 MB)

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;  // 5 MB

export type GuardProfile = "data" | "resume";

const PROFILES: Record<GuardProfile, { ext: Set<string>; mime: Set<string>; maxBytes: number; label: string }> = {
  data: {
    ext: new Set(["csv", "json", "xls", "xlsx"]),
    mime: new Set([
      "text/csv",
      "application/json",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]),
    maxBytes: MAX_UPLOAD_BYTES,
    label: "CSV, JSON or Excel",
  },
  resume: {
    ext: new Set(["pdf", "doc", "docx", "txt"]),
    mime: new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ]),
    maxBytes: MAX_RESUME_BYTES,
    label: "PDF, DOC, DOCX or TXT",
  },
};

// Backward-compat exports used by existing components
export const ALLOWED_MIME = PROFILES.data.mime;
export const ALLOWED_EXT = PROFILES.data.ext;

const DANGEROUS_SIGS: { sig: number[]; label: string }[] = [
  { sig: [0x4d, 0x5a], label: "Windows executable (MZ)" },
  { sig: [0x7f, 0x45, 0x4c, 0x46], label: "Linux executable (ELF)" },
  { sig: [0xca, 0xfe, 0xba, 0xbe], label: "Mach-O / Java class" },
  { sig: [0x23, 0x21], label: "Shell script (#!)" },
];

export type GuardResult = { ok: true } | { ok: false; reason: string };

export const guardFile = async (file: File, profile: GuardProfile = "data"): Promise<GuardResult> => {
  const cfg = PROFILES[profile];
  if (file.size === 0) return { ok: false, reason: "File is empty." };
  if (file.size > cfg.maxBytes) {
    return { ok: false, reason: `File exceeds ${(cfg.maxBytes / 1024 / 1024).toFixed(0)} MB limit.` };
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!cfg.ext.has(ext)) {
    return { ok: false, reason: `Extension .${ext} not allowed. Use ${cfg.label}.` };
  }
  if (file.type && !cfg.mime.has(file.type) && file.type !== "") {
    // Some browsers emit blank type for csv/docx — only reject when set & not allowed
    return { ok: false, reason: `File type ${file.type} not allowed.` };
  }
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  for (const { sig, label } of DANGEROUS_SIGS) {
    if (sig.every((b, i) => head[i] === b)) {
      return { ok: false, reason: `Blocked: file looks like ${label}.` };
    }
  }
  return { ok: true };
};
