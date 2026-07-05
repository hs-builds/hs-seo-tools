# Installation Guide — HS SEO Tools v3.0

Step-by-step setup for all four modules: **GSC**, **GA4**, **Google Ads (Ads Volume)**, and **Instant Indexing**.

**Total setup time:** ~15 minutes

---

## What You'll Need

| Module | Menu Item | Prerequisites |
|---|---|---|
| **GSC** (KW Tracker, URL Tracker, Fetch Data, Overview) | HS SEO Tool → GSC | Google Search Console access |
| **GA4** | HS SEO Tool → GA4 | Google Analytics 4 property |
| **Google Ads** | HS SEO Tool → Ads Volume | Google Ads Manager Account (MCC) + Developer Token |
| **Instant Indexing** | HS SEO Tool → GSC → Instant Index tab | Service Account added as Owner/ Full in GSC |

---

## Step 1 — Copy the Template Sheet

The fastest way to get started. The template already has all code files embedded — no copy-pasting needed.

1. Open this link:
   ```
   https://docs.google.com/spreadsheets/d/1E6hAVnJhoTOxli6bBm69VemfiwmxFqdWqlvDXiegAyo/copy
   ```
2. Click **"Make a copy"** in the dialog that appears
3. Your copy opens in Google Sheets with all Apps Script files already inside

> ✅ **Code is installed.** Continue to Step 2.

---

## Step 2 — Create a Google Cloud Project

One Google Cloud Project handles all modules.

### 2a. Create the project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the **project dropdown** at the top → **"New Project"**
3. Name it `HS SEO Tools` (or anything) → Click **"Create"**
4. Once created, open the **Dashboard** and copy your **Project Number**
   - Example: `123456789012`
   - ⚠️ **You'll need this in Step 3**

### 2b. Enable APIs

Go to **APIs & Services → Library** and enable the following:

| API to enable | Required for |
|---|---|
| **Google Search Console API** | GSC module (all tabs) |
| **Google Analytics Admin API** | GA4 module (property listing) |
| **Google Analytics Data API** | GA4 module (report fetching) |
| **Web Search Indexing API** | Instant Indexing module |

