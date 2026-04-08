export interface Concern {
  id: string;
  name: string;
  icon: string;
  procedureCount: number;
  description: string;
  image: string;
}

export interface Procedure {
  id: string;
  concernId: string;
  name: string;
  type: "surgical" | "non-surgical";
  costMin: number;
  costMax: number;
  recoveryDays: number;
  rating: number;
  popularity: number;
  overview: string;
  howItWorks: string;
  recoveryTimeline: { day: string; description: string }[];
  expectedResults: string;
}

export interface ProviderCredentials {
  degree: string;
  providerType: string;
  specialty: string;
  subspecialties: string[];
  boardCertifications: string[];
  yearsInPractice: number;
  licenseNumber: string;
  licenseState: string;
  licenseDocumentUrl?: string;
}

export interface Provider {
  id: string;
  name: string;
  practiceName?: string;
  photo: string;
  specialty: string[];
  rating: number;
  reviewCount: number;
  distance: number;
  responseTime: string;
  yearsExperience: number;
  gender: string;
  certifications: string[];
  bio: string;
  location: string;
  consultationType: string[];
  procedures: { procedureId: string; price: number }[];
  languages: string[];
  instagramUrl?: string;
  composioConnectionStatus?: {
    calendar?: "not_connected" | "connected" | "error";
    email?: "not_connected" | "connected" | "error";
    provider?: string;
  };
  subscriptionTier?: "free" | "premium";
  credentials?: ProviderCredentials;
  verificationStatus?: "pending" | "verified" | "rejected" | "suspended";
}

// Reviews are collected via secure review request links after a provider
// marks a consultation or procedure as reviewable.
export type ReviewStage = "consultation" | "procedure" | "follow_up" | "consult_decision" | "results";

export const REVIEW_STAGES = {
  consultation: { label: "After Consultation", daysAfterBooking: 3 },
  consult_decision: { label: "Consult / Decision", daysAfterBooking: 3 },
  procedure: { label: "After Procedure", daysAfterProcedure: 30 },
  results: { label: "Results", daysAfterProcedure: 365 },
  followUp: { label: "Long-term Follow-up", daysAfterProcedure: 180 },
} as const;

export interface Review {
  id: string;
  providerId: string;
  procedureId: string;
  rating: number;
  body: string;
  patientName: string;
  date: string;
  stage?: ReviewStage;
  consultRating?: number;
  resultsRating?: number;
  recoveryRating?: number;
  worthIt?: boolean;
  wouldChooseAgain?: boolean;
  wouldRecommend?: boolean;
  structuredAnswers?: Record<string, unknown>;
}

export const concerns: Concern[] = [
  { id: "face", name: "Face", icon: "smile", procedureCount: 12, description: "Facial rejuvenation and contouring procedures", image: "" },
  { id: "nose", name: "Nose", icon: "wind", procedureCount: 4, description: "Rhinoplasty and non-surgical nose reshaping", image: "" },
  { id: "skin", name: "Skin", icon: "sparkles", procedureCount: 8, description: "Skin rejuvenation, resurfacing, and treatments", image: "" },
  { id: "body", name: "Body", icon: "heart", procedureCount: 10, description: "Body contouring and sculpting procedures", image: "" },
  { id: "eyes", name: "Eyes", icon: "eye", procedureCount: 5, description: "Eyelid surgery and under-eye treatments", image: "" },
  { id: "lips", name: "Lips", icon: "syringe", procedureCount: 3, description: "Lip augmentation and enhancement", image: "" },
  { id: "hair", name: "Hair", icon: "waves", procedureCount: 4, description: "Hair restoration and transplant procedures", image: "" },
  { id: "breast", name: "Breast", icon: "star", procedureCount: 6, description: "Breast augmentation, lift, and reduction", image: "" },
];

