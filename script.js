/* =========================================================
   PDS — PLANNING & DESIGN SECTION
   COMPLETE SCRIPT.JS
   PDS ONLY
========================================================= */


/* =========================================================
   SUPABASE CONFIGURATION
========================================================= */

const SUPABASE_URL =
    "https://zvwghoabsqfyakbqzhil.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_oJ3Zc3TplfYgePQEmTrJ8Q_qycxR0jK";

const db =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


/* =========================================================
   GLOBAL STATE
========================================================= */

let currentUser = null;
let currentProfile = null;

let cachedProjects = [];
let cachedDocuments = [];

let pdsAIHistory = [];

let appLoading = false;

let navigationReady = false;
let authFormsReady = false;
let modalReady = false;
let searchReady = false;
let aiReady = false;
let refreshReady = false;
let notificationReady = false;


/* =========================================================
   PAGE TITLES
========================================================= */

const pageTitles = {

    dashboard:
        "Dashboard",

    projects:
        "Projects",

    documents:
        "Documents",

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
        "Profile"

};


/* =========================================================
   DEPARTMENT ORDERS
========================================================= */

const planningDesignOrders = [

    {
        number: "DO 75",
        year: "2024",

        title:
            "Guidelines for the Conduct of Geotechnical Investigation for all DPWH Infrastructure",

        description:
            "Guidelines for geotechnical investigation for proposed DPWH infrastructure projects and preparation of design documents.",

        category:
            "geotechnical",

        categoryName:
            "Geotechnical",

        url:
            "https://www.dpwh.gov.ph/dpwh/sites/default/files/issuances/do_075_s2024.pdf"
    },

    {
        number: "DO 159",
        year: "2022",

        title:
            "Implementation of the Social and Environmental Management System Operations Manual",

        description:
            "Reference for environmental and social considerations during project development and implementation.",

        category:
            "planning",

        categoryName:
            "Planning & Project Development",

        url:
            "https://www.dpwh.gov.ph/dpwh/issuances/department-order/26980"
    },

    {
        number: "DO 37",
        year: "2021",

        title:
            "Infrastructure Right-of-Way Related Guidelines",

        description:
            "Reference related to Infrastructure Right-of-Way activities supporting project development.",

        category:
            "row",

        categoryName:
            "Right-of-Way",

        url:
            "https://www.dpwh.gov.ph/"
    },

    {
        number: "DO 120",
        year: "2019",

        title:
            "Road Network Definition and Inventory Update Manual and Visual Road Condition Assessment Manual",

        description:
            "Reference for road network information, inventory and visual road condition assessment.",

        category:
            "roads",

        categoryName:
            "Roads",

        url:
            "https://www.dpwh.gov.ph/"
    },

    {
        number: "DO 27",
        year: "2019",

        title:
            "Manual on Streamflow — 2018 Edition",

        description:
            "Technical reference for streamflow information used in hydrologic studies and infrastructure planning.",

        category:
            "hydrology",

        categoryName:
            "Hydrology & Drainage",

        url:
            "https://www.dpwh.gov.ph/"
    },

    {
        number: "DO 28",
        year: "2019",

        title:
            "Cost Estimation Manual for Low Rise Buildings and High Rise Buildings",

        description:
            "Reference for preparation and evaluation of construction cost estimates for building projects.",

        category:
            "standards",

        categoryName:
            "Standards & Manuals",

        url:
            "https://www.dpwh.gov.ph/"
    }

];


/* =========================================================
   AUTH SCREEN
========================================================= */

function showLogin() {

    const authScreen =
        document.getElementById("authScreen");

    const app =
        document.getElementById("app");


    if (authScreen) {

        authScreen.style.display = "flex";

    }


    if (app) {

        app.style.display = "none";

    }

}


/* =========================================================
   AUTH MESSAGE
========================================================= */

function clearAuthMessages() {

    const message =
        document.getElementById("loginMessage");

    if (!message) {
        return;
    }

    message.textContent = "";
    message.className = "";

}


function authMessage(
    message,
    type = "error"
) {

    const element =
        document.getElementById("loginMessage");

    if (!element) {
        return;
    }

    element.textContent =
        message || "";

    element.className =
        type;

}


/* =========================================================
   LOGIN
========================================================= */

async function loginUser(
    email,
    password
) {

    clearAuthMessages();

    authMessage(
        "Signing in...",
        "info"
    );


    try {

        const {
            data,
            error
        } =
            await db.auth.signInWithPassword({

                email:
                    email.trim(),

                password

            });


        if (error) {
            throw error;
        }


        if (!data?.user) {

            throw new Error(
                "No user account was returned."
            );

        }


        currentUser =
            data.user;


        console.log(
            "PDS: Login successful."
        );


        /*
           SHOW APP IMMEDIATELY
        */

        showApplication();


        /*
           Load profile/data after
           the interface is visible.
        */

        await loadApplication();

    }
    catch(error) {

        console.error(
            "PDS login error:",
            error
        );


        authMessage(
            error.message ||
            "Unable to sign in.",
            "error"
        );

    }

}


/* =========================================================
   SHOW APPLICATION
========================================================= */

