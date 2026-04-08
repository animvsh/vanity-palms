import type { FeatureId, FeatureValues } from "./landmarks";

/** A single chat message in the conversation */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  /** Feature deltas applied by this message (assistant messages only) */
  featureDeltas?: Partial<FeatureValues>;
}

/** A parsed intent from natural language */
interface ParsedIntent {
  feature: FeatureId;
  direction: number; // -1 to 1
  magnitude: number; // 0 to 1
}

// Keyword mapping: what users say -> what feature to change
const FEATURE_KEYWORDS: Array<{
  patterns: RegExp[];
  feature: FeatureId;
  defaultDirection: number;
}> = [
  {
    patterns: [/nose\s*(thin|narrow|slim|small)/i, /thin(ner)?\s*nose/i, /narrow(er)?\s*nose/i, /slim(mer)?\s*nose/i, /smaller\s*nose/i, /rhinoplast/i, /nose\s*(job|refine|reshap)/i, /refine\s*(my\s*)?nose/i],
    feature: "nose_width",
    defaultDirection: -1,
  },
  {
    patterns: [/nose\s*(wide|broad|big)/i, /wide(r)?\s*nose/i, /broad(er)?\s*nose/i, /big(ger)?\s*nose/i],
    feature: "nose_width",
    defaultDirection: 1,
  },
  {
    patterns: [/nose\s*(short|small|shorter)/i, /short(er)?\s*nose/i, /reduce\s*nose/i, /smaller\s*nose\s*(length|tip)?/i],
    feature: "nose_length",
    defaultDirection: -1,
  },
  {
    patterns: [/nose\s*(long|longer|extend)/i, /long(er)?\s*nose/i, /extend\s*nose/i],
    feature: "nose_length",
    defaultDirection: 1,
  },
  {
    patterns: [/nose\s*bridge\s*(thin|narrow|refine)/i, /refine\s*(the\s*)?nose\s*bridge/i, /narrow(er)?\s*bridge/i],
    feature: "nose_bridge",
    defaultDirection: -1,
  },
  {
    patterns: [/lift\s*(my\s*)?(eye)?brow/i, /brow\s*lift/i, /raise\s*(my\s*)?(eye)?brow/i, /higher\s*brow/i, /elevate\s*brow/i, /brow\s*(plasty|surgery)/i],
    feature: "brow_lift",
    defaultDirection: 1,
  },
  {
    patterns: [/lower\s*(my\s*)?(eye)?brow/i, /drop\s*(my\s*)?(eye)?brow/i, /brow.*down/i],
    feature: "brow_lift",
    defaultDirection: -1,
  },
  {
    patterns: [/brow.*closer/i, /narrow.*brow/i, /brow.*narrow/i],
    feature: "brow_gap",
    defaultDirection: -1,
  },
  {
    patterns: [/brow.*apart/i, /brow.*wider/i, /spread.*brow/i, /wider.*brow\s*spac/i],
    feature: "brow_gap",
    defaultDirection: 1,
  },
  {
    patterns: [/big(ger)?\s*eye/i, /eye.*big/i, /open.*eye/i, /widen.*eye/i, /larger\s*eye/i, /eye.*larger/i, /eye.*open/i, /blepharoplast/i, /eyelid\s*(surgery|lift)/i],
    feature: "eye_size",
    defaultDirection: 1,
  },
  {
    patterns: [/small(er)?\s*eye/i, /eye.*small/i, /narrow.*eye/i],
    feature: "eye_size",
    defaultDirection: -1,
  },
  {
    patterns: [/full(er)?\s*lip/i, /lip.*full/i, /plump\s*lip/i, /lip.*plump/i, /big(ger)?\s*lip/i, /lip.*big/i, /lip\s*filler/i, /pouty\s*lip/i, /lip\s*(augment|enhanc|inject)/i],
    feature: "lip_fullness",
    defaultDirection: 1,
  },
  {
    patterns: [/thin(ner)?\s*lip/i, /lip.*thin/i, /reduce\s*lip/i, /lip.*small/i, /smaller\s*lip/i],
    feature: "lip_fullness",
    defaultDirection: -1,
  },
  {
    patterns: [/wide(r)?\s*lip/i, /lip.*wide/i, /wider\s*mouth/i, /lip.*stretch/i],
    feature: "lip_width",
    defaultDirection: 1,
  },
  {
    patterns: [/narrow(er)?\s*lip/i, /lip.*narrow/i, /narrow(er)?\s*mouth/i],
    feature: "lip_width",
    defaultDirection: -1,
  },
  {
    patterns: [/sharp(er|en)?\s*jaw/i, /jaw.*sharp/i, /define.*jaw/i, /jaw.*defin/i, /sculpt.*jaw/i, /jaw.*sculpt/i, /slim(mer)?\s*jaw/i, /jaw.*slim/i, /narrow(er)?\s*jaw/i, /jaw.*narrow/i, /v.?line\s*(jaw|face)?/i, /jaw\s*(contour|surgery|reshap)/i],
    feature: "jawline",
    defaultDirection: -1,
  },
  {
    patterns: [/wide(r)?\s*jaw/i, /jaw.*wide/i, /square\s*jaw/i, /jaw.*square/i, /broad(er)?\s*jaw/i],
    feature: "jawline",
    defaultDirection: 1,
  },
  {
    patterns: [/short(er)?\s*chin/i, /chin.*short/i, /reduce\s*chin/i, /chin.*reduce/i, /less\s*chin/i],
    feature: "chin_height",
    defaultDirection: -1,
  },
  {
    patterns: [/long(er)?\s*chin/i, /chin.*long/i, /extend\s*chin/i, /chin.*extend/i, /more\s*chin/i],
    feature: "chin_height",
    defaultDirection: 1,
  },
  {
    patterns: [/narrow(er)?\s*chin/i, /chin.*narrow/i, /slim(mer)?\s*chin/i, /chin.*slim/i, /pointy\s*chin/i],
    feature: "chin_width",
    defaultDirection: -1,
  },
  {
    patterns: [/wide(r)?\s*chin/i, /chin.*wide/i, /broad(er)?\s*chin/i],
    feature: "chin_width",
    defaultDirection: 1,
  },
  {
    patterns: [/cheek\s*bone/i, /high(er)?\s*cheek/i, /cheek.*high/i, /define\s*cheek/i, /cheek.*defin/i, /sculpt\s*cheek/i, /prominent\s*cheek/i, /more\s*cheek/i, /cheek\s*(augment|filler|implant|inject)/i, /pop.*cheek/i, /cheek.*pop/i],
    feature: "cheek_fullness",
    defaultDirection: 1,
  },
  {
    patterns: [/slim(mer)?\s*cheek/i, /cheek.*slim/i, /less\s*cheek/i, /reduce\s*cheek/i, /flatten\s*cheek/i],
    feature: "cheek_fullness",
    defaultDirection: -1,
  },
  {
    patterns: [/slim(mer)?\s*face/i, /face.*slim/i, /narrow(er)?\s*face/i, /face.*narrow/i, /thin(ner)?\s*face/i, /face.*thin/i, /facelift/i, /face\s*lift/i, /face\s*(contour|sculpt|tighten)/i],
    feature: "face_width",
    defaultDirection: -1,
  },
  {
    patterns: [/wide(r)?\s*face/i, /face.*wide/i, /broad(er)?\s*face/i, /face.*broad/i, /full(er)?\s*face/i],
    feature: "face_width",
    defaultDirection: 1,
  },
  {
    patterns: [/small(er)?\s*forehead/i, /forehead.*small/i, /reduce\s*forehead/i, /lower\s*hairline/i, /less\s*forehead/i],
    feature: "forehead",
    defaultDirection: -1,
  },
  {
    patterns: [/big(ger)?\s*forehead/i, /forehead.*big/i, /higher\s*forehead/i, /more\s*forehead/i],
    feature: "forehead",
    defaultDirection: 1,
  },
  // Skin smoothness
  {
    patterns: [/smooth(er)?\s*skin/i, /skin.*smooth/i, /refine\s*skin/i, /skin\s*texture/i, /reduce\s*pore/i, /less\s*pore/i, /pore\s*(reduction|minimiz|refin)/i, /clear(er)?\s*skin/i, /skin\s*resurfac/i],
    feature: "skin_smoothness",
    defaultDirection: 1,
  },
  {
    patterns: [/natural\s*skin/i, /more\s*texture/i, /textured\s*skin/i, /visible\s*pore/i, /rough(er)?\s*skin/i],
    feature: "skin_smoothness",
    defaultDirection: -1,
  },
  // Skin firmness
  {
    patterns: [/firm(er)?\s*skin/i, /skin.*firm/i, /tight(er|en)?\s*skin/i, /skin.*tight/i, /taut(er)?\s*skin/i, /skin\s*elasticity/i, /skin\s*density/i, /denser\s*skin/i, /improve\s*skin/i],
    feature: "skin_firmness",
    defaultDirection: 1,
  },
  {
    patterns: [/soft(er)?\s*skin/i, /skin.*soft/i, /relax(ed)?\s*skin/i, /loose(r)?\s*skin/i, /less\s*firm/i],
    feature: "skin_firmness",
    defaultDirection: -1,
  },
];

