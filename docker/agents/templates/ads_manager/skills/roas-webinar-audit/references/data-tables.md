# Standard Data Tables — What Every Audit Produces

Every client-facing audit ships with a standard set of audience and performance tables. These are not optional. They are the foundation of the "who was actually in the room" section of the deliverable, and they unlock the cold-vs-list channel attribution insight that most audits miss.

Load this during Step 5 when assembling the deliverable. Each table below specifies the data source, the extraction logic, and the standard insight callout (purple info box) that should accompany it.

---

## A. GEOGRAPHIC DISTRIBUTION (COUNTRY LEVEL)

**Data source:** Zoom attendee CSV export (or Demio / StreamYard equivalent). Look for the country column or the city/state field.

**Extraction:** Group attendees by country. Sort descending by attendee count.

**Format:**

| Country | Attendees | % of room |
|---|---|---|
| United States | 142 | 78% |
| Canada | 12 | 7% |
| Mexico | 9 | 5% |
| United Kingdom | 6 | 3% |
| Other (8 countries) | 13 | 7% |

**Always call out the international total separately** as virtual ticket candidates. Even if the offer is a US live event, international attendees who showed up are buyers for a virtual product or a future event.

**Standard insight callout:**
> **What this means:** 22% of attendees are international. These are virtual ticket candidates. Add a virtual-only purchase option to the follow-up sequence.

---

## B. US STATES BREAKDOWN (FROM CHAT SELF-IDS)

**Data source:** Chat transcript. Parse the roll-call moment (typically 15-25 min mark when presenter asks "where are you from"). Cross-reference with Zoom CSV when possible to validate.

**Extraction logic** (three matching layers):

1. **Full state names** — match "California," "Texas," "New York," "Florida," etc. case-insensitive.
2. **State abbreviations in formatted contexts** — match patterns like `,NY`, `/CA/`, ` TX `, ` FL.`, `(AZ)`. Only count abbreviations preceded or followed by a delimiter or a city name. Bare two-letter strings inside words are noise (e.g., "FA" in "FAQ" should not match Florida).
3. **City-to-state fallback** — when only a famous city is named, map to state. Maintain a mapping for the top 100 US metros. Examples: Brooklyn → NY, Manhattan → NY, Miami → FL, Austin → TX, Dallas → TX, Chicago → IL, Phoenix → AZ, Atlanta → GA, Boston → MA, Philadelphia → PA, Seattle → WA, Portland → OR, Denver → CO, Las Vegas → NV.

**Format:**

| State | Count | % of US sample | Channel attribution note |
|---|---|---|---|
| Florida | 28 | 24% | Inside ad geo |
| New York | 18 | 16% | Inside ad geo |
| California | 12 | 10% | OUTSIDE ad geo (list-driven) |
| Texas | 9 | 8% | OUTSIDE ad geo (list-driven) |
| ... | | | |

**Standard insight callout:**
> **What this means:** 34% of US attendees came from outside the East Coast ad geo. Pure list-driven attendance. The list is doing real work alongside the ads.

---

## C. REGIONAL ROLLUP

**Data source:** Built from Table B by grouping states into regions.

**Region definitions:**
- **East Coast** — ME, NH, VT, MA, RI, CT, NY, NJ, PA, DE, MD, DC, VA, NC, SC, GA, FL
- **Midwest** — OH, MI, IN, IL, WI, MN, IA, MO
- **South Central** — KY, TN, AL, MS, AR, LA, TX, OK
- **West** — MT, WY, CO, NM, AZ, UT, NV, ID, WA, OR, CA, AK, HI
- **Other** — ND, SD, NE, KS, WV, plus any unmapped

**Critical: split "ad-targeted geo" vs "list-driven only"** using a clean geographic filter based on where the ad campaign actually ran. This is the foundation for the "the list is doing real work" insight.

**Format:**

| Region | Count | % of US | Cold (ads) | List-driven |
|---|---|---|---|---|
| East Coast | 78 | 67% | 78 | 0 |
| West | 14 | 12% | 0 | 14 |
| South Central | 11 | 9% | 0 | 11 |
| Midwest | 9 | 8% | 0 | 9 |
| Other | 4 | 4% | 0 | 4 |

**Standard insight callout:**
> **What this means:** Outside the East Coast ad geo, every attendee came from the email/SMS list. That's 33% of the US room riding on list muscle. When ads expand to cover those regions at the same CPL, total attendance scales linearly.

---

## D. SUB-STATE CITY BREAKDOWN (TOP STATE)

**Data source:** Chat transcript + Zoom CSV city field.

**When to do this:** Always for the #1 state. Especially critical if the live event is in that state.

**Extraction:** Pull every city mentioned for the #1 state. Group by metro. Flag locals (within 30 miles of the event venue) and drive-over candidates (30-150 miles).

**Format (Florida example, event in Miami):**

| City | Count | Distance from venue | Tier |
|---|---|---|---|
| Miami / Miami Beach | 7 | 0-15 mi | LOCAL |
| Fort Lauderdale | 4 | 25 mi | LOCAL |
| West Palm Beach | 3 | 70 mi | DRIVE-OVER |
| Orlando | 5 | 235 mi | FLY-IN |
| Tampa | 3 | 280 mi | FLY-IN |
| Jacksonville | 2 | 345 mi | FLY-IN |
| Other (smaller markets) | 4 | varies | mixed |

**Why this matters:** Locals are the lowest-friction buyers in the room. No flight, no hotel, dinner at home that night. They get a dedicated chat-drop at the offer reveal, a dedicated slide angle ("if you live in Miami, this is a no-brainer"), and a dedicated phone call inside 24 hours of the webinar.

