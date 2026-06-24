var document = {
    addEventListener: function() {},
    getElementById: function() { return { value: '', classList: { toggle: function() {}, remove: function() {} } }; },
    querySelectorAll: function() { return []; },
    querySelector: function() { return {}; }
};
var google = {
    script: {
        run: {
            withSuccessHandler: function() { return this; },
            withFailureHandler: function() { return this; },
            getGA4Properties: function() {},
            getGA4PropertiesRefresh: function() {},
            getGA4KeyEventsForSidebar: function() {}
        }
    }
};
var alert = function() {};
var setInterval = function() {};
var clearInterval = function() {};
var setTimeout = function() {};
var navigator = {};
var window = {};

// =============================================
// METRIC DEFINITIONS PER TAB
// =============================================
var METRICS_CONFIG = {
  traffic: [
    { v:'sessions',                  l:'Sessions',            def:true  },
    { v:'totalUsers',                l:'Total Users',         def:true  },
    { v:'newUsers',                  l:'New Users',           def:true  },
    { v:'activeUsers',               l:'Active Users',        def:false },
    { v:'engagedSessions',           l:'Engaged Sessions',    def:true  },
    { v:'engagementRate',            l:'Engagement Rate',     def:false },
    { v:'bounceRate',                l:'Bounce Rate',         def:false },
    { v:'averageSessionDuration',    l:'Avg. Session Duration', def:false },
    { v:'sessionsPerUser',           l:'Sessions per User',   def:false },
    { v:'conversions',               l:'Conversions',         def:false },
    { v:'userEngagementDuration',    l:'Engagement Duration',  def:false },
    { v:'screenPageViews',           l:'Page Views',          def:false },
    { v:'screenPageViewsPerSession', l:'Views per Session',   def:false },
    { v:'screenPageViewsPerUser',    l:'Views per User',      def:false },
    { v:'scrolledUsers',             l:'Scrolled Users',      def:false }
  ],
  audience: [
    { v:'totalUsers',                l:'Total Users',         def:true  },
    { v:'newUsers',                  l:'New Users',           def:true  },
    { v:'activeUsers',               l:'Active Users',        def:false },
    { v:'sessions',                  l:'Sessions',            def:true  },
    { v:'engagedSessions',           l:'Engaged Sessions',    def:false },
    { v:'bounceRate',                l:'Bounce Rate',         def:false },
    { v:'averageSessionDuration',    l:'Avg. Session Duration', def:false },
    { v:'engagementRate',            l:'Engagement Rate',     def:false },
    { v:'sessionsPerUser',           l:'Sessions per User',   def:false },
    { v:'conversions',               l:'Conversions',         def:false },
    { v:'userEngagementDuration',    l:'Engagement Duration',  def:false },
    { v:'screenPageViews',           l:'Page Views',          def:false },
    { v:'screenPageViewsPerSession', l:'Views per Session',   def:false },
    { v:'screenPageViewsPerUser',    l:'Views per User',      def:false },
    { v:'scrolledUsers',             l:'Scrolled Users',      def:false }
  ],
  pages: [
    { v:'screenPageViews',           l:'Page Views',          def:true  },
    { v:'sessions',                  l:'Sessions',            def:true  },
    { v:'totalUsers',                l:'Users',               def:false },
    { v:'screenPageViewsPerSession', l:'Views per Session',   def:false },
    { v:'averageSessionDuration',    l:'Avg. Session Duration', def:false },
    { v:'bounceRate',                l:'Bounce Rate',         def:false },
    { v:'activeUsers',               l:'Active Users',        def:false },
    { v:'newUsers',                  l:'New Users',           def:false },
    { v:'engagedSessions',           l:'Engaged Sessions',    def:false },
    { v:'engagementRate',            l:'Engagement Rate',     def:false },
    { v:'sessionsPerUser',           l:'Sessions per User',   def:false },
    { v:'conversions',               l:'Conversions',         def:false },
    { v:'userEngagementDuration',    l:'Engagement Duration',  def:false },
    { v:'screenPageViewsPerUser',    l:'Views per User',      def:false },
    { v:'scrolledUsers',             l:'Scrolled Users',      def:false }
  ],
  ecommerce: [
    { v:'transactions',           l:'Transactions',          def:true  },
    { v:'purchaseRevenue',        l:'Revenue',               def:true  },
    { v:'ecommercePurchases',     l:'Purchases',             def:false },
    { v:'averagePurchaseRevenue', l:'Avg. Order Value',      def:true  },
    { v:'itemsPurchased',         l:'Items Purchased',       def:false },
    { v:'purchaseToViewRate',     l:'Purchase Rate',         def:false },
    { v:'itemsAddedToCart',       l:'Items Added to Cart',   def:false },
    { v:'itemsCheckedOut',        l:'Items Checked Out',     def:false },
    { v:'itemViews',              l:'Item Views',            def:false },
    { v:'cartToViewRate',         l:'Cart-to-View Rate',     def:false },
    { v:'itemRevenue',            l:'Item Revenue',          def:false },
    { v:'totalUsers',             l:'Users',                 def:false },
    { v:'activeUsers',            l:'Active Users',          def:false },
    { v:'newUsers',               l:'New Users',             def:false },
    { v:'sessions',               l:'Sessions',              def:false },
    { v:'conversions',            l:'Conversions',           def:false }
  ],
  utm: [
    { v:'sessions',                  l:'Sessions',            def:true  },
    { v:'totalUsers',                l:'Total Users',         def:true  },
    { v:'newUsers',                  l:'New Users',           def:false },
    { v:'activeUsers',               l:'Active Users',        def:false },
    { v:'engagedSessions',           l:'Engaged Sessions',    def:false },
    { v:'engagementRate',            l:'Engagement Rate',     def:false },
    { v:'bounceRate',                l:'Bounce Rate',         def:false },
    { v:'averageSessionDuration',    l:'Avg. Session Duration', def:false },
    { v:'sessionsPerUser',           l:'Sessions per User',   def:false },
    { v:'conversions',               l:'Conversions',         def:false },
    { v:'userEngagementDuration',    l:'Engagement Duration',  def:false },
    { v:'screenPageViews',           l:'Page Views',          def:false },
    { v:'screenPageViewsPerSession', l:'Views per Session',   def:false },
    { v:'screenPageViewsPerUser',    l:'Views per User',      def:false },
    { v:'scrolledUsers',             l:'Scrolled Users',      def:false }
  ]
};

