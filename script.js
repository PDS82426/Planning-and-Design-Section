/* =========================================================
   PDS — PLANNING & DESIGN SECTION
   COMPLETE SCRIPT
   AUTH + SESSION + DASHBOARD + PROJECTS + DOCUMENTS
   DEPARTMENT ORDERS + PDS AI + PROJECT MONITORING
========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
    "https://zvwghoabsqfyakbqzhil.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_oJ3Zc3TplfYgePQEmTrJ8Q_qycxR0jQ";


/* =========================================================
   ONEDRIVE MONITORING FILE
========================================================= */

const ONEDRIVE_MONITORING_URL =
    "https://1drv.ms/x/c/7c0d710f08a28bcd/IQD1ICDqy0hbSIDpFHx9RMG1AcSakwBEK5ExA2IUorWdJC4?e=yBR3IX";


/* =========================================================
   MONITORING TABLE
========================================================= */

const MONITORING_TABLE =
    "monitoring";


/* =========================================================
   SUPABASE CLIENT
========================================================= */

let db = null;

function initializeSupabase() {

    if (!window.supabase) {

        console.error(
            "Supabase library was not loaded."
        );

        return false;
    }

    if (
        !SUPABASE_URL ||
        !SUPABASE_ANON_KEY ||
        SUPABASE_ANON_KEY.includes(
            "PASTE_YOUR_CURRENT"
        )
    ) {

        console.error(
            "Supabase Publishable Key is missing."
        );

        return false;
    }

    try {

        db =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_ANON_KEY,
                {
                    auth: {

                        persistSession: true,

                        autoRefreshToken: true,

                        detectSessionInUrl: true,

                        storageKey:
                            "pds-supabase-auth"

                    }
                }
            );

        return true;

    } catch (error) {

        console.error(
            "Supabase initialization failed:",
            error
        );

        return false;
    }
}


/* =========================================================
   GLOBAL STATE
========================================================= */

let currentUser = null;
let currentProfile = null;

let pdsAIHistory = [];

let cachedDocuments = [];

let cachedMonitoring = [];

let navigationReady = false;
let authFormsReady = false;
let documentSearchReady = false;
let aiReady = false;
let monitoringReady = false;
let initialized = false;


/* =========================================================
   DEPARTMENT ORDERS
========================================================= */

const departmentOrders = [

    {
        number: "DO 75",
        year: "2024",
        title: "Guidelines and Procedures",
        description:
            "Department policies, guidelines and procedures.",
        category: "Guidelines"
    },

    {
        number: "DO 159",
        year: "2022",
        title: "Infrastructure Guidelines",
        description:
            "Policies and procedures related to infrastructure projects.",
        category: "Infrastructure"
    },

    {
        number: "DO 37",
        year: "2021",
        title: "Planning and Design",
        description:
            "Planning and design implementation guidelines.",
        category: "Planning & Design"
    },

    {
        number: "DO 120",
        year: "2019",
        title: "Infrastructure Standards",
        description:
            "Standards and procedures for infrastructure implementation.",
        category: "Standards"
    },

    {
        number: "DO 27",
        year: "2019",
        title: "Project Development",
        description:
            "Project development and implementation guidelines.",
        category: "Project Development"
    },

    {
        number: "DO 28",
        year: "2019",
        title: "Cost Estimation Manual",
        description:
            "Guidelines for cost estimation and construction costing.",
        category: "Cost Estimation"
    }

];


/* =========================================================
   DOM HELPER
========================================================= */

function $(id) {

    return document.getElementById(id);

}


/* =========================================================
   AUTH SCREEN
========================================================= */

function showLogin() {

    const authScreen =
        $("authScreen");

    const app =
        $("app");

    if (app) {

        app.style.display =
            "none";
    }

    if (authScreen) {

        authScreen.style.display =
            "flex";
    }

}


function hideLogin() {

    const authScreen =
        $("authScreen");

    const app =
        $("app");

    if (authScreen) {

        authScreen.style.display =
            "none";
    }

    if (app) {

        app.style.display =
            "flex";
    }

}


/* =========================================================
   AUTH MESSAGE
========================================================= */

function authMessage(
    message,
    type = "error"
) {

    const element =
        $("loginMessage");

    if (!element) {

        console.error(message);

        return;
    }

    element.textContent =
        message;

    element.className =
        `auth-message ${type}`;

}


/* =========================================================
   CLEAR AUTH MESSAGE
========================================================= */

function clearAuthMessage() {

    const element =
        $("loginMessage");

    if (!element) {
        return;
    }

    element.textContent =
        "";

    element.className =
        "auth-message";

}


/* =========================================================
   CREATE PROFILE
========================================================= */

async function createProfile(
    user,
    fullName = ""
) {

    if (!user || !db) {
        return;
    }

    const profile = {

        id: user.id,

        email:
            user.email || "",

        full_name:
            fullName ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "PDS User"

    };

    const {
        error
    } =
        await db
            .from("profiles")
            .upsert(
                profile,
                {
                    onConflict: "id"
                }
            );

    if (error) {

        console.warn(
            "Profile creation warning:",
            error
        );

        return;
    }

    currentProfile =
        profile;

}


/* =========================================================
   LOGIN
========================================================= */

async function loginUser(
    email,
    password
) {

    if (!db) {

        authMessage(
            "Supabase is not initialized. Check your Publishable API key.",
            "error"
        );

        return {
            success: false
        };
    }

    try {

        clearAuthMessage();

        authMessage(
            "Signing in...",
            "loading"
        );

        const {
            data,
            error
        } =
            await db.auth.signInWithPassword({

                email:
                    email.trim(),

                password:
                    password

            });

        if (error) {

            console.error(
                "Supabase login error:",
                error
            );

            throw error;
        }

        if (
            !data ||
            !data.user
        ) {

            throw new Error(
                "No user account was returned by Supabase."
            );
        }

        currentUser =
            data.user;

        hideLogin();

        showPage(
            "dashboard"
        );

        await loadUserProfile();

        updateUserInterface();

        await Promise.allSettled([

            loadProjects(),

            loadDocuments(),

            loadDepartmentOrders(),

            loadMonitoring()

        ]);

        authMessage(
            "",
            "success"
        );

        return {
            success: true,
            data
        };

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        let message =
            error?.message ||
            "Unable to sign in.";

        if (
            message
                .toLowerCase()
                .includes(
                    "invalid api key"
                )
        ) {

            message =
                "Invalid Supabase API key. Open Supabase → Project Settings → API and replace the Publishable key in script.js.";

        }

        authMessage(
            message,
            "error"
        );

        return {
            success: false,
            error
        };

    }

}


/* =========================================================
   SIGN OUT
========================================================= */

async function signOut() {

    if (!db) {

        showLogin();

        return;
    }

    try {

        await db.auth.signOut();

    } catch (error) {

        console.error(
            "Sign out error:",
            error
        );

    } finally {

        currentUser = null;

        currentProfile = null;

        pdsAIHistory = [];

        cachedMonitoring = [];

        showLogin();
    }

}


/* =========================================================
   LOAD USER PROFILE
========================================================= */

async function loadUserProfile() {

    if (
        !db ||
        !currentUser
    ) {

        return;
    }

    try {

        const {
            data,
            error
        } =
            await db
                .from("profiles")
                .select("*")
                .eq(
                    "id",
                    currentUser.id
                )
                .maybeSingle();

        if (error) {

            console.warn(
                "Profile loading warning:",
                error
            );

            return;
        }

        if (data) {

            currentProfile =
                data;

        } else {

            await createProfile(
                currentUser
            );

        }

    } catch (error) {

        console.warn(
            "Profile loading failed:",
            error
        );

    }

}


/* =========================================================
   SESSION RESTORATION
========================================================= */

async function restoreSession() {

    if (!db) {

        showLogin();

        return false;
    }

    try {

        console.log(
            "PDS: Checking existing session..."
        );

        const {
            data,
            error
        } =
            await db.auth.getSession();

        if (error) {

            console.error(
                "Session error:",
                error
            );

            showLogin();

            return false;
        }

        const session =
            data?.session;

        if (
            !session ||
            !session.user
        ) {

            console.log(
                "PDS: No active session."
            );

            currentUser = null;

            currentProfile = null;

            showLogin();

            return false;
        }

        currentUser =
            session.user;

        console.log(
            "PDS: Session restored:",
            currentUser.email
        );

        hideLogin();

        showPage(
            "dashboard"
        );

        await loadUserProfile();

        updateUserInterface();

        await Promise.allSettled([

            loadProjects(),

            loadDocuments(),

            loadDepartmentOrders(),

            loadMonitoring()

        ]);

        return true;

    } catch (error) {

        console.error(
            "Session restoration error:",
            error
        );

        try {

            const {
                data
            } =
                await db.auth.getSession();

            if (
                data?.session?.user
            ) {

                currentUser =
                    data.session.user;

                hideLogin();

                showPage(
                    "dashboard"
                );

                await loadMonitoring();

                return true;
            }

        } catch (secondError) {

            console.error(
                "Final session check failed:",
                secondError
            );
        }

        showLogin();

        return false;
    }

}


/* =========================================================
   USER INTERFACE
========================================================= */

function updateUserInterface() {

    const user =
        currentUser;

    const profile =
        currentProfile;

    const name =
        profile?.full_name ||
        user?.user_metadata?.full_name ||
        user?.email?.split("@")[0] ||
        "PDS User";

    const email =
        profile?.email ||
        user?.email ||
        "";

    const role =
        profile?.role ||
        "Member";

    const profileName =
        $("profileName");

    const profileEmail =
        $("profileEmail");

    const topAvatar =
        $("topAvatar");

    const sidebarAvatar =
        $("sidebarAvatar");

    const sidebarUserName =
        $("sidebarUserName");

    const sidebarUserRole =
        $("sidebarUserRole");

    if (profileName) {

        profileName.textContent =
            name;

    }

    if (profileEmail) {

        profileEmail.textContent =
            email;

    }

    if (topAvatar) {

        topAvatar.textContent =
            name
                .charAt(0)
                .toUpperCase();

    }

    if (sidebarAvatar) {

        sidebarAvatar.textContent =
            name
                .charAt(0)
                .toUpperCase();

    }

    if (sidebarUserName) {

        sidebarUserName.textContent =
            name;

    }

    if (sidebarUserRole) {

        sidebarUserRole.textContent =
            role;

    }

}


/* =========================================================
   NAVIGATION NORMALIZER
========================================================= */

function normalizePageId(
    pageId
) {

    if (!pageId) {

        return "dashboard";
    }

    const normalized =
        String(pageId)
            .trim()
            .toLowerCase();

    const aliases = {

        overview:
            "dashboard",

        dashboard:
            "dashboard",

        project:
            "projects",

        projects:
            "projects",

        myprojects:
            "projects",

        monitoring:
            "monitoring",

        projectmonitoring:
            "monitoring",

        "project-monitoring":
            "monitoring",

        "project monitoring":
            "monitoring",

        document:
            "documents",

        documents:
            "documents",

        content:
            "documents",

        orders:
            "department-orders",

        departmentorders:
            "department-orders",

        "department-orders":
            "department-orders",

        standards:
            "standards-guidelines",

        guidelines:
            "standards-guidelines",

        "standards-guidelines":
            "standards-guidelines",

        forms:
            "forms-templates",

        templates:
            "forms-templates",

        "forms-templates":
            "forms-templates",

        news:
            "announcements",

        announcement:
            "announcements",

        announcements:
            "announcements",

        ai:
            "pds-ai-assistant",

        pdsai:
            "pds-ai-assistant",

        "pds-ai-assistant":
            "pds-ai-assistant",

        about:
            "aboutpds",

        aboutpds:
            "aboutpds",

        contact:
            "contact-us",

        "contact-us":
            "contact-us",

        profile:
            "profile",

        userprofile:
            "profile"

    };

    return (
        aliases[normalized] ||
        normalized
    );

}


