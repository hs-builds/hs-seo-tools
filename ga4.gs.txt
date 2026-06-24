// ==========================================
// GA4 MODULE — HS SEO Tool
// ==========================================

const GA4_PROPS_CACHE_KEY = 'GA4_PROPERTIES_V2';
const GA4_CACHE_TTL       = 21600; // 6 hours

// ==========================================
// PROPERTY LISTING
// ==========================================
function getGA4Properties() {
  const cache  = CacheService.getScriptCache();
  const cached = cache.get(GA4_PROPS_CACHE_KEY);
  if (cached) { try { return JSON.parse(cached); } catch(e) {} }
  return _fetchAndCacheGA4Properties_();
}

function getGA4PropertiesRefresh() {
  CacheService.getScriptCache().remove(GA4_PROPS_CACHE_KEY);
  return _fetchAndCacheGA4Properties_();
}

function _fetchAndCacheGA4Properties_() {
  const token   = ScriptApp.getOAuthToken();
  const headers = { Authorization: 'Bearer ' + token };
  const baseUrl = 'https://analyticsadmin.googleapis.com/v1beta';

  // --- Step 1: Fetch ALL accounts (with pagination) ---
  var accounts = [];
  var acctPageToken = '';
  do {
    var acctUrl = baseUrl + '/accounts?pageSize=200';
    if (acctPageToken) acctUrl += '&pageToken=' + encodeURIComponent(acctPageToken);

    var acctRes = UrlFetchApp.fetch(acctUrl, { headers: headers, muteHttpExceptions: true });
    if (acctRes.getResponseCode() !== 200) break;

    var acctData = JSON.parse(acctRes.getContentText());
    (acctData.accounts || []).forEach(function(a) { accounts.push(a); });
    acctPageToken = acctData.nextPageToken || '';
  } while (acctPageToken);

  // --- Step 2: Fetch properties per account using ancestor: filter (with pagination) ---
  // Using "ancestor:" instead of "parent:" ensures sub-properties and
  // roll-up properties (common in GA 360 accounts) are returned.
  var properties = [];
  var seenIds    = {};

  accounts.forEach(function(acct) {
    var propPageToken = '';
    do {
      var propUrl = baseUrl + '/properties?filter=ancestor:' + acct.name + '&pageSize=200';
      if (propPageToken) propUrl += '&pageToken=' + encodeURIComponent(propPageToken);

      var res = UrlFetchApp.fetch(propUrl, { headers: headers, muteHttpExceptions: true });
      if (res.getResponseCode() !== 200) break;

      var propData = JSON.parse(res.getContentText());
      (propData.properties || []).forEach(function(p) {
        if (!seenIds[p.name]) {
          seenIds[p.name] = true;
          properties.push({
            propertyId:  p.name,           // e.g. "properties/291331742"
            displayName: p.displayName || p.name,
            accountName: acct.displayName || acct.name
          });
        }
      });
      propPageToken = propData.nextPageToken || '';
    } while (propPageToken);
  });

  // --- Step 3: Fallback — accountSummaries catches property-level access ---
  // Some GA 360 properties are shared at property level without account access.
  // accountSummaries returns everything the user can see in one call.
  try {
    var summPageToken = '';
    do {
      var summUrl = baseUrl + '/accountSummaries?pageSize=200';
      if (summPageToken) summUrl += '&pageToken=' + encodeURIComponent(summPageToken);

      var summRes = UrlFetchApp.fetch(summUrl, { headers: headers, muteHttpExceptions: true });
      if (summRes.getResponseCode() !== 200) break;

      var summData = JSON.parse(summRes.getContentText());
      (summData.accountSummaries || []).forEach(function(as) {
        var acctLabel = as.displayName || as.account || '';
        (as.propertySummaries || []).forEach(function(ps) {
          if (!seenIds[ps.property]) {
            seenIds[ps.property] = true;
            properties.push({
              propertyId:  ps.property,
              displayName: ps.displayName || ps.property,
              accountName: acctLabel
            });
          }
        });
      });
      summPageToken = summData.nextPageToken || '';
    } while (summPageToken);
  } catch(e) {
    Logger.log('accountSummaries fallback skipped: ' + e.message);
  }

  if (!properties.length) throw new Error('No GA4 properties found.');
  CacheService.getScriptCache().put(GA4_PROPS_CACHE_KEY, JSON.stringify(properties), GA4_CACHE_TTL);
  return properties;
}

// ==========================================
// KEY EVENTS (dynamic, per property, cached)
// ==========================================
function getGA4KeyEventsForSidebar(propertyId) {
  const safeId  = propertyId.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 80);
  const cacheKey = 'GA4_KE_' + safeId;
  const cache    = CacheService.getScriptCache();
  const cached   = cache.get(cacheKey);
  if (cached) { try { return JSON.parse(cached); } catch(e) {} }

  const propId   = propertyId.replace('properties/', '');
  const response = UrlFetchApp.fetch(
    'https://analyticsadmin.googleapis.com/v1beta/properties/' + propId + '/keyEvents',
    { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true }
  );
  if (response.getResponseCode() !== 200)
    throw new Error('Could not fetch key events: ' + response.getContentText());

  const names = (JSON.parse(response.getContentText()).keyEvents || []).map(function(e) { return e.eventName; });
  cache.put(cacheKey, JSON.stringify(names), GA4_CACHE_TTL);
  return names;
}

// ==========================================
// ALL EVENTS (dynamic, per property, cached, 30 days)
// ==========================================
function getAllGA4EventsForSidebar(propertyId) {
  const safeId  = propertyId.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 80);
  const cacheKey = 'GA4_ALLEVS_' + safeId;
  const cache    = CacheService.getScriptCache();
  const cached   = cache.get(cacheKey);
  if (cached) { try { return JSON.parse(cached); } catch(e) {} }

  const propId   = propertyId.replace('properties/', '');
  // Fetch distinct event names over the last 30 days
  const req = {
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'eventName' }],
    metrics:    [{ name: 'eventCount' }],
    orderBys:   [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit:      1000
  };

  const response = UrlFetchApp.fetch(
    'https://analyticsdata.googleapis.com/v1beta/properties/' + propId + ':runReport',
    {
      method: 'post',
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'Content-Type': 'application/json' },
      payload: JSON.stringify(req),
      muteHttpExceptions: true
    }
  );

  if (response.getResponseCode() !== 200)
    throw new Error('Could not fetch events: ' + response.getContentText());

  const data = JSON.parse(response.getContentText());
  const names = (data.rows || []).map(function(row) { return row.dimensionValues[0].value; });
  
  cache.put(cacheKey, JSON.stringify(names), GA4_CACHE_TTL);
  return names;
}

// ==========================================
// TAB 1: TRAFFIC// params: { propertyId, dateRange, metrics[], dimensions[], dailyBreakdown, channel, country, keyEvents[], sheetName, offset }
// ==========================================
function fetchGA4TrafficData(params) {
  const { propertyId, dateRange, metrics, dimensions, dailyBreakdown, channel, country, keyEvents, sheetName, offset } = params;
  _validateBase_(propertyId, metrics);

  var startTime = Date.now();
  var finalDims = [];
  if (dailyBreakdown) finalDims.push('date');
  (dimensions || []).forEach(function(d) { if (finalDims.indexOf(d) === -1) finalDims.push(d); });

  var selectedKE = (keyEvents && keyEvents.length > 0) ? keyEvents : [];

  const req = {
    dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
    metrics:    metrics.map(function(m) { return { name: m }; }),
    dimensions: finalDims.length ? finalDims.map(function(d) { return { name: d }; }) : []
  };
  if (finalDims.length) req.orderBys = [{ dimension: { dimensionName: finalDims[0] } }];

  const filters = _buildChannelCountryFilter_(channel, country);
  if (filters) req.dimensionFilter = filters;

  const response = _runReportChunked_(req, propertyId, offset, startTime);

  // Base rows
  const baseRows = (response.rows || []).map(function(row) {
    const dims = (row.dimensionValues || []).map(function(dv) { return dv.value; });
    const mets = (row.metricValues   || []).map(function(mv, i) { return _parseVal_(metrics[i], mv.value); });
    return dims.concat(mets);
  });

  // ---- Key Events: fetch eventCount per [finalDims..., eventName] ----
  var keMap = {}; // rowKey → { eventName: count }
  if (selectedKE.length > 0) {
    var keDims = finalDims.concat(['eventName']);
    var keFilters = [];
    if (filters) keFilters.push(filters);
    
    keFilters.push(selectedKE.length === 1
      ? { filter:{ fieldName:'eventName', stringFilter:{ matchType:'EXACT', value:selectedKE[0] } } }
      : { filter:{ fieldName:'eventName', inListFilter:{ values:selectedKE } } });

    var keReq = {
      dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
      metrics:    [{ name:'eventCount' }],
      dimensions: keDims.map(function(d){ return {name:d}; }),
      dimensionFilter: keFilters.length === 1
        ? keFilters[0]
        : { andGroup:{ expressions:keFilters } }
    };
    try {
      var keResp = _runReportPaginated_(keReq, propertyId);
      (keResp.rows || []).forEach(function(row) {
        var dimVals = (row.dimensionValues||[]).map(function(dv){ return dv.value; });
        var evName  = dimVals.pop(); // last dim = eventName
        var key     = dimVals.join('||');
        if (!keMap[key]) keMap[key] = {};
        keMap[key][evName] = (keMap[key][evName] || 0) + (parseInt(row.metricValues[0].value, 10) || 0);
      });
    } catch(e) {
      Logger.log('KE fetch failed: ' + e.message);
    }
  }

  const finalRows = baseRows.map(function(row) {
    var rowKey = row.slice(0, finalDims.length).join('||');
    var keCounts = selectedKE.map(function(ev) {
      return (keMap[rowKey] && keMap[rowKey][ev]) ? keMap[rowKey][ev] : 0;
    });
    return row.concat(keCounts);
  });

  var headers = finalDims.map(_dimLabel_).concat(metrics.map(_metricLabel_)).concat(selectedKE);
  var sheet = _ensureSheet_(sheetName, headers, selectedKE.length, offset);
  _writeRows_(sheet, finalRows, metrics, finalDims.length, offset);

  if (!response.isComplete) {
    return { status: 'partial', nextOffset: response.nextOffset, message: 'Fetched ' + response.nextOffset + ' of ' + response.totalRows + ' rows...' };
  }
  return { status: 'complete', message: '✅ Traffic data written!\nTotal rows: ' + response.totalRows + '\nSheet: ' + sheetName };
}

