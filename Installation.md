
# Installation Guide - HS SEO Tools v2.0

Complete step-by-step guide to install HS SEO Tools in your Google Sheets.

## 🚀 Quick Installation (Recommended - 5 Minutes)

The easiest way to get started is to **copy our pre-configured template**.

### Prerequisites

Before you begin, make sure you have:
- ✅ Google Account (Gmail or Google Workspace)
- ✅ Access to Google Search Console for the property you want to track
- ✅ 2-5 minutes of setup time (one-time only)

---

## Step 1: Make a Copy of the Template

**This is the easiest method - all code is already included!**

1. **Click this link:**
   ```
   https://docs.google.com/spreadsheets/d/1E6hAVnJhoTOxli6bBm69VemfiwmxFqdWqlvDXiegAyo/copy
   ```

2. **You'll see "Copy document" screen**
   - Notice: "The attached Apps Script file and functionality will also be copied"
   - Click **"Make a copy"**

3. **Your copy is created!**
   - Google Sheets opens with your copy
   - All code files are automatically included
   - The sheet is ready to configure

**✅ Code is already installed! You just need to set up Google Cloud Project.**

---

## Step 2: Create Google Cloud Project

### 2.1: Create the Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create New Project**
   - Click the project dropdown at the top
   - Click **"New Project"**
   - Project name: `HS SEO Tools` (or any name you prefer)
   - Click **"Create"**
   - Wait for project creation

3. **Note Your Project Number**
   - Once created, go to **Dashboard**
   - Find and **copy your Project Number**
   - Example: `123456789012`
   - **Keep this handy - you'll need it soon!**

### 2.2: Enable Required APIs

1. **Go to APIs & Services**
   - In the left sidebar, click **"APIs & Services" > "Library"**

2. **Enable Google Search Console API**
   - Search for: `Google Search Console API`
   - Click on it
   - Click **"Enable"**
   - Wait for confirmation

3. **Enable Google Sheets API**
   - Click **"APIs & Services" > "Library"** again
   - Search for: `Google Sheets API`
   - Click on it
   - Click **"Enable"**
   - Wait for confirmation

**✅ Google Cloud Project is ready!**

---

## Step 3: Link Your Sheet to Google Cloud Project

Now connect your copied sheet to the Google Cloud Project.

1. **Open Your Copied Sheet**
   - The sheet you created in Step 1

2. **Open Apps Script**
   - Go to **Extensions > Apps Script**
   - The Apps Script editor opens (code is already there!)

3. **Open Project Settings**
   - Click **Project Settings** icon (⚙️) in left sidebar

4. **Link to Google Cloud Project**
   - Scroll down to **"Google Cloud Platform (GCP) Project"**
   - Click **"Change project"**
   - Enter your **Project Number** (from Step 2.1)
   - Click **"Set project"**

5. **Verify Connection**
   - You should see: "This script is currently associated with project: [Your Project Name]"

**✅ Sheet is connected to Google Cloud Project!**

---

## Step 4: Authorize and Test

### 4.1: First Authorization

1. **In Apps Script editor**
   - Select `onOpen` from function dropdown (at top)
   - Click **Run** (▶️ button)

