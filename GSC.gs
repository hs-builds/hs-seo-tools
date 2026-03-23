// HS SEO Tool — GSC Module

const DATA_START_ROW = 2;

function stopKwUpdate() {
  const cache = CacheService.getDocumentCache();
  cache.put("KW_STOP", "1", 600);
  const prev = getKwProgress() || {};
  setKwProgress("stopped", prev.done || 0, prev.total || 0, {
    volatileCount: prev.volatileCount || 0,
    cannibalCount: prev.cannibalCount || 0
  });
}

function parseDDMMYYYY(s) {
  const m = String(s || "").match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return isNaN(d.getTime()) ? null : d;
}

function getKwTrackerMonthRanges(sheet) {
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const ranges = [];
  const tz = Session.getScriptTimeZone();
  const fmt = function(d) { return Utilities.formatDate(d, tz, "yyyy-MM-dd"); };

  for (let col = 3; col <= lastCol; col++) {
    const val = headers[col - 1];
    if (!val) continue;
    let start, end;

    if (Object.prototype.toString.call(val) === "[object Date]") {
      const d = new Date(val);
      start = new Date(d.getFullYear(), d.getMonth(), 1);
      end   = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    } else if (typeof val === "string") {
      const s  = String(val).trim();
      const m2 = s.match(/^(\d{4})[-\/](\d{2})$/);
      if (m2) {
        start = new Date(parseInt(m2[1], 10), parseInt(m2[2], 10) - 1, 1);
        end   = new Date(parseInt(m2[1], 10), parseInt(m2[2], 10), 0);
      } else if (val.indexOf("-") !== -1) {
        const parts = val.split("-").map(function(x) { return String(x).trim(); });
        if (parts.length === 2) {
          const s2 = parseDDMMYYYY(parts[0]);
          const e2 = parseDDMMYYYY(parts[1]);
          if (s2 && e2) { start = s2; end = e2; }
        }
      }
    }

    if (start && end) {
      ranges.push({ col: col, headerName: String(val), startDate: fmt(start), endDate: fmt(end), ts: start.getTime() });
    }
  }

  if (!ranges.length) throw new Error("No month/date headers found from Column C onward.");
  ranges.sort(function(a, b) { return a.ts - b.ts; });
  return ranges;
}

function clearGscSitesCache() {
  CacheService.getScriptCache().remove("GSC_SITES_LIST_V3");
  return getGscSites();
}

function clearKwCheckpoint(siteUrl) {
  const key = "KW_CHECKPOINT_" + (siteUrl || "").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50);
  CacheService.getDocumentCache().remove(key);
}

