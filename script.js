/* =========================================================
   PDS — PLANNING & DESIGN SECTION
   COMPLETE SCRIPT
   AUTH + SESSION + DASHBOARD + PROJECTS + DOCUMENTS
   DEPARTMENT ORDERS + PDS AI
========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
    "https://zvwghoabsqfyakbqzhil.supabase.co";

/*
 * IMPORTANT:
 * Paste the CURRENT "Publishable key" from:
 *
 * Supabase
 * → Project Settings
 * → API
 *
 * DO NOT use the service_role key.
 */
const SUPABASE_ANON_KEY =
    "PASTE_YOUR_CURRENT_SUPABASE_PUBLISHABLE_KEY_HERE";


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

let navigationReady = false;
let authFormsReady = false;
let documentSearchReady = false;
let aiReady = false;
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


        /*
         * IMPORTANT:
         * Hide login immediately after
         * successful authentication.
         */

        hideLogin();


        showPage(
            "dashboard"
        );


        /*
         * Load user information.
         * These failures must NOT
         * log the user out.
         */

        await loadUserProfile();

        updateUserInterface();


        /*
         * Load application data.
         */

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


        /*
         * Make API-key problem obvious.
         */

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


        /*
         * SESSION EXISTS
         */

        currentUser =
            session.user;


        console.log(
            "PDS: Session restored:",
            currentUser.email
        );


        /*
         * IMPORTANT:
         * Do this BEFORE loading
         * projects/documents.
         */

        hideLogin();


        showPage(
            "dashboard"
        );


        await loadUserProfile();


        updateUserInterface();


        /*
         * Dashboard data can fail
         * without forcing sign out.
         */

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


        /*
         * Check session one more time.
         */

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

    const topAvatar =
        $("topAvatar");


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
        aliases[pageId] ||
        pageId
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


    /*
     * Sidebar active state
     */

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


    /*
     * Page title
     */

    const titles = {

        dashboard:
            "Dashboard",

        projects:
            "Projects",

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


    /*
     * Refresh section when opened.
     */

    if (
        pageId ===
        "projects"
    ) {

        loadProjects();

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

        loadDepartmentOrders()

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
                    '[data-action="signout"], #signOutButton'
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

                showLogin();

                return;
            }


            if (
                session &&
                session.user
            ) {

                currentUser =
                    session.user;


                /*
                 * Never show login
                 * when a valid session
                 * exists.
                 */

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


    /*
     * Hide everything while
     * authentication is checked.
     */

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


    /*
     * Initialize Supabase.
     */

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
     * Setup UI.
     */

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

    setupPDSAI();

    setupNotifications();

    setupRefreshButton();

    setupAuthStateListener();


    /*
     * Restore existing session.
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