// active selections
var activeMetrics = {};
Object.keys(METRICS_CONFIG).forEach(function(tab) {
  activeMetrics[tab] = METRICS_CONFIG[tab].filter(function(m){ return m.def; }).map(function(m){ return m.v; });
});

// =============================================
// STATE
// =============================================
var allProperties    = [];
var selectedPropId   = '';
var keyEventsLoaded  = [];
var audienceKeyEvents = []; // selected key events for Audience tab
var pagesKeyEvents = [];    // selected key events for Pages tab
var trafficKeyEvents = [];  // selected key events for Traffic tab
var pageFilterPages  = [];
var currentMetricsTab = 'traffic';
var elapsedTimers    = {};
var llmKeyEventsLoaded = [];

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', function() {
  loadProperties();
  ['tr','au','pg','ev','ec','llm','utm'].forEach(function(p){ updatePreview(p); });
  document.addEventListener('click', function(e) {
    var dd = document.getElementById('propDropdown');
    if (!dd.contains(e.target)) dd.classList.remove('open');
  });
  // Tab arrow init
  var strip = document.getElementById('tabStrip');
  if (strip) {
    strip.addEventListener('scroll', updateTabArrows);
    setTimeout(updateTabArrows, 100);
  }
});

// =============================================
// PROPERTY DROPDOWN
// =============================================
function loadProperties() {
  document.getElementById('propList').innerHTML = '<div style="padding:10px;font-size:12px;color:#999;">Loading</div>';
  google.script.run
    .withSuccessHandler(function(props){ allProperties=props||[]; renderPropList(allProperties); })
    .withFailureHandler(function(e){ document.getElementById('propList').innerHTML='<div style="padding:10px;font-size:12px;color:red;">'+(e.message||e)+'</div>'; })
    .getGA4Properties();
}

function refreshProps() {
  var btn = document.getElementById('refreshPropsBtn');
  btn.textContent='↻ '; btn.disabled=true;
  document.getElementById('propList').innerHTML='<div style="padding:10px;font-size:12px;color:#999;">Refreshing</div>';
  google.script.run
    .withSuccessHandler(function(props){ allProperties=props||[]; renderPropList(allProperties); btn.textContent='↻ Refresh'; btn.disabled=false; })
    .withFailureHandler(function(){ btn.textContent='↻ Refresh'; btn.disabled=false; })
    .getGA4PropertiesRefresh();
}

function renderPropList(props) {
  var list = document.getElementById('propList');
  if (!props.length) { list.innerHTML='<div style="padding:10px;font-size:12px;color:#999;">No properties found.</div>'; return; }
  list.innerHTML = props.map(function(p){
    return '<div class="site-item" onclick="selectProp(\''+esc(p.propertyId)+'\',\''+esc(p.displayName)+'\')">'
      +'<div>'+esc(p.displayName)+'</div>'
      +'<div class="site-sub">'+p.propertyId+' · '+esc(p.accountName)+'</div></div>';
  }).join('');
}

