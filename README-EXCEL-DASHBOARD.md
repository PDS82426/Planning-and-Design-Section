# PDS manual Excel upload dashboard

## What this adds
- `excel-dashboard.html`, `excel-dashboard.css`, and `excel-dashboard.js` provide a browser-side viewer for the FY2027 monitoring workbook.
- The viewer defaults to the `2027 NEP` worksheet and header row 6, matching the uploaded workbook's layout.
- It displays summary cards, search, a procurement-status filter, and project rows.
- The workbook is parsed in the user's browser. This code does not upload the workbook or write the workbook's rows into the repository.
- `index.html` includes a link to open the Excel upload dashboard.

## Manual workflow
1. Open the deployed PDS website.
2. Choose **Open Excel Upload Dashboard**.
3. Select the latest authorized copy of `FY2027_NEP Monitoring (8).xlsx`.
4. Confirm worksheet `2027 NEP` and header row `6`, then choose **Load dashboard**.
5. When the Excel workbook changes, upload the latest copy again.

## Privacy and security limits
- This is a manual upload workflow. It does not automatically sync with OneDrive.
- The page is static and is not itself staff-only. It contains no workbook data by default; a user must have an authorized copy of the workbook to view its records. Use a trusted device and do not leave the workbook open on a shared computer.
- Do not commit the original workbook, exported CSV/JSON files, screenshots containing project data, or secrets to a public GitHub repository.
- Remove the old `monitoring-data.js` from the repository if it is present there; it contained hardcoded example monitoring assignments and is not needed by this package.
- This page loads the SheetJS browser library from jsDelivr. Workbook contents are processed locally in the browser; as with any third-party CDN dependency, the library code itself is fetched from the CDN. For stricter environments, host a reviewed copy of the library as a public code asset or have IT approve the dependency.
- The original site's Supabase authentication and database policies were not audited or changed by this addition. Confirm that any Supabase tables use appropriate Row Level Security (RLS) before treating the original app as private.
- `noindex` is a crawler hint, not access control.

## Deploying to the existing repository
1. Back up the current repository before replacing files.
2. Copy the new `excel-dashboard.html`, `excel-dashboard.css`, `excel-dashboard.js`, and `README-EXCEL-DASHBOARD.md` into the repository root.
3. Replace `index.html` with the updated version from this package, or manually add the **OPEN EXCEL UPLOAD DASHBOARD** link from that file to the existing Project Monitoring toolbar.
4. Delete `monitoring-data.js` from the public repository if present and verify it no longer loads or contains information.
5. Check the repository and published site for committed workbook copies, generated data files, credentials, and other confidential project details. Removing a file from the latest commit does not erase prior Git history.
6. Commit and push the reviewed changes. GitHub Pages will deploy the static files.

## Known limitations
- This viewer is read-only; edits must be made in Excel, then the latest workbook uploaded again.
- It does not authenticate staff, write back to Excel, or connect to OneDrive.
- The `ALLOCATION`/`ALLOCATION1`/`ALLOCATION43` fields vary across worksheets; verify the correct allocation column for your reporting purpose.