function getGscSites() {
  const cache    = CacheService.getScriptCache();
  const CACHE_KEY = "GSC_SITES_LIST_V3";
  const cached   = cache.get(CACHE_KEY);
  if (cached) {
    try { return JSON.parse(cached); } catch(e) {}
  }

  let res;
  try {
    res = UrlFetchApp.fetch("https://www.googleapis.com/webmasters/v3/sites", {
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
  } catch(e) {
    throw new Error("Failed to reach GSC API: " + e);
  }

  const code = res.getResponseCode();
  if (code !== 200) {
    let msg = "Unable to load GSC properties.";
    try { msg = JSON.parse(res.getContentText()).error?.message || msg; } catch(e) {}
    throw new Error(msg + " (HTTP " + code + ")");
  }

  const sites = (JSON.parse(res.getContentText()).siteEntry || []).map(s => ({
    siteUrl: s.siteUrl,
    permissionLevel: s.permissionLevel
  }));
  cache.put(CACHE_KEY, JSON.stringify(sites), 21600);
  return sites;
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function setKwProgress(status, done, total, extras) {
  const cache = CacheService.getDocumentCache();
  let startTs = cache.get("KW_START_TS");
  if (!startTs) {
    startTs = String(Date.now());
    cache.put("KW_START_TS", startTs, 21600);
  }
  const payload = { status, done, total, startTs: Number(startTs) };
  if (extras) Object.keys(extras).forEach(k => { payload[k] = extras[k]; });
  cache.put("kwProgress", JSON.stringify(payload), 600);
}

function getKwProgress() {
  const raw = CacheService.getDocumentCache().get("kwProgress");
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    obj.elapsedMs = Date.now() - Number(obj.startTs || Date.now());
    return obj;
  } catch(e) { return null; }
}

function toRankNumber_(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
}

function findPrevRankInRow_(rowData, currentMonthIndex, monthRanges) {
  for (let i = currentMonthIndex - 1; i >= 0; i--) {
    const prevVal = toRankNumber_(rowData[monthRanges[i].col - 1]);
    if (prevVal !== null) return { rank: prevVal, headerName: monthRanges[i].headerName };
  }
  return null;
}

function ensureGscDataSheet_(header) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName("GSC Data");
  if (!sh) sh = ss.insertSheet("GSC Data");

  sh.getRange(1, 1, 1, header.length).setValues([header]);
  sh.setFrozenRows(1);
  const maxCols = sh.getMaxColumns();
  if (maxCols > header.length) sh.deleteColumns(header.length + 1, maxCols - header.length);
  else if (maxCols < header.length) sh.insertColumnsAfter(maxCols, header.length - maxCols);

  const lastRow = sh.getLastRow();
  if (lastRow > 1) {
    sh.getRange(2, 1, lastRow - 1, header.length).clearContent();
    sh.getRange(2, 1, lastRow - 1, header.length).setBackground(null).setNote("");
  }

  sh.getDataRange().setFontFamily("Sora");
  sh.getRange(1, 1, 1, header.length).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");

  const metricCols = ["clicks", "impressions", "ctr", "position"];
  header.forEach(function(h, i) {
    const col = i + 1;
    const key = String(h || "").toLowerCase();
    sh.setColumnWidth(col, metricCols.indexOf(key) !== -1 ? 110 : (col === 1 ? 250 : 450));
  });
  return sh;
}

function fetchGscKeywordRanksForMonth_(siteUrl, keywords, startDate, endDate, country) {
  const url   = "https://www.googleapis.com/webmasters/v3/sites/" + encodeURIComponent(siteUrl) + "/searchAnalytics/query";
  const kwMap = {};
  keywords.forEach(kw => { kwMap[kw.toLowerCase()] = kw; });

  const payload = { startDate, endDate, dimensions: ["query", "page"], searchType: "web", rowLimit: 25000 };
  if (country && country.trim()) {
    payload.dimensionFilterGroups = [{ filters: [{ dimension: "country", operator: "equals", expression: country.trim().toUpperCase() }] }];
  }

  const rawPages = {};
  let startRow = 0, hasMore = true;
  while (hasMore) {
    try {
      const res  = UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", payload: JSON.stringify({ ...payload, startRow }), headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
      if (res.getResponseCode() !== 200) break;
      const rows = JSON.parse(res.getContentText()).rows || [];
      if (!rows.length) { hasMore = false; break; }
      rows.forEach(r => {
        const q = r.keys && r.keys[0] ? r.keys[0].toLowerCase() : "";
        if (!kwMap[q]) return;
        const kw = kwMap[q];
        if (!rawPages[kw]) rawPages[kw] = [];
        rawPages[kw].push({ page: r.keys[1] || "", position: Number(r.position || 0), clicks: Number(r.clicks || 0), impressions: Number(r.impressions || 0), ctr: Number(r.ctr || 0) });
      });
      startRow += rows.length;
      if (rows.length < payload.rowLimit) hasMore = false;
    } catch(e) { hasMore = false; }
  }

  const results = {};
  Object.keys(rawPages).forEach(kw => {
    const pages = rawPages[kw];
    const totalImp = pages.reduce((s, p) => s + p.impressions, 0);
    const threshold = Math.max(totalImp * 0.20, 2);
    let significant = pages.filter(p => p.impressions >= threshold);
    if (!significant.length) {
      const top = pages.reduce((b, p) => p.impressions > b.impressions ? p : b, pages[0]);
      significant = [top];
    }
    let best = significant.find(p => p.position > 0) || null;
    significant.forEach(p => { if (p.position > 0 && (!best || p.position < best.position)) best = p; });
    if (!best) best = significant[0];
    if (best) results[kw] = { position: best.position, clicks: best.clicks, impressions: best.impressions, ctr: best.ctr };
  });
  return results;
}

function fetchGscKeywordRanksForMonthWithPages_(siteUrl, keywords, startDate, endDate, country, dimensions) {
  const url   = "https://www.googleapis.com/webmasters/v3/sites/" + encodeURIComponent(siteUrl) + "/searchAnalytics/query";
  const kwMap = {};
  keywords.forEach(kw => { kwMap[kw.toLowerCase()] = kw; });

  const payload = { startDate, endDate, dimensions, searchType: "web", rowLimit: 25000 };
  if (country && country.trim()) {
    payload.dimensionFilterGroups = [{ filters: [{ dimension: "country", operator: "equals", expression: country.trim().toUpperCase() }] }];
  }

  const rawPages = {};
  let startRow = 0, hasMore = true;
  while (hasMore) {
    try {
      const res  = UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", payload: JSON.stringify({ ...payload, startRow }), headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
      if (res.getResponseCode() !== 200) break;
      const rows = JSON.parse(res.getContentText()).rows || [];
      if (!rows.length) break;
      rows.forEach(r => {
        const q = r.keys && r.keys[0] ? r.keys[0].toLowerCase() : "";
        if (!kwMap[q]) return;
        const kw = kwMap[q];
        if (!rawPages[kw]) rawPages[kw] = [];
        rawPages[kw].push({ page: r.keys[1] || "", clicks: Number(r.clicks || 0), impressions: Number(r.impressions || 0), position: Number(r.position || 0) });
      });
      startRow += rows.length;
      if (rows.length < payload.rowLimit) hasMore = false;
    } catch(e) { hasMore = false; }
  }

  const results = {};
  Object.keys(rawPages).forEach(kw => {
    const pages = rawPages[kw];
    const totalImp  = pages.reduce((s, p) => s + p.impressions, 0);
    const threshold = Math.max(totalImp * 0.20, 2);
    let significant = pages.filter(p => p.impressions >= threshold);
    if (!significant.length) significant = [pages.reduce((b, p) => p.impressions > b.impressions ? p : b, pages[0])];
    let best = significant.reduce((b, p) => { if (p.position <= 0) return b; if (!b || p.position < b.position) return p; return b; }, null) || significant[0];
    results[kw] = {
      position: best ? best.position : 0, clicks: best ? best.clicks : 0,
      impressions: best ? best.impressions : 0, ctr: best ? best.ctr || 0 : 0,
      pageDetails: significant.map(p => ({ page: p.page, clicks: p.clicks, impressions: p.impressions, position: Math.round(p.position) }))
    };
  });
  return results;
}

function fetchGscKeywordRanksFromUI(formData) {
  const siteUrl        = formData.siteUrl;
  const country        = (formData.country || "").toString().trim();
  const fetchPages     = formData.fetchPages     || false;
  const cannibalReport = formData.cannibalReport || false;
  const monthsFromUI   = formData.months         || [];
  const keywordsFromUI = formData.keywords       || [];

  if (!siteUrl) throw new Error("Select a GSC property.");

  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName("KW Tracker");
  if (!sheet) sheet = ss.insertSheet("KW Tracker");

  if (keywordsFromUI && keywordsFromUI.length > 0) {
    const existingLastRow = sheet.getLastRow();
    const existingKws    = new Set();
    if (existingLastRow >= DATA_START_ROW) {
      sheet.getRange(DATA_START_ROW, 1, existingLastRow - 1, 1).getValues()
        .forEach(r => { const v = (r[0] || "").toString().trim().toLowerCase(); if (v) existingKws.add(v); });
    }
    const newKws = keywordsFromUI.filter(kw => kw.trim() && !existingKws.has(kw.trim().toLowerCase()));
    if (newKws.length > 0) {
      const writeStartRow = Math.max(sheet.getLastRow() + 1, DATA_START_ROW);
      sheet.getRange(writeStartRow, 1, newKws.length, 1).setValues(newKws.map(kw => [kw.trim()]));
    }

    const totalCols = Math.max(sheet.getLastColumn(), 3);
    sheet.getRange(1, 1, 1, totalCols).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.setColumnWidth(1, 250);
    sheet.setColumnWidth(2, 550);
    const lastCol = sheet.getLastColumn();
    for (let c = 3; c <= lastCol; c++) sheet.setColumnWidth(c, 80);
    if (sheet.getLastRow() >= DATA_START_ROW && lastCol >= 3) {
      sheet.getRange(DATA_START_ROW, 3, sheet.getLastRow() - 1, lastCol - 2).setHorizontalAlignment("center");
    }
    if (!sheet.getRange(1, 1).getValue()) sheet.getRange(1, 1).setValue("Keywords");
    if (!sheet.getRange(1, 2).getValue()) sheet.getRange(1, 2).setValue("Page");
    SpreadsheetApp.flush();
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) throw new Error("No keywords in Column A (starting from Row 2).");

  let monthRanges;
  if (monthsFromUI && monthsFromUI.length > 0) {
    const tz  = Session.getScriptTimeZone();
    const fmt = d => Utilities.formatDate(d, tz, "yyyy-MM-dd");

    const resolved = monthsFromUI.map(entry => {
      if (entry && typeof entry === "object" && entry.type === "exact") {
        return { startDate: entry.startDate, endDate: entry.endDate, label: entry.startDate + " → " + entry.endDate };
      }
      const parts = entry.split("-");
      const yr = parseInt(parts[0], 10), mo = parseInt(parts[1], 10);
      return { startDate: fmt(new Date(yr, mo - 1, 1)), endDate: fmt(new Date(yr, mo, 0)), label: entry };
    });

    let currentLastCol = sheet.getLastColumn();
    const headers = currentLastCol > 0 ? sheet.getRange(1, 1, 1, currentLastCol).getValues()[0] : [];
    let nextCol = Math.max(currentLastCol + 1, 3);

    monthRanges = resolved.map(r => {
      let col = -1;
      for (let i = 2; i < headers.length; i++) {
        if (String(headers[i] || "").trim() === r.label) { col = i + 1; break; }
      }
      if (col === -1) {
        col = nextCol++;
        sheet.getRange(1, col).setValue(r.label).setFontWeight("bold").setHorizontalAlignment("center");
        sheet.setColumnWidth(col, 80);
        headers.push(r.label);
      }
      return { col, headerName: r.label, startDate: r.startDate, endDate: r.endDate, ts: new Date(r.startDate).getTime() };
    });
    monthRanges.sort((a, b) => a.ts - b.ts);
  } else {
    monthRanges = getKwTrackerMonthRanges(sheet);
  }

  if (!monthRanges.length) throw new Error("No date range selected and no month headers found in the sheet.");

  const allData    = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const keywords   = [];
  const rowNumbers = [];
  allData.forEach((row, idx) => {
    const kw = (row[0] || "").toString().trim();
    if (kw) { keywords.push(kw); rowNumbers.push(idx + 2); }
  });
  if (!keywords.length) throw new Error("No keywords found in Column A.");

  const cache = CacheService.getDocumentCache();
  cache.remove("KW_STOP");

  const CHECKPOINT_KEY     = "KW_CHECKPOINT_" + siteUrl.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50);
  const existingCheckpoint = cache.get(CHECKPOINT_KEY);
  const completedMonths    = existingCheckpoint ? JSON.parse(existingCheckpoint) : [];
  const isResume           = completedMonths.length > 0;
  if (!isResume) cache.remove(CHECKPOINT_KEY);

  if (cannibalReport) { ensureCannibalizationReportSheet_(); clearCannibalizationReport_(); }

  setKwProgress("running", 0, monthRanges.length, { volatileCount: 0, cannibalCount: 0 });

  let volatileCount = 0, cannibalCount = 0, latestMonthRankData = null;

  for (let monthIdx = 0; monthIdx < monthRanges.length; monthIdx++) {
    if (cache.get("KW_STOP") === "1") {
      setKwProgress("stopped", monthIdx, monthRanges.length, { volatileCount, cannibalCount: 0 });
      return "Update stopped by user at month " + (monthIdx + 1) + " of " + monthRanges.length;
    }

    const isLatestMonth = (monthIdx === monthRanges.length - 1);
    if (isResume && !isLatestMonth && completedMonths.indexOf(monthIdx) !== -1) {
      setKwProgress("running", monthIdx + 1, monthRanges.length, { volatileCount, cannibalCount });
      continue;
    }

    const m = monthRanges[monthIdx];
    let rankData;
    if (isLatestMonth && (fetchPages || cannibalReport)) {
      rankData = fetchGscKeywordRanksForMonthWithPages_(siteUrl, keywords, m.startDate, m.endDate, country, ["query", "page"]);
      latestMonthRankData = rankData;
    } else {
      rankData = fetchGscKeywordRanksForMonth_(siteUrl, keywords, m.startDate, m.endDate, country);
    }

    const colData       = [];
    const volatileCells = [];

    keywords.forEach((kw, kwIdx) => {
      const data     = rankData[kw];
      const position = data ? Math.round(data.position) : 0;
      colData.push([position]);

      if (cannibalReport && isLatestMonth && data && data.pageDetails && data.pageDetails.length > 1) {
        appendCannibalizationReport_(kw, data.pageDetails);
        cannibalCount++;
      }

      if (position > 0) {
        const prevRank = findPrevRankInRow_(allData[kwIdx], monthIdx, monthRanges);
        if (prevRank && prevRank.rank > 0 && Math.abs(position - prevRank.rank) > 5) {
          volatileCells.push({ row: rowNumbers[kwIdx], col: m.col, prevRank: prevRank.rank, newRank: position });
          volatileCount++;
        }
      }
    });

    if (colData.length > 0) {
      sheet.getRange(2, m.col, colData.length, 1).setValues(colData).setNumberFormat("0");
      keywords.forEach((kw, kwIdx) => { allData[kwIdx][m.col - 1] = colData[kwIdx][0]; });

      if (volatileCells.length > 0) {
        const bgCol = colData.map(() => [null]);
        volatileCells.forEach(v => { bgCol[v.row - 2][0] = (v.newRank - v.prevRank < 0) ? "#d9ead3" : "#f4cccc"; });
        sheet.getRange(2, m.col, bgCol.length, 1).setBackgrounds(bgCol);
      }
    }

    setKwProgress("running", monthIdx + 1, monthRanges.length, { volatileCount, cannibalCount });
    completedMonths.push(monthIdx);
    try { cache.put(CHECKPOINT_KEY, JSON.stringify(completedMonths), 21600); } catch(e) {}
  }

  if (fetchPages) {
    if (latestMonthRankData) {
      const colBData = keywords.map(kw => {
        const data = latestMonthRankData[kw];
        if (data && data.pageDetails && data.pageDetails.length > 0) {
          let best = data.pageDetails.reduce((b, p) => { if (p.position <= 0) return b; if (!b || p.position < b.position) return p; return b; }, null) || data.pageDetails[0];
          return [best && best.page ? best.page : ""];
        }
        return [""];
      });
      sheet.getRange(rowNumbers[0], 2, colBData.length, 1).setValues(colBData);
    } else {
      const recentMonth = monthRanges[monthRanges.length - 1];
      fetchPagesForKeywordsToColumnB_(sheet, siteUrl, keywords, rowNumbers, recentMonth.startDate, recentMonth.endDate, country);
    }
  }

  if (monthRanges.length >= 2) {
    const latestM  = monthRanges[monthRanges.length - 1];
    const prevM    = monthRanges[monthRanges.length - 2];
    const deltaCol = latestM.col + 1;

    sheet.getRange(1, deltaCol).setValue("Δ vs " + prevM.headerName).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#f1f3f4");
    sheet.setColumnWidth(deltaCol, 80);

    const latestVals = sheet.getRange(2, latestM.col, keywords.length, 1).getValues();
    const prevVals   = sheet.getRange(2, prevM.col,   keywords.length, 1).getValues();
    const deltaValues = [], deltaBgs = [], deltaFonts = [];

    for (let di = 0; di < keywords.length; di++) {
      const cur  = Number(latestVals[di][0] || 0);
      const prev = Number(prevVals[di][0]   || 0);
      if (cur === 0 || prev === 0) {
        deltaValues.push(["—"]); deltaBgs.push([null]); deltaFonts.push(["#999999"]);
      } else {
        const diff = cur - prev;
        deltaValues.push([diff]);
        if (diff < 0)      { deltaBgs.push(["#d9ead3"]); deltaFonts.push(["#274e13"]); }
        else if (diff > 0) { deltaBgs.push(["#fce8e6"]); deltaFonts.push(["#7f0000"]); }
        else               { deltaBgs.push([null]);       deltaFonts.push(["#555555"]); }
      }
    }

    const deltaRange = sheet.getRange(2, deltaCol, keywords.length, 1);
    deltaRange.setValues(deltaValues).setBackgrounds(deltaBgs).setFontColors(deltaFonts).setHorizontalAlignment("center").setNumberFormat("0;-0;0");
  }

  const summaryLabel = "Avg Position";
  let sRow = -1;
  const lastR = sheet.getLastRow();
  for (let r = lastR; r >= 2; r--) {
    if (String(sheet.getRange(r, 1).getValue()).trim() === summaryLabel) { sRow = r; break; }
  }
  if (sRow === -1) sRow = sheet.getLastRow() + 1;

  sheet.getRange(sRow, 1).setValue(summaryLabel).setFontWeight("bold").setBackground("#e8eaed").setHorizontalAlignment("center");
  monthRanges.forEach(m => {
    const colVals = sheet.getRange(2, m.col, keywords.length, 1).getValues();
    let sum = 0, count = 0;
    colVals.forEach(r => { const v = Number(r[0] || 0); if (v > 0) { sum += v; count++; } });
    const avg = count > 0 ? Math.round(sum / count) : 0;
    sheet.getRange(sRow, m.col).setValue(avg > 0 ? avg : "—").setFontWeight("bold").setBackground("#e8eaed").setHorizontalAlignment("center").setNumberFormat("0");
  });
  if (monthRanges.length >= 2) {
    sheet.getRange(sRow, monthRanges[monthRanges.length - 1].col + 1).setValue("").setBackground("#e8eaed");
  }

  if (cannibalReport) formatCannibalizationReport_();

  setKwProgress("done", monthRanges.length, monthRanges.length, { volatileCount, cannibalCount });
  cache.remove(CHECKPOINT_KEY);

  let msg = "✅ KW Tracker " + (isResume ? "Resumed & " : "") + "Updated\n\n";
  msg += "Keywords: " + keywords.length + "\n";
  msg += "Months: " + monthRanges.length + "\n";
  if (isResume) msg += "Resumed from month " + completedMonths.length + "\n";
  msg += "Volatile rankings: " + volatileCount + "\n";
  if (monthRanges.length >= 2) msg += "Δ column added vs " + monthRanges[monthRanges.length - 2].headerName + "\n";
  msg += "Summary row updated\n";
  if (fetchPages) msg += "Pages fetched to Column B\n";
  if (cannibalReport) msg += "Cannibalization keywords: " + cannibalCount + "\n";
  return msg;
}