/* =========================================================
   GET PDS PAGES
========================================================= */

function getPDSPages() {

    return Array.from(
        document.querySelectorAll(
            "#app .page-section, " +
            "#app [data-page-section], " +
            "#app section[data-section]"
        )
    );

}


/* =========================================================
   SHOW PAGE
========================================================= */

function showPage(
    pageId
) {

    pageId =
        normalizePageId(
            pageId
        );

    const pages =
        getPDSPages();

    let targetPage =
        null;

    pages.forEach(
        page => {

            const id =
                page.id ||
                page.dataset.section ||
                page.dataset.pageSection;

            if (
                id === pageId
            ) {

                targetPage =
                    page;

            }

            page.classList.remove(
                "active"
            );

            page.style.display =
                "none";

        }
    );

    if (!targetPage) {

        targetPage =
            document.getElementById(
                pageId
            );

    }

    if (!targetPage) {

        targetPage =
            document.getElementById(
                "dashboard"
            );

    }

    if (targetPage) {

        targetPage.classList.add(
            "active"
        );

        targetPage.style.display =
            "block";

    }

    document
        .querySelectorAll(
            "#sidebarNav [data-section]"
        )
        .forEach(
            item => {

                const itemPage =
                    normalizePageId(
                        item.dataset.section
                    );

                item.classList.toggle(
                    "active",
                    itemPage === pageId
                );

            }
        );

    const titles = {

        dashboard:
            "Dashboard",

        projects:
            "Projects",

        monitoring:
            "Project Monitoring",

        documents:
            "Document Library",

        "standards-guidelines":
            "Standards & Guidelines",

        "department-orders":
            "Department Orders",

        "forms-templates":
            "Forms & Templates",

        announcements:
            "Announcements",

        "pds-ai-assistant":
            "PDS AI Assistant",

        aboutpds:
            "About PDS",

        "contact-us":
            "Contact Us",

        profile:
            "My Profile"

    };

    const pageTitle =
        $("pageTitle");

    if (pageTitle) {

        pageTitle.textContent =
            titles[pageId] ||
            "Planning & Design Section";

    }

    if (
        pageId ===
        "projects"
    ) {

        loadProjects();

    }

    if (
        pageId ===
        "monitoring"
    ) {

        loadMonitoring();

    }

    if (
        pageId ===
        "documents"
    ) {

        loadDocuments();

    }

    if (
        pageId ===
        "department-orders"
    ) {

        renderDepartmentOrders(
            departmentOrders
        );

    }

}


/* =========================================================
   NAVIGATION SETUP
========================================================= */

function setupNavigation() {

    if (navigationReady) {
        return;
    }

    navigationReady =
        true;

    document.addEventListener(
        "click",
        event => {

            const navItem =
                event.target.closest(
                    "#sidebarNav [data-section]"
                );

            if (!navItem) {
                return;
            }

            event.preventDefault();

            showPage(
                navItem.dataset.section
            );

        }
    );

}


/* =========================================================
   QUICK ACTIONS
========================================================= */

function setupSectionTargets() {

    document.addEventListener(
        "click",
        event => {

            const target =
                event.target.closest(
                    "[data-section-target]"
                );

            if (!target) {
                return;
            }

            event.preventDefault();

            showPage(
                target.dataset.sectionTarget
            );

        }
    );

}


/* =========================================================
   GLOBAL SEARCH
========================================================= */

function setupGlobalSearch() {

    const search =
        $("globalSearch");

    if (!search) {
        return;
    }

    search.addEventListener(
        "input",
        event => {

            const query =
                event.target.value
                    .trim()
                    .toLowerCase();

            if (!query) {
                return;
            }

            if (
                cachedMonitoring.length &&
                cachedMonitoring.some(
                    item =>
                        monitoringSearchText(
                            item
                        )
                            .includes(query)
                )
            ) {

                showPage(
                    "monitoring"
                );

                const monitoringSearch =
                    $("monitoringSearch");

                if (monitoringSearch) {

                    monitoringSearch.value =
                        query;

                    renderMonitoring(
                        filterMonitoring(
                            cachedMonitoring
                        )
                    );

                }

                return;
            }

            const projectMatch =
                document
                    .querySelectorAll(
                        ".project-card"
                    );

            if (
                projectMatch.length
            ) {

                showPage(
                    "projects"
                );

            }

        }
    );

}


/* =========================================================
   REFRESH
========================================================= */

async function refreshAll() {

    await Promise.allSettled([

        loadProjects(),

        loadDocuments(),

        loadDepartmentOrders(),

        loadMonitoring()

    ]);

}


/* =========================================================
   PROJECTS
========================================================= */

async function loadProjects() {

    const list =
        $("projectList");

    if (!list || !db) {
        return;
    }

    list.innerHTML = `
        <div class="empty-state">
            Loading projects...
        </div>
    `;

    try {

        const {
            data,
            error
        } =
            await db
                .from("projects")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (error) {
            throw error;
        }

        renderProjects(
            data || []
        );

        updateProjectStats(
            data || []
        );

    } catch (error) {

        console.error(
            "Projects error:",
            error
        );

        renderProjects([]);

        updateProjectStats([]);

    }

}


/* =========================================================
   PROJECT STATS
========================================================= */

function updateProjectStats(
    projects
) {

    const total =
        projects.length;

    const ongoing =
        projects.filter(
            project =>
                String(
                    project.status || ""
                )
                    .toLowerCase()
                    .includes(
                        "ongoing"
                    )
        ).length;

    const completed =
        projects.filter(
            project =>
                String(
                    project.status || ""
                )
                    .toLowerCase()
                    .includes(
                        "completed"
                    )
        ).length;

    const totalProjects =
        $("totalProjects");

    const ongoingProjects =
        $("ongoingProjects");

    const completedProjects =
        $("completedProjects");

    if (totalProjects) {

        totalProjects.textContent =
            total;

    }

    if (ongoingProjects) {

        ongoingProjects.textContent =
            ongoing;

    }

    if (completedProjects) {

        completedProjects.textContent =
            completed;

    }

}


/* =========================================================
   RENDER PROJECTS
========================================================= */

function renderProjects(
    projects
) {

    const list =
        $("projectList");

    if (!list) {
        return;
    }

    if (!projects.length) {

        list.innerHTML = `
            <div class="empty-state">
                <strong>No projects found</strong>
                <span>Project records will appear here.</span>
            </div>
        `;

        return;
    }

    list.innerHTML =
        projects
            .map(
                project => {

                    const id =
                        escapeJS(
                            project.id || ""
                        );

                    const title =
                        escapeHTML(
                            project.title ||
                            project.project_title ||
                            project.name ||
                            "Untitled Project"
                        );

                    const status =
                        escapeHTML(
                            project.status ||
                            "Active"
                        );

                    const location =
                        escapeHTML(
                            project.location ||
                            project.project_location ||
                            "—"
                        );

                    return `
                        <article
                            class="project-card"
                            data-project-id="${escapeHTML(project.id || "")}"
                            onclick="openProject('${id}')"
                        >

                            <div class="project-card-top">

                                <span class="project-status">
                                    ${status}
                                </span>

                            </div>

                            <h3>
                                ${title}
                            </h3>

                            <p>
                                ${location}
                            </p>

                        </article>
                    `;

                }
            )
            .join("");

}


/* =========================================================
   OPEN PROJECT
========================================================= */

async function openProject(
    projectId
) {

    if (
        !projectId ||
        !db
    ) {

        return;
    }

    try {

        const {
            data,
            error
        } =
            await db
                .from("projects")
                .select("*")
                .eq(
                    "id",
                    projectId
                )
                .maybeSingle();

        if (error) {
            throw error;
        }

        const modal =
            $("projectModal");

        const content =
            $("projectModalContent");

        if (
            !modal ||
            !content
        ) {

            return;
        }

        if (!data) {

            content.innerHTML = `
                <div class="empty-state">
                    Project not found.
                </div>
            `;

        } else {

            content.innerHTML = `
                <div class="project-detail">

                    <div class="detail-label">
                        PROJECT
                    </div>

                    <h2>
                        ${escapeHTML(
                            data.title ||
                            data.project_title ||
                            data.name ||
                            "Untitled Project"
                        )}
                    </h2>

                    <div class="detail-grid">

                        <div>
                            <span>STATUS</span>
                            <strong>
                                ${escapeHTML(
                                    data.status || "—"
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>LOCATION</span>
                            <strong>
                                ${escapeHTML(
                                    data.location || "—"
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>CONTRACTOR</span>
                            <strong>
                                ${escapeHTML(
                                    data.contractor || "—"
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>ABC</span>
                            <strong>
                                ${escapeHTML(
                                    data.abc || "—"
                                )}
                            </strong>
                        </div>

                    </div>

                </div>
            `;

        }

        modal.style.display =
            "flex";

    } catch (error) {

        console.error(
            "Project open error:",
            error
        );

    }

}


/* =========================================================
   DOCUMENTS
========================================================= */

async function loadDocuments() {

    const list =
        $("libraryList");

    if (!db) {
        return;
    }

    try {

        const {
            data,
            error
        } =
            await db
                .from("documents")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (error) {
            throw error;
        }

        cachedDocuments =
            data || [];

        renderDocuments(
            cachedDocuments
        );

        const totalDocuments =
            $("totalDocuments");

        if (totalDocuments) {

            totalDocuments.textContent =
                cachedDocuments.length;

        }

    } catch (error) {

        console.error(
            "Documents error:",
            error
        );

        cachedDocuments =
            [];

        if (list) {

            list.innerHTML = `
                <div class="empty-state">
                    No documents available.
                </div>
            `;

        }

        const totalDocuments =
            $("totalDocuments");

        if (totalDocuments) {

            totalDocuments.textContent =
                "0";

        }

    }

}


/* =========================================================
   RENDER DOCUMENTS
========================================================= */

function renderDocuments(
    documents
) {

    const list =
        $("libraryList");

    if (!list) {
        return;
    }

    if (!documents.length) {

        list.innerHTML = `
            <div class="empty-state">
                <strong>No documents found</strong>
                <span>Upload a document to begin.</span>
            </div>
        `;

        return;
    }

    list.innerHTML =
        documents
            .map(
                document => {

                    return `
                        <article
                            class="document-card"
                            onclick="openDocument('${escapeJS(document.id || "")}')"
                        >

                            <div class="document-icon">
                                DOC
                            </div>

                            <div class="document-info">

                                <h3>
                                    ${escapeHTML(
                                        document.title ||
                                        document.name ||
                                        "Untitled Document"
                                    )}
                                </h3>

                                <p>
                                    ${escapeHTML(
                                        document.file_name ||
                                        document.name ||
                                        "Document"
                                    )}
                                </p>

                            </div>

                        </article>
                    `;

                }
            )
            .join("");

}


/* =========================================================
   DOCUMENT SEARCH
========================================================= */

