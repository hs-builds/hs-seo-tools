/************************************
 * GOOGLE SEARCH CONSOLE MODULE - CORRECTED OPTIMIZED VERSION
 * HS SEO Tool - GSC
 ************************************/

/** ------------------------------
 * Stop button handler
 * ------------------------------ */
function stopKwUpdate() {
  const cache = CacheService.getDocumentCache();
  cache.put("KW_STOP", "1", 600);
  
  const prev = getKwProgress() || {};
  const done = prev.done || 0;
  const total = prev.total || 0;
  setKwProgress("stopped", done, total, { 
    volatileCount: prev.volatileCount || 0, 
    cannibalCount: prev.cannibalCount || 0 
  });
}

/** ------------------------------
 * Month range parsing
 * ------------------------------ */
function parseDDMMYYYY(s) {
  const m = String(s || "").match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]) - 1;
  const yyyy = Number(m[3]);
  const d = new Date(yyyy, mm, dd);
  return isNaN(d.getTime()) ? null : d;
}

function getKwTrackerMonthRanges(sheet) {
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const ranges = [];
  const tz = Session.getScriptTimeZone();
  const fmt = function(d) {
    return Utilities.formatDate(d, tz, "yyyy-MM-dd");
  };
  
  for (let col = 3; col <= lastCol; col++) {
    const val = headers[col - 1];
    if (!val) continue;
    let start, end;

    if (Object.prototype.toString.call(val) === "[object Date]") {
      const d = new Date(val);
      start = new Date(d.getFullYear(), d.getMonth(), 1);
      end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    } else if (typeof val === "string") {
      const s = String(val).trim();
      const m2 = s.match(/^(\d{4})[-\/](\d{2})$/);
      if (m2) {
        const yyyy = parseInt(m2[1], 10);
        const mm = parseInt(m2[2], 10);
        start = new Date(yyyy, mm - 1, 1);
        end = new Date(yyyy, mm, 0);
      } else if (val.indexOf("-") !== -1) {
        const parts = val.split("-").map(function(x) { return String(x).trim(); });
        if (parts.length === 2) {
          const start2 = parseDDMMYYYY(parts[0]);
          const end2 = parseDDMMYYYY(parts[1]);
          if (start2 && end2) {
            start = start2;
            end = end2;
          }
        }
      }
    }

    if (start && end) {
      ranges.push({
        col: col,
        headerName: String(val),
        startDate: fmt(start),
        endDate: fmt(end),
        ts: start.getTime()
      });
    }
  }

  if (!ranges.length) throw new Error("No month/date headers found from Column C onward.");
  ranges.sort(function(a, b) { return a.ts - b.ts; });
  return ranges;
}

/** ------------------------------
 * List GSC Sites (10-hour cache)
 * ------------------------------ */