export const procedures: Procedure[] = [
  {
    id: "rhinoplasty", concernId: "nose", name: "Rhinoplasty", type: "surgical",
    costMin: 8000, costMax: 15000, recoveryDays: 14, rating: 4.7, popularity: 95,
    overview: "Rhinoplasty reshapes the nose to improve its appearance and proportion with the rest of the face. It can also correct breathing difficulties caused by structural defects.",
    howItWorks: "The surgeon makes incisions inside the nose or across the columella. Bone and cartilage are then reshaped to achieve the desired contour. The procedure typically takes 2–3 hours under general anesthesia.",
    recoveryTimeline: [
      { day: "Day 1–3", description: "Swelling and bruising around the eyes. Nasal splint in place." },
      { day: "Day 7", description: "Splint removed. Most bruising fades." },
      { day: "Week 2–3", description: "Return to work/school. Avoid strenuous activity." },
      { day: "Month 3–6", description: "Swelling continues to resolve. Shape refines." },
      { day: "Year 1", description: "Final results visible." },
    ],
    expectedResults: "A more balanced, proportionate nose that complements your facial features. Results are permanent.",
  },
  {
    id: "nose-filler", concernId: "nose", name: "Non-Surgical Nose Job", type: "non-surgical",
    costMin: 800, costMax: 2000, recoveryDays: 1, rating: 4.3, popularity: 80,
    overview: "Uses dermal fillers to smooth bumps, lift the tip, or improve symmetry without surgery.",
    howItWorks: "Hyaluronic acid filler is strategically injected into specific areas of the nose. The procedure takes 15–30 minutes with topical numbing.",
    recoveryTimeline: [
      { day: "Day 1", description: "Minor swelling. Resume normal activities." },
      { day: "Week 1", description: "Final results visible." },
      { day: "Month 12–18", description: "Results fade; maintenance needed." },
    ],
    expectedResults: "Subtle improvements to nose shape. Results last 12–18 months.",
  },
  {
    id: "facelift", concernId: "face", name: "Facelift", type: "surgical",
    costMin: 12000, costMax: 25000, recoveryDays: 21, rating: 4.8, popularity: 88,
    overview: "A facelift tightens sagging skin and repositions deeper tissues to restore a youthful facial contour.",
    howItWorks: "Incisions are made along the hairline and around the ears. Underlying muscles are tightened, excess skin removed, and the remaining skin re-draped smoothly.",
    recoveryTimeline: [
      { day: "Day 1–3", description: "Moderate swelling and tightness. Drains may be placed." },
      { day: "Week 1", description: "Stitches removed. Swelling begins to subside." },
      { day: "Week 2–3", description: "Return to non-strenuous work." },
      { day: "Month 3", description: "Most swelling resolved. Results becoming apparent." },
    ],
    expectedResults: "A naturally refreshed appearance that can take 10+ years off your look. Results last 7–10 years.",
  },
  {
    id: "botox", concernId: "face", name: "Botox", type: "non-surgical",
    costMin: 200, costMax: 600, recoveryDays: 0, rating: 4.6, popularity: 98,
    overview: "Botulinum toxin injections temporarily relax facial muscles to smooth wrinkles and fine lines.",
    howItWorks: "Small amounts of botulinum toxin are injected into targeted muscles using a fine needle. The procedure takes 10–15 minutes with no anesthesia needed.",
    recoveryTimeline: [
      { day: "Day 1", description: "Tiny bumps at injection sites resolve within hours." },
      { day: "Day 3–5", description: "Effects begin to appear." },
      { day: "Day 14", description: "Full results visible." },
      { day: "Month 3–4", description: "Effects wear off; retreatment recommended." },
    ],
    expectedResults: "Smoother skin with reduced fine lines and wrinkles. Results last 3–4 months.",
  },
  {
    id: "blepharoplasty", concernId: "eyes", name: "Blepharoplasty", type: "surgical",
    costMin: 4000, costMax: 8000, recoveryDays: 10, rating: 4.7, popularity: 75,
    overview: "Eyelid surgery removes excess skin, muscle, and fat from the upper and/or lower eyelids.",
    howItWorks: "Incisions are hidden in the natural creases of the eyelids. Excess tissue is removed or repositioned for a refreshed look.",
    recoveryTimeline: [
      { day: "Day 1–3", description: "Cold compresses to manage swelling." },
      { day: "Week 1", description: "Stitches removed. Bruising fades." },
      { day: "Week 2", description: "Return to normal activities." },
    ],
    expectedResults: "More alert, youthful-looking eyes. Results last many years.",
  },
  {
    id: "lip-filler", concernId: "lips", name: "Lip Filler", type: "non-surgical",
    costMin: 500, costMax: 1200, recoveryDays: 2, rating: 4.5, popularity: 92,
    overview: "Hyaluronic acid fillers add volume, shape, and definition to the lips.",
    howItWorks: "Filler is injected into the lips using a fine needle or cannula. Topical numbing is applied beforehand. Takes 15–30 minutes.",
    recoveryTimeline: [
      { day: "Day 1–2", description: "Swelling and mild bruising." },
      { day: "Day 3–5", description: "Swelling subsides. Shape settles." },
      { day: "Week 2", description: "Final results visible." },
    ],
    expectedResults: "Fuller, more defined lips. Results last 6–12 months.",
  },
  {
    id: "liposuction", concernId: "body", name: "Liposuction", type: "surgical",
    costMin: 5000, costMax: 12000, recoveryDays: 14, rating: 4.6, popularity: 85,
    overview: "Liposuction removes stubborn fat deposits to contour and reshape specific body areas.",
    howItWorks: "A thin cannula is inserted through small incisions. Fat is loosened and suctioned out. May be combined with tumescent technique for comfort.",
    recoveryTimeline: [
      { day: "Day 1–3", description: "Compression garment worn. Moderate soreness." },
      { day: "Week 1–2", description: "Swelling peaks then begins to subside." },
      { day: "Month 1", description: "Return to exercise. Visible improvement." },
      { day: "Month 3–6", description: "Final contour emerges." },
    ],
    expectedResults: "Slimmer, more defined body contour. Results are permanent with stable weight.",
  },
  {
    id: "chemical-peel", concernId: "skin", name: "Chemical Peel", type: "non-surgical",
    costMin: 150, costMax: 800, recoveryDays: 7, rating: 4.4, popularity: 70,
    overview: "A chemical solution is applied to the skin to remove damaged outer layers and reveal smoother, healthier skin.",
    howItWorks: "The provider applies a chemical solution (glycolic, salicylic, or TCA acid) to the treatment area. The skin peels over several days.",
    recoveryTimeline: [
      { day: "Day 1–2", description: "Redness and tightness. Skin begins to peel." },
      { day: "Day 3–5", description: "Active peeling. Avoid sun exposure." },
      { day: "Week 1–2", description: "New skin revealed. Apply SPF diligently." },
    ],
    expectedResults: "Improved skin texture, reduced fine lines, and more even tone. Multiple sessions recommended.",
  },
];