function fetchPagesForKeywordsToColumnB_(sheet, siteUrl, keywords, rowNumbers, startDate, endDate, country) {
  const url   = "https://www.googleapis.com/webmasters/v3/sites/" + encodeURIComponent(siteUrl) + "/searchAnalytics/query";
  const kwMap = {};
  keywords.forEach(kw => { kwMap[kw.toLowerCase()] = kw; });

  const payload = { startDate, endDate, dimensions: ["query", "page"], searchType: "web", rowLimit: 25000 };
  if (country && country.trim()) {
    payload.dimensionFilterGroups = [{ filters: [{ dimension: "country", operator: "equals", expression: country.trim().toUpperCase() }] }];
  }

  const rawPages = {};
  let startRow = 0, hasMore = true;
  while (hasMore) {
    try {
      const res  = UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", payload: JSON.stringify({ ...payload, startRow }), headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
      if (res.getResponseCode() !== 200) break;
      const rows = JSON.parse(res.getContentText()).rows || [];
      if (!rows.length) break;
      rows.forEach(r => {
        const q = (r.keys[0] || "").toLowerCase();
        if (!kwMap[q]) return;
        const kw = kwMap[q];
        if (!rawPages[kw]) rawPages[kw] = [];
        rawPages[kw].push({ page: r.keys[1] || "", clicks: Number(r.clicks || 0), impressions: Number(r.impressions || 0), position: Number(r.position || 0) });
      });
      startRow += rows.length;
      if (rows.length < payload.rowLimit) hasMore = false;
    } catch(e) { break; }
  }

  keywords.forEach((kw, idx) => {
    const pages = rawPages[kw];
    if (!pages || !pages.length) return;
    const totalImp  = pages.reduce((s, p) => s + p.impressions, 0);
    const threshold = Math.max(totalImp * 0.20, 2);
    let significant = pages.filter(p => p.impressions >= threshold);
    if (!significant.length) significant = [pages.reduce((b, p) => p.impressions > b.impressions ? p : b, pages[0])];
    let best = null;
    significant.forEach(p => { if (p.position > 0 && (!best || p.position < best.position)) best = p; });
    if (!best) best = significant[0];
    if (best && best.page) sheet.getRange(rowNumbers[idx], 2).setValue(best.page);
  });
}

function ensureCannibalizationReportSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName("Cannibalization Report");
  if (!sh) sh = ss.insertSheet("Cannibalization Report");

  const maxCols = sh.getMaxColumns();
  if (maxCols > 5) sh.deleteColumns(6, maxCols - 5);
  else if (maxCols < 5) sh.insertColumnsAfter(maxCols, 5 - maxCols);

  sh.getRange(1, 1, 1, 5).setValues([["Keyword", "URLs", "Clicks", "Impression", "Position"]]);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, 5)
    .setFontWeight("bold").setHorizontalAlignment("center")
    .setVerticalAlignment("middle").setBackground("#f1f3f4");

  [250, 750, 100, 100, 100].forEach((w, i) => sh.setColumnWidth(i + 1, w));
  return sh;
}

function clearCannibalizationReport_() {
  const sh = SpreadsheetApp.getActive().getSheetByName("Cannibalization Report");
  if (!sh) return;
  const last = sh.getLastRow();
  if (last > 1) {
    // Break any merges before clearing
    try { sh.getRange(2, 1, last - 1, 5).breakApart(); } catch(e) {}
    sh.getRange(2, 1, last - 1, 5).clearContent().setBackground(null).setFontColor(null).setFontWeight("normal");
  }
}

function appendCannibalizationReport_(keyword, pageDetails) {
  if (!pageDetails || !pageDetails.length) return;
  const sh = SpreadsheetApp.getActive().getSheetByName("Cannibalization Report");
  if (!sh) return;

  const winner = pageDetails.reduce((best, p) => {
    if (!best) return p;
    if (p.position > 0 && (best.position === 0 || p.position < best.position)) return p;
    if (p.position === best.position && p.impressions > best.impressions) return p;
    return best;
  }, null);

  const n        = pageDetails.length;
  const startRow = sh.getLastRow() + 1;

  // Col A: keyword in first row only; cols B-E: page data
  sh.getRange(startRow, 1, n, 1).setValues(pageDetails.map((_, i) => [i === 0 ? keyword : ""]));
  sh.getRange(startRow, 2, n, 4).setValues(pageDetails.map(p => [p.page || "", p.clicks || 0, p.impressions || 0, p.position || 0]));

  // Merge keyword cell vertically across all page rows
  if (n > 1) sh.getRange(startRow, 1, n, 1).merge();

  // Keyword cell — no fill, black text, centered + middle + wrap + bold
  sh.getRange(startRow, 1, n, 1)
    .setBackground(null).setFontColor("#000000")
    .setFontWeight("bold").setHorizontalAlignment("center")
    .setVerticalAlignment("middle").setWrap(true);

  // URL + metric cells — colour by winner/loser
  const bgGrid = [], fontGrid = [], weightGrid = [];
  pageDetails.forEach(p => {
    const isWinner = winner && p.page === winner.page;
    const bg = isWinner ? "#d9ead3" : "#fce8e6";
    const fc = isWinner ? "#274e13" : "#7f0000";
    const fw = isWinner ? "bold"    : "normal";
    bgGrid.push([bg, bg, bg, bg]);
    fontGrid.push([fc, fc, fc, fc]);
    weightGrid.push([fw, fw, fw, fw]);
  });
  sh.getRange(startRow, 2, n, 4).setBackgrounds(bgGrid).setFontColors(fontGrid).setFontWeights(weightGrid);
  sh.getRange(startRow, 2, n, 1).setHorizontalAlignment("left").setVerticalAlignment("middle");
  sh.getRange(startRow, 3, n, 3).setHorizontalAlignment("center").setVerticalAlignment("middle");

  // Border around entire keyword group (A-E), inner horizontal lines on B-E between rows
  sh.getRange(startRow, 1, n, 5).setBorder(true, true, true, true, false, false, "#cccccc", SpreadsheetApp.BorderStyle.SOLID);
  if (n > 1) {
    sh.getRange(startRow, 2, n, 4).setBorder(null, null, null, null, false, true, "#cccccc", SpreadsheetApp.BorderStyle.SOLID);
  }

  // Insert a blank row after the group so getLastRow() tracks it for the next keyword
  sh.insertRowAfter(startRow + n - 1);
}


