# COW PMR Findings Tracker

Regional managers can use the region filter views on the PMR Issues sheet immediately. Each finding has a unique number in column A. Update Mitigation Plan Date, Action taken/Plan, and Status in columns G–I. Preserve the finding number when sorting or editing.

## Web tracker

The Apps Script web tracker reads the live PMR Issues tab. It shows finding and unique COW counts for the current filters, and updates columns G–I by finding number. Blank status displays as Open. Web edits require a plan before closure and check for changes made since the finding was loaded.

1. Create a standalone project in Google Apps Script. Copy `Code.gs` into the script file and `Index.html` into an HTML file named `Index`.
2. In Project Settings → Script Properties, add `PMR_SPREADSHEET_ID`. Use the ID between `/d/` and `/edit` in the source spreadsheet URL.
3. Choose Deploy → New deployment → Web app. Set **Execute as** to **User accessing the web app** and select the signed-in audience appropriate for your organization.
4. Test the deployment with a manager who already has Editor access to the spreadsheet. Send the deployment URL to the managers after verification.

Google Sheets permissions govern access. Region filters help managers find their rows. Editors with access to the whole sheet can edit findings in any region. Keep PMR data and spreadsheet IDs out of this public repository.