export const providers: Provider[] = [
  {
    id: "dr-chen", name: "Dr. Sarah Chen", photo: "",
    specialty: ["Rhinoplasty", "Facelift", "Blepharoplasty"], rating: 4.9, reviewCount: 234,
    distance: 3.2, responseTime: "< 2 hours", yearsExperience: 15, gender: "Female",
    certifications: ["Board Certified Plastic Surgeon", "ABPS", "Fellow AACS"],
    bio: "Dr. Chen is a double board-certified plastic surgeon specializing in facial procedures. She trained at Johns Hopkins and has been practicing in Beverly Hills for 15 years.",
    location: "Beverly Hills, CA", consultationType: ["In-Person", "Virtual"],
    procedures: [
      { procedureId: "rhinoplasty", price: 12000 },
      { procedureId: "facelift", price: 18000 },
      { procedureId: "blepharoplasty", price: 6000 },
    ],
    languages: ["English", "Mandarin"],
  },
  {
    id: "dr-martinez", name: "Dr. James Martinez", photo: "",
    specialty: ["Botox", "Lip Filler", "Chemical Peel"], rating: 4.7, reviewCount: 189,
    distance: 5.1, responseTime: "< 4 hours", yearsExperience: 10, gender: "Male",
    certifications: ["Board Certified Dermatologist", "AAD Member"],
    bio: "Dr. Martinez focuses on non-surgical aesthetics and has a reputation for natural-looking results. His clinic in West Hollywood is known for its relaxing atmosphere.",
    location: "West Hollywood, CA", consultationType: ["In-Person"],
    procedures: [
      { procedureId: "botox", price: 400 },
      { procedureId: "lip-filler", price: 800 },
      { procedureId: "chemical-peel", price: 350 },
    ],
    languages: ["English", "Spanish"],
  },
  {
    id: "dr-patel", name: "Dr. Priya Patel", photo: "",
    specialty: ["Rhinoplasty", "Nose Filler", "Botox"], rating: 4.8, reviewCount: 312,
    distance: 7.8, responseTime: "< 1 hour", yearsExperience: 12, gender: "Female",
    certifications: ["Board Certified Facial Plastic Surgeon", "AAFPRS Fellow"],
    bio: "Dr. Patel is one of LA's top facial plastic surgeons, known for her expertise in ethnic rhinoplasty and minimally invasive facial rejuvenation.",
    location: "Santa Monica, CA", consultationType: ["In-Person", "Virtual"],
    procedures: [
      { procedureId: "rhinoplasty", price: 10500 },
      { procedureId: "nose-filler", price: 1200 },
      { procedureId: "botox", price: 350 },
    ],
    languages: ["English", "Hindi"],
  },
  {
    id: "dr-thompson", name: "Dr. Michael Thompson", photo: "",
    specialty: ["Liposuction", "Facelift", "Blepharoplasty"], rating: 4.6, reviewCount: 156,
    distance: 4.5, responseTime: "< 6 hours", yearsExperience: 20, gender: "Male",
    certifications: ["Board Certified Plastic Surgeon", "ASPS Member"],
    bio: "With 20 years of experience, Dr. Thompson specializes in body contouring and facial rejuvenation. He has performed over 5,000 successful procedures.",
    location: "Brentwood, CA", consultationType: ["In-Person"],
    procedures: [
      { procedureId: "liposuction", price: 8500 },
      { procedureId: "facelift", price: 20000 },
      { procedureId: "blepharoplasty", price: 5500 },
    ],
    languages: ["English"],
  },
  {
    id: "dr-kim", name: "Dr. Julie Kim", photo: "",
    specialty: ["Lip Filler", "Botox", "Chemical Peel", "Nose Filler"], rating: 4.8, reviewCount: 278,
    distance: 2.1, responseTime: "< 30 min", yearsExperience: 8, gender: "Female",
    certifications: ["Board Certified Dermatologist", "Allergan Trainer"],
    bio: "Dr. Kim is a leading injector in LA, known for her artistic eye and conservative approach. She believes in enhancing natural beauty.",
    location: "Beverly Hills, CA", consultationType: ["In-Person", "Virtual"],
    procedures: [
      { procedureId: "lip-filler", price: 950 },
      { procedureId: "botox", price: 450 },
      { procedureId: "chemical-peel", price: 500 },
      { procedureId: "nose-filler", price: 1500 },
    ],
    languages: ["English", "Korean"],
  },
  {
    id: "dr-rodriguez", name: "Dr. Carlos Rodriguez", photo: "",
    specialty: ["Rhinoplasty", "Facelift", "Liposuction"], rating: 4.5, reviewCount: 98,
    distance: 9.3, responseTime: "< 8 hours", yearsExperience: 18, gender: "Male",
    certifications: ["Board Certified Plastic Surgeon", "ABPS"],
    bio: "Dr. Rodriguez brings nearly two decades of surgical experience to his Pasadena practice, specializing in transformative facial and body procedures.",
    location: "Pasadena, CA", consultationType: ["In-Person"],
    procedures: [
      { procedureId: "rhinoplasty", price: 9000 },
      { procedureId: "facelift", price: 16000 },
      { procedureId: "liposuction", price: 7000 },
    ],
    languages: ["English", "Spanish"],
  },
];

