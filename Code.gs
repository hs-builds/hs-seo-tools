function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("HS SEO Tool")
    .addItem("GA4", "showGA4Sidebar")
    .addItem("GSC", "showGscSidebar")
    .addToUi();
}

function showGA4Sidebar() {
  // FIXED: Now loads the 'ComingSoon' HTML file instead of calling a missing function
  const html = HtmlService.createHtmlOutputFromFile("ComingSoon")
    .setTitle("GA4 Organic Data")
    .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

function showGscSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("UI")
    .setTitle("GSC Data Exporter");
  SpreadsheetApp.getUi().showSidebar(html);
}

