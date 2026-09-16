```javascript
/* =========================================================
   PDS — PLANNING & DESIGN SECTION
   COMPLETE SCRIPT

   AUTH + SESSION
   DASHBOARD
   PROJECTS
   DOCUMENTS
   DEPARTMENT ORDERS
   PROJECT MONITORING
   PDS AI
   ========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
    "https://zvwghoabsqfyakbqzhil.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_oJ3Zc3TplfYgePQEmTrJ8Q_qycxR0jQ";


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

let cachedMonitoringProjects = [];

let navigationReady = false;

let authFormsReady = false;

let documentSearchReady = false;

let aiReady = false;

let monitoringFiltersReady = false;

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

        id:
            user.id,

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

            loadDepartmentOrders()

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

    console.log(
        "PDS: Signing out..."
    );


    try {

        if (!db) {

            console.warn(
                "PDS: Supabase client is not initialized."
            );

            currentUser = null;

            currentProfile = null;

            cachedDocuments = [];

            cachedMonitoringProjects = [];

            pdsAIHistory = [];

            showLogin();

            return;

        }


        const {
            error
        } =
            await db.auth.signOut({
                scope: "local"
            });


        if (error) {

            console.error(
                "PDS SIGN OUT ERROR:",
                error
            );


            currentUser = null;

            currentProfile = null;

            cachedDocuments = [];

            cachedMonitoringProjects = [];

            pdsAIHistory = [];


            try {

                localStorage.removeItem(
                    "pds-supabase-auth"
                );

            } catch (storageError) {

                console.warn(
                    "Unable to clear auth storage:",
                    storageError
                );

            }


            showLogin();

            return;

        }


        console.log(
            "PDS: Supabase sign out successful."
        );


    } catch (error) {

        console.error(
            "PDS SIGN OUT EXCEPTION:",
            error
        );


        currentUser = null;

        currentProfile = null;

        cachedDocuments = [];

        cachedMonitoringProjects = [];

        pdsAIHistory = [];


        try {

            localStorage.removeItem(
                "pds-supabase-auth"
            );

        } catch (storageError) {

            console.warn(
                "Auth storage cleanup warning:",
                storageError
            );

        }


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

            loadDepartmentOrders()

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


                await loadUserProfile();


                updateUserInterface();


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


    const profileName =
        $("profileName");

    const profileEmail =
        $("profileEmail");

    const welcomeName =
        $("welcomeName");

    const topAvatar =
        $("topAvatar");

    const sidebarAvatar =
        $("sidebarAvatar");


    if (profileName) {

        profileName.textContent =
            name;

    }


    if (profileEmail) {

        profileEmail.textContent =
            email;

    }


    if (welcomeName) {

        welcomeName.textContent =
            name;

    }


    const initial =
        name
            .charAt(0)
            .toUpperCase();


    if (topAvatar) {

        topAvatar.textContent =
            initial;

    }


    if (sidebarAvatar) {

        sidebarAvatar.textContent =
            initial;

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

        loadProjectMonitoring();

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


            const projectMatch =
                document.querySelectorAll(
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

        loadDepartmentOrders()

    ]);


    if (
        document
            .getElementById(
                "monitoring"
            )
            ?.classList
            .contains("active")
    ) {

        await loadProjectMonitoring();

    }

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
                            data-project-id="${escapeHTML(
                                project.id || ""
                            )}"
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
                            onclick="openDocument('${escapeJS(
                                document.id || ""
                            )}')"
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


    if (
        !input ||
        !db
    ) {

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

    const buttons =
        document.querySelectorAll(
            "#logoutButton, #signOutButton, [data-action='signout']"
        );


    if (!buttons.length) {

        console.warn(
            "PDS: Sign Out button was not found."
        );

        return;

    }


    buttons.forEach(
        button => {

            if (
                button.dataset.signoutReady ===
                "true"
            ) {

                return;

            }


            button.dataset.signoutReady =
                "true";


            button.addEventListener(
                "click",
                async event => {

                    event.preventDefault();

                    event.stopPropagation();


                    console.log(
                        "PDS: Sign Out button clicked."
                    );


                    await signOut();

                }
            );


            button.addEventListener(
                "keydown",
                async event => {

                    if (
                        event.key ===
                            "Enter" ||
                        event.key ===
                            " "
                    ) {

                        event.preventDefault();

                        event.stopPropagation();


                        console.log(
                            "PDS: Sign Out keyboard action."
                        );


                        await signOut();

                    }

                }
            );

        }
    );


    console.log(
        `PDS: ${buttons.length} Sign Out button(s) ready.`
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

                cachedDocuments =
                    [];

                cachedMonitoringProjects =
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
   PROJECT MONITORING
   TEMPORARY LOCAL DATA

   This is intentionally NOT loaded from Supabase.

   This allows us to verify the monitoring UI using
   the actual monitoring records before connecting
   OneDrive / Excel.
========================================================= */

const monitoringTestData = [

    {
        "CATEGORY": "Infrastructure",
        "PROGRAM": "Infrastructure Program",
        "SUB-PROGRAM": "Buildings",
        "PROJECT TITLE AS PER GAA":
            "Construction of Multi-Purpose Building, Barangay Poblacion D, Rosario, Batangas (13.842248°, 121.200737°)",
        "NO. OF PROJS": 1,
        "ALLOCATION": 13000000,
        "MUNICIPALITY": "Rosario, Batangas",
        "PROGRAM2": "Christine",
        "PLAN": "Jessica",
        "ADVERTISEMENT BATCH": "Batch 1",
        "CONTRACT ID": "26DD0005",
        "CANVASS": "On-going",
        "MARKET SCOPING": "Completed",
        "CERT OF DED": "Completed",
        "CERT OF CMPD": "Completed",
        "CERT OF VALIDATION": "Completed",
        "PRINTED COMPLETE PROGRAM": "Ongoing",
        "SUBMITTED EXCEL FILE": "Not Yet Submitted",
        "REMARKS": "",
        "ARCHITECTURAL": "Completed",
        "STRUCTURAL": "Completed",
        "PLUMBING": "Completed",
        "ELECTRICAL": "Completed",
        "MECHANICAL": "Completed",
        "SURVEY": "N/A",
        "PRINTED COMPLETE PLAN": "For Signiture",
        "REMARKS2": "",
        "PROGRAM STATUS": "Ongoing",
        "PROGRAM % COMPLETE": "77.86%",
        "PLAN STATUS": "For Completion",
        "PLAN % COMPLETE": "83.33%",
        "LAST UPDATED": "2026-09-16",
        "DAYS SINCE UPDATE": 0,
        "OVERALL STATUS": "In Progress"
    },


    {
        "CATEGORY": "Infrastructure",
        "PROGRAM": "Infrastructure Program",
        "SUB-PROGRAM": "Buildings",
        "PROJECT TITLE AS PER GAA":
            "Construction of Multi-purpose Building (Barangay Hall) at Brgy. Mataas na Lupa, Taysan, Batangas",
        "NO. OF PROJS": 1,
        "ALLOCATION": 13000000,
        "MUNICIPALITY": "Taysan, Batangas",
        "PROGRAM2": "Christine",
        "PLAN": "Carlo",
        "ADVERTISEMENT BATCH": "Batch 2",
        "CONTRACT ID": "26DD0014",
        "CANVASS": "",
        "MARKET SCOPING": "",
        "CERT OF DED": "",
        "CERT OF CMPD": "",
        "CERT OF VALIDATION": "",
        "PRINTED COMPLETE PROGRAM": "",
        "SUBMITTED EXCEL FILE": "",
        "REMARKS": "",
        "ARCHITECTURAL": "",
        "STRUCTURAL": "",
        "PLUMBING": "",
        "ELECTRICAL": "",
        "MECHANICAL": "",
        "SURVEY": "",
        "PRINTED COMPLETE PLAN": "",
        "REMARKS2": "",
        "PROGRAM STATUS": "Ongoing",
        "PROGRAM % COMPLETE": "66.67%",
        "PLAN STATUS": "For Completion",
        "PLAN % COMPLETE": "83.33%",
        "LAST UPDATED": "2026-09-16",
        "DAYS SINCE UPDATE": 0,
        "OVERALL STATUS": "In Progress"
    },


    {
        "CATEGORY": "Infrastructure",
        "PROGRAM": "Infrastructure Program",
        "SUB-PROGRAM": "Buildings",
        "PROJECT TITLE AS PER GAA":
            "Construction (Completion) of Multi-Purpose Building, Barangay Bago, Ibaan, Batangas (13.808654°, 121.117460°)",
        "NO. OF PROJS": 1,
        "ALLOCATION": 13000000,
        "MUNICIPALITY": "Ibaan, Batangas",
        "PROGRAM2": "Christine",
        "PLAN": "Carlo",
        "ADVERTISEMENT BATCH": "Batch 3",
        "CONTRACT ID": "26DD0026",
        "CANVASS": "",
        "MARKET SCOPING": "",
        "CERT OF DED": "",
        "CERT OF CMPD": "",
        "CERT OF VALIDATION": "",
        "PRINTED COMPLETE PROGRAM": "",
        "SUBMITTED EXCEL FILE": "",
        "REMARKS": "",
        "ARCHITECTURAL": "",
        "STRUCTURAL": "",
        "PLUMBING": "",
        "ELECTRICAL": "",
        "MECHANICAL": "",
        "SURVEY": "",
        "PRINTED COMPLETE PLAN": "",
        "REMARKS2": "",
        "PROGRAM STATUS": "Ongoing",
        "PROGRAM % COMPLETE": "64.29%",
        "PLAN STATUS": "For Completion",
        "PLAN % COMPLETE": "83.33%",
        "LAST UPDATED": "2026-09-16",
        "DAYS SINCE UPDATE": 0,
        "OVERALL STATUS": "In Progress"
    },


    {
        "CATEGORY": "Infrastructure",
        "PROGRAM": "Infrastructure Program",
        "SUB-PROGRAM": "Buildings",
        "PROJECT TITLE AS PER GAA":
            "Construction of Multi-purpose Building in Brgy. Don Luis, San Jose, Batangas",
        "NO. OF PROJS": 1,
        "ALLOCATION": 13000000,
        "MUNICIPALITY": "San Jose, Batangas",
        "PROGRAM2": "Christine",
        "PLAN": "Carlo",
        "ADVERTISEMENT BATCH": "Batch 5",
        "CONTRACT ID": "26DD0032",
        "CANVASS": "",
        "MARKET SCOPING": "",
        "CERT OF DED": "",
        "CERT OF CMPD": "",
        "CERT OF VALIDATION": "",
        "PRINTED COMPLETE PROGRAM": "",
        "SUBMITTED EXCEL FILE": "",
        "REMARKS": "",
        "ARCHITECTURAL": "",
        "STRUCTURAL": "",
        "PLUMBING": "",
        "ELECTRICAL": "",
        "MECHANICAL": "",
        "SURVEY": "",
        "PRINTED COMPLETE PLAN": "",
        "REMARKS2": "",
        "PROGRAM STATUS": "Ongoing",
        "PROGRAM % COMPLETE": "11.43%",
        "PLAN STATUS": "For Completion",
        "PLAN % COMPLETE": "75%",
        "LAST UPDATED": "2026-09-16",
        "DAYS SINCE UPDATE": 0,
        "OVERALL STATUS": "In Progress"
    },


    {
        "CATEGORY": "Infrastructure",
        "PROGRAM": "Infrastructure Program",
        "SUB-PROGRAM": "Roads",
        "PROJECT TITLE AS PER GAA":
            "Concreting of Barangay Road Barangay Bukal, Taysan, Batangas",
        "NO. OF PROJS": 1,
        "ALLOCATION": 13000000,
        "MUNICIPALITY": "Taysan, Batangas",
        "PROGRAM2": "Christine",
        "PLAN": "Marjon",
        "ADVERTISEMENT BATCH": "Batch 5",
        "CONTRACT ID": "26DD0055",
        "CANVASS": "",
        "MARKET SCOPING": "",
        "CERT OF DED": "",
        "CERT OF CMPD": "",
        "CERT OF VALIDATION": "",
        "PRINTED COMPLETE PROGRAM": "",
        "SUBMITTED EXCEL FILE": "",
        "REMARKS": "",
        "ARCHITECTURAL": "",
        "STRUCTURAL": "",
        "PLUMBING": "",
        "ELECTRICAL": "",
        "MECHANICAL": "",
        "SURVEY": "",
        "PRINTED COMPLETE PLAN": "",
        "REMARKS2": "",
        "PROGRAM STATUS": "Ongoing",
        "PROGRAM % COMPLETE": "64.29%",
        "PLAN STATUS": "For Completion",
        "PLAN % COMPLETE": "0%",
        "LAST UPDATED": "2026-09-16",
        "DAYS SINCE UPDATE": 0,
        "OVERALL STATUS": "In Progress"
    },


    {
        "CATEGORY": "Infrastructure",
        "PROGRAM": "Infrastructure Program",
        "SUB-PROGRAM": "Buildings",
        "PROJECT TITLE AS PER GAA":
            "Construction of Multi-Purpose Building (Senior Citizens' Center), Barangay Catmon, San Juan, Batangas (13.806327°, 121.450402°)",
        "NO. OF PROJS": 1,
        "ALLOCATION": 13000000,
        "MUNICIPALITY": "San Juan, Batangas",
        "PROGRAM2": "Christine",
        "PLAN": "Anjeline",
        "ADVERTISEMENT BATCH": "Batch 11",
        "CONTRACT ID": "26DD0071",
        "CANVASS": "",
        "MARKET SCOPING": "",
        "CERT OF DED": "",
        "CERT OF CMPD": "",
        "CERT OF VALIDATION": "",
        "PRINTED COMPLETE PROGRAM": "",
        "SUBMITTED EXCEL FILE": "",
        "REMARKS": "",
        "ARCHITECTURAL": "",
        "STRUCTURAL": "",
        "PLUMBING": "",
        "ELECTRICAL": "",
        "MECHANICAL": "",
        "SURVEY": "",
        "PRINTED COMPLETE PLAN": "",
        "REMARKS2": "",
        "PROGRAM STATUS": "Ongoing",
        "PROGRAM % COMPLETE": "64.29%",
        "PLAN STATUS": "For Completion",
        "PLAN % COMPLETE": "83.33%",
        "LAST UPDATED": "2026-09-16",
        "DAYS SINCE UPDATE": 0,
        "OVERALL STATUS": "In Progress"
    },


    {
        "CATEGORY": "Infrastructure",
        "PROGRAM": "Infrastructure Program",
        "SUB-PROGRAM": "Buildings",
        "PROJECT TITLE AS PER GAA":
            "Construction of Multi-Purpose Building, Barangay Timbugan, Rosario, Batangas (13.812014°, 121.182458°)",
        "NO. OF PROJS": 1,
        "ALLOCATION": 13000000,
        "MUNICIPALITY": "Rosario, Batangas",
        "PROGRAM2": "Christine",
        "PLAN": "JR",
        "ADVERTISEMENT BATCH": "Batch 12",
        "CONTRACT ID": "26DD0101",
        "CANVASS": "",
        "MARKET SCOPING": "",
        "CERT OF DED": "",
        "CERT OF CMPD": "",
        "CERT OF VALIDATION": "",
        "PRINTED COMPLETE PROGRAM": "",
        "SUBMITTED EXCEL FILE": "",
        "REMARKS": "",
        "ARCHITECTURAL": "",
        "STRUCTURAL": "",
        "PLUMBING": "",
        "ELECTRICAL": "",
        "MECHANICAL": "",
        "SURVEY": "",
        "PRINTED COMPLETE PLAN": "",
        "REMARKS2": "",
        "PROGRAM STATUS": "Ongoing",
        "PROGRAM % COMPLETE": "64.29%",
        "PLAN STATUS": "For Completion",
        "PLAN % COMPLETE": "96.67%",
        "LAST UPDATED": "2026-09-16",
        "DAYS SINCE UPDATE": 0,
        "OVERALL STATUS": "In Progress"
    },


    {
        "CATEGORY": "Infrastructure",
        "PROGRAM": "Infrastructure Program",
        "SUB-PROGRAM": "Buildings",
        "PROJECT TITLE AS PER GAA":
            "Construction of Multi-Purpose Building (Barangay Hall) at Barangay Panghayaan, Taysan, Batangas (13.779880, 121.189344)",
        "NO. OF PROJS": 1,
        "ALLOCATION": 13000000,
        "MUNICIPALITY": "Taysan, Batangas",
        "PROGRAM2": "Christine",
        "PLAN": "Jessica",
        "ADVERTISEMENT BATCH": "Batch 13",
        "CONTRACT ID": "26DD0113",
        "CANVASS": "",
        "MARKET SCOPING": "",
        "CERT OF DED": "",
        "CERT OF CMPD": "",
        "CERT OF VALIDATION": "",
        "PRINTED COMPLETE PROGRAM": "",
        "SUBMITTED EXCEL FILE": "",
        "REMARKS": "",
        "ARCHITECTURAL": "",
        "STRUCTURAL": "",
        "PLUMBING": "",
        "ELECTRICAL": "",
        "MECHANICAL": "",
        "SURVEY": "",
        "PRINTED COMPLETE PLAN": "",
        "REMARKS2": "",
        "PROGRAM STATUS": "Ongoing",
        "PROGRAM % COMPLETE": "64.29%",
        "PLAN STATUS": "For Completion",
        "PLAN % COMPLETE": "75%",
        "LAST UPDATED": "2026-09-16",
        "DAYS SINCE UPDATE": 0,
        "OVERALL STATUS": "In Progress"
    },


    {
        "CATEGORY": "Infrastructure",
        "PROGRAM": "Infrastructure Program",
        "SUB-PROGRAM": "Buildings",
        "PROJECT TITLE AS PER GAA":
            "Construction of Multi-Purpose Building (Covered Court) at Rosario East Central School (107571), Brgy. Poblacion A, Rosario, Batangas",
        "NO. OF PROJS": 1,
        "ALLOCATION": 13000000,
        "MUNICIPALITY": "Rosario, Batangas",
        "PROGRAM2": "Christine",
        "PLAN": "Karisa",
        "ADVERTISEMENT BATCH": "Batch 13",
        "CONTRACT ID": "26DD0118",
        "CANVASS": "",
        "MARKET SCOPING": "",
        "CERT OF DED": "",
        "CERT OF CMPD": "",
        "CERT OF VALIDATION": "",
        "PRINTED COMPLETE PROGRAM": "",
        "SUBMITTED EXCEL FILE": "",
        "REMARKS": "",
        "ARCHITECTURAL": "",
        "STRUCTURAL": "",
        "PLUMBING": "",
        "ELECTRICAL": "",
        "MECHANICAL": "",
        "SURVEY": "",
        "PRINTED COMPLETE PLAN": "",
        "REMARKS2": "",
        "PROGRAM STATUS": "Ongoing",
        "PROGRAM % COMPLETE": "64.29%",
        "PLAN STATUS": "For Completion",
        "PLAN % COMPLETE": "75%",
        "LAST UPDATED": "2026-09-16",
        "DAYS SINCE UPDATE": 0,
        "OVERALL STATUS": "In Progress"
    },


    {
        "CATEGORY": "Infrastructure",
        "PROGRAM": "Infrastructure Program",
        "SUB-PROGRAM": "Roads",
        "PROJECT TITLE AS PER GAA":
            "Batangas-Quezon Rd - K0121 + 300 - K0121 + 870, K0122 + 000 - K0122 + 510",
        "NO. OF PROJS": 1,
        "ALLOCATION": 13000000,
        "MUNICIPALITY": "Not Found",
        "PROGRAM2": "Christine",
        "PLAN": "Jerald",
        "ADVERTISEMENT BATCH": "Batch 14",
        "CONTRACT ID": "26DD0140",
        "CANVASS": "",
        "MARKET SCOPING": "",
        "CERT OF DED": "",
        "CERT OF CMPD": "",
        "CERT OF VALIDATION": "",
        "PRINTED COMPLETE PROGRAM": "",
        "SUBMITTED EXCEL FILE": "",
        "REMARKS": "",
        "ARCHITECTURAL": "",
        "STRUCTURAL": "",
        "PLUMBING": "",
        "ELECTRICAL": "",
        "MECHANICAL": "",
        "SURVEY": "",
        "PRINTED COMPLETE PLAN": "",
        "REMARKS2": "",
        "PROGRAM STATUS": "Ongoing",
        "PROGRAM % COMPLETE": "66.67%",
        "PLAN STATUS": "For Completion",
        "PLAN % COMPLETE": "66.67%",
        "LAST UPDATED": "2026-09-16",
        "DAYS SINCE UPDATE": 0,
        "OVERALL STATUS": "In Progress"
    },


    {
        "CATEGORY": "Infrastructure",
        "PROGRAM": "Infrastructure Program",
        "SUB-PROGRAM": "Buildings",
        "PROJECT TITLE AS PER GAA":
            "Construction of Multi Purpose Building at Rosario East Central School, Poblacion A, Rosario, Batangas",
        "NO. OF PROJS": 1,
        "ALLOCATION": 13000000,
        "MUNICIPALITY": "Rosario, Batangas",
        "PROGRAM2": "Christine",
        "PLAN": "Karisa",
        "ADVERTISEMENT BATCH": "Batch 14",
        "CONTRACT ID": "26DD0143",
        "CANVASS": "",
        "MARKET SCOPING": "",
        "CERT OF DED": "",
        "CERT OF CMPD": "",
        "CERT OF VALIDATION": "",
        "PRINTED COMPLETE PROGRAM": "",
        "SUBMITTED EXCEL FILE": "",
        "REMARKS": "",
        "ARCHITECTURAL": "",
        "STRUCTURAL": "",
        "PLUMBING": "",
        "ELECTRICAL": "",
        "MECHANICAL": "",
        "SURVEY": "",
        "PRINTED COMPLETE PLAN": "",
        "REMARKS2": "",
        "PROGRAM STATUS": "Ongoing",
        "PROGRAM % COMPLETE": "64.29%",
        "PLAN STATUS": "For Completion",
        "PLAN % COMPLETE": "75%",
        "LAST UPDATED": "2026-09-16",
        "DAYS SINCE UPDATE": 0,
        "OVERALL STATUS": "In Progress"
    },


    {
        "CATEGORY": "Infrastructure",
        "PROGRAM": "Infrastructure Program",
        "SUB-PROGRAM": "Buildings",
        "PROJECT TITLE AS PER GAA":
            "Construction of Outdoor Sports Center, Rosario, Batangas",
        "NO. OF PROJS": 1,
        "ALLOCATION": 13000000,
        "MUNICIPALITY": "Rosario, Batangas",
        "PROGRAM2": "Christine",
        "PLAN": "Aero",
        "ADVERTISEMENT BATCH": "Batch 15",
        "CONTRACT ID": "26DD0179",
        "CANVASS": "",
        "MARKET SCOPING": "",
        "CERT OF DED": "",
        "CERT OF CMPD": "",
        "CERT OF VALIDATION": "",
        "PRINTED COMPLETE PROGRAM": "",
        "SUBMITTED EXCEL FILE": "",
        "REMARKS": "",
        "ARCHITECTURAL": "",
        "STRUCTURAL": "",
        "PLUMBING": "",
        "ELECTRICAL": "",
        "MECHANICAL": "",
        "SURVEY": "",
        "PRINTED COMPLETE PLAN": "",
        "REMARKS2": "",
        "PROGRAM STATUS": "Ongoing",
        "PROGRAM % COMPLETE": "66.67%",
        "PLAN STATUS": "For Completion",
        "PLAN % COMPLETE": "41.67%",
        "LAST UPDATED": "2026-09-16",
        "DAYS SINCE UPDATE": 0,
        "OVERALL STATUS": "In Progress"
    },


    {
        "CATEGORY": "Infrastructure",
        "PROGRAM": "Infrastructure Program",
        "SUB-PROGRAM": "Roads",
        "PROJECT TITLE AS PER GAA":
            "Improvement of Road at Barangay Pinagkawitan, Lipa City, Batangas",
        "NO. OF PROJS": 1,
        "ALLOCATION": 13000000,
        "MUNICIPALITY": "Lipa City, Batangas",
        "PROGRAM2": "Christine",
        "PLAN": "Rose Anne",
        "ADVERTISEMENT BATCH": "Batch 15",
        "CONTRACT ID": "26DD0191",
        "CANVASS": "",
        "MARKET SCOPING": "",
        "CERT OF DED": "",
        "CERT OF CMPD": "",
        "CERT OF VALIDATION": "",
        "PRINTED COMPLETE PROGRAM": "",
        "SUBMITTED EXCEL FILE": "",
        "REMARKS": "",
        "ARCHITECTURAL": "",
        "STRUCTURAL": "",
        "PLUMBING": "",
        "ELECTRICAL": "",
        "MECHANICAL": "",
        "SURVEY": "",
        "PRINTED COMPLETE PLAN": "",
        "REMARKS2": "",
        "PROGRAM STATUS": "Ongoing",
        "PROGRAM % COMPLETE": "66.67%",
        "PLAN STATUS": "For Completion",
        "PLAN % COMPLETE": "50%",
        "LAST UPDATED": "2026-09-16",
        "DAYS SINCE UPDATE": 0,
        "OVERALL STATUS": "In Progress"
    }

];


/* =========================================================
   MONITORING TEXT NORMALIZER
========================================================= */

function normalizeMonitoringText(
    value
) {

    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase()
        .replace(
            /\s+/g,
            " "
        );

}


/* =========================================================
   MONITORING COLUMN HELPER
========================================================= */

function getMonitoringValue(
    row,
    columnName
) {

    if (!row) {

        return "";

    }


    if (
        Object.prototype.hasOwnProperty.call(
            row,
            columnName
        )
    ) {

        return row[columnName];

    }


    const target =
        normalizeMonitoringText(
            columnName
        );


    const key =
        Object.keys(row)
            .find(
                key =>
                    normalizeMonitoringText(
                        key
                    ) === target
            );


    return key
        ? row[key]
        : "";

}


/* =========================================================
   MONITORING PERCENTAGE
========================================================= */

function monitoringPercent(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return 0;

    }


    let text =
        String(value)
            .trim()
            .replace(
                "%",
                ""
            );


    let number =
        parseFloat(text);


    if (
        Number.isNaN(number)
    ) {

        return 0;

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
   CURRENT USER NAME
========================================================= */

function getCurrentMonitoringUserName() {

    if (currentProfile) {

        return (
            currentProfile.full_name ||
            currentProfile.name ||
            currentProfile.display_name ||
            ""
        );

    }


    if (currentUser) {

        return (
            currentUser.user_metadata?.full_name ||
            currentUser.user_metadata?.name ||
            currentUser.email?.split("@")[0] ||
            ""
        );

    }


    return "";

}


/* =========================================================
   MONITORING ASSIGNMENT
========================================================= */

function isMonitoringProjectAssigned(
    project
) {

    const userName =
        normalizeMonitoringText(
            getCurrentMonitoringUserName()
        );


    if (!userName) {

        return false;

    }


    const programUser =
        normalizeMonitoringText(
            getMonitoringValue(
                project,
                "PROGRAM2"
            )
        );


    const planUser =
        normalizeMonitoringText(
            getMonitoringValue(
                project,
                "PLAN"
            )
        );


    return (
        userName === programUser ||
        userName === planUser ||
        programUser.includes(userName) ||
        planUser.includes(userName)
    );

}


/* =========================================================
   MONITORING EDIT PERMISSION
========================================================= */

function canEditMonitoringProject(
    project
) {

    if (!currentUser) {

        return false;

    }


    if (
        !isMonitoringProjectAssigned(
            project
        )
    ) {

        return false;

    }


    const status =
        normalizeMonitoringText(
            getMonitoringValue(
                project,
                "OVERALL STATUS"
            )
        );


    if (
        status.includes(
            "completed"
        )
    ) {

        return false;

    }


    return true;

}


/* =========================================================
   MONITORING STATUS CLASS
========================================================= */

function getMonitoringStatusClass(
    status
) {

    const normalized =
        normalizeMonitoringText(
            status
        );


    if (
        normalized.includes(
            "completed"
        )
    ) {

        return "completed";

    }


    if (
        normalized.includes(
            "hold"
        )
    ) {

        return "hold";

    }


    if (
        normalized.includes(
            "signature"
        ) ||
        normalized.includes(
            "completion"
        )
    ) {

        return "bidding";

    }


    return "ongoing";

}


/* =========================================================
   LOAD PROJECT MONITORING
========================================================= */

async function loadProjectMonitoring() {

    const list =
        $("monitoringList");


    if (!list) {

        return;

    }


    list.innerHTML = `
        <div class="monitoring-loading">
            Loading project monitoring data...
        </div>
    `;


    /*
     * TEMPORARY TEST SOURCE
     *
     * Actual OneDrive connection comes later.
     */

    cachedMonitoringProjects =
        [...monitoringTestData];


    applyMonitoringFilters();

}


/* =========================================================
   APPLY MONITORING FILTERS
========================================================= */

function applyMonitoringFilters() {

    const search =
        $("monitoringSearch");

    const statusFilter =
        $("monitoringStatusFilter");

    const myProjectsFilter =
        $("myProjectsFilter");


    const query =
        normalizeMonitoringText(
            search?.value || ""
        );


    const selectedStatus =
        statusFilter?.value ||
        "all";


    const myProjectsOnly =
        myProjectsFilter?.checked ??
        true;


    let projects =
        [...cachedMonitoringProjects];


    /*
     * SEARCH
     */

    if (query) {

        projects =
            projects.filter(
                project => {

                    const text = [

                        getMonitoringValue(
                            project,
                            "CONTRACT ID"
                        ),

                        getMonitoringValue(
                            project,
                            "PROJECT TITLE AS PER GAA"
                        ),

                        getMonitoringValue(
                            project,
                            "MUNICIPALITY"
                        ),

                        getMonitoringValue(
                            project,
                            "PROGRAM2"
                        ),

                        getMonitoringValue(
                            project,
                            "PLAN"
                        ),

                        getMonitoringValue(
                            project,
                            "ADVERTISEMENT BATCH"
                        )

                    ]
                        .filter(Boolean)
                        .join(" ");


                    return normalizeMonitoringText(
                        text
                    ).includes(
                        query
                    );

                }
            );

    }


    /*
     * STATUS
     */

    if (
        selectedStatus !== "all"
    ) {

        projects =
            projects.filter(
                project => {

                    const status =
                        normalizeMonitoringText(
                            getMonitoringValue(
                                project,
                                "OVERALL STATUS"
                            )
                        );


                    return (
                        status ===
                        normalizeMonitoringText(
                            selectedStatus
                        )
                    );

                }
            );

    }


    /*
     * MY PROJECTS
     */

    if (myProjectsOnly) {

        projects =
            projects.filter(
                project =>
                    isMonitoringProjectAssigned(
                        project
                    )
            );

    }


    renderProjectMonitoring(
        projects
    );

}


/* =========================================================
   RENDER PROJECT MONITORING
========================================================= */

function renderProjectMonitoring(
    projects
) {

    const list =
        $("monitoringList");

    const empty =
        $("monitoringEmpty");


    if (!list) {

        return;

    }


    if (
        !projects ||
        !projects.length
    ) {

        list.innerHTML = "";


        if (empty) {

            empty.style.display =
                "flex";

        }


        updateMonitoringSummary(
            projects || []
        );


        return;

    }


    if (empty) {

        empty.style.display =
            "none";

    }


    list.innerHTML =
        projects
            .map(
                project => {

                    const projectNo =
                        escapeHTML(
                            getMonitoringValue(
                                project,
                                "CONTRACT ID"
                            ) ||
                            "—"
                        );


                    const title =
                        escapeHTML(
                            getMonitoringValue(
                                project,
                                "PROJECT TITLE AS PER GAA"
                            ) ||
                            "Untitled Project"
                        );


                    const municipality =
                        escapeHTML(
                            getMonitoringValue(
                                project,
                                "MUNICIPALITY"
                            ) ||
                            "—"
                        );


                    const programPercent =
                        monitoringPercent(
                            getMonitoringValue(
                                project,
                                "PROGRAM % COMPLETE"
                            )
                        );


                    const planPercent =
                        monitoringPercent(
                            getMonitoringValue(
                                project,
                                "PLAN % COMPLETE"
                            )
                        );


                    const programStatus =
                        escapeHTML(
                            getMonitoringValue(
                                project,
                                "PROGRAM STATUS"
                            ) ||
                            "—"
                        );


                    const planStatus =
                        escapeHTML(
                            getMonitoringValue(
                                project,
                                "PLAN STATUS"
                            ) ||
                            "—"
                        );


                    const overallStatus =
                        escapeHTML(
                            getMonitoringValue(
                                project,
                                "OVERALL STATUS"
                            ) ||
                            "—"
                        );


                    const editable =
                        canEditMonitoringProject(
                            project
                        );


                    const statusClass =
                        getMonitoringStatusClass(
                            overallStatus
                        );


                    const encodedProject =
                        encodeURIComponent(
                            getMonitoringValue(
                                project,
                                "CONTRACT ID"
                            )
                        );


                    return `

                        <div
                            class="monitoring-row"
                            data-project-id="${escapeHTML(
                                getMonitoringValue(
                                    project,
                                    "CONTRACT ID"
                                )
                            )}"
                        >

                            <div
                                class="monitoring-project-no"
                                data-label="PROJECT NO."
                            >
                                ${projectNo}
                            </div>


                            <div
                                class="monitoring-project-name"
                                data-label="PROJECT"
                            >

                                <strong>
                                    ${title}
                                </strong>

                                <span>
                                    ${municipality}
                                </span>

                            </div>


                            <div
                                class="monitoring-progress"
                                data-label="PROGRAM"
                            >

                                <div class="progress-value">
                                    ${programPercent.toFixed(2)}%
                                </div>

                                <div class="progress-track">

                                    <div
                                        class="progress-fill"
                                        style="width:${programPercent}%"
                                    ></div>

                                </div>

                                <small>
                                    ${programStatus}
                                </small>

                            </div>


                            <div
                                class="monitoring-progress"
                                data-label="PLAN"
                            >

                                <div class="progress-value">
                                    ${planPercent.toFixed(2)}%
                                </div>

                                <div class="progress-track">

                                    <div
                                        class="progress-fill"
                                        style="width:${planPercent}%"
                                    ></div>

                                </div>

                                <small>
                                    ${planStatus}
                                </small>

                            </div>


                            <div
                                data-label="OVERALL STATUS"
                            >

                                <span
                                    class="monitoring-status ${statusClass}"
                                >
                                    ${overallStatus}
                                </span>

                            </div>


                            <div
                                class="monitoring-actions"
                                data-label="ACTION"
                            >

                                <button
                                    type="button"
                                    class="monitoring-view"
                                    data-monitoring-action="view"
                                    data-project-id="${encodedProject}"
                                >
                                    VIEW
                                </button>

                                ${
                                    editable
                                        ? `
                                            <button
                                                type="button"
                                                class="monitoring-edit"
                                                data-monitoring-action="edit"
                                                data-project-id="${encodedProject}"
                                            >
                                                EDIT
                                            </button>
                                        `
                                        : ""
                                }

                            </div>

                        </div>

                    `;

                }
            )
            .join("");


    updateMonitoringSummary(
        projects
    );

}


/* =========================================================
   MONITORING SUMMARY
========================================================= */

function updateMonitoringSummary(
    projects
) {

    const total =
        $("monitoringTotal");

    const programAverage =
        $("monitoringProgramAverage");

    const planAverage =
        $("monitoringPlanAverage");

    const inProgress =
        $("monitoringInProgress");


    if (
        !projects ||
        !projects.length
    ) {

        if (total) {

            total.textContent =
                "0";

        }


        if (programAverage) {

            programAverage.textContent =
                "0%";

        }


        if (planAverage) {

            planAverage.textContent =
                "0%";

        }


        if (inProgress) {

            inProgress.textContent =
                "0";

        }


        return;

    }


    let programTotal =
        0;

    let planTotal =
        0;

    let activeCount =
        0;


    projects.forEach(
        project => {

            programTotal +=
                monitoringPercent(
                    getMonitoringValue(
                        project,
                        "PROGRAM % COMPLETE"
                    )
                );


            planTotal +=
                monitoringPercent(
                    getMonitoringValue(
                        project,
                        "PLAN % COMPLETE"
                    )
                );


            const status =
                normalizeMonitoringText(
                    getMonitoringValue(
                        project,
                        "OVERALL STATUS"
                    )
                );


            if (
                status.includes(
                    "progress"
                ) ||
                status.includes(
                    "ongoing"
                )
            ) {

                activeCount++;

            }

        }
    );


    const programAverageValue =
        programTotal /
        projects.length;


    const planAverageValue =
        planTotal /
        projects.length;


    if (total) {

        total.textContent =
            projects.length;

    }


    if (programAverage) {

        programAverage.textContent =
            programAverageValue.toFixed(2) +
            "%";

    }


    if (planAverage) {

        planAverage.textContent =
            planAverageValue.toFixed(2) +
            "%";

    }


    if (inProgress) {

        inProgress.textContent =
            activeCount;

    }

}


/* =========================================================
   VIEW MONITORING PROJECT
========================================================= */

function viewMonitoringProject(
    projectId
) {

    const decodedId =
        decodeURIComponent(
            projectId
        );


    const project =
        cachedMonitoringProjects.find(
            item =>
                String(
                    getMonitoringValue(
                        item,
                        "CONTRACT ID"
                    )
                ) ===
                String(
                    decodedId
                )
        );


    if (!project) {

        alert(
            "Project monitoring record not found."
        );

        return;

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


    const title =
        getMonitoringValue(
            project,
            "PROJECT TITLE AS PER GAA"
        ) ||
        "Untitled Project";


    const projectNo =
        getMonitoringValue(
            project,
            "CONTRACT ID"
        ) ||
        "—";


    const municipality =
        getMonitoringValue(
            project,
            "MUNICIPALITY"
        ) ||
        "—";


    const programUser =
        getMonitoringValue(
            project,
            "PROGRAM2"
        ) ||
        "—";


    const planUser =
        getMonitoringValue(
            project,
            "PLAN"
        ) ||
        "—";


    const programPercent =
        monitoringPercent(
            getMonitoringValue(
                project,
                "PROGRAM % COMPLETE"
            )
        );


    const planPercent =
        monitoringPercent(
            getMonitoringValue(
                project,
                "PLAN % COMPLETE"
            )
        );


    const overallStatus =
        getMonitoringValue(
            project,
            "OVERALL STATUS"
        ) ||
        "—";


    const programStatus =
        getMonitoringValue(
            project,
            "PROGRAM STATUS"
        ) ||
        "—";


    const planStatus =
        getMonitoringValue(
            project,
            "PLAN STATUS"
        ) ||
        "—";


    const remarks =
        getMonitoringValue(
            project,
            "REMARKS"
        ) ||
        getMonitoringValue(
            project,
            "REMARKS2"
        ) ||
        "No monitoring remarks available.";


    content.innerHTML = `

        <div class="project-detail">

            <div class="detail-label">
                PROJECT MONITORING
            </div>


            <h2>
                ${escapeHTML(title)}
            </h2>


            <div class="detail-grid">

                <div>
                    <span>PROJECT NO.</span>
                    <strong>
                        ${escapeHTML(projectNo)}
                    </strong>
                </div>


                <div>
                    <span>LOCATION</span>
                    <strong>
                        ${escapeHTML(municipality)}
                    </strong>
                </div>


                <div>
                    <span>PROGRAM</span>
                    <strong>
                        ${escapeHTML(programUser)}
                    </strong>
                </div>


                <div>
                    <span>PLAN</span>
                    <strong>
                        ${escapeHTML(planUser)}
                    </strong>
                </div>


                <div>
                    <span>PROGRAM COMPLETION</span>
                    <strong>
                        ${programPercent.toFixed(2)}%
                    </strong>
                </div>


                <div>
                    <span>PLAN COMPLETION</span>
                    <strong>
                        ${planPercent.toFixed(2)}%
                    </strong>
                </div>


                <div>
                    <span>PROGRAM STATUS</span>
                    <strong>
                        ${escapeHTML(programStatus)}
                    </strong>
                </div>


                <div>
                    <span>PLAN STATUS</span>
                    <strong>
                        ${escapeHTML(planStatus)}
                    </strong>
                </div>


                <div>
                    <span>OVERALL STATUS</span>
                    <strong>
                        ${escapeHTML(overallStatus)}
                    </strong>
                </div>

            </div>


            <div style="margin-top:20px;">

                <div class="detail-label">
                    MONITORING REMARKS
                </div>

                <p>
                    ${escapeHTML(remarks)}
                </p>

            </div>

        </div>

    `;


    modal.style.display =
        "flex";

}


/* =========================================================
   EDIT MONITORING PROJECT
========================================================= */

function editMonitoringProject(
    projectId
) {

    const decodedId =
        decodeURIComponent(
            projectId
        );


    const project =
        cachedMonitoringProjects.find(
            item =>
                String(
                    getMonitoringValue(
                        item,
                        "CONTRACT ID"
                    )
                ) ===
                String(
                    decodedId
                )
        );


    if (!project) {

        alert(
            "Project monitoring record not found."
        );

        return;

    }


    if (
        !canEditMonitoringProject(
            project
        )
    ) {

        alert(
            "You are not authorized to edit this project."
        );

        return;

    }


    /*
     * Editing will be connected to OneDrive
     * in the next implementation step.
     */

    alert(
        "Project editing will be enabled after the OneDrive monitoring editor is connected."
    );

}


/* =========================================================
   MONITORING FILTER SETUP
========================================================= */

function setupProjectMonitoringFilters() {

    if (monitoringFiltersReady) {

        return;

    }


    monitoringFiltersReady =
        true;


    const search =
        $("monitoringSearch");

    const status =
        $("monitoringStatusFilter");

    const myProjects =
        $("myProjectsFilter");

    const refresh =
        $("monitoringRefreshButton");


    if (search) {

        search.addEventListener(
            "input",
            applyMonitoringFilters
        );

    }


    if (status) {

        status.addEventListener(
            "change",
            applyMonitoringFilters
        );

    }


    if (myProjects) {

        myProjects.addEventListener(
            "change",
            applyMonitoringFilters
        );

    }


    if (refresh) {

        refresh.addEventListener(
            "click",
            async () => {

                await loadProjectMonitoring();

            }
        );

    }


    const list =
        $("monitoringList");


    if (list) {

        list.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        "[data-monitoring-action]"
                    );


                if (!button) {

                    return;

                }


                event.preventDefault();


                const action =
                    button.dataset.monitoringAction;


                const projectId =
                    button.dataset.projectId;


                if (
                    action ===
                    "view"
                ) {

                    viewMonitoringProject(
                        projectId
                    );

                }


                if (
                    action ===
                    "edit"
                ) {

                    editMonitoringProject(
                        projectId
                    );

                }

            }
        );

    }

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


    /*
     * SETUP UI
     */

    setupNavigation();

    setupSectionTargets();

    setupGlobalSearch();

    setupProjectMonitoringFilters();

    setupAuthForms();

    setupSignOut();

    setupProjectModal();

    setupDocumentModal();

    setupDocumentForm();

    setupDocumentUpload();

    setupDocumentSearch();

    setupDepartmentOrderFilters();

    setupPDSAI();

    setupNotifications();

    setupRefreshButton();

    setupAuthStateListener();


    /*
     * RESTORE SESSION
     */

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
```