// ==========================================
// TAB 2: AUDIENCE
// params: { propertyId, dateRange, metrics[], dimension, sheetName, offset }
// ==========================================
function fetchGA4AudienceData(params) {
  const { propertyId, dateRange, metrics, dimension, dailyBreakdown,
          channel, country, keyEvents, sheetName, offset } = params;
  _validateBase_(propertyId, metrics);

  var startTime = Date.now();

  var finalDims = dailyBreakdown ? ['date', dimension] : [dimension];
  var selectedKE = (keyEvents && keyEvents.length > 0) ? keyEvents : [];

  const req = {
    dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
    metrics:    metrics.map(function(m) { return { name: m }; }),
    dimensions: finalDims.map(function(d) { return { name: d }; }),
    orderBys:   [{ metric: { metricName: metrics[0] }, desc: true }]
  };
  const filters = _buildChannelCountryFilter_(channel, country);
  if (filters) req.dimensionFilter = filters;

  const response = _runReportChunked_(req, propertyId, offset, startTime);

  // Base rows
  const baseRows = (response.rows || []).map(function(row) {
    const dims = (row.dimensionValues || []).map(function(dv) { return dv.value; });
    const mets = (row.metricValues   || []).map(function(mv, i) { return _parseVal_(metrics[i], mv.value); });
    return dims.concat(mets);
  });

  // If _returnRows (for MoM), return without KE (keep it simple for MoM stacking)
  if (params._returnRows) {
    const h = finalDims.map(_dimLabel_).concat(metrics.map(_metricLabel_));
    return { rows: baseRows, headers: h, dimCount: finalDims.length };
  }

  // ---- Key Events: fetch eventCount per [finalDims..., eventName] ----
  var keMap = {}; // rowKey → { eventName: count }
  if (selectedKE.length > 0) {
    var keDims = finalDims.concat(['eventName']);
    var keFilters = [];
    if (filters) keFilters.push(filters);
    keFilters.push(selectedKE.length === 1
      ? { filter:{ fieldName:'eventName', stringFilter:{ matchType:'EXACT', value:selectedKE[0] } } }
      : { filter:{ fieldName:'eventName', inListFilter:{ values:selectedKE } } });

    var keReq = {
      dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
      metrics:    [{ name:'eventCount' }],
      dimensions: keDims.map(function(d){ return {name:d}; }),
      dimensionFilter: keFilters.length === 1
        ? keFilters[0]
        : { andGroup:{ expressions:keFilters } }
    };
    try {
      var keResp = _runReportPaginated_(keReq, propertyId);
      (keResp.rows || []).forEach(function(row) {
        var dimVals = (row.dimensionValues||[]).map(function(dv){ return dv.value; });
        var evName  = dimVals.pop(); // last dim = eventName
        var key     = dimVals.join('||');
        if (!keMap[key]) keMap[key] = {};
        keMap[key][evName] = (keMap[key][evName]||0) + (parseInt(row.metricValues[0].value,10)||0);
      });
    } catch(e) {
      Logger.log('Audience KE fetch failed: ' + e.message);
    }
  }

  // Append KE columns to base rows
  var finalRows = baseRows.map(function(row) {
    var rowKey   = row.slice(0, finalDims.length).join('||');
    var keCounts = selectedKE.map(function(ev) {
      return (keMap[rowKey] && keMap[rowKey][ev]) ? keMap[rowKey][ev] : 0;
    });
    return row.concat(keCounts);
  });

  const headers = finalDims.map(_dimLabel_)
    .concat(metrics.map(_metricLabel_))
    .concat(selectedKE);

  const sheet = _ensureSheet_(sheetName, headers, selectedKE ? selectedKE.length : 0, offset);
  _writeRows_(sheet, finalRows, metrics, finalDims.length, offset);

  if (!response.isComplete) {
    return { status: 'partial', nextOffset: response.nextOffset, message: 'Fetched ' + response.nextOffset + ' of ' + response.totalRows + ' rows...' };
  }
  return { status: 'complete', message: '✅ Audience data written!\nTotal rows: ' + response.totalRows + '\nSheet: ' + sheetName };
}

// ==========================================
// TAB 3: PAGES
// params: { propertyId, dateRange, metrics[], dimension, pageFilter[], keyEvents[], sheetName, offset }
// ==========================================
function fetchGA4PagesData(params) {
  const { propertyId, dateRange, metrics, dimension, dailyBreakdown, pageFilter, channel, country, keyEvents, sheetName, offset } = params;
  _validateBase_(propertyId, metrics);

  var startTime = Date.now();

  var finalDims = dailyBreakdown ? ['date', dimension] : [dimension];
  var selectedKE = (keyEvents && keyEvents.length > 0) ? keyEvents : [];

  const req = {
    dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
    metrics:    metrics.map(function(m) { return { name: m }; }),
    dimensions: finalDims.map(function(d) { return { name: d }; }),
    orderBys:   [{ metric: { metricName: metrics[0] }, desc: true }]
  };

  // Build combined filter: page filter + channel/country
  const allFilters = [];

  const pageExpr = _buildPageFilters_(pageFilter, dimension);
  if (pageExpr) allFilters.push(pageExpr);

  if (channel) allFilters.push({ filter: { fieldName: 'sessionDefaultChannelGrouping', stringFilter: { matchType: 'EXACT', value: channel } } });
  if (country) allFilters.push({ filter: { fieldName: 'country', stringFilter: { matchType: 'EXACT', value: country.toUpperCase() } } });

  if (allFilters.length === 1) req.dimensionFilter = allFilters[0];
  if (allFilters.length > 1)   req.dimensionFilter = { andGroup: { expressions: allFilters } };

  const response = _runReportChunked_(req, propertyId, offset, startTime);

  // Base rows
  const baseRows = (response.rows || []).map(function(row) {
    const dims = (row.dimensionValues || []).map(function(dv) { return dv.value; });
    const mets = (row.metricValues   || []).map(function(mv, i) { return _parseVal_(metrics[i], mv.value); });
    return dims.concat(mets);
  });

  // If _returnRows (for MoM), return without KE
  if (params._returnRows) {
    const h = finalDims.map(_dimLabel_).concat(metrics.map(_metricLabel_));
    return { rows: baseRows, headers: h, dimCount: finalDims.length };
  }

  // ---- Key Events: fetch eventCount per [finalDims..., eventName] ----
  var keMap = {}; // rowKey → { eventName: count }
  if (selectedKE.length > 0) {
    var keDims = finalDims.concat(['eventName']);
    var keFilters = [];
    if (allFilters.length === 1) keFilters.push(allFilters[0]);
    else if (allFilters.length > 1) keFilters.push({ andGroup: { expressions: allFilters } });
    keFilters.push(selectedKE.length === 1
      ? { filter:{ fieldName:'eventName', stringFilter:{ matchType:'EXACT', value:selectedKE[0] } } }
      : { filter:{ fieldName:'eventName', inListFilter:{ values:selectedKE } } });

    var keReq = {
      dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
      metrics:    [{ name:'eventCount' }],
      dimensions: keDims.map(function(d){ return {name:d}; }),
      dimensionFilter: keFilters.length === 1
        ? keFilters[0]
        : { andGroup:{ expressions:keFilters } }
    };
    try {
      var keResp = _runReportPaginated_(keReq, propertyId);
      (keResp.rows || []).forEach(function(row) {
        var dimVals = (row.dimensionValues||[]).map(function(dv){ return dv.value; });
        var evName  = dimVals.pop(); // last dim = eventName
        var key     = dimVals.join('||');
        if (!keMap[key]) keMap[key] = {};
        keMap[key][evName] = (keMap[key][evName]||0) + (parseInt(row.metricValues[0].value,10)||0);
      });
    } catch(e) {
      Logger.log('Pages KE fetch failed: ' + e.message);
    }
  }

  // Append KE columns to base rows
  var finalRows = baseRows.map(function(row) {
    var rowKey   = row.slice(0, finalDims.length).join('||');
    var keCounts = selectedKE.map(function(ev) {
      return (keMap[rowKey] && keMap[rowKey][ev]) ? keMap[rowKey][ev] : 0;
    });
    return row.concat(keCounts);
  });

  const headers = finalDims.map(_dimLabel_)
    .concat(metrics.map(_metricLabel_))
    .concat(selectedKE);

  const sheet = _ensureSheet_(sheetName, headers, selectedKE ? selectedKE.length : 0, offset);
  _writeRows_(sheet, finalRows, metrics, finalDims.length, offset);

  if (!response.isComplete) {
    return { status: 'partial', nextOffset: response.nextOffset, message: 'Fetched ' + response.nextOffset + ' of ' + response.totalRows + ' rows...' };
  }
  return { status: 'complete', message: '✅ Pages data written!\nTotal rows: ' + response.totalRows + '\nSheet: ' + sheetName };
}

