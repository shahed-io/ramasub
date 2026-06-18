#!/usr/bin/env node
/**
 * Lightweight a11y scan using jsdom + axe-core.
 * Use this when Playwright/Chromium isn't available (e.g. in CI sandboxes).
 * For full SPA-rendered scans, use scripts/a11y-scan.mjs (Playwright).
 *
 * Usage: node scripts/a11y-scan-static.mjs [baseUrl]
 */
import jsdomPkg from "jsdom";
import axe from "axe-core";
const { JSDOM } = jsdomPkg;
import { writeFileSync } from "node:fs";

const baseUrl = (process.argv[2] || process.env.BASE_URL || "https://accessnowbd.lovable.app").replace(/\/$/, "");
const routes = (process.env.ROUTES || "/,/auth,/developer,/dashboard,/admin").split(",");

const results = [];
for (const route of routes) {
  const url = baseUrl + route;
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 a11y-scan" } });
    const html = await res.text();
    const dom = new JSDOM(html, { url, runScripts: "outside-only", pretendToBeVisual: true });
    // Inject axe
    dom.window.eval(axe.source);
    const r = await dom.window.axe.run(dom.window.document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    results.push({ route, url, status: res.status, violations: r.violations, passes: r.passes.length, incomplete: r.incomplete.length });
    console.log(`[${route}] ${res.status} — ${r.violations.length} violations`);
    dom.window.close();
  } catch (e) {
    results.push({ route, url, error: String(e?.message || e) });
    console.error(`[${route}] ERROR ${e.message}`);
  }
}

writeFileSync("a11y-report.json", JSON.stringify(results, null, 2));

const sevOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
let total = 0;
let md = `# Accessibility Scan Report (static SSR scan)\n\n- Base: ${baseUrl}\n- Date: ${new Date().toISOString()}\n- Note: scans server-rendered HTML only. Run \`scripts/a11y-scan.mjs\` locally for full SPA coverage.\n\n`;
for (const r of results) {
  md += `## ${r.route}\n`;
  if (r.error) { md += `Error: ${r.error}\n\n`; continue; }
  md += `- HTTP ${r.status} | Violations: **${r.violations.length}** | Passes: ${r.passes} | Incomplete: ${r.incomplete}\n\n`;
  total += r.violations.length;
  const sorted = [...r.violations].sort((a,b)=>(sevOrder[a.impact]??9)-(sevOrder[b.impact]??9));
  for (const v of sorted) {
    md += `- [${v.impact}] **${v.id}** — ${v.help} (${v.nodes.length} node${v.nodes.length>1?"s":""})\n`;
    const sample = v.nodes[0]?.target?.join(" ") || "";
    if (sample) md += `  selector: \`${sample}\`\n`;
    md += `  ${v.helpUrl}\n`;
  }
  md += "\n";
}
md = `> Total violations across ${results.length} routes: **${total}**\n\n` + md;
writeFileSync("a11y-report.md", md);
console.log(`\nTotal violations: ${total}`);
console.log(`Saved: a11y-report.json, a11y-report.md`);