function setupDocumentSearch() {

    if (documentSearchReady) {
        return;
    }

    const search =
        $("documentSearch");

    if (!search) {
        return;
    }

    documentSearchReady =
        true;

    search.addEventListener(
        "input",
        event => {

            const query =
                event.target.value
                    .trim()
                    .toLowerCase();

            const filtered =
                cachedDocuments.filter(
                    document => {

                        const text = [

                            document.title,

                            document.name,

                            document.file_name,

                            document.description

                        ]
                            .filter(Boolean)
                            .join(" ")
                            .toLowerCase();

                        return text.includes(
                            query
                        );

                    }
                );

            renderDocuments(
                filtered
            );

        }
    );

}


/* =========================================================
   DOCUMENT MODAL
========================================================= */

function openDocumentModal() {

    const modal =
        $("documentModal");

    if (modal) {

        modal.style.display =
            "flex";

    }

}


function closeDocumentModal() {

    const modal =
        $("documentModal");

    if (modal) {

        modal.style.display =
            "none";

    }

}


/* =========================================================
   DOCUMENT MODAL SETUP
========================================================= */

function setupDocumentModal() {

    const close =
        $("closeDocumentModal");

    const cancel =
        $("cancelDocument");

    if (close) {

        close.addEventListener(
            "click",
            closeDocumentModal
        );

    }

    if (cancel) {

        cancel.addEventListener(
            "click",
            closeDocumentModal
        );

    }

}


/* =========================================================
   DOCUMENT UPLOAD BUTTON
========================================================= */

function setupDocumentUpload() {

    const button =
        $("uploadDocumentButton");

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        openDocumentModal
    );

}


/* =========================================================
   DOCUMENT UPLOAD
========================================================= */

async function uploadDocument(
    event
) {

    if (event) {

        event.preventDefault();

    }

    if (
        !db ||
        !currentUser
    ) {

        alert(
            "Please sign in again."
        );

        return;
    }

    const titleInput =
        $("documentTitle");

    const fileInput =
        $("documentFile");

    const title =
        titleInput?.value.trim();

    const file =
        fileInput?.files?.[0];

    if (!title) {

        alert(
            "Please enter a document title."
        );

        return;
    }

    if (!file) {

        alert(
            "Please select a file."
        );

        return;
    }

    try {

        const fileName =
            `${Date.now()}_${file.name}`;

        const filePath =
            `${currentUser.id}/${fileName}`;

        const {
            error: uploadError
        } =
            await db.storage
                .from("documents")
                .upload(
                    filePath,
                    file,
                    {
                        upsert: false
                    }
                );

        if (uploadError) {
            throw uploadError;
        }

        const {
            data,
            error
        } =
            await db
                .from("documents")
                .insert({

                    title:
                        title,

                    file_name:
                        file.name,

                    file_path:
                        filePath,

                    file_size:
                        file.size,

                    mime_type:
                        file.type,

                    uploaded_by:
                        currentUser.id

                })
                .select()
                .single();

        if (error) {
            throw error;
        }

        console.log(
            "Document uploaded:",
            data
        );

        closeDocumentModal();

        if (titleInput) {

            titleInput.value =
                "";

        }

        if (fileInput) {

            fileInput.value =
                "";

        }

        await loadDocuments();

        alert(
            "Document uploaded successfully."
        );

    } catch (error) {

        console.error(
            "Document upload error:",
            error
        );

        alert(
            error.message ||
            "Document upload failed."
        );

    }

}


/* =========================================================
   DOCUMENT FORM
========================================================= */

function setupDocumentForm() {

    const form =
        $("documentForm");

    if (!form) {
        return;
    }

    form.addEventListener(
        "submit",
        uploadDocument
    );

}


/* =========================================================
   OPEN DOCUMENT
========================================================= */

async function openDocument(
    documentId
) {

    if (
        !db ||
        !documentId
    ) {

        return;
    }

    try {

        const {
            data,
            error
        } =
            await db
                .from("documents")
                .select("*")
                .eq(
                    "id",
                    documentId
                )
                .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {

            alert(
                "Document not found."
            );

            return;
        }

        if (!data.file_path) {

            alert(
                "No file is attached to this document."
            );

            return;
        }

        const {
            data: signedData,
            error: signedError
        } =
            await db.storage
                .from("documents")
                .createSignedUrl(
                    data.file_path,
                    3600
                );

        if (signedError) {
            throw signedError;
        }

        if (
            signedData?.signedUrl
        ) {

            window.open(
                signedData.signedUrl,
                "_blank",
                "noopener,noreferrer"
            );

        }

    } catch (error) {

        console.error(
            "Open document error:",
            error
        );

        alert(
            error.message ||
            "Unable to open document."
        );

    }

}


/* =========================================================
   DELETE DOCUMENT
========================================================= */

async function deleteDocument(
    documentId
) {

    if (
        !db ||
        !documentId
    ) {

        return;
    }

    if (
        !confirm(
            "Delete this document?"
        )
    ) {

        return;
    }

    try {

        const {
            data,
            error
        } =
            await db
                .from("documents")
                .select(
                    "file_path"
                )
                .eq(
                    "id",
                    documentId
                )
                .maybeSingle();

        if (error) {
            throw error;
        }

        if (data?.file_path) {

            const {
                error:
                    storageError
            } =
                await db.storage
                    .from("documents")
                    .remove([
                        data.file_path
                    ]);

            if (storageError) {

                console.warn(
                    "Storage delete warning:",
                    storageError
                );

            }

        }

        const {
            error:
                deleteError
        } =
            await db
                .from("documents")
                .delete()
                .eq(
                    "id",
                    documentId
                );

        if (deleteError) {
            throw deleteError;
        }

        await loadDocuments();

    } catch (error) {

        console.error(
            "Delete document error:",
            error
        );

        alert(
            error.message ||
            "Unable to delete document."
        );

    }

}


/* =========================================================
   DEPARTMENT ORDERS
========================================================= */

async function loadDepartmentOrders() {

    renderDepartmentOrders(
        departmentOrders
    );

}


function renderDepartmentOrders(
    orders
) {

    const container =
        $("departmentOrdersGrid");

    if (!container) {
        return;
    }

    if (!orders.length) {

        container.innerHTML = `
            <div class="empty-state">
                No Department Orders found.
            </div>
        `;

        return;
    }

    container.innerHTML =
        orders
            .map(
                order => {

                    return `
                        <article class="order-card">

                            <div class="order-number">
                                ${escapeHTML(
                                    order.number
                                )}
                            </div>

                            <div class="order-year">
                                SERIES ${escapeHTML(
                                    order.year
                                )}
                            </div>

                            <h3>
                                ${escapeHTML(
                                    order.title
                                )}
                            </h3>

                            <p>
                                ${escapeHTML(
                                    order.description
                                )}
                            </p>

                            <span class="order-category">
                                ${escapeHTML(
                                    order.category
                                )}
                            </span>

                        </article>
                    `;

                }
            )
            .join("");

}


/* =========================================================
   DEPARTMENT ORDER SEARCH
========================================================= */

function setupDepartmentOrderFilters() {

    const search =
        $("departmentOrderSearch");

    if (!search) {
        return;
    }

    search.addEventListener(
        "input",
        () => {

            const query =
                search.value
                    .trim()
                    .toLowerCase();

            const filtered =
                departmentOrders.filter(
                    order => {

                        const text = [

                            order.number,

                            order.year,

                            order.title,

                            order.description,

                            order.category

                        ]
                            .join(" ")
                            .toLowerCase();

                        return text.includes(
                            query
                        );

                    }
                );

            renderDepartmentOrders(
                filtered
            );

        }
    );

}


/* =========================================================
   PROJECT MODAL
========================================================= */

function setupProjectModal() {

    const modal =
        $("projectModal");

    const close =
        $("closeProjectModal");

    if (!modal) {
        return;
    }

    if (close) {

        close.addEventListener(
            "click",
            () => {

                modal.style.display =
                    "none";

            }
        );

    }

    modal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modal
            ) {

                modal.style.display =
                    "none";

            }

        }
    );

}


/* =========================================================
   =========================================================
   PROJECT MONITORING
   =========================================================
========================================================= */


/* =========================================================
   MONITORING SEARCH TEXT
========================================================= */

function monitoringSearchText(
    item
) {

    return [

        item.category,

        item.program,

        item.sub_program,

        item.project_title,

        item.project_title_as_per_gaa,

        item.contract_id,

        item.municipality,

        item.program2,

        item.plan,

        item.advertisement_batch,

        item.overall_status,

        item.program_status,

        item.plan_status,

        item.remarks,

        item.remarks2

    ]
        .filter(
            value =>
                value !== null &&
                value !== undefined
        )
        .join(" ")
        .toLowerCase();

}


/* =========================================================
   PERCENTAGE PARSER
========================================================= */

function parsePercent(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return null;
    }

    const cleaned =
        String(value)
            .replace(
                /%/g,
                ""
            )
            .replace(
                /,/g,
                ""
            )
            .trim();

    const number =
        parseFloat(
            cleaned
        );

    if (
        Number.isNaN(number)
    ) {

        return null;
    }

    return Math.max(
        0,
        Math.min(
            100,
            number
        )
    );

}


/* =========================================================
   FORMAT PERCENTAGE
========================================================= */

function formatPercent(
    value
) {

    const number =
        parsePercent(
            value
        );

    if (
        number === null
    ) {

        return "0.00%";

    }

    return (
        number.toFixed(2) +
        "%"
    );

}


/* =========================================================
   NORMALIZE STATUS
========================================================= */

function normalizeStatus(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toLowerCase()
        .replace(
            /[_-]+/g,
            " "
        );

}


/* =========================================================
   STATUS CLASS
========================================================= */

function monitoringStatusClass(
    value
) {

    const status =
        normalizeStatus(
            value
        );

    if (
        status.includes(
            "completed"
        )
    ) {

        return "completed";

    }

    if (
        status.includes(
            "for completion"
        )
    ) {

        return "for-completion";

    }

    if (
        status.includes(
            "ongoing"
        ) ||
        status.includes(
            "in progress"
        )
    ) {

        return "ongoing";

    }

    if (
        status.includes(
            "not started"
        )
    ) {

        return "not-started";

    }

    return "";

}


/* =========================================================
   CALCULATE DAYS SINCE UPDATE
========================================================= */

function calculateDaysSinceUpdate(
    dateValue
) {

    if (!dateValue) {

        return "";

    }

    const updated =
        new Date(
            dateValue
        );

    if (
        Number.isNaN(
            updated.getTime()
        )
    ) {

        return "";

    }

    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );

    updated.setHours(
        0,
        0,
        0,
        0
    );

    const difference =
        today.getTime() -
        updated.getTime();

    return Math.max(
        0,
        Math.floor(
            difference /
            86400000
        )
    );

}


/* =========================================================
   MONITORING OVERALL PROGRESS
========================================================= */

function monitoringRowProgress(
    item
) {

    const program =
        parsePercent(
            item.program_percent
        );

    const plan =
        parsePercent(
            item.plan_percent
        );

    if (
        program !== null &&
        plan !== null
    ) {

        return (
            program +
            plan
        ) / 2;

    }

    if (
        program !== null
    ) {

        return program;

    }

    if (
        plan !== null
    ) {

        return plan;

    }

    return 0;

}


/* =========================================================
   LOAD MONITORING
========================================================= */

