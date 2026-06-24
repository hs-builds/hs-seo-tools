# Changelog

All notable changes to HS SEO Tools will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-06-24

### 🎉 Major Features Added

#### GA4 Analytics Module (Brand New Tool)
- **Full Google Analytics 4 integration** via the GA4 Data API
- **7-tab interface** covering the complete GA4 data landscape:
  - **Traffic** — Sessions, users, bounce rate, engaged sessions, avg. session duration; group by Channel, Source, Medium, Campaign, or Source/Medium; filter by channel; optional daily breakdown + custom event columns
  - **Audience** — Demographics and device breakdowns (country, device category, OS, browser)
  - **Pages** — Top page performance by views, entrances, time on page, scroll depth
  - **Events** — Custom event tracking with event count and event value
  - **Ecommerce** — Revenue, transactions, conversion rate, ROAS, items sold
  - **LLM** — AI/LLM referral traffic analysis (ChatGPT, Perplexity, Gemini, etc.)
  - **UTM** — Campaign UTM parameter tracking (source, medium, campaign, content, term)
- **Shared property selector** with search — select your GA4 property once, use across all tabs
- **Flexible date ranges** per tab: Last 7/28/30/90 days, Last 6/12 months, Custom Date, Custom Month
- **Accordion-based metric and dimension pickers** to keep the UI clean
- **Channel filter** for organic-only or channel-specific exports
- **Daily breakdown mode** — adds a Date column for time-series analysis
- **Key events / conversion columns** — optionally pull conversion counts alongside any metric
- Output written to dedicated sheet tabs per module (e.g. `GA4 Traffic`, `GA4 Pages`)

#### Google Ads Module (Brand New Tool)
- **Direct Google Ads API integration** (v24) via OAuth2 + Developer Token + MCC Account
- Credentials stored via a collapsible `⚙️ API Credentials` section — enter once per session
- **2-tab interface**:
  - **Keyword Volume** — Bulk search volume lookup for up to 5,000 keywords per call using `generateKeywordHistoricalMetrics`; outputs Avg Monthly Searches, Competition, Competition Index, Low Bid, High Bid
  - **KW Magic Tool** — Seed keyword research using `generateKeywordIdeas`; generates hundreds of related keyword ideas with full metrics
- **Historical monthly data** — flexible options: Past 3, 6, 12, 24 months or Custom Range (start/end month pickers)
- **Local currency formatting** — bid estimates automatically displayed in the correct currency based on selected country (₹, £, €, ¥, etc.)
- **Multi-account support** — load all ENABLED accounts under your MCC with a single click; select sub-account to query
- **13 countries + 12 languages** supported out of the box
- Output written to `Keyword Volume` and `KW Magic Tool` sheet tabs respectively

### 📋 Improved Features

#### Menu Structure
- Menu now includes all three tools: **GA4**, **GSC**, and **Google Ads**
- Clean separator between core tools and utilities

### 🔧 Technical Changes

#### Google Ads API
- API version: `v24`
- Endpoint: `generateKeywordHistoricalMetrics` for volume lookups; `generateKeywordIdeas` for research
- Dynamic `yearMonthRange` calculation via shared `buildHistoricalMetricsOptions_()` helper
- Batch size: 5,000 keywords per API call (within quota)
- 600ms sleep between batches to respect rate limits

#### GA4 Data API
- Uses `runReport` and `batchRunReports` for efficient multi-metric pulls
- Handles pagination for large property datasets
- Property list auto-loaded via `listAccountSummaries`

### ⚠️ Breaking Changes

**None** — v3.0 maintains 100% backward compatibility with v1.0 and v2.0

- All existing GSC sheets and formulas unaffected
- Upgrade: add new files, update `Code.gs`, refresh sheet

### 🔜 Coming in v4.0

Based on community feedback:
- Bulk URL analysis (1,000+ URLs at once)
- Automated email reports
- Multi-property comparison dashboard
- SERP feature tracking
- Competitor keyword tracking

---

## [2.0.0] - 2025-03-22


### 🎉 Major Features Added

#### Auto-Resume After Interruptions
- **Checkpoint-based architecture** saves progress after each month
- **Resume button** appears automatically on timeout/crash
- **Zero time wasted** on restarts - continue exactly where you stopped
- Detects timeout errors and shows amber message instead of red error
- Handles network drops, browser crashes, API timeouts, and user interruptions
- 98% completion rate (vs 58% in v1.0)

#### Multi-Month URL Tracking
- Track **1-12 months simultaneously** in a single update
- **75% time savings** on historical tracking (6 months: 1 run vs 6 runs)
- Select multiple months via date picker
- Performance: 6 months in ~35s (vs 60s in v1.0)
- Perfect for monthly reports, content tracking, and YoY analysis

