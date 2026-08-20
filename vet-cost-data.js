export const VET_COST_DATA_VERSION = "2026-08-20";

export const VET_COST_BASELINES = {
  checkup: {
    label: "Standard consultation",
    anchor: 100,
    spread: 0.25,
    scope: "Consultation only; diagnostics, medication and treatment are excluded.",
    sources: [
      { name: "Lort Smith weekday standard consultation", price: "$98", url: "https://lortsmith.com/vet-services/fees/" },
      { name: "Grange Vet Clinic standard consultation", price: "$90", url: "https://grangevetclinic.com.au/price-list/" },
      { name: "PetO Vet member consultation", price: "$69.99", url: "https://petovet.com.au/home/" }
    ]
  },
  vaccination: {
    label: "Vaccination visit",
    anchor: 135,
    spread: 0.25,
    scope: "Routine vaccination visit; vaccine type and clinic inclusions vary.",
    sources: [
      { name: "RSPCA Victoria standard cat and dog vaccination visits", price: "$143–$170", url: "https://rspcavic.org/vet-clinics/" },
      { name: "Lort Smith F3, C3 and C5 vaccinations", price: "$122–$142", url: "https://lortsmith.com/vet-services/fees/" },
      { name: "RSPCA Victoria community vaccination clinic", price: "$69", url: "https://rspcavic.org/petclinics/" }
    ]
  },
  dental: {
    label: "Routine dental scale and polish",
    anchor: 720,
    spread: 0.2,
    scope: "Routine clean under anaesthetic; extractions, advanced disease and additional diagnostics are excluded.",
    sources: [
      { name: "Rockdale Vets routine dental clean", price: "$720", url: "https://rockdalevets.com.au/vet-dentistry-hurstville/" },
      { name: "Lort Smith dental estimate consultation", price: "$98 consultation", url: "https://lortsmith.com/vet-services/fees/" }
    ]
  },
  emergency: {
    label: "Emergency consultation",
    anchor: 312,
    spread: 0.18,
    scope: "Initial emergency consultation only; tests, imaging, hospitalisation and treatment are excluded.",
    sources: [
      { name: "WA Veterinary Emergency and Specialty emergency consult", price: "$260–$280", url: "https://wavets.com.au/emergencies/" },
      { name: "AREC emergency consultation", price: "$365.20", url: "https://arecvet.com.au/fees/" }
    ]
  },
  microchip: {
    label: "Microchipping",
    anchor: 65,
    spread: 0.2,
    scope: "Microchip procedure only; registration, consultation or additional services may be charged separately.",
    sources: [
      { name: "Grange Vet Clinic microchip", price: "$65", url: "https://grangevetclinic.com.au/price-list/" },
      { name: "RSPCA Victoria low-cost cat desexing and microchipping program", price: "$99 combined program", url: "https://rspcavic.org/low-cost-cat-desexing-on-the-peninsula/" }
    ]
  },
  desexing: {
    label: "Desexing procedure",
    anchor: 400,
    spread: 0.42,
    scope: "Broad planning range only. Sex, weight, pregnancy, breed risk, pre-operative testing and clinic inclusions can materially change the final quote.",
    sources: [
      { name: "Lort Smith cat desexing", price: "$198–$297", url: "https://lortsmith.com/vet-services/fees/" },
      { name: "Lort Smith dog desexing", price: "$472–$690", url: "https://lortsmith.com/vet-services/fees/" }
    ]
  }
};

const VALID_OPTIONS = {
  petType: new Set(["dog", "cat"]),
  visitType: new Set(Object.keys(VET_COST_BASELINES)),
  location: new Set(["metro", "regional"]),
  state: new Set(["VIC", "NSW", "QLD", "WA", "SA", "TAS", "ACT", "NT"]),
  ageGroup: new Set(["young", "adult", "senior"])
};

const ADJUSTMENTS = {
  location: {
    metro: { multiplier: 1.08, label: "Model assumption: metro +8%" },
    regional: { multiplier: 0.96, label: "Model assumption: regional −4%" }
  },
  ageGroup: {
    young: { multiplier: 0.95, label: "Model assumption: young pet −5%" },
    adult: { multiplier: 1, label: "Adult baseline" },
    senior: { multiplier: 1.12, label: "Model assumption: senior pet +12%" }
  }
};