// ==========================================
// TAB 4: EVENTS
// params: { propertyId, dateRange, eventType, eventNames[], dimension, sheetName, offset }
// ==========================================
function fetchGA4EventsData(params) {
  const { propertyId, dateRange, eventType, eventNames, dimension, dailyBreakdown, channel, country, sheetName, offset } = params;
  if (!propertyId) throw new Error('No GA4 property selected.');

  var startTime = Date.now();
  var finalDims = ['eventName'];
  if (dailyBreakdown) finalDims.unshift('date');
  if (dimension)      finalDims.push(dimension);

  const req = {
    dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
    metrics:    [{ name: 'eventCount' }, { name: 'totalUsers' }],
    dimensions: finalDims.map(function(d) { return { name: d }; }),
    orderBys:   [{ metric: { metricName: 'eventCount' }, desc: true }]
  };

  // Build combined filter: event names + channel/country
  const allFilters = [];
  if (eventNames && eventNames.length > 0) {
    allFilters.push(eventNames.length === 1
      ? { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: eventNames[0] } } }
      : { filter: { fieldName: 'eventName', inListFilter: { values: eventNames } } });
  }
  if (channel) allFilters.push({ filter: { fieldName: 'sessionDefaultChannelGrouping', stringFilter: { matchType: 'EXACT', value: channel } } });
  if (country) allFilters.push({ filter: { fieldName: 'country', stringFilter: { matchType: 'EXACT', value: country.toUpperCase() } } });

  if (allFilters.length === 1) req.dimensionFilter = allFilters[0];
  if (allFilters.length > 1)   req.dimensionFilter = { andGroup: { expressions: allFilters } };

  const response = _runReportChunked_(req, propertyId, offset, startTime);
  const headers  = finalDims.map(_dimLabel_).concat(['Event Count', 'Users']);
  const sheet    = _ensureSheet_(sheetName, headers, 0, offset);

  const rows = (response.rows || []).map(function(row) {
    const dimVals = (row.dimensionValues || []).map(function(dv) { return dv.value; });
    const count   = parseInt(row.metricValues[0].value, 10) || 0;
    const users   = parseInt(row.metricValues[1].value, 10) || 0;
    return dimVals.concat([count, users]);
  });

  _writeRows_(sheet, rows, ['eventCount','totalUsers'], finalDims.length, offset);

  if (!response.isComplete) {
    return { status: 'partial', nextOffset: response.nextOffset, message: 'Fetched ' + response.nextOffset + ' of ' + response.totalRows + ' rows...' };
  }
  return { status: 'complete', message: '✅ Events data written!\nTotal rows: ' + response.totalRows + '\nSheet: ' + sheetName };
}

// ==========================================
// TAB 5: ECOMMERCE
// params: { propertyId, dateRange, metrics[], dimension, sheetName, offset }
// ==========================================
function fetchGA4EcommerceData(params) {
  const { propertyId, dateRange, metrics, dimension, dailyBreakdown, channel, country, sheetName, offset } = params;
  _validateBase_(propertyId, metrics);

  var startTime = Date.now();
  var finalDims = [];
  if (dailyBreakdown) finalDims.push('date');
  if (dimension)      finalDims.push(dimension);

  const req  = {
    dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
    metrics:    metrics.map(function(m) { return { name: m }; }),
    dimensions: finalDims.map(function(d) { return { name: d }; })
  };
  if (finalDims.length) req.orderBys = [{ metric: { metricName: metrics[0] }, desc: true }];

  const filters = _buildChannelCountryFilter_(channel, country);
  if (filters) req.dimensionFilter = filters;

  const response = _runReportChunked_(req, propertyId, offset, startTime);
  const headers  = finalDims.map(_dimLabel_).concat(metrics.map(_metricLabel_));
  const sheet    = _ensureSheet_(sheetName, headers, 0, offset);

  const rows = (response.rows || []).map(function(row) {
    const dimVals = finalDims.length ? (row.dimensionValues || []).map(function(dv) { return dv.value; }) : [];
    const mets    = (row.metricValues || []).map(function(mv, i) { return _parseVal_(metrics[i], mv.value); });
    return dimVals.concat(mets);
  });

  _writeRows_(sheet, rows, metrics, finalDims.length, offset);

  if (!response.isComplete) {
    return { status: 'partial', nextOffset: response.nextOffset, message: 'Fetched ' + response.nextOffset + ' of ' + response.totalRows + ' rows...' };
  }
  return { status: 'complete', message: '✅ Ecommerce data written!\nTotal rows: ' + response.totalRows + '\nSheet: ' + sheetName };
}

// ==========================================
// SHARED HELPERS
// ==========================================
function _validateBase_(propertyId, metrics) {
  if (!propertyId)           throw new Error('No GA4 property selected.');
  if (!metrics || !metrics.length) throw new Error('No metrics selected.');
}

function _buildChannelCountryFilter_(channel, country) {
  const filters = [];
  if (channel) filters.push({ filter: { fieldName: 'sessionDefaultChannelGrouping', stringFilter: { matchType: 'EXACT', value: channel } } });
  if (country) filters.push({ filter: { fieldName: 'country', stringFilter: { matchType: 'EXACT', value: country.toUpperCase() } } });
  if (!filters.length) return null;
  if (filters.length === 1) return filters[0];
  return { andGroup: { expressions: filters } };
}

function _buildPageFilters_(pageFilter, dimension) {
  if (!pageFilter || pageFilter.length === 0) return null;

  let filterField = dimension;
  // Users typically paste URLs into the "Page Filter" input box.
  // If they are breaking down by Page Title, filtering URLs against Page Title fails.
  // So we default to filtering on pagePath so their pasted URLs still work.
  if (dimension === 'pageTitle') {
    filterField = 'pagePath';
  }

  const exprs = pageFilter.map(function(p) {
    let val = p.trim();
    
    if (filterField === 'fullPageUrl') {
      // Strip protocol for fullPageUrl
      val = val.replace(/^https?:\/\//, '');
    } else if (filterField === 'pagePath' || filterField === 'landingPage') {
      // Strip protocol + domain for relative paths
      if (val.match(/^https?:\/\//)) {
        val = val.replace(/^https?:\/\/[^\/]+/, '');
      }
      if (!val) val = '/';
    }
    
    // Escape special regex characters
    const escapeRegExp = function(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
    
    let regexStr;
    const hasQuery = val.indexOf('?') !== -1;
    
    if (filterField === 'fullPageUrl') {
      let cleanVal = val;
      if (!hasQuery && cleanVal.endsWith('/')) {
        cleanVal = cleanVal.slice(0, -1);
      }
      const escaped = escapeRegExp(cleanVal);
      if (hasQuery) {
        regexStr = '^' + escaped + '$';
      } else {
        regexStr = '^' + escaped + '/?(\\?.*)?$';
      }
    } else {
      let cleanVal = val;
      if (!hasQuery && cleanVal !== '/' && cleanVal.endsWith('/')) {
        cleanVal = cleanVal.slice(0, -1);
      }
      const escaped = escapeRegExp(cleanVal);
      if (hasQuery) {
        regexStr = '^' + escaped + '$';
      } else {
        if (cleanVal === '/') {
          regexStr = '^/+(\\?.*)?$';
        } else {
          regexStr = '^' + escaped + '/?(\\?.*)?$';
        }
      }
    }
    
    return {
      filter: {
        fieldName: filterField,
        stringFilter: {
          matchType: 'FULL_REGEXP',
          value: regexStr,
          caseSensitive: false
        }
      }
    };
  });

  return exprs.length === 1 ? exprs[0] : { orGroup: { expressions: exprs } };
}

// ==========================================
// FORMATTING CONSTANTS
// ==========================================
var FMT_FONT    = 'Sora';
var FMT_W_NUM   = 75;   // number / date columns
var FMT_W_TEXT  = 150;  // text / dimension columns
var FMT_KE_BG   = '#E8F0FE'; // light blue tint for key event headers only

function _ensureSheet_(sheetName, headers, keCount, offset) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);

  if (offset > 0) return sh;

  sh.clearContents();
  sh.clearFormats();

  var numCols = headers.length;
  var maxCols = sh.getMaxColumns();
  if (maxCols < numCols) sh.insertColumnsAfter(maxCols, numCols - maxCols);
  else if (maxCols > numCols) sh.deleteColumns(numCols + 1, maxCols - numCols);

  // Header row — bold, Sora, frozen, center aligned, no background color
  sh.getRange(1, 1, 1, numCols)
    .setValues([headers])
    .setFontWeight('bold')
    .setFontFamily(FMT_FONT)
    .setFontSize(10)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);
  sh.setFrozenRows(1);

  // Column widths: 75 for numeric/date/KE, 150 for text
  var kc = keCount || 0;
  var keStartIdx = numCols - kc;
  headers.forEach(function(h, i) {
    var isNumeric = _isNumericHeader_(h) || (i >= keStartIdx);
    sh.setColumnWidth(i + 1, isNumeric ? FMT_W_NUM : FMT_W_TEXT);
  });

  return sh;
}

function _writeRows_(sheet, rows, metrics, dimCount, offset) {
  if (!rows || !rows.length) return;
  var startRow = (offset > 0) ? sheet.getLastRow() + 1 : 2;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
  _applyFormatting_(sheet, startRow, rows, dimCount, metrics, 0);
}