function getGscSites() {
  const cache = CacheService.getScriptCache();
  const CACHE_KEY = "GSC_SITES_LIST_V3";
  const CACHE_TTL = 36000;

  const cached = cache.get(CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }

  const url = "https://www.googleapis.com/webmasters/v3/sites";
  let res;
  try {
    res = UrlFetchApp.fetch(url, {
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
  } catch (e) {
    throw new Error("Failed to reach GSC API: " + e);
  }

  const code = res.getResponseCode();
  if (code !== 200) {
    const text = res.getContentText();
    let msg = "Unable to load GSC properties.";
    try {
      const json = JSON.parse(text);
      msg = json.error?.message || msg;
    } catch {}
    throw new Error(msg + " (HTTP " + code + ")");
  }

  const json = JSON.parse(res.getContentText());
  const entries = json.siteEntry || [];
  const sites = entries.map(s => ({
    siteUrl: s.siteUrl,
    permissionLevel: s.permissionLevel
  }));

  cache.put(CACHE_KEY, JSON.stringify(sites), CACHE_TTL);
  return sites;
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** ------------------------------
 * Progress cache
 * ------------------------------ */
function setKwProgress(status, done, total, extras) {
  const cache = CacheService.getDocumentCache();
  let startTs = cache.get("KW_START_TS");
  if (!startTs) {
    startTs = String(Date.now());
    cache.put("KW_START_TS", startTs, 21600);
  }

  const payload = {
    status: status,
    done: done,
    total: total,
    startTs: Number(startTs)
  };
  if (extras) {
    Object.keys(extras).forEach(function(k) {
      payload[k] = extras[k];
    });
  }

  cache.put("kwProgress", JSON.stringify(payload), 600);
}

function getKwProgress() {
  const raw = CacheService.getDocumentCache().get("kwProgress");
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    obj.elapsedMs = Date.now() - Number(obj.startTs || Date.now());
    return obj;
  } catch (e) {
    return null;
  }
}

/** ------------------------------
 * Volatility helpers
 * ------------------------------ */
function toRankNumber_(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
}

function findPrevRankInRow_(rowData, currentMonthIndex, monthRanges) {
  for (let i = currentMonthIndex - 1; i >= 0; i--) {
    const prevColIndex = monthRanges[i].col - 1;
    const prevVal = toRankNumber_(rowData[prevColIndex]);
    if (prevVal !== null) {
      return { rank: prevVal, headerName: monthRanges[i].headerName };
    }
  }
  return null;
}

function applyVolatilityFormatting_(cell, prevRank, newRank, threshold) {
  const delta = newRank - prevRank;
  const absChange = Math.abs(delta);
  if (absChange <= threshold) return { volatile: false };
  const bg = (delta < 0) ? "#d9ead3" : "#f4cccc";
  cell.setBackground(bg);
  return { 
    volatile: true, 
    delta: delta, 
    prev: prevRank, 
    newRank: newRank 
  };
}

/** ------------------------------
 * GSC Data sheet helpers
 * ------------------------------ */
function ensureGscDataSheet_(header) {
  const ss = SpreadsheetApp.getActive();
  const name = "GSC Data";
  let sh = ss.getSheetByName(name);

  if (!sh) sh = ss.insertSheet(name);
  
  sh.getRange(1, 1, 1, header.length).setValues([header]);
  sh.setFrozenRows(1);
  const maxCols = sh.getMaxColumns();
  if (maxCols > header.length) {
    sh.deleteColumns(header.length + 1, maxCols - header.length);
  } else if (maxCols < header.length) {
    sh.insertColumnsAfter(maxCols, header.length - maxCols);
  }

  const lastRow = sh.getLastRow();
  if (lastRow > 1) {
    sh.getRange(2, 1, lastRow - 1, header.length).clearContent();
    sh.getRange(2, 1, lastRow - 1, header.length).setBackground(null).setNote("");
  }

  sh.getDataRange().setFontFamily("Sora");

  sh.getRange(1, 1, 1, header.length)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  const metricCols = ["clicks", "impressions", "ctr", "position"];
  header.forEach(function(h, i) {
    const col = i + 1;
    const key = String(h || "").toLowerCase();
    if (metricCols.indexOf(key) !== -1) {
      sh.setColumnWidth(col, 110);
    } else {
      sh.setColumnWidth(col, (col === 1 ? 250 : 450));
    }
  });
  return sh;
}

/** ========================================
 * CORRECTED: Fetch all queries for a month, filter in-memory
 * GSC API limitation: Can't use OR filtering for multiple keywords
 * Solution: Get ALL queries, filter client-side
 * ======================================== */
function fetchGscKeywordRanksForMonth_(siteUrl, keywords, startDate, endDate, country) {
  const url = "https://www.googleapis.com/webmasters/v3/sites/" +
    encodeURIComponent(siteUrl) + "/searchAnalytics/query";
  
  // Build keyword map for fast lookup (case-insensitive)
  const kwMap = {};
  keywords.forEach(function(kw) {
    kwMap[kw.toLowerCase()] = kw; // Map lowercase to original
  });
  
  const payload = {
    startDate: startDate,
    endDate: endDate,
    dimensions: ["query"],
    searchType: "web",
    rowLimit: 25000 // Max allowed
  };
  
  // Add country filter if specified
  if (country && country.trim()) {
    payload.dimensionFilterGroups = [{
      filters: [{
        dimension: "country",
        operator: "equals",
        expression: country.trim().toUpperCase()
      }]
    }];
  }
  
  const results = {};
  let startRow = 0;
  let hasMore = true;
  
  // Paginate through all results
  while (hasMore) {
    const reqPayload = Object.assign({}, payload);
    reqPayload.startRow = startRow;
    
    try {
      const res = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(reqPayload),
        headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      });
      
      const code = res.getResponseCode();
      if (code !== 200) {
        Logger.log("GSC API error: " + res.getContentText());
        break;
      }
      
      const json = JSON.parse(res.getContentText());
      const rows = json.rows || [];
      
      if (rows.length === 0) {
        hasMore = false;
        break;
      }
      
      // Filter for our keywords and store results
      rows.forEach(function(r) {
        const query = r.keys && r.keys[0] ? r.keys[0] : "";
        const queryLower = query.toLowerCase();
        
        // Check if this query matches any of our keywords (case-insensitive)
        if (kwMap[queryLower]) {
          const originalKw = kwMap[queryLower];
          results[originalKw] = {
            position: Number(r.position || 0),
            clicks: Number(r.clicks || 0),
            impressions: Number(r.impressions || 0),
            ctr: Number(r.ctr || 0)
          };
        }
      });
      
      startRow += rows.length;
      
      // Stop if we got fewer results than requested
      if (rows.length < payload.rowLimit) {
        hasMore = false;
      }
      
      // Safety limit
      if (startRow >= 100000) {
        hasMore = false;
      }
      
    } catch (e) {
      Logger.log("Error fetching GSC data: " + e);
      hasMore = false;
    }
  }
  
  return results;
}

