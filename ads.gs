function testAdsConnection() {
  const devToken = "-";        // paste yours
  const mccId    = "";          // paste yours
  const url      = "https://googleads.googleapis.com/v24/customers/" + mccId + "/googleAds:search";
  
  const res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ query: "SELECT customer_client.id FROM customer_client LIMIT 1" }),
    headers: {
      "Authorization": "Bearer " + ScriptApp.getOAuthToken(),
      "developer-token": devToken,
      "login-customer-id": mccId
    },
    muteHttpExceptions: true
  });
  
  Logger.log("HTTP Code: " + res.getResponseCode());
  Logger.log("Response: " + res.getContentText().slice(0, 500));
}


// =============================================================================
// HS SEO Tool — Google Ads Keyword Volume Module
// OAuth2 + Developer Token + MCC Account
// =============================================================================

const ADS_API_VER  = "v24";
const ADS_API_BASE = "https://googleads.googleapis.com/" + ADS_API_VER;

/* ───────────────────────────────
   UI-callable: list ENABLED accounts under MCC
   ─────────────────────────────── */
function getAdsAccounts(formData) {
  const devToken = (formData.developerToken || "").trim();
  const mccId    = String(formData.mccId || "").replace(/[^0-9]/g, "").trim();

  if (!devToken) throw new Error("Developer token is required.");
  if (!mccId || mccId.length < 10) throw new Error("Valid MCC Account ID is required (e.g. 123-456-7890).");

  const url   = ADS_API_BASE + "/customers/" + mccId + "/googleAds:search";
  const query = "SELECT customer_client.id, customer_client.descriptive_name, customer_client.status, customer_client.manager FROM customer_client WHERE customer_client.status = 'ENABLED' ORDER BY customer_client.id";

  const res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ query: query }),
    headers: {
      "Authorization": "Bearer " + ScriptApp.getOAuthToken(),
      "developer-token": devToken,
      "login-customer-id": mccId
    },
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  const text = res.getContentText();

  if (code !== 200) {
    let msg = "Unable to load accounts.";
    try {
      const err = JSON.parse(text);
      if (err.error && err.error.details && err.error.details.length > 0) {
        msg = err.error.details[0].errors[0].message || err.error.message || msg;
      } else {
        msg = err.error?.message || msg;
      }
      if (msg.includes("developerToken")) msg = "Invalid or unapproved Developer Token.";
      if (msg.includes("USER_PERMISSION_DENIED")) msg = "OAuth user lacks access to this MCC. Check Cloud Console OAuth consent + MCC user permissions.";
    } catch (e) {}
    throw new Error(msg + " (HTTP " + code + ")");
  }

  const data     = JSON.parse(text);
  const accounts = (data.results || []).map(r => ({
    id:      String(r.customerClient?.id || "").replace(/[^0-9]/g, ""),
    name:    r.customerClient?.descriptiveName || ("Account " + r.customerClient?.id),
    manager: r.customerClient?.manager || false
  }));

  return accounts;
}

/* ───────────────────────────────
   Helper: Build historical metrics options
   ─────────────────────────────── */
function buildHistoricalMetricsOptions_(historyOption, customStart, customEnd) {
  if (!historyOption || historyOption === "none") {
    return null;
  }

  let startYear, startMonth, endYear, endMonth;

  if (historyOption === "custom") {
    if (!customStart || !customEnd) {
      return null;
    }
    const startParts = customStart.split("-");
    const endParts   = customEnd.split("-");
    if (startParts.length !== 2 || endParts.length !== 2) {
      return null;
    }
    startYear  = parseInt(startParts[0], 10);
    startMonth = parseInt(startParts[1], 10);
    endYear    = parseInt(endParts[0], 10);
    endMonth   = parseInt(endParts[1], 10);
  } else {
    const months = parseInt(historyOption, 10);
    if (isNaN(months) || months <= 0) {
      return null;
    }
    const now = new Date();
    endYear   = now.getFullYear();
    endMonth  = now.getMonth() + 1;
    
    const startObj = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    startYear  = startObj.getFullYear();
    startMonth = startObj.getMonth() + 1;
  }

  return {
    yearMonthRange: {
      start: { year: startYear, month: startMonth },
      end:   { year: endYear,   month: endMonth }
    }
  };
}

