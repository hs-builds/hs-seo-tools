# Installation Guide — HS SEO Tools v3.0

Step-by-step setup for **Google Search Console**, **GA4 Analytics**, and **Google Ads** modules.

**Total setup time:** ~15 minutes

---

## What You'll Need

| Module | Prerequisites |
|---|---|
| **GSC** | Google Search Console access |
| **GA4** | Google Analytics 4 property |
| **Google Ads** | Google Ads Manager Account (MCC) + Developer Token |
| **All modules** | Google Cloud Project (one-time setup) |

---

## Step 1 — Copy the Template Sheet

The fastest way to get started: copy the pre-configured Google Sheet that already has all code files included.

1. Open this link:
   ```
   https://docs.google.com/spreadsheets/d/1E6hAVnJhoTOxli6bBm69VemfiwmxFqdWqlvDXiegAyo/copy
   ```
2. You'll see a **"Copy document"** dialog — click **"Make a copy"**
3. Your copy opens in Google Sheets with all Apps Script code already inside

> ✅ **Code is installed.** No copy-pasting needed. Continue to Step 2.

---

## Step 2 — Create a Google Cloud Project

All three modules use the same Google Cloud Project for API access.

### 2a. Create the project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the **project dropdown** at the top → **"New Project"**
3. Name it `HS SEO Tools` (or anything you prefer) → Click **"Create"**
4. Once created, go to **Dashboard** and copy your **Project Number**
   - Looks like: `123456789012`
   - ⚠️ **Save this — you'll need it in Step 3**

### 2b. Enable APIs

Go to **APIs & Services → Library** and enable all of the following:

| API | Required for |
|---|---|
| **Google Search Console API** | GSC module |
| **Google Analytics Data API** | GA4 module |
| **Google Indexing API** | Instant Indexing module |