// Central formatting function used by ALL modules.
// sheet      — the Sheet object
// rows       — 2D data array (already written)
// dimCount   — how many leading columns are text dimensions
// metrics    — array of metric API names (for number formats)
// keCount    — how many trailing columns are key event counts (integer format)
function _applyFormatting_(sheet, startRow, rows, dimCount, metrics, keCount) {
  if (!rows || !rows.length) return;
  var numRows = rows.length;
  var numCols = rows[0].length;

  // All data cells: Sora font, 10pt, wrap, middle-align
  sheet.getRange(startRow, 1, numRows, numCols)
    .setFontFamily(FMT_FONT)
    .setFontSize(10)
    .setVerticalAlignment('middle')
    .setWrap(true);

  // Dim columns — left align
  if (dimCount > 0) {
    sheet.getRange(startRow, 1, numRows, dimCount).setHorizontalAlignment('left');
  }

  // Date/Month dim columns — MMM-yy format + center
  var headerVals = sheet.getRange(1, 1, 1, numCols).getValues()[0];
  for (var h = 0; h < dimCount; h++) {
    var hdr = String(headerVals[h]);
    if (hdr === 'Date' || hdr === 'Month') {
      sheet.getRange(startRow, h + 1, numRows, 1)
        .setNumberFormat('MMM-yy')
        .setHorizontalAlignment('center');
    }
  }

  // Metric columns — number format + center
  (metrics || []).forEach(function(m, i) {
    sheet.getRange(startRow, dimCount + i + 1, numRows, 1)
      .setNumberFormat(_metricFmt_(m))
      .setHorizontalAlignment('center');
  });

  // Key event columns (trailing) — integer + center
  var keStartCol = dimCount + (metrics ? metrics.length : 0) + 1;
  for (var k = 0; k < (keCount || 0); k++) {
    var col = keStartCol + k;
    sheet.getRange(startRow, col, numRows, 1)
      .setNumberFormat('#,##0')
      .setHorizontalAlignment('center');
  }
}

// Returns true if a header label should be narrow (75px) — numbers, percentages, dates
function _isNumericHeader_(header) {
  var h = String(header).toLowerCase();
  var numKeywords = [
    'session','user','new user','active','engaged','bounce','rate','duration',
    'views','view','entrance','exit','transaction','revenue','purchase','order',
    'item','conversion','count','click','impression','ctr','position','rank',
    'event','avg','average','date','month','per session','per user','%'
  ];
  return numKeywords.some(function(kw){ return h.indexOf(kw) !== -1; });
}

const METRIC_LABELS = {
  sessions:                  'Sessions',
  totalUsers:                'Total Users',
  newUsers:                  'New Users',
  activeUsers:               'Active Users',
  engagedSessions:           'Engaged Sessions',
  engagementRate:            'Engagement Rate',
  bounceRate:                'Bounce Rate',
  averageSessionDuration:    'Avg. Session Duration',
  sessionsPerUser:           'Sessions per User',
  screenPageViews:           'Page Views',
  screenPageViewsPerSession: 'Views per Session',
  entrances:                 'Entrances',
  exits:                     'Exits',
  exitRate:                  'Exit Rate',
  transactions:              'Transactions',
  purchaseRevenue:           'Revenue',
  ecommercePurchases:        'Purchases',
  averagePurchaseRevenue:    'Avg. Order Value',
  itemsPurchased:            'Items Purchased',
  purchaseToViewRate:        'Purchase Rate',
  itemsAddedToCart:          'Items Added to Cart',
  itemsCheckedOut:           'Items Checked Out',
  itemViews:                 'Item Views',
  cartToViewRate:            'Cart-to-View Rate',
  itemRevenue:               'Item Revenue',
  eventCount:                'Event Count',
  conversions:               'Conversions',
  userEngagementDuration:    'Engagement Duration',
  screenPageViewsPerUser:    'Views per User',
  scrolledUsers:             'Scrolled Users'
};

const DIM_LABELS = {
  date:                           'Date',
  sessionDefaultChannelGrouping:  'Channel',
  sessionSource:                  'Source',
  sessionMedium:                  'Medium',
  sessionCampaignName:            'Campaign',
  sessionCampaignId:              'Campaign ID',
  sessionSourceMedium:            'Source / Medium',
  sessionManualAdContent:         'Ad Content (utm_content)',
  sessionManualTerm:              'Term (utm_term)',
  googleAdsKeyword:               'GA Keyword',
  country:                        'Country',
  city:                           'City',
  region:                         'Region',
  deviceCategory:                 'Device',
  browser:                        'Browser',
  operatingSystem:                'OS',
  language:                       'Language',
  userAgeBracket:                 'Age Bracket',
  userGender:                     'Gender',
  newVsReturning:                 'User Type',
  pagePath:                       'Page Path',
  pageTitle:                      'Page Title',
  fullPageUrl:                    'Full URL',
  landingPage:                    'Landing Page',
  eventName:                      'Event Name',
  itemName:                       'Item Name',
  itemCategory:                   'Item Category',
  transactionId:                  'Transaction ID'
};

// ==========================================
// MoM DISPATCHER — called when custom_month range spans multiple months
// Loops each month, runs the right report, stacks rows with a Month column
// ==========================================
function fetchGA4MoMData(params) {
  const { tab, months, propertyId, momState } = params;
  if (!propertyId) throw new Error('No GA4 property selected.');
  if (!months || !months.length) throw new Error('No months provided.');

  var state = momState || { monthIndex: 0, offset: 0 };
  var startTime = Date.now();

  const ss         = SpreadsheetApp.getActive();
  const sheetName  = params.sheetName;
  var   allRows    = [];
  var   headers    = null;
  var   metricCols = null;
  var   actualMetrics = null;
  var   actualKeyEvents = null;
  var   isComplete = true;

  for (var i = state.monthIndex; i < months.length; i++) {
    var mo = months[i];
    const singleParams = _cloneParams_(params);
    singleParams.dateRange = { startDate: mo.startDate, endDate: mo.endDate };
    singleParams.offset = state.offset;
    singleParams.startTime = startTime;
    delete singleParams.months;
    delete singleParams.momState;

    var result = _fetchRawRows_(tab, singleParams);
    if (!headers) {
      headers    = ['Month'].concat(result.headers);
      metricCols = result.metricCols;
      actualMetrics = result.metrics;
      actualKeyEvents = result.keyEvents || [];
    }
    (result.rows || []).forEach(function(row) {
      allRows.push([mo.label].concat(row));
    });

    if (result.status === 'partial') {
      state.monthIndex = i;
      state.offset = result.nextOffset;
      isComplete = false;
      break;
    } else {
      state.offset = 0; // complete month, reset offset
    }
  }

  if (!headers) throw new Error('No data returned for any month.');

  // Write to sheet
  var sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);
  
  if (!momState) {
    sh.clearContents();
    sh.clearFormats();

    const numCols = headers.length;
    const maxCols = sh.getMaxColumns();
    if (maxCols < numCols) sh.insertColumnsAfter(maxCols, numCols - maxCols);
    else if (maxCols > numCols) sh.deleteColumns(numCols + 1, maxCols - numCols);

    sh.getRange(1, 1, 1, numCols).setValues([headers])
      .setFontWeight('bold')
      .setFontFamily(FMT_FONT)
      .setFontSize(10)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setWrap(true);
    sh.setFrozenRows(1);

    var keCount  = actualKeyEvents ? actualKeyEvents.length : 0;
    var keStartIdx = numCols - keCount;
    headers.forEach(function(h, idx) {
      var isNumeric = _isNumericHeader_(h) || (idx >= keStartIdx);
      sh.setColumnWidth(idx + 1, isNumeric ? FMT_W_NUM : FMT_W_TEXT);
    });
  }

  if (allRows.length > 0) {
    var startRow = momState ? sh.getLastRow() + 1 : 2;
    sh.getRange(startRow, 1, allRows.length, headers.length).setValues(allRows);

    var keCount  = actualKeyEvents ? actualKeyEvents.length : 0;
    var dimCount = headers.length - (metricCols ? metricCols.length : 0) - keCount - 1;
    _applyFormatting_(sh, startRow, allRows, dimCount + 1, actualMetrics || [], keCount);

    var totalRows = sh.getLastRow() - 1;
    _mergeCellRuns_(sh, 1, totalRows);
    if (headers.length >= 2) _mergeCellRuns_(sh, 2, totalRows);
  }

  if (!isComplete) {
    return { status: 'partial', momState: state, message: 'Fetched Month ' + months[state.monthIndex].label + '...' };
  }
  return { status: 'complete', message: '✅ MoM data written!\nMonths: ' + months.map(function(m){ return m.label; }).join(', ') + '\nSheet: ' + sheetName };
}

// Clones params shallowly, deep-copies arrays
function _cloneParams_(p) {
  var out = {};
  Object.keys(p).forEach(function(k) {
    out[k] = Array.isArray(p[k]) ? p[k].slice() : p[k];
  });
  return out;
}