/**
 * Fetch queries with page details for cannibalization detection
 */
function fetchGscKeywordRanksForMonthWithPages_(siteUrl, keywords, startDate, endDate, country, dimensions) {
  const url = "https://www.googleapis.com/webmasters/v3/sites/" +
    encodeURIComponent(siteUrl) + "/searchAnalytics/query";
  
  // Build keyword map for fast lookup (case-insensitive)
  const kwMap = {};
  keywords.forEach(function(kw) {
    kwMap[kw.toLowerCase()] = kw;
  });
  
  const payload = {
    startDate: startDate,
    endDate: endDate,
    dimensions: dimensions, // ["query", "page"]
    searchType: "web",
    rowLimit: 25000
  };
  
  if (country && country.trim()) {
    payload.dimensionFilterGroups = [{
      filters: [{
        dimension: "country",
        operator: "equals",
        expression: country.trim().toUpperCase()
      }]
    }];
  }
  
  const results = {};
  let startRow = 0;
  let hasMore = true;
  
  while (hasMore) {
    const reqPayload = Object.assign({}, payload);
    reqPayload.startRow = startRow;
    
    try {
      const res = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(reqPayload),
        headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      });
      
      const code = res.getResponseCode();
      if (code !== 200) {
        Logger.log("GSC API error: " + res.getContentText());
        break;
      }
      
      const json = JSON.parse(res.getContentText());
      const rows = json.rows || [];
      
      if (rows.length === 0) {
        hasMore = false;
        break;
      }
      
      // Group by keyword
      rows.forEach(function(r) {
        const query = r.keys && r.keys[0] ? r.keys[0] : "";
        const page = r.keys && r.keys[1] ? r.keys[1] : "";
        const queryLower = query.toLowerCase();
        
        if (kwMap[queryLower]) {
          const originalKw = kwMap[queryLower];
          
          // Initialize if first time seeing this keyword
          if (!results[originalKw]) {
            results[originalKw] = {
              position: Number(r.position || 0),
              clicks: Number(r.clicks || 0),
              impressions: Number(r.impressions || 0),
              ctr: Number(r.ctr || 0),
              pageDetails: []
            };
          }
          
          // Add page details
          results[originalKw].pageDetails.push({
            page: page,
            clicks: Number(r.clicks || 0),
            impressions: Number(r.impressions || 0),
            position: Math.round(Number(r.position || 0))
          });
        }
      });
      
      startRow += rows.length;
      
      if (rows.length < payload.rowLimit) {
        hasMore = false;
      }
      
      if (startRow >= 100000) {
        hasMore = false;
      }
      
    } catch (e) {
      Logger.log("Error fetching GSC data: " + e);
      hasMore = false;
    }
  }
  
  return results;
}

