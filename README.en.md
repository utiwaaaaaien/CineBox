<p align="center"><img src="public/brand/cinebox-logo-v2-128.png" width="96" height="96" alt="CineBox" /></p>

# CineBox V6.6

**A camera equipment and production planning workspace.**

CineBox helps camera teams define shooting requirements, reuse past project configurations, select equipment, and export kit lists. Project dates, shooting specifications, and equipment choices stay together for review during preparation.

[Live site](https://utiwaaaaaien.github.io/CineBox/) · [简体中文](README.md) · [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · [MIT License](LICENSE)

![Version V6.6](https://img.shields.io/badge/version-V6.6-176b5b) ![License MIT](https://img.shields.io/badge/license-MIT-blue)

V6.6 unifies catalog browsing and project selection, streamlines equipment checks to 11 rules, and aligns kit fields across item types. See the [release notes](docs/releases/v6.6.0.md).

## Get started

1. Create a project and enter its schedule and shooting specifications, or reuse a configuration from the historical projects.
2. Search the catalog or filter by brand and series. Add custom equipment as needed.
3. Open the kit list, review quantities, notes, and supporting equipment, then confirm and export. Choose a JSON backup to transfer a complete project.

## Features

- **Project planning:** record dates, shooting days, camera count, resolution, aspect ratio, and frame rates, including custom values.
- **Project reuse:** preview and reuse included real project configurations, or import Excel and text PDFs to create historical project cards after reviewing the parsed list.
- **Equipment selection:** browse categories, brands, and series; search Chinese names, English models, and aliases; view documented technical specifications on equipment cards.
- **Kit editing:** adjust quantities and notes, add equipment outside the catalog, review and complete supporting items, and undo or redo edits.
- **Export and backup:** export kit lists as PDF, DOCX, PNG, or XLSX. Export a single project as a JSON backup from its kit list, or back up all projects and custom historical data from project management.
- **Responsive interface:** desktop and mobile layouts with light and dark themes.

The application currently has a **Chinese interface**. This English README does not imply that a complete English UI is available.

## What's new in V6

V6 reorganizes historical project cards and their actions. Equipment cards use consistent brand, series, model, and confirmed industry names, followed by up to three representative technical specifications. The current project area, sidebar, mobile navigation clearance, dialog focus, and CineBox branding also received updates.

Entries identified at the series level may display series reference specifications, with their scope in hover descriptions. Unconfirmed values remain blank. See the [V6 implementation record](docs/V6-implementation.md) and [UI review](docs/V6-ui-review.md), both in Chinese.

## Storage and public data

**User-created projects and imported or edited historical projects are saved in the current browser's `localStorage`.** Cloud database bindings are disabled. There is no automatic account or cross-device synchronization, and using the app does not automatically commit project content to GitHub.

Browser storage is isolated by origin: changing the protocol, domain, or port makes the previous origin's data inaccessible to the new site. Changing browsers or devices, clearing site data, or using a temporary browsing session can also make saved projects unavailable. Export a **JSON project backup** before migrating or clearing data, then import it in the new environment. Excel exports are intended for kit handoff and do not replace a full project backup.

This public repository includes the equipment catalog and curated **real historical project data**, which visitors can inspect and download. Original Excel/PDF files and local source-material directories are not included. Check issues, pull requests, and sample backups for contact details and unpublished project information before sharing them.

Import files are parsed in the browser. PDF import requires extractable text; scanned or image-only PDFs need OCR in another tool first. Review matched equipment, quantities, and notes after importing.

## Catalog scope

The V6.3 catalog offers **2,306 selectable equipment entries**. The canonical catalog retains **2,321 equipment identity records** for old project recovery and ID compatibility. These counts serve different purposes.

The release records 4,572 card specifications. There are 1,346 entries with three specifications and **804 entries with fewer than three confirmed specifications**. A total of 240 entries use series references with an explicit scope; this count overlaps with the completeness counts. Unconfirmed specifications remain blank in the UI. Sources and gap explanations are retained in `data/catalog/card-specs-v6-*.json` and the audit files.

The catalog combines manufacturer documentation, documented inventory configurations, and generic items with an identifiable purpose. Publication status and manufacturer verification status are tracked separately. It does not provide live stock, pricing, or rental availability. Series references do not establish the capabilities of an unspecified model or generation. Confirm the exact configuration, recording mode, and supplier availability before a shoot.

For the maintenance approach, see the [V6.3 catalog review](docs/V6.3-catalog-review.md), [catalog naming policy](docs/catalog-naming-policy.md), [V5.1 review](docs/V5.1-catalog-review.md), and [V6 coverage record](docs/V6-implementation.md), in Chinese.

## Run locally

Use Node.js **22.13 or later**; Node.js 24 is recommended. The package manager is **pnpm 11.9.0**. Make that pnpm version available before installing dependencies. If you use Corepack, enable it according to your Node.js installation; changing the global environment is not a project requirement.

```bash
git clone https://github.com/utiwaaaaaien/CineBox.git
cd CineBox
pnpm install --frozen-lockfile
pnpm dev
```

Open the local address printed in the terminal. To build and preview production output:

```bash
pnpm build
pnpm start
```

## Checks and catalog maintenance

| Command | Purpose |
| --- | --- |
| `pnpm test` | Build the app, then run automated tests in `tests/` |
| `pnpm lint` | Run ESLint |
| `pnpm run catalog:check` | Check generated canonical data against its maintained inputs |
| `pnpm run catalog:cards:check` | Check V6 specification output and research status, allowing documented gaps |
| `pnpm run catalog:cards:complete` | Require three specifications for every selectable entry; currently reports 804 gaps |
| `pnpm run catalog:build` | Regenerate canonical catalog and audit records after editing maintained inputs |

Do not edit generated catalog files directly. Equipment identity changes must preserve old ID mappings and verify project restoration, quantities, notes, and export. See [AGENTS.md](AGENTS.md) for repository-specific rules.

## Stack and deployment

The app uses TypeScript, React 19, Next.js 16 application APIs, [vinext](https://github.com/cloudflare/vinext), Vite 8, and Tailwind CSS 4, with a Cloudflare Workers entry point and build configuration. SheetJS handles Excel import, `write-excel-file` handles Excel export, and PDF.js extracts PDF text.

The public site is built and published automatically by GitHub Actions to [GitHub Pages](https://utiwaaaaaien.github.io/CineBox/). `pnpm run build:pages` produces static files in `dist/client/` and verifies project paths, assets, the PDF worker, and analytics configuration. The default base path is `/CineBox/`; a custom domain can use an empty `NEXT_PUBLIC_BASE_PATH`. See [deployment and analytics](docs/github-pages.md).

D1 and R2 bindings are disabled in `.openai/hosting.json`; the database scaffolding in `db/` does not store project data. GitHub Pages serves static files. Each visitor keeps their projects in browser storage.

```text
app/             UI, project logic, import/export, generated catalog
public/          Icons and other static assets
data/catalog/    Catalog inputs, sources, and audits
scripts/         Catalog generation and checks
tests/           Automated tests
docs/            Version records, catalog policies, and reviews
worker/          Cloudflare Workers entry point
```

## Contributing and license

Use [Issues](https://github.com/utiwaaaaaien/CineBox/issues) to report problems or suggest sourced equipment corrections, or submit a pull request. Read the [contribution guide](CONTRIBUTING.md) first.

Original project code is licensed under the [MIT License](LICENSE). Third-party dependencies, trademarks, images, and referenced material remain subject to their respective licenses and rights; see [third-party notices](THIRD_PARTY_NOTICES.md). Included real project data does not imply endorsement by the associated brands or project owners.
