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
    const response = await fetch("/api/questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        keyword: normalized,
        suggestions: autocompleteSuggestions
      })
    });

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

  return {
    keyword: normalized,
    keywordType,
    autocompleteSuggestions,
    userQuestionSeeds,
    contentAngles,
    sourceMeta: {
      autocompleteSource: liveAutocomplete.length > 0 ? "Live suggestions" : "Fallback suggestions",
      questionSource: relatedQuestions.length > 0 ? "AI-mined from research signals" : "Fallback questions"
    }
  };
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