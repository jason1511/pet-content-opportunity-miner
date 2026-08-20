import test from "node:test";
import assert from "node:assert/strict";
import { calculateSignalMetrics } from "../public/shared.js";

test("research signal metrics are bounded and transparent", () => {
  const result = calculateSignalMetrics({
    keyword: "dog dental cleaning cost",
    autocompleteSuggestions: [
      "dog dental cleaning cost melbourne",
      "dog dental cleaning price",
      "best dog dental clinic near me",
      "compare dog dental treatment"
    ],
    userQuestionSeeds: Array.from({ length: 6 }, (_, index) => `question ${index}`),
    usedLiveAutocomplete: true
  });

  for (const field of ["commercialIntent", "intentClarity", "landingPageFit", "contentDepth"]) {
    assert.ok(result[field] >= 1 && result[field] <= 10);
  }
  assert.equal(result.demandProxy, "Moderate");
  assert.match(result.caveat, /not search-volume/i);
});

test("fallback autocomplete is not presented as verified demand", () => {
  const result = calculateSignalMetrics({
    keyword: "cute cats",
    autocompleteSuggestions: ["cute cats cost", "best cute cats"],
    userQuestionSeeds: [],
    usedLiveAutocomplete: false
  });
  assert.equal(result.demandProxy, "Limited / unverified");
});