export const reviews: Review[] = [
  { id: "r1", providerId: "dr-chen", procedureId: "rhinoplasty", rating: 5, body: "Dr. Chen completely transformed my nose. The results are so natural — people can tell something is different but can't pinpoint what. Recovery was smooth and the team was incredibly supportive.", patientName: "Jessica M.", date: "2024-11-15" },
  { id: "r2", providerId: "dr-chen", procedureId: "rhinoplasty", rating: 5, body: "Best decision I ever made. Dr. Chen took the time to understand exactly what I wanted. My nose fits my face perfectly now.", patientName: "Amanda R.", date: "2024-10-22" },
  { id: "r3", providerId: "dr-martinez", procedureId: "botox", rating: 4, body: "Very natural results. Dr. Martinez has a great eye for balance. Will definitely come back for my next appointment.", patientName: "Rachel K.", date: "2024-12-01" },
  { id: "r4", providerId: "dr-patel", procedureId: "rhinoplasty", rating: 5, body: "Dr. Patel is an artist. She understood the nuances of ethnic rhinoplasty and gave me results that look natural and beautiful.", patientName: "Priya S.", date: "2024-09-30" },
  { id: "r5", providerId: "dr-kim", procedureId: "lip-filler", rating: 5, body: "So natural! Dr. Kim knows exactly how to enhance without overdoing it. My lips look fuller but still very much like me.", patientName: "Taylor W.", date: "2024-11-28" },
  { id: "r6", providerId: "dr-thompson", procedureId: "liposuction", rating: 4, body: "Great results on my flanks. Recovery was longer than expected but the final contour is exactly what I wanted.", patientName: "Michael B.", date: "2024-10-15" },
  { id: "r7", providerId: "dr-patel", procedureId: "botox", rating: 5, body: "Quick, painless, and perfect results every time. Dr. Patel's clinic is my go-to for all injectables.", patientName: "Sarah L.", date: "2024-12-10" },
  { id: "r8", providerId: "dr-kim", procedureId: "botox", rating: 5, body: "I've been going to Dr. Kim for 3 years. Consistently excellent results and the most welcoming staff.", patientName: "Lauren D.", date: "2024-11-05" },
];
