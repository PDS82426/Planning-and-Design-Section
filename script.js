console.log("PDS HUB SCRIPT LOADED");
alert("PDS SCRIPT LOADED");
/* =========================================================
   PDS — PLANNING & DESIGN SECTION
   COMPLETE CORRECTED SCRIPT

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

        console.log(
            "Supabase initialized successfully."
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

        console.error(
            message
        );

        return;
    }

    element.textContent =
        message;

    element.className =
        `auth-message ${type}`;

}


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
   AUTH TAB SWITCHING
========================================================= */

function showLoginTab() {

    const loginForm =
        $("loginForm");

    const registerForm =
        $("registerForm");

    const tabLogin =
        $("tabLogin");

    const tabRegister =
        $("tabRegister");

    const title =
        $("authTitle");

    const subtitle =
        $("authSubtitle");

    if (loginForm) {

        loginForm.style.display =
            "";

    }

    if (registerForm) {

        registerForm.style.display =
            "none";

    }

    if (tabLogin) {

        tabLogin.classList.add(
            "active"
        );

    }

    if (tabRegister) {

        tabRegister.classList.remove(
            "active"
        );

    }

    if (title) {

        title.textContent =
            "Welcome back";

    }

    if (subtitle) {

        subtitle.textContent =
            "Sign in to access the PDS workspace.";

    }

    clearAuthMessage();

}


function showRegisterTab() {

    const loginForm =
        $("loginForm");

    const registerForm =
        $("registerForm");

    const tabLogin =
        $("tabLogin");

    const tabRegister =
        $("tabRegister");

    const title =
        $("authTitle");

    const subtitle =
        $("authSubtitle");

    if (loginForm) {

        loginForm.style.display =
            "none";

    }

    if (registerForm) {

        registerForm.style.display =
            "";

    }

    if (tabLogin) {

        tabLogin.classList.remove(
            "active"
        );

    }

    if (tabRegister) {

        tabRegister.classList.add(
            "active"
        );

    }

    if (title) {

        title.textContent =
            "Create your account";

    }

    if (subtitle) {

        subtitle.textContent =
            "Register for access to the PDS workspace.";

    }

    clearAuthMessage();

}


/* =========================================================
   CREATE PROFILE
========================================================= */

