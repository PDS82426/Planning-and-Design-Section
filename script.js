/* =========================================================
   PDS CONTROL DESK — script.js (single clean version)
   Planning & Design Section · DPWH
========================================================= */
(function () {
"use strict";

/* ---------------------------------------------------------
   CONFIG
--------------------------------------------------------- */
const CONFIG = {
    SUPABASE_URL: "https://zvwghoabsqfyakbqzhil.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_oJ3Zc3TplfYgePQEmTrJ8Q_qycxR0jQ",

    // Supabase table / bucket names (adjust if yours differ)
    TABLE_PROFILES: "profiles",
    TABLE_PROJECTS: "projects",
    TABLE_DOCUMENTS: "documents",
    BUCKET_DOCUMENTS: "documents",
    AI_FUNCTION: "pds-ai",

    // Microsoft / OneDrive (leave client ID empty to disable)
    MS_CLIENT_ID: "PASTE-YOUR-MICROSOFT-CLIENT-ID-HERE",
    MS_AUTHORITY: "https://login.microsoftonline.com/consumers/",
    MS_SCOPES: ["User.Read", "Files.ReadWrite"],
    MS_SCRIPT: "https://alcdn.msauth.net/browser/2.38.2/js/msal-browser.min.js",
    GRAPH: "https://graph.microsoft.com/v1.0",
    WORKBOOK_NAME: "trial for website.xlsx",
    SHEET_NAME: "OVERALL"
};

/* Header aliases for the OVERALL sheet (upper-case) */
const COLS = {
    title: ["PROJECT TITLE AS PER GAA", "PROJECT TITLE"],
    municipality: ["MUNICIPALITY"],
    allocation: ["ALLOCATION"],
    program: ["PROGRAM"],
    plan: ["PLAN"],
    contractId: ["CONTRACT ID"],
    remarks: ["REMARKS"],
    status: ["OVERALL STATUS", "STATUS"],
    assigned: ["ASSIGNED TO", "ASSIGNED", "PDS IN CHARGE", "ENGINEER", "PROJECT ENGINEER", "IN CHARGE"]
};
const EDITABLE = ["program", "plan", "status", "remarks"];
const STATUSES = ["In Progress", "Completed", "For Completion", "For Signature", "On Hold"];

/* ---------------------------------------------------------
   STATE
--------------------------------------------------------- */
let db = null;
let currentUser = null;
let currentProfile = null;
let projects = [];
let documents = [];
let monitoring = [];          // projects from Excel
let monitoringLoaded = false;
let msal = null;
let msalAccount = null;
let workbookId = null;
let sheetMeta = null;         // { headerIdx, rowOffset, colOffset, headers, formulas }

/* ---------------------------------------------------------
   HELPERS
--------------------------------------------------------- */
const $ = (id) => document.getElementById(id);
const qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));

function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmtMoney(n) {
    const x = Number(n);
    return isFinite(x) && n !== "" && n != null
        ? "₱" + x.toLocaleString("en-PH", { maximumFractionDigits: 2 }) : "—";
}
function fmtDate(v) {
    if (!v) return "—";
    const d = new Date(v);
    return isNaN(d) ? "—" : d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}
function initials(name) {
    const p = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!p.length) return "PDS";
    return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
function toast(msg, type) {
    let box = $("pdsToastContainer");
    if (!box) {
        box = document.createElement("div");
        box.id = "pdsToastContainer";
        document.body.appendChild(box);
    }
    const t = document.createElement("div");
    t.className = "pds-toast pds-toast-" + (type || "info");
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), 4500);
}
function show(el, display) { if (el) el.style.display = display || "block"; }
function hide(el) { if (el) el.style.display = "none"; }
function on(id, evt, fn) { const el = $(id); if (el) el.addEventListener(evt, fn); }
function statusClass(s) {
    const v = String(s || "").toLowerCase();
    if (/complet/.test(v)) return "completed";
    if (/hold/.test(v)) return "hold";
    if (/bid/.test(v)) return "bidding";
    if (/progress|going|ongoing/.test(v)) return "ongoing";
    return "pending";
}