function showApplication() {

    const authScreen =
        document.getElementById("authScreen");

    const app =
        document.getElementById("app");


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
   SIGN OUT
========================================================= */

async function signOut() {

    try {

        const {
            error
        } =
            await db.auth.signOut();


        if (error) {
            throw error;
        }


        currentUser = null;
        currentProfile = null;

        cachedProjects = [];
        cachedDocuments = [];

        pdsAIHistory = [];


        const chatbot =
            document.getElementById(
                "pdsAiChatbot"
            );


        if (chatbot) {

            chatbot.style.display =
                "none";

        }


        showLogin();

        clearAuthMessages();


        const loginForm =
            document.getElementById(
                "loginForm"
            );


        if (loginForm) {

            loginForm.reset();

        }


        console.log(
            "PDS: Signed out."
        );

    }
    catch(error) {

        console.error(
            "PDS sign out error:",
            error
        );

    }

}


/* =========================================================
   LOAD APPLICATION
========================================================= */

async function loadApplication() {

    if (appLoading) {
        return;
    }


    appLoading = true;


    try {

        const {
            data,
            error
        } =
            await db.auth.getUser();


        if (error) {
            throw error;
        }


        if (!data?.user) {

            currentUser = null;

            showLogin();

            return;

        }


        currentUser =
            data.user;


        /*
           PROFILE IS OPTIONAL.
           Failure here must NOT prevent login.
        */

        await loadProfile();


        /*
           SHOW APPLICATION
        */

        showApplication();


        updateUserInterface();


        /*
           ALWAYS START AT DASHBOARD
        */

        showPage(
            "dashboard",
            {
                skipScroll: true
            }
        );


        /*
           Load data independently.
        */

        await refreshAll();


        console.log(
            "PDS: Application loaded."
        );

    }
    catch(error) {

        console.error(
            "PDS application error:",
            error
        );


        /*
           IMPORTANT:
           If a valid authenticated user exists,
           DO NOT return them to Sign In.
        */

        if (currentUser) {

            showApplication();

            updateUserInterface();

            showPage(
                "dashboard",
                {
                    skipScroll: true
                }
            );

        }
        else {

            showLogin();

        }

    }
    finally {

        appLoading = false;

    }

}


/* =========================================================
   LOAD PROFILE
========================================================= */

async function loadProfile() {

    if (!currentUser) {
        return;
    }


    const fallbackProfile = {

        id:
            currentUser.id,

        email:
            currentUser.email || "",

        full_name:
            currentUser.user_metadata?.full_name ||
            currentUser.email ||
            "PDS User",

        role:
            "PLANNING & DESIGN"

    };


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
                "PDS profile warning:",
                error
            );


            currentProfile =
                fallbackProfile;


            return;

        }


        currentProfile =
            data ||
            fallbackProfile;

    }
    catch(error) {

        console.warn(
            "PDS profile error:",
            error
        );


        currentProfile =
            fallbackProfile;

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
        currentUser.email ||
        "PDS User";


    const email =
        profile.email ||
        currentUser.email ||
        "—";


    const role =
        profile.role ||
        "PLANNING & DESIGN";


    const initials =
        getInitials(name);


    const sidebarUserName =
        document.getElementById(
            "sidebarUserName"
        );


    const sidebarUserRole =
        document.getElementById(
            "sidebarUserRole"
        );


    const sidebarAvatar =
        document.getElementById(
            "sidebarAvatar"
        );


    const topAvatar =
        document.getElementById(
            "topAvatar"
        );


    const profileName =
        document.getElementById(
            "profileName"
        );


    const profileEmail =
        document.getElementById(
            "profileEmail"
        );


    if (sidebarUserName) {

        sidebarUserName.textContent =
            name;

    }


    if (sidebarUserRole) {

        sidebarUserRole.textContent =
            role;

    }


    if (sidebarAvatar) {

        sidebarAvatar.textContent =
            initials;

    }


    if (topAvatar) {

        topAvatar.textContent =
            initials;

    }


    if (profileName) {

        profileName.textContent =
            name;

    }


    if (profileEmail) {

        profileEmail.textContent =
            email;

    }

}


/* =========================================================
   INITIALS
========================================================= */

function getInitials(name) {

    if (!name) {
        return "PDS";
    }


    const words =
        String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (words.length === 1) {

        return words[0]
            .substring(0, 2)
            .toUpperCase();

    }


    return (
        words[0][0] +
        words[words.length - 1][0]
    ).toUpperCase();

}


/* =========================================================
   PAGE NORMALIZATION
========================================================= */

function normalizePageId(
    pageId
) {

    const value =
        String(
            pageId || ""
        )
            .trim()
            .toLowerCase();


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

        standards:
            "standards-guidelines",

        guidelines:
            "standards-guidelines",

        "standards-guidelines":
            "standards-guidelines",

        orders:
            "department-orders",

        departmentorders:
            "department-orders",

        "department-orders":
            "department-orders",

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

        "pds-ai":
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


    return (
        aliases[value] ||
        value ||
        "dashboard"
    );

}


/* =========================================================
   GET PDS SECTIONS
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
   ONLY ONE SECTION AT A TIME
========================================================= */