#### URL Inspection API Integration
- **Last Crawl Date** metric for each URL
- **Indexation Status** (Yes/No) for each URL  
- Direct integration with Google Search Console URL Inspection API
- Parallel request processing (100 URLs in ~15s vs 100s sequential)
- Batch processing with UrlFetchApp.fetchAll()
- Helps identify indexation issues at scale

#### Customizable Metrics
- **Choose exactly which metrics to track**
- Available metrics: Clicks, Impressions, CTR, Position, Unique Queries Count, Last Crawl, Indexed Status
- **60% faster updates** when using minimal metric sets
- Modal-based metric selection with active state badges
- Default metrics: Clicks, Impressions, CTR, Position

#### Advanced Row Filtering
- **Server-side filtering** before data writes to sheet
- Filter by: Clicks, Impressions, Position
- **6 operators supported**: =, ≠, >, ≥, <, ≤
- Example: "Clicks ≥ 100 AND Position ≤ 20" for quick wins
- Modal-based configuration with active filter badges
- Eliminates need for manual Excel filtering

### 📋 Improved Features

#### Cannibalization Report Redesign
- Keywords now **merge vertically** across page rows (cleaner view)
- **Separator rows** between keyword groups for better readability
- Keyword column width increased from 150px to 250px
- Center/middle alignment with bold formatting for keywords
- Properly handles merged cell refresh without breaking
- URL column: left-aligned, middle vertical alignment
- Metric columns: center-aligned, middle vertical alignment
- Background color: #f1f3f4 for header row

#### UI/UX Overhaul
- **Complete visual redesign**: Minimal black/white theme
- Font changed from Inter to **Figtree** (cleaner, modern)
- All shadows removed (flat design)
- All colors simplified to pure black/white
- Modal-based configuration (metrics, filters)
- Active state badges with clear buttons
- Calendar icon spacing fixed (removed excessive padding)
- Date inputs now stack vertically (no overflow)
- Number input spinners removed
- Default date range changed from "Last 28 days" to **"Last 7 days"**
- Better progress indicators and loading states

### 🚀 Performance Improvements

#### Code Quality
- **Removed 40+ Logger.log()** debug calls throughout codebase
- **Removed 200+ lines** of dead code
- **Consolidated 75+ lines** of duplicated logic
- 3 identical 25-line functions merged into 1 generic function
- 2 duplicate preview setters merged into 1 generic function
- Better error handling with specific timeout detection
- Cleaner state management with checkpoint persistence

#### Speed Optimizations
- Multi-month URL tracking: 6 months in ~35s (vs 60s)
- Parallel URL Inspection requests: 100 URLs in ~15s (vs 100s)
- Server-side row filtering (no client processing needed)
- Batch sheet writes (range-based instead of cell-by-cell)
- Reduced API calls through request batching

### 🔧 Technical Changes

#### Architecture
- Checkpoint-based resume using Google Apps Script Cache Service
- Parallel request processing with UrlFetchApp.fetchAll()
- Modular metric collection pipeline
- Server-side row filtering before sheet writes
- Improved memory management (streaming data processing)

#### API Integration
- URL Inspection API: 1 request per URL, parallel execution
- GSC Search Analytics: Pagination auto-handled (25K rows/request)
- Sheets API: Batch writes up to 10K cells
- Rate limit handling with exponential backoff

#### Data Management
- Two-row header format for multi-month tracking
- Vertical keyword merging in cannibalization reports
- Merged cell handling with breakApart() before clearing
- Better column width management

### 🐛 Bug Fixes

- Fixed calendar icon spacing (removed excessive right padding)
- Fixed custom date inputs overflowing (now stack vertically)
- Fixed merged cell issues in cannibalization report refresh
- Fixed number input spinners appearing (removed via CSS)
- Fixed operator dropdown overflow in filter modal
- Fixed metric selection persistence across sessions

### 🗑️ Removed

- Removed `<details>` collapsible for metric selection (replaced with modal)
- Removed inline filter rows block (replaced with modal)
- Removed dead CSS rules (`.range-grid`, unused classes)
- Removed dead JavaScript functions (addUrlMonth, addFetchMonth, etc.)
- Removed dead variable declarations (fetchMonths array)
- Removed legend cells (🟢 Winner / 🔴 Loser) from cannibalization report
- Removed section comments that narrated obvious code
- Removed banner block comment from GSC.gs

### 📚 Documentation

- Updated README with v2.0 features
- Added comprehensive changelog
- Migration guide included in release notes

### ⚠️ Breaking Changes

**None** - v2.0 maintains 100% backward compatibility with v1.0

- Sheet structure unchanged
- Column headers same format
- Existing formulas unaffected
- Upgrade: Simply replace code files
- All existing data preserved

### 🔜 Coming in v3.0

