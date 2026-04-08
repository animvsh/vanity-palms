// ── Provider Credential Options ──────────────────────────

export const DEGREES = [
  "MD",
  "DO",
  "DDS",
  "DMD",
  "MBBS",
  "NP",
  "PA",
  "RN",
] as const;

export type Degree = (typeof DEGREES)[number];

export const PROVIDER_TYPES = [
  "Plastic Surgeon",
  "Facial Plastic Surgeon",
  "Dermatologist",
  "Otolaryngologist (ENT)",
  "Oral & Maxillofacial Surgeon",
  "Cosmetic Dentist",
  "Nurse Practitioner (Aesthetic)",
  "Physician Assistant (Aesthetic)",
] as const;

export type ProviderType = (typeof PROVIDER_TYPES)[number];

export const SPECIALTIES = [
  "Plastic Surgery",
  "Facial Plastic Surgery",
  "Dermatology",
  "Otolaryngology (ENT)",
  "Oral & Maxillofacial Surgery",
  "Cosmetic Dentistry",
  "Aesthetic Medicine",
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

export const SUBSPECIALTIES = [
  "Rhinoplasty",
  "Facial Rejuvenation",
  "Facelift Surgery",
  "Eyelid Surgery",
  "Chin / Jawline Enhancement",
  "Hair Restoration",
  "Body Contouring",
  "Breast Surgery",
  "Injectables",
  "Skin Treatments",
] as const;

export type Subspecialty = (typeof SUBSPECIALTIES)[number];

export const BOARD_CERTIFICATIONS = [
  { value: "ABPS", label: "ABPS — American Board of Plastic Surgery" },
  { value: "ABFPRS", label: "ABFPRS — American Board of Facial Plastic & Reconstructive Surgery" },
  { value: "ABD", label: "ABD — American Board of Dermatology" },
  { value: "ABO-HNS", label: "ABO-HNS — American Board of Otolaryngology" },
  { value: "ABOMS", label: "ABOMS — American Board of Oral & Maxillofacial Surgery" },
  { value: "ABCS", label: "ABCS — American Board of Cosmetic Surgery" },
] as const;

export type BoardCertification = (typeof BOARD_CERTIFICATIONS)[number]["value"];

export function getCertificationDisplayLabel(certs: string[]): string | null {
  if (certs.length >= 3) return "Triple Board Certified";
  if (certs.length === 2) return "Double Board Certified";
  if (certs.length === 1) return "Board Certified";
  return null;
}

// ── US States ────────────────────────────────────────────

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC",
] as const;

// ── V1 Pilot Procedures with Techniques ──────────────────

export interface ProcedureDefinition {
  name: string;
  bodyArea: "face" | "breast" | "body";
  techniques: string[];
}

export const V1_PROCEDURES: ProcedureDefinition[] = [
  // Face
  { name: "Facelift", bodyArea: "face", techniques: ["Deep Plane", "SMAS", "Mini"] },
  { name: "Blepharoplasty", bodyArea: "face", techniques: ["Upper", "Lower", "Combination"] },
  { name: "Rhinoplasty", bodyArea: "face", techniques: ["Open", "Closed", "Preservation"] },
  { name: "Chin Implant", bodyArea: "face", techniques: ["Silicone", "Medpor", "Sliding Genioplasty"] },
  { name: "Hair Transplant", bodyArea: "face", techniques: ["FUE", "FUT", "DHI", "ARTAS (robotic)"] },
  // Breast
  { name: "Breast Augmentation", bodyArea: "breast", techniques: ["Silicone", "Saline", "Fat Transfer"] },
  // Body
  { name: "Liposuction", bodyArea: "body", techniques: ["Traditional", "VASER", "Laser"] },
  { name: "Tummy Tuck", bodyArea: "body", techniques: ["Full", "Mini", "Extended"] },
  { name: "BBL", bodyArea: "body", techniques: ["Traditional", "Skinny BBL", "BBL with Lipo 360"] },
];

// ── Post-Op Timeline Options ─────────────────────────────

export const POST_OP_OPTIONS = [
  "1 month",
  "3 months",
  "6 months",
  "9 months",
  "12 months",
  "18+ months",
] as const;

// ── Verification Status ──────────────────────────────────

export type VerificationStatus = "pending" | "verified" | "rejected" | "suspended";