function filterProps() {
  var q = document.getElementById('propSearch').value.toLowerCase();
  renderPropList(allProperties.filter(function(p){
    return p.displayName.toLowerCase().includes(q)||p.propertyId.toLowerCase().includes(q)||(p.accountName||'').toLowerCase().includes(q);
  }));
}

function selectProp(id, name) {
  selectedPropId = id;
  document.getElementById('propValue').value = id;
  var t = document.getElementById('propSelectedText');
  t.textContent = name; t.classList.remove('site-selected-placeholder');
  document.getElementById('propDropdown').classList.remove('open');
  loadKeyEvents();
  loadLLMKeyEvents();
  loadUTMKeyEvents();
}

function togglePropDD() { document.getElementById('propDropdown').classList.toggle('open'); }

// =============================================
// TAB ARROW SCROLL
// =============================================
function scrollTabs(dir) {
  var strip = document.getElementById('tabStrip');
  strip.scrollLeft += dir * 80;
  setTimeout(updateTabArrows, 120);
}

function updateTabArrows() {
  var strip = document.getElementById('tabStrip');
  var left  = document.getElementById('tabArrowLeft');
  var right = document.getElementById('tabArrowRight');
  if (!strip || !left || !right) return;
  left.disabled  = strip.scrollLeft <= 0;
  right.disabled = strip.scrollLeft >= strip.scrollWidth - strip.clientWidth - 1;
}

// =============================================
// TAB SWITCHING
// =============================================
var TAB_SECTIONS = {
  traffic:'trafficSection', audience:'audienceSection',
  pages:'pagesSection', events:'eventsSection', ecommerce:'ecommerceSection',
  llm:'llmSection', utm:'utmSection'
};
function switchTab(tab) {
  Object.values(TAB_SECTIONS).forEach(function(id){ document.getElementById(id).style.display='none'; });
  document.getElementById(TAB_SECTIONS[tab]).style.display='';
  // Scroll active tab label into view
  var checked = document.querySelector('input[name="ga4Mode"][value="'+tab+'"]');
  if (checked) {
    var lbl = checked.nextElementSibling;
    if (lbl) lbl.scrollIntoView({behavior:'smooth', block:'nearest', inline:'nearest'});
  }
  setTimeout(updateTabArrows, 150);
}

// =============================================
// DATE RANGE
// =============================================
function handleDateMode(prefix) {
  var mode = document.getElementById(prefix+'_dateMode').value;
  document.getElementById(prefix+'_customDate').style.display  = mode==='custom_date'  ? '' : 'none';
  document.getElementById(prefix+'_customMonth').style.display = mode==='custom_month' ? '' : 'none';
  updatePreview(prefix);
}

function updatePreview(prefix) {
  var dr = resolveDateRange(prefix);
  var el = document.getElementById(prefix+'_preview');
  if (!el) return;
  if (!dr) { el.textContent=''; return; }
  if (dr.months) {
    var isCompare = document.getElementById(prefix+'_compare') && document.getElementById(prefix+'_compare').checked;
    if (isCompare && dr.months.length === 2) {
      el.textContent = '📅 MoM Compare: '+dr.months[0].label+' vs '+dr.months[1].label;
    } else {
      el.textContent = '📅 MoM: '+dr.months.length+' months ('+dr.months[0].label+' → '+dr.months[dr.months.length-1].label+')';
    }
  } else {
    el.textContent = 'Range: '+dr.startDate+' → '+dr.endDate;
  }
}

function resolveDateRange(prefix) {
  var mode = document.getElementById(prefix+'_dateMode').value;
  var today = new Date();
  var fmt = function(d){ return d.toISOString().slice(0,10); };
  var ago  = function(n){ var d=new Date(today); d.setDate(d.getDate()-n); return d; };
  var agoM = function(n){ var d=new Date(today); d.setMonth(d.getMonth()-n); return d; };
  var map = {
    last_7:{startDate:fmt(ago(7)),endDate:fmt(ago(1))},
    last_28:{startDate:fmt(ago(28)),endDate:fmt(ago(1))},
    last_30:{startDate:fmt(ago(30)),endDate:fmt(ago(1))},
    last_90:{startDate:fmt(ago(90)),endDate:fmt(ago(1))},
    last_6m:{startDate:fmt(agoM(6)),endDate:fmt(ago(1))},
    last_12m:{startDate:fmt(agoM(12)),endDate:fmt(ago(1))}};
  if (map[mode]) return map[mode];
  if (mode==='custom_date') {
    var s=(document.getElementById(prefix+'_startDate')||{}).value;
    var e=(document.getElementById(prefix+'_endDate')||{}).value||fmt(ago(1));
    return s?{startDate:s,endDate:e}:null;
  }
  if (mode==='custom_month') {
    var sm=(document.getElementById(prefix+'_startMonth')||{}).value;
    var em=(document.getElementById(prefix+'_endMonth')||{}).value;
    if (!sm) return null;
    // Multi-month range → return months array for MoM
    if (em && em !== sm) {
      var compare = document.getElementById(prefix+'_compare') && document.getElementById(prefix+'_compare').checked;
      var months = _expandMonthRange_(sm, em, compare);
      return months.length > 0 ? { months: months } : null;
    }
    // Single month
    var parts=sm.split('-').map(Number), sy=parts[0], smo=parts[1];
    var MNAMES=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return {
      startDate: fmt(new Date(sy,smo-1,1)),
      endDate:   fmt(new Date(sy,smo,0)),
      label:     MNAMES[smo-1]+' '+sy
    };
  }
  return null;
}