// Returns { headers, rows, metricCols, metrics, keyEvents, status, nextOffset } for one month
function _fetchRawRows_(tab, params) {
  const { propertyId, dateRange, metrics, dailyBreakdown, channel, country, offset, startTime } = params;

  if (tab === 'traffic') {
    var finalDims = [];
    if (dailyBreakdown) finalDims.push('date');
    (params.dimensions || []).forEach(function(d){ if (finalDims.indexOf(d)===-1) finalDims.push(d); });
    var req = {
      dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
      metrics: metrics.map(function(m){ return {name:m}; }),
      dimensions: finalDims.map(function(d){ return {name:d}; })
    };
    if (finalDims.length) req.orderBys = [{ dimension:{ dimensionName:finalDims[0] } }];
    var cf = _buildChannelCountryFilter_(channel, country);
    if (cf) req.dimensionFilter = cf;
    var resp = _runReportChunked_(req, propertyId, offset, startTime);
    var headers = finalDims.map(_dimLabel_).concat(metrics.map(_metricLabel_));
    var rows = (resp.rows||[]).map(function(row){
      return (row.dimensionValues||[]).map(function(dv){return dv.value;})
        .concat((row.metricValues||[]).map(function(mv,i){return _parseVal_(metrics[i],mv.value);}));
    });

    var selectedKE = (params.keyEvents && params.keyEvents.length > 0) ? params.keyEvents : [];
    var keMap = {};
    if (selectedKE.length > 0) {
      var keDims = finalDims.concat(['eventName']);
      var keFilters = [];
      if (cf) keFilters.push(cf);
      keFilters.push(selectedKE.length === 1
        ? { filter:{ fieldName:'eventName', stringFilter:{ matchType:'EXACT', value:selectedKE[0] } } }
        : { filter:{ fieldName:'eventName', inListFilter:{ values:selectedKE } } });

      var keReq = {
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        metrics:    [{ name:'eventCount' }],
        dimensions: keDims.map(function(d){ return {name:d}; }),
        dimensionFilter: keFilters.length === 1
          ? keFilters[0]
          : { andGroup:{ expressions:keFilters } }
      };
      try {
        var keResp = _runReportPaginated_(keReq, propertyId);
        (keResp.rows || []).forEach(function(row) {
          var dimVals = (row.dimensionValues||[]).map(function(dv){ return dv.value; });
          var evName  = dimVals.pop();
          var key     = dimVals.join('||');
          if (!keMap[key]) keMap[key] = {};
          keMap[key][evName] = (keMap[key][evName]||0) + (parseInt(row.metricValues[0].value,10)||0);
        });
      } catch(e) {
        Logger.log('Traffic MoM KE fetch failed: ' + e.message);
      }
    }
    var finalRows = rows.map(function(row) {
      var rowKey = row.slice(0, finalDims.length).join('||');
      var keCounts = selectedKE.map(function(ev) {
        return (keMap[rowKey] && keMap[rowKey][ev]) ? keMap[rowKey][ev] : 0;
      });
      return row.concat(keCounts);
    });
    return { 
      headers: headers.concat(selectedKE), 
      rows: finalRows, 
      metricCols: metrics.map(function(_,i){return finalDims.length+i;}),
      metrics: metrics,
      keyEvents: selectedKE,
      status: resp.isComplete ? 'complete' : 'partial',
      nextOffset: resp.nextOffset
    };

  } else if (tab === 'audience') {
    var dims2 = dailyBreakdown ? ['date', params.dimension] : [params.dimension];
    var req2 = {
      dateRanges: [{ startDate:dateRange.startDate, endDate:dateRange.endDate }],
      metrics: metrics.map(function(m){return{name:m};}),
      dimensions: dims2.map(function(d){return{name:d};}),
      orderBys: [{metric:{metricName:metrics[0]},desc:true}]
    };
    var cf2 = _buildChannelCountryFilter_(channel, country);
    if (cf2) req2.dimensionFilter = cf2;
    var resp2 = _runReportChunked_(req2, propertyId, offset, startTime);
    var headers2 = dims2.map(_dimLabel_).concat(metrics.map(_metricLabel_));
    var rows2 = (resp2.rows||[]).map(function(row){
      return (row.dimensionValues||[]).map(function(dv){return dv.value;})
        .concat((row.metricValues||[]).map(function(mv,i){return _parseVal_(metrics[i],mv.value);}));
    });

    var selectedKE = (params.keyEvents && params.keyEvents.length > 0) ? params.keyEvents : [];
    var keMap = {};
    if (selectedKE.length > 0) {
      var keDims = dims2.concat(['eventName']);
      var keFilters = [];
      if (cf2) keFilters.push(cf2);
      keFilters.push(selectedKE.length === 1
        ? { filter:{ fieldName:'eventName', stringFilter:{ matchType:'EXACT', value:selectedKE[0] } } }
        : { filter:{ fieldName:'eventName', inListFilter:{ values:selectedKE } } });

      var keReq = {
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        metrics:    [{ name:'eventCount' }],
        dimensions: keDims.map(function(d){ return {name:d}; }),
        dimensionFilter: keFilters.length === 1
          ? keFilters[0]
          : { andGroup:{ expressions:keFilters } }
      };
      try {
        var keResp = _runReportPaginated_(keReq, propertyId);
        (keResp.rows || []).forEach(function(row) {
          var dimVals = (row.dimensionValues||[]).map(function(dv){ return dv.value; });
          var evName  = dimVals.pop();
          var key     = dimVals.join('||');
          if (!keMap[key]) keMap[key] = {};
          keMap[key][evName] = (keMap[key][evName]||0) + (parseInt(row.metricValues[0].value,10)||0);
        });
      } catch(e) {
        Logger.log('Audience MoM KE fetch failed: ' + e.message);
      }
    }
    var finalRows2 = rows2.map(function(row) {
      var rowKey = row.slice(0, dims2.length).join('||');
      var keCounts = selectedKE.map(function(ev) {
        return (keMap[rowKey] && keMap[rowKey][ev]) ? keMap[rowKey][ev] : 0;
      });
      return row.concat(keCounts);
    });
    return { 
      headers: headers2.concat(selectedKE), 
      rows: finalRows2, 
      metricCols: metrics.map(function(_,i){return dims2.length+i;}),
      metrics: metrics,
      keyEvents: selectedKE,
      status: resp2.isComplete ? 'complete' : 'partial',
      nextOffset: resp2.nextOffset
    };

  } else if (tab === 'pages') {
    var dims3 = dailyBreakdown ? ['date', params.dimension] : [params.dimension];
    var req3 = {
      dateRanges:[{startDate:dateRange.startDate,endDate:dateRange.endDate}],
      metrics:metrics.map(function(m){return{name:m};}),
      dimensions:dims3.map(function(d){return{name:d};}),
      orderBys:[{metric:{metricName:metrics[0]},desc:true}]
    };
    var pageFilter = params.pageFilter||[];
    var allF = [];
    var pageExpr = _buildPageFilters_(pageFilter, params.dimension);
    if (pageExpr) allF.push(pageExpr);
    if (channel) allF.push({filter:{fieldName:'sessionDefaultChannelGrouping',stringFilter:{matchType:'EXACT',value:channel}}});
    if (country) allF.push({filter:{fieldName:'country',stringFilter:{matchType:'EXACT',value:country.toUpperCase()}}});
    if (allF.length===1) req3.dimensionFilter=allF[0];
    else if (allF.length>1) req3.dimensionFilter={andGroup:{expressions:allF}};
    var resp3 = _runReportChunked_(req3, propertyId, offset, startTime);
    var headers3 = dims3.map(_dimLabel_).concat(metrics.map(_metricLabel_));
    var rows3 = (resp3.rows||[]).map(function(row){
      return (row.dimensionValues||[]).map(function(dv){return dv.value;})
        .concat((row.metricValues||[]).map(function(mv,i){return _parseVal_(metrics[i],mv.value);}));
    });

    var selectedKE = (params.keyEvents && params.keyEvents.length > 0) ? params.keyEvents : [];
    var keMap = {};
    if (selectedKE.length > 0) {
      var keDims = dims3.concat(['eventName']);
      var keFilters = [];
      if (allF.length === 1) keFilters.push(allF[0]);
      else if (allF.length > 1) keFilters.push({ andGroup: { expressions: allF } });

      keFilters.push(selectedKE.length === 1
        ? { filter:{ fieldName:'eventName', stringFilter:{ matchType:'EXACT', value:selectedKE[0] } } }
        : { filter:{ fieldName:'eventName', inListFilter:{ values:selectedKE } } });

      var keReq = {
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        metrics:    [{ name:'eventCount' }],
        dimensions: keDims.map(function(d){ return {name:d}; }),
        dimensionFilter: keFilters.length === 1
          ? keFilters[0]
          : { andGroup:{ expressions: keFilters } }
        };
      try {
        var keResp = _runReportPaginated_(keReq, propertyId);
        (keResp.rows || []).forEach(function(row) {
          var dimVals = (row.dimensionValues||[]).map(function(dv){ return dv.value; });
          var evName  = dimVals.pop();
          var key     = dimVals.join('||');
          if (!keMap[key]) keMap[key] = {};
          keMap[key][evName] = (keMap[key][evName]||0) + (parseInt(row.metricValues[0].value,10)||0);
        });
      } catch(e) {
        Logger.log('Pages MoM KE fetch failed: ' + e.message);
      }
    }
    var finalRows3 = rows3.map(function(row) {
      var rowKey = row.slice(0, dims3.length).join('||');
      var keCounts = selectedKE.map(function(ev) {
        return (keMap[rowKey] && keMap[rowKey][ev]) ? keMap[rowKey][ev] : 0;
      });
      return row.concat(keCounts);
    });
    return { 
      headers: headers3.concat(selectedKE), 
      rows: finalRows3, 
      metricCols: metrics.map(function(_,i){return dims3.length+i;}),
      metrics: metrics,
      keyEvents: selectedKE,
      status: resp3.isComplete ? 'complete' : 'partial',
      nextOffset: resp3.nextOffset
    };

  } else if (tab === 'events') {
    var evDims = ['eventName'];
    if (dailyBreakdown) evDims.unshift('date');
    if (params.dimension) evDims.push(params.dimension);
    var req4 = {
      dateRanges:[{startDate:dateRange.startDate,endDate:dateRange.endDate}],
      metrics:[{name:'eventCount'},{name:'totalUsers'}],
      dimensions:evDims.map(function(d){return{name:d};}),
      orderBys:[{metric:{metricName:'eventCount'},desc:true}]
    };
    var evF = [];
    if (params.eventNames && params.eventNames.length) {
      evF.push(params.eventNames.length===1
        ?{filter:{fieldName:'eventName',stringFilter:{matchType:'EXACT',value:params.eventNames[0]}}}
        :{filter:{fieldName:'eventName',inListFilter:{values:params.eventNames}}});
    }
    if (channel) evF.push({filter:{fieldName:'sessionDefaultChannelGrouping',stringFilter:{matchType:'EXACT',value:channel}}});
    if (country) evF.push({filter:{fieldName:'country',stringFilter:{matchType:'EXACT',value:country.toUpperCase()}}});
    if (evF.length===1) req4.dimensionFilter=evF[0];
    else if (evF.length>1) req4.dimensionFilter={andGroup:{expressions:evF}};
    var resp4 = _runReportChunked_(req4, propertyId, offset, startTime);
    var headers4 = evDims.map(_dimLabel_).concat(['Event Count','Users']);
    var rows4 = (resp4.rows||[]).map(function(row){
      return (row.dimensionValues||[]).map(function(dv){return dv.value;})
        .concat([parseInt(row.metricValues[0].value,10)||0, parseInt(row.metricValues[1].value,10)||0]);
    });
    return { 
      headers:headers4, 
      rows:rows4, 
      metricCols:[evDims.length, evDims.length+1],
      metrics: ['eventCount', 'totalUsers'],
      keyEvents: [],
      status: resp4.isComplete ? 'complete' : 'partial',
      nextOffset: resp4.nextOffset
    };

  } else if (tab === 'ecommerce') {
    var ecDims = [];
    if (dailyBreakdown) ecDims.push('date');
    if (params.dimension) ecDims.push(params.dimension);
    var req5 = {
      dateRanges:[{startDate:dateRange.startDate,endDate:dateRange.endDate}],
      metrics:metrics.map(function(m){return{name:m};}),
      dimensions:ecDims.map(function(d){return{name:d};})
    };
    if (ecDims.length) req5.orderBys=[{metric:{metricName:metrics[0]},desc:true}];
    var cf5 = _buildChannelCountryFilter_(channel, country);
    if (cf5) req5.dimensionFilter = cf5;
    var resp5 = _runReportChunked_(req5, propertyId, offset, startTime);
    var headers5 = ecDims.map(_dimLabel_).concat(metrics.map(_metricLabel_));
    var rows5 = (resp5.rows||[]).map(function(row){
      return (row.dimensionValues||[]).map(function(dv){return dv.value;})
        .concat((row.metricValues||[]).map(function(mv,i){return _parseVal_(metrics[i],mv.value);}));
    });
    return { 
      headers:headers5, 
      rows:rows5, 
      metricCols:metrics.map(function(_,i){return ecDims.length+i;}),
      metrics: metrics,
      keyEvents: [],
      status: resp5.isComplete ? 'complete' : 'partial',
      nextOffset: resp5.nextOffset
    };

  } else if (tab === 'llm') {
    // MoM stacks sessions rows only; events handled separately
    var llmRes  = _fetchRawLLMRows_(params);
    var llmSess = llmRes.sessions;
    return {
      headers:    llmSess.headers,
      rows:       llmSess.rows,
      metricCols: llmSess.metricFmts.map(function(_, i){ return llmSess.dimCount + i; }),
      metrics:    ['sessions','totalUsers','newUsers','engagedSessions','bounceRate'],
      keyEvents:  llmSess.keyEventNames || [],
      status:     llmSess.status,
      nextOffset: llmSess.nextOffset
    };

  } else if (tab === 'utm') {
    var utmDims = [];
    if (params.dailyBreakdown) utmDims.push('date');
    (params.dimensions||[]).forEach(function(d){ if (utmDims.indexOf(d)===-1) utmDims.push(d); });
    utmDims = _resolveUTMDims_(utmDims);
    var safeMetrics = _filterUTMCompatibleMetrics_(params.metrics||[], utmDims);
    // _buildUTMFilters_ safely handles missing filter params (they default to undefined → skipped)
    var utmFilters = _buildUTMFilters_(params, utmDims);
    var reqU = {
      dateRanges:[{startDate:dateRange.startDate,endDate:dateRange.endDate}],
      metrics: safeMetrics.map(function(m){return{name:m};}),
      dimensions: utmDims.map(function(d){return{name:d};}),
      dimensionFilter: utmFilters,
      orderBys:[{metric:{metricName:safeMetrics[0]},desc:true}]
    };
    var respU = _runReportChunked_(reqU, propertyId, offset, startTime);
    var headersU = utmDims.map(_dimLabel_).concat(safeMetrics.map(_metricLabel_));
    var rowsU = (respU.rows||[]).map(function(row){
      return (row.dimensionValues||[]).map(function(dv){return dv.value;})
        .concat((row.metricValues||[]).map(function(mv,i){return _parseVal_(safeMetrics[i],mv.value);}));
    });

    var selectedKE = (params.keyEvents && params.keyEvents.length > 0) ? params.keyEvents : [];
    var rowMapU = {};
    rowsU.forEach(function(row) {
      var key = row.slice(0, utmDims.length).join('||');
      rowMapU[key] = {
        row: row,
        ke: {}
      };
    });
    
    selectedKE.forEach(function(eventName) {
      try {
        var keResp = _runReportPaginated_({
          dateRanges:      [{ startDate:dateRange.startDate, endDate:dateRange.endDate }],
          metrics:         [{ name:'eventCount' }],
          dimensions:      utmDims.map(function(d){ return {name:d}; }),
          dimensionFilter: { andGroup:{ expressions:[
            utmFilters,
            { filter:{ fieldName:'eventName', stringFilter:{ matchType:'EXACT', value:eventName } } }
          ].filter(Boolean) }}
        }, propertyId);
        (keResp.rows||[]).forEach(function(row) {
          var key = (row.dimensionValues||[]).map(function(dv){ return dv.value; }).join('||');
          if (rowMapU[key]) rowMapU[key].ke[eventName] = parseInt(row.metricValues[0].value,10)||0;
        });
      } catch(e) { Logger.log('UTM MoM KE skipped for ' + eventName + ': ' + e.message); }
    });

    var finalRowsU = rowsU.map(function(row) {
      var key = row.slice(0, utmDims.length).join('||');
      var keCounts = selectedKE.map(function(ev) {
        return (rowMapU[key] && rowMapU[key].ke[ev]) ? rowMapU[key].ke[ev] : 0;
      });
      return row.concat(keCounts);
    });

    return { 
      headers: headersU.concat(selectedKE), 
      rows: finalRowsU, 
      metricCols: safeMetrics.map(function(_,i){return utmDims.length+i;}),
      metrics: safeMetrics,
      keyEvents: selectedKE,
      status: respU.isComplete ? 'complete' : 'partial',
      nextOffset: respU.nextOffset
    };
  }

  throw new Error('Unknown tab: ' + tab);
}

