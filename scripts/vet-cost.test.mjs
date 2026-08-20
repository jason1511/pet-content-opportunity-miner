import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateVetEstimate,
  inferAreaFromPostcode,
  validateVetEstimateInput,
  VET_COST_BASELINES
} from "../vet-cost-data.js";

const baseInput = {
  petType: "cat",
  visitType: "checkup",
  location: "metro",
  state: "VIC",
  ageGroup: "adult"
};

test("every estimator category has published sources", () => {
  for (const baseline of Object.values(VET_COST_BASELINES)) {
    assert.ok(baseline.anchor > 0);
    assert.ok(baseline.sources.length >= 2);
    for (const source of baseline.sources) {
      assert.match(source.url, /^https:\/\//);
      assert.ok(source.price);
    }
  }
});

test("estimates are deterministic and ordered", () => {
  const first = calculateVetEstimate(baseInput);
  const second = calculateVetEstimate(baseInput);
  assert.deepEqual(first, second);
  assert.ok(first.min > 0);
  assert.ok(first.max >= first.min);
  assert.ok(first.sources.length >= 2);
});

test("model adjustments are transparent", () => {
  const result = calculateVetEstimate({
    ...baseInput,
    visitType: "dental",
    petType: "dog",
    ageGroup: "senior"
  });
  assert.ok(result.adjustments.some(item => item.includes("senior")));
  assert.ok(result.adjustments.some(item => item.includes("dog dental")));
  assert.match(result.methodology, /transparent model adjustments/i);
});

test("invalid input is rejected", () => {
  assert.equal(validateVetEstimateInput({ ...baseInput, state: "INVALID" }), "state");
  assert.throws(() => calculateVetEstimate({ ...baseInput, visitType: "surgery" }), /Invalid visitType/);
});

test("postcodes provide an area classification and comparison", () => {
  assert.equal(inferAreaFromPostcode("3000", "VIC"), "metro");
  assert.equal(inferAreaFromPostcode("3550", "VIC"), "regional");
  assert.equal(inferAreaFromPostcode("2000", "VIC"), null);

  const estimate = calculateVetEstimate({
    petType: "dog",
    visitType: "checkup",
    location: "regional",
    state: "VIC",
    ageGroup: "adult",
    postcode: "3000"
  });
  assert.equal(estimate.resolvedLocation, "metro");
  assert.ok(estimate.areaComparison.metro.min > estimate.areaComparison.regional.min);
});

test("new estimator categories remain source-backed", () => {
  assert.ok(VET_COST_BASELINES.microchip.sources.length > 0);
  assert.ok(VET_COST_BASELINES.desexing.sources.length > 0);
});