function _expandMonthRange_(startYm, endYm, compareOnlyStartEnd) {
  var MNAMES=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var fmt = function(d){ return d.toISOString().slice(0,10); };
  var sp=startYm.split('-').map(Number), y=sp[0], m=sp[1];
  var ep=endYm.split('-').map(Number),   ey=ep[0], em=ep[1];
  var result=[];
  if (compareOnlyStartEnd) {
    result.push({
      startDate: fmt(new Date(y,m-1,1)),
      endDate:   fmt(new Date(y,m,0)),
      label:     MNAMES[m-1]+' '+y
    });
    result.push({
      startDate: fmt(new Date(ey,em-1,1)),
      endDate:   fmt(new Date(ey,em,0)),
      label:     MNAMES[em-1]+' '+ey
    });
  } else {
    while (y<ey||(y===ey&&m<=em)) {
      result.push({
        startDate: fmt(new Date(y,m-1,1)),
        endDate:   fmt(new Date(y,m,0)),
        label:     MNAMES[m-1]+' '+y
      });
      m++; if(m>12){m=1;y++;}
    }
  }
  return result;
}

// =============================================
// ACCORDION
// =============================================
function toggleAccordion(contentId, headerId) {
  document.getElementById(contentId).classList.toggle('open');
  if (headerId) document.getElementById(headerId).classList.toggle('open');
}

function toggleAllModalMetrics(checked) {
  var checkboxes = document.querySelectorAll('input[name="modalMetric"]');
  checkboxes.forEach(function(cb) {
    if (!cb.disabled) {
      cb.checked = checked;
    }
  });
}

function toggleAllModalKE(checked) {
  var keInputName = currentMetricsTab === 'traffic' ? 'trKEMetric' : (currentMetricsTab === 'audience' ? 'auKEMetric' : 'pgKEMetric');
  var checkboxes = document.querySelectorAll('input[name="' + keInputName + '"]');
  checkboxes.forEach(function(cb) {
    cb.checked = checked;
  });
}

