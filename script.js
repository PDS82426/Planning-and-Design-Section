/* =========================================================
   PDS — PLANNING & DESIGN SECTION
   COMPLETE SCRIPT
   SESSION PERSISTENCE + DASHBOARD + DOCUMENTS + AI
========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
    "https://zvwghoabsqfyakbqzhil.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_oJ3Zc3TplfYgePQEmTrJ8Q_qycxR0jQ";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


/* =========================================================
   GLOBAL STATE
========================================================= */

let currentUser = null;
let currentProfile = null;

let modalMode = "view";

let pdsAIHistory = [];

let cachedDocuments = [];

let appLoading = false;
let navigationReady = false;
let authFormsReady = false;
let modalReady = false;
let searchReady = false;
let aiReady = false;


/* =========================================================
   DEPARTMENT ORDERS
========================================================= */

const departmentOrders = [

    {
        number: "DO 75",
        year: "2024",
        title: "Guidelines and Procedures",
        description: "Department policies, guidelines and procedures.",
        category: "Guidelines"
    },

    {
        number: "DO 159",
        year: "2022",
        title: "Infrastructure Guidelines",
        description: "Policies and procedures related to infrastructure projects.",
        category: "Infrastructure"
    },

    {
        number: "DO 37",
        year: "2021",
        title: "Planning and Design",
        description: "Planning and design implementation guidelines.",
        category: "Planning & Design"
    },

    {
        number: "DO 120",
        year: "2019",
        title: "Infrastructure Standards",
        description: "Standards and procedures for infrastructure implementation.",
        category: "Standards"
    },

    {
        number: "DO 27",
        year: "2019",
        title: "Project Development",
        description: "Project development and implementation guidelines.",
        category: "Project Development"
    },

    {
        number: "DO 28",
        year: "2019",
        title: "Cost Estimation Manual",
        description: "Guidelines for cost estimation and construction costing.",
        category: "Cost Estimation"
    }

];


/* =========================================================
   BASIC DOM HELPERS
========================================================= */

function $(id) {
    return document.getElementById(id);
}


function showElement(element) {

    if (!element) return;

    element.style.display = "";
}


function hideElement(element) {

    if (!element) return;

    element.style.display = "none";
}


/* =========================================================
   AUTH SCREEN
========================================================= */

function showLogin() {

    const authScreen = $("authScreen");
    const app = $("app");

    if (app) {
        app.style.display = "none";
    }

    if (authScreen) {
        authScreen.style.display = "flex";
    }
}


function hideLogin() {

    const authScreen = $("authScreen");
    const app = $("app");

    if (authScreen) {
        authScreen.style.display = "none";
    }

    if (app) {
        app.style.display = "flex";
    }
}


function clearAuthMessages() {

    const loginMessage = $("loginMessage");
    const registerMessage = $("registerMessage");

    if (loginMessage) {
        loginMessage.textContent = "";
        loginMessage.className = "auth-message";
    }

    if (registerMessage) {
        registerMessage.textContent = "";
        registerMessage.className = "auth-message";
    }
}


function authMessage(message, type = "error") {

    const loginMessage = $("loginMessage");

    if (!loginMessage) return;

    loginMessage.textContent = message;

    loginMessage.className =
        `auth-message ${type}`;
}


/* =========================================================
   REGISTER
========================================================= */

async function registerUser(email, password, fullName = "") {

    try {

        const { data, error } =
            await db.auth.signUp({
                email,
                password
            });

        if (error) {
            throw error;
        }

        if (data && data.user) {

            try {

                await createProfile(
                    data.user,
                    fullName
                );

            } catch (profileError) {

                console.warn(
                    "Profile creation warning:",
                    profileError
                );
            }
        }

        return {
            success: true,
            data
        };

    } catch (error) {

        console.error(
            "Registration error:",
            error
        );

        return {
            success: false,
            error
        };
    }
}


/* =========================================================
   CREATE PROFILE
========================================================= */

async function createProfile(user, fullName = "") {

    if (!user) return;

    const profile = {

        id: user.id,

        email: user.email || "",

        full_name:
            fullName ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "PDS User"

    };

    const { error } =
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
            "Profile creation failed:",
            error
        );

        throw error;
    }

    currentProfile = profile;
}


/* =========================================================
   LOGIN
========================================================= */

