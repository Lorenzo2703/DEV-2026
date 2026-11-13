# CLAUDE.md — "Dev in 2026"

A blog-style handbook website that teaches how to build, ship and operate software in 2026: languages and runtimes, frameworks and libraries, databases, analytics, observability, security, CI/CD and deployment, including frontier tooling. Every tool gets a page that explains how to implement it correctly, not just what it is.

- Audience: working developers, junior to senior. Tone: precise, practical, opinionated where the evidence supports it, no hype.
- Language: all site content, code comments, commit messages and docs are in English.
- What to cover: `docs/tool-registry.md` is the backlog and implementation seed for every tool, guide and blueprint. Read it before writing or editing any tool page, guide or radar entry. Do not load it for unrelated work.

---

## 1. Non-negotiable rules

1. **Verify before you write.** Versions, flags, APIs and defaults change fast. Before writing about a tool, fetch its official docs and changelog, confirm the latest stable version, and record it in frontmatter (`toolVersion`, `verifiedAt`). If you cannot verify something, set `needsVerification: true` and tell the reviewer. Never fill gaps from memory.
2. **Never invent.** No made-up URLs, version numbers, CLI flags, config keys or API names. Link only to pages you actually opened. The registry lists docs hosts as starting points; resolve deep links by search.
3. **Every code sample runs.** Samples live in `snippets/<tool-slug>/` and are type-checked or executed in CI. Pages import them; samples are never pasted untested.
4. **Original explanations.** Do not copy official documentation. Explain in your own words, quote at most a short phrase, and link to the source. Code samples are original and MIT-licensed.
5. **Label maturity honestly.** Each tool is `frontier`, `stable`, `legacy` or `deprecated`, and sits on the radar as `adopt`, `trial`, `assess` or `hold`. Default recommendations go to stable tools; frontier tools come with explicit risks and an exit path.
6. **Security by default.** Any page touching auth, data, secrets, networking or deployment has a security section. Samples never contain real secrets; use placeholders and `.env.example`.
7. **Accessible and fast.** Target WCAG 2.2 AA, 0 axe violations, LCP < 2.0 s, CLS < 0.05, INP < 200 ms, and ≤ 30 KB gzipped JS on content pages. Performance targets are not enforced by Lighthouse CI.

---

## 2. Decisions already made

| Concern            | Choice                                          | Notes                                                                                                                                                        |
| ------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework          | Astro, static output                            | Content collections, MDX, islands. Add an adapter only if a route truly needs SSR.                                                                           |
| Language           | TypeScript, strict                              | `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`.                                                                                                |
| Styling            | Tailwind CSS v4                                 | CSS-first config (`@theme`), Vite plugin.                                                                                                                    |
| Content            | MDX in typed collections                        | Validated by Zod schemas at build time.                                                                                                                      |
| Search             | Pagefind                                        | Index built after `astro build`, fully static.                                                                                                               |
| Code blocks        | Shiki or Expressive Code                        | Copy button, line highlights, package-manager tabs.                                                                                                          |
| Package manager    | Bun                                             | Version pinned with mise (`mise.toml`); commit `bun.lock` and use `bun ci` for frozen CI installs. See [ADR-0002](docs/adr/ADR-0002-bun-package-manager.md). |
| Lint / format      | Biome                                           | `biome ci` in CI.                                                                                                                                            |
| Unit tests         | Vitest                                          | For scripts and utilities.                                                                                                                                   |
| E2E + a11y         | Playwright + axe-core                           | Run against the built site.                                                                                                                                  |
| Performance        | Guidance and JavaScript budget                  | Targets from rule 7; Lighthouse checks are disabled.                                                                                                         |
| Link check         | lychee                                          | Changed pages on PR, everything weekly.                                                                                                                      |
| Analytics          | Plausible or Umami (cookieless)                 | Final pick recorded in ADR-0001. No consent banner unless non-essential cookies are added.                                                                   |
| Hosting            | Cloudflare (Workers static assets via Wrangler) | Verify whether Pages or Workers is the recommended path today. Vercel is the fallback.                                                                       |
| CI/CD              | GitHub Actions                                  | See §10.                                                                                                                                                     |
| Dependency updates | Renovate                                        | Grouped minor/patch, release-age cooldown.                                                                                                                   |

Change a decision only by writing an ADR in `docs/adr/` that cites a verified fact (deprecation, breaking change, licence or pricing change). Do not swap tools silently.

---

## 3. Repository layout