> **Note on Google Ads:** The Ads module uses OAuth2 via the `adwords` scope which is already in `appsscript.json` — you **do not** need to enable a separate Google Ads API in GCP. You will, however, need a **Developer Token** (see [Section 6](#6--google-ads-setup-developer-token--mcc)).

### 2c. Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Select **"External"** → Click **"Create"**
3. Fill in:
   - **App name:** `HS SEO Tools`
   - **User support email:** your email
   - **Developer contact email:** your email
4. Click **"Save and Continue"** through Scopes (no changes needed)
5. On **"Test users"** → click **"+ ADD USERS"** → add your Google account email → **"Save and Continue"**

> ⚠️ **Don't skip the Test User step.** Without it you'll get `Error 403: access_denied`.

---

## Step 3 — Link Sheet to Google Cloud Project

1. In your copied Google Sheet, go to **Extensions → Apps Script**
2. In the Apps Script editor, click **⚙️ Project Settings** (left sidebar)
3. Scroll to **"Google Cloud Platform (GCP) Project"**
4. Click **"Change project"**
5. Enter your **Project Number** from Step 2a → Click **"Set project"**

> ✅ **Sheet is now connected to your GCP project.**

---

## Step 4 — Authorize the Script

1. In the Apps Script editor, select **`onOpen`** from the function dropdown at the top
2. Click **▶️ Run**
3. A permission dialog appears:
   - Click **"Review permissions"**
   - Select your Google account
   - Click **"Advanced"** → **"Go to HS SEO Tools (unsafe)"** *(it's your own script — it's safe)*
   - Click **"Allow"**
4. Return to your Google Sheet and **refresh the page (F5)**
5. Look for **"HS SEO Tool"** in the top menu bar

> ✅ **Setup complete for GSC module.** The menu appears and GSC is ready to use.

---

## Step 5 — GA4 Module Setup

The GA4 module needs one extra step: enabling the **Analytics Data Advanced Service** inside Apps Script.

### 5a. Enable Advanced Service

1. In Apps Script editor, click **"+" next to Services** (left sidebar)
2. Search for **"Google Analytics Data API"**
3. Select it → Click **"Add"**

   > If it's already listed under Services, you can skip this step — it was auto-enabled from `appsscript.json`.

### 5b. Verify GA4 Access

1. In your Google Sheet, click **HS SEO Tool → GA4**
2. The sidebar opens — click **"↻ Refresh"** next to GA4 Property
3. Your GA4 properties should appear in the dropdown

> ✅ **GA4 module is ready.**

### 5c. Using GA4

1. Select your **GA4 Property**
2. Choose a **tab**: Traffic, Audience, Pages, Events, Ecommerce, LLM, or UTM
3. Set your **date range** (Last 7/28/30/90 days, Last 6/12 months, or custom)
4. Pick **metrics** and optional **Group By** dimensions using the accordion panels
5. Optionally add a **Channel filter** (e.g. Organic Search only)
6. Click **"Fetch Data"**

Results are written to a dedicated sheet tab (e.g. `GA4 Traffic`, `GA4 Ecommerce`).

---

## Step 6 — Google Ads Setup: Developer Token & MCC

The Google Ads module connects directly to the Google Ads API using OAuth2. It needs two things: a **Developer Token** and your **MCC Account ID**.

### 6a. Get Your Developer Token

1. Log in to your [Google Ads Manager Account (MCC)](https://ads.google.com)
   - This must be a **Manager Account** — individual accounts don't have API access
2. Click **Tools & Settings** (wrench icon, top right) → **Setup → API Center**
3. Accept the Google Ads API Terms of Service if prompted
4. Your **Developer Token** is shown on this page
   - It may say "Test account" initially — this is fine for development
   - For production use, apply for **Basic Access** on the same page

> ⚠️ If you don't have a Manager Account, create one at [ads.google.com/home/tools/manager-accounts](https://ads.google.com/home/tools/manager-accounts). It's free.

### 6b. Find Your MCC Account ID

Your MCC Account ID is the 10-digit number in the top-right corner of your Google Ads Manager Account (format: `XXX-XXX-XXXX`).

**Use the numbers only — no dashes.** Example: `1770043542`

### 6c. Using Google Ads in the Tool

1. In your Google Sheet, click **HS SEO Tool → Google Ads**
2. Click **⚙️ API Credentials** to expand the credentials panel
3. Enter:
   - **MCC Account ID** — numbers only, no dashes (e.g. `1770043542`)
   - **Developer Token** — paste from API Center
4. Click **"Load Accounts"** — all ENABLED sub-accounts under your MCC will appear
5. Select the **sub-account** you want to query
6. Set your **Location** and **Language**

#### Keyword Volume
1. Switch to the **Keyword Volume** tab
2. Paste your keywords — one per line (up to 5,000 at a time)
3. Choose **Historic** option: Past 3, 6, 12, 24 months, or Custom range
4. Click **"Get Volume"**

Results appear in the `Keyword Volume` sheet with: Avg Monthly Searches, Competition, Competition Index, Low Bid, High Bid — formatted in your local currency.

#### KW Magic Tool
1. Switch to the **KW Magic Tool** tab
2. Enter a **seed keyword** (e.g. `wall paint`, `running shoes`)
3. Choose **Historic** option
4. Click **"Get Ideas"**

Results appear in the `KW Magic Tool` sheet with hundreds of related keyword ideas.

> ✅ **Google Ads module is ready.**

---

## 🔧 Alternative: Manual Installation

<details>
<summary><b>Click to expand — set up from scratch without the template</b></summary>

### Manual Setup (~20 minutes)

1. **Download all code files from GitHub:**
   - `Code.gs` — Menu setup
   - `GSC.gs` — GSC backend
   - `UI.html` — GSC module UI
   - `GA4.html` — GA4 module UI
   - `ga4.gs` — GA4 backend
   - `ad.html` — Google Ads module UI
   - `ads.gs` — Google Ads backend
   - `appsscript.json` — OAuth scopes and services manifest

2. **Create a new Google Sheet** at [sheets.google.com](https://sheets.google.com)

3. **Open Apps Script:** Extensions → Apps Script

4. **Add each file:**
   - Delete the default `Code.gs`
   - Click **"+"** next to Files → add each `.gs` file as Script and each `.html` file as HTML
   - For `appsscript.json`: Go to ⚙️ Project Settings → enable "Show 'appsscript.json' manifest file in editor", then paste the contents

5. **Follow Steps 2–6 above** to link GCP, authorize, and set up each module

</details>

---

## 🐛 Troubleshooting

### "HS SEO Tool" menu doesn't appear
- Refresh the sheet (F5) and wait 20 seconds
- Go to Extensions → Apps Script → run `onOpen` manually → return to sheet and refresh

### "Authorization required" keeps appearing
- Run `onOpen` manually in Apps Script and complete the auth flow
- Make sure you added yourself as a Test User in the OAuth Consent Screen

### GSC: No properties showing
- Confirm Google Search Console API is enabled in GCP
- Verify you have access to the property in [search.google.com/search-console](https://search.google.com/search-console)
- Re-authorize the script and wait 2–3 minutes

### GA4: "No properties found" or empty dropdown
- Confirm Google Analytics Data API is enabled in GCP
- Confirm the Analytics Data Advanced Service is added in Apps Script (Step 5a)
- Verify your Google account has access to at least one GA4 property

### GA4: "Insufficient permissions" error
- Re-authorize the script — GA4 scopes may not have been granted
- In Apps Script, go to Project Settings → verify the GCP project is linked correctly

### Google Ads: "Developer token not approved"
- Your token is in test mode — it only works with test accounts
- Apply for Basic Access in Google Ads → Tools → API Center
- For immediate use: the token works fine against your own MCC sub-accounts in test mode

### Google Ads: "No accounts found" after clicking Load Accounts
- Confirm the MCC Account ID is correct (numbers only, no dashes)
- Verify the Developer Token matches the MCC account you're using
- Make sure the sub-accounts are **ENABLED** (paused/cancelled accounts won't appear)

### Google Ads: Wrong currency showing for bids
- Set the correct **Location** before fetching — the currency is determined by the selected country, not your account

---

## ⏱️ Setup Time Summary

| Task | Time |
|---|---|
| Copy template | 1 min |
| Create GCP project + enable APIs | 5 min |
| Link sheet to GCP | 1 min |
| Authorize script | 2 min |
| GA4: Enable Advanced Service | 1 min |
| Google Ads: Find Developer Token + MCC ID | 2 min |
| **Total** | **~12 minutes** |

---

**Need help?**
- 🐛 [Open an issue on GitHub](https://github.com/hs-builds/hs-seo-tools/issues)
- 💬 [LinkedIn Article & Documentation](https://www.linkedin.com/pulse/stop-wasting-hours-copying-data-from-google-search-console-harsh-shah-zyppf/)

---

**All set! 🎉** You now have GSC, GA4, and Google Ads data flowing directly into your Google Sheets.