**Standard insight callout:**
> **What this means:** 11 attendees live within 30 miles of the venue. These are the easiest yes in the room. Add a "locals close" angle to the offer slide and put them at the top of the phone follow-up list.

---

## E. COLD ADS VS LIST MIX (CHANNEL ATTRIBUTION)

**Data source:** Meta ads manager (lead count from the campaign), platform attendee count, total registered count.

**Extraction logic:**

- **Cold leads (estimated)** = ad-manager lead count for the relevant campaign window
- **List-driven leads (estimated)** = total registered − cold leads
- **Show rates** — apply typical defaults: cold ~30%, list ~50-55%
- **Cold attendees (estimated)** = cold leads × cold show rate
- **List attendees (estimated)** = list leads × list show rate
- **Cost per attendee blended** = ad spend / total attendees (NOT just cold attendees, because the list attendees came free)

**Format:**

| Channel | Leads | Show rate | Attendees | Cost per lead | Cost per attendee |
|---|---|---|---|---|---|
| Cold ads | 412 | 30% | 124 | $4.85 | $16.17 |
| Email/SMS list | 89 | 52% | 46 | $0 | $0 |
| **Blended** | **501** | **34%** | **170** | **$3.99** | **$11.79** |

**Standard insight callout:**
> **What this means:** Blended cost per attendee was $11.79, well under benchmark. The list cut acquisition cost almost in half. This is the system working as designed.

---

## F. DEMOGRAPHICS (FROM META ADS MANAGER)

**Data source:** Meta ads manager screenshots — age band breakdown, gender split, CPL per segment.

**Extraction:** Pull the campaign-level demographic breakdown. Match to the buyer pool age band of the offer.

**Format:**

| Age band | % of leads | CPL | Notes |
|---|---|---|---|
| 25-34 | 18% | $5.20 | Cheaper but lower buyer density |
| 35-44 | 31% | $4.45 | Core buyer pool |
| 45-54 | 28% | $4.80 | Core buyer pool |
| 55-64 | 17% | $5.95 | Highest buyer density historically |
| 65+ | 6% | $7.20 | Niche but converts |

| Gender | % of leads | CPL |
|---|---|---|
| Male | 64% | $4.65 |
| Female | 36% | $5.40 |

**Flag whether the buyer pool age band matches the offer.** If the offer is built for 45-65 but 49% of leads are 25-44, that's a targeting gap.

**Standard insight callout:**
> **What this means:** 76% of leads are in the 35-64 age band, which matches the buyer profile. Targeting is on point. The 25-34 segment costs more per buyer despite cheaper CPL — consider excluding in the next campaign.

---

## G. WATCH TIME DISTRIBUTION

**Data source:** Webinar platform analytics (Zoom, Demio, StreamYard). Pull the per-attendee watch duration.

**Extraction:** Bucket attendees by watch time. Always call out the % who watched past the pitch reveal moment (typically 60-75 min mark depending on deck pacing).

**Format (visual horizontal bars, color-coded):**

| Bucket | Count | % | Bar |
|---|---|---|---|
| <10 min | 18 | 11% | █ (slate) |
| 10-30 min | 24 | 14% | ██ (slate) |
| 30-60 min | 31 | 18% | ███ (amber) |
| 60-90 min | 58 | 34% | ██████ (GREEN — sweet spot) |
| 90+ min | 39 | 23% | ████ (GREEN — sweet spot) |

**Standard insight callout:**
> **What this means:** 57% of attendees watched past the 60-minute mark, which is past the pitch reveal. Engagement was strong. The drop-off pattern points to the offer, not the content.

---

## H. INDUSTRY BREAKDOWN OF ICP-QUALIFIED CHATTERS

**Data source:** Chat transcript. Parse roll-call self-IDs and any business-context mentions in the first 30 minutes.

**Extraction:** Categorize each self-identified attendee into industry buckets. Standard buckets:

- Auto Sales
- Coaches / Consultants
- Insurance
- Real Estate
- Sales Reps (W2)
- Contractors / Trades
- Other Business Owners
- Unclear / no signal

**Format:**

| Industry | Count | % of identified | ICP fit |
|---|---|---|---|
| Auto Sales | 34 | 28% | A+ (core ICP) |
| Coaches / Consultants | 22 | 18% | A (adjacent ICP) |
| Real Estate | 19 | 16% | B (adjacent) |
| Insurance | 14 | 12% | B (adjacent) |
| Sales Reps (W2) | 11 | 9% | C (off-ICP, low buyer density) |
| Contractors | 8 | 7% | C |
| Other Business Owners | 12 | 10% | mixed |

**Standard insight callout:**
> **What this means:** 62% of identified chatters are in core or adjacent ICP. Audience quality is strong. The 16% W2/contractor segment is the lowest-converting cohort — if cold ads are pulling these in volume, tighten interest targeting.

---

## CHECKLIST BEFORE SHIPPING

- [ ] Geographic distribution table (country level) with international called out separately
- [ ] US states table with channel attribution note (inside vs outside ad geo)
- [ ] Regional rollup with cold-vs-list split
- [ ] Top-state city breakdown (especially if live event is in that state)
- [ ] Cold vs list channel attribution table with blended cost per attendee
- [ ] Demographics table (age + gender) with buyer-pool match note
- [ ] Watch time distribution chart with sweet-spot callout
- [ ] Industry breakdown of identified chatters
- [ ] Every table has a purple info callout with the "what this means" reframe
