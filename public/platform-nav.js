class PlatformNav extends HTMLElement {
  connectedCallback() {
    const root = this.getAttribute("root") || "./";
    const current = this.getAttribute("current") || "";
    const links = [
      ["research", "Opportunity Miner", `${root}research.html`],
      ["batch", "Batch Analysis", `${root}batch.html`],
      ["estimator", "Vet Cost Estimator", `${root}tools/vet-cost/`]
    ];

    this.innerHTML = `
      <header class="platform-header">
        <a class="platform-brand" href="${root}" aria-label="Pet Growth Platform home">
          <span class="platform-brand-mark" aria-hidden="true">P</span>
          <span>Pet Growth Platform</span>
        </a>
        <nav class="platform-nav-links" aria-label="Primary navigation">
          ${links.map(([id, label, href]) => `
            <a href="${href}" ${current === id ? 'aria-current="page"' : ""}>${label}</a>
          `).join("")}
        </nav>
        <div class="platform-nav-actions">
          <a class="platform-admin-link" href="${root}analytics.html" ${current === "analytics" ? 'aria-current="page"' : ""}>Admin Analytics</a>
          <a class="platform-github-link" href="https://github.com/jason1511/pet-content-opportunity-miner" target="_blank" rel="noreferrer">GitHub</a>
          <span class="platform-theme-slot"></span>
        </div>
      </header>
    `;
  }
}

customElements.define("platform-nav", PlatformNav);
