/* =========================================================
   PDS — PLANNING & DESIGN SECTION
   COMPLETE SCRIPT.JS
   =========================================================
   FEATURES
   ---------------------------------------------------------
   • Supabase Authentication
   • Persistent Login Session
   • Dashboard
   • Projects
   • Documents
   • Standards & Guidelines
   • Department Orders
   • Forms & Templates
   • Announcements
   • PDS AI Assistant
   • About PDS
   • Contact Us
   • Profile
   • Section Navigation
   • Quick Action Navigation
   • Global Search
   • Project Modal
   • Document Upload
   • Document Search
   • Document Open / Delete
   • PDS AI Floating Chatbot
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
   GLOBAL VARIABLES
========================================================= */

let currentUser = null;
let currentProfile = null;

let modalMode = "project";

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

const planningDesignOrders = [

    {
        number: "DO 75",
        year: "2024",
        title:
            "Guidelines for the Conduct of Geotechnical Investigation for all DPWH Infrastructure",
        description:
            "Guidelines for geotechnical investigation for proposed DPWH infrastructure projects and preparation of design documents.",
        category: "geotechnical",
        categoryName: "Geotechnical",
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
        category: "planning",
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
        category: "row",
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
        category: "roads",
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
        category: "hydrology",
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
        category: "standards",
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

        authScreen.style.display =
            "flex";

    }

    if (app) {

        app.style.display =
            "none";

    }

}


/* =========================================================
   REGISTER SCREEN
========================================================= */

function showRegister() {

    const loginForm =
        document.getElementById("loginForm");

    if (loginForm) {
        loginForm.reset();
    }

}


/* =========================================================
   AUTH MESSAGES
========================================================= */

function clearAuthMessages() {

    const loginMessage =
        document.getElementById("loginMessage");

    const registerMessage =
        document.getElementById("registerMessage");


    if (loginMessage) {

        loginMessage.textContent = "";
        loginMessage.className = "";

    }


    if (registerMessage) {

        registerMessage.textContent = "";
        registerMessage.className = "";

    }

}


function authMessage(
    message,
    type = "error"
) {

    const loginMessage =
        document.getElementById("loginMessage");

    if (!loginMessage) {
        return;
    }

    loginMessage.textContent =
        message || "";

    loginMessage.className =
        type;

}


/* =========================================================
   REGISTER USER
========================================================= */

async function registerUser(
    email,
    password,
    fullName = ""
) {

    try {

        clearAuthMessages();


        const {
            data,
            error
        } =
            await db.auth.signUp({

                email: email.trim(),

                password,

                options: {

                    data: {
                        full_name: fullName
                    }

                }

            });


        if (error) {
            throw error;
        }


        if (!data?.user) {

            authMessage(
                "Registration could not be completed.",
                "error"
            );

            return null;

        }


        try {

            await createProfile(
                data.user,
                fullName
            );

        }
        catch(profileError) {

            console.warn(
                "Profile creation warning:",
                profileError
            );

        }


        authMessage(
            "Registration successful. Please check your email if confirmation is required.",
            "success"
        );


        return data.user;

    }
    catch(error) {

        console.error(
            "Registration error:",
            error
        );


        authMessage(
            error.message ||
            "Registration failed.",
            "error"
        );


        return null;

    }

}


/* =========================================================
   CREATE PROFILE
========================================================= */

async function createProfile(
    user,
    fullName = ""
) {

    if (!user) {
        return;
    }


    try {

        const profileData = {

            id: user.id,

            email:
                user.email || "",

            full_name:
                fullName ||
                user.user_metadata?.full_name ||
                "",

            role:
                "PLANNING & DESIGN"

        };


        const {
            error
        } =
            await db
                .from("profiles")
                .upsert(
                    profileData,
                    {
                        onConflict: "id"
                    }
                );


        if (error) {

            console.warn(
                "Profile upsert warning:",
                error
            );

        }

    }
    catch(error) {

        console.warn(
            "Profile creation warning:",
            error
        );

    }

}