> **Google Ads:** Does not require a separate API to be enabled in GCP. It uses OAuth2 + your Developer Token directly. See [Step 6](#step-6--google-ads-setup).

---

## Step 3 — Link Sheet to Google Cloud Project

1. In your Google Sheet, go to **Extensions → Apps Script**
2. In the Apps Script editor, click **⚙️ Project Settings** (left sidebar)
3. Scroll to **"Google Cloud Platform (GCP) Project"**
4. Click **"Change project"**
5. Enter your **Project Number** from Step 2a → Click **"Set project"**

> ✅ **Sheet is connected to GCP.**

---

## Step 4 — Authorize the Script

1. In Apps Script, select **`onOpen`** from the function dropdown at the top
2. Click **▶️ Run**
3. The permissions dialog appears — click **"Review permissions"**
4. Select your Google account
5. Click **"Advanced"** → **"Go to HS SEO Tools (unsafe)"** *(it's your own script — safe to proceed)*
6. Click **"Allow"**
7. Return to your Google Sheet and **refresh the page (F5)**
8. The **"HS SEO Tool"** menu appears in the top menu bar

> ✅ **Script is authorized. GSC and GA4 modules are now ready to use.**

---

## Step 5 — GA4 Module

The GA4 module uses your Google account's OAuth token to access the **Google Analytics Admin API** and **Google Analytics Data API** via REST. No additional service setup is required beyond enabling the two APIs in Step 2b.

### Using GA4

1. Click **HS SEO Tool → GA4**
2. Click **↻ Refresh** next to "GA4 Property" — your properties load automatically
3. Select your **GA4 Property**
4. Choose a **tab**: Traffic, Audience, Pages, Events, Ecommerce, LLM, or UTM
5. Set your **date range**
6. Configure **metrics** and optional **Group By** dimensions
7. Click **"Fetch Data"**

Results are written to a dedicated sheet tab (e.g. `GA4 Traffic`, `GA4 Ecommerce`).

> **Troubleshooting:** If no properties appear, verify both GA4 APIs are enabled in GCP (Step 2b) and re-authorize the script (Step 4).

---

## Step 6 — Google Ads Setup

The Ads Volume module connects to the Google Ads API using your OAuth token + a **Developer Token** + your **MCC Account ID**. No GCP API enabling is required.

### 6a. Get your Developer Token

1. Log into your [Google Ads Manager Account (MCC)](https://ads.google.com)
   - Must be a **Manager Account** — standard accounts don't have API access
   - If you don't have one, create it free at [ads.google.com/home/tools/manager-accounts](https://ads.google.com/home/tools/manager-accounts)
2. Click the **wrench icon** (Tools & Settings) → **Setup → API Center**
3. Accept the Google Ads API Terms of Service if prompted
4. Copy your **Developer Token** from this page

> **Note:** A new token starts in "Test account" mode. It works against your own MCC accounts. For production use with external clients, apply for **Basic Access** on the same page.

### 6b. Find your MCC Account ID

Your MCC Account ID is the number shown in the top-right corner of your Manager Account (format: `XXX-XXX-XXXX`).  
Use **numbers only, no dashes** — e.g. `1770043542`

### 6c. Using Ads Volume

1. Click **HS SEO Tool → Ads Volume**
2. Expand **⚙️ API Credentials** and enter:
   - **MCC Account ID** — numbers only (e.g. `1770043542`)
   - **Developer Token** — paste from API Center
3. Click **"Load Accounts"** — all ENABLED sub-accounts appear
4. Select the **sub-account** to query
5. Set **Location** and **Language**

**Keyword Volume tab:**
1. Paste your keywords — one per line (up to 5,000 per call)
2. Choose **Historic** option: Past 3, 6, 12, 24 months, or Custom range
3. Click **"Get Volume"**

Results appear in `Keyword Volume` sheet with Avg Monthly Searches, Competition, Competition Index, Low Bid, High Bid — in your local currency.

**KW Magic Tool tab:**
1. Enter a **seed keyword** (e.g. `wall paint`)
2. Choose **Historic** option
3. Click **"Get Ideas"**

Results appear in `KW Magic Tool` sheet with hundreds of related keyword ideas.

---

## Step 7 — Instant Indexing Setup

> ⚠️ **This module requires a one-time Service Account setup.** It cannot work without it — all requests will return `403 Forbidden` until the service account is added as an Owner in Google Search Console.

The Instant Indexing module submits URLs to Google's Indexing API (`indexing.googleapis.com/v3/urlNotifications:publish`). Google's Indexing API requires the caller to have **Owner/ Full** access of the property in Search Console. You do this by creating a Service Account in GCP and adding its email as an Owner/ Full access in GSC.

### 7a. Create a Service Account in GCP

1. In [Google Cloud Console](https://console.cloud.google.com/), make sure you're in the **HS SEO Tools** project
2. Go to **IAM & Admin → Service Accounts** (left sidebar)
3. Click **"+ Create Service Account"**
4. Fill in:
   - **Service account name:** `hs-seo-indexing` (or any name)
   - **Service account ID:** auto-filled
5. Click **"Create and continue"**
6. Skip the optional role assignment steps — click **"Done"**
7. You'll see your new service account in the list
8. **Copy the service account email** — it looks like:
   ```
   hs-seo-indexing@your-project-id.iam.gserviceaccount.com
   ```

### 7b. Add Service Account as Owner in Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console/)
2. Select the **property** you want to submit URLs for
3. Click **⚙️ Settings** (bottom-left sidebar)
4. Click **"Users and permissions"**
5. Click **"Add user"**
6. Paste the **service account email** from Step 7a
7. Set the permission to **"Owner"** 
8. Click **"Add"**

> ⚠️ You must repeat Steps 7b for **each GSC property** you want to use Instant Indexing for.

### 7c. Using Instant Indexing

1. Click **HS SEO Tool → GSC**
2. Select your **GSC property** from the dropdown
3. Click the **"Instant Index"** tab
4. Choose action: **"Submit for Indexing"** or **"Remove from Index"**
5. Click **"+ Add URLs"** and paste your URLs (one per line)
6. Click **"Submit URLs"**

Results are written to the `Instant Index` sheet with status for each URL.

> **Quota:** Google allows **200 URL submissions per day per property**.

---

## 🔧 Alternative: Manual Installation (without template)

<details>
<summary><b>Click to expand — set up from scratch</b></summary>

### Manual Setup (~20 minutes)

1. **Download all files from GitHub** at [github.com/hs-builds/hs-seo-tools](https://github.com/hs-builds/hs-seo-tools):

   | File | Type |
   |---|---|
   | `Code.gs` | Script — Menu setup |
   | `GSC.gs` | Script — GSC + Instant Indexing backend |
   | `UI.html` | HTML — GSC module UI |
   | `GA4.html` | HTML — GA4 module UI |
   | `ga4.gs` | Script — GA4 backend |
   | `ad.html` | HTML — Ads Volume module UI |
   | `ads.gs` | Script — Google Ads backend |
   | `appscript.json` | JSON — OAuth scopes manifest |

2. **Create a new Google Sheet** at [sheets.google.com](https://sheets.google.com)

3. **Open Apps Script:** Extensions → Apps Script

4. **Add each file:**
   - Delete the default `Code.gs`
   - Click **"+"** next to Files → add `.gs` files as **Script**, `.html` files as **HTML**
   - For `appscript.json`: go to ⚙️ Project Settings → enable **"Show 'appsscript.json' manifest file in editor"** → paste the file contents

5. **Follow Steps 2–7 above** to connect GCP, authorize, and configure each module

</details>

---

## 🐛 Troubleshooting

### "HS SEO Tool" menu doesn't appear
- Refresh the sheet (F5) and wait 20 seconds
- Go to Extensions → Apps Script → run `onOpen` manually → return and refresh

### "Authorization required" keeps appearing
- Run `onOpen` manually in Apps Script and complete the full auth flow
- Check that your account is listed in the OAuth Consent Screen test users

### GSC: No properties showing
- Confirm **Google Search Console API** is enabled in GCP (Step 2b)
- Verify you have access to the property in [search.google.com/search-console](https://search.google.com/search-console)
- Re-authorize and wait 2–3 minutes for caching

### GA4: No properties in dropdown
- Confirm **Google Analytics Admin API** and **Google Analytics Data API** are both enabled in GCP
- Re-authorize the script — GA4 scopes may not have been granted on first auth
- Verify your Google account has access to at least one GA4 property

### Instant Indexing: 403 Forbidden on all URLs
- The service account email has **not been added as Owner** in GSC — follow Step 7b
- Double-check the service account email is exact (copy-paste from GCP, don't retype)
- Ensure you selected **"Owner"** — not Editor or Restricted

### Instant Indexing: 429 Quota Exceeded
- You've hit the **200 URLs/day limit** for this property
- Wait until the next calendar day (quota resets at midnight Pacific Time)

### Google Ads: "Invalid or unapproved Developer Token"
- Copy the token exactly from Google Ads → Tools → API Center — no extra spaces
- If your token is in test mode, it only works with your own MCC accounts (not external clients)
- Apply for Basic Access at the same API Center page for production use

### Google Ads: "No accounts found" after Load Accounts
- MCC Account ID must be **numbers only** — remove all dashes (e.g. `1234567890` not `123-456-7890`)
- Confirm the Developer Token belongs to the same MCC account
- Only **ENABLED** accounts appear — paused or cancelled accounts are filtered out

### Google Ads: Wrong currency for bids
- Set the correct **Location** before fetching — currency is determined by the selected country

---

## ⏱️ Setup Time Summary

| Task | Time |
|---|---|
| Copy template | 1 min |
| Create GCP project + enable APIs | 5 min |
| Link sheet to GCP | 1 min |
| Authorize script | 2 min |
| GA4: verify properties load | 1 min |
| Google Ads: get Developer Token + MCC ID | 2 min |
| Instant Indexing: create Service Account + add to GSC | 3 min |
| **Total** | **~15 minutes** |

---

**Need help?**
- 🐛 [Open an issue on GitHub](https://github.com/hs-builds/hs-seo-tools/issues)
- 💬 [LinkedIn Documentation](https://www.linkedin.com/pulse/stop-wasting-hours-copying-data-from-google-search-console-harsh-shah-zyppf/)

---

**All set! 🎉** GSC, GA4, Google Ads, and Instant Indexing are all running inside your Google Sheets.