/* ───────────────────────────────
   Core: generateKeywordIdeas for a batch
   ─────────────────────────────── */
function fetchKeywordSearchVolumes_(keywords, customerId, mccId, devToken, locationId, languageId, historyOption, customStart, customEnd) {
  const cleanCustomerId = String(customerId).replace(/[^0-9]/g, "");
  const cleanMccId      = String(mccId).replace(/[^0-9]/g, "");

  const url  = ADS_API_BASE + "/customers/" + cleanCustomerId + ":generateKeywordHistoricalMetrics";
  const body = {
    keywords:         keywords,
    geoTargetConstants: ["geoTargetConstants/" + locationId],
    language:         "languageConstants/" + languageId,
    keywordPlanNetwork: "GOOGLE_SEARCH"
  };

  const historicalOptions = buildHistoricalMetricsOptions_(historyOption, customStart, customEnd);
  if (historicalOptions) {
    body.historicalMetricsOptions = historicalOptions;
  }

  const res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(body),
    headers: {
      "Authorization": "Bearer " + ScriptApp.getOAuthToken(),
      "developer-token": devToken,
      "login-customer-id": cleanMccId
    },
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  const text = res.getContentText();

  if (code !== 200) {
    let msg = "Google Ads API error";
    try {
      const err = JSON.parse(text);
      if (err.error && err.error.details && err.error.details.length > 0) {
        msg = err.error.details[0].errors[0].message || err.error.message || msg;
      } else {
        msg = err.error?.message || msg;
      }
    } catch (e) {}
    throw new Error(msg + " (HTTP " + code + ")");
  }

  return JSON.parse(text);
}

/* ───────────────────────────────
   UI-callable: main volume fetch
   ─────────────────────────────── */
