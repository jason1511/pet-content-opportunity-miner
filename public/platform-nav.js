import { createThemeControl } from "./theme.js";

class PlatformNav extends HTMLElement {
  connectedCallback() {
    const root = this.getAttribute("root") || "./";
    const current = this.getAttribute("current") || "";
    const links = [
      ["research", "Opportunity Miner", `${root}research.html`],
      ["batch", "Batch Analysis", `${root}batch.html`],
      ["estimator", "Vet Cost Estimator", `${root}tools/vet-cost/`]
    ];

    const menuId = `platform-menu-${crypto.randomUUID()}`;
    this.innerHTML = `
      <header class="platform-header">
        <a class="platform-brand" href="${root}" aria-label="Pet Growth Platform home" ${current === "home" ? 'aria-current="page"' : ""}>
          <span class="platform-brand-mark" aria-hidden="true">P</span>
          <span>Pet Growth Platform</span>
        </a>
        <button class="platform-menu-button" type="button" aria-expanded="false" aria-controls="${menuId}">
          <span class="visually-hidden">Toggle navigation</span>
          <span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>
        </button>
        <div id="${menuId}" class="platform-menu-panel">
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
        </div>
      </header>
    `;

    const button = this.querySelector(".platform-menu-button");
    const panel = this.querySelector(".platform-menu-panel");
    createThemeControl(this.querySelector(".platform-theme-slot"));
    const closeMenu = () => {
      this.removeAttribute("data-menu-open");
      button.setAttribute("aria-expanded", "false");
    };
    button.addEventListener("click", () => {
      const open = this.toggleAttribute("data-menu-open");
      button.setAttribute("aria-expanded", String(open));
    });
    panel.addEventListener("click", event => {
      if (event.target.closest("a")) closeMenu();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && this.hasAttribute("data-menu-open")) {
        closeMenu();
        button.focus();
      }
    });
    window.matchMedia("(min-width: 901px)").addEventListener("change", event => {
      if (event.matches) closeMenu();
    });
  }
}

customElements.define("platform-nav", PlatformNav);