/** ========================================
 * OPTIMIZED KW TRACKER - MAIN FUNCTION
 * Processes by MONTH, fetches all queries once per month
 * ======================================== */
function fetchGscKeywordRanksFromUI(formData) {
  const siteUrl = formData.siteUrl;
  const country = (formData.country || "").toString().trim();
  const fetchPages = formData.fetchPages || false;
  const cannibalReport = formData.cannibalReport || false;

  if (!siteUrl) throw new Error("Select a GSC property.");

  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName("KW Tracker");
  if (!sheet) throw new Error("Sheet 'KW Tracker' not found.");

  const monthRanges = getKwTrackerMonthRanges(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error("No keywords in Column A (starting from Row 2).");

  const allData = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  
  const keywords = [];
  const rowNumbers = [];
  allData.forEach(function(row, idx) {
    const kw = (row[0] || "").toString().trim();
    if (kw) {
      keywords.push(kw);
      rowNumbers.push(idx + 2);
    }
  });

  if (!keywords.length) throw new Error("No keywords found in Column A.");

  const cache = CacheService.getDocumentCache();
  cache.remove("KW_STOP");
  
  // Initialize cannibalization report if requested
  if (cannibalReport) {
    ensureCannibalizationReportSheet_();
    clearCannibalizationReport_();
  }
  
  setKwProgress("running", 0, monthRanges.length, { 
    volatileCount: 0, 
    cannibalCount: 0 
  });

  let volatileCount = 0;
  let cannibalCount = 0;
  
  // Process each month
  for (let monthIdx = 0; monthIdx < monthRanges.length; monthIdx++) {
    const stopFlag = cache.get("KW_STOP");
    if (stopFlag === "1") {
      setKwProgress("stopped", monthIdx, monthRanges.length, { 
        volatileCount: volatileCount, 
        cannibalCount: 0 
      });
      return "Update stopped by user at month " + (monthIdx + 1) + " of " + monthRanges.length;
    }

    const m = monthRanges[monthIdx];

    // OPTIMIZED: Fetch ALL queries for this month once
    // If cannibalization report is needed, also fetch page dimension
    const dimensions = cannibalReport ? ["query", "page"] : ["query"];
    const rankData = cannibalReport ? 
      fetchGscKeywordRanksForMonthWithPages_(siteUrl, keywords, m.startDate, m.endDate, country, dimensions) :
      fetchGscKeywordRanksForMonth_(siteUrl, keywords, m.startDate, m.endDate, country);

    // Build column data
    const colData = [];
    const volatileCells = [];
    
    keywords.forEach(function(kw, kwIdx) {
      const data = rankData[kw];
      // FIXED: Round position like original code
      const position = data ? Math.round(data.position) : 0;
      colData.push([position]);
      
      // Cannibalization check (only on first/most recent month)
      if (cannibalReport && monthIdx === monthRanges.length - 1 && data && data.pageDetails) {
        if (data.pageDetails.length > 1) {
          appendCannibalizationReport_(kw, data.pageDetails);
          cannibalCount++;
        }
      }
      
      // Volatility check
      if (position > 0) {
        const rowData = allData[kwIdx];
        const prevRank = findPrevRankInRow_(rowData, monthIdx, monthRanges);
        
        if (prevRank && prevRank.rank > 0) {
          const delta = Math.abs(position - prevRank.rank);
          // FIXED: Use threshold of 5 like original code
          if (delta > 5) {
            volatileCells.push({
              row: rowNumbers[kwIdx],
              col: m.col,
              prevRank: prevRank.rank,
              newRank: position
            });
            volatileCount++;
          }
        }
      }
    });

    // BATCH WRITE: Write entire column at once
    if (colData.length > 0) {
      sheet.getRange(2, m.col, colData.length, 1).setValues(colData);
      // FIXED: Use "0" format for integers (no decimals)
      sheet.getRange(2, m.col, colData.length, 1).setNumberFormat("0");
      
      // CRITICAL FIX: Update allData array with new values
      // This allows subsequent months to compare against this month's data
      keywords.forEach(function(kw, kwIdx) {
        allData[kwIdx][m.col - 1] = colData[kwIdx][0];
      });
      
      // Apply volatility formatting
      volatileCells.forEach(function(v) {
        const cell = sheet.getRange(v.row, v.col);
        const delta = v.newRank - v.prevRank;
        const bg = (delta < 0) ? "#d9ead3" : "#f4cccc";
        cell.setBackground(bg);
      });
    }

    setKwProgress("running", monthIdx + 1, monthRanges.length, {
      volatileCount: volatileCount,
      cannibalCount: cannibalCount
    });

    if (monthIdx % 2 === 1) {
      SpreadsheetApp.flush();
    }
  }

  // Fetch pages if requested (using most recent month)
  if (fetchPages) {
    const recentMonth = monthRanges[monthRanges.length - 1];
    fetchPagesForKeywordsToColumnB_(
      sheet, 
      siteUrl, 
      keywords, 
      rowNumbers,
      recentMonth.startDate, 
      recentMonth.endDate, 
      country
    );
  }
  
  // Format cannibalization report if generated
  if (cannibalReport) {
    formatCannibalizationReport_();
  }

  setKwProgress("done", monthRanges.length, monthRanges.length, {
    volatileCount: volatileCount,
    cannibalCount: cannibalCount
  });

  let msg = "✅ KW Tracker Updated\n\n";
  msg += "Keywords: " + keywords.length + "\n";
  msg += "Months: " + monthRanges.length + "\n";
  msg += "Volatile rankings: " + volatileCount + "\n";
  if (fetchPages) {
    msg += "Pages fetched to Column B\n";
  }
  if (cannibalReport) {
    msg += "Cannibalization keywords: " + cannibalCount + "\n";
  }
  
  return msg;
}

/**
 * Fetch top pages for each keyword and write to Column B
 * This matches the original behavior
 */
function fetchPagesForKeywordsToColumnB_(sheet, siteUrl, keywords, rowNumbers, startDate, endDate, country) {
  const url = "https://www.googleapis.com/webmasters/v3/sites/" +
    encodeURIComponent(siteUrl) + "/searchAnalytics/query";
  
  const payload = {
    startDate: startDate,
    endDate: endDate,
    dimensions: ["query", "page"], // Need both query and page
    searchType: "web",
    rowLimit: 25000
  };
  
  if (country && country.trim()) {
    payload.dimensionFilterGroups = [{
      filters: [{
        dimension: "country",
        operator: "equals",
        expression: country.trim().toUpperCase()
      }]
    }];
  }
  
  try {
    const res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    
    if (res.getResponseCode() !== 200) {
      Logger.log("Error fetching pages: " + res.getContentText());
      return;
    }
    
    const json = JSON.parse(res.getContentText());
    const rows = json.rows || [];
    
    // Build keyword map (lowercase for case-insensitive matching)
    const kwMap = {};
    keywords.forEach(function(kw) {
      kwMap[kw.toLowerCase()] = kw;
    });
    
    // Group by keyword and find top page (highest clicks)
    const kwPages = {};
    rows.forEach(function(r) {
      const query = r.keys[0];
      const page = r.keys[1];
      const clicks = Number(r.clicks || 0);
      const queryLower = query.toLowerCase();
      
      if (kwMap[queryLower]) {
        const originalKw = kwMap[queryLower];
        if (!kwPages[originalKw] || clicks > kwPages[originalKw].clicks) {
          kwPages[originalKw] = { page: page, clicks: clicks };
        }
      }
    });
    
    // Write to Column B (index 2)
    keywords.forEach(function(kw, idx) {
      const row = rowNumbers[idx];
      const page = kwPages[kw] ? kwPages[kw].page : "";
      if (page) {
        sheet.getRange(row, 2).setValue(page);
      }
    });
    
  } catch (e) {
    Logger.log("Error fetching pages: " + e);
  }
}

/** ------------------------------
 * Cannibalization Report helpers
 * ------------------------------ */
function ensureCannibalizationReportSheet_() {
  const ss = SpreadsheetApp.getActive();
  const name = "Cannibalization Report";
  let sh = ss.getSheetByName(name);

  if (!sh) sh = ss.insertSheet(name);
  sh.getRange(1, 1, 1, 5).setValues([["Keyword", "URLs", "Clicks", "Impression", "Position"]]);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, 5).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");
  
  const maxCols = sh.getMaxColumns();
  if (maxCols > 5) {
    sh.deleteColumns(6, maxCols - 5);
  } else if (maxCols < 5) {
    sh.insertColumnsAfter(maxCols, 5 - maxCols);
  }

  sh.setColumnWidth(1, 150);
  sh.setColumnWidth(2, 750);
  sh.setColumnWidth(3, 100);
  sh.setColumnWidth(4, 100);
  sh.setColumnWidth(5, 100);

  return sh;
}