function fetchKeywordVolumesFromUI(formData) {
  const devToken          = (formData.developerToken || "").trim();
  const mccId             = (formData.mccId || "").trim();
  const customerId        = (formData.customerId || "").trim();
  const locationId        = formData.locationId || "2840";
  const locationName      = formData.locationName || locationId;
  const languageId        = formData.languageId || "1000";
  const languageName      = formData.languageName || languageId;
  const keywords          = (formData.keywords || []).filter(k => k.trim());
  
  const historyOption     = formData.historyOption || "none";
  const customStart       = formData.customStart || "";
  const customEnd         = formData.customEnd || "";
  const includeHistorical = (historyOption !== "none");

  if (!devToken)        throw new Error("Developer token is required.");
  if (!mccId)           throw new Error("MCC Account ID is required.");
  if (!customerId)      throw new Error("Customer Account ID is required.");
  if (!keywords.length) throw new Error("Add at least one keyword.");

  // API limit: up to 10,000 keywords per call for historical metrics
  const BATCH_SIZE = 5000;
  let allResults = [];

  for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
    const batch = keywords.slice(i, Math.min(i + BATCH_SIZE, keywords.length));
    const res   = fetchKeywordSearchVolumes_(batch, customerId, mccId, devToken, locationId, languageId, historyOption, customStart, customEnd);
    allResults  = allResults.concat(res.results || []);
    if (i + BATCH_SIZE < keywords.length) Utilities.sleep(600);
  }

  // ── Write to sheet ──
  const ss   = SpreadsheetApp.getActive();
  let sheet  = ss.getSheetByName("Keyword Volume");
  if (!sheet) sheet = ss.insertSheet("Keyword Volume");

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow > 0 && lastCol > 0) sheet.getRange(1, 1, lastRow, lastCol).clear();

  const headers = ["Keyword", "Avg Monthly Searches", "Competition", "Competition Index (0-100)", "Low Bid", "High Bid"];
  let monthHeaders = [];

  if (includeHistorical && allResults.length > 0) {
    const firstWithVolumes = allResults.find(r => (r.keywordMetrics || r.keywordIdeaMetrics)?.monthlySearchVolumes?.length);
    if (firstWithVolumes) {
      const monthNames = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      monthHeaders = (firstWithVolumes.keywordMetrics || firstWithVolumes.keywordIdeaMetrics).monthlySearchVolumes.map(m => {
        const mIdx = typeof m.month === "string"
          ? ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"].indexOf(m.month.toUpperCase()) + 1
          : parseInt(m.month);
        return monthNames[mIdx] + " " + m.year;
      });
    }
  }

  const allHeaders = headers.concat(monthHeaders);
  sheet.getRange(1, 1, 1, allHeaders.length).setValues([allHeaders]);
  sheet.getRange(1, 1, 1, allHeaders.length)
    .setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setBackground("#f1f3f4").setFontFamily("Sora").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);

  const kwMap = {};
  keywords.forEach(k => { kwMap[k.toLowerCase()] = k; });

  const rows = [];
  const seen = new Set();

  allResults.forEach(r => {
    const text = r.searchQuery || r.text || "";
    const key  = text.toLowerCase();
    if (!kwMap[key]) return;
    if (seen.has(key)) return;
    seen.add(key);

    const m = r.keywordMetrics || r.keywordIdeaMetrics || {};
    const row = [
      text,
      Number(m.avgMonthlySearches || 0),
      m.competition || "N/A",
      m.competitionIndex != null ? Number(m.competitionIndex) : 0,
      Number(m.lowTopOfPageBidMicros || 0)  / 1000000,
      Number(m.highTopOfPageBidMicros || 0) / 1000000
    ];

    if (includeHistorical && m.monthlySearchVolumes) {
      m.monthlySearchVolumes.forEach(v => row.push(Number(v.monthlySearches || 0)));
    }
    rows.push(row);
  });

  // Zero-fill missing keywords
  keywords.forEach(kw => {
    if (seen.has(kw.toLowerCase())) return;
    const row = [kw, 0, "N/A", 0, 0, 0];
    if (includeHistorical) monthHeaders.forEach(() => row.push(0));
    rows.push(row);
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, allHeaders.length).setValues(rows);
    sheet.getRange(2, 1, rows.length, 1).setHorizontalAlignment("left").setFontFamily("Sora");
    sheet.getRange(2, 2, rows.length, allHeaders.length - 1).setHorizontalAlignment("center").setFontFamily("Sora");

    sheet.getRange(2, 2, rows.length, 1).setNumberFormat("0");
    sheet.getRange(2, 4, rows.length, 1).setNumberFormat("0");
    
    let currencyFmt = "$0.00";
    switch (String(locationId)) {
      case "2356": currencyFmt = "₹0.00"; break; // India
      case "2826": currencyFmt = "£0.00"; break; // UK
      case "2276": // Germany
      case "2250": // France
      case "2724": // Spain
      case "2380": // Italy
      case "2528": currencyFmt = "€0.00"; break; // Netherlands
      case "2124": currencyFmt = "CA$0.00"; break; // Canada
      case "2036": currencyFmt = "AU$0.00"; break; // Australia
      case "2392": currencyFmt = "¥0"; break;    // Japan
      case "2076": currencyFmt = "R$0.00"; break; // Brazil
      case "2484": currencyFmt = "MX$0.00"; break; // Mexico
      default:     currencyFmt = "$0.00"; break;
    }
    sheet.getRange(2, 5, rows.length, 2).setNumberFormat(currencyFmt);
    if (monthHeaders.length) {
      sheet.getRange(2, headers.length + 1, rows.length, monthHeaders.length).setNumberFormat("0");
    }
  }

  sheet.setColumnWidth(1, 320);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 130);
  sheet.setColumnWidth(4, 170);
  sheet.setColumnWidth(5, 110);
  sheet.setColumnWidth(6, 110);
  monthHeaders.forEach((_, i) => sheet.setColumnWidth(headers.length + 1 + i, 100));

  let msg = "✅ Keyword Volume updated!\n\n";
  msg += "Keywords: " + keywords.length + "\n";
  msg += "Matched: " + seen.size + "\n";
  msg += "Location: " + locationName + "\n";
  msg += "Language: " + languageName + "\n";
  if (includeHistorical) msg += "Historical: last " + monthHeaders.length + " months\n";
  return msg;
}