// Known body parts for fuzzy matching
const BODY_PARTS = ["nose", "brow", "eye", "lip", "jaw", "chin", "cheek", "face", "forehead", "skin", "pore"];

// Specific suggestions per body part for better error messages
const BODY_PART_SUGGESTIONS: Record<string, string[]> = {
  nose: ["thinner nose", "wider nose", "shorter nose", "refine nose bridge"],
  brow: ["lift my brows", "lower my brows", "brows closer together"],
  eye: ["bigger eyes", "smaller eyes", "eyelid lift"],
  lip: ["fuller lips", "thinner lips", "wider lips"],
  jaw: ["sharper jawline", "wider jaw", "v-line jaw"],
  chin: ["shorter chin", "longer chin", "narrower chin"],
  cheek: ["higher cheekbones", "slimmer cheeks", "cheek filler"],
  face: ["slimmer face", "wider face", "facelift"],
  forehead: ["smaller forehead", "bigger forehead", "lower hairline"],
  skin: ["smoother skin", "firmer skin", "tighter skin", "reduce pores", "improve skin texture"],
  pore: ["reduce pores", "smoother skin", "refine skin texture"],
};

// Magnitude modifiers
const MAGNITUDE_MODIFIERS: Array<{ pattern: RegExp; magnitude: number }> = [
  { pattern: /very\s*(much|slight)?|a\s*lot|dramatic|significant|extreme|max/i, magnitude: 1.0 },
  { pattern: /quite|fairly|moderately|medium|moderate/i, magnitude: 0.65 },
  { pattern: /a\s*(little|bit|tiny|touch)|slight|subtle|minimal|barely/i, magnitude: 0.25 },
  { pattern: /more/i, magnitude: 0.5 },
  { pattern: /less/i, magnitude: -0.5 },
];