function showPage(
    pageId,
    options = {}
) {

    const requested =
        normalizePageId(pageId);


    const pages =
        getPDSPages();


    if (!pages.length) {

        console.warn(
            "PDS: No page sections found."
        );

        return;

    }


    let selected =
        pages.find(
            page =>
                page.id === requested
        );


    if (!selected) {

        selected =
            pages.find(
                page =>
                    normalizePageId(
                        page.dataset.section
                    ) === requested
            );

    }


    if (!selected) {

        selected =
            pages.find(
                page =>
                    normalizePageId(
                        page.dataset.pageSection
                    ) === requested
            );

    }


    /*
       Fallback to dashboard.
    */

    if (!selected) {

        selected =
            pages.find(
                page =>
                    page.id === "dashboard"
            );

    }


    if (!selected) {
        return;
    }


    /*
       HIDE ALL
    */

    pages.forEach(
        page => {

            page.classList.remove(
                "active"
            );

            page.classList.remove(
                "active-page"
            );

            page.style.display =
                "none";

        }
    );


    /*
       SHOW ONE
    */

    selected.classList.add(
        "active"
    );

    selected.classList.add(
        "active-page"
    );

    selected.style.display =
        "block";


    /*
       SIDEBAR ACTIVE ITEM
    */

    const navItems =
        document.querySelectorAll(
            ".sidebar [data-section], " +
            ".sidebar [data-page]"
        );


    navItems.forEach(
        item => {

            item.classList.remove(
                "active"
            );


            const itemPage =
                item.dataset.section ||
                item.dataset.page;


            if (
                itemPage &&
                normalizePageId(itemPage) ===
                normalizePageId(selected.id)
            ) {

                item.classList.add(
                    "active"
                );

            }

        }
    );


    /*
       UPDATE PAGE TITLE
    */

    const title =
        pageTitles[selected.id] ||
        "Planning & Design Section";


    const pageTitle =
        document.getElementById(
            "pageTitle"
        );


    if (pageTitle) {

        pageTitle.textContent =
            title;

    }


    const topbarTitle =
        document.querySelector(
            ".topbar-title"
        );


    if (
        topbarTitle &&
        topbarTitle !== pageTitle
    ) {

        topbarTitle.textContent =
            title;

    }


    /*
       PAGE-SPECIFIC ACTIONS
    */

    if (
        selected.id ===
        "projects"
    ) {

        loadProjects();

    }


    if (
        selected.id ===
        "documents"
    ) {

        loadDocuments();

    }


    if (
        selected.id ===
        "department-orders"
    ) {

        renderDepartmentOrders();

    }


    if (
        selected.id ===
        "profile"
    ) {

        updateUserInterface();

    }


    if (
        selected.id ===
        "pds-ai-assistant"
    ) {

        setTimeout(
            () => {

                const input =
                    document.querySelector(
                        "#pds-ai-assistant #aiInput"
                    );

                if (input) {
                    input.focus();
                }

            },
            100
        );

    }


    /*
       CLOSE MOBILE SIDEBAR
    */

    closeMobileSidebar();


    /*
       SCROLL CONTENT TO TOP
    */

    if (!options.skipScroll) {

        const main =
            document.querySelector(
                ".main-content, .content, main"
            );


        if (main) {

            main.scrollTop = 0;

        }


        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "instant"
        });

    }


    console.log(
        "PDS: Showing section:",
        selected.id
    );

}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    if (navigationReady) {
        return;
    }


    const sidebar =
        document.querySelector(
            ".sidebar"
        );


    if (!sidebar) {
        return;
    }


    navigationReady = true;


    sidebar.addEventListener(
        "click",
        function(event) {

            const item =
                event.target.closest(
                    "[data-section], [data-page]"
                );


            if (!item) {
                return;
            }


            if (!sidebar.contains(item)) {
                return;
            }


            /*
               LOGOUT
            */

            if (
                item.id ===
                "logoutButton" ||
                item.dataset.action ===
                "logout"
            ) {

                return;

            }


            const page =
                item.dataset.section ||
                item.dataset.page;


            if (!page) {
                return;
            }


            event.preventDefault();

            event.stopPropagation();


            showPage(page);

        }
    );


    sidebar.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key !== "Enter" &&
                event.key !== " "
            ) {
                return;
            }


            const item =
                event.target.closest(
                    "[data-section], [data-page]"
                );


            if (!item) {
                return;
            }


            if (
                item.id ===
                "logoutButton"
            ) {
                return;
            }


            const page =
                item.dataset.section ||
                item.dataset.page;


            if (!page) {
                return;
            }


            event.preventDefault();

            showPage(page);

        }
    );

}


/* =========================================================
   QUICK ACTIONS
========================================================= */

function setupSectionTargets() {

    document
        .querySelectorAll(
            "[data-section-target]"
        )
        .forEach(
            element => {

                if (
                    element.dataset.sectionReady ===
                    "true"
                ) {
                    return;
                }


                element.dataset.sectionReady =
                    "true";


                element.addEventListener(
                    "click",
                    function(event) {

                        event.preventDefault();

                        showPage(
                            this.dataset.sectionTarget
                        );

                    }
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


    const input =
        document.getElementById(
            "globalSearch"
        );


    if (!input) {
        return;
    }


    searchReady = true;


    input.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key !== "Enter"
            ) {
                return;
            }


            const query =
                this.value
                    .trim()
                    .toLowerCase();


            if (!query) {
                return;
            }


            /*
               Search projects.
            */

            const projectMatch =
                cachedProjects.find(
                    project => {

                        const text =
                            [
                                project.title,
                                project.project_title,
                                project.name,
                                project.location,
                                project.status,
                                project.description
                            ]
                                .filter(Boolean)
                                .join(" ")
                                .toLowerCase();


                        return text.includes(
                            query
                        );

                    }
                );


            if (projectMatch) {

                showPage("projects");

                return;

            }


            /*
               Search documents.
            */

            const documentMatch =
                cachedDocuments.find(
                    document => {

                        const text =
                            [
                                document.title,
                                document.name,
                                document.file_name,
                                document.filename
                            ]
                                .filter(Boolean)
                                .join(" ")
                                .toLowerCase();


                        return text.includes(
                            query
                        );

                    }
                );


            if (documentMatch) {

                showPage("documents");

                return;

            }


            /*
               Search department orders.
            */

            const orderMatch =
                planningDesignOrders.find(
                    order => {

                        const text =
                            [
                                order.number,
                                order.year,
                                order.title,
                                order.description,
                                order.categoryName
                            ]
                                .join(" ")
                                .toLowerCase();


                        return text.includes(
                            query
                        );

                    }
                );


            if (orderMatch) {

                showPage(
                    "department-orders"
                );

                return;

            }


            /*
               Search section names.
            */

            const pageMatch =
                Object.entries(
                    pageTitles
                ).find(
                    ([id, title]) =>
                        title
                            .toLowerCase()
                            .includes(query)
                );


            if (pageMatch) {

                showPage(
                    pageMatch[0]
                );

                return;

            }


            alert(
                "No matching PDS record was found."
            );

        }
    );

}