function clearCannibalizationReport_() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("Cannibalization Report");
  if (!sh) return;

  const last = sh.getLastRow();
  if (last > 1) {
    sh.getRange(2, 1, last - 1, 5).clearContent();
    sh.getRange(2, 1, last - 1, 5).setBackground(null);
  }
}

function appendCannibalizationReport_(keyword, pageDetails) {
  if (!pageDetails || !pageDetails.length) return;
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("Cannibalization Report");
  if (!sh) return;

  const lastRow = sh.getLastRow();
  const startRow = lastRow + 1;
  
  pageDetails.forEach(function(p, i) {
    const row = startRow + i;
    const urlsText = p.page || "";
    const clicks = p.clicks || 0;
    const imps = p.impressions || 0;
    const pos = p.position || 0;

    sh.getRange(row, 1).setValue(keyword);
    sh.getRange(row, 2).setValue(urlsText);
    sh.getRange(row, 3).setValue(clicks);
    sh.getRange(row, 4).setValue(imps);
    sh.getRange(row, 5).setValue(pos);
  });
}

function formatCannibalizationReport_() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName("Cannibalization Report");
  if (!sh) return;
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return;

  sh.setColumnWidth(1, 250);
  sh.setColumnWidth(2, 750);
  sh.setColumnWidth(3, 110);
  sh.setColumnWidth(4, 110);
  sh.setColumnWidth(5, 110);
  sh.getRange(2, 1, lastRow - 1, 1).setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.getRange(2, 2, lastRow - 1, 1).setHorizontalAlignment("left").setVerticalAlignment("middle");
  sh.getRange(2, 3, lastRow - 1, 3).setHorizontalAlignment("center").setVerticalAlignment("middle");
}