async function loadMonitoring() {

    const container =
        $("monitoringList");

    if (!db) {
        return;
    }

    if (container) {

        container.innerHTML = `
            <div class="empty-state">
                Loading project monitoring...
            </div>
        `;

    }

    try {

        const {
            data,
            error
        } =
            await db
                .from(
                    MONITORING_TABLE
                )
                .select("*")
                .order(
                    "contract_id",
                    {
                        ascending: true
                    }
                );

        if (error) {

            /*
             * Do not break the rest
             * of the website if the
             * monitoring table does
             * not yet exist.
             */

            if (
                String(
                    error.message || ""
                )
                    .toLowerCase()
                    .includes(
                        "could not find the table"
                    ) ||
                String(
                    error.message || ""
                )
                    .toLowerCase()
                    .includes(
                        "relation"
                    )
            ) {

                console.warn(
                    "Monitoring table is not yet available:",
                    error.message
                );

                cachedMonitoring =
                    [];

                updateMonitoringStats([]);

                if (container) {

                    container.innerHTML = `
                        <div class="empty-state">
                            <strong>Monitoring table not yet connected</strong>
                            <span>
                                The Project Monitoring interface is ready.
                                Create the Supabase "monitoring" table to load and edit the monitoring records.
                            </span>
                        </div>
                    `;

                }

                return;
            }

            throw error;
        }

        cachedMonitoring =
            data || [];

        updateMonitoringStats(
            cachedMonitoring
        );

        renderMonitoring(
            filterMonitoring(
                cachedMonitoring
            )
        );

    } catch (error) {

        console.error(
            "Monitoring loading error:",
            error
        );

        cachedMonitoring =
            [];

        updateMonitoringStats([]);

        if (container) {

            container.innerHTML = `
                <div class="empty-state">
                    <strong>Unable to load monitoring data</strong>
                    <span>
                        ${escapeHTML(
                            error.message ||
                            "Please check the Supabase monitoring table and permissions."
                        )}
                    </span>
                </div>
            `;

        }

    }

}


/* =========================================================
   MONITORING STATISTICS
========================================================= */

function updateMonitoringStats(
    records
) {

    const total =
        records.length;

    let notStarted =
        0;

    let ongoing =
        0;

    let forCompletion =
        0;

    let completed =
        0;

    records.forEach(
        item => {

            const status =
                normalizeStatus(
                    item.overall_status ||
                    item.program_status ||
                    item.plan_status
                );

            if (
                status ===
                "completed" ||
                status.includes(
                    "completed"
                )
            ) {

                completed++;

            } else if (
                status.includes(
                    "for completion"
                )
            ) {

                forCompletion++;

            } else if (
                status.includes(
                    "ongoing"
                ) ||
                status.includes(
                    "in progress"
                )
            ) {

                ongoing++;

            } else if (
                status.includes(
                    "not started"
                )
            ) {

                notStarted++;

            }

        }
    );

    let overallProgress =
        0;

    if (
        records.length
    ) {

        overallProgress =
            records.reduce(
                (
                    totalProgress,
                    item
                ) => {

                    return (
                        totalProgress +
                        monitoringRowProgress(
                            item
                        )
                    );

                },
                0
            ) /
            records.length;

    }

    const totalElement =
        $("monitoringTotalProjects");

    const notStartedElement =
        $("monitoringNotStarted");

    const ongoingElement =
        $("monitoringOngoing");

    const forCompletionElement =
        $("monitoringForCompletion");

    const completedElement =
        $("monitoringCompleted");

    const progressElement =
        $("monitoringOverallProgress");

    if (totalElement) {

        totalElement.textContent =
            total;

    }

    if (notStartedElement) {

        notStartedElement.textContent =
            notStarted;

    }

    if (ongoingElement) {

        ongoingElement.textContent =
            ongoing;

    }

    if (forCompletionElement) {

        forCompletionElement.textContent =
            forCompletion;

    }

    if (completedElement) {

        completedElement.textContent =
            completed;

    }

    if (progressElement) {

        progressElement.textContent =
            `${overallProgress.toFixed(2)}%`;

    }

}


/* =========================================================
   FILTER MONITORING
========================================================= */

function filterMonitoring(
    records
) {

    const search =
        $("monitoringSearch");

    const statusFilter =
        $("monitoringStatusFilter");

    const query =
        search?.value
            ?.trim()
            .toLowerCase() ||
        "";

    const selectedStatus =
        statusFilter?.value ||
        "";

    return records.filter(
        item => {

            const searchMatch =
                !query ||
                monitoringSearchText(
                    item
                )
                    .includes(
                        query
                    );

            if (!searchMatch) {
                return false;
            }

            if (!selectedStatus) {
                return true;
            }

            const wanted =
                normalizeStatus(
                    selectedStatus
                );

            const values = [

                normalizeStatus(
                    item.overall_status
                ),

                normalizeStatus(
                    item.program_status
                ),

                normalizeStatus(
                    item.plan_status
                )

            ];

            return values.some(
                value =>
                    value === wanted ||
                    value.includes(
                        wanted
                    ) ||
                    wanted.includes(
                        value
                    )
            );

        }
    );

}


/* =========================================================
   RENDER MONITORING
========================================================= */

function renderMonitoring(
    records
) {

    const container =
        $("monitoringList");

    if (!container) {
        return;
    }

    if (!records.length) {

        if (
            cachedMonitoring.length
        ) {

            container.innerHTML = `
                <div class="empty-state">
                    <strong>No matching monitoring records</strong>
                    <span>Try changing the search or status filter.</span>
                </div>
            `;

        } else {

            container.innerHTML = `
                <div class="empty-state">
                    <strong>No monitoring records</strong>
                    <span>Monitoring records will appear here after the Supabase monitoring table is populated.</span>
                </div>
            `;

        }

        return;
    }

    container.innerHTML = `

        <table
            style="
                width:100%;
                min-width:1200px;
                border-collapse:collapse;
                background:#fff;
                font-size:10px;
            "
        >

            <thead>

                <tr
                    style="
                        background:#063b61;
                        color:#fff;
                    "
                >

                    <th style="padding:10px;text-align:left;white-space:nowrap;">
                        CONTRACT ID
                    </th>

                    <th style="padding:10px;text-align:left;min-width:280px;">
                        PROJECT TITLE
                    </th>

                    <th style="padding:10px;text-align:left;">
                        MUNICIPALITY
                    </th>

                    <th style="padding:10px;text-align:left;">
                        PROGRAM
                    </th>

                    <th style="padding:10px;text-align:left;">
                        PLAN
                    </th>

                    <th style="padding:10px;text-align:center;">
                        PROGRAM %
                    </th>

                    <th style="padding:10px;text-align:center;">
                        PLAN %
                    </th>

                    <th style="padding:10px;text-align:center;">
                        OVERALL STATUS
                    </th>

                    <th style="padding:10px;text-align:center;">
                        LAST UPDATED
                    </th>

                    <th style="padding:10px;text-align:center;">
                        DAYS
                    </th>

                    <th style="padding:10px;text-align:center;">
                        ACTION
                    </th>

                </tr>

            </thead>

            <tbody>

                ${
                    records
                        .map(
                            item =>
                                renderMonitoringRow(
                                    item
                                )
                        )
                        .join("")
                }

            </tbody>

        </table>

    `;

}


/* =========================================================
   MONITORING TABLE ROW
========================================================= */

function renderMonitoringRow(
    item
) {

    const id =
        item.id;

    const contractId =
        escapeHTML(
            item.contract_id ||
            "—"
        );

    const title =
        escapeHTML(
            item.project_title ||
            item.project_title_as_per_gaa ||
            item.title ||
            "Untitled Project"
        );

    const municipality =
        escapeHTML(
            item.municipality ||
            "—"
        );

    const programPerson =
        escapeHTML(
            item.program2 ||
            "—"
        );

    const planPerson =
        escapeHTML(
            item.plan ||
            "—"
        );

    const programPercent =
        formatPercent(
            item.program_percent
        );

    const planPercent =
        formatPercent(
            item.plan_percent
        );

    const overallStatus =
        item.overall_status ||
        item.program_status ||
        item.plan_status ||
        "—";

    const statusClass =
        monitoringStatusClass(
            overallStatus
        );

    const lastUpdated =
        formatDate(
            item.last_updated
        );

    const days =
        item.last_updated
            ? calculateDaysSinceUpdate(
                item.last_updated
            )
            : (
                item.days_since_update ??
                "—"
            );

    return `

        <tr
            style="
                border-bottom:1px solid #dbe3e8;
            "
        >

            <td style="padding:10px;font-weight:700;white-space:nowrap;">
                ${contractId}
            </td>

            <td style="padding:10px;">
                <div style="font-weight:700;color:#063b61;">
                    ${title}
                </div>
            </td>

            <td style="padding:10px;white-space:nowrap;">
                ${municipality}
            </td>

            <td style="padding:10px;font-weight:600;white-space:nowrap;">
                ${programPerson}
            </td>

            <td style="padding:10px;font-weight:600;white-space:nowrap;">
                ${planPerson}
            </td>

            <td style="padding:10px;text-align:center;font-weight:700;">
                ${programPercent}
            </td>

            <td style="padding:10px;text-align:center;font-weight:700;">
                ${planPercent}
            </td>

            <td style="padding:10px;text-align:center;white-space:nowrap;">

                <span
                    class="monitoring-status-badge ${statusClass}"
                    style="
                        display:inline-block;
                        padding:5px 8px;
                        border:1px solid #cbd7df;
                        font-size:9px;
                        font-weight:700;
                        text-transform:uppercase;
                    "
                >
                    ${escapeHTML(
                        overallStatus
                    )}
                </span>

            </td>

            <td style="padding:10px;text-align:center;white-space:nowrap;">
                ${lastUpdated}
            </td>

            <td style="padding:10px;text-align:center;font-weight:700;">
                ${escapeHTML(days)}
            </td>

            <td style="padding:10px;text-align:center;">

                <button
                    type="button"
                    class="button secondary monitoring-edit-button"
                    data-monitoring-id="${escapeHTML(id)}"
                    style="
                        height:32px;
                        padding:0 10px;
                        font-size:9px;
                    "
                >
                    EDIT
                </button>

            </td>

        </tr>

    `;

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
    value
) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(
            value
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return escapeHTML(
            value
        );

    }

    return date.toLocaleDateString(
        "en-PH",
        {
            year:
                "numeric",

            month:
                "short",

            day:
                "2-digit"
        }
    );

}


/* =========================================================
   MONITORING STATUS OPTIONS
========================================================= */

const monitoringStatusOptions = [

    "Not Yet Started",

    "Ongoing",

    "On-going",

    "Completed",

    "For Completion",

    "Not Yet Requested",

    "For Signature",

    "N/A"

];


/* =========================================================
   CREATE MONITORING MODAL
========================================================= */