/* ───────────────────────────────
   Core: generateKeywordIdeas for magic tool
   ─────────────────────────────── */
function fetchKeywordIdeas_(seedKw, customerId, mccId, devToken, locationId, languageId, historyOption, customStart, customEnd) {
  const cleanCustomerId = String(customerId).replace(/[^0-9]/g, "");
  const cleanMccId      = String(mccId).replace(/[^0-9]/g, "");

  const url  = ADS_API_BASE + "/customers/" + cleanCustomerId + ":generateKeywordIdeas";
  const body = {
    keywordSeed:        { keywords: [seedKw] },
    geoTargetConstants: ["geoTargetConstants/" + locationId],
    language:           "languageConstants/" + languageId,
    keywordPlanNetwork: "GOOGLE_SEARCH"
  };

  const historicalOptions = buildHistoricalMetricsOptions_(historyOption, customStart, customEnd);
  if (historicalOptions) {
    body.historicalMetricsOptions = historicalOptions;
  }

  const res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(body),
    headers: {
      "Authorization": "Bearer " + ScriptApp.getOAuthToken(),
      "developer-token": devToken,
      "login-customer-id": cleanMccId
    },
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  const text = res.getContentText();

  if (code !== 200) {
    let msg = "Google Ads API error";
    try {
      const err = JSON.parse(text);
      if (err.error && err.error.details && err.error.details.length > 0) {
        msg = err.error.details[0].errors[0].message || err.error.message || msg;
      } else {
        msg = err.error?.message || msg;
      }
    } catch (e) {}
    throw new Error(msg + " (HTTP " + code + ")");
  }

  return JSON.parse(text);
}

/* ───────────────────────────────
   UI-callable: KW Magic Tool
   ─────────────────────────────── */