/* ---------------------------------------------------------
   SUPABASE + AUTH
--------------------------------------------------------- */
function initSupabase() {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
        console.error("Supabase library failed to load.");
        return false;
    }
    db = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    return true;
}

function showSignIn() {
    show($("signInPage"), "block");
    hide($("mainApp"));
}
function showApp() {
    hide($("signInPage"));
    show($("mainApp"), "flex");
}

async function loadProfile(user) {
    currentUser = user;
    currentProfile = null;
    try {
        const { data } = await db.from(CONFIG.TABLE_PROFILES).select("*").eq("id", user.id).maybeSingle();
        currentProfile = data || null;
    } catch (e) { console.warn("Profile load failed", e); }

    const name = (currentProfile && (currentProfile.full_name || currentProfile.name)) ||
        (user.user_metadata && user.user_metadata.full_name) ||
        (user.email || "").split("@")[0] || "PDS User";
    const role = (currentProfile && currentProfile.role) || "PLANNING & DESIGN";

    const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    set("sidebarAvatar", initials(name));
    set("topAvatar", initials(name));
    set("sidebarUserName", name);
    set("sidebarUserRole", String(role).toUpperCase());
    set("profileName", name);
    set("profileEmail", user.email || "—");
}

async function enterApp(user) {
    await loadProfile(user);
    showApp();
    showPage("dashboard");
    loadProjects();
    loadDocuments();
    renderDepartmentOrders();
}

function setLoginMessage(msg, isError) {
    const el = $("loginMessage");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = isError ? "#b42318" : "";
}

async function handleLogin(e) {
    e.preventDefault();
    if (!db) return setLoginMessage("Cannot reach the server. Reload the page.", true);
    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;
    setLoginMessage("Signing in…");
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) return setLoginMessage(error.message, true);
    setLoginMessage("");
    $("loginPassword").value = "";
    // onAuthStateChange handles the rest
}

async function handleLogout() {
    try { await db.auth.signOut(); } catch (e) { console.warn(e); }
    currentUser = currentProfile = null;
    projects = []; documents = []; monitoring = []; monitoringLoaded = false;
    showSignIn();
}

async function initAuth() {
    const { data } = await db.auth.getSession();
    if (data && data.session) await enterApp(data.session.user); else showSignIn();

    // Never await Supabase calls inside this callback — defer them.
    db.auth.onAuthStateChange((event, session) => {
        setTimeout(() => {
            if (event === "SIGNED_IN" && session && (!currentUser || currentUser.id !== session.user.id)) {
                enterApp(session.user);
            } else if (event === "SIGNED_OUT") {
                showSignIn();
            }
        }, 0);
    });
}

/* ---------------------------------------------------------
   NAVIGATION
--------------------------------------------------------- */
function showPage(name) {
    let found = false;
    qsa("section.page-section").forEach((s) => {
        const match = s.dataset.section === name;
        s.classList.toggle("active", match);
        if (match) found = true;
    });
    if (!found) return showPage("dashboard");
    qsa(".nav-item[data-section]").forEach((n) => n.classList.toggle("active", n.dataset.section === name));
    try { history.replaceState(null, "", "#" + name); } catch (e) { /* ignore */ }
    window.scrollTo(0, 0);
    if (name === "monitoring" && !monitoringLoaded) loadMonitoring(false);
}

function initNavigation() {
    document.addEventListener("click", (e) => {
        const nav = e.target.closest(".nav-item[data-section]");
        if (nav) { e.preventDefault(); return showPage(nav.dataset.section); }
        const tgt = e.target.closest("[data-section-target]");
        if (tgt) { e.preventDefault(); showPage(tgt.dataset.sectionTarget); }
    });
    document.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const el = e.target.closest(".nav-item, .quick-card[data-section-target]");
        if (el && e.target === el) { e.preventDefault(); el.click(); }
    });
    window.addEventListener("hashchange", () => {
        if (currentUser) showPage(location.hash.replace("#", "") || "dashboard");
    });
}