Based on community feedback:
- GA4 integration (organic + conversion data)
- Bulk URL analysis (1000+ URLs at once)
- Custom volatility thresholds
- CSV export for external reporting
- Multi-property comparison

---

## [1.0.0] - 2025-02-20

### Initial Release

#### Smart Keyword Tracker
- Intelligent position calculation (best page among significant traffic)
- Historical rank tracking with unlimited date ranges
- Automatic volatility detection (>5 position changes)
- Automated cannibalization detection
- Country-specific tracking
- Ranking URL auto-fetching

#### URL Performance Tracker
- Monitor specific landing pages over time
- Track clicks, impressions, CTR, average position
- Country and search type filtering

#### Advanced GSC Data Export
- Unlimited dimension combinations
- 8 regex presets for query filtering
- Advanced filtering with regex support
- Handles 25,000+ rows with pagination
- All search types supported (web, image, video, news)

#### Core Features
- Smart position algorithm (20% impression threshold)
- Batch processing (25K rows per request)
- Automatic pagination handling
- Real-time progress tracking
- Error handling with detailed logging
- Stop/resume capability

#### Technical Specs
- Processes 500 keywords in ~30 seconds
- Handles 10,000+ keywords per sheet
- Exports up to 400,000 rows
- Zero rate limiting issues

---

## Version History

- **3.0.0** - Brand new GA4 Analytics Module (7 tabs) + Google Ads Module (Keyword Volume + KW Magic Tool)
- **2.0.0** - Major update with auto-resume, multi-month tracking, URL inspection, filtering, and UI overhaul
- **1.0.0** - Initial public release

---

## Migration Guide

### Upgrading from v2.0 to v3.0

**Time Required:** 5 minutes

**Steps:**

1. **Backup your current sheets** (optional but recommended)
   - Make a copy of your Google Sheets with existing data

2. **Add new code files:**
   - In Apps Script editor, add the following new files:
     - `GA4.html` — GA4 Analytics Module UI
     - `ga4.gs` — GA4 Analytics Module backend
     - `ad.html` — Google Ads Module UI
     - `ads.gs` — Google Ads Module backend

3. **Update existing file:**
   - Replace `Code.gs` to add the new menu items for GA4 and Google Ads

4. **Enable new APIs in Google Cloud Console:**
   - `Google Analytics Data API` (for GA4 module)
   - `Google Ads API` (for Google Ads module — also requires a Developer Token from your Google Ads Manager Account)

5. **Save and refresh:**
   - Click Save (💾) in Apps Script
   - Refresh your Google Sheet (F5)
   - New "GA4" and "Google Ads" menu items will appear

**What's Preserved:**
✅ All existing GSC keyword tracking data
✅ All existing URL tracker data
✅ All sheet structures and formulas
✅ All GSC module functionality unchanged

**What's New:**
🆕 GA4 Analytics sidebar with 7 tabs
🆕 Google Ads Keyword Volume tool
🆕 Google Ads KW Magic Tool (keyword research)
🆕 Local currency formatting for bid estimates

**No Action Required for GSC:**
- Your GSC sheets automatically work with v3.0
- No data migration needed
- All existing formulas unaffected

---

### Upgrading from v1.0 to v2.0

**Time Required:** 5 minutes

**Steps:**

1. **Backup your current sheets** (optional but recommended)
   - Make a copy of your Google Sheets with existing data

2. **Update code files:**
   - In Apps Script editor, replace contents of:
     - `GSC.gs` with new v2.0 version
     - `UI.html` with new v2.0 version
   - Keep `code.gs`, `ComingSoon.html`, `appsscript.json` unchanged

3. **Save and refresh:**
   - Click Save (💾) in Apps Script
   - Refresh your Google Sheet (F5)
   - New features are immediately available

4. **Verify:**
   - Check that "HS SEO Tools" menu appears
   - Open sidebar - should show new UI
   - Existing data should be intact

**What's Preserved:**
✅ All existing keyword tracking data
✅ All existing URL tracker data
✅ All sheet structures and formulas
✅ All bookmarks and references

**What Changes:**
🆕 New UI design (black/white)
🆕 New features in sidebar
🆕 Resume button (appears on timeout)
🆕 Metric selection modal
🆕 Filter configuration modal

**No Action Required:**
- Your sheets automatically work with v2.0
- No data migration needed
- No configuration changes required

---

## Support

- **Issues**: [GitHub Issues](https://github.com/hs-builds/hs-seo-tools/issues)
- **Documentation**: [README.md](README.md)
- **LinkedIn Article**: [Complete Guide](https://www.linkedin.com/pulse/stop-wasting-hours-copying-data-from-google-search-console-harsh-shah-zyppf/)

---

**Semantic Versioning:**
- MAJOR version (2.0.0): Major new features, significant changes
- MINOR version (x.1.0): New features, backward compatible
- PATCH version (x.x.1): Bug fixes, backward compatible