function formatCannibalizationReport_() {
  const sh = SpreadsheetApp.getActive().getSheetByName("Cannibalization Report");
  if (!sh) return;
  if (sh.getLastRow() < 2) return;

  // Column widths (already set per-append but enforce here too)
  [250, 750, 100, 100, 100].forEach((w, i) => sh.setColumnWidth(i + 1, w));
}

function runAdvancedFetchFromUI(formData) {
  const siteUrl    = formData.siteUrl;
  const months     = formData.months     || [];
  const searchType = formData.searchType || "web";
  const groupBy    = formData.groupBy    || [];
  const filters    = formData.filters    || [];
  const rowFilters = formData.rowFilters || {};

  if (!siteUrl)            throw new Error("Select a GSC property.");
  if (months.length === 0) throw new Error("Select at least one month.");

  // Build a post-fetch row filter function from operator+value conditions
  const hasRowFilters = Object.keys(rowFilters).length > 0;
  const applyOp_ = (actual, op, val) => {
    switch(op) {
      case 'eq':  return actual === val;
      case 'neq': return actual !== val;
      case 'gt':  return actual >   val;
      case 'gte': return actual >=  val;
      case 'lt':  return actual <   val;
      case 'lte': return actual <=  val;
      default:    return true;
    }
  };
  const passesRowFilter = (clicks, impressions, position) => {
    if (rowFilters.clicks      && !applyOp_(clicks,      rowFilters.clicks.op,      rowFilters.clicks.val))      return false;
    if (rowFilters.impressions && !applyOp_(impressions, rowFilters.impressions.op, rowFilters.impressions.val)) return false;
    if (rowFilters.position    && !applyOp_(position,    rowFilters.position.op,    rowFilters.position.val))    return false;
    return true;
  };

  const resolvedMonthLabels = [];
  const resolvedDateRanges  = [];
  months.forEach(monthEntry => {
    let startDate, endDate, monthLabel;
    if (monthEntry && typeof monthEntry === "object" && monthEntry.type === "exact") {
      startDate = monthEntry.startDate; endDate = monthEntry.endDate;
      monthLabel = startDate + " → " + endDate;
    } else {
      const dr = parseMonthToDateRange(monthEntry);
      startDate = dr.startDate; endDate = dr.endDate; monthLabel = monthEntry;
    }
    resolvedMonthLabels.push(monthLabel);
    resolvedDateRanges.push({ startDate, endDate, label: monthLabel });
  });

  const ss           = SpreadsheetApp.getActive();
  const prevSheet    = ss.getActiveSheet();
  const dimensions   = groupBy.length ? groupBy : ["query", "page"];
  const metricLabels = ["Clicks", "Impressions", "CTR", "Position"];

  let sheet = ss.getSheetByName("GSC Data");
  if (!sheet) sheet = ss.insertSheet("GSC Data");
  sheet.clear();

  buildTwoRowMonthHeader_(sheet, dimensions, resolvedMonthLabels, metricLabels);
  const FETCH_DATA_START_ROW = 3;
  const totalCols = dimensions.length + (resolvedMonthLabels.length * metricLabels.length);
  sheet.getDataRange().setFontFamily("Sora");

  dimensions.forEach((dim, i) => sheet.setColumnWidth(i + 1, i === 0 ? 300 : 200));
  let col = dimensions.length + 1;
  resolvedMonthLabels.forEach(() => {
    sheet.setColumnWidth(col++, 100); sheet.setColumnWidth(col++, 120);
    sheet.setColumnWidth(col++, 80);  sheet.setColumnWidth(col++, 110);
  });

  let totalRowsWritten = 0;
  const isSingleRange = resolvedDateRanges.length === 1;

  if (isSingleRange) {
    const dr     = resolvedDateRanges[0];
    const apiUrl = "https://www.googleapis.com/webmasters/v3/sites/" + encodeURIComponent(siteUrl) + "/searchAnalytics/query";
    const payload = { startDate: dr.startDate, endDate: dr.endDate, dimensions, searchType, rowLimit: 25000, dataState: "all" };
    if (filters && filters.length > 0) payload.dimensionFilterGroups = [{ filters }];

    let startRow = 0, writeRow = FETCH_DATA_START_ROW, pageNum = 0;
    while (true) {
      let rows = [];
      try {
        const res = UrlFetchApp.fetch(apiUrl, { method: "post", contentType: "application/json", payload: JSON.stringify({ ...payload, startRow }), headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
        if (res.getResponseCode() !== 200) throw new Error("GSC API error (" + res.getResponseCode() + "): " + res.getContentText());
        rows = JSON.parse(res.getContentText()).rows || [];
      } catch(e) { break; }

      if (!rows.length) break;
      let outBatch = rows.map(r => { const base = (r.keys || []).slice(); base.push(r.clicks || 0, r.impressions || 0, r.ctr || 0, r.position || 0); return base; });
      if (hasRowFilters) {
        const dimLen = dimensions.length;
        outBatch = outBatch.filter(r => passesRowFilter(r[dimLen], r[dimLen + 1], r[dimLen + 3]));
      }
      if (outBatch.length > 0) {
        sheet.getRange(writeRow, 1, outBatch.length, totalCols).setValues(outBatch);
        writeRow += outBatch.length; totalRowsWritten += outBatch.length;
      }
      startRow += rows.length; pageNum++;
      if (pageNum % 5 === 0) SpreadsheetApp.flush();
      if (rows.length < payload.rowLimit) break;
    }
  } else {
    const allDataMap = {};
    resolvedDateRanges.forEach(dr => {
      fetchGscDataForMonth_(siteUrl, dr.startDate, dr.endDate, searchType, dimensions, filters).forEach(row => {
        const dimKey = (row.keys || []).join("|||");
        if (!allDataMap[dimKey]) allDataMap[dimKey] = { keys: row.keys || [], months: {} };
        allDataMap[dimKey].months[dr.label] = { clicks: row.clicks || 0, impressions: row.impressions || 0, ctr: row.ctr || 0, position: row.position || 0 };
      });
    });

    const outRows = [];
    Object.keys(allDataMap).forEach(dimKey => {
      const item = allDataMap[dimKey];
      const row  = item.keys.slice();
      resolvedMonthLabels.forEach(lbl => {
        const md = item.months[lbl];
        if (md) row.push(md.clicks, md.impressions, md.ctr, md.position);
        else    row.push(0, 0, 0, 0);
      });
      outRows.push(row);
    });

    if (outRows.length > 0) {
      const dimLen = dimensions.length;
      const filtered = hasRowFilters
        ? outRows.filter(r => {
            const clicks = r[dimLen], impressions = r[dimLen + 1], position = r[dimLen + 3];
            return passesRowFilter(clicks, impressions, position);
          })
        : outRows;
      const BATCH_SIZE = 10000;
      for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
        sheet.getRange(i + FETCH_DATA_START_ROW, 1, Math.min(BATCH_SIZE, filtered.length - i), totalCols).setValues(filtered.slice(i, i + BATCH_SIZE));
      }
      totalRowsWritten = filtered.length;
    }
  }

  if (totalRowsWritten > 0) {
    let colIdx = dimensions.length + 1;
    resolvedMonthLabels.forEach(() => {
      sheet.getRange(FETCH_DATA_START_ROW, colIdx, totalRowsWritten, 1).setNumberFormat("0");    colIdx++;
      sheet.getRange(FETCH_DATA_START_ROW, colIdx, totalRowsWritten, 1).setNumberFormat("0");    colIdx++;
      sheet.getRange(FETCH_DATA_START_ROW, colIdx, totalRowsWritten, 1).setNumberFormat("0.0%"); colIdx++;
      sheet.getRange(FETCH_DATA_START_ROW, colIdx, totalRowsWritten, 1).setNumberFormat("0");    colIdx++;
    });
    if (dimensions.length > 0) sheet.getRange(FETCH_DATA_START_ROW, 1, totalRowsWritten, dimensions.length).setHorizontalAlignment("left");
    sheet.getRange(FETCH_DATA_START_ROW, dimensions.length + 1, totalRowsWritten, resolvedMonthLabels.length * 4).setHorizontalAlignment("center");
  }

  try { ss.setActiveSheet(prevSheet); } catch(e) {}

  let msg = "✅ GSC Data updated!\nDate range: " + resolvedMonthLabels.join(", ") + "\nTotal rows: " + totalRowsWritten + "\nDimensions: " + dimensions.join(", ");
  if (hasRowFilters) {
    const opLabel = { eq:'=', neq:'≠', gt:'>', gte:'≥', lt:'<', lte:'≤' };
    const parts = [];
    if (rowFilters.clicks)      parts.push("Clicks "      + (opLabel[rowFilters.clicks.op]      || '') + " " + rowFilters.clicks.val);
    if (rowFilters.impressions) parts.push("Impressions " + (opLabel[rowFilters.impressions.op] || '') + " " + rowFilters.impressions.val);
    if (rowFilters.position)    parts.push("Position "    + (opLabel[rowFilters.position.op]    || '') + " " + rowFilters.position.val);
    msg += "\nRow filters: " + parts.join(", ");
  }
  return msg;
}

function fetchGscDataForMonth_(siteUrl, startDate, endDate, searchType, dimensions, filters) {
  const url     = "https://www.googleapis.com/webmasters/v3/sites/" + encodeURIComponent(siteUrl) + "/searchAnalytics/query";
  const payload = { startDate, endDate, dimensions, searchType, rowLimit: 25000, dataState: "all" };
  if (filters && filters.length > 0) payload.dimensionFilterGroups = [{ filters }];

  const allRows = [];
  let startRow = 0, hasMore = true;
  while (hasMore) {
    try {
      const res  = UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", payload: JSON.stringify({ ...payload, startRow }), headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
      if (res.getResponseCode() !== 200) throw new Error("GSC API error (" + res.getResponseCode() + "): " + res.getContentText());
      const rows = JSON.parse(res.getContentText()).rows || [];
      if (!rows.length) { hasMore = false; break; }
      allRows.push(...rows);
      startRow += rows.length;
      if (rows.length < payload.rowLimit) hasMore = false;
    } catch(e) { hasMore = false; }
  }
  return allRows;
}

function fetchGscPageMetricsMap_(siteUrl, startDate, endDate, searchType, country, targetUrls) {
  const apiUrl = "https://www.googleapis.com/webmasters/v3/sites/" + encodeURIComponent(siteUrl) + "/searchAnalytics/query";
  const norm   = u => (u || "").toString().trim().replace(/\/+$/, "");
  const map    = {};

  if (!targetUrls || !targetUrls.length) return map;

  const token = ScriptApp.getOAuthToken();
  const BATCH = 10, SLEEP_MS = 500, total = targetUrls.length;

  for (let b = 0; b < total; b += BATCH) {
    const batchUrls = targetUrls.slice(b, Math.min(b + BATCH, total));

    const requests = batchUrls.map(pageUrl => {
      const filters = [{ dimension: "page", operator: "equals", expression: pageUrl }];
      if (country) filters.push({ dimension: "country", operator: "equals", expression: country });
      return { url: apiUrl, method: "post", contentType: "application/json", headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true,
        payload: JSON.stringify({ startDate, endDate, dimensions: ["page"], rowLimit: 1, searchType, dimensionFilterGroups: [{ filters }] }) };
    });

    let responses;
    try { responses = UrlFetchApp.fetchAll(requests); }
    catch(e) { continue; }

    responses.forEach((res, i) => {
      const pageUrl = batchUrls[i];
      try {
        if (res.getResponseCode() >= 300) return;
        const rows = (JSON.parse(res.getContentText()) || {}).rows || [];
        if (rows.length > 0) {
          const r   = rows[0];
          const val = { clicks: Number(r.clicks || 0), impressions: Number(r.impressions || 0), ctr: Number(r.ctr || 0), position: Number(r.position || 0) };
          map[pageUrl] = val; map[norm(pageUrl)] = val;
        }
      } catch(e) {}
    });

    if (b + BATCH < total) Utilities.sleep(SLEEP_MS);
  }

  return map;
}

function fetchGscUniqueQueriesCountMap_(siteUrl, startDate, endDate, searchType, country, targetUrls) {
  const apiUrl = "https://www.googleapis.com/webmasters/v3/sites/" + encodeURIComponent(siteUrl) + "/searchAnalytics/query";
  const norm   = u => (u || "").toString().trim().replace(/\/+$/, "");
  const out    = {};

  if (!targetUrls || !targetUrls.length) return out;

  const token = ScriptApp.getOAuthToken();
  const BATCH = 10, SLEEP_MS = 500, total = targetUrls.length;

  for (let b = 0; b < total; b += BATCH) {
    const batchUrls = targetUrls.slice(b, Math.min(b + BATCH, total));

    const requests = batchUrls.map(pageUrl => {
      const filters = [{ dimension: "page", operator: "equals", expression: pageUrl }];
      if (country) filters.push({ dimension: "country", operator: "equals", expression: country });
      return { url: apiUrl, method: "post", contentType: "application/json", headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true,
        payload: JSON.stringify({ startDate, endDate, dimensions: ["query"], rowLimit: 25000, searchType, dimensionFilterGroups: [{ filters }] }) };
    });

    let responses;
    try { responses = UrlFetchApp.fetchAll(requests); }
    catch(e) {
      batchUrls.forEach(u => { out[u] = 0; out[norm(u)] = 0; });
      continue;
    }

    responses.forEach((res, i) => {
      const pageUrl = batchUrls[i];
      try {
        if (res.getResponseCode() !== 200) { out[pageUrl] = 0; out[norm(pageUrl)] = 0; return; }
        const rows = (JSON.parse(res.getContentText()) || {}).rows || [];
        out[pageUrl] = rows.length; out[norm(pageUrl)] = rows.length;
      } catch(e) { out[pageUrl] = 0; out[norm(pageUrl)] = 0; }
    });

    if (b + BATCH < total) Utilities.sleep(SLEEP_MS);
  }

  return out;
}

function fetchGscUrlMetricsFromUI(formData) {
  const siteUrl    = formData.siteUrl;
  const months     = formData.months     || [];
  const searchType = formData.searchType || "web";
  const country    = (formData.country || "").toString().trim().toUpperCase();
  const urlsFromUI = formData.urls       || [];

  const METRICS = [
    { key: "clicks",      label: "Clicks",      format: "0"     },
    { key: "impressions", label: "Impressions",  format: "0"     },
    { key: "ctr",         label: "CTR",          format: "0.00%" },
    { key: "position",    label: "Avg Position", format: "0.00"  },
    { key: "queries",     label: "Queries",      format: "0"     },
    { key: "last_crawl",  label: "Last Crawl",   format: "@"     },
    { key: "is_indexed",  label: "Indexed",      format: "@"     }
  ];

  const selectedKeysRaw = Array.isArray(formData.metrics) ? formData.metrics : null;
  const selectedKeys    = (selectedKeysRaw && selectedKeysRaw.length) ? selectedKeysRaw.map(String) : ["clicks","impressions","ctr","position"];
  let   selectedMetrics = METRICS.filter(m => selectedKeys.indexOf(m.key) !== -1);
  if (!selectedMetrics.length) selectedMetrics = METRICS.filter(m => ["clicks","impressions","ctr","position"].indexOf(m.key) !== -1);

  const needsPageMetrics = selectedMetrics.some(m => ["clicks","impressions","ctr","position"].indexOf(m.key) !== -1);
  const needsQueries     = selectedMetrics.some(m => m.key === "queries");
  const needsInspection  = selectedMetrics.some(m => m.key === "last_crawl" || m.key === "is_indexed");

  if (!siteUrl)            throw new Error("Select a GSC property.");
  if (months.length === 0) throw new Error("Select at least one month.");

  const ss    = SpreadsheetApp.getActive();
  let   sheet = ss.getSheetByName("URL Tracker");
  if (!sheet) sheet = ss.insertSheet("URL Tracker");

  const URL_DATA_START_ROW = 3;

  if (urlsFromUI && urlsFromUI.length > 0) {
    const currentRows = sheet.getLastRow();
    if (currentRows < 2) {
      sheet.getRange(1, 1).setValue(sheet.getRange(1, 1).getValue() || "");
      sheet.getRange(2, 1).setValue(sheet.getRange(2, 1).getValue() || "");
      SpreadsheetApp.flush();
    }

    const existingLastRow = sheet.getLastRow();
    const existingUrls    = new Set();
    if (existingLastRow >= URL_DATA_START_ROW) {
      const numExisting = existingLastRow - (URL_DATA_START_ROW - 1);
      if (numExisting > 0) {
        sheet.getRange(URL_DATA_START_ROW, 1, numExisting, 1).getValues()
          .forEach(r => { const v = (r[0] || "").toString().trim().toLowerCase(); if (v) existingUrls.add(v); });
      }
    }

    const newUrls = urlsFromUI.filter(u => u.trim() && !existingUrls.has(u.trim().toLowerCase()));
    if (newUrls.length > 0) {
      const writeStart = Math.max(sheet.getLastRow() + 1, URL_DATA_START_ROW);
      sheet.getRange(writeStart, 1, newUrls.length, 1).setValues(newUrls.map(u => [u.trim()]));
      SpreadsheetApp.flush();
    }
  }

  const row2Val = (sheet.getRange(2, 1).getValue() || "").toString().trim();
  if (/^https?:\/\//i.test(row2Val)) {
    sheet.insertRowBefore(2);
  }

  const resolvedMonthLabels = [];
  const resolvedDateRanges  = [];
  months.forEach(monthEntry => {
    let startDate, endDate, monthLabel;
    if (monthEntry && typeof monthEntry === "object" && monthEntry.type === "exact") {
      startDate = monthEntry.startDate; endDate = monthEntry.endDate;
      monthLabel = startDate + " → " + endDate;
    } else {
      const dr = parseMonthToDateRange(monthEntry);
      startDate = dr.startDate; endDate = dr.endDate; monthLabel = monthEntry;
    }
    resolvedMonthLabels.push(monthLabel);
    resolvedDateRanges.push({ startDate, endDate, label: monthLabel });
  });

  const inspectionMetrics = selectedMetrics.filter(m => m.key === "last_crawl" || m.key === "is_indexed");
  const timeMetrics       = selectedMetrics.filter(m => m.key !== "last_crawl" && m.key !== "is_indexed");

  buildTwoRowMonthHeader_(sheet, ["URL"], resolvedMonthLabels, timeMetrics.map(m => m.label));

  const baseTimeCols = 1 + (resolvedMonthLabels.length * timeMetrics.length);
  if (inspectionMetrics.length > 0) {
    inspectionMetrics.forEach((m, i) => {
      const col = baseTimeCols + 1 + i;
      sheet.getRange(2, col, 1, 1)
        .setValue(m.label).setFontFamily("Arial").setFontWeight("bold")
        .setHorizontalAlignment("center").setVerticalAlignment("middle")
        .setBackground("#F1F3F4").setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
      sheet.getRange(1, col, 1, 1).setBackground("#F1F3F4");
      sheet.setColumnWidth(col, 80);
    });
  }
  const totalCols = baseTimeCols + inspectionMetrics.length;

  const lastRow = sheet.getLastRow();
  if (lastRow < URL_DATA_START_ROW) throw new Error("No URLs found in 'URL Tracker'. Add URLs in Column A (starting Row 3).");

  const urlValues = sheet.getRange(URL_DATA_START_ROW, 1, lastRow - (URL_DATA_START_ROW - 1), 1).getValues();
  const urls      = urlValues.map(r => (r[0] || "").toString().trim()).filter(Boolean);
  if (!urls.length) throw new Error("No URLs found in 'URL Tracker'. Add URLs in Column A (starting Row 3).");

  const monthDataMap = {};
  resolvedDateRanges.forEach(dr => {
    const pageMap      = needsPageMetrics ? fetchGscPageMetricsMap_(siteUrl, dr.startDate, dr.endDate, searchType, country, urls) : {};
    const queryCountMap = needsQueries ? fetchGscUniqueQueriesCountMap_(siteUrl, dr.startDate, dr.endDate, searchType, country, urls) : {};
    monthDataMap[dr.label] = { pageMap, queryCountMap };
  });

  const inspectionMap = {};
  if (needsInspection) {
    const endpoint = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
    const token    = ScriptApp.getOAuthToken();
    const tz       = Session.getScriptTimeZone();
    const requests = urls.map(pageUrl => ({
      url: endpoint, method: "post", contentType: "application/json",
      payload: JSON.stringify({ inspectionUrl: pageUrl, siteUrl }),
      headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true
    }));
    UrlFetchApp.fetchAll(requests).forEach((res, i) => {
      const pageUrl = urls[i];
      try {
        if (res.getResponseCode() !== 200) { inspectionMap[pageUrl] = { last_crawl: "API Error", is_indexed: "API Error" }; return; }
        const result    = (JSON.parse(res.getContentText()).inspectionResult || {}).indexStatusResult || {};
        const rawCrawl  = result.lastCrawlTime || "";
        let   last_crawl = "Not crawled";
        if (rawCrawl) { const d = new Date(rawCrawl); if (!isNaN(d.getTime())) last_crawl = Utilities.formatDate(d, tz, "dd MMM yyyy"); }
        const verdict = result.verdict || "", coverageState = result.coverageState || "";
        const is_indexed = verdict === "PASS" ? "Yes"
          : (verdict === "FAIL" || verdict === "EXCLUDED" || verdict === "NEUTRAL") ? "No (" + (coverageState || verdict) + ")"
          : (coverageState || "Unknown");
        inspectionMap[pageUrl] = { last_crawl, is_indexed };
      } catch(e) { inspectionMap[pageUrl] = { last_crawl: "Error", is_indexed: "Error" }; }
    });
  }

  const norm = u => (u || "").toString().trim().replace(/\/+$/, "");

  const out = urlValues.map(r => {
    const raw = (r[0] || "").toString().trim();
    if (!raw) {
      const empty = [raw];
      resolvedMonthLabels.forEach(() => timeMetrics.forEach(() => empty.push(0)));
      inspectionMetrics.forEach(() => empty.push(""));
      return empty;
    }
    const row = [raw], key1 = raw, key2 = norm(raw);
    resolvedMonthLabels.forEach(lbl => {
      const data    = monthDataMap[lbl] || {};
      const metrics = (data.pageMap || {})[key1] || (key2 !== key1 ? (data.pageMap || {})[key2] : null);
      const qc      = data.queryCountMap || {};
      const qCount  = (typeof qc[key1] === "number") ? qc[key1] : ((typeof qc[key2] === "number") ? qc[key2] : 0);
      timeMetrics.forEach(m => row.push(m.key === "queries" ? qCount : (metrics ? Number(metrics[m.key] || 0) : 0)));
    });
    if (inspectionMetrics.length > 0) {
      const insp = inspectionMap[raw] || inspectionMap[key2] || { last_crawl: "N/A", is_indexed: "N/A" };
      inspectionMetrics.forEach(m => row.push(insp[m.key] !== undefined ? insp[m.key] : "N/A"));
    }
    return row;
  });

  if (out.length > 0) {
    sheet.getRange(URL_DATA_START_ROW, 1, out.length, totalCols).setValues(out);

    sheet.getRange(URL_DATA_START_ROW, 1, out.length, 1)
      .setFontColor("#0000FF").setFontFamily("Arial").setWrap(true)
      .setNumberFormat("General").setHorizontalAlignment("left");

    let col = 2;
    resolvedMonthLabels.forEach(() => {
      timeMetrics.forEach(m => {
        sheet.getRange(URL_DATA_START_ROW, col, out.length, 1).setFontFamily("Arial").setHorizontalAlignment("center").setNumberFormat(m.format);
        col++;
      });
    });

    if (inspectionMetrics.length > 0) {
      sheet.getRange(URL_DATA_START_ROW, baseTimeCols + 1, out.length, inspectionMetrics.length)
        .setFontFamily("Arial").setHorizontalAlignment("center").setNumberFormat("@");
    }

    if (resolvedMonthLabels.length >= 2 && timeMetrics.length > 0) {
      const momStartCol = totalCols + 1;
      timeMetrics.forEach((metric, mIdx) => {
        const momCol = momStartCol + mIdx;
        sheet.getRange(2, momCol, 1, 1)
          .setValue("Δ% " + metric.label).setFontFamily("Arial").setFontWeight("bold")
          .setHorizontalAlignment("center").setVerticalAlignment("middle")
          .setBackground("#E8EAED").setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
        sheet.getRange(1, momCol, 1, 1).setBackground("#E8EAED");
        sheet.setColumnWidth(momCol, 80);

        const firstMetricCol = 2 + mIdx;
        const lastMetricCol  = 2 + ((resolvedMonthLabels.length - 1) * timeMetrics.length) + mIdx;
        const firstVals = sheet.getRange(URL_DATA_START_ROW, firstMetricCol, out.length, 1).getValues();
        const lastVals  = sheet.getRange(URL_DATA_START_ROW, lastMetricCol,  out.length, 1).getValues();

        const pv = [], pb = [], pf = [];
        for (let pi = 0; pi < out.length; pi++) {
          const f = Number(firstVals[pi][0] || 0), l = Number(lastVals[pi][0] || 0);
          if (f === 0 && l === 0) { pv.push(["—"]);        pb.push([null]);        pf.push(["#999999"]); }
          else if (f === 0)       { pv.push(["New"]);       pb.push(["#D9EAD3"]);   pf.push(["#274E13"]); }
          else {
            const pct = Math.round(((l - f) / f) * 100);
            const improved = metric.key === "position" ? pct < 0 : pct > 0;
            pv.push([pct + "%"]);
            if      (pct === 0)  { pb.push([null]);       pf.push(["#555555"]); }
            else if (improved)   { pb.push(["#D9EAD3"]);  pf.push(["#274E13"]); }
            else                 { pb.push(["#FCE8E6"]);  pf.push(["#7F0000"]); }
          }
        }
        const mr = sheet.getRange(URL_DATA_START_ROW, momCol, out.length, 1);
        mr.setValues(pv).setBackgrounds(pb).setFontColors(pf).setFontFamily("Arial").setHorizontalAlignment("center").setNumberFormat("@");
      });
    }
  }

  return "✅ URL Tracker updated!\n" +
    "Months: "         + resolvedMonthLabels.length + "\n" +
    "URLs processed: " + urls.length + "\n" +
    (resolvedMonthLabels.length >= 2 ? "MoM % change columns added\n" : "") +
    "Metrics: "        + selectedMetrics.map(m => m.label).join(", ") + "\n" +
    "Search type: "    + searchType + "\n" +
    "Country: "        + (country || "All");
}

function clearActiveSheetExceptHeader() {
  const sheet   = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow > 0 && lastCol > 0) sheet.getRange(1, 1, lastRow, lastCol).clear();
}