/* ---------------------------------------------------------
   PROJECTS (Supabase)
--------------------------------------------------------- */
async function loadProjects() {
    const list = $("projectList");
    try {
        const { data, error } = await db.from(CONFIG.TABLE_PROJECTS).select("*").order("created_at", { ascending: false });
        if (error) throw error;
        projects = data || [];
    } catch (e) {
        console.error("Projects load failed", e);
        projects = [];
        if (list) list.innerHTML = '<div class="list-note">Unable to load projects.</div>';
    }
    renderProjects();
    updateStats();
}

function projName(p) { return p.title || p.name || p.project_name || "Untitled project"; }
function projLoc(p) { return p.location || p.municipality || "—"; }
function projStatus(p) { return p.status || "Pending"; }

function renderProjects() {
    const list = $("projectList");
    if (list) {
        list.innerHTML = projects.length
            ? projects.map((p, i) => `
                <div class="project-row">
                    <div><strong>${esc(projName(p))}</strong><small>${esc(p.project_no || "")}</small></div>
                    <div>${esc(projLoc(p))}</div>
                    <div><span class="status ${statusClass(projStatus(p))}">${esc(projStatus(p))}</span></div>
                    <div><button class="row-btn" type="button" data-project="${i}">VIEW</button></div>
                </div>`).join("")
            : '<div class="list-note">No projects yet.</div>';
    }
    const recent = $("dashboardRecentProjects");
    if (recent && projects.length) {
        recent.innerHTML = projects.slice(0, 4).map((p, i) => `
            <div class="pds-row">
                <div class="thumb"></div>
                <div class="info">
                    <strong>${esc(projName(p))}</strong>
                    <span>${esc(projLoc(p))}</span>
                    <span>Updated: ${esc(fmtDate(p.updated_at || p.created_at))}</span>
                </div>
                <span class="status ${statusClass(projStatus(p))}">${esc(projStatus(p))}</span>
                <button class="kebab" type="button" data-project="${i}">⋮</button>
            </div>`).join("");
    }
}

function updateStats() {
    const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    set("totalProjects", projects.length);
    set("ongoingProjects", projects.filter((p) => /progress|going/i.test(projStatus(p))).length);
    set("completedProjects", projects.filter((p) => /complet/i.test(projStatus(p))).length);
    set("totalDocuments", documents.length);
}

function openProjectModal(p) {
    const rows = Object.entries(p)
        .filter(([, v]) => v !== null && v !== "" && typeof v !== "object")
        .map(([k, v]) => `<dt>${esc(k.replace(/_/g, " ").toUpperCase())}</dt><dd>${esc(v)}</dd>`).join("");
    $("projectModalContent").innerHTML = `<dl class="detail-grid">${rows}</dl>`;
    show($("projectModal"), "flex");
}

/* ---------------------------------------------------------
   DOCUMENTS (Supabase table + storage)
--------------------------------------------------------- */
async function loadDocuments() {
    try {
        const { data, error } = await db.from(CONFIG.TABLE_DOCUMENTS).select("*").order("created_at", { ascending: false });
        if (error) throw error;
        documents = data || [];
    } catch (e) {
        console.error("Documents load failed", e);
        documents = [];
        const l = $("libraryList");
        if (l) l.innerHTML = '<div class="list-note">Unable to load documents.</div>';
        return;
    }
    renderDocuments();
    updateStats();
}

function renderDocuments() {
    const l = $("libraryList");
    if (!l) return;
    const q = ($("documentSearch").value || "").toLowerCase();
    const items = documents.filter((d) => !q || String(d.title || d.file_name || "").toLowerCase().includes(q));
    l.innerHTML = items.length
        ? items.map((d, i) => `
            <div class="library-row">
                <div class="info">
                    <strong>${esc(d.title || d.file_name || "Untitled")}</strong>
                    <span>${esc(d.file_name || "")} · ${esc(fmtDate(d.created_at))}</span>
                </div>
                <button class="row-btn" type="button" data-doc="${documents.indexOf(d)}">OPEN</button>
            </div>`).join("")
        : '<div class="list-note">No documents found.</div>';
}

async function openDocument(d) {
    const path = d.file_path || d.path;
    if (d.file_url) return window.open(d.file_url, "_blank", "noopener");
    if (!path) return toast("This record has no file.", "warning");
    const { data, error } = await db.storage.from(CONFIG.BUCKET_DOCUMENTS).createSignedUrl(path, 300);
    if (error) return toast("Cannot open file: " + error.message, "error");
    window.open(data.signedUrl, "_blank", "noopener");
}

