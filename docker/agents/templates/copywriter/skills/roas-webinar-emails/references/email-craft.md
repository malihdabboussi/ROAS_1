# Email Craft — Subject Lines, Structure, CTAs, Deliverability

Read once before writing the first email of a run. This governs the build of any individual email regardless of which sequence it's in.

---

## Anatomy of one email

1. **Subject line** — earns the open. Nothing else matters if this fails.
2. **Preview text** — the second line the inbox shows. Complements the subject, never repeats it.
3. **Open** — first 1-2 lines. Re-earn the open by paying off the curiosity fast. No "hope you're doing well." Get in.
4. **Body** — one idea. One. The moment an email has two arguments it has zero.
5. **CTA** — one action, stated plainly, as a clear link/button. Appears 2-3 times across the email (early once it's earned, contextually in the middle, and in the P.S.).
6. **Sign-off** — the presenter's name. Human.
7. **P.S.** — the second-most-read line in any email after the subject. Restate the one action and the deadline. Never skip it.

Most emails should read in under 30 seconds. Short paragraphs, 1-3 lines each, lots of white space, written for a thumb on a phone.

---

## The paired SMS (every email gets one)

SMS is half the machine, not a bonus. Open rates dwarf email and the room fills on texts as much as sends. Every email in every sequence ships with a paired SMS that carries the same angle.

- **2-3 lines, one link.** A text is not a mini-email. It's the headline of the email plus the link.
- **Same angle as its email.** If the email is "I revealed too much," the SMS is "{{first_name}}... I might have revealed too much yesterday, replay's up but I might pull it early. Watch while you can: [link]."
- **Lead with {{first_name}} and an ellipsis.** It reads like a personal text, not a broadcast. This is the dominant pattern in the proven flows.
- **One link, raw.** No tracking-link salad. One destination.
- **No subject, no sign-off, no P.S.** It's a text. Get in, drop the FOMO, drop the link, out.
- **Carry the scarcity.** The spot count, the deadline, the "I might pull it early" all belong in the SMS too. The text often outperforms the email, so it can't be the soft version.

---

## Subject lines

The subject sells the open, not the click, and definitely not the product. Its only job is to get the email opened.

- **Write 2-3 options per email** so there's an A/B to run.
- **Curiosity + specificity.** Enough specifics to feel real, enough gap to need the open. "the part you'll want to see" beats both "amazing webinar replay inside!!" (spammy, says nothing) and "Here is the complete replay of yesterday's training along with the full offer details and pricing" (says everything, no reason to open).
- **Don't pre-spend the curiosity.** If the subject answers itself, the open dies.
- **Lowercase or sentence case** usually outperforms Title Case for the personal-from-a-human feel. Match the presenter.
- **Short wins on mobile.** 3-6 words is a good target. The inbox truncates long ones anyway.
- **Deliverability:** avoid the spam-trigger stack — ALL CAPS, multiple exclamation marks, "FREE," "$$$," "act now," excessive emoji. One emoji max, and only if the presenter's brand uses them.

### Preview text

- The snippet line after the subject. Treat it as a second subject line, not a throwaway.
- Complement, don't repeat. If the subject opens a loop, the preview widens it.
- If left blank, the inbox pulls the first line of the body, which is usually wasted. Always write it.

---

## CTA rules

- **One email, one action.** Watch the replay, OR go to the offer, never both competing. (The no-show bridge email is the one managed exception, and even then the two CTAs are cleanly separated.)
- **The link appears 2-3 times.** Once early once the reader's earned it, once in context mid-body, once in the P.S. A reader who's already sold shouldn't have to scroll to find the link.
- **Make the link obvious.** A clear button or an explicit "[click here to watch the replay]" line on its own. Not buried in a sentence.
- **CTA language is specific and action-first.** "watch the replay" / "grab your spot" / "join [program]" — not "learn more" or "click here for details."

---

## Merge fields

Use the placeholder style and let the person loading it map to their ESP's real syntax. Default to double-curly:

- `{{first_name}}` — personalize the open where natural, don't force it into every line
- `{{webinar_date}}`, `{{webinar_time}}`, `{{timezone}}`
- `{{registration_link}}`, `{{replay_link}}`, `{{offer_link}}`
- `{{deadline_date}}`, `{{deadline_time}}`

If the ESP is known (GoHighLevel, ActiveCampaign, ConvertKit, Klaviyo), note the correct merge syntax for that platform at the top of the deliverable so it pastes in clean.

---

## Formatting for ESPs

- **Default to plain-text style.** Plain-text-feel emails (even if sent as HTML) outperform heavily-designed template emails for this kind of personal direct-response send. They land in the primary inbox more often and read like a person wrote them.
- **No image-heavy templates** unless the client's brand specifically runs designed broadcasts. A logo header is fine; a full graphic-design email for a personal-from-the-founder send is wrong.
- **Real line breaks, short blocks.** Write for mobile. A paragraph over 3 lines becomes a wall on a phone.
- **One link style throughout.** Consistency reads as trustworthy.

---

## Deliverability notes (these are bulk sends)

- **No AI tells.** Load `dylans-super-voice` and use its Human Enforcement layer. Em dashes, triplets, "it's not just X it's Y," question-then-list, fake-candor openers, and word smells don't just read badly, they pattern-match to mass-generated mail and hurt placement.
- **Avoid the spam-word stack** in subject AND body: FREE, guarantee (in subject), act now, limited time (overused), cash, $$$, ALL CAPS, !!!.
- **Whitelist ask in the confirmation email** ("reply or add me to your contacts so this lands in your inbox") protects the whole sequence.
- **Don't overload links.** A personal email with eight different links looks like spam. One destination, repeated.
- **Plain-text ratio.** Keep a healthy text-to-image and text-to-link ratio. More words than links, always.

---

## FOMO intensity — packets, not reminders

A send that just informs is dead weight. Every email and every SMS has to be a packet built to create urgency, or it gets cut. Before any send ships, it must carry at least one of these:

- **A real deadline counting down** ("replay comes down Friday, maybe sooner")
- **Real scarcity** (spots/seats ticking down: 10 → 3 → 2 → 1)
- **Loss framing** (what disappears and exactly when, and it actually disappears)
- **Proof others already moved** ("5 booked while still on the call")

If a send has none of these four, it's filler. Rebuild it or delete it. The full angle library and the conditions for each play are in `references/angles.md`. Read it before writing the FOMO-heavy sends.

---

## Human-copy gate — the fast pass for email + SMS

The full standard is `dylans-super-voice`. This is the short channel-specific reminder for the offenders that show up most in webinar sends. Catch these on every email and every SMS:

- **Em dashes → gone.** Use a period, a comma, or "...".
- **Triplets → gone.** Three parallel lines or three-item lists read as machine-made. Use one sharp line or an uneven number.
- **"It's not X, it's Y" → gone.** State the point straight.
- **Question-then-list → gone.** "What separates the ones who win? They do A. They do B." Rewrite as one human thought.
- **Fake-candor openers → gone.** "Honestly," "let me be real," "truth is." The honesty should be in the content, not announced.
- **Forbidden words → gone.** unlock, leverage, elevate, seamless, transform, journey, dive, realm, robust, optimize, and the rest of the list in the full reference.
- **Round-number tells → specific.** "$100K+ in 30 days" beats "huge results." Real numbers, odd numbers, read human.
- **Sign-off and P.S. count too.** The AI smell loves to hide in the closer. Scrub them like the body.

In an SMS, keep the human texture (the ellipsis open, the plain link, the conversational fragment) but don't force personality that needs room. A text is a real person being brief, not a shrunk-down essay.

---

## The one-line gut check for every email

Before moving on from an email, answer: **what is the single thing I want this reader to do, and is everything in this email pointing at that one thing?** If there are two answers, split it into two emails.