/** ========================================
 * ADVANCED FETCH (NO CACHE)
 * FIXED: Removed caching to avoid "Argument too large" error
 * ======================================== */
function runAdvancedFetchFromUI(formData) {
  const siteUrl = formData.siteUrl;
  const searchType = formData.searchType || "web";
  const dateKey = formData.dateRange || "28d";
  const customStart = formData.startDate || "";
  const customEnd = formData.endDate || "";
  const groupBy = formData.groupBy || [];
  const filters = formData.filters || [];

  if (!siteUrl) throw new Error("Select a GSC property.");

  // Fresh fetch (no caching)
  const range = getGscAdvancedDateRange(dateKey, customStart, customEnd);
  const startDate = range.startDate;
  const endDate = range.endDate;

  const url = "https://www.googleapis.com/webmasters/v3/sites/" +
    encodeURIComponent(siteUrl) + "/searchAnalytics/query";

  const dims = groupBy.filter(function(x) { return !!x; });

  const payload = {
    startDate: startDate,
    endDate: endDate,
    searchType: searchType || "web",
    dimensions: dims.length ? dims : ["query"],
    rowLimit: 25000
  };

  if (filters.length > 0) {
    payload.dimensionFilterGroups = [{
      filters: filters.map(function(f) {
        return {
          dimension: f.dimension,
          operator: f.operator,
          expression: f.expression
        };
      })
    }];
  }

  // Pagination
  let allRows = [];
  let startRow = 0;
  let hasMore = true;

  while (hasMore) {
    const batch = fetchGscDataPage_(url, payload, startRow);
    if (batch.length === 0) {
      hasMore = false;
    } else {
      allRows = allRows.concat(batch);
      startRow += batch.length;
      if (batch.length < payload.rowLimit) hasMore = false;
    }

    // Hard safety limit
    if (startRow >= 400000) {
      hasMore = false;
    }
  }

  // Write to sheet
  writeAdvancedRowsToSheet(allRows, groupBy, startDate, endDate);

  return "Exported " + allRows.length + " rows to GSC Data Sheet ";
}