function ensureMonitoringModal() {

    if (
        $("monitoringEditModal")
    ) {

        return;

    }

    const modal =
        document.createElement(
            "div"
        );

    modal.id =
        "monitoringEditModal";

    modal.style.cssText = `
        position:fixed;
        inset:0;
        background:rgba(3,27,55,.68);
        display:none;
        align-items:center;
        justify-content:center;
        z-index:9999;
        padding:20px;
    `;

    modal.innerHTML = `

        <div
            id="monitoringEditPanel"
            style="
                width:min(1100px,96vw);
                max-height:92vh;
                overflow:auto;
                background:#fff;
                border-top:5px solid #e88924;
                box-shadow:0 20px 60px rgba(0,0,0,.25);
            "
        >

            <div
                style="
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    padding:16px 20px;
                    background:#063b61;
                    color:#fff;
                    position:sticky;
                    top:0;
                    z-index:2;
                "
            >

                <div>

                    <div
                        style="
                            font-size:9px;
                            letter-spacing:1px;
                            opacity:.75;
                        "
                    >
                        PDS / PROJECT CONTROL
                    </div>

                    <h2
                        id="monitoringEditTitle"
                        style="
                            margin:3px 0 0;
                            font-size:18px;
                        "
                    >
                        Edit Project Monitoring
                    </h2>

                </div>

                <button
                    type="button"
                    id="closeMonitoringEdit"
                    style="
                        width:34px;
                        height:34px;
                        border:1px solid rgba(255,255,255,.4);
                        background:transparent;
                        color:#fff;
                        cursor:pointer;
                        font-size:18px;
                    "
                >
                    ×
                </button>

            </div>

            <form
                id="monitoringEditForm"
                style="
                    padding:20px;
                "
            >

                <input
                    type="hidden"
                    id="monitoringRecordId"
                >

                <div
                    id="monitoringEditContent"
                ></div>

                <div
                    style="
                        display:flex;
                        justify-content:flex-end;
                        gap:8px;
                        padding-top:20px;
                        margin-top:20px;
                        border-top:1px solid #dbe3e8;
                    "
                >

                    <button
                        type="button"
                        class="button secondary"
                        id="cancelMonitoringEdit"
                    >
                        CANCEL
                    </button>

                    <button
                        type="submit"
                        class="button primary"
                        id="saveMonitoringButton"
                    >
                        SAVE CHANGES
                    </button>

                </div>

            </form>

        </div>

    `;

    document.body.appendChild(
        modal
    );

}


/* =========================================================
   MONITORING FIELD HELPERS
========================================================= */

function monitoringSelect(
    id,
    label,
    value
) {

    const current =
        value || "";

    const options =
        monitoringStatusOptions
            .map(
                option => `

                    <option
                        value="${escapeHTML(option)}"
                        ${
                            normalizeStatus(
                                option
                            ) ===
                            normalizeStatus(
                                current
                            )
                                ? "selected"
                                : ""
                        }
                    >
                        ${escapeHTML(option)}
                    </option>

                `
            )
            .join("");

    return `

        <label
            style="
                display:block;
                font-size:9px;
                font-weight:700;
                color:#526875;
                text-transform:uppercase;
            "
        >

            ${escapeHTML(label)}

            <select
                id="${escapeHTML(id)}"
                style="
                    width:100%;
                    height:38px;
                    margin-top:5px;
                    padding:0 9px;
                    border:1px solid #c7d5de;
                    background:#fff;
                    border-radius:3px;
                    font-size:11px;
                "
            >

                <option value="">
                    — SELECT —
                </option>

                ${options}

            </select>

        </label>

    `;

}


function monitoringInput(
    id,
    label,
    value,
    type = "text"
) {

    return `

        <label
            style="
                display:block;
                font-size:9px;
                font-weight:700;
                color:#526875;
                text-transform:uppercase;
            "
        >

            ${escapeHTML(label)}

            <input
                id="${escapeHTML(id)}"
                type="${escapeHTML(type)}"
                value="${escapeHTML(value ?? "")}"
                style="
                    width:100%;
                    height:38px;
                    margin-top:5px;
                    padding:0 9px;
                    border:1px solid #c7d5de;
                    background:#fff;
                    border-radius:3px;
                    font-size:11px;
                    box-sizing:border-box;
                "
            >

        </label>

    `;

}


function monitoringTextarea(
    id,
    label,
    value
) {

    return `

        <label
            style="
                display:block;
                font-size:9px;
                font-weight:700;
                color:#526875;
                text-transform:uppercase;
            "
        >

            ${escapeHTML(label)}

            <textarea
                id="${escapeHTML(id)}"
                rows="3"
                style="
                    width:100%;
                    margin-top:5px;
                    padding:8px 9px;
                    border:1px solid #c7d5de;
                    background:#fff;
                    border-radius:3px;
                    font-size:11px;
                    resize:vertical;
                    box-sizing:border-box;
                "
            >${escapeHTML(value ?? "")}</textarea>

        </label>

    `;

}


/* =========================================================
   OPEN MONITORING EDITOR
========================================================= */

function openMonitoringEditor(
    recordId
) {

    ensureMonitoringModal();

    const record =
        cachedMonitoring.find(
            item =>
                String(item.id) ===
                String(recordId)
        );

    if (!record) {

        alert(
            "Monitoring record not found."
        );

        return;
    }

    const modal =
        $("monitoringEditModal");

    const title =
        $("monitoringEditTitle");

    const recordIdInput =
        $("monitoringRecordId");

    const content =
        $("monitoringEditContent");

    if (
        !modal ||
        !content
    ) {

        return;
    }

    if (recordIdInput) {

        recordIdInput.value =
            record.id;

    }

    if (title) {

        title.textContent =
            `Edit Monitoring — ${
                record.contract_id ||
                "Project Record"
            }`;

    }

    content.innerHTML = `

        <div
            style="
                margin-bottom:20px;
                padding:12px 15px;
                background:#f3f7f9;
                border-left:4px solid #e88924;
            "
        >

            <div
                style="
                    font-size:9px;
                    color:#647782;
                    font-weight:700;
                    text-transform:uppercase;
                "
            >
                PROJECT
            </div>

            <div
                style="
                    margin-top:3px;
                    font-size:15px;
                    font-weight:800;
                    color:#063b61;
                "
            >
                ${escapeHTML(
                    record.project_title ||
                    record.project_title_as_per_gaa ||
                    record.title ||
                    "Untitled Project"
                )}
            </div>

            <div
                style="
                    margin-top:4px;
                    font-size:10px;
                    color:#647782;
                "
            >
                CONTRACT ID:
                <strong>
                    ${escapeHTML(
                        record.contract_id ||
                        "—"
                    )}
                </strong>
                &nbsp;&nbsp;
                MUNICIPALITY:
                <strong>
                    ${escapeHTML(
                        record.municipality ||
                        "—"
                    )}
                </strong>
            </div>

        </div>


        <div
            style="
                margin-bottom:18px;
                font-size:12px;
                font-weight:800;
                color:#063b61;
                border-bottom:2px solid #e88924;
                padding-bottom:7px;
            "
        >
            PROJECT INFORMATION
        </div>

        <div
            style="
                display:grid;
                grid-template-columns:
                    repeat(
                        auto-fit,
                        minmax(220px,1fr)
                    );
                gap:12px;
            "
        >

            ${monitoringInput(
                "editCategory",
                "Category",
                record.category
            )}

            ${monitoringInput(
                "editProgram",
                "Program",
                record.program
            )}

            ${monitoringInput(
                "editSubProgram",
                "Sub-Program",
                record.sub_program
            )}

            ${monitoringInput(
                "editMunicipality",
                "Municipality",
                record.municipality
            )}

            ${monitoringInput(
                "editAllocation",
                "Allocation",
                record.allocation
            )}

            ${monitoringInput(
                "editAdvertisementBatch",
                "Advertisement Batch",
                record.advertisement_batch
            )}

        </div>


        <div
            style="
                margin-top:25px;
                margin-bottom:18px;
                font-size:12px;
                font-weight:800;
                color:#063b61;
                border-bottom:2px solid #e88924;
                padding-bottom:7px;
            "
        >
            PROGRAM MONITORING
        </div>

        <div
            style="
                display:grid;
                grid-template-columns:
                    repeat(
                        auto-fit,
                        minmax(220px,1fr)
                    );
                gap:12px;
            "
        >

            ${monitoringInput(
                "editProgramPerson",
                "Program Assigned Personnel",
                record.program2
            )}

            ${monitoringSelect(
                "editCanvass",
                "Canvass",
                record.canvass
            )}

            ${monitoringSelect(
                "editMarketScoping",
                "Market Scoping",
                record.market_scoping
            )}

            ${monitoringSelect(
                "editCertDED",
                "Certificate of DED",
                record.cert_ded
            )}

            ${monitoringSelect(
                "editCertCMPD",
                "Certificate of CMPD",
                record.cert_cmpd
            )}

            ${monitoringSelect(
                "editCertValidation",
                "Certificate of Validation",
                record.cert_validation
            )}

            ${monitoringSelect(
                "editPrintedCompleteProgram",
                "Printed Complete Program",
                record.printed_complete_program
            )}

            ${monitoringSelect(
                "editSubmittedExcelFile",
                "Submitted Excel File",
                record.submitted_excel_file
            )}

            ${monitoringSelect(
                "editProgramStatus",
                "Program Status",
                record.program_status
            )}

            ${monitoringInput(
                "editProgramPercent",
                "Program % Complete",
                parsePercent(
                    record.program_percent
                ) ?? 0,
                "number"
            )}

        </div>

        <div
            style="
                margin-top:12px;
            "
        >

            ${monitoringTextarea(
                "editRemarks",
                "Program Remarks",
                record.remarks
            )}

        </div>


        <div
            style="
                margin-top:25px;
                margin-bottom:18px;
                font-size:12px;
                font-weight:800;
                color:#063b61;
                border-bottom:2px solid #e88924;
                padding-bottom:7px;
            "
        >
            PLAN MONITORING
        </div>

        <div
            style="
                display:grid;
                grid-template-columns:
                    repeat(
                        auto-fit,
                        minmax(220px,1fr)
                    );
                gap:12px;
            "
        >

            ${monitoringInput(
                "editPlanPerson",
                "Plan Assigned Personnel",
                record.plan
            )}

            ${monitoringSelect(
                "editArchitectural",
                "Architectural",
                record.architectural
            )}

            ${monitoringSelect(
                "editStructural",
                "Structural",
                record.structural
            )}

            ${monitoringSelect(
                "editPlumbing",
                "Plumbing",
                record.plumbing
            )}

            ${monitoringSelect(
                "editElectrical",
                "Electrical",
                record.electrical
            )}

            ${monitoringSelect(
                "editMechanical",
                "Mechanical",
                record.mechanical
            )}

            ${monitoringSelect(
                "editSurvey",
                "Survey",
                record.survey
            )}

            ${monitoringSelect(
                "editPrintedCompletePlan",
                "Printed Complete Plan",
                record.printed_complete_plan
            )}

            ${monitoringSelect(
                "editPlanStatus",
                "Plan Status",
                record.plan_status
            )}

            ${monitoringInput(
                "editPlanPercent",
                "Plan % Complete",
                parsePercent(
                    record.plan_percent
                ) ?? 0,
                "number"
            )}

        </div>

        <div
            style="
                margin-top:12px;
            "
        >

            ${monitoringTextarea(
                "editRemarks2",
                "Plan Remarks",
                record.remarks2
            )}

        </div>


        <div
            style="
                margin-top:25px;
                margin-bottom:18px;
                font-size:12px;
                font-weight:800;
                color:#063b61;
                border-bottom:2px solid #e88924;
                padding-bottom:7px;
            "
        >
            OVERALL MONITORING
        </div>

        <div
            style="
                display:grid;
                grid-template-columns:
                    repeat(
                        auto-fit,
                        minmax(220px,1fr)
                    );
                gap:12px;
            "
        >

            ${monitoringSelect(
                "editOverallStatus",
                "Overall Status",
                record.overall_status
            )}

        </div>

        <div
            style="
                margin-top:12px;
                padding:10px 12px;
                background:#f7fafb;
                border:1px solid #d7e1e7;
                font-size:9px;
                color:#687984;
            "
        >
            Saving this record will automatically update
            <strong>LAST UPDATED</strong> to the current date.
        </div>

    `;

    modal.style.display =
        "flex";

}