// =============================================
// METRICS MODAL
// =============================================
function openMetricsModal(tab) {
  currentMetricsTab = tab;
  var config = METRICS_CONFIG[tab]; if (!config) return;
  var titles = {traffic:'Traffic',audience:'Audience',pages:'Pages',ecommerce:'Ecommerce',utm:'UTM'};
  document.getElementById('metricsModalTitle').textContent = 'Select Metrics — ' + (titles[tab]||tab);
  var active = activeMetrics[tab]||[];

  // For UTM: determine which metrics are incompatible based on currently checked dims
  var utmExtendedDims = ['googleAdsKeyword','sessionCampaignId','sessionManualAdContent','sessionManualTerm'];
  var utmRestrictedMetrics = ['bounceRate','engagementRate','averageSessionDuration','engagedSessions','sessionsPerUser','newUsers'];
  var hasExtendedDim = false;
  if (tab === 'utm') {
    var checkedDims = [].map(function(c){return c.value;});
    hasExtendedDim = checkedDims.some(function(d){ return utmExtendedDims.indexOf(d) !== -1; });
  }

  var metricsHtml = config.map(function(m){
    var disabled = tab==='utm' && (
      m.v === 'newUsers' ||
      (hasExtendedDim && utmRestrictedMetrics.indexOf(m.v) !== -1)
    );
    var hint = disabled ? (m.v==='newUsers' ? '(incompatible with UTM)' : '(needs basic dims only)') : '';
    return '<label class="checkbox-wrap'+(disabled?' metric-disabled':'')+'" style="padding:6px;"'+(disabled?' title="'+hint+'"':'')+' >'
      +'<input type="checkbox" name="modalMetric" value="'+m.v+'"'+(active.includes(m.v)&&!disabled?' checked':'')+(disabled?' disabled':'')+' >'
      +'<span>'+m.l+(disabled?' <span style="font-size:10px;color:#aaa;">(N/A)</span>':'')+'</span></label>';
  }).join('');

  // For Traffic, Audience or Pages: append Key Events section
  if (tab === 'traffic' || tab === 'audience' || tab === 'pages') {
    var keInputName = tab === 'traffic' ? 'trKEMetric' : (tab === 'audience' ? 'auKEMetric' : 'pgKEMetric');
    var keSelected  = tab === 'traffic' ? trafficKeyEvents : (tab === 'audience' ? audienceKeyEvents : pagesKeyEvents);
    metricsHtml += '<div style="grid-column:1/-1;margin-top:12px;padding-top:10px;border-top:1px solid #e0e0e0;">'
      + '<div style="font-size:11px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">'
      + 'Key Events <span style="font-size:10px;font-weight:400;color:#888;text-transform:none;">(as extra columns)</span></div>';

    if (!keyEventsLoaded || !keyEventsLoaded.length) {
      metricsHtml += '<div style="font-size:11px;color:#999;padding:4px 0;">Select a property first to load key events.</div>';
    } else {
      metricsHtml += '<div style="display:flex;gap:12px;margin-bottom:6px;font-size:11px;padding:0 2px;">'
        + '<a href="javascript:void(0)" onclick="toggleAllModalKE(true)" style="color:#000;text-decoration:underline;font-weight:500;">Select All</a>'
        + '<a href="javascript:void(0)" onclick="toggleAllModalKE(false)" style="color:#555;text-decoration:underline;font-weight:500;">Clear All</a>'
        + '</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;">'
        + keyEventsLoaded.map(function(ev) {
            var isSelected = keSelected.indexOf(ev) !== -1;
            return '<label class="checkbox-wrap" style="padding:5px 4px;">'
              +'<input type="checkbox" name="'+keInputName+'" value="'+esc(ev)+'"'+(isSelected?' checked':'')+'>'
              +'<span style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="'+esc(ev)+'">'+esc(ev)+'</span>'
              +'</label>';
          }).join('')
        + '</div>';
    }
    metricsHtml += '</div>';
  }

  document.getElementById('metricsModalGrid').innerHTML = metricsHtml;
  document.getElementById('metricsModal').classList.add('open');
}

function confirmMetrics() {
  var checked=[].map(function(c){return c.value;});
  if (!checked.length){alert('Select at least one metric.');return;}
  activeMetrics[currentMetricsTab]=checked;
  // Capture key events separately for traffic, audience and pages
  if (currentMetricsTab === 'traffic') {
    trafficKeyEvents = [].map(function(c){return c.value;});
  }
  if (currentMetricsTab === 'audience') {
    audienceKeyEvents = [].map(function(c){return c.value;});
  }
  if (currentMetricsTab === 'pages') {
    pagesKeyEvents = [].map(function(c){return c.value;});
  }
  updateMetricsBadge(currentMetricsTab);
  closeModal('metricsModal');
}

function resetMetrics(tab) {
  activeMetrics[tab]=METRICS_CONFIG[tab].filter(function(m){return m.def;}).map(function(m){return m.v;});
  if (tab === 'traffic') trafficKeyEvents = [];
  if (tab === 'audience') audienceKeyEvents = [];
  if (tab === 'pages') pagesKeyEvents = [];
  updateMetricsBadge(tab);
}

function updateMetricsBadge(tab) {
  // No-op — badge display removed per user request
}

// =============================================
// PAGE FILTER MODAL
// =============================================
function openPageModal() {
  document.getElementById('pageModalInput').value=pageFilterPages.join('\n');
  updatePageCounter();
  document.getElementById('pageModal').classList.add('open');
  setTimeout(function(){document.getElementById('pageModalInput').focus();},50);
}

function updatePageCounter() {
  var lines=document.getElementById('pageModalInput').value.split('\n').map(function(l){return l.trim();}).filter(Boolean);
  document.getElementById('pageModalCounter').textContent=lines.length+' page'+(lines.length!==1?'s':'');
}

function confirmPages() {
  pageFilterPages=document.getElementById('pageModalInput').value.split('\n').map(function(l){return l.trim();}).filter(Boolean);
  var disp=document.getElementById('pg_pageDisplay');
  var cnt=document.getElementById('pg_pageCount');
  if (pageFilterPages.length){
    cnt.textContent=pageFilterPages.length+' page'+(pageFilterPages.length!==1?'s':'')+' added';
    disp.style.display='block';
  } else { disp.style.display='none'; }
  closeModal('pageModal');
}