function fetchGscDataPage_(url, payload, startRow) {
  const reqPayload = Object.assign({}, payload);
  reqPayload.startRow = startRow;

  try {
    const res = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(reqPayload),
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });

    const code = res.getResponseCode();
    if (code !== 200) {
      throw new Error("GSC API error (" + code + "): " + res.getContentText());
    }

    const json = JSON.parse(res.getContentText());
    return json.rows || [];
  } catch (e) {
    Logger.log("Error fetching page at startRow " + startRow + ": " + e);
    return [];
  }
}

/**
 * Helper: Write rows to sheet + apply formatting
 * Used by both fresh fetch and cache hit paths
 */
function writeAdvancedRowsToSheet(allRows, groupBy, startDate, endDate) {
  const ss = SpreadsheetApp.getActive();
  const prevSheet = ss.getActiveSheet();

  const header = groupBy.length
    ? groupBy.concat(["clicks", "impressions", "ctr", "position"])
    : ["query", "clicks", "impressions", "ctr", "position"];

  const sheet = ensureGscDataSheet_(header);

  // Add date range in row 1 after the header
  const dateRangeText = "(" + startDate + " → " + endDate + ")";
  const lastHeaderCol = header.length;
  sheet.getRange(1, lastHeaderCol + 1).setValue(dateRangeText);

  const out = allRows.map(function(r) {
    const keys = r.keys || [];
    return keys.concat([r.clicks || 0, r.impressions || 0, r.ctr || 0, r.position || 0]);
  });

  if (out.length > 0) {
    const BATCH_SIZE = 10000;
    for (let i = 0; i < out.length; i += BATCH_SIZE) {
      const end = Math.min(i + BATCH_SIZE, out.length);
      const batch = out.slice(i, end);
      sheet.getRange(i + 2, 1, batch.length, batch[0].length).setValues(batch);
    }

    // Formatting
    const dimCount = Math.max(0, header.length - 4);
    if (dimCount > 0) {
      sheet.getRange(2, 1, out.length, dimCount)
        .setHorizontalAlignment("left")
        .setVerticalAlignment("middle");
    }
    sheet.getRange(2, Math.max(1, header.length - 3), out.length, Math.min(4, header.length))
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
    
    // Number formatting for CTR and Position columns
    const ctrCol = header.indexOf("ctr") + 1;
    const positionCol = header.indexOf("position") + 1;
    
    if (ctrCol > 0) {
      // CTR: 1 decimal place (0.1)
      sheet.getRange(2, ctrCol, out.length, 1).setNumberFormat("0.0");
    }
    
    if (positionCol > 0) {
      // Position: 0 decimal places (1)
      sheet.getRange(2, positionCol, out.length, 1).setNumberFormat("0");
    }
  }

  try {
    ss.setActiveSheet(prevSheet);
  } catch (e) {
    // silent fail – sheet activation is not critical
  }
}

function getGscAdvancedDateRange(dateKey, customStart, customEnd) {
  const today = new Date();
  const tz = Session.getScriptTimeZone();
  const fmt = function(d) {
    return Utilities.formatDate(d, tz, "yyyy-MM-dd");
  };

  if (dateKey === "custom") {
    if (!customStart || !customEnd) {
      throw new Error("Custom date range requires both start and end dates.");
    }
    return { startDate: customStart, endDate: customEnd };
  }

  let startDate, endDate;
  const daysAgo = parseInt(dateKey.replace("d", ""), 10);
  
  if (!isNaN(daysAgo)) {
    endDate = new Date(today);
    endDate.setDate(endDate.getDate() - 3);
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - daysAgo + 1);
  } else {
    endDate = new Date(today);
    endDate.setDate(endDate.getDate() - 3);
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 27);
  }

  return { startDate: fmt(startDate), endDate: fmt(endDate) };
}

/** ========================================
 * URL TRACKER (NO CACHE - Original Version)
 * FIXED: Removed caching to avoid "Argument too large" error
 * ======================================== */
