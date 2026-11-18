const TAB = 'PMR Issues';
const HEADERS = ['#', 'Site ID', 'Region', 'Issue date', 'Issue Description', 'Owner [ACES/stc]', 'Mitigation Plan Date', 'Action taken/Plan', 'Status'];
const STATUSES = ['Open', 'In Progress', 'Pending stc', 'Pending ACES', 'Closed'];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('COW PMR Findings Tracker');
}

function sheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('PMR_SPREADSHEET_ID');
  if (!id) throw new Error('The administrator must configure PMR_SPREADSHEET_ID.');
  const sheet = SpreadsheetApp.openById(id).getSheetByName(TAB);
  if (!sheet || JSON.stringify(sheet.getRange(1, 1, 1, HEADERS.length).getDisplayValues()[0]) !== JSON.stringify(HEADERS)) {
    throw new Error('The PMR Issues tab or its column headers have changed.');
  }
  return sheet;
}

function listFindings() {
  const sheet = sheet_();
  const count = sheet.getLastRow() - 1;
  const rows = count > 0 ? sheet.getRange(2, 1, count, HEADERS.length).getDisplayValues() : [];
  return { statuses: STATUSES, rows: rows.filter(row => row[0] && row[1]) };
}

function updateFinding(input) {
  const lock = LockService.getScriptLock();
  lock.waitLock(12000);
  try {
    const sheet = sheet_();
    const id = String(input.id || '');
    if (!id || sheet.getLastRow() < 2) throw new Error('Finding not found.');
    const matches = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).createTextFinder(id)
      .matchEntireCell(true).findAll();
    if (matches.length !== 1) throw new Error('The finding number must exist and be unique.');
    const row = matches[0].getRow();
    const record = sheet.getRange(row, 1, 1, HEADERS.length);
    const current = record.getDisplayValues()[0];
    if (JSON.stringify(current) !== JSON.stringify(input.expected)) {
      throw new Error('This finding changed. Reload the tracker before editing it again.');
    }

    const dateText = String(input.date || '').trim();
    const plan = String(input.plan || '').trim();
    const status = String(input.status || '');
    if (!STATUSES.includes(status) || plan.length > 5000) throw new Error('Check the status and action plan length.');
    if (status === 'Closed' && !plan) throw new Error('Enter the action taken before closing the finding.');
    const timezone = sheet.getParent().getSpreadsheetTimeZone();
    let date = '';
    if (dateText) {
      if (!/^\d{2}-\d{2}-\d{4}$/.test(dateText)) throw new Error('Use DD-MM-YYYY for the mitigation date.');
      date = Utilities.parseDate(dateText, timezone, 'dd-MM-yyyy');
      if (Utilities.formatDate(date, timezone, 'dd-MM-yyyy') !== dateText) throw new Error('Enter a valid mitigation date.');
    }
    sheet.getRange(row, 7).setNumberFormat('dd-mm-yyyy');
    sheet.getRange(row, 7, 1, 3).setValues([[date, /^[=+\-@]/.test(plan) ? "'" + plan : plan, status]]);
    SpreadsheetApp.flush();
    return record.getDisplayValues()[0];
  } finally {
    lock.releaseLock();
  }
}