// =============================================
// KEY EVENTS — dynamic, loaded from property
// =============================================
function loadKeyEvents() {
  if (!selectedPropId) return;
  var container=document.getElementById('ev_keList');
  container.innerHTML='<div class="ke-loading">Loading key events</div>';
  google.script.run
    .withSuccessHandler(function(events){
      keyEventsLoaded=events||[];
      if (!keyEventsLoaded.length){ container.innerHTML='<div class="ke-loading">No key events found for this property.</div>'; return; }
      container.innerHTML=
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'
        +'<span style="font-size:11px;color:var(--text-sub);">'+keyEventsLoaded.length+' found</span>'
        +'<button class="btn-small" onclick="toggleAllKE()" style="font-size:10px;padding:2px 7px;">Toggle All</button>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;">'
        +keyEventsLoaded.map(function(ev){
          return '<label class="checkbox-wrap" style="padding:5px 4px;">'
            +'<input type="checkbox" class="ke-cb" value="'+esc(ev)+'" checked>'
            +'<span title="'+esc(ev)+'" style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(ev)+'</span>'
            +'</label>';
        }).join('')+'</div>';
    })
    .withFailureHandler(function(e){ container.innerHTML='<div style="font-size:11px;color:red;">'+(e.message||e)+'</div>'; })
    .getGA4KeyEventsForSidebar(selectedPropId);
}

function loadUTMKeyEvents() {
  if (!selectedPropId) return;
  var container = document.getElementById('utm_keList');
  container.innerHTML = '<div class="ke-loading">Loading key events</div>';
  google.script.run
    .withSuccessHandler(function(events) {
      if (!events || !events.length) { container.innerHTML='<div class="ke-loading">No key events found.</div>'; return; }
      container.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'
        +'<span style="font-size:11px;color:var(--text-sub);">'+events.length+' found — shown as columns</span>'
        +'<button class="btn-small" onclick="toggleAllUTMKE()" style="font-size:10px;padding:2px 7px;">Toggle All</button>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;">'
        +events.map(function(ev){
          return '<label class="checkbox-wrap" style="padding:5px 4px;">'
            +'<input type="checkbox" class="utm-ke-cb" value="'+esc(ev)+'" checked>'
            +'<span title="'+esc(ev)+'" style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(ev)+'</span>'
            +'</label>';
        }).join('')+'</div>';
    })
    .withFailureHandler(function(e){ container.innerHTML='<div style="font-size:11px;color:red;">'+(e.message||e)+'</div>'; })
    .getGA4KeyEventsForSidebar(selectedPropId);
}

function toggleAllKE() {
  var boxes=document.querySelectorAll('.ke-cb');
  var any=boxes.some(function(b){return b.checked;});
  boxes.forEach(function(b){b.checked=!any;});
}

function toggleAllUTMKE() {
  var boxes=document.querySelectorAll('.utm-ke-cb');
  var any=boxes.some(function(b){return b.checked;});
  boxes.forEach(function(b){b.checked=!any;});
}

function handleEvType() {
  document.getElementById('ev_keSection').style.display=
    document.getElementById('ev_type').value==='key'?'':'none';
}

