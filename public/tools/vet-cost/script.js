const form = document.getElementById("estimatorForm");
const submitButton = document.getElementById("submitButton");
const result = document.getElementById("result");
const estimateText = document.getElementById("estimateText");
const estimateNote = document.getElementById("estimateNote");
const baseCostText = document.getElementById("baseCostText");
const adjustmentText = document.getElementById("adjustmentText");

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
    ageGroup: document.getElementById("ageGroup").value
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
  } catch (error) {
    estimateText.textContent = "Estimate unavailable";
    estimateNote.textContent = error.message + ". Please try again.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Estimate cost";
  }
});