// ==========================================
// LLM TRAFFIC
// params: { propertyId, dateRange, sources[], fetchType, keyEvents[], dailyBreakdown, sheetName }
// fetchType: 'sessions' | 'events' | 'both'
// ==========================================
function fetchGA4LLMData(params) {
  if (!params.propertyId) throw new Error('No GA4 property selected.');
  if (!params.sources || !params.sources.length) throw new Error('No LLM sources selected.');

  params.startTime = Date.now();
  var result   = _fetchRawLLMRows_(params);
  var sessData = result.sessions;
  var sheet    = _ensureSheet_(params.sheetName, sessData.headers, sessData.keyEvents ? sessData.keyEvents.length : 0, params.offset);
  var numRows  = sessData.rows.length;

  var startRow = params.offset > 0 ? sheet.getLastRow() + 1 : 2;
  if (numRows > 0) {
    sheet.getRange(startRow, 1, numRows, sessData.rows[0].length).setValues(sessData.rows);

    var totalCols  = sessData.headers.length;
    var dimCount   = sessData.dimCount;
    var keCount    = sessData.keyEventNames ? sessData.keyEventNames.length : 0;
    var llmMetrics = ['sessions','totalUsers','newUsers','engagedSessions','bounceRate'];

    _applyFormatting_(sheet, startRow, sessData.rows, dimCount, llmMetrics, keCount);

    var totalRowsSheet = sheet.getLastRow() - 1;
    _mergeCellRuns_(sheet, 1, totalRowsSheet);
    if (totalCols >= 2) _mergeCellRuns_(sheet, 2, totalRowsSheet);
  }

  if (sessData.status === 'partial') {
    return { status: 'partial', nextOffset: sessData.nextOffset, message: 'Fetched ' + sessData.nextOffset + ' of ' + sessData.totalRows + ' rows...' };
  }

  var msg = '\u2705 LLM Traffic written \u2192 "' + params.sheetName + '" (' + sessData.totalRows + ' rows)\n';
  if (sessData.keyEventNames && sessData.keyEventNames.length) {
    msg += 'Key Events as columns: ' + sessData.keyEventNames.join(', ') + '\n';
  }
  msg += 'Sources: ' + params.sources.join(', ') + '\n';
  msg += 'Landing page: ' + (params.includeLandingPage ? 'Yes' : 'No');
  return msg;
}

// Merge consecutive cells in `col` (1-based) that share the same value.
// For col > 1, also checks that the previous column value matches (group anchor).
function _mergeCellRuns_(sheet, col, numRows) {
  if (numRows < 2) return;
  var fetchCols = col; // fetch up to this many columns for anchor check
  var data = sheet.getRange(2, 1, numRows, fetchCols).getValues();
  var runStart = 0;

  for (var i = 1; i <= numRows; i++) {
    var endOfData = i === numRows;
    var sameVal   = !endOfData && data[i][col-1] === data[runStart][col-1];
    // For col > 1 also require the previous column (group anchor) to match
    var sameGroup = col === 1 || (!endOfData && data[i][col-2] === data[runStart][col-2]);
    var continuous = sameVal && sameGroup;

    if (!continuous) {
      var runLen = i - runStart;
      if (runLen > 1 && String(data[runStart][col-1]).trim() !== '') {
        sheet.getRange(runStart + 2, col, runLen, 1)
          .merge()
          .setVerticalAlignment('middle')
          .setHorizontalAlignment('center')
          .setFontFamily(FMT_FONT);
      }
      runStart = i;
    }
  }
}