// =============================================
// FETCH RUNNERS
// =============================================
function runFetch(tab) {
  if (!selectedPropId) return alert('Select a GA4 property first.');
  var pfxMap={traffic:'tr',audience:'au',pages:'pg',events:'ev',ecommerce:'ec',llm:'llm',utm:'utm'};
  var prefix=pfxMap[tab];
  var dr=resolveDateRange(prefix);
  if (!dr) return alert('Select a valid date range.');

  var isMoM = dr.months && dr.months.length > 0;
  var params = { propertyId: selectedPropId };
  if (isMoM) { params.months = dr.months; }
  else        { params.dateRange = dr; }

  if (tab==='traffic') {
    params.metrics=[activeMetrics.traffic];
    params.dimensions=[].map(function(c){return c.value;});
    params.dailyBreakdown=document.getElementById('tr_daily').checked;
    params.channel=document.getElementById('tr_channel').value;
    params.country=document.getElementById('tr_country').value.trim();
    params.keyEvents=trafficKeyEvents;
    params.sheetName=document.getElementById('tr_sheet').value.trim()||'GA4 Traffic';

  } else if (tab==='audience') {
    params.metrics=[activeMetrics.audience];
    params.dimension=document.getElementById('au_dimension').value;
    params.dailyBreakdown=document.getElementById('au_daily').checked;
    params.channel=document.getElementById('au_channel').value;
    params.country=document.getElementById('au_country').value.trim();
    params.keyEvents=audienceKeyEvents;
    params.sheetName=document.getElementById('au_sheet').value.trim()||'GA4 Audience';

  } else if (tab==='pages') {
    params.metrics=[activeMetrics.pages];
    params.dimension=document.getElementById('pg_dimension').value;
    params.dailyBreakdown=document.getElementById('pg_daily').checked;
    params.pageFilter=pageFilterPages;
    params.limit=parseInt(document.getElementById('pg_limit').value,10);
    params.channel=document.getElementById('pg_channel').value;
    params.country=document.getElementById('pg_country').value.trim();
    params.keyEvents=pagesKeyEvents;
    params.sheetName=document.getElementById('pg_sheet').value.trim()||'GA4 Pages';

  } else if (tab==='events') {
    var evType=document.getElementById('ev_type').value;
    params.eventType=evType;
    params.dailyBreakdown=document.getElementById('ev_daily').checked;
    params.channel=document.getElementById('ev_channel').value;
    params.country=document.getElementById('ev_country').value.trim();
    if (evType==='key') {
      params.eventNames=[].map(function(c){return c.value;});
      if (!params.eventNames.length) return alert('Select at least one key event.');
    }
    params.dimension=document.getElementById('ev_dim').value;
    params.sheetName=document.getElementById('ev_sheet').value.trim()||'GA4 Events';

  } else if (tab==='ecommerce') {
    params.metrics=[activeMetrics.ecommerce];
    params.dimension=document.getElementById('ec_dim').value;
    params.dailyBreakdown=document.getElementById('ec_daily').checked;
    params.channel=document.getElementById('ec_channel').value;
    params.country=document.getElementById('ec_country').value.trim();
    params.sheetName=document.getElementById('ec_sheet').value.trim()||'GA4 Ecommerce';

  } else if (tab==='utm') {
    params.metrics=[activeMetrics.utm];
    params.dimensions=[].map(function(c){return c.value;});
    if (!params.dimensions.length) return alert('Select at least one UTM parameter.');
    params.dailyBreakdown=document.getElementById('utm_daily').checked;
    params.keyEvents=[].map(function(c){return c.value;});
    params.campaignFilter=document.getElementById('utm_campaignFilter').value.trim();
    params.sourceFilter=document.getElementById('utm_sourceFilter').value.trim();
    params.mediumFilter=document.getElementById('utm_mediumFilter').value.trim();
    params.limit=parseInt(document.getElementById('utm_limit').value,10);
    params.sheetName=document.getElementById('utm_sheet').value.trim()||'GA4 UTM';
  }

  if (tab!=='events' && tab!=='llm' && (!params.metrics||!params.metrics.length)) return alert('Select at least one metric.');

  // UI
  var btn=document.getElementById(prefix+'_btn');
  var prog=document.getElementById(prefix+'_prog');
  var status=document.getElementById(prefix+'_status');
  var progTxt=document.getElementById(prefix+'_progText');
  btn.disabled=true; prog.style.display='block'; status.innerHTML='';

  if (elapsedTimers[prefix]) clearInterval(elapsedTimers[prefix]);
  var start=Date.now();
  elapsedTimers[prefix]=setInterval(function(){
    var s=Math.floor((Date.now()-start)/1000), m=Math.floor(s/60), sec=s%60;
    progTxt.textContent=(isMoM?'Fetching MoM':'Fetching')+' — '+(m>0?m+'m ':'')+sec+'s elapsed';
  },1000);

  var fnName = isMoM
    ? 'fetchGA4MoMData'
    : { traffic:'fetchGA4TrafficData', audience:'fetchGA4AudienceData',
        pages:'fetchGA4PagesData', events:'fetchGA4EventsData',
        ecommerce:'fetchGA4EcommerceData', llm:'fetchGA4LLMData',
        utm:'fetchGA4UTMData' }[tab];

  if (isMoM) params.tab = tab;

  google.script.run
    .withSuccessHandler(function(msg){
      clearInterval(elapsedTimers[prefix]); btn.disabled=false; prog.style.display='none';
      status.innerHTML='<p style="color:green;margin:0;">'+msg.replace(/\n/g,'<br>')+'</p>';
    })
    .withFailureHandler(function(e){
      clearInterval(elapsedTimers[prefix]); btn.disabled=false; prog.style.display='none';
      status.innerHTML='<p style="color:red;margin:0;">'+(e.message||e)+'</p>';
    })
    [fnName](params);
}

// =============================================
// LLM TAB
// =============================================
function updateLLMSheetPreview() {
  var name = document.getElementById('llm_sheet').value.trim() || 'GA4 LLM Traffic';
  var sp = document.getElementById('llm_sessSheetPreview');
  var ep = document.getElementById('llm_evSheetPreview');
  if (sp) sp.textContent = name;
  if (ep) ep.textContent = name + ' - Events';
}

function handleLLMFetchType() {
  var val = document.getElementById('llm_fetchType').value;
  document.getElementById('llm_keSection').style.display = val==='sessions' ? 'none' : '';
}