/* =========================================================
   SAVE MONITORING RECORD
========================================================= */

async function saveMonitoringRecord(
    event
) {

    if (event) {

        event.preventDefault();

    }

    if (
        !db ||
        !currentUser
    ) {

        alert(
            "Please sign in again."
        );

        return;
    }

    const recordId =
        $("monitoringRecordId")
            ?.value;

    if (!recordId) {

        alert(
            "Monitoring record ID is missing."
        );

        return;
    }

    const saveButton =
        $("saveMonitoringButton");

    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            "SAVING...";

    }

    try {

        const now =
            new Date()
                .toISOString();

        const programPercent =
            parsePercent(
                $("editProgramPercent")
                    ?.value
            );

        const planPercent =
            parsePercent(
                $("editPlanPercent")
                    ?.value
            );

        const updateData = {

            category:
                getValue(
                    "editCategory"
                ),

            program:
                getValue(
                    "editProgram"
                ),

            sub_program:
                getValue(
                    "editSubProgram"
                ),

            municipality:
                getValue(
                    "editMunicipality"
                ),

            allocation:
                getValue(
                    "editAllocation"
                ),

            advertisement_batch:
                getValue(
                    "editAdvertisementBatch"
                ),

            program2:
                getValue(
                    "editProgramPerson"
                ),

            plan:
                getValue(
                    "editPlanPerson"
                ),

            canvass:
                getValue(
                    "editCanvass"
                ),

            market_scoping:
                getValue(
                    "editMarketScoping"
                ),

            cert_ded:
                getValue(
                    "editCertDED"
                ),

            cert_cmpd:
                getValue(
                    "editCertCMPD"
                ),

            cert_validation:
                getValue(
                    "editCertValidation"
                ),

            printed_complete_program:
                getValue(
                    "editPrintedCompleteProgram"
                ),

            submitted_excel_file:
                getValue(
                    "editSubmittedExcelFile"
                ),

            remarks:
                getValue(
                    "editRemarks"
                ),

            architectural:
                getValue(
                    "editArchitectural"
                ),

            structural:
                getValue(
                    "editStructural"
                ),

            plumbing:
                getValue(
                    "editPlumbing"
                ),

            electrical:
                getValue(
                    "editElectrical"
                ),

            mechanical:
                getValue(
                    "editMechanical"
                ),

            survey:
                getValue(
                    "editSurvey"
                ),

            printed_complete_plan:
                getValue(
                    "editPrintedCompletePlan"
                ),

            remarks2:
                getValue(
                    "editRemarks2"
                ),

            program_status:
                getValue(
                    "editProgramStatus"
                ),

            program_percent:
                programPercent,

            plan_status:
                getValue(
                    "editPlanStatus"
                ),

            plan_percent:
                planPercent,

            overall_status:
                getValue(
                    "editOverallStatus"
                ),

            last_updated:
                now,

            days_since_update:
                0,

            updated_by:
                currentUser.id,

            updated_at:
                now

        };

        const {
            data,
            error
        } =
            await db
                .from(
                    MONITORING_TABLE
                )
                .update(
                    updateData
                )
                .eq(
                    "id",
                    recordId
                )
                .select()
                .single();

        if (error) {
            throw error;
        }

        console.log(
            "Monitoring record updated:",
            data
        );

        const modal =
            $("monitoringEditModal");

        if (modal) {

            modal.style.display =
                "none";

        }

        await loadMonitoring();

        alert(
            "Project monitoring record updated successfully."
        );

    } catch (error) {

        console.error(
            "Monitoring save error:",
            error
        );

        alert(
            error.message ||
            "Unable to save monitoring record. Check your Supabase table and UPDATE policy."
        );

    } finally {

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "SAVE CHANGES";

        }

    }

}


/* =========================================================
   GET INPUT VALUE
========================================================= */

function getValue(
    id
) {

    return (
        $(id)?.value ??
        ""
    )
        .trim();

}


/* =========================================================
   MONITORING SETUP
========================================================= */

function setupMonitoring() {

    if (monitoringReady) {
        return;
    }

    monitoringReady =
        true;

    ensureMonitoringModal();

    const search =
        $("monitoringSearch");

    const statusFilter =
        $("monitoringStatusFilter");

    const refresh =
        $("refreshMonitoringButton");

    const oneDrive =
        $("openOneDriveMonitoring");

    if (search) {

        search.addEventListener(
            "input",
            () => {

                renderMonitoring(
                    filterMonitoring(
                        cachedMonitoring
                    )
                );

            }
        );

    }

    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            () => {

                renderMonitoring(
                    filterMonitoring(
                        cachedMonitoring
                    )
                );

            }
        );

    }

    if (refresh) {

        refresh.addEventListener(
            "click",
            async () => {

                refresh.disabled =
                    true;

                refresh.textContent =
                    "↻ LOADING...";

                await loadMonitoring();

                refresh.textContent =
                    "↻ REFRESH";

                refresh.disabled =
                    false;

            }
        );

    }

    if (oneDrive) {

        oneDrive.addEventListener(
            "click",
            () => {

                window.open(
                    ONEDRIVE_MONITORING_URL,
                    "_blank",
                    "noopener,noreferrer"
                );

            }
        );

    }

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    ".monitoring-edit-button"
                );

            if (!button) {
                return;
            }

            event.preventDefault();

            openMonitoringEditor(
                button.dataset.monitoringId
            );

        }
    );

    const modal =
        $("monitoringEditModal");

    const close =
        $("closeMonitoringEdit");

    const cancel =
        $("cancelMonitoringEdit");

    const form =
        $("monitoringEditForm");

    if (close) {

        close.addEventListener(
            "click",
            closeMonitoringEditor
        );

    }

    if (cancel) {

        cancel.addEventListener(
            "click",
            closeMonitoringEditor
        );

    }

    if (modal) {

        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    modal
                ) {

                    closeMonitoringEditor();

                }

            }
        );

    }

    if (form) {

        form.addEventListener(
            "submit",
            saveMonitoringRecord
        );

    }

}


/* =========================================================
   CLOSE MONITORING EDITOR
========================================================= */

function closeMonitoringEditor() {

    const modal =
        $("monitoringEditModal");

    if (modal) {

        modal.style.display =
            "none";

    }

}


/* =========================================================
   PDS AI
========================================================= */

function setupPDSAI() {

    if (aiReady) {
        return;
    }

    aiReady =
        true;

    const launcher =
        $("pdsAiLauncher");

    const chatbot =
        $("pdsAiChatbot");

    const send =
        $("pdsAiSend");

    const input =
        $("aiInput");

    const fullButton =
        $("openFullPDSAI");

    const closeButton =
        $("pdsAiClose");

    if (
        launcher &&
        chatbot
    ) {

        launcher.addEventListener(
            "click",
            () => {

                const isHidden =
                    chatbot.style.display ===
                    "none" ||
                    !chatbot.style.display;

                chatbot.style.display =
                    isHidden
                        ? "flex"
                        : "none";

                if (
                    isHidden &&
                    input
                ) {

                    setTimeout(
                        () => {

                            input.focus();

                        },
                        100
                    );

                }

            }
        );

    }

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            () => {

                if (chatbot) {

                    chatbot.style.display =
                        "none";

                }

            }
        );

    }

    if (send) {

        send.addEventListener(
            "click",
            askPDSAI
        );

    }

    if (input) {

        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    askPDSAI();

                }

            }
        );

    }

    if (fullButton) {

        fullButton.addEventListener(
            "click",
            () => {

                showPage(
                    "pds-ai-assistant"
                );

                if (chatbot) {

                    chatbot.style.display =
                        "none";

                }

            }
        );

    }

}


/* =========================================================
   AI MESSAGE
========================================================= */

function appendAIMessage(
    message,
    sender = "ai"
) {

    const response =
        $("aiResponse");

    if (!response) {
        return;
    }

    const element =
        document.createElement(
            "div"
        );

    element.className =
        `ai-message ${sender}`;

    element.textContent =
        message;

    response.appendChild(
        element
    );

    response.scrollTop =
        response.scrollHeight;

}


/* =========================================================
   ASK PDS AI
========================================================= */

async function askPDSAI() {

    const input =
        $("aiInput");

    const send =
        $("pdsAiSend");

    if (!input || !db) {
        return;
    }

    const message =
        input.value.trim();

    if (!message) {
        return;
    }

    appendAIMessage(
        message,
        "user"
    );

    input.value =
        "";

    if (send) {

        send.disabled =
            true;

    }

    appendAIMessage(
        "PDS AI is thinking...",
        "ai"
    );

    try {

        const {
            data,
            error
        } =
            await db.functions.invoke(
                "PDS-AI",
                {
                    body: {

                        message:
                            message,

                        history:
                            pdsAIHistory

                    }
                }
            );

        if (error) {
            throw error;
        }

        const answer =
            data?.answer ||
            data?.response ||
            data?.message ||
            "PDS AI did not return a response.";

        removeThinkingMessage();

        appendAIMessage(
            answer,
            "ai"
        );

        pdsAIHistory.push({

            role:
                "user",

            content:
                message

        });

        pdsAIHistory.push({

            role:
                "assistant",

            content:
                answer

        });

    } catch (error) {

        console.error(
            "PDS AI error:",
            error
        );

        removeThinkingMessage();

        appendAIMessage(
            "PDS AI could not respond. Please try again.",
            "ai"
        );

    } finally {

        if (send) {

            send.disabled =
                false;

        }

        if (input) {

            input.focus();

        }

    }

}


/* =========================================================
   REMOVE AI THINKING
========================================================= */

function removeThinkingMessage() {

    const response =
        $("aiResponse");

    if (!response) {
        return;
    }

    const messages =
        response.querySelectorAll(
            ".ai-message.ai"
        );

    const last =
        messages[
            messages.length - 1
        ];

    if (
        last &&
        last.textContent ===
            "PDS AI is thinking..."
    ) {

        last.remove();

    }

}


/* =========================================================
   NOTIFICATIONS
========================================================= */

function setupNotifications() {

    const button =
        $("notificationButton");

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        () => {

            alert(
                "No new PDS notifications."
            );

        }
    );

}


/* =========================================================
   REFRESH BUTTON
========================================================= */

function setupRefreshButton() {

    const button =
        $("refreshButton");

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        async () => {

            button.classList.add(
                "is-loading"
            );

            await refreshAll();

            setTimeout(
                () => {

                    button.classList.remove(
                        "is-loading"
                    );

                },
                300
            );

        }
    );

}


/* =========================================================
   AUTH FORMS
========================================================= */