/* =========================================================
   REFRESH ALL
========================================================= */

async function refreshAll() {

    const results =
        await Promise.allSettled([

            loadProjects(),

            loadDocuments()

        ]);


    return results;

}


/* =========================================================
   PROJECTS
========================================================= */

async function loadProjects() {

    const list =
        document.getElementById(
            "projectList"
        );


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


        cachedProjects =
            data || [];


        renderProjects(
            cachedProjects
        );

    }
    catch(error) {

        console.warn(
            "PDS Projects:",
            error
        );


        cachedProjects = [];


        if (list) {

            list.innerHTML = `

                <div class="pds-empty-state">

                    <strong>
                        Unable to load projects
                    </strong>

                    <span>
                        Please refresh or check the database connection.
                    </span>

                </div>

            `;

        }

    }

}


/* =========================================================
   RENDER PROJECTS
========================================================= */

function renderProjects(
    projects
) {

    const list =
        document.getElementById(
            "projectList"
        );


    /*
       DASHBOARD COUNTERS
    */

    const total =
        projects.length;


    const ongoing =
        projects.filter(
            project =>
                String(
                    project.status || ""
                )
                    .toLowerCase()
                    .includes("ongoing")
        ).length;


    const completed =
        projects.filter(
            project =>
                String(
                    project.status || ""
                )
                    .toLowerCase()
                    .includes("completed")
        ).length;


    const totalElement =
        document.getElementById(
            "totalProjects"
        );


    const ongoingElement =
        document.getElementById(
            "ongoingProjects"
        );


    const completedElement =
        document.getElementById(
            "completedProjects"
        );


    if (totalElement) {

        totalElement.textContent =
            total;

    }


    if (ongoingElement) {

        ongoingElement.textContent =
            ongoing;

    }


    if (completedElement) {

        completedElement.textContent =
            completed;

    }


    if (!list) {
        return;
    }


    if (!projects.length) {

        list.innerHTML = `

            <div class="pds-empty-state">

                <strong>
                    No projects registered
                </strong>

                <span>
                    Project records will appear here.
                </span>

            </div>

        `;

        return;

    }


    list.innerHTML =
        projects.map(
            project => {

                const id =
                    project.id || "";


                const title =
                    project.title ||
                    project.project_title ||
                    project.name ||
                    "Untitled Project";


                const location =
                    project.location ||
                    project.project_location ||
                    "—";


                const status =
                    project.status ||
                    "Pending";


                const statusClass =
                    String(status)
                        .toLowerCase()
                        .includes("completed")
                        ? "completed"
                        : String(status)
                            .toLowerCase()
                            .includes("ongoing")
                            ? "active"
                            : "";


                return `

                    <div
                        class="table-row project-row"
                        data-project-id="${escapeHTML(id)}"
                    >

                        <div>

                            <strong>
                                ${escapeHTML(title)}
                            </strong>

                        </div>


                        <div>
                            ${escapeHTML(location)}
                        </div>


                        <div>

                            <span
                                class="status ${statusClass}"
                            >
                                ${escapeHTML(status)}
                            </span>

                        </div>


                        <div>

                            <button
                                class="button secondary"
                                type="button"
                                data-project-id="${escapeHTML(id)}"
                            >
                                VIEW
                            </button>

                        </div>

                    </div>

                `;

            }
        ).join("");


    /*
       Use event delegation instead of
       inline onclick.
    */

    list
        .querySelectorAll(
            "[data-project-id]"
        )
        .forEach(
            button => {

                if (
                    button.tagName !==
                    "BUTTON"
                ) {
                    return;
                }


                button.addEventListener(
                    "click",
                    function() {

                        openProject(
                            this.dataset.projectId
                        );

                    }
                );

            }
        );

}


/* =========================================================
   OPEN PROJECT
========================================================= */

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
        } =
            await db
                .from("projects")
                .select("*")
                .eq(
                    "id",
                    projectId
                )
                .single();


        if (error) {
            throw error;
        }


        const modal =
            document.getElementById(
                "projectModal"
            );


        const content =
            document.getElementById(
                "projectModalContent"
            );


        if (!modal || !content) {
            return;
        }


        const title =
            data.title ||
            data.project_title ||
            data.name ||
            "Project";


        content.innerHTML = `

            <div class="project-details">

                <div class="project-detail-header">

                    <span class="section-kicker">
                        PDS PROJECT RECORD
                    </span>

                    <h2>
                        ${escapeHTML(title)}
                    </h2>

                </div>


                <div class="project-detail-grid">

                    <div>
                        <small>
                            LOCATION
                        </small>

                        <strong>
                            ${escapeHTML(
                                data.location ||
                                data.project_location ||
                                "—"
                            )}
                        </strong>
                    </div>


                    <div>
                        <small>
                            STATUS
                        </small>

                        <strong>
                            ${escapeHTML(
                                data.status ||
                                "—"
                            )}
                        </strong>
                    </div>


                    <div>
                        <small>
                            PROJECT ID
                        </small>

                        <strong>
                            ${escapeHTML(
                                data.id ||
                                "—"
                            )}
                        </strong>
                    </div>

                </div>


                <div class="project-detail-description">

                    <small>
                        DESCRIPTION
                    </small>

                    <p>
                        ${escapeHTML(
                            data.description ||
                            "No project description available."
                        )}
                    </p>

                </div>

            </div>

        `;


        modal.style.display =
            "flex";

    }
    catch(error) {

        console.error(
            "PDS project error:",
            error
        );


        alert(
            "Unable to open this project."
        );

    }

}