function fetchKeywordIdeasFromUI(formData) {
  const devToken          = (formData.developerToken || "").trim();
  const mccId             = (formData.mccId || "").trim();
  const customerId        = (formData.customerId || "").trim();
  const locationId        = formData.locationId || "2840";
  const locationName      = formData.locationName || locationId;
  const languageId        = formData.languageId || "1000";
  const languageName      = formData.languageName || languageId;
  const seedKw            = (formData.seedKw || "").trim();
  
  const historyOption     = formData.historyOption || "none";
  const customStart       = formData.customStart || "";
  const customEnd         = formData.customEnd || "";
  const includeHistorical = (historyOption !== "none");

  if (!devToken)        throw new Error("Developer token is required.");
  if (!mccId)           throw new Error("MCC Account ID is required.");
  if (!customerId)      throw new Error("Customer Account ID is required.");
  if (!seedKw)          throw new Error("Seed keyword is required.");

  const res = fetchKeywordIdeas_(seedKw, customerId, mccId, devToken, locationId, languageId, historyOption, customStart, customEnd);
  const results = res.results || [];

  if (results.length === 0) {
    return "No keyword ideas found for this seed.";
  }

  // ── Write to sheet ──
  const ss   = SpreadsheetApp.getActive();
  let sheet  = ss.getSheetByName("KW Magic Tool");
  if (!sheet) sheet = ss.insertSheet("KW Magic Tool");

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow > 0 && lastCol > 0) sheet.getRange(1, 1, lastRow, lastCol).clear();

  const headers = ["Keyword Idea", "Avg Monthly Searches", "Competition", "Competition Index (0-100)", "Low Bid", "High Bid"];
  let monthHeaders = [];

  if (includeHistorical && results.length > 0) {
    const firstWithVolumes = results.find(r => r.keywordIdeaMetrics?.monthlySearchVolumes?.length);
    if (firstWithVolumes) {
      const monthNames = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      monthHeaders = firstWithVolumes.keywordIdeaMetrics.monthlySearchVolumes.map(m => {
        const mIdx = typeof m.month === "string"
          ? ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"].indexOf(m.month.toUpperCase()) + 1
          : parseInt(m.month);
        return monthNames[mIdx] + " " + m.year;
      });
    }
  }

  const allHeaders = headers.concat(monthHeaders);
  sheet.getRange(1, 1, 1, allHeaders.length).setValues([allHeaders]);
  sheet.getRange(1, 1, 1, allHeaders.length)
    .setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setBackground("#f1f3f4").setFontFamily("Sora").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);

  const rows = [];
  results.forEach(r => {
    const text = r.text || "";
    const m = r.keywordIdeaMetrics || {};
    const row = [
      text,
      Number(m.avgMonthlySearches || 0),
      m.competition || "N/A",
      m.competitionIndex != null ? Number(m.competitionIndex) : 0,
      Number(m.lowTopOfPageBidMicros || 0)  / 1000000,
      Number(m.highTopOfPageBidMicros || 0) / 1000000
    ];

    if (includeHistorical && m.monthlySearchVolumes) {
      m.monthlySearchVolumes.forEach(v => row.push(Number(v.monthlySearches || 0)));
    }
    rows.push(row);
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, allHeaders.length).setValues(rows);
    sheet.getRange(2, 1, rows.length, 1).setHorizontalAlignment("left").setFontFamily("Sora");
    sheet.getRange(2, 2, rows.length, allHeaders.length - 1).setHorizontalAlignment("center").setFontFamily("Sora");

    sheet.getRange(2, 2, rows.length, 1).setNumberFormat("0");
    sheet.getRange(2, 4, rows.length, 1).setNumberFormat("0");
    
    let currencyFmt = "$0.00";
    switch (String(locationId)) {
      case "2356": currencyFmt = "₹0.00"; break; // India
      case "2826": currencyFmt = "£0.00"; break; // UK
      case "2276": // Germany
      case "2250": // France
      case "2724": // Spain
      case "2380": // Italy
      case "2528": currencyFmt = "€0.00"; break; // Netherlands
      case "2124": currencyFmt = "CA$0.00"; break; // Canada
      case "2036": currencyFmt = "AU$0.00"; break; // Australia
      case "2392": currencyFmt = "¥0"; break;    // Japan
      case "2076": currencyFmt = "R$0.00"; break; // Brazil
      case "2484": currencyFmt = "MX$0.00"; break; // Mexico
      default:     currencyFmt = "$0.00"; break;
    }
    sheet.getRange(2, 5, rows.length, 2).setNumberFormat(currencyFmt);
    if (monthHeaders.length) {
      sheet.getRange(2, headers.length + 1, rows.length, monthHeaders.length).setNumberFormat("0");
    }
  }

  sheet.setColumnWidth(1, 320);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 130);
  sheet.setColumnWidth(4, 170);
  sheet.setColumnWidth(5, 110);
  sheet.setColumnWidth(6, 110);
  monthHeaders.forEach((_, i) => sheet.setColumnWidth(headers.length + 1 + i, 100));

  let msg = "✅ KW Magic Tool updated!\n\n";
  msg += "Generated: " + rows.length + " ideas\n";
  msg += "Seed: " + seedKw + "\n";
  msg += "Location: " + locationName + "\n";
  if (includeHistorical) msg += "Historical: last " + monthHeaders.length + " months\n";
  return msg;
}