function toggleAllLLMSrc() {
  var boxes=document.querySelectorAll('.llm-src');
  var any=boxes.some(function(b){return b.checked;});
  boxes.forEach(function(b){b.checked=!any;});
}

function loadLLMKeyEvents() {
  if (!selectedPropId) return;
  var container=document.getElementById('llm_keList');
  container.innerHTML='<div class="ke-loading">Loading key events</div>';
  google.script.run
    .withSuccessHandler(function(events){
      llmKeyEventsLoaded=events||[];
      if (!llmKeyEventsLoaded.length){ container.innerHTML='<div class="ke-loading">No key events found.</div>'; return; }
      container.innerHTML=
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'
        +'<span style="font-size:11px;color:var(--text-sub);">'+llmKeyEventsLoaded.length+' found</span>'
        +'<button class="btn-small" onclick="toggleAllLLMKE()" style="font-size:10px;padding:2px 7px;">Toggle All</button>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;">'
        +llmKeyEventsLoaded.map(function(ev){
          return '<label class="checkbox-wrap" style="padding:5px 4px;">'
            +'<input type="checkbox" class="llm-ke-cb" value="'+esc(ev)+'" checked>'
            +'<span title="'+esc(ev)+'" style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(ev)+'</span>'
            +'</label>';
        }).join('')+'</div>';
    })
    .withFailureHandler(function(e){ container.innerHTML='<div style="font-size:11px;color:red;">'+(e.message||e)+'</div>'; })
    .getGA4KeyEventsForSidebar(selectedPropId);
}

function toggleAllLLMKE() {
  var boxes=document.querySelectorAll('.llm-ke-cb');
  var any=boxes.some(function(b){return b.checked;});
  boxes.forEach(function(b){b.checked=!any;});
}

function runLLMFetch() {
  if (!selectedPropId) return alert('Select a GA4 property first.');
  var dr=resolveDateRange('llm');
  if (!dr) return alert('Select a valid date range.');

  var sources=[].map(function(c){return c.value;});
  var customSrc=document.getElementById('llm_customSrc').value.trim();
  if (customSrc) customSrc.split(',').map(function(s){return s.trim();}).filter(Boolean).forEach(function(s){sources.push(s);});
  if (!sources.length) return alert('Select at least one LLM source.');

  var fetchType=document.getElementById('llm_fetchType').value;
  var keyEvents=[];
  if (fetchType!=='sessions') {
    keyEvents=[].map(function(c){return c.value;});
    if (!keyEvents.length && fetchType==='events') return alert('Select at least one key event.');
  }

  var isMoM = dr.months && dr.months.length > 0;
  var params = {
    propertyId:         selectedPropId,
    tab:                'llm',
    sources:            sources,
    fetchType:          fetchType,
    keyEvents:          keyEvents,
    dailyBreakdown:     document.getElementById('llm_daily').checked,
    includeLandingPage: document.getElementById('llm_landing').checked,
    sheetName:          document.getElementById('llm_sheet').value.trim()||'GA4 LLM Traffic'
  };
  if (isMoM) { params.months = dr.months; }
  else        { params.dateRange = dr; }

  var btn=document.getElementById('llm_btn');
  var prog=document.getElementById('llm_prog');
  var status=document.getElementById('llm_status');
  var progTxt=document.getElementById('llm_progText');
  btn.disabled=true; prog.style.display='block'; status.innerHTML='';

  if (elapsedTimers['llm']) clearInterval(elapsedTimers['llm']);
  var start=Date.now();
  elapsedTimers['llm']=setInterval(function(){
    var s=Math.floor((Date.now()-start)/1000), m=Math.floor(s/60), sec=s%60;
    progTxt.textContent=(isMoM?'Fetching MoM — ':'Fetching — ')+(m>0?m+'m ':'')+sec+'s elapsed';
  },1000);

  var fnName = isMoM ? 'fetchGA4MoMData' : 'fetchGA4LLMData';

  google.script.run
    .withSuccessHandler(function(msg){
      clearInterval(elapsedTimers['llm']); btn.disabled=false; prog.style.display='none';
      status.innerHTML='<p style="color:green;margin:0;">'+msg.replace(/\n/g,'<br>')+'</p>';
    })
    .withFailureHandler(function(e){
      clearInterval(elapsedTimers['llm']); btn.disabled=false; prog.style.display='none';
      status.innerHTML='<p style="color:red;margin:0;">'+(e.message||e)+'</p>';
    })
    [fnName](params);
}

// =============================================
// MODAL HELPERS
// =============================================
function closeModal(id){ document.getElementById(id).classList.remove('open'); }
function handleOverlayClick(e,id){ if(e.target===document.getElementById(id)) closeModal(id); }

// =============================================
// UTIL
// =============================================
function esc(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