/* =========================================================
   DOCUMENTS
========================================================= */

async function loadDocuments() {

    const list =
        document.getElementById(
            "libraryList"
        );


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

    }
    catch(error) {

        console.warn(
            "PDS Documents:",
            error
        );


        cachedDocuments = [];


        if (list) {

            list.innerHTML = `

                <div class="pds-empty-state">

                    <strong>
                        Unable to load documents
                    </strong>

                    <span>
                        Please refresh or check your document database.
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

    const list =
        document.getElementById(
            "libraryList"
        );


    const counter =
        document.getElementById(
            "totalDocuments"
        );


    if (counter) {

        counter.textContent =
            documents.length;

    }


    if (!list) {
        return;
    }


    if (!documents.length) {

        list.innerHTML = `

            <div class="pds-empty-state">

                <strong>
                    No documents uploaded
                </strong>

                <span>
                    Upload your first PDS document to begin.
                </span>

            </div>

        `;

        return;

    }


    list.innerHTML =
        documents.map(
            document => {

                const id =
                    document.id || "";


                const title =
                    document.title ||
                    document.name ||
                    "Untitled Document";


                const fileName =
                    document.file_name ||
                    document.filename ||
                    document.name ||
                    "";


                const size =
                    formatFileSize(
                        document.file_size
                    );


                return `

                    <div
                        class="document-row"
                        data-document-title="${escapeHTML(
                            title.toLowerCase()
                        )}"
                    >

                        <div class="document-main">

                            <strong>
                                ${escapeHTML(title)}
                            </strong>

                            <small>
                                ${escapeHTML(fileName)}
                                ${size ? " • " + escapeHTML(size) : ""}
                            </small>

                        </div>


                        <div class="document-actions">

                            <button
                                class="button secondary"
                                type="button"
                                data-open-document="${escapeHTML(id)}"
                            >
                                OPEN
                            </button>


                            <button
                                class="button secondary"
                                type="button"
                                data-delete-document="${escapeHTML(id)}"
                            >
                                DELETE
                            </button>

                        </div>

                    </div>

                `;

            }
        ).join("");


    /*
       OPEN
    */

    list
        .querySelectorAll(
            "[data-open-document]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    function() {

                        openDocument(
                            this.dataset.openDocument
                        );

                    }
                );

            }
        );


    /*
       DELETE
    */

    list
        .querySelectorAll(
            "[data-delete-document]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    function() {

                        deleteDocument(
                            this.dataset.deleteDocument
                        );

                    }
                );

            }
        );

}


/* =========================================================
   DOCUMENT SEARCH
========================================================= */

function setupDocumentSearch() {

    const search =
        document.getElementById(
            "documentSearch"
        );


    if (!search) {
        return;
    }


    if (
        search.dataset.ready ===
        "true"
    ) {
        return;
    }


    search.dataset.ready =
        "true";


    search.addEventListener(
        "input",
        function() {

            const query =
                this.value
                    .trim()
                    .toLowerCase();


            document
                .querySelectorAll(
                    ".document-row"
                )
                .forEach(
                    row => {

                        const text =
                            row.innerText
                                .toLowerCase();


                        row.style.display =
                            !query ||
                            text.includes(query)
                                ? ""
                                : "none";

                    }
                );

        }
    );

}


/* =========================================================
   DOCUMENT UPLOAD BUTTON
========================================================= */

function setupDocumentUpload() {

    const button =
        document.getElementById(
            "uploadDocumentButton"
        );


    if (!button) {
        return;
    }


    if (
        button.dataset.ready ===
        "true"
    ) {
        return;
    }


    button.dataset.ready =
        "true";


    button.addEventListener(
        "click",
        openDocumentModal
    );

}


/* =========================================================
   OPEN DOCUMENT MODAL
========================================================= */

function openDocumentModal() {

    const modal =
        document.getElementById(
            "documentModal"
        );


    if (!modal) {
        return;
    }


    modal.style.display =
        "flex";

}


/* =========================================================
   CLOSE DOCUMENT MODAL
========================================================= */

function closeDocumentModal() {

    const modal =
        document.getElementById(
            "documentModal"
        );


    if (modal) {

        modal.style.display =
            "none";

    }

}


/* =========================================================
   UPLOAD DOCUMENT
========================================================= */

async function uploadDocument(
    title,
    file
) {

    if (!currentUser) {

        throw new Error(
            "You must be signed in."
        );

    }


    if (!file) {

        throw new Error(
            "Please select a file."
        );

    }


    const maxSize =
        50 * 1024 * 1024;


    if (file.size > maxSize) {

        throw new Error(
            "File size exceeds the 50 MB limit."
        );

    }


    const safeFileName =
        file.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
        );


    const filePath =
        `${currentUser.id}/${Date.now()}_${safeFileName}`;


    let uploadedPath =
        null;


    try {

        /*
           SUPABASE STORAGE
           BUCKET: documents
        */

        const {
            data: uploadData,
            error: uploadError
        } =
            await db.storage
                .from("documents")
                .upload(
                    filePath,
                    file,
                    {
                        upsert: false,

                        contentType:
                            file.type ||
                            "application/octet-stream"
                    }
                );


        if (uploadError) {
            throw uploadError;
        }


        uploadedPath =
            uploadData?.path ||
            filePath;


        /*
           DATABASE RECORD
        */

        const {
            data,
            error
        } =
            await db
                .from("documents")
                .insert({

                    title:
                        title ||
                        file.name,

                    file_name:
                        file.name,

                    storage_path:
                        uploadedPath,

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

            /*
               Roll back uploaded file.
            */

            await db.storage
                .from("documents")
                .remove([
                    uploadedPath
                ]);


            throw error;

        }


        return data;

    }
    catch(error) {

        console.error(
            "PDS document upload:",
            error
        );


        throw error;

    }

}


/* =========================================================
   DOCUMENT FORM
========================================================= */

function setupDocumentForm() {

    const form =
        document.getElementById(
            "documentForm"
        );


    if (!form) {
        return;
    }


    if (
        form.dataset.ready ===
        "true"
    ) {
        return;
    }


    form.dataset.ready =
        "true";


    form.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const titleInput =
                document.getElementById(
                    "documentTitle"
                );


            const fileInput =
                document.getElementById(
                    "documentFile"
                );


            const title =
                titleInput?.value
                    ?.trim() || "";


            const file =
                fileInput?.files?.[0];


            if (!file) {

                alert(
                    "Please select a file."
                );

                return;

            }


            const submitButton =
                form.querySelector(
                    'button[type="submit"]'
                );


            try {

                if (submitButton) {

                    submitButton.disabled =
                        true;

                    submitButton.textContent =
                        "UPLOADING...";

                }


                await uploadDocument(
                    title,
                    file
                );


                form.reset();


                closeDocumentModal();


                await loadDocuments();


                alert(
                    "Document uploaded successfully."
                );

            }
            catch(error) {

                console.error(
                    "PDS upload error:",
                    error
                );


                alert(
                    error.message ||
                    "Document upload failed."
                );

            }
            finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        "UPLOAD";

                }

            }

        }
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
        } =
            await db
                .from("documents")
                .select("*")
                .eq(
                    "id",
                    documentId
                )
                .single();


        if (error) {
            throw error;
        }


        /*
           If a direct URL exists,
           use it.
        */

        const directUrl =
            data.url ||
            data.file_url ||
            data.public_url;


        if (directUrl) {

            window.open(
                directUrl,
                "_blank",
                "noopener,noreferrer"
            );

            return;

        }


        const path =
            data.storage_path ||
            data.file_path;


        if (!path) {

            throw new Error(
                "Document storage path is missing."
            );

        }


        const {
            data: signedData,
            error: signedError
        } =
            await db.storage
                .from("documents")
                .createSignedUrl(
                    path,
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
        else {

            throw new Error(
                "Unable to create document link."
            );

        }

    }
    catch(error) {

        console.error(
            "PDS open document:",
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
        !window.confirm(
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
                    "id, storage_path, file_path"
                )
                .eq(
                    "id",
                    documentId
                )
                .single();


        if (error) {
            throw error;
        }


        const path =
            data.storage_path ||
            data.file_path;


        if (path) {

            const {
                error:
                    storageError
            } =
                await db.storage
                    .from("documents")
                    .remove([
                        path
                    ]);


            if (storageError) {

                console.warn(
                    "PDS storage deletion:",
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

    }
    catch(error) {

        console.error(
            "PDS delete document:",
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

function renderDepartmentOrders() {

    displayDepartmentOrders(
        planningDesignOrders
    );


    const count =
        document.getElementById(
            "ordersResultCount"
        );


    if (count) {

        count.textContent =
            planningDesignOrders.length;

    }

}


/* =========================================================
   DISPLAY DEPARTMENT ORDERS
========================================================= */

function displayDepartmentOrders(
    orders
) {

    const grid =
        document.getElementById(
            "departmentOrdersGrid"
        );


    if (!grid) {
        return;
    }


    if (!orders.length) {

        grid.innerHTML = `

            <div class="pds-empty-state">

                <strong>
                    No Department Orders found
                </strong>

                <span>
                    Try changing your search or filters.
                </span>

            </div>

        `;

        return;

    }


    grid.innerHTML =
        orders.map(
            order => `

                <article class="department-order">

                    <div class="date-label">
                        ${escapeHTML(
                            order.categoryName
                        )}
                    </div>


                    <strong>
                        ${escapeHTML(
                            order.number
                        )},
                        s. ${escapeHTML(
                            order.year
                        )}
                    </strong>


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


                    <a
                        href="${escapeHTML(order.url)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="button secondary"
                    >
                        VIEW REFERENCE
                    </a>

                </article>

            `
        ).join("");

}


/* =========================================================
   DEPARTMENT ORDER FILTER
========================================================= */

function filterDepartmentOrders() {

    const searchInput =
        document.getElementById(
            "ordersSearch"
        );


    const categoryInput =
        document.getElementById(
            "ordersCategory"
        );


    const yearInput =
        document.getElementById(
            "ordersYear"
        );


    const search =
        searchInput?.value
            ?.trim()
            .toLowerCase() || "";


    const category =
        categoryInput?.value || "";


    const year =
        yearInput?.value || "";


    const filtered =
        planningDesignOrders.filter(
            order => {

                const text =
                    [
                        order.number,
                        order.year,
                        order.title,
                        order.description,
                        order.categoryName
                    ]
                        .join(" ")
                        .toLowerCase();


                return (

                    (!search ||
                        text.includes(search))

                    &&

                    (!category ||
                        order.category === category)

                    &&

                    (!year ||
                        order.year === year)

                );

            }
        );


    displayDepartmentOrders(
        filtered
    );


    const count =
        document.getElementById(
            "ordersResultCount"
        );


    if (count) {

        count.textContent =
            filtered.length;

    }


    const noResults =
        document.getElementById(
            "ordersNoResults"
        );


    if (noResults) {

        noResults.style.display =
            filtered.length
                ? "none"
                : "block";

    }

}


/* =========================================================
   CLEAR ORDER FILTERS
========================================================= */

function clearOrdersSearch() {

    const search =
        document.getElementById(
            "ordersSearch"
        );


    const category =
        document.getElementById(
            "ordersCategory"
        );


    const year =
        document.getElementById(
            "ordersYear"
        );


    if (search) {
        search.value = "";
    }


    if (category) {
        category.value = "";
    }


    if (year) {
        year.value = "";
    }


    renderDepartmentOrders();


    const noResults =
        document.getElementById(
            "ordersNoResults"
        );


    if (noResults) {

        noResults.style.display =
            "none";

    }

}


/* =========================================================
   SETUP ORDER FILTERS
========================================================= */

function setupDepartmentOrderFilters() {

    const search =
        document.getElementById(
            "ordersSearch"
        );


    const category =
        document.getElementById(
            "ordersCategory"
        );


    const year =
        document.getElementById(
            "ordersYear"
        );


    const clear =
        document.getElementById(
            "clearOrdersSearch"
        );


    if (search) {

        search.addEventListener(
            "input",
            filterDepartmentOrders
        );

    }


    if (category) {

        category.addEventListener(
            "change",
            filterDepartmentOrders
        );

    }


    if (year) {

        year.addEventListener(
            "change",
            filterDepartmentOrders
        );

    }


    if (clear) {

        clear.addEventListener(
            "click",
            clearOrdersSearch
        );

    }


    renderDepartmentOrders();

}


/* =========================================================
   PROJECT MODAL
========================================================= */

function setupProjectModal() {

    const modal =
        document.getElementById(
            "projectModal"
        );


    const close =
        document.getElementById(
            "closeProjectModal"
        );


    if (close) {

        close.addEventListener(
            "click",
            function() {

                if (modal) {

                    modal.style.display =
                        "none";

                }

            }
        );

    }


    if (modal) {

        modal.addEventListener(
            "click",
            function(event) {

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

}


/* =========================================================
   DOCUMENT MODAL
========================================================= */

function setupDocumentModal() {

    const modal =
        document.getElementById(
            "documentModal"
        );


    const close =
        document.getElementById(
            "closeDocumentModal"
        );


    const cancel =
        document.getElementById(
            "cancelDocument"
        );


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


    if (modal) {

        modal.addEventListener(
            "click",
            function(event) {

                if (
                    event.target ===
                    modal
                ) {

                    closeDocumentModal();

                }

            }
        );

    }

}


/* =========================================================
   MODAL SETUP
========================================================= */

function setupModals() {

    if (modalReady) {
        return;
    }


    modalReady = true;


    setupProjectModal();

    setupDocumentModal();

    setupDocumentUpload();

    setupDocumentForm();

}


/* =========================================================
   AUTH FORM SETUP
========================================================= */

function setupAuthForms() {

    if (authFormsReady) {
        return;
    }


    const form =
        document.getElementById(
            "loginForm"
        );


    if (!form) {
        return;
    }


    authFormsReady = true;


    form.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const email =
                document.getElementById(
                    "loginEmail"
                )?.value
                    ?.trim();


            const password =
                document.getElementById(
                    "loginPassword"
                )?.value;


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


            await loginUser(
                email,
                password
            );

        }
    );


    const logoutButton =
        document.getElementById(
            "logoutButton"
        );


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            async function(event) {

                event.preventDefault();

                event.stopPropagation();

                await signOut();

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


    const launcher =
        document.getElementById(
            "pdsAiLauncher"
        );


    const chatbot =
        document.getElementById(
            "pdsAiChatbot"
        );


    const close =
        document.getElementById(
            "pdsAiClose"
        );


    const send =
        document.getElementById(
            "pdsAiSend"
        );


    const input =
        document.getElementById(
            "aiInput"
        );


    if (
        !launcher ||
        !chatbot
    ) {
        return;
    }


    aiReady = true;


    launcher.addEventListener(
        "click",
        function() {

            chatbot.style.display =
                "flex";


            setTimeout(
                function() {

                    if (input) {

                        input.focus();

                    }

                },
                80
            );

        }
    );


    if (close) {

        close.addEventListener(
            "click",
            function() {

                chatbot.style.display =
                    "none";

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
            function(event) {

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


    /*
       Full AI section button.
    */

    const fullAIButton =
        document.getElementById(
            "openFullPDSAI"
        );


    if (fullAIButton) {

        fullAIButton.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                showPage(
                    "pds-ai-assistant"
                );

            }
        );

    }

}


/* =========================================================
   APPEND AI MESSAGE
========================================================= */

function appendAIMessage(
    role,
    text
) {

    const response =
        document.getElementById(
            "aiResponse"
        );


    if (!response) {
        return null;
    }


    const message =
        document.createElement(
            "div"
        );


    message.className =
        "pds-ai-message " +
        (
            role === "user"
                ? "pds-ai-user"
                : "pds-ai-bot"
        );


    message.textContent =
        text;


    response.appendChild(
        message
    );


    response.scrollTop =
        response.scrollHeight;


    return message;

}


/* =========================================================
   ASK PDS AI
========================================================= */

async function askPDSAI() {

    const input =
        document.getElementById(
            "aiInput"
        );


    if (!input) {
        return;
    }


    const message =
        input.value.trim();


    if (!message) {
        return;
    }


    appendAIMessage(
        "user",
        message
    );


    input.value = "";


    const thinking =
        appendAIMessage(
            "bot",
            "PDS AI is thinking..."
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


        let answer =
            data?.answer ||
            data?.response ||
            data?.message ||
            data?.text ||
            data?.reply;


        /*
           Some edge functions return
           a string directly.
        */

        if (
            typeof data ===
            "string"
        ) {

            answer =
                data;

        }


        if (
            typeof answer !==
            "string" ||
            !answer.trim()
        ) {

            answer =
                "I could not generate a response.";

        }


        if (thinking) {

            thinking.textContent =
                answer;

        }
        else {

            appendAIMessage(
                "bot",
                answer
            );

        }


        /*
           Keep history short.
        */

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


        if (
            pdsAIHistory.length >
            12
        ) {

            pdsAIHistory =
                pdsAIHistory.slice(
                    -12
                );

        }

    }
    catch(error) {

        console.error(
            "PDS AI error:",
            error
        );


        /*
           Do not expose technical
           backend information to users.
        */

        const errorMessage =
            "PDS AI could not respond. Please try again.";


        if (thinking) {

            thinking.textContent =
                errorMessage;

        }
        else {

            appendAIMessage(
                "bot",
                errorMessage
            );

        }

    }


    input.focus();

}


/* =========================================================
   REFRESH BUTTON
========================================================= */

function setupRefreshButton() {

    if (refreshReady) {
        return;
    }


    const button =
        document.getElementById(
            "refreshButton"
        );


    if (!button) {
        return;
    }


    refreshReady = true;


    button.addEventListener(
        "click",
        async function() {

            if (
                button.disabled
            ) {
                return;
            }


            button.disabled =
                true;


            const originalText =
                button.textContent;


            button.textContent =
                "REFRESHING...";


            try {

                await refreshAll();

            }
            finally {

                button.disabled =
                    false;

                button.textContent =
                    originalText;

            }

        }
    );

}


/* =========================================================
   NOTIFICATIONS
========================================================= */

function setupNotificationButton() {

    if (notificationReady) {
        return;
    }


    const button =
        document.getElementById(
            "notificationButton"
        );


    if (!button) {
        return;
    }


    notificationReady = true;


    button.addEventListener(
        "click",
        function() {

            alert(
                "No new PDS notifications."
            );

        }
    );

}


/* =========================================================
   MOBILE SIDEBAR
========================================================= */

function setupMobileMenu() {

    const button =
        document.getElementById(
            "mobileMenuButton"
        );


    const sidebar =
        document.querySelector(
            ".sidebar"
        );


    if (
        !button ||
        !sidebar
    ) {
        return;
    }


    button.addEventListener(
        "click",
        function() {

            sidebar.classList.toggle(
                "mobile-open"
            );

        }
    );

}


/* =========================================================
   CLOSE MOBILE SIDEBAR
========================================================= */

function closeMobileSidebar() {

    const sidebar =
        document.querySelector(
            ".sidebar"
        );


    if (
        sidebar &&
        window.innerWidth <= 900
    ) {

        sidebar.classList.remove(
            "mobile-open"
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
   FILE SIZE
========================================================= */

function formatFileSize(
    bytes
) {

    const value =
        Number(bytes);


    if (
        !Number.isFinite(value) ||
        value <= 0
    ) {

        return "";

    }


    const units = [
        "B",
        "KB",
        "MB",
        "GB"
    ];


    let size =
        value;


    let index =
        0;


    while (
        size >= 1024 &&
        index <
        units.length - 1
    ) {

        size /= 1024;

        index++;

    }


    return (
        size.toFixed(
            index === 0
                ? 0
                : 1
        ) +
        " " +
        units[index]
    );

}


/* =========================================================
   CLOSE MODALS WITH ESC
========================================================= */

function setupEscapeKey() {

    document.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key !==
                "Escape"
            ) {
                return;
            }


            const projectModal =
                document.getElementById(
                    "projectModal"
                );


            const documentModal =
                document.getElementById(
                    "documentModal"
                );


            if (projectModal) {

                projectModal.style.display =
                    "none";

            }


            if (documentModal) {

                documentModal.style.display =
                    "none";

            }

        }
    );

}


/* =========================================================
   INITIALIZE PDS
========================================================= */

async function initializePDS() {

    if (
        document.body.dataset
            .pdsInitialized ===
        "true"
    ) {

        return;

    }


    document.body.dataset
        .pdsInitialized =
        "true";


    console.log(
        "PDS: Initializing..."
    );


    /*
       START ON LOGIN
    */

    showLogin();


    /*
       SETUP UI
    */

    setupAuthForms();

    setupNavigation();

    setupSectionTargets();

    setupGlobalSearch();

    setupDocumentSearch();

    setupDepartmentOrderFilters();

    setupModals();

    setupPDSAI();

    setupRefreshButton();

    setupNotificationButton();

    setupMobileMenu();

    setupEscapeKey();


    /*
       CHECK EXISTING SESSION
    */

    try {

        const {
            data,
            error
        } =
            await db.auth.getSession();


        if (error) {
            throw error;
        }


        if (
            data?.session?.user
        ) {

            currentUser =
                data.session.user;


            await loadApplication();

        }
        else {

            showLogin();

        }

    }
    catch(error) {

        console.error(
            "PDS session error:",
            error
        );


        /*
           If there is no confirmed
           authenticated user, show login.
        */

        showLogin();

    }

}


/* =========================================================
   AUTH STATE CHANGE
   ---------------------------------------------------------
   IMPORTANT:
   Do not await loadApplication()
   directly inside Supabase callback.
========================================================= */

db.auth.onAuthStateChange(
    function(
        event,
        session
    ) {

        console.log(
            "PDS Auth Event:",
            event
        );


        if (
            event ===
            "SIGNED_OUT"
        ) {

            currentUser = null;
            currentProfile = null;

            cachedProjects = [];
            cachedDocuments = [];

            pdsAIHistory = [];


            showLogin();

            return;

        }


        if (
            session?.user
        ) {

            currentUser =
                session.user;


            /*
               Delay application loading so
               Supabase auth callback does not
               block the UI.
            */

            if (
                event ===
                "INITIAL_SESSION" ||
                event ===
                "TOKEN_REFRESHED"
            ) {

                setTimeout(
                    function() {

                        loadApplication();

                    },
                    0
                );

            }

        }

    }
);


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        initializePDS();

    }
);
