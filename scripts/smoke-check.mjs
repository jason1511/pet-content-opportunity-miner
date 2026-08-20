import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(root, "public");
const pages = [
  "index.html",
  "research.html",
  "batch.html",
  "tools/vet-cost/index.html",
  "analytics.html",
  "share.html"
];
const requiredFiles = [
  ...pages,
  "home.css",
  "platform.css",
  "platform-nav.js",
  "base.css",
  "single.css",
  "single.js",
  "batch.css",
  "batch.js",
  "shared.js",
  "api-security.js",
  "service-status.js",
  "history-store.js",
  "tools/vet-cost/style.css",
  "tools/vet-cost/script.js",
  "analytics-client.js",
  "analytics-dashboard.js",
  "analytics.css",
  "share.js",
  "share.css"
];
const forbiddenFiles = [
  "app.js",
  "style.css",
  ".wrangler"
];

const failures = [];

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

for (const file of requiredFiles) {
  if (!(await exists(path.join(publicRoot, file)))) {
    failures.push(`Missing required file: public/${file}`);
  }
}

for (const file of forbiddenFiles) {
  if (await exists(path.join(publicRoot, file))) {
    failures.push(`Legacy/generated path should not exist: public/${file}`);
  }
}

if (await exists(path.join(root, ".wrangler"))) {
  failures.push("Generated .wrangler directory should not be committed");
}

if (await exists(path.join(root, "server.js"))) {
  failures.push("Legacy Express server.js should not exist");
}

for (const page of pages) {
  const absolutePage = path.join(publicRoot, page);
  const html = await readFile(absolutePage, "utf8");
  const attributePattern = /(?:href|src)=["']([^"'#]+)["']/g;

  for (const match of html.matchAll(attributePattern)) {
    const reference = match[1];

    if (
      reference.startsWith("http://") ||
      reference.startsWith("https://") ||
      reference.startsWith("mailto:") ||
      reference.startsWith("data:")
    ) {
      continue;
    }

    const withoutQuery = reference.split("?")[0];
    if (!withoutQuery || withoutQuery.startsWith("/api/")) continue;

    let resolved;
    if (withoutQuery.startsWith("/")) {
      resolved = path.join(publicRoot, withoutQuery);
    } else {
      resolved = path.resolve(path.dirname(absolutePage), withoutQuery);
    }

    if (withoutQuery.endsWith("/")) {
      resolved = path.join(resolved, "index.html");
    }

    if (!(await exists(resolved))) {
      failures.push(`Broken local reference in public/${page}: ${reference}`);
    }
  }
}

for (const page of pages) {
  const html = await readFile(path.join(publicRoot, page), "utf8");
  if (!html.includes("<platform-nav")) failures.push(`Shared navigation missing from public/${page}`);
}

const worker = await readFile(path.join(root, "worker.js"), "utf8");
const pricingData = await readFile(path.join(root, "vet-cost-data.js"), "utf8");
if (!worker.includes('from "./vet-cost-data.js"')) {
  failures.push("Worker is not using the deterministic vet-cost data module");
}
if (!pricingData.includes("VET_COST_BASELINES")) {
  failures.push("Vet-cost baseline data is missing");
}
for (const route of ["/api/config", "/api/status", "/api/autocomplete", "/api/questions", "/api/mine", "/api/estimate", "/api/events", "/api/analytics", "/api/share"]) {
  if (!worker.includes(route)) failures.push(`Worker route missing: ${route}`);
}

const research = await readFile(path.join(publicRoot, "research.html"), "utf8");
if (!research.includes('type="module" src="single.js"')) {
  failures.push("Research page is not wired to single.js");
}

const platformNavigation = await readFile(path.join(publicRoot, "platform-nav.js"), "utf8");
if (!platformNavigation.includes('aria-expanded="false"') || !platformNavigation.includes('aria-current="page"')) {
  failures.push("Shared navigation is missing mobile or active-page semantics");
}
if (!research.includes("dog%20dental%20cleaning%20cost")) {
  failures.push("Research page is missing the connected vet-cost example");
}

const batchScript = await readFile(path.join(publicRoot, "batch.js"), "utf8");
if (!batchScript.includes("research.html?keyword=")) {
  failures.push("Batch details do not deep-link to the research workflow");
}

if (failures.length) {
  console.error("Smoke checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Smoke checks passed: ${requiredFiles.length} files, ${pages.length} pages, 9 Worker routes.`);
