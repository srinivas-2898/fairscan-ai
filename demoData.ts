// Mock demo data for FAIRSCAN AI

export type Profile = {
  id: number;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Non-binary";
  ethnicity: string;
  education: string;
  experience: number;
  score: number;
  selected: boolean;
};

const firstNames = [
  "Aisha", "Liam", "Priya", "Marcus", "Yuki", "Diego", "Fatima", "Noah",
  "Zara", "Kenji", "Amara", "Lukas", "Chen", "Sofia", "Omar", "Lila",
  "Kai", "Anika", "Mateo", "Imani", "Hiroshi", "Nadia", "Elias", "Ines",
];
const lastNames = [
  "Patel", "Okafor", "Nguyen", "Garcia", "Tanaka", "Cohen", "Singh", "Rossi",
  "Müller", "Diallo", "Khan", "Silva", "Park", "Brown", "Hassan", "Lee",
];
const ethnicities = ["Asian", "Black", "Hispanic", "White", "Middle Eastern", "Mixed"];
const educations = ["BSc CS", "MSc AI", "PhD ML", "BBA", "MBA", "BSc Eng", "Bootcamp"];

export const generateProfiles = (n = 100): Profile[] => {
  return Array.from({ length: n }, (_, i) => {
    const gender = (["Male", "Female", "Non-binary"] as const)[Math.floor(Math.random() * 3)];
    const ethnicity = ethnicities[Math.floor(Math.random() * ethnicities.length)];
    // Simulate biased AI: bias against Female + non-white slightly
    const baseScore = 55 + Math.random() * 35;
    const biasPenalty = (gender !== "Male" ? 6 : 0) + (ethnicity !== "White" ? 5 : 0);
    const score = Math.max(20, Math.min(98, baseScore - biasPenalty + (Math.random() * 8 - 4)));
    return {
      id: i + 1,
      name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
      age: 22 + Math.floor(Math.random() * 25),
      gender,
      ethnicity,
      education: educations[Math.floor(Math.random() * educations.length)],
      experience: Math.floor(Math.random() * 18),
      score: Math.round(score),
      selected: score >= 65,
    };
  });
};

export const biasMetrics = {
  before: {
    overall: 58,
    gender: { Male: 78, Female: 52, "Non-binary": 49 },
    ethnicity: { White: 76, Asian: 64, Hispanic: 55, Black: 49, "Middle Eastern": 52, Mixed: 60 },
    age: { "20-29": 71, "30-39": 64, "40-49": 52, "50+": 41 },
  },
  after: {
    overall: 92,
    gender: { Male: 91, Female: 92, "Non-binary": 90 },
    ethnicity: { White: 92, Asian: 91, Hispanic: 90, Black: 91, "Middle Eastern": 90, Mixed: 92 },
    age: { "20-29": 92, "30-39": 91, "40-49": 90, "50+": 91 },
  },
};

export const candidates = [
  { id: 1, name: "Aisha Patel", role: "Senior ML Engineer", match: 96, status: "Match", skills: ["PyTorch", "MLOps", "AWS"], exp: 7, location: "Remote", availability: "2 weeks" },
  { id: 2, name: "Marcus Okafor", role: "Senior ML Engineer", match: 93, status: "Match", skills: ["TensorFlow", "K8s", "GCP"], exp: 8, location: "London", availability: "1 month" },
  { id: 3, name: "Yuki Tanaka", role: "Senior ML Engineer", match: 91, status: "Match", skills: ["JAX", "Distributed", "Rust"], exp: 6, location: "Tokyo", availability: "Immediate" },
  { id: 4, name: "Sofia Rossi", role: "Senior ML Engineer", match: 88, status: "Match", skills: ["PyTorch", "NLP", "Azure"], exp: 5, location: "Milan", availability: "2 weeks" },
  { id: 5, name: "Diego Garcia", role: "Senior ML Engineer", match: 81, status: "Match", skills: ["sklearn", "Spark", "AWS"], exp: 6, location: "Madrid", availability: "1 month" },
  { id: 6, name: "Priya Singh", role: "Senior ML Engineer", match: 76, status: "Intermediate", skills: ["PyTorch", "REST"], exp: 4, location: "Bangalore", availability: "2 weeks" },
  { id: 7, name: "Liam Cohen", role: "Senior ML Engineer", match: 72, status: "Intermediate", skills: ["TensorFlow", "Docker"], exp: 5, location: "Tel Aviv", availability: "2 months" },
  { id: 8, name: "Zara Khan", role: "Senior ML Engineer", match: 69, status: "Intermediate", skills: ["sklearn", "FastAPI"], exp: 3, location: "Dubai", availability: "Immediate" },
  { id: 9, name: "Noah Brown", role: "Senior ML Engineer", match: 64, status: "Intermediate", skills: ["Pandas", "Flask"], exp: 4, location: "NYC", availability: "1 month" },
  { id: 10, name: "Imani Diallo", role: "Senior ML Engineer", match: 58, status: "Intermediate", skills: ["Python", "SQL"], exp: 3, location: "Lagos", availability: "Immediate" },
  { id: 11, name: "Kai Müller", role: "Senior ML Engineer", match: 49, status: "Mismatch", skills: ["JS", "React"], exp: 2, location: "Berlin", availability: "Immediate" },
  { id: 12, name: "Amara Hassan", role: "Senior ML Engineer", match: 42, status: "Mismatch", skills: ["PHP", "MySQL"], exp: 6, location: "Cairo", availability: "1 month" },
  { id: 13, name: "Lukas Park", role: "Senior ML Engineer", match: 38, status: "Mismatch", skills: ["WordPress"], exp: 8, location: "Seoul", availability: "Immediate" },
  { id: 14, name: "Fatima Lee", role: "Senior ML Engineer", match: 33, status: "Mismatch", skills: ["Excel", "VBA"], exp: 10, location: "KL", availability: "2 months" },
];

export const funnelData = [
  { stage: "Applied", value: 1248, color: "hsl(263 100% 59%)" },
  { stage: "Screened", value: 612, color: "hsl(263 80% 65%)" },
  { stage: "Shortlisted", value: 184, color: "hsl(220 90% 65%)" },
  { stage: "Interviewed", value: 72, color: "hsl(187 100% 50%)" },
  { stage: "Offered", value: 14, color: "hsl(152 100% 50%)" },
  { stage: "Hired", value: 9, color: "hsl(152 100% 60%)" },
];

export const trendData = Array.from({ length: 12 }, (_, i) => ({
  month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],
  applicants: 60 + Math.round(Math.random() * 80) + i * 10,
  hires: 2 + Math.round(Math.random() * 5),
  fairness: 70 + Math.round(Math.random() * 25),
}));

export const radarData = [
  { dim: "Skills", before: 62, after: 91 },
  { dim: "Gender", before: 51, after: 93 },
  { dim: "Ethnicity", before: 55, after: 92 },
  { dim: "Age", before: 49, after: 90 },
  { dim: "Disability", before: 44, after: 89 },
  { dim: "Location", before: 67, after: 92 },
];
