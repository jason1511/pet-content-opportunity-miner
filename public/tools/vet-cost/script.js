import { trackEvent } from "../../analytics-client.js";

const form = document.getElementById("estimatorForm");
const submitButton = document.getElementById("submitButton");
const result = document.getElementById("result");
const estimateText = document.getElementById("estimateText");
const estimateNote = document.getElementById("estimateNote");
const baseCostText = document.getElementById("baseCostText");
const adjustmentText = document.getElementById("adjustmentText");
const methodologyText = document.getElementById("methodologyText");
const dataVersion = document.getElementById("dataVersion");
const sourceList = document.getElementById("sourceList");
const postcodeInput = document.getElementById("postcode");
const locationInput = document.getElementById("location");
const stateInput = document.getElementById("state");
const locationResolutionText = document.getElementById("locationResolutionText");
const areaComparison = document.getElementById("areaComparison");
const nearbyClinicLink = document.getElementById("nearbyClinicLink");

applyResearchContext();
postcodeInput.addEventListener("input", suggestAreaFromPostcode);
stateInput.addEventListener("change", suggestAreaFromPostcode);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  submitButton.textContent = "Calculating...";
  result.classList.remove("hidden");
  estimateText.textContent = "Checking typical pricing...";
  estimateNote.textContent = "";
  baseCostText.textContent = "-";
  adjustmentText.textContent = "-";

  const payload = {
    petType: document.getElementById("petType").value,
    visitType: document.getElementById("visitType").value,
    location: document.getElementById("location").value,
    state: document.getElementById("state").value,
    ageGroup: document.getElementById("ageGroup").value,
    postcode: postcodeInput.value.trim()
  };

  try {
    const response = await fetch("/api/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const estimate = await response.json();
    if (!response.ok) throw new Error(estimate.error || "Request failed");

    estimateText.textContent = "$" + estimate.min + " – $" + estimate.max;
    estimateNote.textContent = estimate.note;
    baseCostText.textContent = estimate.baseRange;
    adjustmentText.textContent = estimate.adjustments.length
      ? estimate.adjustments.join(", ")
      : "No major adjustments";
    methodologyText.textContent = estimate.methodology;
    const reviewedDaysAgo = Math.max(0, Math.floor((Date.now() - new Date(estimate.dataVersion + "T00:00:00Z")) / 86400000));
    dataVersion.textContent = "Pricing data reviewed: " + estimate.dataVersion;
    dataVersion.textContent += reviewedDaysAgo <= 180
      ? ` (${reviewedDaysAgo} days ago — current review window)`
      : ` (${reviewedDaysAgo} days ago — review recommended)`;
    locationResolutionText.textContent = estimate.postcode
      ? `${estimate.postcode} classified as ${estimate.resolvedLocation}`
      : `Using selected ${estimate.resolvedLocation} area`;
    areaComparison.replaceChildren();
    for (const area of ["metro", "regional"]) {
      const range = estimate.areaComparison?.[area];
      if (!range) continue;
      const item = document.createElement("p");
      const label = document.createElement("strong");
      label.textContent = `${capitalize(area)}: `;
      item.append(label, `$${range.min}–$${range.max}`);
      areaComparison.append(item);
    }
    nearbyClinicLink.href = `https://www.google.com/maps/search/${encodeURIComponent(`vet clinic near ${payload.postcode}, ${payload.state}`)}`;
    sourceList.replaceChildren();

    for (const source of estimate.sources) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = source.name + " — " + source.price;
      item.append(link);
      sourceList.append(item);
    }
    trackEvent("estimate_completed", {
      petType: payload.petType,
      visitType: payload.visitType,
      state: payload.state,
      location: payload.location
    });
  } catch (error) {
    estimateText.textContent = "Estimate unavailable";
    estimateNote.textContent = error.message + ". Please try again.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Estimate cost";
  }
});

function applyResearchContext() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("source") !== "research") return;

  const keyword = params.get("keyword") || "pet vet cost";
  const petType = params.get("petType");
  const visitType = params.get("visitType");
  if (["dog", "cat"].includes(petType)) document.getElementById("petType").value = petType;
  if (["checkup", "vaccination", "dental", "emergency", "microchip", "desexing"].includes(visitType)) {
    document.getElementById("visitType").value = visitType;
  }

  const origin = document.getElementById("researchOrigin");
  const text = document.getElementById("researchOriginText");
  const link = document.getElementById("researchOriginLink");
  text.textContent = `This estimator is the worked product example connected to the “${keyword}” opportunity.`;
  link.href = `../../research.html?keyword=${encodeURIComponent(keyword)}`;
  origin.classList.remove("hidden");
}

function suggestAreaFromPostcode() {
  const postcode = postcodeInput.value.trim();
  const state = stateInput.value;
  if (!/^\d{4}$/.test(postcode) || !state) return;
  const value = Number(postcode);
  const metroRanges = {
    VIC: [[3000, 3207]], NSW: [[2000, 2234]], QLD: [[4000, 4207]],
    WA: [[6000, 6199]], SA: [[5000, 5199]], TAS: [[7000, 7053]],
    ACT: [[2600, 2618], [2900, 2920]], NT: [[800, 832]]
  };
  locationInput.value = metroRanges[state]?.some(([min, max]) => value >= min && value <= max)
    ? "metro"
    : "regional";
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