```
.
├── CLAUDE.md
├── docs/
│   ├── tool-registry.md          # backlog + implementation seeds
│   └── adr/                      # architecture decision records
├── src/
│   ├── content.config.ts         # collection schemas (§5)
│   ├── content/
│   │   ├── tools/<category>/<slug>.mdx
│   │   ├── guides/<slug>.mdx      # includes dated posts
│   │   ├── blueprints/<slug>.mdx
│   │   ├── radar/<slug>.mdx
│   ├── components/               # ToolCard, MaturityBadge, VerifiedStamp, CodeTabs, Callout, Checklist
│   ├── layouts/
│   ├── pages/
│   └── styles/
├── snippets/<tool-slug>/         # runnable samples imported by pages
├── scripts/                      # verify-content.ts, stale-report.ts, run-snippets.ts
├── e2e/
├── .github/workflows/
├── mise.toml
├── biome.json
└── wrangler.jsonc
```

---

## 4. Scripts to create (milestone M0)

| Command                  | Purpose                                                                      |
| ------------------------ | ---------------------------------------------------------------------------- |
| `bun run dev`            | Astro dev server                                                             |
| `bun run build`          | Static build, then Pagefind index                                            |
| `bun run check`          | `astro check` + `tsc --noEmit` + `biome ci`                                  |
| `bun run test`           | Vitest                                                                       |
| `bun run test:e2e`       | Playwright, including axe checks                                             |
| `bun run snippets`       | Type-check and run everything in `snippets/`                                 |
| `bun run verify:content` | Frontmatter schema, required headings, snippet references, stale-page report |
| `bun run links`          | lychee link check                                                            |

---

## 5. Content model

Collections: `tools`, `guides` (including dated posts), `blueprints` (starter stacks), and `radar`. Add `publishedAt` to a guide to publish and sort it as a dated post; legacy `/posts/` URLs redirect to `/guides/`.

```ts
// src/content.config.ts
// Verify import paths against the installed Astro version before using.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const category = z.enum([
  'languages-runtimes',
  'package-management',
  'frontend',
  'styling-ui',
  'build-quality',
  'testing',
  'backend-apis',
  'auth',
  'data',
  'ai-dev',
  'analytics',
  'observability',
  'ci-cd',
  'security',
  'deployment',
  'iac-platform',
]);

const tools = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/tools' }),
  schema: z.object({
    title: z.string(),
    summary: z.string().max(200),
    category,
    maturity: z.enum(['frontier', 'stable', 'legacy', 'deprecated']),
    radar: z.enum(['adopt', 'trial', 'assess', 'hold']),
    toolVersion: z.string(), // latest stable at verification time
    verifiedAt: z.coerce.date(),
    needsVerification: z.boolean().default(false),
    officialDocs: z.url(),
    repo: z.url().optional(),
    license: z.string(),
    pricing: z.enum(['free', 'free-tier', 'paid', 'mixed']),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    alternatives: z.array(z.string()).default([]), // tool slugs
    related: z.array(z.string()).default([]), // tool or guide slugs
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { tools /* , guides, blueprints, radar, posts */ };
```

Staleness policy: a page is **stale** when `verifiedAt` is older than 90 days (45 days for `frontier`). Stale pages show a visible "needs review" badge and appear in the weekly stale report.

---

## 6. Tool page template

Every tool page uses these sections, in this order. `verify:content` fails the build if one is missing.

1. **What it is, when to use it, when not to** — three short paragraphs max.
2. **Prerequisites and versions** — runtime, OS, accounts, the verified `toolVersion`.
3. **Install and minimal setup** — copy-paste, works in under five minutes.
4. **Correct implementation** — the production-grade setup: config, project structure, environment variables, typing, error handling. This is the core of the page; build it from the registry's _Implement_ notes plus the current official docs.
5. **Integrate with the rest of the stack** — links to related tool pages and the blueprints that use it.
6. **Test it** — how to verify the setup works, with a runnable test from `snippets/`.
7. **Security and performance** — threat points, limits, cost traps.
8. **Common mistakes** — from the registry's _Avoid_ notes, expanded with the reason each one hurts.
9. **Observability** — how you know it is working in production (logs, metrics, traces, alerts).
10. **Upgrade and migration notes** — breaking changes, deprecation timeline, exit path if `frontier`.
11. **Alternatives** — honest comparison and when to pick each.
12. **Sources** — official docs and changelog links with the date you accessed them.

---

## 7. Workflow for adding or updating a tool page