async function createProfile(
    user,
    fullName = "",
    position = ""
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

    /*
     * Position is included when available.
     * If the profiles table does not have
     * this column, retry without it.
     */

    if (
        position ||
        user.user_metadata?.position
    ) {

        profile.position =
            position ||
            user.user_metadata?.position ||
            "";

    }

    let result =
        await db
            .from("profiles")
            .upsert(
                profile,
                {
                    onConflict: "id"
                }
            );

    /*
     * Compatibility fallback:
     * If "position" does not exist in the
     * profiles table, save the basic profile.
     */

    if (
        result.error &&
        String(
            result.error.message || ""
        )
            .toLowerCase()
            .includes("position")
    ) {

        const basicProfile = {

            id:
                user.id,

            email:
                user.email || "",

            full_name:
                profile.full_name

        };

        result =
            await db
                .from("profiles")
                .upsert(
                    basicProfile,
                    {
                        onConflict: "id"
                    }
                );

    }

    if (result.error) {

        console.warn(
            "Profile creation warning:",
            result.error
        );

        return;
    }

    currentProfile =
        result.data?.[0] ||
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

        clearAuthMessage();

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

        const lowerMessage =
            message.toLowerCase();

        if (
            lowerMessage.includes(
                "invalid api key"
            )
        ) {

            message =
                "Invalid Supabase API key. Open Supabase → Project Settings → API and replace the Publishable key in script.js.";

        } else if (
            lowerMessage.includes(
                "invalid login credentials"
            )
        ) {

            message =
                "Invalid email or password.";

        } else if (
            lowerMessage.includes(
                "email not confirmed"
            )
        ) {

            message =
                "Your email address has not been confirmed yet. Please check your email.";

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
   REGISTER USER
========================================================= */

async function registerUser(
    name,
    position,
    email,
    password
) {

    if (!db) {

        authMessage(
            "Supabase is not initialized.",
            "error"
        );

        return {
            success: false
        };

    }

    try {

        clearAuthMessage();

        authMessage(
            "Creating account...",
            "loading"
        );

        const {
            data,
            error
        } =
            await db.auth.signUp({

                email:
                    email.trim(),

                password:
                    password,

                options: {

                    data: {

                        full_name:
                            name.trim(),

                        position:
                            position.trim()

                    }

                }

            });

        if (error) {

            console.error(
                "Supabase registration error:",
                error
            );

            throw error;

        }

        if (!data) {

            throw new Error(
                "Supabase did not return a registration response."
            );

        }

        /*
         * If email confirmation is disabled,
         * Supabase normally returns a session.
         */

        if (
            data.user &&
            data.session
        ) {

            currentUser =
                data.user;

            await createProfile(
                data.user,
                name,
                position
            );

            hideLogin();

            showPage(
                "dashboard"
            );

            updateUserInterface();

            await Promise.allSettled([

                loadProjects(),

                loadDocuments(),

                loadDepartmentOrders(),

                loadMonitoring()

            ]);

            authMessage(
                "Account created successfully.",
                "success"
            );

        } else {

            /*
             * Email confirmation is probably enabled.
             */

            authMessage(
                "Account created successfully. Please check your email to confirm your account, then sign in.",
                "success"
            );

            const loginEmail =
                $("loginEmail");

            if (loginEmail) {

                loginEmail.value =
                    email.trim();

            }

            showLoginTab();

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

        let message =
            error?.message ||
            "Unable to create account.";

        const lowerMessage =
            message.toLowerCase();

        if (
            lowerMessage.includes(
                "user already registered"
            )
        ) {

            message =
                "An account with this email already exists.";

        } else if (
            lowerMessage.includes(
                "password should be at least"
            )
        ) {

            message =
                "Password is too short. Please use a stronger password.";

        } else if (
            lowerMessage.includes(
                "invalid api key"
            )
        ) {

            message =
                "Invalid Supabase API key. Check the Publishable key in script.js.";

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

        currentUser =
            null;

        currentProfile =
            null;

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

        currentUser =
            null;

        currentProfile =
            null;

        pdsAIHistory =
            [];

        cachedMonitoring =
            [];

        cachedDocuments =
            [];

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

            /*
             * Still create a local profile
             * from Auth metadata.
             */

            currentProfile = {

                id:
                    currentUser.id,

                email:
                    currentUser.email || "",

                full_name:
                    currentUser.user_metadata
                        ?.full_name ||
                    currentUser.email
                        ?.split("@")[0] ||
                    "PDS User",

                position:
                    currentUser.user_metadata
                        ?.position ||
                    ""

            };

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
   RESTORE SESSION
========================================================= */

async function restoreSession() {

    if (!db) {

        showLogin();

        return;

    }

    try {

        const {
            data,
            error
        } =
            await db.auth.getSession();

        if (error) {

            console.warn(
                "Session retrieval warning:",
                error
            );

        }

        const session =
            data?.session;

        if (
            !session ||
            !session.user
        ) {

            currentUser =
                null;

            currentProfile =
                null;

            showLogin();

            return;

        }

        currentUser =
            session.user;

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

    } catch (error) {

        console.error(
            "Session restoration error:",
            error
        );

        /*
         * One final session check.
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

                await loadUserProfile();

                updateUserInterface();

                return;

            }

        } catch (secondError) {

            console.error(
                "Second session check failed:",
                secondError
            );

        }

        currentUser =
            null;

        currentProfile =
            null;

        showLogin();

    }

}


/* =========================================================
   UPDATE USER INTERFACE
========================================================= */

function updateUserInterface() {

    if (!currentUser) {
        return;
    }

    const profile =
        currentProfile || {};

    const name =
        profile.full_name ||
        currentUser.user_metadata?.full_name ||
        currentUser.email?.split("@")[0] ||
        "PDS User";

    const email =
        currentUser.email ||
        profile.email ||
        "";

    const role =
        profile.role ||
        currentUser.user_metadata?.role ||
        "Member";

    const position =
        profile.position ||
        currentUser.user_metadata?.position ||
        "";

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

    if (sidebarUserName) {

        sidebarUserName.textContent =
            name;

    }

    if (sidebarUserRole) {

        sidebarUserRole.textContent =
            position ||
            role;

    }

    const initial =
        name
            .trim()
            .charAt(0)
            .toUpperCase() ||
        "P";

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
   NORMALIZE PAGE ID
========================================================= */

function normalizePageId(
    pageId
) {

    const aliases = {

        dashboard:
            "dashboard",

        home:
            "dashboard",

        projects:
            "projects",

        monitoring:
            "monitoring",

        "project-monitoring":
            "monitoring",

        documents:
            "documents",

        standards:
            "standards",

        guidelines:
            "standards",

        orders:
            "department-orders",

        "department-orders":
            "department-orders",

        forms:
            "forms",

        news:
            "news",

        "news-announcements":
            "news",

        "pds-ai":
            "pds-ai-assistant",

        "pds-ai-assistant":
            "pds-ai-assistant",

        about:
            "about",

        contact:
            "contact",

        profile:
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

    return document.querySelectorAll(
        "#app .page-section, " +
        "#app [data-page-section], " +
        "#app section[data-section]"
    );

}


/* =========================================================
   SHOW PAGE
========================================================= */

function showPage(
    pageId
) {

    const normalized =
        normalizePageId(
            pageId
        );

    const pages =
        getPDSPages();

    pages.forEach(
        page => {

            const pageValue =
                page.dataset.pageSection ||
                page.dataset.section ||
                page.id;

            const pageNormalized =
                normalizePageId(
                    pageValue
                );

            const active =
                pageNormalized ===
                normalized;

            page.style.display =
                active
                    ? ""
                    : "none";

            page.classList.toggle(
                "active",
                active
            );

        }
    );

    const navItems =
        document.querySelectorAll(
            "#sidebarNav [data-section]"
        );

    navItems.forEach(
        item => {

            const itemPage =
                normalizePageId(
                    item.dataset.section
                );

            item.classList.toggle(
                "active",
                itemPage ===
                normalized
            );

        }
    );

    const title =
        $("pageTitle");

    if (title) {

        const titles = {

            dashboard:
                "Dashboard",

            projects:
                "Projects",

            monitoring:
                "Project Monitoring",

            documents:
                "Documents",

            standards:
                "Standards & Guidelines",

            "department-orders":
                "Department Orders",

            forms:
                "Forms & Templates",

            news:
                "News & Announcements",

            "pds-ai-assistant":
                "PDS AI Assistant",

            about:
                "About PDS",

            contact:
                "Contact Us",

            profile:
                "Profile"

        };

        title.textContent =
            titles[normalized] ||
            normalized;

    }

    /*
     * Load page-specific content.
     */

    if (
        normalized ===
        "projects"
    ) {

        loadProjects();

    }

    if (
        normalized ===
        "monitoring"
    ) {

        loadMonitoring();

    }

    if (
        normalized ===
        "documents"
    ) {

        loadDocuments();

    }

    if (
        normalized ===
        "department-orders"
    ) {

        loadDepartmentOrders();

    }

}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    if (navigationReady) {
        return;
    }

    navigationReady =
        true;

    const nav =
        $("sidebarNav");

    if (!nav) {

        console.warn(
            "PDS: sidebarNav not found."
        );

        return;

    }

    nav.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-section]"
                );

            if (!button) {
                return;
            }

            event.preventDefault();

            const section =
                button.dataset.section;

            if (!section) {
                return;
            }

            if (
                section ===
                "signout"
            ) {

                signOut();

                return;

            }

            showPage(
                section
            );

        }
    );

}


/* =========================================================
   SECTION TARGETS
========================================================= */

function setupSectionTargets() {

    document.addEventListener(
        "click",
        event => {

            const element =
                event.target.closest(
                    "[data-section-target]"
                );

            if (!element) {
                return;
            }

            event.preventDefault();

            showPage(
                element.dataset.sectionTarget
            );

        }
    );

}


/* =========================================================
   GLOBAL SEARCH
========================================================= */

function setupGlobalSearch() {

    const input =
        $("globalSearch");

    if (!input) {
        return;
    }

    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key !==
                "Enter"
            ) {

                return;

            }

            const query =
                input.value
                    .trim()
                    .toLowerCase();

            if (!query) {
                return;
            }

            const monitoringMatch =
                cachedMonitoring.find(
                    item =>
                        monitoringSearchText(
                            item
                        ).includes(
                            query
                        )
                );

            if (monitoringMatch) {

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

            const projectCards =
                document.querySelectorAll(
                    ".project-card"
                );

            let found =
                false;

            projectCards.forEach(
                card => {

                    const visible =
                        card.textContent
                            .toLowerCase()
                            .includes(
                                query
                            );

                    card.style.display =
                        visible
                            ? ""
                            : "none";

                    if (visible) {
                        found = true;
                    }

                }
            );

            if (found) {

                showPage(
                    "projects"
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

        loadMonitoring()

    ]);

}


/* =========================================================
   PROJECTS
========================================================= */

async function loadProjects() {

    if (!db) {
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
                .order(
                    "created_at",
                    {
                        ascending:
                            false
                    }
                );

        if (error) {
            throw error;
        }

        const projects =
            data || [];

        updateProjectStats(
            projects
        );

        renderProjects(
            projects
        );

    } catch (error) {

        console.error(
            "Project loading error:",
            error
        );

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
                normalizeStatus(
                    project.status
                ).includes(
                    "ongoing"
                ) ||
                normalizeStatus(
                    project.status
                ).includes(
                    "in progress"
                )
        ).length;

    const completed =
        projects.filter(
            project =>
                normalizeStatus(
                    project.status
                ).includes(
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

    const container =
        $("projectsList");

    if (!container) {
        return;
    }

    if (!projects.length) {

        container.innerHTML = `
            <div class="empty-state">
                <strong>No projects found</strong>
                <span>
                    Project records will appear here when available.
                </span>
            </div>
        `;

        return;
    }

    container.innerHTML =
        projects
            .map(
                project => {

                    const id =
                        escapeJS(
                            project.id
                        );

                    const title =
                        escapeHTML(
                            project.name ||
                            project.title ||
                            "Untitled Project"
                        );

                    const location =
                        escapeHTML(
                            project.location ||
                            "Location not specified"
                        );

                    const status =
                        escapeHTML(
                            project.status ||
                            "Not specified"
                        );

                    const progress =
                        parsePercent(
                            project.progress
                        ) ??
                        0;

                    return `

                        <article
                            class="project-card"
                            data-project-id="${escapeHTML(project.id)}"
                            onclick="openProject('${id}')"
                        >

                            <div>

                                <div class="project-card-title">
                                    ${title}
                                </div>

                                <div class="project-card-location">
                                    ${location}
                                </div>

                            </div>

                            <div class="project-card-meta">

                                <span>
                                    ${status}
                                </span>

                                <strong>
                                    ${progress.toFixed(0)}%
                                </strong>

                            </div>

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

    if (!db) {
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

        if (!data) {

            alert(
                "Project not found."
            );

            return;

        }

        const modal =
            $("projectModal");

        const content =
            $("projectModalContent");

        if (!modal || !content) {
            return;
        }

        content.innerHTML = `

            <div class="project-modal-header">

                <div class="eyebrow">
                    PROJECT RECORD
                </div>

                <h2>
                    ${escapeHTML(
                        data.name ||
                        data.title ||
                        "Untitled Project"
                    )}
                </h2>

            </div>

            <div class="project-modal-grid">

                <div>
                    <strong>PROJECT CODE</strong>
                    <span>
                        ${escapeHTML(
                            data.project_code ||
                            "—"
                        )}
                    </span>
                </div>

                <div>
                    <strong>LOCATION</strong>
                    <span>
                        ${escapeHTML(
                            data.location ||
                            "—"
                        )}
                    </span>
                </div>

                <div>
                    <strong>STATUS</strong>
                    <span>
                        ${escapeHTML(
                            data.status ||
                            "—"
                        )}
                    </span>
                </div>

                <div>
                    <strong>PROGRESS</strong>
                    <span>
                        ${formatPercent(
                            data.progress
                        )}
                    </span>
                </div>

                <div>
                    <strong>TARGET DATE</strong>
                    <span>
                        ${formatDate(
                            data.target_date
                        )}
                    </span>
                </div>

                <div>
                    <strong>NOTES</strong>
                    <span>
                        ${escapeHTML(
                            data.notes ||
                            "—"
                        )}
                    </span>
                </div>

            </div>

        `;

        modal.style.display =
            "flex";

    } catch (error) {

        console.error(
            "Project loading error:",
            error
        );

        alert(
            error.message ||
            "Unable to load project."
        );

    }

}


/* =========================================================
   PROJECT MODAL
========================================================= */

function setupProjectModal() {

    const modal =
        $("projectModal");

    if (!modal) {
        return;
    }

    const closeButtons =
        modal.querySelectorAll(
            "[data-close], .modal-close, #closeProjectModal"
        );

    closeButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                closeProjectModal
            );

        }
    );

    modal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modal
            ) {

                closeProjectModal();

            }

        }
    );

}


function closeProjectModal() {

    const modal =
        $("projectModal");

    if (modal) {

        modal.style.display =
            "none";

    }

}


/* =========================================================
   DOCUMENTS
========================================================= */

async function loadDocuments() {

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
                        ascending:
                            false
                    }
                );

        if (error) {
            throw error;
        }

        cachedDocuments =
            data || [];

        const total =
            $("totalDocuments");

        if (total) {

            total.textContent =
                cachedDocuments.length;

        }

        renderDocuments(
            cachedDocuments
        );

    } catch (error) {

        console.error(
            "Document loading error:",
            error
        );

        cachedDocuments =
            [];

        const container =
            $("documentsList");

        if (container) {

            container.innerHTML = `
                <div class="empty-state">
                    <strong>Unable to load documents</strong>
                    <span>
                        ${escapeHTML(
                            error.message ||
                            "Please check the documents table and permissions."
                        )}
                    </span>
                </div>
            `;

        }

    }

}


/* =========================================================
   RENDER DOCUMENTS
========================================================= */

function renderDocuments(
    documents
) {

    const container =
        $("documentsList");

    if (!container) {
        return;
    }

    if (!documents.length) {

        container.innerHTML = `
            <div class="empty-state">
                <strong>No documents found</strong>
                <span>
                    Upload technical documents to make them available here.
                </span>
            </div>
        `;

        return;

    }

    container.innerHTML =
        documents
            .map(
                document => `

                    <article
                        class="document-card"
                        data-document-id="${escapeHTML(document.id)}"
                    >

                        <div class="document-card-icon">
                            DOC
                        </div>

                        <div class="document-card-content">

                            <div class="document-card-title">
                                ${escapeHTML(
                                    document.title ||
                                    document.file_name ||
                                    "Untitled Document"
                                )}
                            </div>

                            <div class="document-card-meta">

                                ${escapeHTML(
                                    document.file_name ||
                                    ""
                                )}

                            </div>

                        </div>

                        <div class="document-card-actions">

                            <button
                                type="button"
                                class="button secondary"
                                onclick="openDocument('${escapeJS(document.id)}')"
                            >
                                OPEN
                            </button>

                            <button
                                type="button"
                                class="button secondary"
                                onclick="deleteDocument('${escapeJS(document.id)}')"
                            >
                                DELETE
                            </button>

                        </div>

                    </article>

                `
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

    documentSearchReady =
        true;

    const input =
        $("documentSearch");

    if (!input) {
        return;
    }

    input.addEventListener(
        "input",
        () => {

            const query =
                input.value
                    .trim()
                    .toLowerCase();

            const filtered =
                cachedDocuments.filter(
                    document => {

                        return [

                            document.title,

                            document.file_name,

                            document.project_name,

                            document.category,

                            document.mime_type

                        ]
                            .filter(
                                value =>
                                    value !== null &&
                                    value !== undefined
                            )
                            .join(" ")
                            .toLowerCase()
                            .includes(
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

function setupDocumentModal() {

    const modal =
        $("documentModal");

    if (!modal) {
        return;
    }

    const close =
        $("closeDocumentModal");

    if (close) {

        close.addEventListener(
            "click",
            closeDocumentModal
        );

    }

    modal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modal
            ) {

                closeDocumentModal();

            }

        }
    );

}


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
        event => {

            event.preventDefault();

            /*
             * Actual upload is handled by
             * setupDocumentUpload().
             */

        }
    );

}


/* =========================================================
   DOCUMENT UPLOAD SETUP
========================================================= */

function setupDocumentUpload() {

    const input =
        $("documentFile");

    if (!input) {
        return;
    }

    input.addEventListener(
        "change",
        event => {

            if (
                event.target.files &&
                event.target.files.length
            ) {

                console.log(
                    "Document selected:",
                    event.target.files[0].name
                );

            }

        }
    );

}


/* =========================================================
   UPLOAD DOCUMENT
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

    const input =
        $("documentFile");

    const file =
        input?.files?.[0];

    if (!file) {

        alert(
            "Please select a file."
        );

        return;

    }

    try {

        const path =
            `${currentUser.id}/${Date.now()}_${file.name}`;

        const {
            error: uploadError
        } =
            await db.storage
                .from("documents")
                .upload(
                    path,
                    file,
                    {
                        upsert:
                            false
                    }
                );

        if (uploadError) {
            throw uploadError;
        }

        const titleInput =
            $("documentTitle");

        const categoryInput =
            $("documentCategory");

        const title =
            titleInput?.value?.trim() ||
            file.name;

        const category =
            categoryInput?.value?.trim() ||
            "";

        const {
            error: insertError
        } =
            await db
                .from("documents")
                .insert({

                    title:
                        title,

                    file_name:
                        file.name,

                    file_path:
                        path,

                    file_size:
                        file.size,

                    mime_type:
                        file.type,

                    project_name:
                        category,

                    uploaded_by:
                        currentUser.id

                });

        if (insertError) {

            /*
             * If DB insert fails, remove
             * the uploaded file so that
             * orphaned Storage files are
             * avoided.
             */

            await db.storage
                .from("documents")
                .remove([
                    path
                ]);

            throw insertError;

        }

        alert(
            "Document uploaded successfully."
        );

        if (input) {

            input.value =
                "";

        }

        await loadDocuments();

    } catch (error) {

        console.error(
            "Document upload error:",
            error
        );

        alert(
            error.message ||
            "Unable to upload document. Check Storage and INSERT policies."
        );

    }

}


/* =========================================================
   OPEN DOCUMENT
========================================================= */

async function openDocument(
    documentId
) {

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
                .eq(
                    "id",
                    documentId
                )
                .maybeSingle();

        if (error) {
            throw error;
        }

        if (
            !data ||
            !data.file_path
        ) {

            alert(
                "Document file path not found."
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
            !signedData?.signedUrl
        ) {

            throw new Error(
                "Unable to create document access URL."
            );

        }

        window.open(
            signedData.signedUrl,
            "_blank",
            "noopener,noreferrer"
        );

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
        !currentUser
    ) {

        return;

    }

    const confirmed =
        window.confirm(
            "Delete this document?"
        );

    if (!confirmed) {
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
                    "id,file_path,uploaded_by"
                )
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

        if (
            data.uploaded_by &&
            data.uploaded_by !==
                currentUser.id
        ) {

            alert(
                "You can only delete documents that you uploaded."
            );

            return;

        }

        if (data.file_path) {

            const {
                error: storageError
            } =
                await db.storage
                    .from("documents")
                    .remove([
                        data.file_path
                    ]);

            if (storageError) {

                console.warn(
                    "Storage deletion warning:",
                    storageError
                );

            }

        }

        const {
            error: deleteError
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


/* =========================================================
   RENDER DEPARTMENT ORDERS
========================================================= */

function renderDepartmentOrders(
    orders
) {

    const container =
        $("departmentOrdersList");

    if (!container) {
        return;
    }

    if (!orders.length) {

        container.innerHTML = `
            <div class="empty-state">
                <strong>No Department Orders found</strong>
            </div>
        `;

        return;

    }

    container.innerHTML =
        orders
            .map(
                order => `

                    <article class="document-card">

                        <div class="document-card-icon">
                            DO
                        </div>

                        <div class="document-card-content">

                            <div class="document-card-title">
                                ${escapeHTML(
                                    order.number
                                )}
                                —
                                ${escapeHTML(
                                    order.title
                                )}
                            </div>

                            <div class="document-card-meta">

                                ${escapeHTML(
                                    order.year
                                )}
                                ·
                                ${escapeHTML(
                                    order.category
                                )}

                            </div>

                            <p>
                                ${escapeHTML(
                                    order.description
                                )}
                            </p>

                        </div>

                    </article>

                `
            )
            .join("");

}


/* =========================================================
   DEPARTMENT ORDER FILTERS
========================================================= */

function setupDepartmentOrderFilters() {

    const search =
        $("departmentOrderSearch");

    const year =
        $("departmentOrderYear");

    const category =
        $("departmentOrderCategory");

    const apply =
        () => {

            const query =
                search?.value
                    ?.trim()
                    .toLowerCase() ||
                "";

            const selectedYear =
                year?.value ||
                "";

            const selectedCategory =
                category?.value ||
                "";

            const filtered =
                departmentOrders.filter(
                    order => {

                        const text =
                            [
                                order.number,
                                order.year,
                                order.title,
                                order.description,
                                order.category
                            ]
                                .join(" ")
                                .toLowerCase();

                        return (

                            (
                                !query ||
                                text.includes(
                                    query
                                )
                            )

                            &&

                            (
                                !selectedYear ||
                                order.year ===
                                    selectedYear
                            )

                            &&

                            (
                                !selectedCategory ||
                                order.category ===
                                    selectedCategory
                            )

                        );

                    }
                );

            renderDepartmentOrders(
                filtered
            );

        };

    if (search) {

        search.addEventListener(
            "input",
            apply
        );

    }

    if (year) {

        year.addEventListener(
            "change",
            apply
        );

    }

    if (category) {

        category.addEventListener(
            "change",
            apply
        );

    }

    renderDepartmentOrders(
        departmentOrders
    );

}


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
   PARSE PERCENT
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
        Number.isNaN(
            number
        )
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
   FORMAT PERCENT
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
   MONITORING STATUS CLASS
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
        ) ||
        status.includes(
            "not yet started"
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
   MONITORING ROW PROGRESS
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
   MONITORING LOAD
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
                        ascending:
                            true
                    }
                );

        if (error) {

            const message =
                String(
                    error.message || ""
                )
                    .toLowerCase();

            if (
                message.includes(
                    "could not find the table"
                ) ||
                message.includes(
                    "relation"
                )
            ) {

                console.warn(
                    "Monitoring table is not yet available:",
                    error.message
                );

                cachedMonitoring =
                    [];

                updateMonitoringStats(
                    []
                );

                if (container) {

                    container.innerHTML = `
                        <div class="empty-state">

                            <strong>
                                Monitoring table not yet connected
                            </strong>

                            <span>
                                The Project Monitoring interface is ready.
                                Create the Supabase "monitoring" table to load and edit monitoring records.
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

        updateMonitoringStats(
            []
        );

        if (container) {

            container.innerHTML = `
                <div class="empty-state">

                    <strong>
                        Unable to load monitoring data
                    </strong>

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
                ) ||
                status.includes(
                    "not yet started"
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
   MONITORING FILTER
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
   MONITORING RENDER
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

                    <strong>
                        No matching monitoring records
                    </strong>

                    <span>
                        Try changing the search or status filter.
                    </span>

                </div>
            `;

        } else {

            container.innerHTML = `
                <div class="empty-state">

                    <strong>
                        No monitoring records
                    </strong>

                    <span>
                        Monitoring records will appear here after the Supabase monitoring table is populated.
                    </span>

                </div>
            `;

        }

        return;

    }

    container.innerHTML = `

        <div style="overflow-x:auto;">

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

        </div>

    `;

}


/* =========================================================
   NORMALIZE NAME
   Used for monitoring assignment control
========================================================= */

function normalizeMonitoringName(
    value
) {

    return String(
        value || ""
    )
        .toLowerCase()
        .replace(
            /[^a-z0-9]+/g,
            ""
        );

}


/* =========================================================
   GET CURRENT USER NAME
========================================================= */

function getCurrentMonitoringName() {

    if (!currentUser) {
        return "";
    }

    return (
        currentProfile?.full_name ||
        currentUser.user_metadata
            ?.full_name ||
        currentUser.email
            ?.split("@")[0] ||
        ""
    )
        .trim();

}


/* =========================================================
   CHECK MONITORING ASSIGNMENT
========================================================= */

function isAssignedMonitoringUser(
    record
) {

    if (
        !record ||
        !currentUser
    ) {

        return false;

    }

    const currentName =
        normalizeMonitoringName(
            getCurrentMonitoringName()
        );

    if (!currentName) {
        return false;
    }

    const programPerson =
        normalizeMonitoringName(
            record.program2
        );

    const planPerson =
        normalizeMonitoringName(
            record.plan
        );

    /*
     * Exact normalized name match.
     */

    if (
        programPerson &&
        programPerson ===
            currentName
    ) {

        return true;

    }

    if (
        planPerson &&
        planPerson ===
            currentName
    ) {

        return true;

    }

    /*
     * Also allow a full assigned name
     * to contain the user's full name.
     *
     * Example:
     * "Engr. Juan Dela Cruz"
     * vs
     * "Juan Dela Cruz"
     */

    if (
        programPerson &&
        (
            programPerson.includes(
                currentName
            ) ||
            currentName.includes(
                programPerson
            )
        )
    ) {

        return true;

    }

    if (
        planPerson &&
        (
            planPerson.includes(
                currentName
            ) ||
            currentName.includes(
                planPerson
            )
        )
    ) {

        return true;

    }

    return false;

}


/* =========================================================
   CAN EDIT MONITORING RECORD
========================================================= */

function canEditMonitoringRecord(
    record
) {

    if (
        !currentUser ||
        !record
    ) {

        return false;

    }

    /*
     * Only assigned personnel can edit.
     *
     * program2 = Program assigned personnel
     * plan     = Plan assigned personnel
     */

    return isAssignedMonitoringUser(
        record
    );

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

    const assigned =
        canEditMonitoringRecord(
            item
        );

    const normalizedOverall =
        normalizeStatus(
            overallStatus
        );

    const completed =
        normalizedOverall.includes(
            "completed"
        );

    /*
     * Completed projects are VIEW only.
     * Non-completed projects show EDIT only
     * to assigned personnel.
     */

    let actionButton = "";

    if (completed) {

        actionButton = `

            <button
                type="button"
                class="button secondary monitoring-view-button"
                data-monitoring-id="${escapeHTML(id)}"
                style="
                    height:32px;
                    padding:0 10px;
                    font-size:9px;
                "
            >
                VIEW
            </button>

        `;

    } else if (assigned) {

        actionButton = `

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

        `;

    } else {

        actionButton = `

            <button
                type="button"
                class="button secondary monitoring-view-button"
                data-monitoring-id="${escapeHTML(id)}"
                style="
                    height:32px;
                    padding:0 10px;
                    font-size:9px;
                "
            >
                VIEW
            </button>

        `;

    }

    return `

        <tr
            style="
                border-bottom:1px solid #dbe3e8;
            "
        >

            <td
                style="
                    padding:10px;
                    font-weight:700;
                    white-space:nowrap;
                "
            >
                ${contractId}
            </td>

            <td style="padding:10px;">

                <div
                    style="
                        font-weight:700;
                        color:#063b61;
                    "
                >
                    ${title}
                </div>

            </td>

            <td
                style="
                    padding:10px;
                    white-space:nowrap;
                "
            >
                ${municipality}
            </td>

            <td
                style="
                    padding:10px;
                    font-weight:600;
                    white-space:nowrap;
                "
            >
                ${programPerson}
            </td>

            <td
                style="
                    padding:10px;
                    font-weight:600;
                    white-space:nowrap;
                "
            >
                ${planPerson}
            </td>

            <td
                style="
                    padding:10px;
                    text-align:center;
                    font-weight:700;
                "
            >
                ${programPercent}
            </td>

            <td
                style="
                    padding:10px;
                    text-align:center;
                    font-weight:700;
                "
            >
                ${planPercent}
            </td>

            <td
                style="
                    padding:10px;
                    text-align:center;
                    white-space:nowrap;
                "
            >

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

            <td
                style="
                    padding:10px;
                    text-align:center;
                    white-space:nowrap;
                "
            >
                ${lastUpdated}
            </td>

            <td
                style="
                    padding:10px;
                    text-align:center;
                    font-weight:700;
                "
            >
                ${escapeHTML(days)}
            </td>

            <td
                style="
                    padding:10px;
                    text-align:center;
                "
            >

                ${actionButton}

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
   MONITORING SELECT
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


/* =========================================================
   MONITORING INPUT
========================================================= */

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


/* =========================================================
   MONITORING TEXTAREA
========================================================= */

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
   OPEN MONITORING VIEWER
========================================================= */

function openMonitoringViewer(
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

    const content =
        $("monitoringEditContent");

    const saveButton =
        $("saveMonitoringButton");

    if (
        !modal ||
        !content
    ) {

        return;

    }

    if (title) {

        title.textContent =
            `View Monitoring — ${
                record.contract_id ||
                "Project Record"
            }`;

    }

    if (saveButton) {

        saveButton.style.display =
            "none";

    }

    content.innerHTML = `

        <div
            style="
                margin-bottom:20px;
                padding:12px 15px;
                background:#f3f7f9;
                border-left:4px solid #063b61;
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
                display:grid;
                grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
                gap:12px;
            "
        >

            ${monitoringInput(
                "viewProgram",
                "Program",
                record.program
            )}

            ${monitoringInput(
                "viewPlan",
                "Plan",
                record.plan
            )}

            ${monitoringInput(
                "viewProgramPercent",
                "Program %",
                formatPercent(
                    record.program_percent
                )
            )}

            ${monitoringInput(
                "viewPlanPercent",
                "Plan %",
                formatPercent(
                    record.plan_percent
                )
            )}

            ${monitoringInput(
                "viewProgramStatus",
                "Program Status",
                record.program_status
            )}

            ${monitoringInput(
                "viewPlanStatus",
                "Plan Status",
                record.plan_status
            )}

            ${monitoringInput(
                "viewOverallStatus",
                "Overall Status",
                record.overall_status
            )}

            ${monitoringInput(
                "viewLastUpdated",
                "Last Updated",
                formatDate(
                    record.last_updated
                )
            )}

        </div>

        <div
            style="
                margin-top:18px;
            "
        >

            ${monitoringTextarea(
                "viewProgramRemarks",
                "Program Remarks",
                record.remarks
            )}

        </div>

        <div
            style="
                margin-top:12px;
            "
        >

            ${monitoringTextarea(
                "viewPlanRemarks",
                "Plan Remarks",
                record.remarks2
            )}

        </div>

    `;

    /*
     * Make viewer fields read-only.
     */

    content
        .querySelectorAll(
            "input, textarea, select"
        )
        .forEach(
            element => {

                element.disabled =
                    true;

            }
        );

    modal.style.display =
        "flex";

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

    /*
     * SECURITY / ACCESS CHECK
     */

    if (
        !canEditMonitoringRecord(
            record
        )
    ) {

        alert(
            "Editing is restricted to the personnel assigned to this monitoring record."
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

    const saveButton =
        $("saveMonitoringButton");

    if (
        !modal ||
        !content
    ) {

        return;

    }

    if (saveButton) {

        saveButton.style.display =
            "";

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
                grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
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
                grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
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
                grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
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
                grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
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
                margin-top:25px;
                padding:10px 12px;
                background:#f7fafb;
                border:1px solid #d7e1e7;
                font-size:9px;
                color:#687984;
            "
        >

            Saving this record will automatically update
            <strong>LAST UPDATED</strong>
            to the current date.

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

    /*
     * IMPORTANT:
     * Re-read the current record from cache
     * before saving. This prevents a user
     * from bypassing the EDIT restriction
     * through the browser interface.
     */

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

    if (
        !canEditMonitoringRecord(
            record
        )
    ) {

        alert(
            "You are not authorized to edit this monitoring record."
        );

        closeMonitoringEditor();

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

    /*
     * Delegated monitoring buttons.
     */

    document.addEventListener(
        "click",
        event => {

            const editButton =
                event.target.closest(
                    ".monitoring-edit-button"
                );

            const viewButton =
                event.target.closest(
                    ".monitoring-view-button"
                );

            if (editButton) {

                event.preventDefault();

                openMonitoringEditor(
                    editButton.dataset.monitoringId
                );

                return;

            }

            if (viewButton) {

                event.preventDefault();

                openMonitoringViewer(
                    viewButton.dataset.monitoringId
                );

            }

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

    const saveButton =
        $("saveMonitoringButton");

    if (saveButton) {

        saveButton.style.display =
            "";

    }

}


/* =========================================================
   PDS AI SETUP
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

    /*
     * Automatically clear input.
     */

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

            try {

                await refreshAll();

            } finally {

                setTimeout(
                    () => {

                        button.classList.remove(
                            "is-loading"
                        );

                    },
                    300
                );

            }

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

    const loginForm =
        $("loginForm");

    const registerForm =
        $("registerForm");

    const tabLogin =
        $("tabLogin");

    const tabRegister =
        $("tabRegister");

    /*
     * Do not mark the setup ready until
     * the forms actually exist.
     */

    if (
        !loginForm &&
        !registerForm
    ) {

        console.warn(
            "PDS: Authentication forms not found."
        );

        return;

    }

    authFormsReady =
        true;


    /* -----------------------------------------------------
       LOGIN TAB
    ----------------------------------------------------- */

    if (tabLogin) {

        tabLogin.addEventListener(
            "click",
            event => {

                event.preventDefault();

                showLoginTab();

            }
        );

    }


    /* -----------------------------------------------------
       REGISTER TAB
    ----------------------------------------------------- */

    if (tabRegister) {

        tabRegister.addEventListener(
            "click",
            event => {

                event.preventDefault();

                showRegisterTab();

            }
        );

    }


    /* -----------------------------------------------------
       LOGIN FORM
    ----------------------------------------------------- */

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                const email =
                    $("loginEmail")
                        ?.value
                        ?.trim() ||
                    "";

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


    /* -----------------------------------------------------
       REGISTER FORM
    ----------------------------------------------------- */

    if (registerForm) {

        registerForm.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                const name =
                    $("registerName")
                        ?.value
                        ?.trim() ||
                    "";

                const position =
                    $("registerPosition")
                        ?.value
                        ?.trim() ||
                    "";

                const email =
                    $("registerEmail")
                        ?.value
                        ?.trim() ||
                    "";

                const password =
                    $("registerPassword")
                        ?.value ||
                    "";

                const confirm =
                    $("registerConfirm")
                        ?.value ||
                    "";

                if (
                    !name ||
                    !position ||
                    !email ||
                    !password ||
                    !confirm
                ) {

                    authMessage(
                        "Please complete all registration fields.",
                        "error"
                    );

                    return;

                }

                if (
                    password !==
                    confirm
                ) {

                    authMessage(
                        "Passwords do not match.",
                        "error"
                    );

                    return;

                }

                if (
                    password.length <
                    6
                ) {

                    authMessage(
                        "Password must be at least 6 characters.",
                        "error"
                    );

                    return;

                }

                const button =
                    registerForm.querySelector(
                        'button[type="submit"]'
                    );

                if (button) {

                    button.disabled =
                        true;

                    button.textContent =
                        "CREATING ACCOUNT...";

                }

                await registerUser(
                    name,
                    position,
                    email,
                    password
                );

                if (button) {

                    button.disabled =
                        false;

                    button.textContent =
                        "CREATE ACCOUNT";

                }

            }
        );

    }

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

                cachedDocuments =
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
                    "SIGNED_IN"
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
     * IMPORTANT:
     * Show the login screen first.
     *
     * The old version hid both the login
     * and app before initialization. If
     * any JavaScript failed afterward,
     * the user could get a blank screen.
     */

    showLogin();

    const supabaseReady =
        initializeSupabase();

    if (!supabaseReady) {

        console.error(
            "PDS: Supabase initialization failed."
        );

        showLogin();

        authMessage(
            "Supabase configuration error. Check the Publishable API key in script.js.",
            "error"
        );

        return;

    }

    try {

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

        /*
         * Session restoration is intentionally
         * done AFTER all event handlers are ready.
         */

        await restoreSession();

        console.log(
            "PDS — Ready."
        );

    } catch (error) {

        console.error(
            "PDS initialization error:",
            error
        );

        /*
         * Never leave the user with a blank page.
         */

        showLogin();

        authMessage(
            "PDS could not finish loading. Please refresh the page and try again.",
            "error"
        );

    }

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
   DEBUG MESSAGE
========================================================= */

console.log(
    "PDS HUB SCRIPT LOADED — corrected script.js"
);