async function uploadDocument(e) {
    e.preventDefault();
    const title = $("documentTitle").value.trim();
    const file = $("documentFile").files[0];
    if (!title || !file) return;
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
        const safe = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${currentUser.id}/${Date.now()}_${safe}`;
        const up = await db.storage.from(CONFIG.BUCKET_DOCUMENTS).upload(path, file);
        if (up.error) throw up.error;
        const ins = await db.from(CONFIG.TABLE_DOCUMENTS).insert({
            title, file_name: file.name, file_path: path, uploaded_by: currentUser.id
        });
        if (ins.error) throw ins.error;
        toast("Document uploaded.", "success");
        e.target.reset();
        hide($("documentModal"));
        loadDocuments();
    } catch (err) {
        toast("Upload failed: " + err.message, "error");
    } finally {
        btn.disabled = false;
    }
}

/* ---------------------------------------------------------
   DEPARTMENT ORDERS (static list — edit as needed)
--------------------------------------------------------- */
const DEPARTMENT_ORDERS = [
    { no: "DO 12", year: 2025, title: "Updated Guidelines on the Implementation of Infrastructure Projects", url: "" }
];
function renderDepartmentOrders() {
    const g = $("departmentOrdersGrid");
    if (!g) return;
    g.innerHTML = DEPARTMENT_ORDERS.map((o) => `
        <div class="department-order">
            <div class="do-top"><span class="do-no">${esc(o.no)}</span><span class="do-year">s. ${esc(o.year)}</span></div>
            <h3>${esc(o.title)}</h3>
            ${o.url ? `<a href="${esc(o.url)}" target="_blank" rel="noopener">Open document ↗</a>` : ""}
        </div>`).join("");
}

/* ---------------------------------------------------------
   MICROSOFT GRAPH / ONEDRIVE
--------------------------------------------------------- */
function msConfigured() {
    return CONFIG.MS_CLIENT_ID && !/PASTE|YOUR/i.test(CONFIG.MS_CLIENT_ID);
}
function loadScript(src) {
    return new Promise((res, rej) => {
        if (window.msal) return res();
        const s = document.createElement("script");
        s.src = src; s.onload = res; s.onerror = () => rej(new Error("Could not load Microsoft sign-in library."));
        document.head.appendChild(s);
    });
}
async function initMsal() {
    if (msal) return msal;
    await loadScript(CONFIG.MS_SCRIPT);
    msal = new window.msal.PublicClientApplication({
        auth: {
            clientId: CONFIG.MS_CLIENT_ID,
            authority: CONFIG.MS_AUTHORITY,
            redirectUri: location.origin + location.pathname
        },
        cache: { cacheLocation: "sessionStorage" }
    });
    if (typeof msal.initialize === "function") await msal.initialize();
    const accts = msal.getAllAccounts();
    if (accts.length) msalAccount = accts[0];
    return msal;
}
async function connectMicrosoft() {
    await initMsal();
    const r = await msal.loginPopup({ scopes: CONFIG.MS_SCOPES });
    msalAccount = r.account;
    return msalAccount;
}
async function getToken() {
    await initMsal();
    if (!msalAccount) await connectMicrosoft();
    try {
        const r = await msal.acquireTokenSilent({ scopes: CONFIG.MS_SCOPES, account: msalAccount });
        return r.accessToken;
    } catch (e) {
        const r = await msal.acquireTokenPopup({ scopes: CONFIG.MS_SCOPES });
        msalAccount = r.account;
        return r.accessToken;
    }
}
async function graph(path, opts) {
    const token = await getToken();
    const res = await fetch(CONFIG.GRAPH + path, Object.assign({}, opts, {
        headers: Object.assign({ Authorization: "Bearer " + token, "Content-Type": "application/json" }, (opts && opts.headers) || {})
    }));
    if (!res.ok) {
        let m = res.statusText;
        try { m = (await res.json()).error.message || m; } catch (e) { /* ignore */ }
        throw new Error(m);
    }
    return res.status === 204 ? null : res.json();
}
async function findWorkbook() {
    if (workbookId) return workbookId;
    const q = encodeURIComponent(CONFIG.WORKBOOK_NAME.replace(/'/g, "''"));
    const r = await graph(`/me/drive/root/search(q='${q}')`);
    const hit = (r.value || []).find((f) => f.name === CONFIG.WORKBOOK_NAME && f.file);
    if (!hit) throw new Error(`"${CONFIG.WORKBOOK_NAME}" was not found in your OneDrive.`);
    workbookId = hit.id;
    return workbookId;
}

/* column index 0-based -> Excel letters */
function colLetter(n) {
    let s = "";
    n++;
    while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
}
function letterToIdx(s) {
    let n = 0;
    for (const c of s) n = n * 26 + (c.charCodeAt(0) - 64);
    return n - 1;
}
function parseAddress(addr) {
    // "OVERALL!A8:AI150"
    const m = /!\$?([A-Z]+)\$?(\d+)/.exec(addr || "");
    return m ? { col: letterToIdx(m[1]), row: parseInt(m[2], 10) } : { col: 0, row: 1 };
}
function num(v) {
    if (typeof v === "number") return v;
    const n = parseFloat(String(v ?? "").replace(/[₱,%\s,]/g, ""));
    return isNaN(n) ? null : n;
}
function pct(v) {
    // Excel stores 85% as 0.85
    if (v === "" || v == null) return null;
    if (typeof v === "string" && v.includes("%")) return num(v);
    const n = num(v);
    if (n == null) return null;
    return n <= 1 ? Math.round(n * 1000) / 10 : n;
}
function findCol(headers, aliases) {
    for (const a of aliases) {
        const i = headers.findIndex((h) => h === a);
        if (i >= 0) return i;
    }
    for (const a of aliases) {
        const i = headers.findIndex((h) => h.includes(a));
        if (i >= 0) return i;
    }
    return -1;
}

async function fetchOverall() {
    const id = await findWorkbook();
    const sheet = encodeURIComponent(CONFIG.SHEET_NAME);
    const r = await graph(`/me/drive/items/${id}/workbook/worksheets('${sheet}')/usedRange(valuesOnly=false)`);
    const values = r.values || [];
    const formulas = r.formulas || [];
    if (!values.length) throw new Error("The OVERALL sheet is empty.");
    const origin = parseAddress(r.address);

    // detect header row
    let h = -1;
    for (let i = 0; i < Math.min(values.length, 20); i++) {
        const t = values[i].map((v) => String(v ?? "").toUpperCase()).join("|");
        if (t.includes("PROJECT TITLE") || (t.includes("ALLOCATION") && t.includes("MUNICIPALITY"))) { h = i; break; }
    }
    if (h < 0) h = values.findIndex((row) => row.some((v) => String(v ?? "").trim() !== ""));
    if (h < 0) throw new Error("No header row found in OVERALL.");

    const headers = values[h].map((v) => String(v ?? "").trim().toUpperCase());
    const map = {};
    Object.keys(COLS).forEach((k) => { map[k] = findCol(headers, COLS[k]); });
    if (map.title < 0) throw new Error("Column 'PROJECT TITLE AS PER GAA' was not found.");

    sheetMeta = { headers, map, rowOffset: origin.row, colOffset: origin.col, headerIdx: h };

    const out = [];
    for (let i = h + 1; i < values.length; i++) {
        const row = values[i];
        const title = String(row[map.title] ?? "").trim();
        if (!title) continue;
        const get = (k) => (map[k] >= 0 ? row[map[k]] : "");
        out.push({
            sheetRow: origin.row + i,          // real worksheet row number
            no: String(out.length + 1),
            title,
            municipality: String(get("municipality") ?? ""),
            allocation: num(get("allocation")),
            program: pct(get("program")),
            plan: pct(get("plan")),
            contractId: String(get("contractId") ?? ""),
            remarks: String(get("remarks") ?? ""),
            status: String(get("status") ?? "").trim(),
            assigned: String(get("assigned") ?? ""),
            formulaCols: Object.keys(map).filter((k) => map[k] >= 0 && String((formulas[i] || [])[map[k]] ?? "").startsWith("="))
        });
    }
    return out;
}

function deriveStatus(p) {
    if (p.status) return p.status;
    if (p.program != null && p.program >= 100) return "Completed";
    if (p.program != null && p.program > 0) return "In Progress";
    return "Pending";
}

async function saveMonitoringProject(sheetRow, changes) {
    if (!sheetMeta) throw new Error("Load the sheet first.");
    const id = await findWorkbook();
    const sheet = encodeURIComponent(CONFIG.SHEET_NAME);
    const p = monitoring.find((x) => x.sheetRow === sheetRow);
    for (const key of Object.keys(changes)) {
        if (!EDITABLE.includes(key)) continue;
        const col = sheetMeta.map[key];
        if (col < 0) continue;
        if (p && p.formulaCols.includes(key)) continue;       // never overwrite formulas
        let v = changes[key];
        if (key === "program" || key === "plan") {
            const n = num(v);
            v = n == null ? "" : n / 100;                      // store as fraction
        }
        const addr = colLetter(col + sheetMeta.colOffset) + sheetRow;
        await graph(`/me/drive/items/${id}/workbook/worksheets('${sheet}')/range(address='${addr}')`, {
            method: "PATCH", body: JSON.stringify({ values: [[v]] })
        });
    }
}

/* ---------------------------------------------------------
   MONITORING UI
--------------------------------------------------------- */
async function loadMonitoring(force) {
    const list = $("monitoringList");
    if (!msConfigured()) {
        list.innerHTML = `<div class="monitoring-message">
            <strong>OneDrive is not configured.</strong>
            <span>Set <code>MS_CLIENT_ID</code> in script.js, or use the Excel upload dashboard.</span>
            <a class="button secondary" href="./excel-dashboard.html" target="_blank" rel="noopener">OPEN EXCEL UPLOAD DASHBOARD ↗</a>
        </div>`;
        return;
    }
    list.innerHTML = '<div id="monitoringLoading" class="monitoring-loading">Loading project monitoring data…</div>';
    try {
        if (force) workbookId = null;
        monitoring = await fetchOverall();
        monitoringLoaded = true;
        renderMonitoring();
    } catch (e) {
        console.error(e);
        list.innerHTML = `<div class="monitoring-message"><strong>Unable to load monitoring data.</strong>
            <span>${esc(e.message)}</span>
            <button class="button secondary" type="button" id="monitoringRetry">CONNECT / RETRY</button></div>`;
        const b = $("monitoringRetry");
        if (b) b.addEventListener("click", () => loadMonitoring(true));
    }
}

function myName() {
    return ((currentProfile && (currentProfile.full_name || currentProfile.name)) || "").toLowerCase();
}
function filteredMonitoring() {
    const q = ($("monitoringSearch").value || "").toLowerCase();
    const st = $("monitoringStatusFilter").value;
    const mine = $("myProjectsFilter").checked;
    const me = myName();
    const hasAssignCol = sheetMeta && sheetMeta.map.assigned >= 0;
    return monitoring.filter((p) => {
        if (mine && hasAssignCol && me && !p.assigned.toLowerCase().includes(me.split(/\s+/).pop())) return false;
        if (st !== "all" && deriveStatus(p) !== st) return false;
        if (q && !(p.title + " " + p.municipality + " " + p.contractId).toLowerCase().includes(q)) return false;
        return true;
    });
}

function renderMonitoring() {
    const list = $("monitoringList");
    const items = filteredMonitoring();
    const avg = (k) => {
        const v = items.map((p) => p[k]).filter((x) => x != null);
        return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) + "%" : "0%";
    };
    $("monitoringTotal").textContent = items.length;
    $("monitoringProgramAverage").textContent = avg("program");
    $("monitoringPlanAverage").textContent = avg("plan");
    $("monitoringInProgress").textContent = items.filter((p) => deriveStatus(p) === "In Progress").length;

    hide($("monitoringEmpty"));
    if (!items.length) {
        list.innerHTML = "";
        return show($("monitoringEmpty"), "flex");
    }
    list.innerHTML = items.map((p) => {
        const st = deriveStatus(p);
        const bar = (v) => v == null ? "—" : v + "%";
        return `<div class="monitoring-row">
            <div>${esc(p.contractId || p.no)}</div>
            <div><strong>${esc(p.title)}</strong><br><small>${esc(p.municipality)} · ${esc(fmtMoney(p.allocation))}</small></div>
            <div>${bar(p.program)}</div>
            <div>${bar(p.plan)}</div>
            <div><span class="status ${statusClass(st)}">${esc(st)}</span></div>
            <div>
                <button class="row-btn" type="button" data-mview="${p.sheetRow}">VIEW</button>
                <button class="row-btn" type="button" data-medit="${p.sheetRow}">EDIT</button>
            </div>
        </div>`;
    }).join("");
}

function openMonitoringView(row) {
    const p = monitoring.find((x) => x.sheetRow === row);
    if (!p) return;
    $("projectModalContent").innerHTML = `<dl class="detail-grid">
        <dt>PROJECT</dt><dd>${esc(p.title)}</dd>
        <dt>MUNICIPALITY</dt><dd>${esc(p.municipality || "—")}</dd>
        <dt>ALLOCATION</dt><dd>${esc(fmtMoney(p.allocation))}</dd>
        <dt>CONTRACT ID</dt><dd>${esc(p.contractId || "—")}</dd>
        <dt>PROGRAM</dt><dd>${p.program == null ? "—" : p.program + "%"}</dd>
        <dt>PLAN</dt><dd>${p.plan == null ? "—" : p.plan + "%"}</dd>
        <dt>STATUS</dt><dd>${esc(deriveStatus(p))}</dd>
        <dt>REMARKS</dt><dd>${esc(p.remarks || "—")}</dd>
    </dl>`;
    show($("projectModal"), "flex");
}

function openMonitoringEdit(row) {
    const p = monitoring.find((x) => x.sheetRow === row);
    if (!p) return;
    const locked = (k) => (p.formulaCols.includes(k) || sheetMeta.map[k] < 0 ? "disabled" : "");
    const cur = deriveStatus(p);
    $("projectModalContent").innerHTML = `
        <form id="monitoringEditForm">
            <strong>${esc(p.title)}</strong>
            <div class="form-grid">
                <label>Program (%)<input type="number" min="0" max="100" step="0.1" name="program" value="${p.program ?? ""}" ${locked("program")}></label>
                <label>Plan (%)<input type="number" min="0" max="100" step="0.1" name="plan" value="${p.plan ?? ""}" ${locked("plan")}></label>
                <label class="full">Overall status
                    <select name="status" ${locked("status")}>
                        ${STATUSES.map((s) => `<option ${s === cur ? "selected" : ""}>${esc(s)}</option>`).join("")}
                    </select></label>
                <label class="full">Remarks<textarea name="remarks" rows="3" ${locked("remarks")}>${esc(p.remarks)}</textarea></label>
            </div>
            <p class="list-note" style="padding:0;text-align:left;">Disabled fields are formulas or missing columns and are never overwritten.</p>
            <div class="modal-actions">
                <button type="button" class="button secondary" id="monitoringEditCancel">CANCEL</button>
                <button type="submit" class="button primary">SAVE TO EXCEL</button>
            </div>
        </form>`;
    show($("projectModal"), "flex");
    $("monitoringEditCancel").addEventListener("click", () => hide($("projectModal")));
    $("monitoringEditForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('[type="submit"]');
        btn.disabled = true;
        const fd = new FormData(e.target);
        const changes = {};
        EDITABLE.forEach((k) => { if (fd.has(k) && !e.target.elements[k].disabled) changes[k] = fd.get(k); });
        try {
            await saveMonitoringProject(row, changes);
            toast("Saved to Excel.", "success");
            hide($("projectModal"));
            await loadMonitoring(false);
        } catch (err) {
            toast("Save failed: " + err.message, "error");
            btn.disabled = false;
        }
    });
}

/* ---------------------------------------------------------
   PDS AI CHAT
--------------------------------------------------------- */
function addChat(who, text) {
    const box = $("aiResponse");
    const d = document.createElement("div");
    d.className = "pds-ai-message " + (who === "user" ? "pds-ai-user" : "pds-ai-bot");
    const label = document.createElement("strong");
    label.textContent = who === "user" ? "You" : "PDS AI";
    const body = document.createElement("div");
    body.style.marginTop = "4px";
    body.textContent = text;
    d.appendChild(label);
    d.appendChild(body);
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
    return body;
}
async function askPDSAI() {
    const input = $("aiInput");
    const msg = input.value.trim();
    if (!msg) return;
    input.value = "";
    addChat("user", msg);
    const out = addChat("bot", "Thinking…");
    try {
        const { data, error } = await db.functions.invoke(CONFIG.AI_FUNCTION, { body: { message: msg } });
        if (error) throw error;
        out.textContent = (data && (data.reply || data.response || data.message || data.answer)) ||
            (typeof data === "string" ? data : "No response received.");
    } catch (e) {
        out.textContent = "PDS AI is unavailable right now. " + (e.message || "");
    }
}
function openChat() { show($("pdsAiChatbot"), "flex"); const i = $("aiInput"); if (i) i.focus(); }
function closeChat() { hide($("pdsAiChatbot")); }

/* ---------------------------------------------------------
   WIRING
--------------------------------------------------------- */
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

function bindEvents() {
    on("loginForm", "submit", handleLogin);
    on("logoutButton", "click", handleLogout);
    on("refreshButton", "click", () => { loadProjects(); loadDocuments(); if (monitoringLoaded) loadMonitoring(true); toast("Refreshed.", "success"); });
    on("notificationButton", "click", () => toast("No new notifications.", "info"));

    // Global search → documents page
    on("globalSearch", "keydown", (e) => {
        if (e.key === "Enter") { $("documentSearch").value = e.target.value; renderDocuments(); showPage("documents"); }
    });

    // Projects
    document.addEventListener("click", (e) => {
        const pb = e.target.closest("[data-project]");
        if (pb) { const p = projects[+pb.dataset.project]; if (p) openProjectModal(p); return; }
        const db_ = e.target.closest("[data-doc]");
        if (db_) { const d = documents[+db_.dataset.doc]; if (d) openDocument(d); return; }
        const mv = e.target.closest("[data-mview]");
        if (mv) return openMonitoringView(+mv.dataset.mview);
        const me = e.target.closest("[data-medit]");
        if (me) return openMonitoringEdit(+me.dataset.medit);
    });
    on("closeProjectModal", "click", () => hide($("projectModal")));

    // Monitoring
    const rerender = debounce(() => monitoringLoaded && renderMonitoring(), 150);
    on("monitoringSearch", "input", rerender);
    on("monitoringStatusFilter", "change", rerender);
    on("myProjectsFilter", "change", rerender);
    on("monitoringRefreshButton", "click", () => loadMonitoring(true));

    // Documents
    on("uploadDocumentButton", "click", () => show($("documentModal"), "flex"));
    on("closeDocumentModal", "click", () => hide($("documentModal")));
    on("cancelDocument", "click", () => hide($("documentModal")));
    on("documentForm", "submit", uploadDocument);
    on("documentSearch", "input", debounce(renderDocuments, 150));

    // Modal backdrop click + Escape
    ["projectModal", "documentModal"].forEach((id) => {
        on(id, "click", (e) => { if (e.target.id === id) hide($(id)); });
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { hide($("projectModal")); hide($("documentModal")); }
    });

    // AI
    on("pdsAiLauncher", "click", () => ($("pdsAiChatbot").style.display === "none" ? openChat() : closeChat()));
    on("pdsAiClose", "click", closeChat);
    on("pdsAiSend", "click", askPDSAI);
    on("aiInput", "keydown", (e) => { if (e.key === "Enter") askPDSAI(); });
    on("openFullPDSAI", "click", openChat);
}

document.addEventListener("DOMContentLoaded", async () => {
    initNavigation();
    bindEvents();
    hide($("mainApp"));
    if (!initSupabase()) {
        showSignIn();
        return setLoginMessage("Could not load the Supabase library. Check your connection and reload.", true);
    }
    try { await initAuth(); } catch (e) { console.error(e); showSignIn(); }
});

})();