function fetchGscUrlMetricsFromUI(formData) {
  const siteUrl = formData.siteUrl;
  const dateKey = formData.dateRange || "28d";
  const customStart = formData.startDate || "";
  const customEnd = formData.endDate || "";
  const searchType = formData.searchType || "web";
  const country = (formData.country || "").toString().trim().toUpperCase();

  if (!siteUrl) throw new Error("Select a GSC property.");
  
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName("URL Tracker");
  if (!sheet) sheet = ss.insertSheet("URL Tracker");
  
  const header = ["URL", "Clicks", "Impressions", "CTR", "Avg Position"];
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    throw new Error("No URLs found in 'URL Tracker'. Add URLs in Column A (starting Row 2).");
  }

  const urlValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const urls = urlValues
    .map(function(r) { return (r[0] || "").toString().trim(); })
    .filter(Boolean);
    
  if (!urls.length) {
    throw new Error("No URLs found in 'URL Tracker'. Add URLs in Column A (starting Row 2).");
  }

  const range = getGscAdvancedDateRange(dateKey, customStart, customEnd);
  const startDate = range.startDate;
  const endDate = range.endDate;
  
  const pageMap = fetchGscPageMetricsMap_(siteUrl, startDate, endDate, searchType, country);
  
  const norm = function(u) { return (u || "").toString().trim().replace(/\/+$/, ""); };
  
  const out = urlValues.map(function(r) {
    const raw = (r[0] || "").toString().trim();
    if (!raw) return ["", "", "", "", ""];

    const key1 = raw;
    const key2 = norm(raw);

    let m = pageMap[key1];
    if (!m && key2 !== key1) m = pageMap[key2];

    if (!m) return [raw, 0, 0, 0, 0];

    return [raw, m.clicks, m.impressions, m.ctr, m.position];
  });
  
  sheet.getRange(2, 1, out.length, 5).setValues(out);

  sheet.getRange(2, 2, out.length, 1).setNumberFormat("0");
  sheet.getRange(2, 3, out.length, 1).setNumberFormat("0");
  sheet.getRange(2, 4, out.length, 1).setNumberFormat("0.00%");
  sheet.getRange(2, 5, out.length, 1).setNumberFormat("0.00");

  return "✅ URL Tracker updated.\nRange: " + startDate + " to " + endDate +
    "\nSearch type: " + searchType +
    "\nCountry: " + (country || "All") +
    "\nURLs processed: " + urls.length;
}

function fetchGscPageMetricsMap_(siteUrl, startDate, endDate, searchType, country) {
  const url = "https://www.googleapis.com/webmasters/v3/sites/" +
    encodeURIComponent(siteUrl) + "/searchAnalytics/query";
    
  const payload = {
    startDate: startDate,
    endDate: endDate,
    dimensions: ["page"],
    rowLimit: 25000,
    searchType: searchType
  };
  
  if (country) {
    payload.dimensionFilterGroups = [{
      filters: [{
        dimension: "country",
        operator: "equals",
        expression: country
      }]
    }];
  }

  const res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  
  const code = res.getResponseCode();
  const text = res.getContentText();
  const json = text ? JSON.parse(text) : {};
  
  if (code >= 300) {
    throw new Error("GSC API error (" + code + "): " + text);
  }

  const rows = json.rows || [];
  const map = {};
  const norm = function(u) { return (u || "").toString().trim().replace(/\/+$/, ""); };

  rows.forEach(function(r) {
    const page = (r.keys && r.keys[0]) ? r.keys[0] : "";
    if (!page) return;

    const clicks = Number(r.clicks || 0);
    const impressions = Number(r.impressions || 0);
    const ctr = Number(r.ctr || 0);
    const position = Number(r.position || 0);

    map[page] = { clicks: clicks, impressions: impressions, ctr: ctr, position: position };
    map[norm(page)] = { clicks: clicks, impressions: impressions, ctr: ctr, position: position };
  });
  
  return map;
}
/**
 * Clears the active sheet's content and formatting,
 * preserving the header row (row 1).
 */
function clearActiveSheetExceptHeader() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getMaxRows();
  const lastCol = sheet.getMaxColumns();

  // Ensure there is data below the header before clearing
  if (lastRow > 1) {
    // This clears content, formatting (colors), and data validation
    sheet.getRange(2, 1, lastRow - 1, lastCol).clear();
  }
}
