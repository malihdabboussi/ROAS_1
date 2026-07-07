# LinkedIn Profile API Limitation — Meticulous Analysis

## 1. Problem Restatement

**User report:** "I still see nothing other than name + image in the LinkedIn profile, no banner image, no slogan, etc."

**Screenshot evidence:** Card shows blue banner placeholder, empty/dark avatar circle, name "Sefy Tofan", "View on LinkedIn" button. Bottom two-thirds empty — no headline, company, location, network stats.

## 2. Environment & Context

- **DB:** qfrvykscoymiwwgysvsr (Supabase)
- **Flow:** Frontend `fetchLinkedInProfile()` → POST `/api/integrations/composio/execute` → `ComposioService.executeTool('LINKEDIN_GET_MY_INFO', userId, {})` → Composio API → LinkedIn API
- **integration_capabilities:** LINKEDIN_GET_MY_INFO, LINKEDIN_GET_PERSON both exist
- **project_composio_toolkit_config:** linkedin enabled, execution_mode: composio

## 3. Reproduction Steps

1. Connect LinkedIn in Settings
2. Open Studio → Campaign → Social Content → click LinkedIn folder
3. Observe: name + image only; no headline, banner, company, location

## 4. Observed vs Expected

| Field       | Expected (mobile LinkedIn) | Observed (API)     |
| ----------- | -------------------------- | ------------------ |
| Name        | ✓                          | ✓                  |
| Profile pic | ✓                          | ✓ (URL may expire) |
| Headline    | ✓                          | ✗ not returned     |
| Company     | ✓                          | ✗ not returned     |
| Location    | ✓                          | ✗ not returned     |
| Banner      | ✓                          | ✗ not in API       |
| Followers   | ✓                          | ✗ not returned     |
| Connections | ✓                          | ✗ not returned     |

## 5. Evidence Pack

**Runtime log (fetchLinkedInProfile-raw):**

```json
{
  "rawKeys": ["id", "localizedFirstName", "localizedLastName", "profilePicture"],
  "fullRaw": {
    "id": "f_iDLvxcZv",
    "localizedFirstName": "Sefy",
    "localizedLastName": "Tofan",
    "profilePicture": { "displayImage": "https://media.licdn.com/..." }
  }
}
```

**DB integration_capabilities (Supabase qfrvykscoymiwwgysvsr):**

```sql
SELECT action_slug, description FROM integration_capabilities
WHERE integration_id ILIKE '%linkedin%' AND action_slug IN ('LINKEDIN_GET_MY_INFO', 'LINKEDIN_GET_PERSON');
```

- LINKEDIN_GET_MY_INFO: "Fetches the authenticated LinkedIn user's profile information including name, headline, profile picture, and other profile details."
- LINKEDIN_GET_PERSON: "Retrieves a LinkedIn member's profile information by their person ID. Returns lite profile fields (name, profile picture) by default, or basic profile fields (including headline and vanity name) with appropriate permissions."

**Actual API response:** Only id, localizedFirstName, localizedLastName, profilePicture. No headline, company, location, geo, vanityName, followersCount, connectionsCount.

## 6. Root Cause Analysis

**LinkedIn API returns Lite Profile only.** The Composio/LinkedIn integration uses the LinkedIn "Lite Profile" API, which returns:

- id (app-scoped)
- localizedFirstName
- localizedLastName
- profilePicture.displayImage

Headline, company, location, banner, network stats require:

- Different LinkedIn API products (Marketing API, etc.)
- Additional OAuth scopes (r_basicprofile, r_fullprofile, etc.)
- Different Composio actions (none exist for profile banner/background)

**LINKEDIN_GET_PERSON** with our id was added but returns the same lite fields — the person_id from GET_MY_INFO is app-scoped; GET_PERSON may require a different ID format or returns identical data.

## 7. Fix Options

| Option                                         | Trade-off                                        |
| ---------------------------------------------- | ------------------------------------------------ |
| A) Accept limitation, show name+image+CTA only | Correct. No false promises.                      |
| B) Request Composio/LinkedIn scope changes     | Out of scope; requires Composio/LinkedIn config. |
| C) Scrape LinkedIn (banned)                    | Violates ToS.                                    |

## 8. Recommended Fix

**Option A.** Display only what the API provides. Remove speculative GET_PERSON call and debug logs. Use `linkedin.com/in/me` for View link (works when logged in). Simplify UI.

## 9. Patch

- Remove LINKEDIN_GET_PERSON call from fetchLinkedInProfile
- Remove debug instrumentation
- Simplify LinkedInProfileView: name, avatar (with fallback), View on LinkedIn
- Profile URL: `https://www.linkedin.com/in/me` (id from API is app-scoped, /in/{id} would 404)
