function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("HS SEO Tool")
    .addItem("GA4", "showGA4Sidebar")
    .addItem("GSC", "showGscSidebar")
    .addSeparator()
    .addItem("Page Size Checker", "showSizeCheckerSidebar")
    .addToUi();
}

function showGA4Sidebar() {
  const html = HtmlService.createHtmlOutputFromFile("GA4")
    .setTitle("GA4 Data");
  SpreadsheetApp.getUi().showSidebar(html);
}

function showGscSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("UI")
    .setTitle("GSC Data Exporter");
  SpreadsheetApp.getUi().showSidebar(html);
}

function showSizeCheckerSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("SizeChecker")
    .setTitle("Bulk Page Size Checker");
  SpreadsheetApp.getUi().showSidebar(html);
}