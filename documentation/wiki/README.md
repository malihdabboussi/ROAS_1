# ROAS Wiki

Last Modified: 2026-09-11

The wiki is the human-readable documentation of the ROAS system. It is plain HTML with no build step: open `documentation/wiki/index.html` in a browser, or serve the folder with any static file server.

## Why HTML

Visual pages are easier to read and understand than long markdown. Every page has two reading levels: plain words always, and a "Show technical details" switch that reveals deeper detail.

## Categories

| Folder | Category | What goes in it |
|---|---|---|
| `start-here/` | Start here | How to run the project, where things live, rules we follow |
| `system-map/` | System map | What each part of the system is and how it works, one page per area |
| `features/` | Features | What the product does for the user, one page per feature |
| `integrations/` | Integrations | Each outside service we connect to and how |
| `issues/` | Issues and risks | Problems found, why they matter, status, Linear link |
| `tests/` | Tests and checks | How we prove things work |
| `decisions/` | Decisions and plans | Choices made and why, and what is coming next |

## Rules

1. **One home page.** `index.html` lists the categories and recently changed pages. Update the "Recently changed" list when a page changes.
2. **Every page shows four facts** in its header: last updated date, category, Linear link, and source of truth (the folder or table the page was written from).
3. **Two reading levels.** Plain words first. Wrap deep detail in `class="tech"` so it only shows with the switch.
4. **One shared style.** Pages link `assets/wiki.css` and `assets/wiki.js`. Do not put `<style>` blocks in pages.
5. **Update, do not duplicate.** When knowledge changes, edit the existing page and bump its date. New pages only for new areas.
6. **Start from the template.** Copy `_template.html`, keep the navigation block as is, mark the active category, fix the `../` depth.
7. **Link across categories.** A System map page links to its Issues, Tests, and Decisions pages, and they link back.
8. **No point without a code path.** Every fact, door, or problem names the file and line it was read from. A code issue names the code. A table issue names the table and the migration file. If a claim cannot be tied to a path, it does not go in. Use a `.pathnote` at the top of the page to declare a short prefix, for example `brain/` for `apps/api/src/modules/brain/`.
9. **Every point gets a scenario.** A `.scenario` block with the same rows each time: Situation, What happens, What you see, and for problems, Should be. The block ends with a `.where` line carrying the code path and, when a table is involved, the table and migration. Scenarios and their Where line are always visible, not behind the switch.
10. **Outline and tabs are automatic.** `assets/wiki.js` builds a fixed outline on the left from the page's `<h2>` headings. Add `data-tab="Name"` to an `<h2>` to move that section, and everything under it until the next `<h2>`, into a tab; untagged sections form the first tab, "Overview". Keep the main tab short; put long findings, tickets, and evidence in a second tab. Deep links to an element inside a tab open that tab.
11. **Every page has a "Questions people asked" card.** When someone asks about a section, answer in plain words and write the answer into that card with the date and the path that backs it. The same question never needs asking twice.
12. **Search is built, not live.** Every page shows a search box in the top bar (press `/` to focus). It reads `assets/search-index.js`, which is generated from the pages. After editing or adding a page, run `python3 documentation/wiki/tools/build-search-index.py` and keep the regenerated index next to your change. Results are per section and open the right tab.

## Adding a page

```bash
cp documentation/wiki/_template.html documentation/wiki/<category>/<page-name>.html
```

Then fill in the header block, write the body with a scenario per point, add the page to `<category>/index.html`, and add it to "Recently changed" on the home page.

## Answering a question about a page

1. Read the section the question is about, then the code it points to.
2. Answer in chat in plain words, with the path.
3. Add a `<dt>` question and `<dd>` answer to the page's Questions card, with the date and path.
4. Bump the page's "Last updated" date and add a "Recently changed" row.

## Relationship to other docs

Markdown docs under `documentation/features`, `documentation/utilities`, and `.docs/` remain the machine-readable record and the place agents write to. The wiki is the human view. When both exist for the same topic, the wiki page names the markdown source in its "Source of truth" line.