2. **Review Permissions**
   - First time: "Authorization required" appears
   - Click **"Review permissions"**
   - Choose your Google account
   - Click **"Advanced"**
   - Click **"Go to HS SEO Tools (unsafe)"** (this is your own script, it's safe!)
   - Click **"Allow"**

3. **Wait for Execution**
   - Execution completes (green checkmark)

**✅ Script is authorized!**

### 4.2: Test in Google Sheet

1. **Close Apps Script editor**
   - Return to your Google Sheet

2. **Refresh the Sheet**
   - Press **F5** or reload the page
   - Wait 10-20 seconds

3. **Check for Menu**
   - Look for **"HS SEO Tools"** in the top menu bar
   - It should appear next to Help

4. **Open the Tool**
   - Click **HS SEO Tools > GSC**
   - Sidebar opens on the right

5. **Verify GSC Properties Load**
   - You should see a dropdown with your GSC properties
   - If you see your websites, **setup is complete!** 🎉

---


## 🔧 Alternative: Manual Installation

If you prefer to set up from scratch instead of copying the template:

<details>
<summary><b>Click to expand manual installation steps</b></summary>

### Manual Setup (20 minutes)

1. **Download the code files:**
   - Visit: https://github.com/hs-builds/hs-seo-tools
   - Download: `code.gs`, `GSC.gs`, `UI.html`, `ComingSoon.html`, `appsscript.json`

2. **Create a Google Sheet:**
   - Create new sheet at https://sheets.google.com
   - Go to **Extensions > Apps Script**

3. **Add each file:**
   - Delete default `Code.gs`
   - Click **"+"** next to Files
   - Add each downloaded file (Script or HTML as appropriate)
   - For `appsscript.json`: Enable "Show manifest file" in Settings first

4. **Link to Google Cloud Project:**
   - Follow Step 3 above (Project Settings)

5. **Authorize and test:**
   - Follow Step 4 above

</details>

---

## 📖 Using the Tool

### Keyword Tracker Mode

**Run the tracker:**
1. Go to **HS SEO Tools > GSC**
2. Select your GSC property
3. Choose date range
4. Enable options:
   - ☑️ Fetch Ranking URLs (populates Column B)
   - ☑️ Generate Cannibalization Report
5. Click **"Update"**

**Interpret results:**
- **Green cells**: Ranking improved >5 positions
- **Red cells**: Ranking dropped >5 positions
- **Numbers**: Actual position of best-performing page
- **Cannibalization Report**: Shows all pages competing for each keyword

### URL Tracker Mode

**Run:**
1. Click **HS SEO Tools > GSC**
2. Switch to **"URL Tracker"** tab
3. Select GSC property
4. Choose 1-12 months
5. Select metrics (clicks, impressions, CTR, position, etc.)
6. Click **"Update"**

**New in v2.0:**
- Track multiple months in one run
- Choose specific metrics
- Last Crawl Date available
- Indexation Status available

### Advanced Export Mode

**Use for:**
- Complex data exports
- Query filtering with regex
- Multi-dimension analysis
- Finding quick wins

**Run:**
1. Click **HS SEO Tools > GSC**
2. Switch to **"Advanced"** tab
3. Select GSC property
4. Choose date range
5. Select dimensions (Query, Page, Country, etc.)
6. Optional: Configure row filters (Clicks ≥ 100, Position ≤ 20)
7. Click **"Fetch Data"**

**Results appear in "GSC Data" sheet**

---

## 🐛 Troubleshooting

### "HS SEO Tools" menu doesn't appear

**Solution:**
1. Refresh the Google Sheet (F5)
2. Wait 30 seconds
3. Clear browser cache
4. Try incognito/private mode
5. Check Apps Script editor for errors

### "Authorization required" won't go away

**Solution:**
1. Go to Apps Script editor
2. Click **Run** (▶️) on `onOpen` manually
3. Complete authorization flow
4. Return to Sheet and refresh

### "Cannot read property 'siteUrl'"

**Solution:**
1. Verify Google Search Console API is enabled
2. Check OAuth scopes in `appsscript.json`
3. Re-authorize the script
4. Wait 2-3 minutes for API activation

### No GSC properties showing

**Solution:**
1. Verify you have access in Google Search Console
2. Check Search Console API is enabled
3. Re-authorize with correct Google account
4. Wait 2-3 minutes (caching delay)

### Rankings showing as 0

**Solution:**
1. Verify keywords actually rank in GSC
2. Check date range (not future dates)
3. Verify GSC property has data for date range
4. Try with a keyword you know ranks

### Slow performance

**Solution:**
1. Process keywords in batches (500-1000)
2. Reduce date range
3. Check internet connection
4. Avoid peak hours

---

## ⏱️ Setup Time Summary

**Quick Installation (Template Copy):**
- Step 1: Copy template (1 min)
- Step 2: Create GCP project (5 min)
- Step 3: Link project (2 min)
- Step 4: Authorize (2 min)
- **Total: ~10 minutes**

**Manual Installation:**
- Download files (2 min)
- Create Apps Script project (3 min)
- Add files (5 min)
- Create GCP project (5 min)
- Link and authorize (5 min)
- **Total: ~20 minutes**

---

If you're stuck:

1. **Check existing issues**: https://github.com/hs-builds/hs-seo-tools/issues
2. **Open a new issue**: Include error messages and screenshots
3. **LinkedIn**: [Full Documentation](https://www.linkedin.com/pulse/stop-wasting-hours-copying-data-from-google-search-console-harsh-shah-zyppf/)

---

**Setup is complete!** You can now track unlimited keywords, monitor URLs, and export any GSC data combination you need. 🎉

Good luck! 🚀
