# COW PMR Findings Tracker

The GitHub Pages app uses Supabase Auth and the PMR tables in the existing project. Regional users sign in with an existing email/password account. The database limits reads and updates to regions assigned in `pmr_region_members`. Editors can update the mitigation date, action plan and status.

## Regional access

An administrator adds one membership row per user and region using the verified Supabase Auth user ID. Nationwide access uses four assignments. The page does not offer public registration or self-assignments.

## Findings

The app reads `pmr_findings` from Supabase. Source findings must be approved for import before loading them. Import by stable finding ID and preserve existing mitigation updates if importing again. The GitHub repository contains application code, with no findings or user assignments.

The hexagon shows Gen, DC, HVAC, AC, FACP and SACP for the selected region or all assigned regions. Other and NA entries remain in the register. A finding in multiple dimensions contributes once to the issue total.

The legacy Apps Script files remain available for the spreadsheet workflow.