function _fetchRawLLMRows_(params) {
  const { propertyId, dateRange, sources, fetchType, keyEvents,
          dailyBreakdown, includeLandingPage, offset, startTime } = params;

  if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
    throw new Error('Invalid date range. Please re-select and try again.');
  }
  if (!sources || !sources.length) throw new Error('No LLM sources selected.');

  var dr = [{ startDate: dateRange.startDate, endDate: dateRange.endDate }];

  // Source filter
  var srcFilter = sources.length === 1
    ? { filter:{ fieldName:'sessionSource', stringFilter:{ matchType:'EXACT', value:sources[0] } } }
    : { filter:{ fieldName:'sessionSource', inListFilter:{ values:sources } } };

  // Dimensions
  var sessDims = [];
  if (dailyBreakdown)     sessDims.push('date');
  sessDims.push('sessionSource');
  if (includeLandingPage) sessDims.push('landingPage');

  // Sessions report
  var sessReq = {
    dateRanges: dr,
    metrics: [
      { name:'sessions' }, { name:'totalUsers' }, { name:'newUsers' },
      { name:'engagedSessions' }, { name:'bounceRate' }
    ],
    dimensions: sessDims.map(function(d){ return {name:d}; }),
    dimensionFilter: srcFilter,
    orderBys: [{ metric:{ metricName:'sessions' }, desc:true }]
  };

  var sessResp = _runReportChunked_(sessReq, propertyId, offset, startTime);
  var sessRows = (sessResp.rows || []).map(function(row) {
    var dims = (row.dimensionValues||[]).map(function(dv){ return dv.value; });
    var mvs  = row.metricValues || [];
    return dims.concat([
      parseInt(mvs[0].value,10)||0,
      parseInt(mvs[1].value,10)||0,
      parseInt(mvs[2].value,10)||0,
      parseInt(mvs[3].value,10)||0,
      parseFloat(mvs[4].value)||0
    ]);
  });

  // Key Events — fetch grouped by [sessDims..., eventName], build lookup map
  var selectedKE = (keyEvents && keyEvents.length > 0) ? keyEvents : [];
  var keMap = {}; // rowKey (dim values joined) -> { eventName: count }

  if ((fetchType === 'events' || fetchType === 'both') && selectedKE.length > 0) {
    var keDims = sessDims.concat(['eventName']);
    var keFilters = [srcFilter,
      selectedKE.length === 1
        ? { filter:{ fieldName:'eventName', stringFilter:{ matchType:'EXACT', value:selectedKE[0] } } }
        : { filter:{ fieldName:'eventName', inListFilter:{ values:selectedKE } } }
    ];

    var keReq = {
      dateRanges: dr,
      metrics:    [{ name:'eventCount' }],
      dimensions: keDims.map(function(d){ return {name:d}; }),
      dimensionFilter: { andGroup:{ expressions:keFilters } }
    };

    try {
      var keResp = _runReportPaginated_(keReq, propertyId);
      (keResp.rows || []).forEach(function(row) {
        var dimVals = (row.dimensionValues||[]).map(function(dv){ return dv.value; });
        var evName  = dimVals.pop(); // last dim is eventName
        var key     = dimVals.join('||');
        if (!keMap[key]) keMap[key] = {};
        keMap[key][evName] = (keMap[key][evName] || 0) + (parseInt(row.metricValues[0].value,10)||0);
      });
    } catch(e) {
      Logger.log('KE fetch failed: ' + e.message);
    }
  }

  // Build headers: dims + metrics + key event names
  var sessMetricFmts = ['#,##0','#,##0','#,##0','#,##0','0.00%'];
  var headers = sessDims.map(_dimLabel_)
    .concat(['Sessions','Total Users','New Users','Engaged Sessions','Bounce Rate'])
    .concat(selectedKE);

  // Append KE counts to each session row
  var finalRows = sessRows.map(function(row) {
    var rowKey   = row.slice(0, sessDims.length).join('||');
    var keCounts = selectedKE.map(function(ev) {
      return keMap[rowKey] && keMap[rowKey][ev] ? keMap[rowKey][ev] : 0;
    });
    return row.concat(keCounts);
  });

  // Sort: col0 asc (Month/Date/Source), col1 asc, then sessions desc
  finalRows.sort(function(a, b) {
    if (a[0] < b[0]) return -1; if (a[0] > b[0]) return 1;
    if (sessDims.length > 1) {
      if (a[1] < b[1]) return -1; if (a[1] > b[1]) return 1;
    }
    return (b[sessDims.length] || 0) - (a[sessDims.length] || 0);
  });

  return {
    sessions: {
      headers:       headers,
      rows:          finalRows,
      dimCount:      sessDims.length,
      metricFmts:    sessMetricFmts,
      keyEventNames: selectedKE,
      status:        sessResp.isComplete ? 'complete' : 'partial',
      nextOffset:    sessResp.nextOffset,
      totalRows:     sessResp.totalRows
    },
    events: { headers:[], rows:[], dimCount:0, metricFmts:[] }
  };
}

function _formatLLMSheet_(sheet, headers, rows, dimCount, metricFmts) {
  for (var d = 1; d <= dimCount; d++) {
    sheet.getRange(2, d, rows.length, 1).setHorizontalAlignment('left').setFontFamily(FMT_FONT);
  }
  metricFmts.forEach(function(fmt, i) {
    sheet.getRange(2, dimCount + i + 1, rows.length, 1)
      .setNumberFormat(fmt).setHorizontalAlignment('center').setFontFamily(FMT_FONT);
  });
}

// Dimensions that restrict which metrics can be used
// UTM dims that restrict which metrics can be used
const UTM_EXTENDED_DIMS = [
  'googleAdsKeyword', 'sessionCampaignId',
  'sessionManualAdContent', 'sessionManualTerm'
];
// Metrics safe ONLY when NO extended dims are present
const UTM_EXTENDED_RESTRICTED_METRICS = [
  'bounceRate', 'engagementRate', 'averageSessionDuration',
  'engagedSessions', 'sessionsPerUser', 'newUsers'
];
// sessionSourceMedium conflicts with sessionSource + sessionMedium together
function _resolveUTMDims_(dims) {
  var hasSM     = dims.indexOf('sessionSourceMedium') !== -1;
  var hasSrc    = dims.indexOf('sessionSource')  !== -1;
  var hasMed    = dims.indexOf('sessionMedium')  !== -1;
  // If sessionSourceMedium is present alongside both source AND medium, drop source+medium (they're redundant)
  if (hasSM && hasSrc && hasMed) {
    dims = dims.filter(function(d){ return d !== 'sessionSource' && d !== 'sessionMedium'; });
  }
  // If sessionSourceMedium is present alongside just one of source/medium, still drop that one
  else if (hasSM && hasSrc) {
    dims = dims.filter(function(d){ return d !== 'sessionSource'; });
  }
  else if (hasSM && hasMed) {
    dims = dims.filter(function(d){ return d !== 'sessionMedium'; });
  }
  return dims;
}

function _filterUTMCompatibleMetrics_(metrics, dims) {
  var hasExtended = dims.some(function(d) {
    return UTM_EXTENDED_DIMS.indexOf(d) !== -1;
  });
  if (!hasExtended) return metrics;
  var safe = metrics.filter(function(m) {
    return UTM_EXTENDED_RESTRICTED_METRICS.indexOf(m) === -1;
  });
  return safe.length ? safe : ['sessions'];
}

function _buildUTMFilters_(params, dims) {
  var exprs = [];
  if (params.campaignFilter) exprs.push({ filter:{ fieldName:'sessionCampaignName', stringFilter:{ matchType:'CONTAINS', value:params.campaignFilter } } });
  if (params.sourceFilter)   exprs.push({ filter:{ fieldName:'sessionSource',       stringFilter:{ matchType:'CONTAINS', value:params.sourceFilter   } } });
  if (params.mediumFilter)   exprs.push({ filter:{ fieldName:'sessionMedium',       stringFilter:{ matchType:'CONTAINS', value:params.mediumFilter   } } });
  exprs.push({ notExpression:{ filter:{ fieldName:'sessionCampaignName', stringFilter:{ matchType:'EXACT', value:'(not set)' } } } });
  return exprs.length === 1 ? exprs[0] : { andGroup:{ expressions:exprs } };
}