// Relative modifiers for follow-up messages
const RELATIVE_PATTERNS = [
  { pattern: /^(a\s*)?(bit|little|touch)\s*more$/i, featureDelta: 0.15 },
  { pattern: /^more$/i, featureDelta: 0.25 },
  { pattern: /^(a\s*)?(lot|much)\s*more$/i, featureDelta: 0.4 },
  { pattern: /^(a\s*)?(bit|little|touch)\s*less$/i, featureDelta: -0.15 },
  { pattern: /^less$/i, featureDelta: -0.25 },
  { pattern: /^(a\s*)?(lot|much)\s*less$/i, featureDelta: -0.4 },
  { pattern: /^undo(\s*that)?$/i, featureDelta: null }, // special: undo
  { pattern: /^reset(\s*all|\s*everything)?$/i, featureDelta: null }, // special: reset
];

/**
 * Simple Levenshtein distance for fuzzy matching body part names.
 */
function editDistance(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  const dp: number[][] = Array.from({ length: la + 1 }, () => Array(lb + 1).fill(0));
  for (let i = 0; i <= la; i++) dp[i][0] = i;
  for (let j = 0; j <= lb; j++) dp[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[la][lb];
}

/**
 * Try to fuzzy-match a word to a known body part.
 * Returns the match if edit distance <= 2 and unambiguous.
 */
function fuzzyMatchBodyPart(word: string): string | null {
  const lower = word.toLowerCase();
  // Exact match first
  if (BODY_PARTS.includes(lower)) return lower;
  // Fuzzy match
  let bestMatch: string | null = null;
  let bestDist = 3; // threshold
  for (const part of BODY_PARTS) {
    const dist = editDistance(lower, part);
    if (dist < bestDist) {
      bestDist = dist;
      bestMatch = part;
    }
  }
  return bestMatch;
}

function parseMagnitude(text: string): number {
  for (const mod of MAGNITUDE_MODIFIERS) {
    if (mod.pattern.test(text)) return mod.magnitude;
  }
  return 0.5; // default moderate
}

function parseIntents(text: string): ParsedIntent[] {
  const intents: ParsedIntent[] = [];
  const matched = new Set<FeatureId>();

  for (const mapping of FEATURE_KEYWORDS) {
    // Skip if we already matched this feature (e.g. from an earlier pattern)
    if (matched.has(mapping.feature)) continue;

    for (const pattern of mapping.patterns) {
      if (pattern.test(text)) {
        const mag = parseMagnitude(text);
        const direction = mag < 0 ? -mapping.defaultDirection : mapping.defaultDirection;
        intents.push({
          feature: mapping.feature,
          direction,
          magnitude: Math.abs(mag),
        });
        matched.add(mapping.feature);
        break; // don't match multiple patterns for same feature mapping
      }
    }
  }

  return intents;
}

export interface ParseResult {
  type: "adjustment" | "undo" | "reset" | "unknown";
  featureDeltas: Partial<FeatureValues>;
  responseText: string;
  /** For undo: which message to undo */
  undoMessageId?: string;
}

/**
 * Parse a user message into feature adjustments.
 * Takes conversation history to handle relative modifiers.
 */
export function parseUserMessage(
  text: string,
  currentValues: FeatureValues,
  history: ChatMessage[],
): ParseResult {
  const trimmed = text.trim();

  // Check for reset
  if (/^reset(\s*all|\s*everything)?$/i.test(trimmed)) {
    const deltas: Partial<FeatureValues> = {};
    for (const [key, val] of Object.entries(currentValues)) {
      if (Math.abs(val) > 0.01) {
        deltas[key as FeatureId] = -val;
      }
    }
    return {
      type: "reset",
      featureDeltas: deltas,
      responseText: "All done — back to your original photo. Ready for a fresh start whenever you are.",
    };
  }

  // Check for undo
  if (/^undo(\s*that)?$/i.test(trimmed)) {
    // Find last assistant message with deltas
    const lastAssistant = [...history]
      .reverse()
      .find((m) => m.role === "assistant" && m.featureDeltas);
    if (lastAssistant?.featureDeltas) {
      const deltas: Partial<FeatureValues> = {};
      for (const [key, val] of Object.entries(lastAssistant.featureDeltas)) {
        deltas[key as FeatureId] = -(val as number);
      }
      return {
        type: "undo",
        featureDeltas: deltas,
        responseText: "Got it, I've undone the last change. Looking good?",
        undoMessageId: lastAssistant.id,
      };
    }
    return {
      type: "undo",
      featureDeltas: {},
      responseText: "Nothing to undo yet — try making a change first!",
    };
  }

  // Check for relative modifiers ("a bit more", "less")
  for (const rel of RELATIVE_PATTERNS) {
    if (rel.pattern.test(trimmed) && rel.featureDelta !== null) {
      // Apply relative change to the last-modified feature
      const lastAssistant = [...history]
        .reverse()
        .find((m) => m.role === "assistant" && m.featureDeltas);
      if (lastAssistant?.featureDeltas) {
        const lastFeature = Object.keys(lastAssistant.featureDeltas)[0] as FeatureId;
        if (lastFeature) {
          const lastDirection = (lastAssistant.featureDeltas[lastFeature] ?? 0) > 0 ? 1 : -1;
          const delta = rel.featureDelta * lastDirection;
          return {
            type: "adjustment",
            featureDeltas: { [lastFeature]: delta },
            responseText: `Tweaked ${lastFeature.replace(/_/g, " ")} ${delta > 0 ? "up a bit" : "down a bit"}. Keep going or try something else!`,
          };
        }
      }
      // No prior message to reference
      return {
        type: "unknown",
        featureDeltas: {},
        responseText: "I'm not sure what to adjust — make a change first, then say \"more\" or \"less\" to fine-tune it.",
      };
    }
  }

  // Parse as new feature request
  const intents = parseIntents(trimmed);

  if (intents.length === 0) {
    return {
      type: "unknown",
      featureDeltas: {},
      responseText: suggestAlternative(trimmed),
    };
  }

  const deltas: Partial<FeatureValues> = {};
  const descriptions: string[] = [];

  for (const intent of intents) {
    const delta = intent.direction * intent.magnitude;
    deltas[intent.feature] = delta;

    const label = intent.feature.replace(/_/g, " ");
    const dirWord = intent.direction > 0 ? "enhanced" : "refined";
    const magWord =
      intent.magnitude >= 0.8
        ? "noticeably"
        : intent.magnitude >= 0.5
          ? ""
          : "subtly";
    descriptions.push(`${magWord ? magWord + " " : ""}${dirWord} your ${label}`);
  }

  return {
    type: "adjustment",
    featureDeltas: deltas,
    responseText: descriptions.length === 1
      ? `Looking great — I've ${descriptions[0]}. Want more or less? Or try another change.`
      : `Here's what I did:\n${descriptions.map((d) => `• ${d[0].toUpperCase() + d.slice(1)}`).join("\n")}\n\nWant to fine-tune? Say "more" or "less", or describe another change.`,
  };
}

function suggestAlternative(text: string): string {
  // Check for exact body part match
  const lower = text.toLowerCase();
  const exactMatch = BODY_PARTS.find((p) => lower.includes(p));

  if (exactMatch) {
    const suggestions = BODY_PART_SUGGESTIONS[exactMatch] || [];
    return `I can help with your ${exactMatch}! Try one of these:\n${suggestions.map((s) => `• "${s}"`).join("\n")}\n\nOr switch to the Sliders tab for precise control.`;
  }

  // Try fuzzy matching individual words
  const words = lower.split(/\s+/);
  for (const word of words) {
    if (word.length < 3) continue;
    const fuzzy = fuzzyMatchBodyPart(word);
    if (fuzzy) {
      const suggestions = BODY_PART_SUGGESTIONS[fuzzy] || [];
      return `Did you mean "${fuzzy}"? Try one of these:\n${suggestions.map((s) => `• "${s}"`).join("\n")}\n\nOr switch to the Sliders tab for precise control.`;
    }
  }

  return `I'd love to help! Just describe what you'd like changed, for example:\n• "Thinner nose"\n• "Lift my brows"\n• "Fuller lips"\n• "Sharper jawline"\n• "Slim my face"\n\nOr switch to the Sliders tab to adjust each feature manually.`;
}

/**
 * Apply feature deltas to current values, clamping to [-1, 1].
 */
export function applyDeltas(
  current: FeatureValues,
  deltas: Partial<FeatureValues>,
): FeatureValues {
  const result = { ...current };
  for (const [key, delta] of Object.entries(deltas)) {
    const featureKey = key as FeatureId;
    result[featureKey] = Math.max(-1, Math.min(1, result[featureKey] + (delta as number)));
  }
  return result;
}