function setupAuthForms() {

    if (authFormsReady) {
        return;
    }

    authFormsReady =
        true;

    const loginForm =
        $("loginForm");

    if (!loginForm) {

        console.warn(
            "PDS: loginForm not found."
        );

        return;
    }

    loginForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const email =
                $("loginEmail")
                    ?.value
                    .trim();

            const password =
                $("loginPassword")
                    ?.value ||
                "";

            if (
                !email ||
                !password
            ) {

                authMessage(
                    "Please enter your email and password.",
                    "error"
                );

                return;
            }

            const button =
                loginForm.querySelector(
                    'button[type="submit"]'
                );

            if (button) {

                button.disabled =
                    true;

                button.textContent =
                    "SIGNING IN...";

            }

            await loginUser(
                email,
                password
            );

            if (button) {

                button.disabled =
                    false;

                button.textContent =
                    "SIGN IN";

            }

        }
    );

}


/* =========================================================
   SIGN OUT BUTTON
========================================================= */

function setupSignOut() {

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    '[data-action="signout"], #signOutButton, #logoutButton'
                );

            if (!button) {
                return;
            }

            event.preventDefault();

            signOut();

        }
    );

}


/* =========================================================
   AUTH STATE CHANGE
========================================================= */

function setupAuthStateListener() {

    if (!db) {
        return;
    }

    db.auth.onAuthStateChange(
        (
            event,
            session
        ) => {

            console.log(
                "PDS Auth Event:",
                event
            );

            if (
                event ===
                "SIGNED_OUT"
            ) {

                currentUser =
                    null;

                currentProfile =
                    null;

                pdsAIHistory =
                    [];

                cachedMonitoring =
                    [];

                showLogin();

                return;
            }

            if (
                session &&
                session.user
            ) {

                currentUser =
                    session.user;

                hideLogin();

                if (
                    event ===
                    "SIGNED_IN" ||
                    event ===
                    "INITIAL_SESSION"
                ) {

                    showPage(
                        "dashboard"
                    );

                }

                updateUserInterface();

            }

        }
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   ESCAPE JAVASCRIPT
========================================================= */

function escapeJS(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    return String(value)

        .replace(
            /\\/g,
            "\\\\"
        )

        .replace(
            /'/g,
            "\\'"
        )

        .replace(
            /"/g,
            '\\"'
        )

        .replace(
            /\n/g,
            "\\n"
        )

        .replace(
            /\r/g,
            "\\r"
        );

}


/* =========================================================
   INITIALIZATION
========================================================= */

async function initializePDS() {

    if (initialized) {
        return;
    }

    initialized =
        true;

    console.log(
        "PDS — Initializing..."
    );

    const authScreen =
        $("authScreen");

    const app =
        $("app");

    if (authScreen) {

        authScreen.style.display =
            "none";

    }

    if (app) {

        app.style.display =
            "none";

    }

    const supabaseReady =
        initializeSupabase();

    if (!supabaseReady) {

        console.error(
            "PDS: Supabase initialization failed."
        );

        showLogin();

        authMessage(
            "Supabase configuration error. Check your Publishable API key in script.js.",
            "error"
        );

        return;
    }

    setupNavigation();

    setupSectionTargets();

    setupGlobalSearch();

    setupAuthForms();

    setupSignOut();

    setupProjectModal();

    setupDocumentModal();

    setupDocumentForm();

    setupDocumentUpload();

    setupDocumentSearch();

    setupDepartmentOrderFilters();

    setupMonitoring();

    setupPDSAI();

    setupNotifications();

    setupRefreshButton();

    setupAuthStateListener();

    await restoreSession();

    console.log(
        "PDS — Ready."
    );

}


/* =========================================================
   START
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializePDS
    );

} else {

    initializePDS();

}
/* =========================================================
   GITHUB PROJECT MONITORING
========================================================= */

function normalizeMonitoringName(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function getCurrentMonitoringName() {
    /*
     * Uses the logged-in user's profile name.
     * If monitoring_name exists in the profile, use that first.
     */
    return normalizeMonitoringName(
        currentProfile?.monitoring_name ||
        currentProfile?.full_name ||
        currentUser?.user_metadata?.full_name ||
        ""
    );
}

function getAssignedMonitoringProjects() {
    if (!Array.isArray(monitoringData)) {
        return [];
    }

    const userName = getCurrentMonitoringName();

    if (!userName) {
        return [];
    }

    return monitoringData.filter(project => {
        const program = normalizeMonitoringName(project.program2);
        const plan = normalizeMonitoringName(project.plan);

        return program === userName || plan === userName;
    });
}

function renderMonitoringProjects() {

    const container = document.getElementById("monitoringList");

    if (!container) return;

    const projects = getAssignedMonitoringProjects();

    const searchInput =
        document.getElementById("monitoringSearch");

    const statusFilter =
        document.getElementById("monitoringStatusFilter");

    const search = normalizeMonitoringName(
        searchInput?.value || ""
    );

    const status =
        normalizeMonitoringName(
            statusFilter?.value || ""
        );

    const filtered = projects.filter(project => {

        const searchable = [
            project.contract_id,
            project.project_title,
            project.municipality,
            project.program2,
            project.plan
        ]
            .join(" ")
            .toLowerCase();

        if (search && !searchable.includes(search)) {
            return false;
        }

        if (status) {
            const projectStatus =
                normalizeMonitoringName(
                    project.overall_status
                );

            if (projectStatus !== status) {
                return false;
            }
        }

        return true;
    });

    if (!filtered.length) {

        container.innerHTML = `
            <div style="
                padding:40px;
                text-align:center;
                color:var(--muted);
                border:1px solid #d5e0e7;
                background:#f8fafb;
            ">
                <div style="
                    font-size:22px;
                    margin-bottom:8px;
                ">⌕</div>

                <strong style="
                    color:var(--navy);
                    font-size:11px;
                ">
                    NO ASSIGNED PROJECTS FOUND
                </strong>

                <div style="
                    margin-top:6px;
                    font-size:9px;
                ">
                    Projects assigned through PROGRAM2 or PLAN
                    will appear here.
                </div>
            </div>
        `;

        updateMonitoringStats([]);
        return;
    }

    container.innerHTML = `
        <table style="
            width:100%;
            border-collapse:collapse;
            font-size:9px;
            min-width:900px;
        ">
            <thead>
                <tr style="
                    background:#063b61;
                    color:#fff;
                    text-align:left;
                ">
                    <th style="padding:10px;">CONTRACT ID</th>
                    <th style="padding:10px;">PROJECT</th>
                    <th style="padding:10px;">MUNICIPALITY</th>
                    <th style="padding:10px;">PROGRAM</th>
                    <th style="padding:10px;">PLAN</th>
                    <th style="padding:10px;">STATUS</th>
                    <th style="padding:10px;">ACTION</th>
                </tr>
            </thead>

            <tbody>
                ${filtered.map((project, index) => {

                    const status =
                        project.overall_status ||
                        "Not Yet Started";

                    return `
                        <tr style="
                            border-bottom:1px solid #d9e2e8;
                            background:#fff;
                        ">

                            <td style="
                                padding:10px;
                                font-weight:700;
                                color:#063b61;
                            ">
                                ${escapeHTML(project.contract_id || "")}
                            </td>

                            <td style="padding:10px;">
                                ${escapeHTML(
                                    project.project_title ||
                                    "Project details not yet encoded"
                                )}
                            </td>

                            <td style="padding:10px;">
                                ${escapeHTML(
                                    project.municipality || "—"
                                )}
                            </td>

                            <td style="padding:10px;">
                                ${escapeHTML(
                                    project.program2 || "—"
                                )}
                            </td>

                            <td style="padding:10px;">
                                ${escapeHTML(
                                    project.plan || "—"
                                )}
                            </td>

                            <td style="padding:10px;">
                                <span style="
                                    display:inline-block;
                                    padding:5px 8px;
                                    border:1px solid #d5e0e7;
                                    background:#f5f8fa;
                                    font-weight:700;
                                ">
                                    ${escapeHTML(status)}
                                </span>
                            </td>

                            <td style="
                                padding:10px;
                                white-space:nowrap;
                            ">

                                <button
                                    type="button"
                                    class="button secondary"
                                    onclick="viewMonitoringProject('${escapeJS(project.contract_id || "")}')"
                                >
                                    VIEW
                                </button>

                                <button
                                    type="button"
                                    class="button primary"
                                    onclick="editMonitoringProject('${escapeJS(project.contract_id || "")}')"
                                >
                                    EDIT
                                </button>

                            </td>

                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;

    updateMonitoringStats(filtered);
}

function updateMonitoringStats(projects) {

    const total =
        document.getElementById("monitoringTotalProjects");

    const notStarted =
        document.getElementById("monitoringNotStarted");

    const ongoing =
        document.getElementById("monitoringOngoing");

    const forCompletion =
        document.getElementById("monitoringForCompletion");

    const completed =
        document.getElementById("monitoringCompleted");

    const overall =
        document.getElementById("monitoringOverallProgress");

    if (!Array.isArray(projects)) {
        projects = [];
    }

    if (total) {
        total.textContent = projects.length;
    }

    let notStartedCount = 0;
    let ongoingCount = 0;
    let completionCount = 0;
    let completedCount = 0;

    projects.forEach(project => {

        const status =
            normalizeMonitoringName(
                project.overall_status ||
                "Not Yet Started"
            );

        if (
            status === "not started" ||
            status === "not yet started"
        ) {
            notStartedCount++;
        }

        else if (
            status === "ongoing" ||
            status === "on-going"
        ) {
            ongoingCount++;
        }

        else if (
            status === "for completion"
        ) {
            completionCount++;
        }

        else if (
            status === "completed"
        ) {
            completedCount++;
        }
    });

    if (notStarted) {
        notStarted.textContent = notStartedCount;
    }

    if (ongoing) {
        ongoing.textContent = ongoingCount;
    }

    if (forCompletion) {
        forCompletion.textContent = completionCount;
    }

    if (completed) {
        completed.textContent = completedCount;
    }

    /*
     * Percent data is not yet available in the GitHub
     * assignment file, so do not invent a percentage.
     */
    if (overall) {
        overall.textContent = "—";
    }
}

function loadMonitoring() {

    try {

        if (!Array.isArray(monitoringData)) {
            console.warn(
                "monitoringData is not available."
            );
            return;
        }

        renderMonitoringProjects();

    } catch (error) {

        console.error(
            "Monitoring load error:",
            error
        );
    }
}

function setupMonitoring() {

    const search =
        document.getElementById("monitoringSearch");

    const status =
        document.getElementById("monitoringStatusFilter");

    const refresh =
        document.getElementById("refreshMonitoringButton");

    if (search) {
        search.addEventListener(
            "input",
            renderMonitoringProjects
        );
    }

    if (status) {
        status.addEventListener(
            "change",
            renderMonitoringProjects
        );
    }

    if (refresh) {
        refresh.addEventListener(
            "click",
            loadMonitoring
        );
    }

    loadMonitoring();
}

function viewMonitoringProject(contractId) {

    const project =
        monitoringData.find(
            item =>
                String(item.contract_id) ===
                String(contractId)
        );

    if (!project) {
        alert("Project record not found.");
        return;
    }

    const existing =
        document.getElementById("monitoringDetailModal");

    if (existing) {
        existing.remove();
    }

    const modal = document.createElement("div");

    modal.id = "monitoringDetailModal";

    modal.style.cssText = `
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.55);
        z-index:9999;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:20px;
    `;

    modal.innerHTML = `
        <div style="
            width:min(900px,96vw);
            max-height:90vh;
            overflow:auto;
            background:#fff;
            border-radius:5px;
            box-shadow:0 20px 60px rgba(0,0,0,.30);
        ">

            <div style="
                background:#063b61;
                color:#fff;
                padding:18px 20px;
                display:flex;
                justify-content:space-between;
                align-items:center;
            ">

                <div>
                    <div style="
                        font-size:9px;
                        letter-spacing:1px;
                        opacity:.75;
                    ">
                        PDS / PROJECT CONTROL
                    </div>

                    <div style="
                        font-size:18px;
                        font-weight:700;
                        margin-top:4px;
                    ">
                        PROJECT DETAILS
                    </div>
                </div>

                <button
                    type="button"
                    onclick="document.getElementById('monitoringDetailModal')?.remove()"
                    style="
                        border:0;
                        background:transparent;
                        color:#fff;
                        font-size:22px;
                        cursor:pointer;
                    "
                >
                    ×
                </button>

            </div>

            <div style="padding:20px;">

                <div style="
                    display:grid;
                    grid-template-columns:repeat(2,minmax(0,1fr));
                    gap:15px;
                ">

                    <div>
                        <div class="stat-label">
                            CONTRACT ID
                        </div>
                        <strong>
                            ${escapeHTML(project.contract_id || "—")}
                        </strong>
                    </div>

                    <div>
                        <div class="stat-label">
                            MUNICIPALITY
                        </div>
                        <strong>
                            ${escapeHTML(project.municipality || "—")}
                        </strong>
                    </div>

                    <div style="grid-column:1/-1;">
                        <div class="stat-label">
                            PROJECT TITLE
                        </div>

                        <div style="
                            margin-top:5px;
                            padding:12px;
                            background:#f5f8fa;
                            border:1px solid #d5e0e7;
                            font-weight:600;
                        ">
                            ${escapeHTML(
                                project.project_title ||
                                "Project title not yet encoded"
                            )}
                        </div>
                    </div>

                    <div>
                        <div class="stat-label">
                            PROGRAM PERSONNEL
                        </div>

                        <strong>
                            ${escapeHTML(project.program2 || "—")}
                        </strong>
                    </div>

                    <div>
                        <div class="stat-label">
                            PLAN PERSONNEL
                        </div>

                        <strong>
                            ${escapeHTML(project.plan || "—")}
                        </strong>
                    </div>

                    <div>
                        <div class="stat-label">
                            PROGRAM
                        </div>

                        <span>
                            ${escapeHTML(project.program || "—")}
                        </span>
                    </div>

                    <div>
                        <div class="stat-label">
                            SUB-PROGRAM
                        </div>

                        <span>
                            ${escapeHTML(project.sub_program || "—")}
                        </span>
                    </div>

                    <div>
                        <div class="stat-label">
                            ADVERTISEMENT BATCH
                        </div>

                        <span>
                            ${escapeHTML(
                                project.advertisement_batch || "—"
                            )}
                        </span>
                    </div>

                    <div>
                        <div class="stat-label">
                            STATUS
                        </div>

                        <span>
                            ${escapeHTML(
                                project.overall_status ||
                                "Not Yet Started"
                            )}
                        </span>
                    </div>

                </div>

                <div style="
                    margin-top:20px;
                    padding-top:15px;
                    border-top:1px solid #d5e0e7;
                    display:flex;
                    justify-content:flex-end;
                    gap:8px;
                ">

                    <button
                        type="button"
                        class="button secondary"
                        onclick="document.getElementById('monitoringDetailModal')?.remove()"
                    >
                        CLOSE
                    </button>

                    <button
                        type="button"
                        class="button primary"
                        onclick="editMonitoringProject('${escapeJS(project.contract_id || "")}')"
                    >
                        EDIT PROJECT
                    </button>

                </div>

            </div>
        </div>
    `;

    document.body.appendChild(modal);
}
function editMonitoringProject(contractId) {

    const project =
        monitoringData.find(
            item =>
                String(item.contract_id) ===
                String(contractId)
        );

    if (!project) {
        alert("Project record not found.");
        return;
    }

    document.getElementById("monitoringDetailModal")?.remove();

    const existing =
        document.getElementById("monitoringEditModal");

    if (existing) {
        existing.remove();
    }

    const modal = document.createElement("div");

    modal.id = "monitoringEditModal";

    modal.style.cssText = `
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.55);
        z-index:9999;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:20px;
    `;

    modal.innerHTML = `
        <div style="
            width:min(900px,96vw);
            max-height:90vh;
            overflow:auto;
            background:#fff;
            border-radius:5px;
            box-shadow:0 20px 60px rgba(0,0,0,.30);
        ">

            <div style="
                background:#063b61;
                color:#fff;
                padding:18px 20px;
                display:flex;
                justify-content:space-between;
                align-items:center;
            ">

                <div>
                    <div style="
                        font-size:9px;
                        letter-spacing:1px;
                        opacity:.75;
                    ">
                        PDS / PROJECT CONTROL
                    </div>

                    <div style="
                        font-size:18px;
                        font-weight:700;
                        margin-top:4px;
                    ">
                        EDIT PROJECT
                    </div>
                </div>

                <button
                    type="button"
                    onclick="document.getElementById('monitoringEditModal')?.remove()"
                    style="
                        border:0;
                        background:transparent;
                        color:#fff;
                        font-size:22px;
                        cursor:pointer;
                    "
                >
                    ×
                </button>

            </div>

            <form
                id="monitoringEditForm"
                style="padding:20px;"
            >

                <div style="
                    display:grid;
                    grid-template-columns:repeat(2,minmax(0,1fr));
                    gap:15px;
                ">

                    <div>
                        <label class="stat-label">
                            CONTRACT ID
                        </label>

                        <input
                            type="text"
                            id="editMonitoringContractId"
                            value="${escapeHTML(project.contract_id || "")}"
                            readonly
                            style="
                                width:100%;
                                box-sizing:border-box;
                                height:38px;
                                padding:0 10px;
                                border:1px solid #c7d5de;
                                background:#f1f4f6;
                                border-radius:3px;
                            "
                        >
                    </div>

                    <div>
                        <label class="stat-label">
                            MUNICIPALITY
                        </label>

                        <input
                            type="text"
                            id="editMonitoringMunicipality"
                            value="${escapeHTML(project.municipality || "")}"
                            style="
                                width:100%;
                                box-sizing:border-box;
                                height:38px;
                                padding:0 10px;
                                border:1px solid #c7d5de;
                                border-radius:3px;
                            "
                        >
                    </div>

                    <div style="grid-column:1/-1;">

                        <label class="stat-label">
                            PROJECT TITLE
                        </label>

                        <textarea
                            id="editMonitoringProjectTitle"
                            rows="3"
                            style="
                                width:100%;
                                box-sizing:border-box;
                                padding:10px;
                                border:1px solid #c7d5de;
                                border-radius:3px;
                                resize:vertical;
                            "
                        >${escapeHTML(project.project_title || "")}</textarea>

                    </div>

                    <div>

                        <label class="stat-label">
                            PROGRAM PERSONNEL
                        </label>

                        <input
                            type="text"
                            id="editMonitoringProgram"
                            value="${escapeHTML(project.program2 || "")}"
                            style="
                                width:100%;
                                box-sizing:border-box;
                                height:38px;
                                padding:0 10px;
                                border:1px solid #c7d5de;
                                border-radius:3px;
                            "
                        >

                    </div>

                    <div>

                        <label class="stat-label">
                            PLAN PERSONNEL
                        </label>

                        <input
                            type="text"
                            id="editMonitoringPlan"
                            value="${escapeHTML(project.plan || "")}"
                            style="
                                width:100%;
                                box-sizing:border-box;
                                height:38px;
                                padding:0 10px;
                                border:1px solid #c7d5de;
                                border-radius:3px;
                            "
                        >

                    </div>

                    <div>

                        <label class="stat-label">
                            PROGRAM
                        </label>

                        <input
                            type="text"
                            id="editMonitoringProgramName"
                            value="${escapeHTML(project.program || "")}"
                            style="
                                width:100%;
                                box-sizing:border-box;
                                height:38px;
                                padding:0 10px;
                                border:1px solid #c7d5de;
                                border-radius:3px;
                            "
                        >

                    </div>

                    <div>

                        <label class="stat-label">
                            SUB-PROGRAM
                        </label>

                        <input
                            type="text"
                            id="editMonitoringSubProgram"
                            value="${escapeHTML(project.sub_program || "")}"
                            style="
                                width:100%;
                                box-sizing:border-box;
                                height:38px;
                                padding:0 10px;
                                border:1px solid #c7d5de;
                                border-radius:3px;
                            "
                        >

                    </div>

                    <div>

                        <label class="stat-label">
                            ADVERTISEMENT BATCH
                        </label>

                        <input
                            type="text"
                            id="editMonitoringAdvertisement"
                            value="${escapeHTML(project.advertisement_batch || "")}"
                            style="
                                width:100%;
                                box-sizing:border-box;
                                height:38px;
                                padding:0 10px;
                                border:1px solid #c7d5de;
                                border-radius:3px;
                            "
                        >

                    </div>

                    <div>

                        <label class="stat-label">
                            STATUS
                        </label>

                        <select
                            id="editMonitoringStatus"
                            style="
                                width:100%;
                                box-sizing:border-box;
                                height:38px;
                                padding:0 10px;
                                border:1px solid #c7d5de;
                                border-radius:3px;
                                background:#fff;
                            "
                        >
                            <option value="Not Yet Started">NOT YET STARTED</option>
                            <option value="Ongoing">ONGOING</option>
                            <option value="For Completion">FOR COMPLETION</option>
                            <option value="Completed">COMPLETED</option>
                        </select>

                    </div>

                </div>

                <div style="
                    margin-top:20px;
                    padding-top:15px;
                    border-top:1px solid #d5e0e7;
                    display:flex;
                    justify-content:flex-end;
                    gap:8px;
                ">

                    <button
                        type="button"
                        class="button secondary"
                        onclick="document.getElementById('monitoringEditModal')?.remove()"
                    >
                        CANCEL
                    </button>

                    <button
                        type="submit"
                        class="button primary"
                    >
                        SAVE CHANGES
                    </button>

                </div>

            </form>
        </div>
    `;

    document.body.appendChild(modal);

    const statusSelect =
        document.getElementById("editMonitoringStatus");

    if (statusSelect) {
        statusSelect.value =
            project.overall_status ||
            "Not Yet Started";
    }

    const form =
        document.getElementById("monitoringEditForm");

    if (form) {

        form.addEventListener("submit", function(event) {

            event.preventDefault();

            project.municipality =
                document.getElementById(
                    "editMonitoringMunicipality"
                ).value.trim();

            project.project_title =
                document.getElementById(
                    "editMonitoringProjectTitle"
                ).value.trim();

            project.program2 =
                document.getElementById(
                    "editMonitoringProgram"
                ).value.trim();

            project.plan =
                document.getElementById(
                    "editMonitoringPlan"
                ).value.trim();

            project.program =
                document.getElementById(
                    "editMonitoringProgramName"
                ).value.trim();

            project.sub_program =
                document.getElementById(
                    "editMonitoringSubProgram"
                ).value.trim();

            project.advertisement_batch =
                document.getElementById(
                    "editMonitoringAdvertisement"
                ).value.trim();

            project.overall_status =
                document.getElementById(
                    "editMonitoringStatus"
                ).value;

            modal.remove();

            renderMonitoringProjects();

            alert(
                "Project updated on this website."
            );
        });

    }
}
