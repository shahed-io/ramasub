#!/usr/bin/env node
/**
 * Accessibility scan using Playwright + axe-core.
 * Usage: node scripts/a11y-scan.mjs [baseUrl]
 * Default baseUrl: env BASE_URL or https://accessnowbd.lovable.app
 */
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const baseUrl = (process.argv[2] || process.env.BASE_URL || "https://accessnowbd.lovable.app").replace(/\/$/, "");
const routes = (process.env.ROUTES || "/,/auth,/developer,/dashboard,/admin").split(",");

const reportPath = "a11y-report.json";
const summaryPath = "a11y-report.md";

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const results = [];
for (const route of routes) {
  const url = baseUrl + route;
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    results.push({ route, url, violations: r.violations, passes: r.passes.length, incomplete: r.incomplete.length });
    console.log(`[${route}] ${r.violations.length} violations, ${r.passes.length} passes`);
  } catch (e) {
    results.push({ route, url, error: String(e) });
    console.error(`[${route}] ERROR ${e.message}`);
  }
}
await browser.close();

mkdirSync(dirname(reportPath) || ".", { recursive: true });
writeFileSync(reportPath, JSON.stringify(results, null, 2));

// Markdown summary
const sevOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
let md = `# Accessibility Scan Report\n\n- Base: ${baseUrl}\n- Date: ${new Date().toISOString()}\n\n`;
let total = 0;
for (const r of results) {
  md += `## ${r.route}\n`;
  if (r.error) { md += `Error: ${r.error}\n\n`; continue; }
  md += `- Violations: **${r.violations.length}** | Passes: ${r.passes} | Incomplete: ${r.incomplete}\n\n`;
  total += r.violations.length;
  const sorted = [...r.violations].sort((a,b)=>(sevOrder[a.impact]??9)-(sevOrder[b.impact]??9));
  for (const v of sorted) {
    md += `- [${v.impact}] **${v.id}** — ${v.help} (${v.nodes.length} node${v.nodes.length>1?"s":""})\n  ${v.helpUrl}\n`;
  }
  md += "\n";
}
md = `> Total violations across ${results.length} routes: **${total}**\n\n` + md;
writeFileSync(summaryPath, md);

console.log(`\nSaved: ${reportPath}, ${summaryPath}`);
console.log(`Total violations: ${total}`);
process.exit(0);