// ==========================================
// TAB 7: UTM
// params: { propertyId, dateRange, metrics[], dimensions[], dailyBreakdown,
//           keyEvents[], campaignFilter, sourceFilter, mediumFilter, sheetName, offset }
// ==========================================
function fetchGA4UTMData(params) {
  const { propertyId, dateRange, metrics, dimensions, dailyBreakdown,
          keyEvents, sheetName, offset } = params;
  _validateBase_(propertyId, metrics);
  var startTime = Date.now();
  if (!dimensions || !dimensions.length) throw new Error('Select at least one UTM parameter.');

  var finalDims = [];
  if (dailyBreakdown) finalDims.push('date');
  dimensions.forEach(function(d) { if (finalDims.indexOf(d) === -1) finalDims.push(d); });
  // Resolve conflicting dims (e.g. sessionSourceMedium vs sessionSource+sessionMedium)
  finalDims = _resolveUTMDims_(finalDims);

  // Auto-drop metrics incompatible with selected UTM dimensions
  var safeMetrics  = _filterUTMCompatibleMetrics_(metrics, finalDims);
  var dropped      = metrics.filter(function(m){ return safeMetrics.indexOf(m) === -1; });
  var dimFilter    = _buildUTMFilters_(params, finalDims);

  // ---- METRICS REPORT ----
  var metricsResp = _runReportChunked_({
    dateRanges:      [{ startDate:dateRange.startDate, endDate:dateRange.endDate }],
    metrics:         safeMetrics.map(function(m){ return {name:m}; }),
    dimensions:      finalDims.map(function(d){ return {name:d}; }),
    dimensionFilter: dimFilter,
    orderBys:        [{ metric:{ metricName:safeMetrics[0] }, desc:true }]
  }, propertyId, offset, startTime);

  var dimKey = function(row) {
    return (row.dimensionValues||[]).map(function(dv){ return dv.value; }).join('||');
  };

  var rowMap = {}, rowOrder = [];
  (metricsResp.rows||[]).forEach(function(row) {
    var k = dimKey(row);
    rowMap[k] = {
      dims: (row.dimensionValues||[]).map(function(dv){ return dv.value; }),
      mets: (row.metricValues||[]).map(function(mv,i){ return _parseVal_(safeMetrics[i], mv.value); }),
      ke:   {}
    };
    rowOrder.push(k);
  });

  // ---- KEY EVENTS (one report per event) ----
  var selectedKE = keyEvents || [];
  selectedKE.forEach(function(eventName) {
    try {
      var keResp = _runReportPaginated_({
        dateRanges:      [{ startDate:dateRange.startDate, endDate:dateRange.endDate }],
        metrics:         [{ name:'eventCount' }],
        dimensions:      finalDims.map(function(d){ return {name:d}; }),
        dimensionFilter: { andGroup:{ expressions:[
          dimFilter,
          { filter:{ fieldName:'eventName', stringFilter:{ matchType:'EXACT', value:eventName } } }
        ].filter(Boolean) }}
      }, propertyId);
      (keResp.rows||[]).forEach(function(row) {
        var k = dimKey(row);
        if (rowMap[k]) rowMap[k].ke[eventName] = parseInt(row.metricValues[0].value,10)||0;
      });
    } catch(e) { Logger.log('KE skipped for ' + eventName + ': ' + e.message); }
  });

  // ---- WRITE SHEET ----
  var headers = finalDims.map(_dimLabel_)
    .concat(safeMetrics.map(_metricLabel_))
    .concat(selectedKE);
  var sheet = _ensureSheet_(sheetName, headers, selectedKE ? selectedKE.length : 0, offset);
  var rows  = rowOrder.map(function(k) {
    var r = rowMap[k];
    return r.dims.concat(r.mets).concat(selectedKE.map(function(ev){ return r.ke[ev]||0; }));
  });

  _writeRows_(sheet, rows, safeMetrics, finalDims.length, offset);

  if (!metricsResp.isComplete) {
    return { status: 'partial', nextOffset: metricsResp.nextOffset, message: 'Fetched ' + metricsResp.nextOffset + ' of ' + metricsResp.totalRows + ' rows...' };
  }
  return { status: 'complete', message: '✅ UTM data written!\nTotal rows: ' + metricsResp.totalRows + '\nSheet: ' + sheetName };
}

function _metricLabel_(m) { return METRIC_LABELS[m] || m; }
function _dimLabel_(d)     { return DIM_LABELS[d]     || d; }

function _metricFmt_(metric) {
  const pct  = ['bounceRate','engagementRate','purchaseToViewRate','exitRate','cartToViewRate'];
  const dur  = ['averageSessionDuration'];
  const curr = ['purchaseRevenue','averagePurchaseRevenue','itemRevenue'];
  const dec  = ['sessionsPerUser','screenPageViewsPerSession','screenPageViewsPerUser'];
  if (pct.indexOf(metric)  !== -1) return '0.00%';
  if (dur.indexOf(metric)  !== -1) return '#,##0.0';
  if (curr.indexOf(metric) !== -1) return '#,##0.00';
  if (dec.indexOf(metric)  !== -1) return '#,##0.00';
  return '#,##0';
}

function _parseVal_(metric, raw) {
  const pct    = ['bounceRate','engagementRate','purchaseToViewRate','exitRate','cartToViewRate'];
  const floats = ['averageSessionDuration','sessionsPerUser','screenPageViewsPerSession','screenPageViewsPerUser','purchaseRevenue','averagePurchaseRevenue','userEngagementDuration','itemRevenue'];
  if (pct.indexOf(metric)    !== -1) return parseFloat(raw) || 0;
  if (floats.indexOf(metric) !== -1) return parseFloat(raw) || 0;
  return parseInt(raw, 10) || 0;
}

// Helper to auto-paginate GA4 runReport — fetches ALL rows (no limit cap, no time limit)
// Used for sub-queries like Key Events that must complete entirely for the current chunk.
function _runReportPaginated_(req, propertyId) {
  var PAGE_SIZE = 100000;
  req.limit  = PAGE_SIZE;
  req.offset = 0;

  var firstResp = _runReportBatched_(req, propertyId);
  if (!firstResp || !firstResp.rows || !firstResp.rows.length) return firstResp;

  var totalRows = parseInt(firstResp.rowCount, 10) || firstResp.rows.length;
  var allRows   = firstResp.rows;

  while (allRows.length < totalRows) {
    req.offset = allRows.length;
    var nextResp = _runReportBatched_(req, propertyId);
    if (!nextResp || !nextResp.rows || !nextResp.rows.length) break;
    allRows = allRows.concat(nextResp.rows);
  }

  firstResp.rows = allRows;
  return firstResp;
}

// Helper to auto-paginate GA4 runReport — with a 4.5 minute time bailout.
// Uses offset-based pagination: GA4 API max is 100k rows per request.
function _runReportChunked_(req, propertyId, startOffset, startTime) {
  var PAGE_SIZE = 100000; // GA4 API maximum per request
  req.limit  = PAGE_SIZE;
  req.offset = startOffset || 0;
  
  if (!startTime) startTime = Date.now();
  var TIME_LIMIT = 4.5 * 60 * 1000; // 4.5 minutes

  var firstResp = _runReportBatched_(req, propertyId);
  if (!firstResp || !firstResp.rows || !firstResp.rows.length) {
    return { rows: [], isComplete: true, nextOffset: req.offset };
  }

  var totalRows = parseInt(firstResp.rowCount, 10) || firstResp.rows.length;
  var allRows   = firstResp.rows;
  var currentOffset = req.offset + allRows.length;
  var isComplete = currentOffset >= totalRows;

  // Keep fetching while there are more rows, UNLESS we run out of time
  while (!isComplete) {
    if (Date.now() - startTime > TIME_LIMIT) {
      break; // Bail out before Google's 6-minute wall
    }
    
    req.offset = currentOffset;
    var nextResp = _runReportBatched_(req, propertyId);
    if (!nextResp || !nextResp.rows || !nextResp.rows.length) {
      isComplete = true;
      break;
    }
    allRows = allRows.concat(nextResp.rows);
    currentOffset += nextResp.rows.length;
    isComplete = currentOffset >= totalRows;
  }

  return {
    rows: allRows,
    isComplete: isComplete,
    nextOffset: currentOffset,
    totalRows: totalRows
  };
}

// Helper to batch GA4 runReport queries when requesting > 10 metrics
function _runReportBatched_(req, propertyId) {
  if (!req || !req.metrics || !Array.isArray(req.metrics) || req.metrics.length <= 10) {
    return AnalyticsData.Properties.runReport(req, propertyId);
  }

  // Chunk metrics into groups of up to 10.
  // The first metric is kept in ALL chunks to ensure sorting and orderBys consistency.
  var chunks = [];
  var firstMetric = req.metrics[0];
  var remainingMetrics = req.metrics.slice(1);

  // First chunk has firstMetric + first 9 remaining metrics
  var chunk1 = [firstMetric].concat(remainingMetrics.slice(0, 9));
  chunks.push(chunk1);

  // Subsequent chunks have firstMetric + next 9 remaining metrics
  for (var i = 9; i < remainingMetrics.length; i += 9) {
    chunks.push([firstMetric].concat(remainingMetrics.slice(i, i + 9)));
  }

  // Run the report for the first chunk
  var req1 = {};
  for (var k in req) {
    if (req.hasOwnProperty(k)) req1[k] = req[k];
  }
  req1.metrics = chunks[0];
  var resp1 = AnalyticsData.Properties.runReport(req1, propertyId);

  if (!resp1 || !resp1.rows || resp1.rows.length === 0) {
    return resp1;
  }

  // Index resp1 rows by dimension values (concatenated)
  var resp1Map = {};
  resp1.rows.forEach(function(row) {
    var key = (row.dimensionValues || []).map(function(dv) { return dv.value; }).join('||');
    resp1Map[key] = row;
  });

  // Run subsequent chunks and merge
  for (var c = 1; c < chunks.length; c++) {
    var reqN = {};
    for (var k in req) {
      if (req.hasOwnProperty(k)) reqN[k] = req[k];
    }
    reqN.metrics = chunks[c];
    
    var respN = AnalyticsData.Properties.runReport(reqN, propertyId);

    // Merge metric headers (skipping the first one, which is the duplicate firstMetric)
    if (respN.metricHeaders) {
      for (var h = 1; h < respN.metricHeaders.length; h++) {
        resp1.metricHeaders.push(respN.metricHeaders[h]);
      }
    }

    // Index the rows of respN
    var respNMap = {};
    (respN.rows || []).forEach(function(row) {
      var key = (row.dimensionValues || []).map(function(dv) { return dv.value; }).join('||');
      respNMap[key] = row.metricValues;
    });

    // Append subsequent chunk metric values to matched rows in resp1
    resp1.rows.forEach(function(row) {
      var key = (row.dimensionValues || []).map(function(dv) { return dv.value; }).join('||');
      var extraMets = respNMap[key];
      if (extraMets) {
        for (var m = 1; m < extraMets.length; m++) {
          row.metricValues.push(extraMets[m]);
        }
      } else {
        // Pad with 0 values if row not found in subsequent chunk
        for (var m = 1; m < chunks[c].length; m++) {
          row.metricValues.push({ value: '0' });
        }
      }
    });
  }

  return resp1;
}