export const VET_COST_DATA_VERSION = "2026-08-15";

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
  return null;
}

export function calculateVetEstimate(input) {
  const invalidField = validateVetEstimateInput(input);
  if (invalidField) throw new TypeError(`Invalid ${invalidField}`);

  const baseline = VET_COST_BASELINES[input.visitType];
  const factors = [ADJUSTMENTS.location[input.location], ADJUSTMENTS.ageGroup[input.ageGroup]];

  if (input.visitType === "dental" && input.petType === "dog") {
    factors.push({ multiplier: 1.07, label: "Model assumption: dog dental +7%" });
  }

  const multiplier = factors.reduce((total, factor) => total * factor.multiplier, 1);
  const midpoint = baseline.anchor * multiplier;
  const min = roundToNearestFive(midpoint * (1 - baseline.spread));
  const max = roundToNearestFive(midpoint * (1 + baseline.spread));

  return {
    min,
    max,
    note: baseline.scope,
    baseRange: `${baseline.label}, anchored to published Australian provider prices`,
    adjustments: factors.map(factor => factor.label),
    methodology: "Published price anchor × transparent model adjustments ± category uncertainty range.",
    sources: baseline.sources,
    dataVersion: VET_COST_DATA_VERSION,
    state: input.state
  };
}

function roundToNearestFive(value) {
  return Math.max(0, Math.round(value / 5) * 5);
}
