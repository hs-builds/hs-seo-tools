# HS SEO Tools — Google Search Console + GA4 + Google Ads for Google Sheets

A powerful, free Google Sheets add-on that solves Google Search Console's averaging problem and provides advanced SEO, analytics, and keyword research capabilities.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?logo=google&logoColor=white)](https://script.google.com)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/hs-builds/hs-seo-tools/issues)
[![Version](https://img.shields.io/badge/version-3.0.0-black)](https://github.com/hs-builds/hs-seo-tools/releases)

## ✨ Features

### 🔵 GA4 Analytics Module *(New in v3.0)*
- **7-Tab Coverage**: One sidebar for your entire GA4 data stack — Traffic, Audience, Pages, Events, Ecommerce, LLM, and UTM
- **Traffic Analysis**: Pull sessions, users, bounce rate, engaged sessions, and avg. session duration; group by Channel, Source, Medium, or Campaign in one click
- **Audience Insights**: Break down your audience by country, device category, operating system, and browser
- **Page Performance**: Identify your top pages by views, entrances, scroll depth, and time on page
- **Event Tracking**: Export any custom GA4 event with its count and value directly into Sheets
- **Ecommerce Reporting**: Revenue, transactions, conversion rate, and ROAS without leaving Sheets
- **LLM Traffic Detection**: See exactly how much traffic you’re getting from ChatGPT, Perplexity, Gemini, Claude, and other AI tools
- **UTM Campaign Reporting**: Full UTM breakdown — source, medium, campaign, content, and term in one export
- **Flexible Date Ranges**: Last 7 / 28 / 30 / 90 days, Last 6 / 12 months, or fully custom date / month range
- **Channel Filter**: Isolate organic, paid, referral, or any specific channel without writing a filter manually
- **Daily Breakdown Mode**: Add a Date column to turn any report into a time-series dataset
- **Key Events as Columns**: Optionally pull conversion counts alongside any metric for a complete picture
- **Accordion UI**: Clean metric and dimension pickers that stay out of the way until you need them
- **Dedicated Output Tabs**: Results written to named sheet tabs (`GA4 Traffic`, `GA4 Pages`, etc.) — never overwrites your raw data

### 🟡 Google Ads Module *(New in v3.0)*
- **Bulk Keyword Volume**: Fetch search volume for up to 5,000 keywords in a single API call — no manual lookups
- **Full Metrics Set**: Avg Monthly Searches, Competition, Competition Index, Low Bid, High Bid for every keyword
- **KW Magic Tool**: Enter one seed keyword and generate hundreds of related keyword ideas instantly via the Google Ads `generateKeywordIdeas` API
- **Historical Monthly Data**: Choose Past 3, 6, 12, or 24 months — or set a custom start/end month — to pull month-by-month search trend data
- **Local Currency Formatting**: Bid estimates automatically display in the correct local currency (₹ INR, £ GBP, € EUR, ¥ JPY, AU$, CA$, and more) based on your selected country
- **Multi-Account MCC Support**: Load all ENABLED sub-accounts under your Manager Account with one click; switch between clients without re-entering credentials
- **13 Countries + 12 Languages**: India, US, UK, Australia, Canada, Germany, France, UAE, and more — covered out of the box
- **Credentials Saved Per Session**: Enter your Developer Token and MCC ID once in the collapsible ⚙️ API Credentials panel — they persist until you close the sidebar
- **Direct API Integration**: Talks directly to the Google Ads API v24 — no third-party tools, no data leaving your account

### 🎯 Smart Keyword Tracker
- **Intelligent Position Calculation**: Shows your best-performing page’s actual rank — not the misleading average GSC shows when multiple pages rank for the same keyword
- **Cannibalization Detection**: Automatically identifies when multiple pages compete for the same keyword and generates a dedicated Cannibalization Report sheet
- **Historical Tracking**: Track unlimited keywords across any date range with no row limits
- **Volatility Alerts**: Auto-highlights ranking changes >5 positions (green = improved, red = dropped) so you spot opportunities and losses instantly
- **Country-Specific Tracking**: Filter by country to track rankings in specific markets for international SEO
- **Ranking URL Fetcher**: Automatically populates Column B with the primary ranking URL for each keyword — no manual lookup needed
- **Auto-Resume on Timeout**: Checkpoint-based architecture saves progress after every month; a Resume button appears if the script times out so you never lose work

### 📈 URL Performance Tracker
- **Monitor Landing Pages Over Time**: Track any set of URLs across multiple months in a single run — 75% faster than running one month at a time
- **Full Metric Suite**: Clicks, Impressions, CTR, and Average Position for every URL in your list
- **Last Crawl Date**: See exactly when Googlebot last crawled each URL via the URL Inspection API
- **Indexation Status**: Instantly flag which URLs are indexed and which are not — at scale
- **Customizable Metrics**: Choose exactly which metrics to export; skip what you don’t need for 60% faster runs
- **Server-Side Row Filtering**: Filter results before they’re written to the sheet — use operators like ≥, ≤, =, ≠ on Clicks, Impressions, or Position
- **Country and Search Type Filtering**: Scope data to a specific country or search type (Web, Image, Video, News)
- **Multi-Month in One Run**: Select 1–12 months simultaneously; the tool processes and writes all of them in sequence automatically

### 📊 Advanced GSC Data Export
- **Unlimited Dimension Combinations**: Query, Page, Country, Device, Date, and Search Appearance — combine any of them freely
- **8 Built-in Regex Presets**: One-click filters for Long-tail (5+ words), How-to, Questions, Commercial intent, Comparisons, Local intent, Freshness queries, and Non-English characters
- **Custom Regex Filtering**: Write your own regex patterns and stack multiple filters in a single export
- **All Search Types**: Web, Image, Video, and News — all supported
- **Handles 25,000+ Rows**: Automatic pagination handles large datasets without any manual intervention
- **6-Operator Row Filtering**: Filter results with =, ≠, >, ≥, <, ≤ on Clicks, Impressions, or Position before writing to the sheet

### ⚡ Instant Indexing Module
- **One-Click URL Submission**: Submit any URL to Google’s indexing queue directly from Sheets — no Search Console dashboard needed
- **Bulk Submissions**: Paste a list of URLs and submit them all in one run — ideal for new content, redirects, and canonical changes
- **Status Check**: See the current indexing status of any URL without leaving your spreadsheet
- **Notification API Integration**: Uses Google’s Indexing API (originally for job postings) to trigger crawl requests — one of the fastest ways to get pages indexed
- **Progress Tracking**: Real-time status updates as each URL is submitted, with success and error reporting per URL
- **Handles Large Batches**: Submit dozens of URLs in sequence with built-in rate limiting to stay within API quotas

## 🚀 Installation

Refer this guide - https://github.com/hs-builds/hs-seo-tools/blob/main/Installation.md

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Report bugs**: Open an issue with detailed steps to reproduce
2. **Suggest features**: Open an issue with your idea
3. **Submit PRs**: Fork, create a branch, make changes, submit PR
4. **Improve docs**: Help make installation/usage clearer

### Development Setup

1. Fork this repository
2. Make changes in your Google Apps Script project
3. Test thoroughly with your own GSC data
4. Update documentation if needed
5. Submit PR with clear description

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built to solve real SEO workflow challenges. Inspired by the limitations of Google Search Console's averaging logic.

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/hs-builds/hs-seo-tools/issues)
- **LinkedIn Article**: [Full Documentation](https://www.linkedin.com/pulse/stop-wasting-hours-copying-data-from-google-search-console-harsh-shah-zyppf/)

## 💰 Cost

**Free forever.** Open source and self-hosted.

**Comparable paid tools:**
- Rank tracker: $50-200/month
- GSC data exporter: $30-100/month
- Cannibalization analyzer: $50+/month
- **Total value**: $150-400/month
- **Your cost**: $0

## ⭐ Show Your Support

If this tool helped you, please:
- Star this repository
- Share with other SEO professionals
- Contribute improvements
- Report bugs

## 📸 Screenshots

### GSC 
<img width="1529" height="1321" alt="GSC Keyword Tracker Tool Screenshot" src="https://github.com/user-attachments/assets/93a8b1dd-d00c-43f8-a960-cf098fa8e1ae" />

### Instant Indexing
<img width="1498" height="1141" alt="image" src="https://github.com/user-attachments/assets/e2de9891-44f8-4f6c-bd67-e463d6fe9d06" />

### GA4 Traffic
<img width="1538" height="1235" alt="GA4 Traffic" src="https://github.com/user-attachments/assets/623b8db9-c1bc-45c8-ac9c-aa2457baee10" />

### Google Ads Keyword Checker
<img width="1536" height="1207" alt="image" src="https://github.com/user-attachments/assets/2e8d844b-60f1-4fc2-933f-890f61c484e0" />


---

**Built with ❤️ for the SEO community**

*Made by [HarsH Shah](https://www.linkedin.com/in/shah-harsh02/) | [LinkedIn Article](https://www.linkedin.com/pulse/stop-wasting-hours-copying-data-from-google-search-console-harsh-shah-zyppf/)*
