import jsPDF from "jspdf";
import JSZip from "jszip";

// Realistic-ish resume sample generator. Produces a ZIP of N PDF resumes for a category.

const FIRST = ["Aisha","Liam","Priya","Marcus","Yuki","Diego","Fatima","Noah","Zara","Kenji","Amara","Lukas","Chen","Sofia","Omar","Lila","Kai","Anika","Mateo","Imani","Hiroshi","Nadia","Elias","Ines","Ravi","Mei","Tomas","Layla","Jonas","Sana","Arjun","Naomi","Idris","Jia","Theo","Maya","Rafael","Yara","Felix","Zoe"];
const LAST = ["Patel","Okafor","Nguyen","Garcia","Tanaka","Cohen","Singh","Rossi","Müller","Diallo","Khan","Silva","Park","Brown","Hassan","Lee","Sato","Lopez","Andersen","Ali","Kim","Jansen","Mwangi","Costa","Becker"];
const CITIES = ["Berlin","London","NYC","San Francisco","Singapore","Dubai","Paris","Tokyo","Toronto","Lagos","São Paulo","Mumbai","Sydney","Amsterdam","Madrid","Stockholm"];

type Bank = {
  titles: string[];
  skills: string[];
  certs: string[];
  bullets: string[];
  schools: string[];
};

const BANKS: Record<string, Bank> = {
  default: {
    titles: ["Senior Engineer","Product Lead","Operations Manager","Team Lead","Specialist"],
    skills: ["Leadership","Communication","Project Management","Problem Solving","Agile","Stakeholder Mgmt","Strategy","Reporting"],
    certs: ["PMP","Scrum Master","Six Sigma Green Belt"],
    bullets: [
      "Led cross-functional team of 12 to deliver flagship initiative ahead of deadline.",
      "Reduced operational costs by 18% through process redesign and automation.",
      "Owned roadmap for $4M revenue line; grew adoption 2.3× year-over-year.",
      "Coached 6 direct reports; 4 promoted within 18 months.",
    ],
    schools: ["Stanford University","University of Toronto","Imperial College London","NUS","ETH Zürich"],
  },
  "Hiring & Recruitment": {
    titles: ["Senior Recruiter","Talent Acquisition Lead","Technical Sourcer","People Ops Manager","Head of Talent"],
    skills: ["Sourcing","Boolean Search","ATS (Greenhouse / Lever)","Diversity Hiring","Compensation","Interview Design","Workforce Planning","Stakeholder Mgmt"],
    certs: ["LinkedIn Certified Recruiter","SHRM-CP","AIRS CIR"],
    bullets: [
      "Closed 47 senior engineering hires in 2024 with 92% offer-acceptance rate.",
      "Reduced average time-to-fill from 58 to 31 days via structured interview rollout.",
      "Built diversity sourcing pipeline that lifted underrepresented hires by 38%.",
      "Implemented Greenhouse + structured scorecards across 4 product orgs.",
    ],
    schools: ["University of Michigan","INSEAD","London School of Economics","UC Berkeley"],
  },
  "Lending & Credit": {
    titles: ["Credit Risk Analyst","Underwriting Specialist","Credit Modeler","Risk Manager","Portfolio Analyst"],
    skills: ["Credit Scoring","Logistic Regression","SAS","Python","SQL","Basel III","IFRS 9","FICO Models"],
    certs: ["FRM","CFA Level II","SAS Certified Analyst"],
    bullets: [
      "Rebuilt PD model lifting Gini coefficient from 0.62 to 0.74 on consumer book.",
      "Validated underwriting decisions across $1.2B portfolio quarterly.",
      "Designed reason-codes framework for adverse-action notices; passed CFPB review.",
      "Reduced default rate by 23bps through challenger-model deployment.",
    ],
    schools: ["NYU Stern","Wharton","HEC Paris","IIM Bangalore"],
  },
  "Healthcare Triage": {
    titles: ["Clinical Data Scientist","Triage Nurse Manager","Healthcare ML Engineer","Hospital Operations Lead","Patient Flow Analyst"],
    skills: ["EHR (Epic / Cerner)","FHIR / HL7","Risk Stratification","Python","Clinical Workflow","HIPAA","SQL","Tableau"],
    certs: ["RN, BSN","Epic Clarity","CITI Human Subjects"],
    bullets: [
      "Deployed sepsis early-warning model across 3 ICUs; 19% mortality reduction.",
      "Reduced ED door-to-doctor time from 48 to 27 minutes through triage redesign.",
      "Led IRB-approved validation of risk-scoring tool on 240k patient records.",
      "Built dashboards used daily by 14 hospitals across 2 health systems.",
    ],
    schools: ["Johns Hopkins","Karolinska Institute","UCSF","McGill"],
  },
};

