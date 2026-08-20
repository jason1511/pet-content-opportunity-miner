import { protectedJsonFetch } from "./api-security.js";

export async function buildResearchSignals(keyword) {
  const normalized = keyword.toLowerCase().trim();
  const keywordType = classifyKeywordType(normalized);

  let liveAutocomplete = [];

  try {
    const response = await fetch(`/api/autocomplete?keyword=${encodeURIComponent(normalized)}`);
    const data = await response.json();

    if (response.ok && Array.isArray(data.suggestions)) {
      liveAutocomplete = data.suggestions.slice(0, 8);
    }
  } catch (error) {
    console.error("Autocomplete fetch failed:", error);
  }

  const fallbackAutocomplete = [
    `${normalized} cost`,
    `${normalized} near me`,
    `${normalized} australia`,
    `best ${normalized}`,
    `${normalized} reviews`
  ];

  const autocompleteSuggestions =
    liveAutocomplete.length > 0 ? liveAutocomplete : fallbackAutocomplete;

  let relatedQuestions = [];

  try {
    const response = await protectedJsonFetch("/api/questions", {
      keyword: normalized,
      suggestions: autocompleteSuggestions
    }, { timeoutMs: 30000 });

    const data = await response.json();

    if (response.ok && Array.isArray(data.questions)) {
      relatedQuestions = data.questions;
    }
  } catch (error) {
    console.error("Question mining failed:", error);
  }

  const fallbackQuestions = [
    `What is the average ${normalized} cost?`,
    `Is ${normalized} worth it?`,
    `How does ${normalized} work?`,
    `What should I compare before choosing ${normalized}?`,
    `Who is ${normalized} best for?`,
    `What are the common mistakes when choosing ${normalized}?`
  ];

  const userQuestionSeeds =
    relatedQuestions.length > 0 ? relatedQuestions : fallbackQuestions;

  const contentAngles = [
    `${capitalize(normalized)} cost guide`,
    `${capitalize(normalized)} comparison page`,
    `${capitalize(normalized)} explained for first-time pet owners`,
    `Best options for ${normalized} in Australia`,
    `${capitalize(normalized)} FAQs and common mistakes`
  ];

  const signalMetrics = calculateSignalMetrics({
    keyword: normalized,
    autocompleteSuggestions,
    userQuestionSeeds,
    usedLiveAutocomplete: liveAutocomplete.length > 0
  });

  return {
    keyword: normalized,
    keywordType,
    autocompleteSuggestions,
    userQuestionSeeds,
    contentAngles,
    signalMetrics,
    collectedAt: new Date().toISOString(),
    sources: [
      {
        name: "Google autocomplete",
        url: "https://www.google.com/search?q=" + encodeURIComponent(normalized),
        method: liveAutocomplete.length > 0
          ? "Live suggestion response"
          : "Fallback set used because live suggestions were unavailable"
      },
      {
        name: "OpenAI question synthesis",
        url: "https://platform.openai.com/docs/overview",
        method: relatedQuestions.length > 0
          ? "Questions synthesised from the keyword and autocomplete signals"
          : "Fallback questions used because AI question synthesis was unavailable"
      }
    ],
    sourceMeta: {
      autocompleteSource: liveAutocomplete.length > 0 ? "Live suggestions" : "Fallback suggestions",
      questionSource: relatedQuestions.length > 0 ? "AI-mined from research signals" : "Fallback questions"
    }
  };
}

export function calculateSignalMetrics({
  keyword,
  autocompleteSuggestions = [],
  userQuestionSeeds = [],
  usedLiveAutocomplete = false
}) {
  const text = [keyword, ...autocompleteSuggestions].join(" ").toLowerCase();
  const commercialTerms = ["cost", "price", "best", "compare", "insurance", "vet", "clinic", "near me"];
  const actionTerms = ["cost", "price", "compare", "book", "quote", "near me", "treatment"];
  const modifierHits = commercialTerms.filter(term => text.includes(term));
  const words = String(keyword || "").trim().split(/\s+/).filter(Boolean);

  const commercialIntent = clampScore(3 + modifierHits.length * 1.4);
  const intentClarity = clampScore(3 + Math.min(words.length, 5) + (actionTerms.some(term => text.includes(term)) ? 2 : 0));
  const landingPageFit = clampScore((commercialIntent + intentClarity) / 2 + (words.length >= 2 ? 1 : 0));
  const contentDepth = clampScore(2 + autocompleteSuggestions.length * 0.45 + userQuestionSeeds.length * 0.55);
  const demandProxyScore = usedLiveAutocomplete ? autocompleteSuggestions.length : 0;
  const demandProxy = demandProxyScore >= 7 ? "Strong" : demandProxyScore >= 4 ? "Moderate" : "Limited / unverified";
  const competitionProxy = commercialIntent >= 8
    ? "Likely high"
    : commercialIntent >= 5
      ? "Likely moderate"
      : "Likely lower";

  return {
    autocompleteCount: autocompleteSuggestions.length,
    modifierCoverage: modifierHits,
    demandProxy,
    competitionProxy,
    commercialIntent,
    intentClarity,
    landingPageFit,
    contentDepth,
    caveat: "Demand and competition are directional proxies, not search-volume or keyword-difficulty measurements."
  };
}

function clampScore(value) {
  return Math.round(Math.min(10, Math.max(1, value)) * 10) / 10;
}

export function classifyKeywordType(keyword) {
  const commercialTerms = [
    "insurance",
    "cost",
    "price",
    "plan",
    "coverage",
    "treatment",
    "service",
    "vet",
    "clinic"
  ];

  const informationalTerms = [
    "how",
    "why",
    "what",
    "guide",
    "tips",
    "help",
    "symptoms",
    "causes"
  ];

  if (commercialTerms.some(term => keyword.includes(term))) {
    return "Commercial / conversion-friendly";
  }

  if (informationalTerms.some(term => keyword.includes(term))) {
    return "Informational";
  }

  return "Mixed / unclear intent";
}

export function capitalize(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}
