# HS SEO Tools - Google Search Console Integration for Google Sheets

A powerful, free Google Sheets add-on that solves Google Search Console's averaging problem and provides advanced SEO data analysis capabilities.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?logo=google&logoColor=white)](https://script.google.com)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/yourusername/hs-seo-tools/issues)

## 🎯 The Problem This Solves

When multiple pages rank for the same keyword, Google Search Console shows you an **average position** across all pages. This creates:

- ❌ Misleading performance data (you think you're at #10, but you're actually at #2)
- ❌ Hidden cannibalization issues
- ❌ False ranking drop alerts
- ❌ Wasted optimization efforts

**Example:**
- Your main page ranks at position **2.1** (150 impressions)
- Old blog post ranks at position **18.5** (25 impressions)
- **GSC shows:** Position **10.3** (misleading average!)
- **HS SEO Tools shows:** Position **2.1** (actual best page)

## ✨ Features

### 🎯 Smart Keyword Tracker
- **Intelligent Position Calculation**: Shows your best-performing page's actual rank (not GSC averages)
- **Cannibalization Detection**: Automatically identifies when multiple pages compete for the same keyword
- **Historical Tracking**: Unlimited keywords across any date range
- **Volatility Alerts**: Auto-highlights ranking changes >5 positions (green = up, red = down)
- **Country-Specific Tracking**: Track rankings by country for international SEO
- **Ranking URL Fetcher**: Automatically populates the primary ranking URL for each keyword

### 📈 URL Performance Tracker
- Monitor specific landing pages over time
- Track clicks, impressions, CTR, and average position
- Country and search type filtering
- Perfect for measuring content update impact

### 📊 Advanced GSC Data Export
- **Unlimited Dimension Combinations**: Query + Page + Country + Device + Date + Search Appearance
- **8 Built-in Regex Presets**:
  - Long-tail keywords (5+ words)
  - How-to queries
  - Question-based searches
  - Commercial intent keywords
  - Comparison searches
  - Local intent queries
  - Freshness queries
  - Non-English characters
- **Advanced Filtering**: Custom regex support with multiple filter combinations
- **All Search Types**: Web, Image, Video, News
- **Handles Large Datasets**: Automatic pagination for 25,000+ rows

## 🚀 Installation

Refer this guide - https://github.com/hs-builds/hs-seo-tools/blob/main/Installation.md

## 📖 Usage

### Keyword Tracker Mode

1. **Set up your sheet:**
   ```
   Column A: Keywords (starting from Row 2)
   Column B: (Optional - will be auto-populated with ranking URLs if enabled)
   Column C onwards: Date headers (e.g., "2025-01", "2025-02", or "01/01/2025-31/01/2025")
   ```

2. **Run the tracker:**
   - Go to **HS SEO Tools > GSC**
   - Select your GSC property
   - Choose date range
   - Enable options:
     - ☑️ Fetch Ranking URLs (populates Column B)
     - ☑️ Generate Cannibalization Report
   - Click **"Update"**

3. **Interpret results:**
   - **Green cells**: Ranking improved >5 positions
   - **Red cells**: Ranking dropped >5 positions
   - **Numbers**: Actual position of best-performing page
   - **Cannibalization Report sheet**: Shows all pages competing for each keyword

### URL Tracker Mode

1. **Set up your sheet:**
   ```
   Sheet name: "URL Tracker"
   Column A: URLs (starting from Row 2)
   ```

2. **Run the tracker:**
   - Go to **HS SEO Tools > GSC**
   - Switch to **"URL Tracker"** tab
   - Select GSC property
   - Choose date range
   - Click **"Update"**

3. **Results:**
   - Clicks, Impressions, CTR, and Average Position for each URL

### Advanced GSC Export Mode

1. **Access:**
   - Go to **HS SEO Tools > GSC**
   - Switch to **"Advanced"** tab

2. **Configure:**
   - Select GSC property
   - Choose search type (Web, Image, Video, News)
   - Select date range
   - Check dimensions to group by (Query, Page, Country, Device, etc.)
   - Add filters (optional):
     - Use regex presets for common patterns
     - Or add custom filters

3. **Export:**
   - Click **"Fetch Data"**
   - Results appear in "GSC Data" sheet

**Regex Preset Examples:**
- **Long-tail**: Finds keywords with 5+ words
- **Commercial**: Finds "best", "top", "vs", "review" keywords
- **Questions**: Finds "how", "what", "why" queries
- **Local**: Finds "near me", "nearby" searches

## 📊 Use Cases

### Finding Quick Wins
```
Advanced Export:
- Dimension: Query + Page
- Filter: Position between 11-20
- Filter: Impressions >100
→ Result: Keywords on page 2 with high visibility (easy ranking opportunities)
```

### Content Gap Analysis
```
Advanced Export:
- Regex Preset: "Questions"
- Dimension: Query
- Sort by: Impressions (descending)
→ Result: Question queries with high search volume (FAQ content ideas)
```

### Cannibalization Audit
```
Keyword Tracker:
- Enable "Cannibalization Report"
- Run on all keywords
→ Result: Detailed report showing competing pages for each keyword
```

### International SEO Tracking
```
Keyword Tracker:
- Country filter: "US"
- Track same keywords with different country filters
→ Result: Compare rankings across different markets
```

### Mobile vs Desktop Performance
```
Advanced Export:
- Dimensions: Query + Device
- Group by: Device
→ Result: See which keywords perform better on mobile vs desktop
```

## 🎨 Features in Detail

### Smart Position Algorithm

The tool uses a sophisticated algorithm to determine the "true" ranking:

1. **Calculate total impressions** across all pages for the keyword
2. **Set threshold**: Pages must have ≥20% of total impressions (minimum 5)
3. **Filter significant pages**: Only pages meeting the threshold
4. **Select best position**: Lowest position among significant pages

**Why this works:**
- Filters out noise from pages with 1-2 impressions
- Focuses on pages actually getting visibility
- Shows the position that matters for your business

### Volatility Detection

Automatically highlights significant ranking changes:
- **>5 positions improvement**: Green background
- **>5 positions drop**: Red background
- Configurable threshold in code

### Cannibalization Report

When multiple pages compete for the same keyword, the report shows:
- All competing pages with their URLs
- Each page's position
- Impression distribution
- Click distribution
- Sorted by impressions (highest first)

## ⚙️ Configuration

### Adjusting the Impression Threshold

Default: 20% of total keyword impressions (minimum 5)

To change, edit in `GSC.gs`:
```javascript
// Line ~393 and ~571
const impressionThreshold = Math.max(5, totalImpressions * 0.20);
// Change 0.20 to your preferred percentage (e.g., 0.15 for 15%)
```

### Adjusting Volatility Threshold

Default: 5 positions

To change, edit in `GSC.gs`:
```javascript
// Line ~706
if (delta > 5) {
// Change 5 to your preferred threshold
```

### Adding Custom Regex Presets

Edit `UI.html`:
```javascript
const PRESET_REGEX = {
  "5plus": "(\\S+\\s+){4,}\\S+",
  "yourcustom": "your-regex-pattern-here"
};

// And add to dropdown:
<option value="yourcustom">Your Custom Preset</option>
```

## 🔧 Troubleshooting

### "Authorization required" error
- Go to Apps Script editor
- Run any function manually
- Complete OAuth authorization flow

### "GSC API error (403)"
- Verify Google Search Console API is enabled in GCP
- Check OAuth scopes in `appsscript.json`
- Re-authorize the script

### "Sheet not found" error
- For Keyword Tracker: Sheet must be named "KW Tracker"
- For URL Tracker: Sheet must be named "URL Tracker"
- Case-sensitive!

### Slow performance with large datasets
- Process keywords in batches (500-1000 at a time)
- Use fewer months for historical tracking
- Split into multiple sheets if tracking 5000+ keywords

### Missing ranking URLs (Column B empty)
- Ensure "Fetch Ranking URLs" is checked
- Verify GSC property has data for those keywords
- Check that Column B exists in sheet

## 📈 Performance

- **500 keywords**: ~30 seconds
- **1000 keywords**: ~60 seconds
- **10,000 keywords**: ~10 minutes (with progress tracking)
- **Advanced Export**: Up to 400,000 rows supported

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

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built to solve real SEO workflow challenges. Inspired by the limitations of Google Search Console's averaging logic.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/hs-seo-tools/issues)
- **LinkedIn Article**: [Full Documentation](https://www.linkedin.com/pulse/stop-wasting-hours-copying-data-from-google-search-console-harsh-shah-zyppf/)

## 🗺️ Roadmap

- [ ] GA4 integration for conversion data
- [ ] Bulk URL analysis mode
- [ ] Custom alert thresholds (per keyword)
- [ ] Export to CSV/Excel
- [ ] Automated email reports
- [ ] Multi-property comparison
- [ ] SERP feature tracking
- [ ] Competitor tracking

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

### Keyword Tracker
![Keyword Tracker](screenshots/keyword-tracker.png)
*Monthly rank tracking with volatility alerts*

### Cannibalization Report
![Cannibalization Report](screenshots/cannibalization-report.png)
*Automatic detection of competing pages*

### Advanced Export
![Advanced Export](screenshots/advanced-export.png)
*Unlimited dimension combinations with regex presets*

---

**Built with ❤️ for the SEO community**

*Made by [Your Name](https://linkedin.com/in/yourprofile) | [LinkedIn Article](https://www.linkedin.com/pulse/stop-wasting-hours-copying-data-from-google-search-console-harsh-shah-zyppf/)*