function buildTwoRowMonthHeader_(sheet, baseHeaders, months, metricLabels) {
  const baseLen   = baseHeaders.length;
  const mLen      = metricLabels.length;
  const totalCols = baseLen + (months.length * mLen);

  try {
    sheet.getRange(1, 1, 2, Math.max(totalCols, sheet.getLastColumn() || totalCols)).breakApart();
  } catch(e) {}

  const row1 = new Array(baseLen).fill("");
  months.forEach(monthStr => {
    row1.push(monthStr);
    for (let i = 1; i < mLen; i++) row1.push("");
  });

  const row2 = baseHeaders.slice();
  months.forEach(() => metricLabels.forEach(lbl => row2.push(lbl)));

  sheet.getRange(1, 1, 2, totalCols).setValues([row1, row2]);

  for (let mi = 0; mi < months.length; mi++) {
    const startCol = baseLen + 1 + (mi * mLen);
    if (mLen > 1) sheet.getRange(1, startCol, 1, mLen).merge();
  }

  sheet.setFrozenRows(2);

  sheet.getRange(1, 1, 1, totalCols)
    .setFontFamily("Arial").setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setBackground("#F1F3F4").setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);

  sheet.getRange(2, 1, 1, totalCols)
    .setFontFamily("Arial").setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle")
    .setBackground("#F1F3F4").setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);

  sheet.setColumnWidth(1, 500);
  for (let c = 2; c <= totalCols; c++) sheet.setColumnWidth(c, 80);
}

function parseMonthToDateRange(monthStr) {
  const parts = monthStr.split("-");
  if (parts.length !== 2) throw new Error("Invalid month format. Use YYYY-MM (e.g., 2024-12)");
  const year = parseInt(parts[0], 10), month = parseInt(parts[1], 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) throw new Error("Invalid month format. Use YYYY-MM (e.g., 2024-12)");
  const tz  = Session.getScriptTimeZone();
  const fmt = d => Utilities.formatDate(d, tz, "yyyy-MM-dd");
  return { startDate: fmt(new Date(year, month - 1, 1)), endDate: fmt(new Date(year, month, 0)), monthLabel: monthStr };
}