export function validateVetEstimateInput(input) {
  for (const [field, allowed] of Object.entries(VALID_OPTIONS)) {
    if (!allowed.has(input?.[field])) return field;
  }
  if (input?.postcode && !isPostcodeValidForState(input.postcode, input.state)) return "postcode";
  return null;
}

export function calculateVetEstimate(input) {
  const invalidField = validateVetEstimateInput(input);
  if (invalidField) throw new TypeError(`Invalid ${invalidField}`);

  const baseline = VET_COST_BASELINES[input.visitType];
  const inferredLocation = input.postcode ? inferAreaFromPostcode(input.postcode, input.state) : null;
  const resolvedLocation = inferredLocation || input.location;
  const factors = [ADJUSTMENTS.location[resolvedLocation], ADJUSTMENTS.ageGroup[input.ageGroup]];

  if (input.visitType === "dental" && input.petType === "dog") {
    factors.push({ multiplier: 1.07, label: "Model assumption: dog dental +7%" });
  }

  if (input.visitType === "desexing") {
    factors.push(input.petType === "cat"
      ? { multiplier: 0.65, label: "Published-price model: cat desexing −35%" }
      : { multiplier: 1.25, label: "Published-price model: dog desexing +25%" });
  }

  const multiplier = factors.reduce((total, factor) => total * factor.multiplier, 1);
  const midpoint = baseline.anchor * multiplier;
  const range = createRange(midpoint, baseline.spread);
  const alternateLocation = resolvedLocation === "metro" ? "regional" : "metro";
  const alternateMultiplier = multiplier / ADJUSTMENTS.location[resolvedLocation].multiplier * ADJUSTMENTS.location[alternateLocation].multiplier;
  const alternateRange = createRange(baseline.anchor * alternateMultiplier, baseline.spread);

  return {
    min: range.min,
    max: range.max,
    note: baseline.scope,
    baseRange: `${baseline.label}, anchored to published Australian provider prices`,
    adjustments: factors.map(factor => factor.label),
    methodology: "Published price anchor × transparent model adjustments ± category uncertainty range.",
    sources: baseline.sources,
    dataVersion: VET_COST_DATA_VERSION,
    state: input.state,
    postcode: input.postcode || null,
    resolvedLocation,
    areaComparison: {
      [resolvedLocation]: range,
      [alternateLocation]: alternateRange
    }
  };
}

export function inferAreaFromPostcode(postcode, state) {
  if (!isPostcodeValidForState(postcode, state)) return null;
  const value = Number(postcode);
  const metroRanges = {
    VIC: [[3000, 3207]], NSW: [[2000, 2234]], QLD: [[4000, 4207]],
    WA: [[6000, 6199]], SA: [[5000, 5199]], TAS: [[7000, 7053]],
    ACT: [[2600, 2618], [2900, 2920]], NT: [[800, 832]]
  };
  return metroRanges[state].some(([min, max]) => value >= min && value <= max)
    ? "metro"
    : "regional";
}

export function isPostcodeValidForState(postcode, state) {
  if (!/^\d{4}$/.test(String(postcode || ""))) return false;
  const value = Number(postcode);
  const stateRanges = {
    VIC: [[3000, 3999]], NSW: [[2000, 2599], [2620, 2899], [2921, 2999]],
    QLD: [[4000, 4999]], WA: [[6000, 6797]], SA: [[5000, 5799]],
    TAS: [[7000, 7799]], ACT: [[2600, 2619], [2900, 2920]], NT: [[800, 899]]
  };
  return Boolean(stateRanges[state]?.some(([min, max]) => value >= min && value <= max));
}

function createRange(midpoint, spread) {
  return {
    min: roundToNearestFive(midpoint * (1 - spread)),
    max: roundToNearestFive(midpoint * (1 + spread))
  };
}

function roundToNearestFive(value) {
  return Math.max(0, Math.round(value / 5) * 5);
}