const pickBank = (cat: string): Bank => BANKS[cat] ?? BANKS.default;
const rand = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const randN = <T,>(arr: T[], n: number): T[] => {
  const c = [...arr]; const out: T[] = [];
  while (out.length < n && c.length) out.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]);
  return out;
};

const buildResumePdf = (cat: string, idx: number): Blob => {
  const bank = pickBank(cat);
  const first = rand(FIRST), last = rand(LAST);
  const name = `${first} ${last}`;
  const email = `${first.toLowerCase()}.${last.toLowerCase()}@example.com`;
  const phone = `+1 (555) ${String(100 + Math.floor(Math.random() * 900))}-${String(1000 + Math.floor(Math.random() * 9000))}`;
  const title = rand(bank.titles);
  const city = rand(CITIES);
  const exp = 3 + Math.floor(Math.random() * 12);
  const skills = randN(bank.skills, 8);
  const certs = randN(bank.certs, 2);
  const bullets = randN(bank.bullets, 4);
  const school = rand(bank.schools);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 90, "F");
  doc.setFillColor(0, 217, 255);
  doc.rect(0, 88, W, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(name, 40, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(180, 220, 255);
  doc.text(title, 40, 62);
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 220);
  doc.text(`${email}  ·  ${phone}  ·  ${city}`, 40, 78);

  let y = 120;
  const section = (label: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 130, 180);
    doc.text(label.toUpperCase(), 40, y);
    doc.setDrawColor(0, 217, 255);
    doc.setLineWidth(0.6);
    doc.line(40, y + 3, W - 40, y + 3);
    y += 18;
    doc.setTextColor(30, 30, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
  };

  section("Summary");
  const summary = `${title} with ${exp}+ years of experience driving outcomes in ${cat.toLowerCase()}. Known for ${skills.slice(0, 3).join(", ").toLowerCase()} and a track record of measurable impact across ${1 + Math.floor(Math.random() * 4)} organizations.`;
  const wrap = doc.splitTextToSize(summary, W - 80);
  doc.text(wrap, 40, y); y += wrap.length * 13 + 6;

  section("Experience");
  for (let i = 0; i < 2; i++) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${title}  —  ${["Northbank","Helix Robotics","BluePeak Health","Atlas Labs"][Math.floor(Math.random()*4)]}`, 40, y);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 120);
    doc.text(`${2018 + i * 3}–${2021 + i * 3} · ${city}`, W - 40, y, { align: "right" });
    doc.setTextColor(30, 30, 50);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    bullets.slice(i * 2, i * 2 + 2).forEach(b => {
      const lines = doc.splitTextToSize(`• ${b}`, W - 80);
      doc.text(lines, 50, y);
      y += lines.length * 13;
    });
    y += 8;
  }

  section("Skills");
  const skillsText = skills.join("  ·  ");
  const skillsWrap = doc.splitTextToSize(skillsText, W - 80);
  doc.text(skillsWrap, 40, y); y += skillsWrap.length * 13 + 6;

  section("Education & Certifications");
  doc.text(`MSc · ${school}  ·  ${2010 + Math.floor(Math.random() * 8)}`, 40, y); y += 14;
  certs.forEach(c => { doc.text(`• ${c}`, 50, y); y += 13; });

  // Footer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 160);
  doc.text(`Sample resume #${idx + 1}  ·  Generated by FAIRSCAN AI for category: ${cat}`, W / 2, doc.internal.pageSize.getHeight() - 24, { align: "center" });

  return doc.output("blob");
};

export type GenerateResumesOpts = {
  count: number;
  category: string;
  templateVersion?: string;
  onProgress?: (done: number, total: number) => void;
};

export const generateResumeBundle = async ({ count, category, templateVersion, onProgress }: GenerateResumesOpts): Promise<Blob> => {
  const zip = new JSZip();
  const folder = zip.folder(`fairscan-resumes-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`)!;
  if (templateVersion) {
    folder.file("MANIFEST.txt", `Template version: ${templateVersion}\nCategory: ${category}\nGenerated: ${new Date().toISOString()}\nCount: ${count}\n`);
  }
  for (let i = 0; i < count; i++) {
    const blob = buildResumePdf(category, i);
    folder.file(`resume_${String(i + 1).padStart(3, "0")}.pdf`, blob);
    if ((i + 1) % 5 === 0 || i === count - 1) {
      onProgress?.(i + 1, count);
      await new Promise(r => setTimeout(r, 0));
    }
  }
  return zip.generateAsync({ type: "blob" });
};