/* =========================================================
   LOGIN USER
========================================================= */

async function loginUser(
    email,
    password
) {

    try {

        clearAuthMessages();


        authMessage(
            "Signing in...",
            "info"
        );


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
                "Login succeeded but no user account was returned."
            );

        }


        currentUser =
            data.user;


        console.log(
            "PDS: Login successful:",
            currentUser.email
        );


        /*
            IMPORTANT:
            Show the application immediately.
            This prevents the user from becoming
            trapped on the Sign In screen.
        */

        const authScreen =
            document.getElementById(
                "authScreen"
            );

        const app =
            document.getElementById(
                "app"
            );


        if (authScreen) {

            authScreen.style.display =
                "none";

        }


        if (app) {

            app.style.display =
                "flex";

        }


        showPage(
            "dashboard",
            {
                skipScroll: true
            }
        );


        authMessage(
            "Signed in successfully.",
            "success"
        );


        /*
            Load application data.
        */

        await loadApplication();


    }
    catch(error) {

        console.error(
            "PDS Login Error:",
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
        pdsAIHistory = [];


        const app =
            document.getElementById(
                "app"
            );

        const authScreen =
            document.getElementById(
                "authScreen"
            );


        if (app) {

            app.style.display =
                "none";

        }


        if (authScreen) {

            authScreen.style.display =
                "flex";

        }


        clearAuthMessages();


        console.log(
            "PDS: Signed out."
        );

    }
    catch(error) {

        console.error(
            "Sign out error:",
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


    const authScreen =
        document.getElementById(
            "authScreen"
        );

    const app =
        document.getElementById(
            "app"
        );


    try {

        const {
            data,
            error
        } =
            await db.auth.getUser();


        if (error) {
            throw error;
        }


        const user =
            data?.user;


        if (!user) {

            currentUser = null;

            showLogin();

            return;

        }


        currentUser =
            user;


        /*
            Profile failure must NOT prevent login.
        */

        try {

            await loadProfile();

        }
        catch(profileError) {

            console.warn(
                "PDS: Profile loading failed:",
                profileError
            );


            currentProfile = {

                id:
                    user.id,

                email:
                    user.email || "",

                full_name:
                    user.user_metadata?.full_name ||
                    user.email ||
                    "PDS User",

                role:
                    "PLANNING & DESIGN"

            };

        }


        /*
            SHOW APPLICATION
        */

        if (authScreen) {

            authScreen.style.display =
                "none";

        }


        if (app) {

            app.style.display =
                "flex";

        }


        updateUserInterface();


        /*
            Always start at Dashboard.
        */

        showPage(
            "dashboard",
            {
                skipScroll: true
            }
        );


        /*
            Load application data.
            Data errors must not send the user
            back to Sign In.
        */

        try {

            await refreshAll();

        }
        catch(dataError) {

            console.warn(
                "PDS: Some application data could not load:",
                dataError
            );

        }


        /*
            Ensure Dashboard remains visible.
        */

        showPage(
            "dashboard",
            {
                skipScroll: true
            }
        );


        console.log(
            "PDS: Application loaded successfully."
        );

    }
    catch(error) {

        console.error(
            "PDS: Application loading error:",
            error
        );


        /*
            If the user is authenticated,
            never trap them on Sign In.
        */

        if (currentUser) {

            if (authScreen) {

                authScreen.style.display =
                    "none";

            }


            if (app) {

                app.style.display =
                    "flex";

            }


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
                "Profile load warning:",
                error
            );


            currentProfile = {

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


            return;

        }


        currentProfile =
            data || {

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

    }
    catch(error) {

        console.warn(
            "Profile error:",
            error
        );


        currentProfile = {

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


    const elements = {

        sidebarUserName:
            document.getElementById(
                "sidebarUserName"
            ),

        sidebarUserRole:
            document.getElementById(
                "sidebarUserRole"
            ),

        sidebarAvatar:
            document.getElementById(
                "sidebarAvatar"
            ),

        topAvatar:
            document.getElementById(
                "topAvatar"
            ),

        profileName:
            document.getElementById(
                "profileName"
            ),

        profileEmail:
            document.getElementById(
                "profileEmail"
            )

    };


    if (elements.sidebarUserName) {

        elements.sidebarUserName.textContent =
            name;

    }


    if (elements.sidebarUserRole) {

        elements.sidebarUserRole.textContent =
            role;

    }


    if (elements.sidebarAvatar) {

        elements.sidebarAvatar.textContent =
            initials;

    }


    if (elements.topAvatar) {

        elements.topAvatar.textContent =
            initials;

    }


    if (elements.profileName) {

        elements.profileName.textContent =
            name;

    }


    if (elements.profileEmail) {

        elements.profileEmail.textContent =
            email;

    }

}


/* =========================================================
   GET INITIALS
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
   PAGE ALIASES
========================================================= */

function normalizePageId(pageId) {

    const aliases = {

        overview:
            "dashboard",

        dashboard:
            "dashboard",

        myprojects:
            "projects",

        project:
            "projects",

        content:
            "documents",

        document:
            "documents",

        orders:
            "department-orders",

        departmentorders:
            "department-orders",

        standards:
            "standards-guidelines",

        guidelines:
            "standards-guidelines",

        forms:
            "forms-templates",

        templates:
            "forms-templates",

        news:
            "announcements",

        announcement:
            "announcements",

        ai:
            "pds-ai-assistant",

        pdsai:
            "pds-ai-assistant",

        about:
            "aboutpds",

        contact:
            "contact-us",

        userprofile:
            "profile"

    };


    return (
        aliases[String(pageId).toLowerCase()] ||
        pageId ||
        "dashboard"
    );

}


/* =========================================================
   GET ALL PDS PAGE SECTIONS
========================================================= */

function getPDSPages() {

    let pages =
        document.querySelectorAll(
            "#app .page-section, " +
            "#app [data-page-section], " +
            "#app section[data-section]"
        );


    if (!pages.length) {

        pages =
            document.querySelectorAll(
                "#app .content > section, " +
                "#app > section"
            );

    }


    return pages;

}


/* =========================================================
   SHOW PAGE
   ---------------------------------------------------------
   ONLY ONE SECTION IS DISPLAYED AT A TIME.
========================================================= */

function showPage(
    pageId,
    options = {}
) {

    const requestedPage =
        normalizePageId(pageId);


    const pages =
        getPDSPages();


    if (!pages.length) {

        console.warn(
            "PDS: No page sections found."
        );

        return;

    }


    let selectedPage =
        Array.from(pages).find(
            page =>
                page.id ===
                requestedPage
        );


    if (!selectedPage) {

        selectedPage =
            Array.from(pages).find(
                page =>
                    page.dataset.section ===
                    requestedPage
            );

    }


    if (!selectedPage) {

        selectedPage =
            Array.from(pages).find(
                page =>
                    page.dataset.pageSection ===
                    requestedPage
            );

    }


    /*
        Fallback to Dashboard.
    */

    if (!selectedPage) {

        selectedPage =
            Array.from(pages).find(
                page =>
                    page.id ===
                    "dashboard"
            );

    }


    if (!selectedPage) {

        console.warn(
            "PDS: Section not found:",
            requestedPage
        );

        return;

    }


    /* =====================================================
       HIDE EVERY SECTION
    ===================================================== */

    pages.forEach(page => {

        page.classList.remove("active");

        page.classList.remove("active-page");

        page.style.display = "none";

    });


    /* =====================================================
       SHOW SELECTED SECTION
    ===================================================== */

    selectedPage.classList.add("active");

    selectedPage.classList.add("active-page");

    selectedPage.style.display = "block";


    /* =====================================================
       UPDATE SIDEBAR
    ===================================================== */

    const navigationItems =
        document.querySelectorAll(
            ".sidebar .nav-item, " +
            ".sidebar .nav-link, " +
            ".sidebar [data-page], " +
            ".sidebar [data-section]"
        );


    navigationItems.forEach(item => {

        item.classList.remove("active");


        const itemPage =
            item.dataset.section ||
            item.dataset.page;


        if (!itemPage) {
            return;
        }


        if (
            normalizePageId(itemPage) ===
            normalizePageId(selectedPage.id)
        ) {

            item.classList.add("active");

        }

    });


    /* =====================================================
       UPDATE PAGE TITLE
    ===================================================== */

    const pageTitle =
        document.getElementById(
            "pageTitle"
        );


    const topbarTitle =
        document.querySelector(
            ".topbar-title"
        );


    const titles = {

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


    const title =
        titles[selectedPage.id] ||
        "Planning & Design Section";


    if (pageTitle) {

        pageTitle.textContent =
            title;

    }


    if (
        topbarTitle &&
        topbarTitle !== pageTitle
    ) {

        topbarTitle.textContent =
            title;

    }


    /* =====================================================
       PAGE-SPECIFIC ACTIONS
    ===================================================== */

    switch (selectedPage.id) {

        case "dashboard":

            break;


        case "projects":

            loadProjects();

            break;


        case "documents":

            loadDocuments();

            break;


        case "standards-guidelines":

            if (
                typeof loadStandardsGuidelines ===
                "function"
            ) {

                loadStandardsGuidelines();

            }

            break;


        case "department-orders":

            renderDepartmentOrders();

            break;


        case "forms-templates":

            if (
                typeof loadFormsTemplates ===
                "function"
            ) {

                loadFormsTemplates();

            }

            break;


        case "announcements":

            if (
                typeof loadAnnouncements ===
                "function"
            ) {

                loadAnnouncements();

            }

            break;


        case "pds-ai-assistant":

            /*
                If a full AI input exists in the section,
                focus it.
            */

            setTimeout(
                function() {

                    const fullAIInput =
                        document.querySelector(
                            "#pds-ai-assistant #aiInput, " +
                            "#pds-ai-assistant textarea"
                        );

                    if (fullAIInput) {
                        fullAIInput.focus();
                    }

                },
                50
            );

            break;


        case "aboutpds":

            break;


        case "contact-us":

            break;


        case "profile":

            updateUserInterface();

            break;

    }


    /* =====================================================
       SCROLL TO TOP
    ===================================================== */

    if (!options.skipScroll) {

        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "instant"
        });

    }


    console.log(
        "PDS Section:",
        selectedPage.id
    );

}


/* =========================================================
   NAVIGATION SETUP
========================================================= */

function setupNavigation() {

    const sidebar =
        document.querySelector(
            ".sidebar"
        );


    if (!sidebar) {
        return;
    }


    if (
        navigationReady ||
        sidebar.dataset.navigationReady ===
        "true"
    ) {

        return;

    }


    navigationReady = true;

    sidebar.dataset.navigationReady =
        "true";


    /* =====================================================
       CLICK
    ===================================================== */

    sidebar.addEventListener(
        "click",
        function(event) {

            const item =
                event.target.closest(
                    ".nav-item, " +
                    ".nav-link, " +
                    "[data-page], " +
                    "[data-section]"
                );


            if (!item) {
                return;
            }


            if (!sidebar.contains(item)) {
                return;
            }


            /*
                Sign Out handled separately.
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


    /* =====================================================
       KEYBOARD
    ===================================================== */

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
                    ".nav-item, " +
                    ".nav-link, " +
                    "[data-page], " +
                    "[data-section]"
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

    const targets =
        document.querySelectorAll(
            "[data-section-target]"
        );


    targets.forEach(target => {

        if (
            target.dataset.sectionReady ===
            "true"
        ) {

            return;

        }


        target.dataset.sectionReady =
            "true";


        target.addEventListener(
            "click",
            function(event) {

                event.preventDefault();


                const section =
                    this.dataset.sectionTarget;


                if (!section) {
                    return;
                }


                showPage(section);

            }
        );

    });

}


/* =========================================================
   GLOBAL SEARCH
========================================================= */

function setupGlobalSearch() {

    const search =
        document.getElementById(
            "globalSearch"
        );


    if (!search) {
        return;
    }


    if (searchReady) {
        return;
    }


    searchReady = true;


    search.addEventListener(
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


            const pages =
                Array.from(
                    getPDSPages()
                );


            const match =
                pages.find(
                    page =>
                        page.innerText
                            .toLowerCase()
                            .includes(query)
                );


            if (match) {

                showPage(
                    match.id
                );

            }
            else {

                console.log(
                    "PDS Search: No matching section."
                );

            }

        }
    );

}


/* =========================================================
   REFRESH ALL
========================================================= */

async function refreshAll() {

    const jobs = [

        loadProjects(),

        loadDocuments(),

        loadTeam()

    ];


    await Promise.allSettled(
        jobs
    );

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


        renderProjects(
            data || []
        );

    }
    catch(error) {

        console.error(
            "Projects load error:",
            error
        );


        if (list) {

            list.innerHTML = `

                <div style="
                    padding:30px;
                    text-align:center;
                    color:var(--muted);
                    font-size:9px;
                ">
                    Unable to load projects.
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


    if (!list) {
        return;
    }


    const totalProjects =
        document.getElementById(
            "totalProjects"
        );

    const ongoingProjects =
        document.getElementById(
            "ongoingProjects"
        );

    const completedProjects =
        document.getElementById(
            "completedProjects"
        );


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


    if (!projects.length) {

        list.innerHTML = `

            <div style="
                padding:35px;
                text-align:center;
                color:var(--muted);
                font-size:9px;
            ">
                No projects registered.
            </div>

        `;

        return;

    }


    list.innerHTML =
        projects.map(
            project => {

                const name =
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


                const id =
                    project.id || "";


                return `

                    <div
                        class="table-row"
                        style="
                            grid-template-columns:
                            2fr
                            1.3fr
                            1fr
                            1fr;
                        "
                    >

                        <div>
                            <strong>
                                ${escapeHTML(name)}
                            </strong>
                        </div>

                        <div>
                            ${escapeHTML(location)}
                        </div>

                        <div>
                            <span class="status active">
                                ${escapeHTML(status)}
                            </span>
                        </div>

                        <div>

                            <button
                                class="button secondary"
                                type="button"
                                onclick="openProject('${escapeJS(id)}')"
                            >
                                VIEW
                            </button>

                        </div>

                    </div>

                `;

            }
        ).join("");

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

                <h3>
                    ${escapeHTML(title)}
                </h3>

                <p>
                    <strong>Location:</strong>
                    ${escapeHTML(
                        data.location ||
                        data.project_location ||
                        "—"
                    )}
                </p>

                <p>
                    <strong>Status:</strong>
                    ${escapeHTML(
                        data.status ||
                        "—"
                    )}
                </p>

                <p>
                    <strong>Description:</strong>
                    ${escapeHTML(
                        data.description ||
                        "—"
                    )}
                </p>

            </div>

        `;


        modal.style.display =
            "flex";

    }
    catch(error) {

        console.error(
            "Open project error:",
            error
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

        console.error(
            "Documents load error:",
            error
        );


        if (list) {

            list.innerHTML = `

                <div style="
                    padding:35px;
                    text-align:center;
                    color:var(--muted);
                    font-size:9px;
                ">
                    Unable to load documents.
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


    if (!list) {
        return;
    }


    const totalDocuments =
        document.getElementById(
            "totalDocuments"
        );


    if (totalDocuments) {

        totalDocuments.textContent =
            documents.length;

    }


    if (!documents.length) {

        list.innerHTML = `

            <div style="
                padding:35px;
                text-align:center;
                color:var(--muted);
                font-size:9px;
            ">
                No documents uploaded.
            </div>

        `;

        return;

    }


    list.innerHTML =
        documents.map(
            document => {

                const title =
                    document.title ||
                    document.name ||
                    "Untitled Document";


                const fileName =
                    document.file_name ||
                    document.filename ||
                    document.name ||
                    "";


                const id =
                    document.id || "";


                return `

                    <div
                        class="document-row"
                        data-document-title="${escapeHTML(
                            title.toLowerCase()
                        )}"
                    >

                        <div>

                            <strong>
                                ${escapeHTML(title)}
                            </strong>

                            <small>
                                ${escapeHTML(fileName)}
                            </small>

                        </div>


                        <div style="
                            display:flex;
                            gap:6px;
                            flex-wrap:wrap;
                        ">

                            <button
                                class="button secondary"
                                type="button"
                                onclick="openDocument('${escapeJS(id)}')"
                            >
                                OPEN
                            </button>


                            <button
                                class="button secondary"
                                type="button"
                                onclick="deleteDocument('${escapeJS(id)}')"
                            >
                                DELETE
                            </button>

                        </div>

                    </div>

                `;

            }
        ).join("");

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


            const rows =
                document.querySelectorAll(
                    ".document-row"
                );


            rows.forEach(row => {

                const text =
                    row.innerText
                        .toLowerCase();


                row.style.display =
                    !query ||
                    text.includes(query)
                        ? ""
                        : "none";

            });

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
        function() {

            openDocumentModal();

        }
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
                        upsert: false
                    }
                );


        if (uploadError) {
            throw uploadError;
        }


        uploadedPath =
            uploadData?.path ||
            filePath;


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
            "Document upload error:",
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
                    .trim() || "";


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
                    "Upload error:",
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


        if (signedData?.signedUrl) {

            window.open(
                signedData.signedUrl,
                "_blank"
            );

        }

    }
    catch(error) {

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
                    "Storage deletion warning:",
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
   TEAM
========================================================= */

async function loadTeam() {

    const container =
        document.getElementById(
            "teamGrid"
        ) ||
        document.getElementById(
            "teamList"
        );


    if (!container) {
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
                .order(
                    "full_name",
                    {
                        ascending: true
                    }
                );


        if (error) {
            throw error;
        }


        renderTeam(
            data || []
        );

    }
    catch(error) {

        console.warn(
            "Team load warning:",
            error
        );

    }

}


/* =========================================================
   RENDER TEAM
========================================================= */

function renderTeam(
    members
) {

    const container =
        document.getElementById(
            "teamGrid"
        ) ||
        document.getElementById(
            "teamList"
        );


    if (!container) {
        return;
    }


    if (!members.length) {
        return;
    }


    container.innerHTML =
        members.map(
            member => {

                const name =
                    member.full_name ||
                    member.name ||
                    "PDS Personnel";


                const role =
                    member.role ||
                    "PLANNING & DESIGN";


                return `

                    <div class="team-card">

                        <div class="avatar">
                            ${escapeHTML(
                                getInitials(name)
                            )}
                        </div>

                        <strong>
                            ${escapeHTML(name)}
                        </strong>

                        <small>
                            ${escapeHTML(role)}
                        </small>

                    </div>

                `;

            }
        ).join("");

}


/* =========================================================
   DEPARTMENT ORDERS
========================================================= */

function renderDepartmentOrders() {

    displayDepartmentOrders(
        planningDesignOrders
    );

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


    if (
        !orders ||
        !orders.length
    ) {

        grid.innerHTML = `

            <div style="
                padding:35px;
                text-align:center;
                color:var(--muted);
                font-size:9px;
                grid-column:1/-1;
            ">
                No Department Orders found.
            </div>

        `;

        return;

    }


    grid.innerHTML =
        orders.map(
            order => {

                return `

                    <div class="department-order">

                        <div class="date-label">
                            ${escapeHTML(
                                order.categoryName ||
                                "DPWH REFERENCE"
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
                            href="${escapeHTML(
                                order.url
                            )}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="button secondary"
                        >
                            VIEW REFERENCE
                        </a>

                    </div>

                `;

            }
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
                    (
                        order.number +
                        " " +
                        order.year +
                        " " +
                        order.title +
                        " " +
                        order.description +
                        " " +
                        order.categoryName
                    ).toLowerCase();


                const matchesSearch =
                    !search ||
                    text.includes(search);


                const matchesCategory =
                    !category ||
                    order.category ===
                    category;


                const matchesYear =
                    !year ||
                    order.year ===
                    year;


                return (
                    matchesSearch &&
                    matchesCategory &&
                    matchesYear
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
   CLEAR ORDER FILTER
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
   SETUP DEPARTMENT ORDER FILTERS
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


    displayDepartmentOrders(
        planningDesignOrders
    );

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

function setupModalForm() {

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


    authFormsReady = true;


    const loginForm =
        document.getElementById(
            "loginForm"
        );


    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            async function(event) {

                event.preventDefault();


                const email =
                    document
                        .getElementById(
                            "loginEmail"
                        )
                        ?.value
                        .trim();


                const password =
                    document
                        .getElementById(
                            "loginPassword"
                        )
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


                await loginUser(
                    email,
                    password
                );

            }
        );

    }


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
   PDS AI SETUP
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
                50
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


    /*
        CLEAR IMMEDIATELY
    */

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
            data?.text;


        if (
            typeof answer !==
            "string"
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

    }
    catch(error) {

        console.error(
            "PDS AI error:",
            error
        );


        const errorMessage =
            "PDS AI could not respond. " +
            (
                error?.message ||
                "Please try again."
            );


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

    const button =
        document.getElementById(
            "refreshButton"
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
        async function() {

            button.disabled =
                true;


            try {

                await refreshAll();

            }
            finally {

                button.disabled =
                    false;

            }

        }
    );

}


/* =========================================================
   NOTIFICATION BUTTON
========================================================= */

function setupNotificationButton() {

    const button =
        document.getElementById(
            "notificationButton"
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
        function() {

            alert(
                "No new PDS notifications."
            );

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
   ESCAPE JS
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
        );

}


/* =========================================================
   INITIALIZE PDS
========================================================= */

async function initializePDSHub() {

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


    /* =====================================================
       INITIAL SCREEN
    ===================================================== */

    const authScreen =
        document.getElementById(
            "authScreen"
        );

    const app =
        document.getElementById(
            "app"
        );


    if (authScreen) {

        authScreen.style.display =
            "flex";

    }


    if (app) {

        app.style.display =
            "none";

    }


    /* =====================================================
       SETUP
    ===================================================== */

    setupAuthForms();

    setupModalForm();

    setupNavigation();

    setupSectionTargets();

    setupGlobalSearch();

    setupDocumentSearch();

    setupDepartmentOrderFilters();

    setupPDSAI();

    setupRefreshButton();

    setupNotificationButton();


    /* =====================================================
       CHECK EXISTING SESSION
    ===================================================== */

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
            "Session initialization error:",
            error
        );


        showLogin();

    }

}


/* =========================================================
   AUTH STATE LISTENER
========================================================= */

db.auth.onAuthStateChange(
    async function(
        event,
        session
    ) {

        console.log(
            "PDS Auth Event:",
            event
        );


        /* -------------------------------------------------
           SIGNED OUT
        ------------------------------------------------- */

        if (
            event ===
            "SIGNED_OUT"
        ) {

            currentUser = null;

            currentProfile = null;

            pdsAIHistory = [];


            const app =
                document.getElementById(
                    "app"
                );

            const authScreen =
                document.getElementById(
                    "authScreen"
                );


            if (app) {

                app.style.display =
                    "none";

            }


            if (authScreen) {

                authScreen.style.display =
                    "flex";

            }


            return;

        }


        /* -------------------------------------------------
           NO SESSION
        ------------------------------------------------- */

        if (!session?.user) {

            return;

        }


        currentUser =
            session.user;


        /*
            loginUser() and initializePDSHub()
            already handle SIGNED_IN / INITIAL_SESSION.

            Do not call loadApplication again while
            another load is running.
        */

        if (appLoading) {
            return;
        }


        if (
            event ===
            "INITIAL_SESSION" ||
            event ===
            "TOKEN_REFRESHED"
        ) {

            await loadApplication();

        }

    }
);


/* =========================================================
   START APPLICATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        initializePDSHub();

    }
);