1. Find the entry in `docs/tool-registry.md`. Create `src/content/tools/<category>/<slug>.mdx` from the template.
2. Fetch the official docs and changelog. Record `toolVersion`, `license`, `pricing`, `officialDocs`.
3. Write the runnable sample in `snippets/<slug>/`. Run `bun run snippets`.
4. Fill the template sections in your own words. Link out instead of copying.
5. Set `maturity` and `radar`; justify non-obvious choices in a callout.
6. Set `verifiedAt` to today. Run `bun run check && bun run verify:content && bun run test`.
7. Update the registry entry if reality differed from the seed. The docs win over the seed.
8. Commit with a conventional message (`docs(tools): add drizzle page`) and open a PR using the checklist in §8.

---

## 8. Definition of done (PR checklist)

- [ ] Official docs and changelog were read; version and date recorded
- [ ] No unverifiable claim left unflagged (`needsVerification` set if any)
- [ ] All samples live in `snippets/` and pass in CI
- [ ] Security section present where relevant, no secrets in samples
- [ ] Internal links resolve; related tools and alternatives exist as pages or backlog entries
- [ ] `bun run check`, `bun run test`, `bun run verify:content`, `bun run build` pass
- [ ] Playwright axe checks report 0 violations on the new page
- [ ] Registry entry updated

---

## 9. Site features

- Home with a scope-aware interactive stack builder that highlights selected technology paths, featured blueprints, and the radar; tool index with filters (category, maturity, radar, pricing, difficulty); tag pages; per-category RSS; full-site RSS; sitemap with `lastmod` from `verifiedAt`.
- Page chrome: table of contents, reading time, "last verified" stamp, maturity badge, previous/next in category, copy buttons, package-manager tabs (pnpm, npm, bun, yarn), dark mode via `prefers-color-scheme` with manual override.
- Search with Pagefind, filterable by category.
- SEO: canonical URLs, Open Graph images generated at build time, JSON-LD (`TechArticle`), no duplicate content.
- Radar page (adopt / trial / assess / hold) generated from frontmatter.
- Print stylesheet for guides. Custom 404.

---

## 10. CI/CD for this site

**Pull requests** (`permissions: contents: read` by default): `bun ci` → `bun run check` → `bun run test` → `bun run snippets` → `bun run build` → Playwright + axe against the build → lychee on changed pages.

**Main branch**: same checks, then deploy to Cloudflare with Wrangler in the `production` environment using a scoped API token stored as an environment secret.

**Scheduled (weekly)**: `stale-report` compares each page's `toolVersion` with the latest release (npm, PyPI, GitHub releases) and checks `verifiedAt` age, then opens or updates one issue listing pages to review. A full-site link check runs in the same schedule.

**Hardening**: pin every third-party Action to a full commit SHA; grant per-job least-privilege `permissions`; use `concurrency` to cancel superseded runs; never use `pull_request_target` with untrusted code; lint workflows with actionlint and zizmor; Renovate groups minor/patch updates, applies a release-age cooldown, and auto-merges only patch updates with green CI.

---

## 11. Working agreement for Claude

1. Plan before coding for any change touching more than three files: list the files and the approach, then implement.
2. Small, focused commits using Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).
3. Do not say "done" until `bun run check && bun run test && bun run build` pass; content changes also need `bun run verify:content`.
4. Never edit a test just to make it pass. Fix the cause or ask.
5. Add a dependency only with a stated reason (maintenance, size, licence). Prefer platform features and existing dependencies.
6. No secrets in the repo, logs or prompts. Use `.env.example` and CI secrets.
7. When unsure how a tool behaves today, search the official docs. Do not guess. If you cannot verify, flag it.
8. Prefer editing existing files over creating near-duplicates. Keep the registry and the pages in sync.
9. Record non-obvious choices as ADRs in `docs/adr/`.

---

## 12. Milestones

- **M0 Scaffold**: Astro + TS strict + Tailwind v4 + Biome + mise + scripts from §4 + CI skeleton + deploy of an empty site.
- **M1 Content system**: collections and schemas, page templates, components, `verify:content`, `snippets` runner, stale report.
- **M2 Flagship pages**: 10 tool pages (suggested: TypeScript, Bun, Astro, Tailwind v4, Vitest, Playwright, PostgreSQL, GitHub Actions, OpenTelemetry, Cloudflare) written end to end as the quality bar.
- **M3 Registry burn-down**: work through `docs/tool-registry.md` category by category.
- **M4 Radar, blueprints, guides**: cross-cutting content listed at the end of the registry.
- **M5 Launch**: analytics, RSS, sitemap, OG images, performance and accessibility audit, announcement.