async function loginUser(email, password) {

    try {

        const {
            data,
            error
        } = await db.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw error;
        }

        if (!data || !data.user) {
            throw new Error(
                "Login succeeded but no user session was returned."
            );
        }

        currentUser = data.user;

        /*
         * IMPORTANT:
         * Immediately hide login.
         * Do not wait for profile/data loading.
         */

        hideLogin();

        showPage("dashboard");

        await loadApplication();

        return {
            success: true
        };

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        authMessage(
            error.message ||
            "Unable to sign in.",
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
   SESSION RESTORATION
   THIS PREVENTS SIGN-IN FROM APPEARING ON REFRESH
========================================================= */

async function restoreSession() {

    try {

        console.log(
            "Checking existing PDS session..."
        );

        const {
            data,
            error
        } = await db.auth.getSession();

        if (error) {

            console.error(
                "Session check failed:",
                error
            );

            showLogin();

            return false;
        }

        const session = data?.session;

        /*
         * NO SESSION
         */

        if (!session || !session.user) {

            console.log(
                "No active PDS session."
            );

            currentUser = null;
            currentProfile = null;

            showLogin();

            return false;
        }

        /*
         * SESSION FOUND
         */

        console.log(
            "PDS session restored:",
            session.user.email
        );

        currentUser = session.user;

        /*
         * CRITICAL:
         * Hide login immediately.
         */

        hideLogin();

        showPage("dashboard");

        /*
         * Load profile separately.
         * Failure here MUST NOT force login.
         */

        try {

            const {
                data: profile,
                error: profileError
            } = await db
                .from("profiles")
                .select("*")
                .eq(
                    "id",
                    currentUser.id
                )
                .maybeSingle();

            if (
                !profileError &&
                profile
            ) {

                currentProfile =
                    profile;
            }

        } catch (profileError) {

            console.warn(
                "Profile restore failed:",
                profileError
            );
        }

        updateUserInterface();

        /*
         * Load dashboard data.
         * Failure of one section must not log user out.
         */

        await Promise.allSettled([

            loadProjects(),

            loadDocuments(),

            loadDepartmentOrders(),

            loadTeam()

        ]);

        return true;

    } catch (error) {

        console.error(
            "Session restoration error:",
            error
        );

        /*
         * Double-check the session.
         * Never show login simply because
         * a dashboard query failed.
         */

        try {

            const {
                data
            } = await db.auth.getSession();

            if (
                data?.session?.user
            ) {

                currentUser =
                    data.session.user;

                hideLogin();

                showPage("dashboard");

                return true;
            }

        } catch (sessionError) {

            console.error(
                "Final session check failed:",
                sessionError
            );
        }

        showLogin();

        return false;
    }
}


/* =========================================================
   LOAD APPLICATION
========================================================= */

async function loadApplication() {

    return await restoreSession();
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
   NAVIGATION
========================================================= */

function normalizePageId(pageId) {

    if (!pageId) {
        return "dashboard";
    }

    const aliases = {

        overview:
            "dashboard",

        dashboard:
            "dashboard",

        myprojects:
            "projects",

        project:
            "projects",

        projects:
            "projects",

        content:
            "documents",

        document:
            "documents",

        documents:
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

        userprofile:
            "profile",

        profile:
            "profile"

    };

    return aliases[pageId] || pageId;
}


/* =========================================================
   GET PAGE SECTIONS
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

function showPage(pageId) {

    pageId =
        normalizePageId(pageId);

    const pages =
        getPDSPages();

    let targetPage = null;

    pages.forEach(page => {

        const id =
            page.id ||
            page.dataset.section ||
            page.dataset.pageSection;

        if (id === pageId) {

            targetPage =
                page;
        }

        page.classList.remove("active");

        page.style.display =
            "none";
    });

    if (!targetPage) {

        console.warn(
            "PDS page not found:",
            pageId
        );

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
        .forEach(item => {

            const itemPage =
                normalizePageId(
                    item.dataset.section
                );

            item.classList.toggle(
                "active",
                itemPage === pageId
            );
        });

    /*
     * Page title
     */

    const pageTitle =
        $("pageTitle");

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

    if (pageTitle) {

        pageTitle.textContent =
            titles[pageId] ||
            "Planning & Design Section";
    }

    /*
     * Page-specific refresh
     */

    if (pageId === "projects") {

        loadProjects();

    }

    if (pageId === "documents") {

        loadDocuments();

    }

    if (
        pageId ===
        "department-orders"
    ) {

        displayDepartmentOrders(
            departmentOrders
        );
    }

    if (
        pageId ===
        "pds-ai-assistant"
    ) {

        setupPDSAI();
    }
}


/* =========================================================
   NAVIGATION SETUP
========================================================= */

function setupNavigation() {

    if (navigationReady) {
        return;
    }

    navigationReady = true;

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

            const page =
                navItem.dataset.section;

            showPage(page);
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

    if (searchReady) {
        return;
    }

    searchReady = true;

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

            /*
             * Projects
             */

            if (
                cachedDocuments.some(
                    document =>
                        (
                            document.title ||
                            ""
                        )
                        .toLowerCase()
                        .includes(query)
                )
            ) {

                showPage(
                    "documents"
                );
            }
        }
    );
}


/* =========================================================
   REFRESH ALL
========================================================= */

async function refreshAll() {

    await Promise.allSettled([

        loadProjects(),

        loadDocuments(),

        loadDepartmentOrders(),

        loadTeam()

    ]);
}


/* =========================================================
   PROJECTS
========================================================= */

async function loadProjects() {

    const list =
        $("projectList");

    if (!list) {
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
        } = await db
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
            "Project loading error:",
            error
        );

        renderProjects([]);

        updateProjectStats([]);
    }
}


function updateProjectStats(
    projects
) {

    const total =
        projects.length;

    const ongoing =
        projects.filter(
            project =>
                String(
                    project.status ||
                    ""
                )
                .toLowerCase()
                .includes("ongoing")
        ).length;

    const completed =
        projects.filter(
            project =>
                String(
                    project.status ||
                    ""
                )
                .toLowerCase()
                .includes("completed")
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
                            onclick="openProject('${escapeJS(project.id || "")}')"
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


async function openProject(
    projectId
) {

    if (!projectId) {
        return;
    }

    try {

        const {
            data,
            error
        } = await db
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

        if (!modal || !content) {
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

    try {

        const {
            data,
            error
        } = await db
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
            "Document loading error:",
            error
        );

        cachedDocuments = [];

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

    const search =
        $("documentSearch");

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

    if (!modal) {
        return;
    }

    modal.style.display =
        "flex";
}


function closeDocumentModal() {

    const modal =
        $("documentModal");

    if (!modal) {
        return;
    }

    modal.style.display =
        "none";
}


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
   DOCUMENT UPLOAD
========================================================= */

function setupDocumentUpload() {

    const button =
        $("uploadDocumentButton");

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        () => {

            openDocumentModal();
        }
    );
}


async function uploadDocument(
    event
) {

    if (event) {
        event.preventDefault();
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

        if (!currentUser) {

            alert(
                "Your session has expired. Please sign in again."
            );

            return;
        }

        const fileName =
            `${Date.now()}_${file.name}`;

        const filePath =
            `${currentUser.id}/${fileName}`;

        const {
            error: uploadError
        } = await db.storage
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
            data: documentData,
            error: documentError
        } = await db
            .from("documents")
            .insert({

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

        if (documentError) {
            throw documentError;
        }

        console.log(
            "Document uploaded:",
            documentData
        );

        closeDocumentModal();

        if (titleInput) {
            titleInput.value = "";
        }

        if (fileInput) {
            fileInput.value = "";
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

    if (!documentId) {
        return;
    }

    try {

        const {
            data,
            error
        } = await db
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
        } = await db.storage
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

    if (!documentId) {
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
        } = await db
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

            await db.storage
                .from("documents")
                .remove([
                    data.file_path
                ]);
        }

        const {
            error: deleteError
        } = await db
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


function displayDepartmentOrders(
    orders
) {

    renderDepartmentOrders(
        orders
    );
}


function filterDepartmentOrders() {

    const search =
        $("departmentOrderSearch");

    if (!search) {
        return;
    }

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

    displayDepartmentOrders(
        filtered
    );
}


function clearOrdersSearch() {

    const search =
        $("departmentOrderSearch");

    if (search) {
        search.value = "";
    }

    displayDepartmentOrders(
        departmentOrders
    );
}


function setupDepartmentOrderFilters() {

    const search =
        $("departmentOrderSearch");

    if (search) {

        search.addEventListener(
            "input",
            filterDepartmentOrders
        );
    }

    displayDepartmentOrders(
        departmentOrders
    );
}


/* =========================================================
   TEAM
   KEPT SAFE FOR OLD HTML
========================================================= */

async function loadTeam() {

    const container =
        document.getElementById(
            "teamList"
        );

    /*
     * PDS ONLY:
     * If old Team HTML no longer exists,
     * simply do nothing.
     */

    if (!container) {
        return;
    }

    try {

        const {
            data,
            error
        } = await db
            .from("profiles")
            .select("*")
            .order(
                "full_name",
                {
                    ascending: true
                }
            );

        if (error) {
            throw error;
        }

        container.innerHTML =
            (data || [])
                .map(
                    member => `
                        <div class="team-card">

                            <strong>
                                ${escapeHTML(
                                    member.full_name ||
                                    "PDS User"
                                )}
                            </strong>

                            <span>
                                ${escapeHTML(
                                    member.email ||
                                    ""
                                )}
                            </span>

                        </div>
                    `
                )
                .join("");

    } catch (error) {

        console.warn(
            "Team loading skipped:",
            error
        );
    }
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
   MODAL FORM
========================================================= */

function setupModalForm() {

    /*
     * Reserved for future PDS modal forms.
     */
}


/* =========================================================
   AUTH FORMS
========================================================= */

function setupAuthForms() {

    if (authFormsReady) {
        return;
    }

    authFormsReady = true;

    const loginForm =
        $("loginForm");

    if (loginForm) {

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
                        ?.value;

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

                authMessage(
                    "Signing in...",
                    "loading"
                );

                await loginUser(
                    email,
                    password
                );
            }
        );
    }
}


/* =========================================================
   PDS AI
========================================================= */

function setupPDSAI() {

    if (aiReady) {
        return;
    }

    aiReady = true;

    const launcher =
        $("pdsAiLauncher");

    const chatbot =
        $("pdsAiChatbot");

    const send =
        $("pdsAiSend");

    const input =
        $("aiInput");

    if (
        launcher &&
        chatbot
    ) {

        launcher.addEventListener(
            "click",
            () => {

                const hidden =
                    chatbot.style.display ===
                    "none";

                chatbot.style.display =
                    hidden
                        ? "flex"
                        : "none";

                if (
                    hidden &&
                    input
                ) {

                    setTimeout(
                        () => input.focus(),
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

    const fullButton =
        $("openFullPDSAI");

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


function appendAIMessage(
    message,
    sender = "ai"
) {

    const response =
        $("aiResponse");

    if (!response) {
        return;
    }

    const messageElement =
        document.createElement(
            "div"
        );

    messageElement.className =
        `ai-message ${sender}`;

    messageElement.textContent =
        message;

    response.appendChild(
        messageElement
    );

    response.scrollTop =
        response.scrollHeight;
}


async function askPDSAI() {

    const input =
        $("aiInput");

    const send =
        $("pdsAiSend");

    if (!input) {
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

    input.value = "";

    if (send) {
        send.disabled = true;
    }

    appendAIMessage(
        "PDS AI is thinking...",
        "ai"
    );

    try {

        const {
            data,
            error
        } = await db.functions.invoke(
            "PDS-AI",
            {
                body: {

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

        /*
         * Remove thinking message
         */

        const response =
            $("aiResponse");

        if (response) {

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

        appendAIMessage(
            answer,
            "ai"
        );

        pdsAIHistory.push({

            role: "user",

            content: message

        });

        pdsAIHistory.push({

            role: "assistant",

            content: answer

        });

    } catch (error) {

        console.error(
            "PDS AI error:",
            error
        );

        const response =
            $("aiResponse");

        if (response) {

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

        appendAIMessage(
            "PDS AI could not respond. Please try again.",
            "ai"
        );

    } finally {

        if (send) {
            send.disabled = false;
        }

        if (input) {
            input.focus();
        }
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
   PROFILE
========================================================= */

function loadProfileUI() {

    updateUserInterface();
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
   AUTH STATE CHANGE
   IMPORTANT FOR REFRESH / TOKEN REFRESH
========================================================= */

db.auth.onAuthStateChange(
    async (
        event,
        session
    ) => {

        console.log(
            "PDS Auth Event:",
            event
        );

        /*
         * USER SIGNED OUT
         */

        if (
            event ===
                "SIGNED_OUT" ||
            !session
        ) {

            currentUser = null;

            currentProfile = null;

            pdsAIHistory = [];

            showLogin();

            return;
        }

        /*
         * ACTIVE SESSION
         *
         * IMPORTANT:
         * INITIAL_SESSION must NOT
         * display the login screen.
         */

        if (
            event ===
                "INITIAL_SESSION" ||
            event ===
                "SIGNED_IN" ||
            event ===
                "TOKEN_REFRESHED"
        ) {

            currentUser =
                session.user;

            hideLogin();

            /*
             * Do NOT call showLogin().
             */

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


/* =========================================================
   INITIALIZATION
========================================================= */

async function initializePDSHub() {

    console.log(
        "PDS — Initializing..."
    );

    /*
     * IMPORTANT:
     *
     * Hide BOTH screens while
     * Supabase checks the session.
     *
     * This prevents the Sign In page
     * from flashing during refresh.
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
     * Setup interface first.
     */

    setupNavigation();

    setupSectionTargets();

    setupGlobalSearch();

    setupAuthForms();

    setupProjectModal();

    setupDocumentModal();

    setupDocumentForm();

    setupDocumentUpload();

    setupDocumentSearch();

    setupDepartmentOrderFilters();

    setupPDSAI();

    setupNotifications();

    setupRefreshButton();

    /*
     * Restore session.
     *
     * This is the most important
     * operation on page refresh.
     */

    await restoreSession();

    console.log(
        "PDS — Ready."
    );
}


/* =========================================================
   START PDS
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializePDSHub
    );

} else {

    initializePDSHub();
}
