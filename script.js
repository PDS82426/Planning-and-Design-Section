/* =========================================================
   PDS — PLANNING & DESIGN SECTION
   OPTIMIZED SCRIPT
   AUTH + SESSION + DASHBOARD + PROJECTS + DOCUMENTS
   DEPARTMENT ORDERS + PDS AI
   ONEDRIVE + EXCEL OVERALL
========================================================= */


/* =========================================================
   GLOBAL CONFIGURATION
========================================================= */

const SUPABASE_URL =
    "https://zvwghoabsqfyakbqzhil.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_oJ3Zc3TplfYgePQEmTrEm8J";


/* =========================================================
   GLOBAL STATE
========================================================= */

let db = null;

let currentUser = null;
let currentProfile = null;

let authStateSubscription = null;
let authFormsReady = false;
let authStartupPromise = null;
let workspaceInitialized = false;

let pdsCurrentPage =
    localStorage.getItem("pdsCurrentPage") ||
    "dashboard";

let cachedMonitoringProjects = [];

let currentEditingMonitoringProject = null;

let oneDriveInitialized = false;
let oneDriveReady = false;

let oneDriveScriptLoading = null;
let oneDriveInitializationPromise = null;

let excelRefreshTimer = null;

let monitoringState = {
    search: "",
    category: "",
    municipality: "",
    status: "",
    program: "",
    sortBy: "projectTitle",
    sortDirection: "asc",
    currentPage: 1,
    pageSize: 25,
    selectedProjectId: null
};


/* =========================================================
   BASIC DOM HELPER
========================================================= */

function $(id) {
    return document.getElementById(id);
}


/* =========================================================
   SAFE STRING HELPERS
========================================================= */

function safeString(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value);
}


function escapeHTML(value) {
    return safeString(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   NUMBER HELPERS
========================================================= */

function toNumber(value, fallback = 0) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return fallback;
    }

    if (
        typeof value === "number" &&
        Number.isFinite(value)
    ) {
        return value;
    }

    const cleaned =
        String(value)
            .replace(/,/g, "")
            .replace(/₱/g, "")
            .replace(/%/g, "")
            .trim();

    const number =
        Number(cleaned);

    return Number.isFinite(number)
        ? number
        : fallback;
}


function clampPercent(value) {

    const number =
        toNumber(value, 0);

    return Math.max(
        0,
        Math.min(
            100,
            number
        )
    );
}


/* =========================================================
   CURRENCY
========================================================= */

function formatCurrency(value) {

    const amount =
        toNumber(value, 0);

    return new Intl.NumberFormat(
        "en-PH",
        {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ).format(amount);
}


/* =========================================================
   DATE HELPERS
========================================================= */

function formatDate(value) {

    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return safeString(value);
    }

    return date.toLocaleDateString(
        "en-PH",
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );
}


/* =========================================================
   MESSAGE SYSTEM
========================================================= */

function showMessage(
    message,
    type = "info"
) {

    const text =
        safeString(message);

    console.log(
        `PDS MESSAGE [${type}]:`,
        text
    );

    let container =
        document.getElementById(
            "pdsMessageContainer"
        );

    if (!container) {

        container =
            document.createElement(
                "div"
            );

        container.id =
            "pdsMessageContainer";

        container.style.position =
            "fixed";

        container.style.top =
            "20px";

        container.style.right =
            "20px";

        container.style.zIndex =
            "99999";

        container.style.maxWidth =
            "420px";

        document.body.appendChild(
            container
        );
    }

    const messageElement =
        document.createElement(
            "div"
        );

    messageElement.className =
        `pds-message pds-message-${type}`;

    messageElement.textContent =
        text;

    messageElement.style.padding =
        "12px 16px";

    messageElement.style.marginBottom =
        "8px";

    messageElement.style.borderRadius =
        "8px";

    messageElement.style.background =
        "#ffffff";

    messageElement.style.boxShadow =
        "0 4px 18px rgba(0,0,0,.15)";

    messageElement.style.border =
        "1px solid #d9e0ea";

    container.appendChild(
        messageElement
    );

    window.setTimeout(
        () => {

            messageElement.style.opacity =
                "0";

            messageElement.style.transition =
                "opacity .25s ease";

            window.setTimeout(
                () => {
                    messageElement.remove();
                },
                300
            );

        },
        4000
    );
}


/* =========================================================
   SUPABASE LIBRARY
========================================================= */

function waitForSupabase(
    timeout = 10000
) {

    return new Promise(
        resolve => {

            if (
                window.supabase &&
                typeof window.supabase.createClient ===
                    "function"
            ) {
                resolve(true);
                return;
            }

            const start =
                Date.now();

            const timer =
                window.setInterval(
                    () => {

                        if (
                            window.supabase &&
                            typeof window.supabase.createClient ===
                                "function"
                        ) {

                            window.clearInterval(
                                timer
                            );

                            resolve(true);
                            return;
                        }

                        if (
                            Date.now() - start >=
                            timeout
                        ) {

                            window.clearInterval(
                                timer
                            );

                            resolve(false);
                        }

                    },
                    100
                );
        }
    );
}


/* =========================================================
   INITIALIZE SUPABASE
========================================================= */

function initializeSupabase() {

    if (db) {
        return true;
    }

    if (
        !window.supabase ||
        typeof window.supabase.createClient !==
            "function"
    ) {

        console.error(
            "PDS Auth: Supabase library unavailable."
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
                        detectSessionInUrl: true
                    }
                }
            );

        console.log(
            "PDS Auth: Supabase client initialized."
        );

        return true;

    } catch (error) {

        console.error(
            "PDS Auth: Supabase initialization failed:",
            error
        );

        db = null;

        return false;
    }
}


/* =========================================================
   CURRENT SESSION
========================================================= */

async function getCurrentSession() {

    if (!db) {
        return null;
    }

    try {

        const {
            data,
            error
        } =
            await db.auth.getSession();

        if (error) {
            throw error;
        }

        return (
            data?.session ||
            null
        );

    } catch (error) {

        console.error(
            "PDS Auth: Unable to get session:",
            error
        );

        return null;
    }
}


/* =========================================================
   LOAD CURRENT PROFILE
========================================================= */

async function loadCurrentProfile(
    userId
) {

    currentProfile = null;

    if (
        !db ||
        !userId
    ) {
        return null;
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
                    userId
                )
                .maybeSingle();

        if (error) {

            console.warn(
                "PDS Auth: Profile load warning:",
                error
            );

            return null;
        }

        currentProfile =
            data || null;

        return currentProfile;

    } catch (error) {

        console.error(
            "PDS Auth: Profile load failed:",
            error
        );

        return null;
    }
}


/* =========================================================
   AUTHENTICATED UI
========================================================= */

function updateAuthenticatedUI() {

    const signInPage =
        document.getElementById(
            "signInPage"
        );

    const mainApp =
        document.getElementById(
            "mainApp"
        );

    const authenticated =
        !!currentUser;

    if (signInPage) {

        signInPage.style.display =
            authenticated
                ? "none"
                : "";
    }

    if (mainApp) {

        mainApp.style.display =
            authenticated
                ? ""
                : "none";
    }

    document.body.classList.toggle(
        "pds-authenticated",
        authenticated
    );

    document.body.classList.toggle(
        "pds-unauthenticated",
        !authenticated
    );

    document.dispatchEvent(
        new CustomEvent(
            "pds:auth-ui-updated",
            {
                detail: {
                    authenticated,
                    user: currentUser
                }
            }
        )
    );
}


/* =========================================================
   SIGN IN
========================================================= */

async function signInUser(
    email,
    password
) {

    if (!db) {

        showMessage(
            "Authentication is not ready. Please refresh the page.",
            "error"
        );

        return false;
    }

    email =
        safeString(email).trim();

    password =
        safeString(password);

    if (!email) {

        showMessage(
            "Please enter your email.",
            "warning"
        );

        return false;
    }

    if (!password) {

        showMessage(
            "Please enter your password.",
            "warning"
        );

        return false;
    }

    try {

        console.log(
            "PDS Auth: Signing in:",
            email
        );

        const {
            data,
            error
        } =
            await db.auth.signInWithPassword(
                {
                    email,
                    password
                }
            );

        if (error) {
            throw error;
        }

        currentUser =
            data?.user ||
            null;

        if (!currentUser) {

            throw new Error(
                "Supabase did not return a user session."
            );
        }

        await loadCurrentProfile(
            currentUser.id
        );

        updateAuthenticatedUI();

        showMessage(
            "Sign in successful.",
            "success"
        );

        await initializeAfterLogin();

        return true;

    } catch (error) {

        console.error(
            "PDS Auth: Sign in failed:",
            error
        );

        currentUser = null;
        currentProfile = null;

        updateAuthenticatedUI();

        let message =
            error?.message ||
            "Unable to sign in.";

        if (
            message.toLowerCase()
                .includes(
                    "invalid login credentials"
                )
        ) {

            message =
                "Invalid email or password.";
        }

        showMessage(
            message,
            "error"
        );

        return false;
    }
}


/* =========================================================
   SIGN OUT
========================================================= */

async function signOutUser() {

    if (!db) {
        return false;
    }

    try {

        console.log(
            "PDS Auth: Signing out..."
        );

        const {
            error
        } =
            await db.auth.signOut();

        if (error) {
            throw error;
        }

        currentUser = null;
        currentProfile = null;

        workspaceInitialized = false;

        updateAuthenticatedUI();

        showMessage(
            "You have been signed out.",
            "success"
        );

        return true;

    } catch (error) {

        console.error(
            "PDS Auth: Sign out failed:",
            error
        );

        showMessage(
            error?.message ||
                "Unable to sign out.",
            "error"
        );

        return false;
    }
}
/* =========================================================
   AUTH FORM INITIALIZATION
========================================================= */

function initializeAuthForms() {

    if (authFormsReady) {
        console.log(
            "PDS Auth: Forms already initialized."
        );

        return;
    }

    console.log(
        "PDS Auth: Initializing Sign In form..."
    );

    const signInForm =
    document.getElementById("loginForm") ||
    document.getElementById("signInForm");

const signInButton =
    document.getElementById("signInButton") ||
    document.getElementById("loginButton") ||
    document.getElementById("signInBtn") ||
    signInForm?.querySelector(
        "button[type='submit']"
    );
    const getEmailInput = () =>
        document.getElementById("email") ||
        document.getElementById("loginEmail") ||
        document.getElementById("signInEmail");

    const getPasswordInput = () =>
        document.getElementById("password") ||
        document.getElementById("loginPassword") ||
        document.getElementById("signInPassword");


    /* ---------------------------------------------------------
       SIGN IN FORM
    --------------------------------------------------------- */

    if (signInForm) {

        signInForm.addEventListener(
            "submit",
            async event => {

                event.preventDefault();
                event.stopPropagation();

                console.log(
                    "PDS Auth: Sign In form submitted."
                );

                const emailInput =
                    getEmailInput();

                const passwordInput =
                    getPasswordInput();

                const email =
                    emailInput?.value?.trim() ||
                    "";

                const password =
                    passwordInput?.value ||
                    "";

                console.log(
                    "PDS Auth: Email entered:",
                    email
                );

                if (!email) {

                    showMessage(
                        "Please enter your email.",
                        "warning"
                    );

                    emailInput?.focus();

                    return;
                }

                if (!password) {

                    showMessage(
                        "Please enter your password.",
                        "warning"
                    );

                    passwordInput?.focus();

                    return;
                }

                const submitButton =
                    signInForm.querySelector(
                        "button[type='submit'], input[type='submit']"
                    ) ||
                    signInButton;

                const originalText =
                    submitButton?.textContent ||
                    "";

                if (submitButton) {

                    submitButton.disabled =
                        true;

                    submitButton.textContent =
                        "Signing in...";
                }

                try {

                    await signInUser(
                        email,
                        password
                    );

                } finally {

                    if (submitButton) {

                        submitButton.disabled =
                            false;

                        if (originalText) {

                            submitButton.textContent =
                                originalText;
                        }
                    }
                }
            }
        );

        console.log(
            "PDS Auth: Sign In form listener attached."
        );

    } else {

        console.warn(
            "PDS Auth: #signInForm was not found."
        );
    }


    /* ---------------------------------------------------------
       FALLBACK SIGN IN BUTTON
    --------------------------------------------------------- */

    if (
        !signInForm &&
        signInButton
    ) {

        signInButton.addEventListener(
            "click",
            async event => {

                event.preventDefault();
                event.stopPropagation();

                console.log(
                    "PDS Auth: Sign In button clicked."
                );

                const emailInput =
                    getEmailInput();

                const passwordInput =
                    getPasswordInput();

                const email =
                    emailInput?.value?.trim() ||
                    "";

                const password =
                    passwordInput?.value ||
                    "";

                await signInUser(
                    email,
                    password
                );
            }
        );

        console.log(
            "PDS Auth: Fallback Sign In button listener attached."
        );
    }


    /* ---------------------------------------------------------
       SIGN OUT BUTTONS
    --------------------------------------------------------- */

    const signOutButtons =
        document.querySelectorAll(
            [
                "#signOutButton",
                "#logoutButton",
                ".sign-out-button",
                "[data-action='sign-out']"
            ].join(",")
        );

    signOutButtons.forEach(
        button => {

            if (
                button.dataset.authBound ===
                "true"
            ) {
                return;
            }

            button.dataset.authBound =
                "true";

            button.addEventListener(
                "click",
                async event => {

                    event.preventDefault();
                    event.stopPropagation();

                    await signOutUser();
                }
            );
        }
    );

    authFormsReady = true;

    console.log(
        "PDS Auth: Authentication forms ready."
    );
}


/* =========================================================
   AUTH STATE LISTENER
========================================================= */

function initializeAuthListener() {

    if (
        !db ||
        authStateSubscription
    ) {

        return;
    }

    console.log(
        "PDS Auth: Installing auth state listener..."
    );

    const result =
        db.auth.onAuthStateChange(
            async (
                event,
                session
            ) => {

                console.log(
                    "PDS Auth Event:",
                    event
                );

                currentUser =
                    session?.user ||
                    null;

                if (currentUser) {

                    await loadCurrentProfile(
                        currentUser.id
                    );

                    updateAuthenticatedUI();

                    if (
                        event === "SIGNED_IN" ||
                        event === "INITIAL_SESSION"
                    ) {

                        await initializeAfterLogin();
                    }

                } else {

                    currentProfile =
                        null;

                    workspaceInitialized =
                        false;

                    updateAuthenticatedUI();
                }
            }
        );

    authStateSubscription =
        result?.data?.subscription ||
        null;

    console.log(
        "PDS Auth: Auth listener ready."
    );
}


/* =========================================================
   INITIALIZE AFTER LOGIN
========================================================= */

async function initializeAfterLogin() {

    if (
        workspaceInitialized
    ) {

        console.log(
            "PDS: Workspace already initialized."
        );

        return;
    }

    if (!currentUser) {

        console.warn(
            "PDS: Cannot initialize workspace without a user."
        );

        return;
    }

    workspaceInitialized =
        true;

    console.log(
        "PDS: Initializing authenticated workspace..."
    );


    /* ---------------------------------------------------------
       NAVIGATION
    --------------------------------------------------------- */

    try {

        if (
            typeof initializeNavigation ===
            "function"
        ) {

            await initializeNavigation();
        }

    } catch (error) {

        console.error(
            "PDS: Navigation initialization failed:",
            error
        );
    }


    /* ---------------------------------------------------------
       DOCUMENTS
    --------------------------------------------------------- */

    try {

        if (
            typeof initializeDocuments ===
            "function"
        ) {

            await initializeDocuments();
        }

    } catch (error) {

        console.error(
            "PDS: Document initialization failed:",
            error
        );
    }


    /* ---------------------------------------------------------
       PROJECT MONITORING
    --------------------------------------------------------- */

    try {

        if (
            typeof initializeProjectMonitoring ===
            "function"
        ) {

            await initializeProjectMonitoring();
        }

    } catch (error) {

        console.error(
            "PDS: Project Monitoring initialization failed:",
            error
        );
    }


    /* ---------------------------------------------------------
       DEPARTMENT ORDERS
    --------------------------------------------------------- */

    try {

        if (
            typeof initializeDepartmentOrders ===
            "function"
        ) {

            await initializeDepartmentOrders();
        }

    } catch (error) {

        console.error(
            "PDS: Department Orders initialization failed:",
            error
        );
    }


    /* ---------------------------------------------------------
       PDS AI
    --------------------------------------------------------- */

    try {

        if (
            typeof initializePDSAI ===
            "function"
        ) {

            await initializePDSAI();
        }

    } catch (error) {

        console.error(
            "PDS: PDS AI initialization failed:",
            error
        );
    }


    /* ---------------------------------------------------------
       ONEDRIVE
       
       OneDrive authentication is separate from
       Supabase authentication.
       
       Project Monitoring uses Excel OVERALL
       as its source of truth.
    --------------------------------------------------------- */

    try {

        if (
            typeof initializeOneDrive ===
            "function"
        ) {

            await initializeOneDrive();
        }

    } catch (error) {

        console.warn(
            "PDS: OneDrive initialization did not complete:",
            error
        );
    }


    /* ---------------------------------------------------------
       FINAL UI
    --------------------------------------------------------- */

    try {

        if (
            typeof initializeFinalPDSUI ===
            "function"
        ) {

            initializeFinalPDSUI();
        }

    } catch (error) {

        console.error(
            "PDS: Final UI initialization failed:",
            error
        );
    }


    console.log(
        "PDS: Authenticated workspace ready."
    );
}


/* =========================================================
   MSAL — LOAD MICROSOFT AUTHENTICATION LIBRARY
========================================================= */

function loadMSAL() {

    if (
        window.msal &&
        typeof window.msal.PublicClientApplication ===
            "function"
    ) {

        return Promise.resolve(
            true
        );
    }

    if (
        oneDriveScriptLoading
    ) {

        return oneDriveScriptLoading;
    }

    oneDriveScriptLoading =
        new Promise(
            resolve => {

                const existing =
                    document.querySelector(
                        "script[data-pds-msal='true']"
                    );

                if (existing) {

                    existing.addEventListener(
                        "load",
                        () => resolve(true),
                        {
                            once: true
                        }
                    );

                    existing.addEventListener(
                        "error",
                        () => resolve(false),
                        {
                            once: true
                        }
                    );

                    return;
                }


                const script =
                    document.createElement(
                        "script"
                    );

                script.src =
                    "https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js";

                script.async =
                    true;

                script.defer =
                    true;

                script.dataset.pdsMsal =
                    "true";


                script.onload =
                    () => {

                        console.log(
                            "PDS OneDrive: MSAL loaded."
                        );

                        resolve(true);
                    };


                script.onerror =
                    error => {

                        console.error(
                            "PDS OneDrive: Failed to load MSAL.",
                            error
                        );

                        resolve(false);
                    };


                document.head.appendChild(
                    script
                );
            }
        );

    return oneDriveScriptLoading;
}


/* =========================================================
   ONEDRIVE CONFIGURATION
========================================================= */

const PDS_ONEDRIVE_CONFIG = {

    clientId:
        window.PDS_ONEDRIVE_CLIENT_ID ||
        "",

    authority:
        "https://login.microsoftonline.com/common",

    scopes: [
        "Files.ReadWrite",
        "User.Read"
    ],

    workbookName:
        "trial for website.xlsx",

    worksheetName:
        "OVERALL"
};


/* =========================================================
   ONEDRIVE STATE
========================================================= */

let msalInstance =
    null;

let oneDriveAccount =
    null;

let oneDriveAccessToken =
    null;

let oneDriveWorkbookId =
    null;


/* =========================================================
   CREATE MSAL INSTANCE
========================================================= */

async function initializeMSAL() {

    if (msalInstance) {

        return msalInstance;
    }

    const loaded =
        await loadMSAL();

    if (!loaded) {

        throw new Error(
            "Microsoft authentication library could not be loaded."
        );
    }

    if (
        !window.msal ||
        typeof window.msal.PublicClientApplication !==
            "function"
    ) {

        throw new Error(
            "MSAL browser library is unavailable."
        );
    }

    if (
        !PDS_ONEDRIVE_CONFIG.clientId
    ) {

        console.warn(
            "PDS OneDrive: Client ID has not been configured."
        );

        return null;
    }

    msalInstance =
        new window.msal.PublicClientApplication(
            {
                auth: {
                    clientId:
                        PDS_ONEDRIVE_CONFIG.clientId,

                    authority:
                        PDS_ONEDRIVE_CONFIG.authority,

                    redirectUri:
                        window.location.origin +
                        window.location.pathname
                },

                cache: {
                    cacheLocation:
                        "localStorage",

                    storeAuthStateInCookie:
                        false
                }
            }
        );

    return msalInstance;
}


/* =========================================================
   ONEDRIVE ACCOUNT
========================================================= */

function getOneDriveAccount() {

    if (
        oneDriveAccount
    ) {

        return oneDriveAccount;
    }

    if (
        !msalInstance
    ) {

        return null;
    }

    const accounts =
        msalInstance.getAllAccounts();

    oneDriveAccount =
        accounts[0] ||
        null;

    return oneDriveAccount;
}


/* =========================================================
   ONEDRIVE STATUS
========================================================= */

function isOneDriveConnected() {

    return (
        oneDriveInitialized === true ||
        oneDriveReady === true
    );
}


function updateOneDriveStatusUI() {

    const statusElements =
        document.querySelectorAll(
            [
                "#oneDriveStatus",
                "#onedriveStatus",
                "[data-onedrive-status]"
            ].join(",")
        );

    const connected =
        isOneDriveConnected();

    statusElements.forEach(
        element => {

            if (connected) {

                element.textContent =
                    "OneDrive Excel Connected";

                element.classList.remove(
                    "offline",
                    "disconnected",
                    "error"
                );

                element.classList.add(
                    "connected"
                );

            } else {

                element.textContent =
                    "OneDrive Excel Not Connected";

                element.classList.remove(
                    "connected"
                );

                element.classList.add(
                    "disconnected"
                );
            }
        }
    );
}


/* =========================================================
   ONEDRIVE SIGN IN
========================================================= */

async function signInToOneDrive() {

    const msal =
        await initializeMSAL();

    if (!msal) {

        throw new Error(
            "OneDrive Client ID is not configured."
        );
    }

    let account =
        getOneDriveAccount();

    if (!account) {

        const loginResponse =
            await msal.loginPopup(
                {
                    scopes:
                        PDS_ONEDRIVE_CONFIG.scopes
                }
            );

        account =
            loginResponse?.account ||
            null;

        oneDriveAccount =
            account;
    }

    if (!account) {

        throw new Error(
            "Microsoft account sign in did not return an account."
        );
    }

    const tokenResponse =
        await msal.acquireTokenSilent(
            {
                scopes:
                    PDS_ONEDRIVE_CONFIG.scopes,

                account
            }
        );

    oneDriveAccessToken =
        tokenResponse.accessToken;

    oneDriveInitialized =
        true;

    oneDriveReady =
        true;

    updateOneDriveStatusUI();

    return true;
}


/* =========================================================
   ONEDRIVE INITIALIZATION
========================================================= */

async function initializeOneDrive() {

    if (
        oneDriveInitializationPromise
    ) {

        return oneDriveInitializationPromise;
    }

    oneDriveInitializationPromise =
        (async () => {

            try {

                const msal =
                    await initializeMSAL();

                if (!msal) {

                    updateOneDriveStatusUI();

                    return false;
                }

                let account =
                    getOneDriveAccount();

                if (!account) {

                    updateOneDriveStatusUI();

                    return false;
                }

                const tokenResponse =
                    await msal.acquireTokenSilent(
                        {
                            scopes:
                                PDS_ONEDRIVE_CONFIG.scopes,

                            account
                        }
                    );

                oneDriveAccessToken =
                    tokenResponse.accessToken;

                oneDriveAccount =
                    account;

                oneDriveInitialized =
                    true;

                oneDriveReady =
                    true;

                updateOneDriveStatusUI();

                console.log(
                    "PDS OneDrive: Existing Microsoft session restored."
                );

                return true;

            } catch (error) {

                console.warn(
                    "PDS OneDrive: Initialization failed:",
                    error
                );

                oneDriveInitialized =
                    false;

                oneDriveReady =
                    false;

                updateOneDriveStatusUI();

                return false;

            } finally {

                oneDriveInitializationPromise =
                    null;
            }

        })();

    return oneDriveInitializationPromise;
}
/* =========================================================
   GRAPH API REQUEST
========================================================= */

async function graphRequest(
    endpoint,
    options = {}
) {

    if (
        !oneDriveAccessToken
    ) {

        throw new Error(
            "OneDrive is not authenticated."
        );
    }

    const response =
        await fetch(
            `https://graph.microsoft.com/v1.0${endpoint}`,
            {
                ...options,

                headers: {
                    Accept:
                        "application/json",

                    ...(options.body
                        ? {
                            "Content-Type":
                                "application/json"
                        }
                        : {}),

                    ...(options.headers || {}),

                    Authorization:
                        `Bearer ${oneDriveAccessToken}`
                }
            }
        );

    if (!response.ok) {

        let errorMessage =
            `Microsoft Graph request failed (${response.status}).`;

        try {

            const errorData =
                await response.json();

            errorMessage =
                errorData?.error?.message ||
                errorMessage;

        } catch {
            /* Ignore JSON parsing errors. */
        }

        throw new Error(
            errorMessage
        );
    }

    if (
        response.status === 204
    ) {

        return null;
    }

    const contentType =
        response.headers.get(
            "content-type"
        ) || "";

    if (
        contentType.includes(
            "application/json"
        )
    ) {

        return await response.json();
    }

    return await response.text();
}


/* =========================================================
   GET ONEDRIVE ROOT ITEMS
========================================================= */

async function getOneDriveRootItems() {

    return await graphRequest(
        "/me/drive/root/children?$select=id,name,file,folder,size,lastModifiedDateTime"
    );
}


/* =========================================================
   FIND EXCEL WORKBOOK
========================================================= */

async function findOneDriveWorkbook(
    fileName =
        PDS_ONEDRIVE_CONFIG.workbookName
) {

    const encodedName =
        encodeURIComponent(
            fileName
        );

    try {

        const result =
            await graphRequest(
                `/me/drive/root/search(q='${encodedName}')?$select=id,name,file,folder,size,lastModifiedDateTime,parentReference`
            );

        const items =
            Array.isArray(
                result?.value
            )
                ? result.value
                : [];

        const exact =
            items.find(
                item =>
                    safeString(
                        item.name
                    ).toLowerCase() ===
                    safeString(
                        fileName
                    ).toLowerCase()
            );

        if (exact) {

            oneDriveWorkbookId =
                exact.id;

            return exact;
        }

        return null;

    } catch (error) {

        console.error(
            "PDS OneDrive: Workbook search failed:",
            error
        );

        throw error;
    }
}


/* =========================================================
   GET WORKBOOK ID
========================================================= */

async function getOneDriveWorkbookId() {

    if (
        oneDriveWorkbookId
    ) {

        return oneDriveWorkbookId;
    }

    const workbook =
        await findOneDriveWorkbook();

    if (!workbook?.id) {

        throw new Error(
            `Excel workbook "${PDS_ONEDRIVE_CONFIG.workbookName}" was not found in OneDrive.`
        );
    }

    return workbook.id;
}


/* =========================================================
   EXCEL GRAPH BASE
========================================================= */

function excelBasePath() {

    if (
        !oneDriveWorkbookId
    ) {

        throw new Error(
            "OneDrive Excel workbook is not selected."
        );
    }

    return (
        `/me/drive/items/${encodeURIComponent(
            oneDriveWorkbookId
        )}/workbook`
    );
}


/* =========================================================
   GET WORKSHEET
========================================================= */

async function getExcelWorksheet(
    worksheetName =
        PDS_ONEDRIVE_CONFIG.worksheetName
) {

    const encoded =
        encodeURIComponent(
            worksheetName
        );

    return await graphRequest(
        `${excelBasePath()}/worksheets/${encoded}`
    );
}


/* =========================================================
   GET USED RANGE
========================================================= */

async function getExcelUsedRange(
    worksheetName =
        PDS_ONEDRIVE_CONFIG.worksheetName
) {

    const encoded =
        encodeURIComponent(
            worksheetName
        );

    return await graphRequest(
        `${excelBasePath()}/worksheets/${encoded}/usedRange(valuesOnly=true)`
    );
}


/* =========================================================
   LOAD OVERALL VALUES
========================================================= */

async function loadOverallExcelValues() {

    await getOneDriveWorkbookId();

    const usedRange =
        await getExcelUsedRange(
            PDS_ONEDRIVE_CONFIG.worksheetName
        );

    return (
        Array.isArray(
            usedRange?.values
        )
            ? usedRange.values
            : []
    );
}


/* =========================================================
   NORMALIZE EXCEL HEADER
========================================================= */

function normalizeHeader(
    value
) {

    return safeString(value)
        .trim()
        .toLowerCase()
        .replace(
            /[\r\n]+/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        );
}


/* =========================================================
   FIND COLUMN INDEX
========================================================= */

function findExcelColumn(
    headers,
    names
) {

    if (
        !Array.isArray(headers)
    ) {

        return -1;
    }

    const normalizedHeaders =
        headers.map(
            normalizeHeader
        );

    const possibleNames =
        Array.isArray(names)
            ? names
            : [names];

    for (
        const name of possibleNames
    ) {

        const target =
            normalizeHeader(
                name
            );

        const index =
            normalizedHeaders.indexOf(
                target
            );

        if (
            index >= 0
        ) {

            return index;
        }
    }

    return -1;
}


/* =========================================================
   EXCEL VALUE HELPERS
========================================================= */

function excelCell(
    row,
    index
) {

    if (
        !Array.isArray(row) ||
        index < 0
    ) {

        return "";
    }

    return (
        row[index] ??
        ""
    );
}


function cleanExcelText(
    value
) {

    return safeString(value)
        .replace(
            /\u00a0/g,
            " "
        )
        .trim();
}


/* =========================================================
   MAP OVERALL ROW TO PROJECT
========================================================= */

function mapOverallRowToProject(
    row,
    headers,
    rowIndex
) {

    const titleIndex =
        findExcelColumn(
            headers,
            [
                "PROJECT TITLE AS PER GAA",
                "PROJECT TITLE",
                "PROJECT TITLE AS PER GAA "
            ]
        );

    const municipalityIndex =
        findExcelColumn(
            headers,
            [
                "MUNICIPALITY",
                "CITY/MUNICIPALITY",
                "CITY / MUNICIPALITY"
            ]
        );

    const allocationIndex =
        findExcelColumn(
            headers,
            [
                "ALLOCATION",
                "ABC",
                "PROJECT ALLOCATION"
            ]
        );

    const programIndex =
        findExcelColumn(
            headers,
            [
                "PROGRAM2",
                "PROGRAM",
                "PROGRAM 2"
            ]
        );

    const projectCountIndex =
        findExcelColumn(
            headers,
            [
                "NO. OF PROJS",
                "NO. OF PROJECTS",
                "NUMBER OF PROJECTS"
            ]
        );


    const projectTitle =
        cleanExcelText(
            excelCell(
                row,
                titleIndex
            )
        );

    if (
        !projectTitle
    ) {

        return null;
    }


    const project = {

        id:
            `overall-${rowIndex}`,

        excelRow:
            rowIndex + 1,

        projectTitle,

        municipality:
            cleanExcelText(
                excelCell(
                    row,
                    municipalityIndex
                )
            ),

        allocation:
            toNumber(
                excelCell(
                    row,
                    allocationIndex
                ),
                0
            ),

        program:
            cleanExcelText(
                excelCell(
                    row,
                    programIndex
                )
            ),

        projectCount:
            toNumber(
                excelCell(
                    row,
                    projectCountIndex
                ),
                0
            )
    };


    /* ---------------------------------------------------------
       MONITORING FIELDS
    --------------------------------------------------------- */

    const programStatusIndex =
        findExcelColumn(
            headers,
            [
                "PROGRAM STATUS",
                "PROGRAM2 STATUS"
            ]
        );

    const programPercentIndex =
        findExcelColumn(
            headers,
            [
                "PROGRAM % COMPLETE",
                "PROGRAM PERCENT COMPLETE",
                "PROGRAM %"
            ]
        );

    const planStatusIndex =
        findExcelColumn(
            headers,
            [
                "PLAN STATUS",
                "PLANS STATUS"
            ]
        );

    const planPercentIndex =
        findExcelColumn(
            headers,
            [
                "PLAN % COMPLETE",
                "PLAN PERCENT COMPLETE",
                "PLAN %"
            ]
        );

    const overallStatusIndex =
        findExcelColumn(
            headers,
            [
                "OVERALL STATUS",
                "STATUS"
            ]
        );

    const lastUpdatedIndex =
        findExcelColumn(
            headers,
            [
                "LAST UPDATED",
                "DATE UPDATED"
            ]
        );

    const remarksIndex =
        findExcelColumn(
            headers,
            [
                "REMARKS",
                "REMARKS 1"
            ]
        );

    const remarks2Index =
        findExcelColumn(
            headers,
            [
                "REMARKS 2",
                "REMARKS2"
            ]
        );


    project.programStatus =
        cleanExcelText(
            excelCell(
                row,
                programStatusIndex
            )
        );

    project.programPercent =
        clampPercent(
            excelCell(
                row,
                programPercentIndex
            )
        );

    project.planStatus =
        cleanExcelText(
            excelCell(
                row,
                planStatusIndex
            )
        );

    project.planPercent =
        clampPercent(
            excelCell(
                row,
                planPercentIndex
            )
        );

    project.overallStatus =
        cleanExcelText(
            excelCell(
                row,
                overallStatusIndex
            )
        );

    project.lastUpdated =
        cleanExcelText(
            excelCell(
                row,
                lastUpdatedIndex
            )
        );

    project.remarks =
        cleanExcelText(
            excelCell(
                row,
                remarksIndex
            )
        );

    project.remarks2 =
        cleanExcelText(
            excelCell(
                row,
                remarks2Index
            )
        );


    /* ---------------------------------------------------------
       FALLBACK STATUS
    --------------------------------------------------------- */

    if (
        !project.overallStatus
    ) {

        const program =
            project.programPercent;

        const plan =
            project.planPercent;

        if (
            program >= 100 &&
            plan >= 100
        ) {

            project.overallStatus =
                "Completed";

        } else if (
            program > 0 ||
            plan > 0
        ) {

            project.overallStatus =
                "Ongoing";

        } else {

            project.overallStatus =
                "Not Started";
        }
    }


    return project;
}


/* =========================================================
   LOAD PROJECT MONITORING FROM EXCEL
========================================================= */

async function loadProjectMonitoring(
    forceRefresh = false
) {

    if (
        !forceRefresh &&
        Array.isArray(
            cachedMonitoringProjects
        ) &&
        cachedMonitoringProjects.length
    ) {

        return cachedMonitoringProjects;
    }


    if (
        !isOneDriveConnected()
    ) {

        const initialized =
            await initializeOneDrive();

        if (!initialized) {

            throw new Error(
                "OneDrive Excel is not connected."
            );
        }
    }


    const values =
        await loadOverallExcelValues();

    if (
        !Array.isArray(values) ||
        values.length === 0
    ) {

        cachedMonitoringProjects =
            [];

        return [];
    }


    const headers =
        Array.isArray(values[0])
            ? values[0]
            : [];


    const projects = [];

    for (
        let i = 1;
        i < values.length;
        i++
    ) {

        const project =
            mapOverallRowToProject(
                values[i],
                headers,
                i
            );

        if (project) {

            projects.push(
                project
            );
        }
    }


    cachedMonitoringProjects =
        projects;

    return projects;
}


/* =========================================================
   REFRESH MONITORING FROM ONEDRIVE
========================================================= */

async function refreshMonitoringFromOneDrive() {

    showMonitoringLoadingState();

    try {

        const projects =
            await loadProjectMonitoring(
                true
            );

        cachedMonitoringProjects =
            Array.isArray(projects)
                ? projects
                : [];

        renderMonitoringProjects();

        updateDashboardProjectCounts(
            cachedMonitoringProjects
        );

        renderDashboardRecentProjects(
            cachedMonitoringProjects
        );

        updateOneDriveStatusUI();

        return cachedMonitoringProjects;

    } catch (error) {

        console.error(
            "PDS: Monitoring refresh failed:",
            error
        );

        showMonitoringErrorState(
            error?.message ||
            "Unable to load project monitoring data."
        );

        throw error;
    }
}


/* =========================================================
   REFRESH AFTER EXCEL SAVE
========================================================= */

async function refreshAfterExcelSave() {

    const projects =
        await refreshMonitoringFromOneDrive();

    dispatchPDSDataUpdated(
        projects
    );

    return projects;
}


/* =========================================================
   PDS DATA UPDATED EVENT
========================================================= */

function dispatchPDSDataUpdated(
    projects
) {

    document.dispatchEvent(
        new CustomEvent(
            "pds:data-updated",
            {
                detail: {
                    projects:
                        Array.isArray(projects)
                            ? projects
                            : []
                }
            }
        )
    );
}


/* =========================================================
   FIND MONITORING PROJECT
========================================================= */

function findMonitoringProject(
    projectId
) {

    if (
        projectId === null ||
        projectId === undefined
    ) {

        return null;
    }

    return (
        cachedMonitoringProjects.find(
            project =>
                String(
                    project.id
                ) ===
                String(
                    projectId
                )
        ) ||
        null
    );
}


/* =========================================================
   STATUS NORMALIZATION
========================================================= */

function normalizeStatus(
    status
) {

    const value =
        cleanExcelText(
            status
        );

    return value ||
        "Not Started";
}


/* =========================================================
   PROGRESS BAR
========================================================= */

function createProgressBar(
    value
) {

    const percent =
        clampPercent(
            value
        );

    return `
        <div
            class="pds-progress"
            style="
                width:100%;
                min-width:90px;
            "
        >
            <div
                class="pds-progress-track"
                style="
                    width:100%;
                    height:8px;
                    border-radius:999px;
                    background:#e6ebf2;
                    overflow:hidden;
                "
            >
                <div
                    class="pds-progress-fill"
                    style="
                        width:${percent}%;
                        height:100%;
                        border-radius:999px;
                    "
                ></div>
            </div>

            <div
                style="
                    margin-top:4px;
                    font-size:12px;
                    font-weight:600;
                "
            >
                ${percent.toFixed(1)}%
            </div>
        </div>
    `;
}


/* =========================================================
   STATUS BADGE
========================================================= */

function createStatusBadge(
    status
) {

    const text =
        normalizeStatus(
            status
        );

    return `
        <span
            class="pds-status-badge"
            data-status="${escapeHTML(text)}"
        >
            ${escapeHTML(text)}
        </span>
    `;
}


/* =========================================================
   MONITORING FILTERS
========================================================= */

function getFilteredMonitoringProjects() {

    const source =
        Array.isArray(
            cachedMonitoringProjects
        )
            ? cachedMonitoringProjects
            : [];

    const search =
        cleanExcelText(
            monitoringState.search
        ).toLowerCase();

    const status =
        cleanExcelText(
            monitoringState.status
        ).toLowerCase();

    const municipality =
        cleanExcelText(
            monitoringState.municipality
        ).toLowerCase();

    const program =
        cleanExcelText(
            monitoringState.program
        ).toLowerCase();


    return source.filter(
        project => {

            const searchable =
                [
                    project.projectTitle,
                    project.municipality,
                    project.program,
                    project.overallStatus,
                    project.programStatus,
                    project.planStatus
                ]
                    .map(
                        value =>
                            safeString(
                                value
                            ).toLowerCase()
                    )
                    .join(" ");


            if (
                search &&
                !searchable.includes(
                    search
                )
            ) {

                return false;
            }


            if (
                status &&
                safeString(
                    project.overallStatus
                )
                    .toLowerCase() !==
                    status
            ) {

                return false;
            }


            if (
                municipality &&
                safeString(
                    project.municipality
                )
                    .toLowerCase() !==
                    municipality
            ) {

                return false;
            }


            if (
                program &&
                safeString(
                    project.program
                )
                    .toLowerCase() !==
                    program
            ) {

                return false;
            }


            return true;
        }
    );
}


/* =========================================================
   GET FILTERED MONITORING PROJECTS
========================================================= */

function getFilteredMonitoringProjects() {

    let projects =
        Array.isArray(
            cachedMonitoringProjects
        )
            ? [...cachedMonitoringProjects]
            : [];


    const search =
        String(
            monitoringState.search ||
            ""
        )
            .trim()
            .toLowerCase();


    const category =
        String(
            monitoringState.category ||
            ""
        )
            .trim()
            .toLowerCase();


    const municipality =
        String(
            monitoringState.municipality ||
            ""
        )
            .trim()
            .toLowerCase();


    const status =
        String(
            monitoringState.status ||
            ""
        )
            .trim()
            .toLowerCase();


    projects =
        projects.filter(
            project => {

                if (search) {

                    const searchable =
                        [
                            project.projectTitle,
                            project.projectTitleGAA,
                            project.program,
                            project.subProgram,
                            project.municipality,
                            project.contractId,
                            project.category
                        ]
                            .map(
                                value =>
                                    String(
                                        value ?? ""
                                    ).toLowerCase()
                            )
                            .join(" ");


                    if (
                        !searchable.includes(
                            search
                        )
                    ) {

                        return false;
                    }
                }


                if (
                    category &&
                    String(
                        project.category ||
                        ""
                    )
                        .trim()
                        .toLowerCase() !==
                        category
                ) {

                    return false;
                }


                if (
                    municipality &&
                    String(
                        project.municipality ||
                        ""
                    )
                        .trim()
                        .toLowerCase() !==
                        municipality
                ) {

                    return false;
                }


                if (
                    status &&
                    String(
                        project.overallStatus ||
                        ""
                    )
                        .trim()
                        .toLowerCase() !==
                        status
                ) {

                    return false;
                }


                return true;
            }
        );


    /* =====================================================
       SORT
    ===================================================== */

    const sortBy =
        monitoringState.sortBy ||
        "projectTitle";


    const direction =
        monitoringState.sortDirection ===
        "desc"
            ? -1
            : 1;


    projects.sort(
        (a, b) => {

            let valueA =
                a?.[sortBy];


            let valueB =
                b?.[sortBy];


            if (
                valueA === null ||
                valueA === undefined
            ) {

                valueA = "";
            }


            if (
                valueB === null ||
                valueB === undefined
            ) {

                valueB = "";
            }


            if (
                typeof valueA ===
                    "number" &&
                typeof valueB ===
                    "number"
            ) {

                return (
                    valueA -
                    valueB
                ) * direction;
            }


            return String(
                valueA
            )
                .localeCompare(
                    String(
                        valueB
                    ),
                    undefined,
                    {
                        numeric: true,
                        sensitivity: "base"
                    }
                ) * direction;
        }
    );


    return projects;
}


/* =========================================================
   GET MONITORING MUNICIPALITIES
========================================================= */

function getMonitoringMunicipalities() {

    const municipalities =
        new Set();


    (
        Array.isArray(
            cachedMonitoringProjects
        )
            ? cachedMonitoringProjects
            : []
    ).forEach(
        project => {

            const municipality =
                String(
                    project?.municipality ||
                    ""
                ).trim();


            if (
                municipality
            ) {

                municipalities.add(
                    municipality
                );
            }
        }
    );


    return Array.from(
        municipalities
    ).sort(
        (a, b) =>
            a.localeCompare(
                b,
                undefined,
                {
                    sensitivity:
                        "base"
                }
            )
    );
}


/* =========================================================
   GET MONITORING CATEGORIES
========================================================= */

function getMonitoringCategories() {

    const categories =
        new Set();


    (
        Array.isArray(
            cachedMonitoringProjects
        )
            ? cachedMonitoringProjects
            : []
    ).forEach(
        project => {

            const category =
                String(
                    project?.category ||
                    ""
                ).trim();


            if (
                category
            ) {

                categories.add(
                    category
                );
            }
        }
    );


    return Array.from(
        categories
    ).sort(
        (a, b) =>
            a.localeCompare(
                b,
                undefined,
                {
                    sensitivity:
                        "base"
                }
            )
    );
}


/* =========================================================
   GET MONITORING STATUSES
========================================================= */

function getMonitoringStatuses() {

    const statuses =
        new Set();


    (
        Array.isArray(
            cachedMonitoringProjects
        )
            ? cachedMonitoringProjects
            : []
    ).forEach(
        project => {

            const status =
                String(
                    project?.overallStatus ||
                    ""
                ).trim();


            if (
                status
            ) {

                statuses.add(
                    status
                );
            }
        }
    );


    return Array.from(
        statuses
    ).sort(
        (a, b) =>
            a.localeCompare(
                b,
                undefined,
                {
                    sensitivity:
                        "base"
                }
            )
    );
}


/* =========================================================
   UPDATE MONITORING STATE
========================================================= */

function updateMonitoringState(
    changes = {}
) {

    monitoringState = {
        ...monitoringState,
        ...changes
    };


    /*
     * Any filter/sort change returns
     * the table to page 1.
     */
    if (
        Object.keys(
            changes
        ).some(
            key =>
                [
                    "search",
                    "category",
                    "municipality",
                    "status",
                    "sortBy",
                    "sortDirection"
                ].includes(
                    key
                )
        )
    ) {

        monitoringState.currentPage =
            1;
    }


    renderMonitoringProjects();
}


/* =========================================================
   CLEAR MONITORING FILTERS
========================================================= */

function clearMonitoringFilters() {

    monitoringState = {

        ...monitoringState,

        search: "",
        category: "",
        municipality: "",
        status: "",
        currentPage: 1
    };


    const searchInput =
        document.querySelector(
            "#monitoringSearch, " +
            "#projectMonitoringSearch, " +
            "[data-monitoring-search]"
        );


    if (
        searchInput
    ) {

        searchInput.value =
            "";
    }


    const categorySelect =
        document.querySelector(
            "#monitoringCategory, " +
            "#projectMonitoringCategory, " +
            "[data-monitoring-category]"
        );


    if (
        categorySelect
    ) {

        categorySelect.value =
            "";
    }


    const municipalitySelect =
        document.querySelector(
            "#monitoringMunicipality, " +
            "#projectMonitoringMunicipality, " +
            "[data-monitoring-municipality]"
        );


    if (
        municipalitySelect
    ) {

        municipalitySelect.value =
            "";
    }


    const statusSelect =
        document.querySelector(
            "#monitoringStatus, " +
            "#projectMonitoringStatus, " +
            "[data-monitoring-status]"
        );


    if (
        statusSelect
    ) {

        statusSelect.value =
            "";
    }


    renderMonitoringProjects();
}


/* =========================================================
   PAGINATION
========================================================= */

function getMonitoringPagination() {

    const projects =
        getFilteredMonitoringProjects();


    const pageSize =
        Math.max(
            1,
            Number(
                monitoringState.pageSize
            ) || 25
        );


    const total =
        projects.length;


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                total /
                pageSize
            )
        );


    let currentPage =
        Number(
            monitoringState.currentPage
        ) || 1;


    currentPage =
        Math.min(
            Math.max(
                currentPage,
                1
            ),
            totalPages
        );


    monitoringState.currentPage =
        currentPage;


    const start =
        (
            currentPage -
            1
        ) * pageSize;


    const end =
        Math.min(
            start +
            pageSize,
            total
        );


    return {

        projects,

        pageProjects:
            projects.slice(
                start,
                end
            ),

        total,

        pageSize,

        currentPage,

        totalPages,

        start,

        end
    };
}


/* =========================================================
   SET MONITORING PAGE
========================================================= */

function setMonitoringPage(
    page
) {

    const pagination =
        getMonitoringPagination();


    const requested =
        Number(
            page
        );


    if (
        !Number.isFinite(
            requested
        )
    ) {

        return;
    }


    monitoringState.currentPage =
        Math.min(
            Math.max(
                Math.floor(
                    requested
                ),
                1
            ),
            pagination.totalPages
        );


    renderMonitoringProjects();
}


/* =========================================================
   NEXT PAGE
========================================================= */

function nextMonitoringPage() {

    const pagination =
        getMonitoringPagination();


    if (
        pagination.currentPage <
        pagination.totalPages
    ) {

        monitoringState.currentPage =
            pagination.currentPage +
            1;


        renderMonitoringProjects();
    }
}


/* =========================================================
   PREVIOUS PAGE
========================================================= */

function previousMonitoringPage() {

    const pagination =
        getMonitoringPagination();


    if (
        pagination.currentPage >
        1
    ) {

        monitoringState.currentPage =
            pagination.currentPage -
            1;


        renderMonitoringProjects();
    }
}


/* =========================================================
   SORT MONITORING PROJECTS
========================================================= */

function sortMonitoringProjects(
    field
) {

    if (
        !field
    ) {

        return;
    }


    if (
        monitoringState.sortBy ===
        field
    ) {

        monitoringState.sortDirection =
            monitoringState.sortDirection ===
            "asc"
                ? "desc"
                : "asc";

    } else {

        monitoringState.sortBy =
            field;

        monitoringState.sortDirection =
            "asc";
    }


    monitoringState.currentPage =
        1;


    renderMonitoringProjects();
}


/* =========================================================
   MONITORING TABLE HEADER
========================================================= */

function monitoringSortIndicator(
    field
) {

    if (
        monitoringState.sortBy !==
        field
    ) {

        return "";
    }


    return monitoringState.sortDirection ===
        "asc"
        ? " ↑"
        : " ↓";
}


/* =========================================================
   RENDER MONITORING PROJECTS
========================================================= */

async function renderMonitoringProjects(
    suppliedProjects = null
) {

    const container =
        document.querySelector(
            "#monitoringProjects"
        ) ||
        document.querySelector(
            "#projectMonitoringTable"
        ) ||
        document.querySelector(
            "[data-monitoring-container]"
        );


    if (
        !container
    ) {

        return;
    }


    let projects;


    if (
        Array.isArray(
            suppliedProjects
        )
    ) {

        projects =
            suppliedProjects;

    } else {

        projects =
            getFilteredMonitoringProjects();
    }


    /*
     * Preserve the current page.
     */

    const pagination =
        getMonitoringPagination();


    const pageProjects =
        Array.isArray(
            suppliedProjects
        )
            ? projects
            : pagination.pageProjects;


    if (
        !pageProjects.length
    ) {

        container.innerHTML = `
            <div
                class="pds-empty-state"
                style="
                    padding:40px;
                    text-align:center;
                "
            >
                <strong>
                    No projects found.
                </strong>

                <div
                    style="
                        margin-top:6px;
                        opacity:.7;
                    "
                >
                    Try changing the search
                    or filter.
                </div>
            </div>
        `;

        return;
    }


    container.innerHTML = `
        <div
            class="pds-monitoring-table-wrap"
            style="
                width:100%;
                overflow-x:auto;
            "
        >

            <table
                class="pds-monitoring-table"
                style="
                    width:100%;
                    border-collapse:collapse;
                "
            >

                <thead>
                    <tr>

                        <th>
                            Project Title
                        </th>

                        <th>
                            Municipality
                        </th>

                        <th>
                            Program
                        </th>

                        <th>
                            Allocation
                        </th>

                        <th>
                            Program
                        </th>

                        <th>
                            Plan
                        </th>

                        <th>
                            Overall Status
                        </th>

                        <th>
                            Action
                        </th>

                    </tr>
                </thead>

                <tbody>

                    ${pageProjects
                        .map(
                            project =>
                                renderMonitoringProjectRow(
                                    project
                                )
                        )
                        .join("")}

                </tbody>

            </table>

        </div>

        ${renderMonitoringPagination(
            pagination
        )}
    `;


    bindMonitoringRowActions();
}
/* =========================================================
   RENDER MONITORING PROJECT ROW
========================================================= */

function renderMonitoringProjectRow(
    project
) {

    const projectId =
        project?.id ??
        "";


    const title =
        escapeHTML(
            project?.projectTitle ||
            project?.projectTitleGAA ||
            "Untitled Project"
        );


    const municipality =
        escapeHTML(
            project?.municipality ||
            ""
        );


    const program =
        escapeHTML(
            project?.program ||
            project?.program2 ||
            ""
        );


    const allocation =
        formatCurrency(
            project?.allocation
        );


    const programPercent =
        normalizePercentage(
            project?.programPercent
        );


    const planPercent =
        normalizePercentage(
            project?.planPercent
        );


    const status =
        project?.overallStatus ||
        "Not Started";


    return `
        <tr
            data-project-id="${escapeHTML(
                String(projectId)
            )}"
        >

            <td>
                <div
                    style="
                        font-weight:600;
                        line-height:1.35;
                    "
                >
                    ${title}
                </div>

                ${
                    project?.projectTitleGAA &&
                    project?.projectTitle !==
                    project?.projectTitleGAA
                        ? `
                            <div
                                style="
                                    margin-top:3px;
                                    font-size:11px;
                                    opacity:.65;
                                "
                            >
                                ${escapeHTML(
                                    project.projectTitleGAA
                                )}
                            </div>
                          `
                        : ""
                }
            </td>


            <td>
                ${municipality}
            </td>


            <td>
                ${program}
            </td>


            <td
                style="
                    text-align:right;
                    white-space:nowrap;
                "
            >
                ${allocation}
            </td>


            <td>
                ${createProgressBar(
                    programPercent
                )}
            </td>


            <td>
                ${createProgressBar(
                    planPercent
                )}
            </td>


            <td>
                ${createStatusBadge(
                    status
                )}
            </td>


            <td
                style="
                    white-space:nowrap;
                "
            >

                <button
                    type="button"
                    class="pds-monitoring-view-button"
                    data-action="view-monitoring-project"
                    data-project-id="${escapeHTML(
                        String(projectId)
                    )}"
                >
                    View
                </button>

                <button
                    type="button"
                    class="pds-monitoring-edit-button"
                    data-action="edit-monitoring-project"
                    data-project-id="${escapeHTML(
                        String(projectId)
                    )}"
                >
                    Edit
                </button>

            </td>

        </tr>
    `;
}


/* =========================================================
   BIND MONITORING ROW ACTIONS
========================================================= */

function bindMonitoringRowActions() {

    const buttons =
        document.querySelectorAll(
            "[data-action='view-monitoring-project'], " +
            "[data-action='edit-monitoring-project']"
        );


    buttons.forEach(
        button => {

            if (
                button.dataset.pdsBound ===
                "true"
            ) {

                return;
            }


            button.dataset.pdsBound =
                "true";


            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();
                    event.stopPropagation();


                    const projectId =
                        button.dataset.projectId;


                    if (
                        button.dataset.action ===
                        "edit-monitoring-project"
                    ) {

                        openMonitoringProjectEditor(
                            projectId
                        );

                        return;
                    }


                    openMonitoringProjectDetails(
                        projectId
                    );
                }
            );
        }
    );
}


/* =========================================================
   OPEN PROJECT DETAILS
========================================================= */

function openMonitoringProjectDetails(
    projectId
) {

    const project =
        findMonitoringProject(
            projectId
        );


    if (
        !project
    ) {

        showMessage(
            "Project could not be found.",
            "error"
        );

        return;
    }


    monitoringState.selectedProjectId =
        project.id;


    /*
     * Use the existing modal if the
     * HTML already provides one.
     */

    const modal =
        document.querySelector(
            "#monitoringProjectModal"
        ) ||
        document.querySelector(
            "#projectDetailsModal"
        );


    if (
        !modal
    ) {

        /*
         * Fall back to the site's
         * existing project page.
         */

        if (
            typeof openProjectDetails ===
            "function"
        ) {

            openProjectDetails(
                project.id
            );

            return;
        }


        showMessage(
            "Project details interface was not found.",
            "warning"
        );

        return;
    }


    const content =
        modal.querySelector(
            "[data-modal-content]"
        ) ||
        modal.querySelector(
            ".modal-content"
        ) ||
        modal;


    content.innerHTML = `
        <div
            class="pds-project-details"
        >

            <div
                style="
                    display:flex;
                    justify-content:space-between;
                    gap:16px;
                    align-items:flex-start;
                "
            >

                <div>

                    <div
                        style="
                            font-size:12px;
                            opacity:.65;
                            margin-bottom:6px;
                        "
                    >
                        PROJECT MONITORING
                    </div>

                    <h2
                        style="
                            margin:0;
                        "
                    >
                        ${escapeHTML(
                            project.projectTitle ||
                            project.projectTitleGAA ||
                            ""
                        )}
                    </h2>

                </div>

                <div>
                    ${createStatusBadge(
                        project.overallStatus
                    )}
                </div>

            </div>


            <div
                class="pds-project-details-grid"
                style="
                    display:grid;
                    grid-template-columns:
                        repeat(
                            auto-fit,
                            minmax(180px,1fr)
                        );
                    gap:14px;
                    margin-top:24px;
                "
            >

                ${renderProjectDetailItem(
                    "Municipality",
                    project.municipality
                )}

                ${renderProjectDetailItem(
                    "Program",
                    project.program
                )}

                ${renderProjectDetailItem(
                    "Category",
                    project.category
                )}

                ${renderProjectDetailItem(
                    "Contract ID",
                    project.contractId
                )}

                ${renderProjectDetailItem(
                    "Allocation",
                    formatCurrency(
                        project.allocation
                    )
                )}

                ${renderProjectDetailItem(
                    "Program Status",
                    project.programStatus
                )}

                ${renderProjectDetailItem(
                    "Plan Status",
                    project.planStatus
                )}

                ${renderProjectDetailItem(
                    "Last Updated",
                    project.lastUpdated
                )}

            </div>


            <div
                style="
                    margin-top:24px;
                "
            >

                <div
                    style="
                        font-size:13px;
                        font-weight:700;
                        margin-bottom:8px;
                    "
                >
                    Program Progress
                </div>

                ${createProgressBar(
                    project.programPercent
                )}

            </div>


            <div
                style="
                    margin-top:18px;
                "
            >

                <div
                    style="
                        font-size:13px;
                        font-weight:700;
                        margin-bottom:8px;
                    "
                >
                    Plan Progress
                </div>

                ${createProgressBar(
                    project.planPercent
                )}

            </div>


            <div
                style="
                    margin-top:24px;
                "
            >

                <div
                    style="
                        font-size:13px;
                        font-weight:700;
                        margin-bottom:8px;
                    "
                >
                    Remarks
                </div>

                <div
                    style="
                        padding:12px;
                        border-radius:8px;
                        background:#f5f7fa;
                        min-height:50px;
                    "
                >
                    ${escapeHTML(
                        project.remarks ||
                        "No remarks."
                    )}
                </div>

            </div>


            <div
                style="
                    margin-top:12px;
                "
            >

                <div
                    style="
                        font-size:13px;
                        font-weight:700;
                        margin-bottom:8px;
                    "
                >
                    Remarks 2
                </div>

                <div
                    style="
                        padding:12px;
                        border-radius:8px;
                        background:#f5f7fa;
                        min-height:50px;
                    "
                >
                    ${escapeHTML(
                        project.remarks2 ||
                        "No remarks."
                    )}
                </div>

            </div>

        </div>
    `;


    modal.classList.add(
        "active"
    );

    modal.classList.add(
        "show"
    );


    modal.removeAttribute(
        "hidden"
    );


    modal.style.display =
        "flex";
}


/* =========================================================
   PROJECT DETAIL ITEM
========================================================= */

function renderProjectDetailItem(
    label,
    value
) {

    return `
        <div
            style="
                padding:12px;
                border:1px solid #e4e8ee;
                border-radius:8px;
            "
        >

            <div
                style="
                    font-size:11px;
                    text-transform:uppercase;
                    letter-spacing:.04em;
                    opacity:.6;
                    margin-bottom:5px;
                "
            >
                ${escapeHTML(
                    label
                )}
            </div>

            <div
                style="
                    font-weight:600;
                "
            >
                ${escapeHTML(
                    value ??
                    ""
                )}
            </div>

        </div>
    `;
}


/* =========================================================
   CLOSE MONITORING MODAL
========================================================= */

function closeMonitoringProjectModal() {

    const modals =
        document.querySelectorAll(
            "#monitoringProjectModal, " +
            "#projectDetailsModal"
        );


    modals.forEach(
        modal => {

            modal.classList.remove(
                "active"
            );

            modal.classList.remove(
                "show"
            );

            modal.setAttribute(
                "hidden",
                ""
            );

            modal.style.display =
                "none";
        }
    );
}


/* =========================================================
   OPEN PROJECT EDITOR
========================================================= */

function openMonitoringProjectEditor(
    projectId
) {

    const project =
        findMonitoringProject(
            projectId
        );


    if (
        !project
    ) {

        showMessage(
            "Project could not be found.",
            "error"
        );

        return;
    }


    monitoringState.selectedProjectId =
        project.id;


    /*
     * If the existing application already
     * provides an editor, use it instead
     * of creating another interface.
     */

    if (
        typeof editProject ===
        "function"
    ) {

        editProject(
            project.id
        );

        return;
    }


    if (
        typeof openEditProjectModal ===
        "function"
    ) {

        openEditProjectModal(
            project.id
        );

        return;
    }


    /*
     * Otherwise use the monitoring editor.
     */

    const modal =
        document.querySelector(
            "#monitoringEditModal"
        );


    if (
        !modal
    ) {

        showMessage(
            "Project editor was not found.",
            "warning"
        );

        return;
    }


    const form =
        modal.querySelector(
            "form"
        );


    if (
        !form
    ) {

        showMessage(
            "Project edit form was not found.",
            "error"
        );

        return;
    }


    populateMonitoringEditForm(
        form,
        project
    );


    modal.classList.add(
        "active"
    );

    modal.classList.add(
        "show"
    );

    modal.removeAttribute(
        "hidden"
    );

    modal.style.display =
        "flex";
}


/* =========================================================
   POPULATE MONITORING EDIT FORM
========================================================= */

function populateMonitoringEditForm(
    form,
    project
) {

    const fieldMap = {

        programStatus:
            project.programStatus,

        programPercent:
            project.programPercent,

        planStatus:
            project.planStatus,

        planPercent:
            project.planPercent,

        overallStatus:
            project.overallStatus,

        lastUpdated:
            project.lastUpdated,

        remarks:
            project.remarks,

        remarks2:
            project.remarks2
    };


    Object.entries(
        fieldMap
    ).forEach(
        ([name, value]) => {

            const field =
                form.querySelector(
                    `[name="${name}"]`
                ) ||
                form.querySelector(
                    `#${name}`
                ) ||
                form.querySelector(
                    `[data-field="${name}"]`
                );


            if (
                field
            ) {

                field.value =
                    value ??
                    "";
            }
        }
    );


    form.dataset.projectId =
        String(
            project.id
        );
}


/* =========================================================
   SAVE MONITORING EDIT FORM
========================================================= */

async function submitMonitoringEditForm(
    form
) {

    const projectId =
        form.dataset.projectId;


    if (
        !projectId
    ) {

        throw new Error(
            "Project ID is missing."
        );
    }


    const changes = {};


    const fields = [
        "programStatus",
        "programPercent",
        "planStatus",
        "planPercent",
        "overallStatus",
        "lastUpdated",
        "remarks",
        "remarks2"
    ];


    fields.forEach(
        fieldName => {

            const field =
                form.querySelector(
                    `[name="${fieldName}"]`
                ) ||
                form.querySelector(
                    `#${fieldName}`
                ) ||
                form.querySelector(
                    `[data-field="${fieldName}"]`
                );


            if (
                !field
            ) {

                return;
            }


            let value =
                field.value;


            if (
                [
                    "programPercent",
                    "planPercent"
                ].includes(
                    fieldName
                )
            ) {

                value =
                    normalizePercentage(
                        value
                    );
            }


            changes[
                fieldName
            ] =
                value;
        }
    );


    const result =
        await saveMonitoringProject(
            projectId,
            changes
        );


    if (
        result?.success
    ) {

        closeMonitoringProjectEditor();

        await refreshAfterExcelSave();

        showMessage(
            "Changes saved to the OVERALL Excel sheet.",
            "success"
        );
    }


    return result;
}
/* =========================================================
   MONITORING FILTER CONTROLS
========================================================= */

function initializeMonitoringFilters() {

    const searchInputs =
        document.querySelectorAll(
            "#monitoringSearch, " +
            "#projectMonitoringSearch, " +
            "[data-monitoring-search]"
        );


    searchInputs.forEach(
        input => {

            if (
                input.dataset.pdsBound ===
                "true"
            ) {

                return;
            }


            input.dataset.pdsBound =
                "true";


            input.addEventListener(
                "input",
                event => {

                    updateMonitoringState({
                        search:
                            event.target.value
                    });
                }
            );
        }
    );


    const categoryInputs =
        document.querySelectorAll(
            "#monitoringCategory, " +
            "#projectMonitoringCategory, " +
            "[data-monitoring-category]"
        );


    categoryInputs.forEach(
        input => {

            if (
                input.dataset.pdsBound ===
                "true"
            ) {

                return;
            }


            input.dataset.pdsBound =
                "true";


            input.addEventListener(
                "change",
                event => {

                    updateMonitoringState({
                        category:
                            event.target.value
                    });
                }
            );
        }
    );


    const municipalityInputs =
        document.querySelectorAll(
            "#monitoringMunicipality, " +
            "#projectMonitoringMunicipality, " +
            "[data-monitoring-municipality]"
        );


    municipalityInputs.forEach(
        input => {

            if (
                input.dataset.pdsBound ===
                "true"
            ) {

                return;
            }


            input.dataset.pdsBound =
                "true";


            input.addEventListener(
                "change",
                event => {

                    updateMonitoringState({
                        municipality:
                            event.target.value
                    });
                }
            );
        }
    );


    const statusInputs =
        document.querySelectorAll(
            "#monitoringStatus, " +
            "#projectMonitoringStatus, " +
            "[data-monitoring-status]"
        );


    statusInputs.forEach(
        input => {

            if (
                input.dataset.pdsBound ===
                "true"
            ) {

                return;
            }


            input.dataset.pdsBound =
                "true";


            input.addEventListener(
                "change",
                event => {

                    updateMonitoringState({
                        status:
                            event.target.value
                    });
                }
            );
        }
    );


    const clearButtons =
        document.querySelectorAll(
            "#clearMonitoringFilters, " +
            "#clearProjectMonitoringFilters, " +
            "[data-action='clear-monitoring-filters']"
        );


    clearButtons.forEach(
        button => {

            if (
                button.dataset.pdsBound ===
                "true"
            ) {

                return;
            }


            button.dataset.pdsBound =
                "true";


            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    clearMonitoringFilters();
                }
            );
        }
    );
}


/* =========================================================
   POPULATE MONITORING FILTER OPTIONS
========================================================= */

function populateMonitoringFilters() {

    const categories =
        getMonitoringCategories();


    const municipalities =
        getMonitoringMunicipalities();


    const statuses =
        getMonitoringStatuses();


    const categorySelectors =
        document.querySelectorAll(
            "#monitoringCategory, " +
            "#projectMonitoringCategory, " +
            "[data-monitoring-category]"
        );


    categorySelectors.forEach(
        select => {

            const currentValue =
                select.value ||
                monitoringState.category;


            select.innerHTML = `
                <option value="">
                    All Categories
                </option>

                ${
                    categories
                        .map(
                            category => `
                                <option
                                    value="${escapeHTML(
                                        category
                                    )}"
                                >
                                    ${escapeHTML(
                                        category
                                    )}
                                </option>
                            `
                        )
                        .join("")
                }
            `;


            select.value =
                categories.includes(
                    currentValue
                )
                    ? currentValue
                    : "";
        }
    );


    const municipalitySelectors =
        document.querySelectorAll(
            "#monitoringMunicipality, " +
            "#projectMonitoringMunicipality, " +
            "[data-monitoring-municipality]"
        );


    municipalitySelectors.forEach(
        select => {

            const currentValue =
                select.value ||
                monitoringState.municipality;


            select.innerHTML = `
                <option value="">
                    All Municipalities
                </option>

                ${
                    municipalities
                        .map(
                            municipality => `
                                <option
                                    value="${escapeHTML(
                                        municipality
                                    )}"
                                >
                                    ${escapeHTML(
                                        municipality
                                    )}
                                </option>
                            `
                        )
                        .join("")
                }
            `;


            select.value =
                municipalities.includes(
                    currentValue
                )
                    ? currentValue
                    : "";
        }
    );


    const statusSelectors =
        document.querySelectorAll(
            "#monitoringStatus, " +
            "#projectMonitoringStatus, " +
            "[data-monitoring-status]"
        );


    statusSelectors.forEach(
        select => {

            const currentValue =
                select.value ||
                monitoringState.status;


            select.innerHTML = `
                <option value="">
                    All Statuses
                </option>

                ${
                    statuses
                        .map(
                            status => `
                                <option
                                    value="${escapeHTML(
                                        status
                                    )}"
                                >
                                    ${escapeHTML(
                                        status
                                    )}
                                </option>
                            `
                        )
                        .join("")
                }
            `;


            select.value =
                statuses.includes(
                    currentValue
                )
                    ? currentValue
                    : "";
        }
    );
}


/* =========================================================
   MONITORING PAGINATION HTML
========================================================= */

function renderMonitoringPagination(
    pagination
) {

    if (
        !pagination ||
        pagination.total <= 0
    ) {

        return "";
    }


    const {
        total,
        pageSize,
        currentPage,
        totalPages,
        start,
        end
    } =
        pagination;


    return `
        <div
            class="pds-monitoring-pagination"
            style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:12px;
                padding:14px 0;
                flex-wrap:wrap;
            "
        >

            <div
                style="
                    font-size:13px;
                    opacity:.7;
                "
            >
                Showing
                <strong>
                    ${start + 1}
                </strong>
                -
                <strong>
                    ${end}
                </strong>
                of
                <strong>
                    ${total}
                </strong>
            </div>


            <div
                style="
                    display:flex;
                    align-items:center;
                    gap:6px;
                "
            >

                <button
                    type="button"
                    class="pds-page-button"
                    data-monitoring-page="prev"
                    ${
                        currentPage <= 1
                            ? "disabled"
                            : ""
                    }
                >
                    Previous
                </button>


                <span
                    style="
                        padding:0 8px;
                        font-size:13px;
                    "
                >
                    Page
                    <strong>
                        ${currentPage}
                    </strong>
                    of
                    <strong>
                        ${totalPages}
                    </strong>
                </span>


                <button
                    type="button"
                    class="pds-page-button"
                    data-monitoring-page="next"
                    ${
                        currentPage >= totalPages
                            ? "disabled"
                            : ""
                    }
                >
                    Next
                </button>

            </div>

        </div>
    `;
}


/* =========================================================
   BIND PAGINATION
========================================================= */

function bindMonitoringPagination() {

    const buttons =
        document.querySelectorAll(
            "[data-monitoring-page]"
        );


    buttons.forEach(
        button => {

            if (
                button.dataset.pdsBound ===
                "true"
            ) {

                return;
            }


            button.dataset.pdsBound =
                "true";


            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();


                    const action =
                        button.dataset.monitoringPage;


                    if (
                        action ===
                        "prev"
                    ) {

                        previousMonitoringPage();

                        return;
                    }


                    if (
                        action ===
                        "next"
                    ) {

                        nextMonitoringPage();
                    }
                }
            );
        }
    );
}


/* =========================================================
   REFRESH MONITORING UI
========================================================= */

async function refreshMonitoringUI() {

    try {

        populateMonitoringFilters();

        initializeMonitoringFilters();

        await renderMonitoringProjects();

        bindMonitoringPagination();

    } catch (error) {

        console.error(
            "PDS: Monitoring UI refresh failed:",
            error
        );

        showMessage(
            error?.message ||
            "Unable to refresh project monitoring.",
            "error"
        );
    }
}


/* =========================================================
   MONITORING DATA EVENT
========================================================= */

document.addEventListener(
    "pds:data-updated",
    event => {

        const projects =
            event?.detail?.projects;


        if (
            Array.isArray(
                projects
            )
        ) {

            cachedMonitoringProjects =
                projects;
        }


        populateMonitoringFilters();

        renderMonitoringProjects();

        bindMonitoringPagination();
    }
);


/* =========================================================
   MONITORING LOADING STATE
========================================================= */

function showMonitoringLoadingState() {

    const containers =
        document.querySelectorAll(
            "#monitoringProjects, " +
            "#projectMonitoringTable, " +
            "[data-monitoring-container]"
        );


    containers.forEach(
        container => {

            container.innerHTML = `
                <div
                    class="pds-loading-state"
                    style="
                        padding:40px;
                        text-align:center;
                    "
                >

                    <div
                        style="
                            font-weight:600;
                        "
                    >
                        Loading project monitoring...
                    </div>

                    <div
                        style="
                            margin-top:6px;
                            font-size:13px;
                            opacity:.65;
                        "
                    >
                        Reading the OVERALL worksheet
                        from OneDrive Excel.
                    </div>

                </div>
            `;
        }
    );
}


/* =========================================================
   MONITORING ERROR STATE
========================================================= */

function showMonitoringErrorState(
    message
) {

    const containers =
        document.querySelectorAll(
            "#monitoringProjects, " +
            "#projectMonitoringTable, " +
            "[data-monitoring-container]"
        );


    containers.forEach(
        container => {

            container.innerHTML = `
                <div
                    class="pds-error-state"
                    style="
                        padding:40px;
                        text-align:center;
                    "
                >

                    <div
                        style="
                            font-weight:700;
                        "
                    >
                        Unable to load project monitoring
                    </div>

                    <div
                        style="
                            margin-top:8px;
                            font-size:13px;
                            opacity:.7;
                        "
                    >
                        ${escapeHTML(
                            message ||
                            "An unexpected error occurred."
                        )}
                    </div>

                    <button
                        type="button"
                        data-action="retry-monitoring"
                        style="
                            margin-top:16px;
                        "
                    >
                        Retry
                    </button>

                </div>
            `;
        }
    );


    bindMonitoringRetryButtons();
}


/* =========================================================
   RETRY MONITORING
========================================================= */

function bindMonitoringRetryButtons() {

    document
        .querySelectorAll(
            "[data-action='retry-monitoring']"
        )
        .forEach(
            button => {

                if (
                    button.dataset.pdsBound ===
                    "true"
                ) {

                    return;
                }


                button.dataset.pdsBound =
                    "true";


                button.addEventListener(
                    "click",
                    async event => {

                        event.preventDefault();

                        await refreshMonitoringFromOneDrive();
                    }
                );
            }
        );
}


/* =========================================================
   MONITORING PAGE OPEN
========================================================= */

async function openProjectMonitoringPage() {

    monitoringState.currentPage =
        1;


    populateMonitoringFilters();

    initializeMonitoringFilters();


    try {

        await refreshMonitoringFromOneDrive();

    } catch (
        error
    ) {

        console.error(
            "PDS: Unable to open Project Monitoring:",
            error
        );
    }


    await refreshMonitoringUI();
}


/* =========================================================
   MONITORING PAGE CLOSE
========================================================= */

function closeProjectMonitoringPage() {

    monitoringState.selectedProjectId =
        null;
}


/* =========================================================
   EXPOSE MONITORING CONTROLS
========================================================= */

window.getFilteredMonitoringProjects =
    getFilteredMonitoringProjects;

window.refreshMonitoringFromOneDrive =
    refreshMonitoringFromOneDrive;

window.refreshMonitoringUI =
    refreshMonitoringUI;

window.saveMonitoringProject =
    saveMonitoringProject;

window.openProjectMonitoringPage =
    openProjectMonitoringPage;

window.closeProjectMonitoringPage =
    closeProjectMonitoringPage;

window.clearMonitoringFilters =
    clearMonitoringFilters;

window.setMonitoringPage =
    setMonitoringPage;

window.nextMonitoringPage =
    nextMonitoringPage;

window.previousMonitoringPage =
    previousMonitoringPage;

window.sortMonitoringProjects =
    sortMonitoringProjects;
/* =========================================================
   CONTINUE MONITORING SUMMARY
========================================================= */

    if (elements.allocation) {

        elements.allocation.textContent =
            formatCurrency(
                totalAllocation
            );
    }


    if (elements.program) {

        elements.program.textContent =
            `${programAverage.toFixed(1)}%`;
    }


    if (elements.plan) {

        elements.plan.textContent =
            `${planAverage.toFixed(1)}%`;
    }
}


/* =========================================================
   EDIT MONITORING PROJECT
========================================================= */

async function editMonitoringProject(
    projectId
) {

    let project =
        findMonitoringProject(
            projectId
        );


    /*
     * If the local cache is empty,
     * load the latest Excel data first.
     */

    if (!project) {

        try {

            await loadProjectMonitoring(
                true
            );

            project =
                findMonitoringProject(
                    projectId
                );

        } catch (error) {

            console.error(
                "PDS: Unable to load project for editing:",
                error
            );

            showMessage(
                error?.message ||
                "Unable to load project.",
                "error"
            );

            return;
        }
    }


    if (!project) {

        showMessage(
            "Project was not found in the OVERALL worksheet.",
            "error"
        );

        return;
    }


    monitoringState.selectedProjectId =
        project.id;


    /*
     * Use the existing monitoring edit
     * modal from the application.
     */

    const modal =
        document.querySelector(
            "#monitoringEditModal"
        ) ||
        document.querySelector(
            "#projectMonitoringEditModal"
        );


    if (!modal) {

        /*
         * If the main application already has
         * an edit function, use it.
         */

        if (
            typeof openProjectEditModal ===
            "function"
        ) {

            openProjectEditModal(
                project
            );

            return;
        }


        if (
            typeof editProject ===
            "function"
        ) {

            editProject(
                project.id
            );

            return;
        }


        showMessage(
            "The project edit interface was not found.",
            "warning"
        );

        return;
    }


    const form =
        modal.querySelector(
            "form"
        );


    if (!form) {

        showMessage(
            "The project edit form was not found.",
            "error"
        );

        return;
    }


    /*
     * Store the Excel row information.
     * This is important because the save operation
     * must update the same row in OVERALL.
     */

    form.dataset.projectId =
        String(
            project.id
        );

    form.dataset.excelRowNumber =
        String(
            project.__excelRowNumber ||
            ""
        );


    populateMonitoringEditForm(
        form,
        project
    );


    modal.removeAttribute(
        "hidden"
    );

    modal.classList.add(
        "active"
    );

    modal.classList.add(
        "show"
    );

    modal.style.display =
        "flex";
}


/* =========================================================
   CLOSE MONITORING EDITOR
========================================================= */

function closeMonitoringProjectEditor() {

    const selectors = [
        "#monitoringEditModal",
        "#projectMonitoringEditModal"
    ];


    selectors.forEach(
        selector => {

            document
                .querySelectorAll(
                    selector
                )
                .forEach(
                    modal => {

                        modal.classList.remove(
                            "active"
                        );

                        modal.classList.remove(
                            "show"
                        );

                        modal.setAttribute(
                            "hidden",
                            ""
                        );

                        modal.style.display =
                            "none";
                    }
                );
        }
    );


    monitoringState.selectedProjectId =
        null;
}


/* =========================================================
   BIND MONITORING EDIT FORMS
========================================================= */

function initializeMonitoringEditForms() {

    const forms =
        document.querySelectorAll(
            "#monitoringEditModal form, " +
            "#projectMonitoringEditModal form, " +
            "form[data-monitoring-edit-form]"
        );


    forms.forEach(
        form => {

            if (
                form.dataset.pdsBound ===
                "true"
            ) {

                return;
            }


            form.dataset.pdsBound =
                "true";


            form.addEventListener(
                "submit",
                async event => {

                    event.preventDefault();
                    event.stopPropagation();


                    const submitButton =
                        form.querySelector(
                            "button[type='submit']"
                        );


                    const originalText =
                        submitButton
                            ?.textContent ||
                        "Save";


                    try {

                        if (
                            submitButton
                        ) {

                            submitButton.disabled =
                                true;

                            submitButton.textContent =
                                "Saving...";
                        }


                        await submitMonitoringEditForm(
                            form
                        );


                    } catch (error) {

                        console.error(
                            "PDS: Monitoring save failed:",
                            error
                        );

                        showMessage(
                            error?.message ||
                            "Unable to save changes.",
                            "error"
                        );

                    } finally {

                        if (
                            submitButton
                        ) {

                            submitButton.disabled =
                                false;

                            submitButton.textContent =
                                originalText;
                        }
                    }
                }
            );
        }
    );


    /*
     * Close buttons.
     */

    document
        .querySelectorAll(
            "#closeMonitoringEdit, " +
            "#closeMonitoringEditModal, " +
            "[data-action='close-monitoring-edit']"
        )
        .forEach(
            button => {

                if (
                    button.dataset.pdsBound ===
                    "true"
                ) {

                    return;
                }


                button.dataset.pdsBound =
                    "true";


                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        closeMonitoringProjectEditor();
                    }
                );
            }
        );
}


/* =========================================================
   CLOSE BUTTONS FOR DETAILS
========================================================= */

function initializeMonitoringModalControls() {

    document
        .querySelectorAll(
            "#closeMonitoringModal, " +
            "#closeProjectDetailsModal, " +
            "[data-action='close-monitoring-modal']"
        )
        .forEach(
            button => {

                if (
                    button.dataset.pdsBound ===
                    "true"
                ) {

                    return;
                }


                button.dataset.pdsBound =
                    "true";


                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        closeMonitoringProjectModal();
                    }
                );
            }
        );


    /*
     * Close when clicking outside the modal
     * content.
     */

    document
        .querySelectorAll(
            "#monitoringProjectModal, " +
            "#projectDetailsModal, " +
            "#monitoringEditModal, " +
            "#projectMonitoringEditModal"
        )
        .forEach(
            modal => {

                if (
                    modal.dataset.pdsOutsideBound ===
                    "true"
                ) {

                    return;
                }


                modal.dataset.pdsOutsideBound =
                    "true";


                modal.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target ===
                            modal
                        ) {

                            if (
                                modal.id ===
                                    "monitoringEditModal" ||
                                modal.id ===
                                    "projectMonitoringEditModal"
                            ) {

                                closeMonitoringProjectEditor();

                            } else {

                                closeMonitoringProjectModal();
                            }
                        }
                    }
                );
            }
        );


    /*
     * ESC closes the active monitoring modal.
     */

    if (
        window.__PDS_MONITORING_ESC_BOUND__
    ) {

        return;
    }


    window.__PDS_MONITORING_ESC_BOUND__ =
        true;


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !==
                "Escape"
            ) {

                return;
            }


            closeMonitoringProjectEditor();

            closeMonitoringProjectModal();
        }
    );
}


/* =========================================================
   MONITORING PAGE INITIALIZATION
========================================================= */

function initializeMonitoringInterface() {

    console.log(
        "PDS: Initializing monitoring interface..."
    );


    populateMonitoringFilters();

    initializeMonitoringFilters();

    initializeMonitoringEditForms();

    initializeMonitoringModalControls();


    /*
     * Do not automatically replace the
     * currently displayed page.
     *
     * Data is loaded only when the
     * Project Monitoring page is opened.
     */

    return true;
}


/* =========================================================
   MONITORING NAVIGATION HOOK
========================================================= */

function setupMonitoringNavigation() {

    const monitoringLinks =
        document.querySelectorAll(
            "[data-page='project-monitoring'], " +
            "[data-section='project-monitoring'], " +
            "#projectMonitoringLink, " +
            "#projectMonitoringNav"
        );


    monitoringLinks.forEach(
        link => {

            if (
                link.dataset.pdsMonitoringBound ===
                "true"
            ) {

                return;
            }


            link.dataset.pdsMonitoringBound =
                "true";


            link.addEventListener(
                "click",
                async event => {

                    /*
                     * Do not prevent the site's
                     * normal navigation unless
                     * the target is actually handled
                     * by the application.
                     */

                    try {

                        await openProjectMonitoringPage();

                    } catch (error) {

                        console.error(
                            "PDS: Monitoring navigation error:",
                            error
                        );
                    }
                }
            );
        }
    );
}


/* =========================================================
   REFRESH PROJECT MONITORING DATA
========================================================= */

async function refreshProjectMonitoringData() {

    try {

        showMonitoringLoadingState();


        const projects =
            await loadProjectMonitoring(
                true
            );


        cachedMonitoringProjects =
            Array.isArray(projects)
                ? projects
                : [];


        populateMonitoringFilters();


        const filtered =
            getFilteredMonitoringProjects();


        await renderMonitoringProjects(
            filtered
        );


        updateMonitoringSummary(
            filtered
        );


        return filtered;

    } catch (error) {

        console.error(
            "PDS: Project Monitoring refresh failed:",
            error
        );


        showMonitoringErrorState(
            error?.message ||
            "Unable to refresh project monitoring."
        );


        return [];
    }
}


/* =========================================================
   EXPOSE ADDITIONAL MONITORING FUNCTIONS
========================================================= */

window.initializeMonitoringInterface =
    initializeMonitoringInterface;

window.initializeMonitoringEditForms =
    initializeMonitoringEditForms;

window.initializeMonitoringModalControls =
    initializeMonitoringModalControls;

window.setupMonitoringNavigation =
    setupMonitoringNavigation;

window.refreshProjectMonitoringData =
    refreshProjectMonitoringData;

window.editMonitoringProject =
    editMonitoringProject;

window.closeMonitoringProjectEditor =
    closeMonitoringProjectEditor;
/* =========================================================
   SUBMIT MONITORING EDIT — CONTINUED
========================================================= */

    if (
        saveButton
    ) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            "Saving...";
    }


    try {

        /*
         * Save directly to the
         * corresponding row in
         * the OVERALL worksheet.
         */

        const result =
            await saveMonitoringProject(
                projectId,
                changes
            );


        if (
            !result?.success
        ) {

            throw new Error(
                "The Excel update was not completed."
            );
        }


        /*
         * Close the editor after
         * successful save.
         */

        closeMonitoringEditModal();


        /*
         * Reload from OneDrive so the
         * website displays the actual
         * Excel values after saving.
         */

        await loadProjectMonitoring(
            true
        );


        /*
         * Re-apply filters and refresh
         * the visible monitoring table.
         */

        const filtered =
            getFilteredMonitoringProjects();


        await renderMonitoringProjects(
            filtered
        );


        updateMonitoringSummary(
            filtered
        );


        showMessage(
            "Project monitoring was saved to the OVERALL Excel worksheet.",
            "success"
        );


        /*
         * Notify the rest of the
         * application that the source
         * data has changed.
         */

        document.dispatchEvent(
            new CustomEvent(
                "pds:data-updated",
                {
                    detail: {
                        projects:
                            cachedMonitoringProjects
                    }
                }
            )
        );


        return result;


    } catch (error) {

        console.error(
            "PDS: Save monitoring edit failed:",
            error
        );


        showMessage(
            error?.message ||
            "Unable to save the monitoring changes to OneDrive Excel.",
            "error"
        );


        return {
            success: false,
            error
        };


    } finally {

        if (
            saveButton
        ) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "Save to OneDrive";
        }
    }
}


/* =========================================================
   INITIALIZE MONITORING EDITOR
========================================================= */

function initializeMonitoringEditor() {

    /*
     * The editor modal is created only
     * when the user clicks Edit.
     *
     * This prevents unnecessary DOM
     * elements from being created on
     * initial page load.
     */

    console.log(
        "PDS: Monitoring editor ready."
    );


    /*
     * Keyboard support.
     */

    if (
        window.__PDS_MONITORING_EDITOR_KEYS__
    ) {

        return;
    }


    window.__PDS_MONITORING_EDITOR_KEYS__ =
        true;


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !==
                "Escape"
            ) {

                return;
            }


            const modal =
                $("monitoringEditModal");


            if (
                modal &&
                !modal.classList.contains(
                    "hidden"
                )
            ) {

                closeMonitoringEditModal();
            }
        }
    );
}


/* =========================================================
   OPEN PROJECT MONITORING
========================================================= */

async function openProjectMonitoring() {

    /*
     * Keep the current page/navigation
     * state intact.
     */

    if (
        typeof saveCurrentPageState ===
        "function"
    ) {

        try {

            saveCurrentPageState();

        } catch {
            /* Ignore legacy state errors. */
        }
    }


    monitoringState.currentPage =
        1;


    initializeMonitoringFilters();

    initializeMonitoringEditor();


    try {

        await loadProjectMonitoring(
            true
        );

    } catch (error) {

        console.error(
            "PDS: Project Monitoring load failed:",
            error
        );

        showMonitoringErrorState(
            error?.message ||
            "Unable to load the OVERALL worksheet."
        );

        return;
    }


    /*
     * Do not redirect the entire application.
     *
     * The navigation system remains
     * responsible for showing the page.
     */

    const monitoringPage =
        $("projectMonitoringPage") ||
        $("monitoringPage");


    if (
        monitoringPage
    ) {

        monitoringPage.classList.add(
            "active"
        );

        monitoringPage.classList.remove(
            "hidden"
        );

        monitoringPage.style.display =
            "";
    }
}


/* =========================================================
   INITIALIZE PROJECT MONITORING NAVIGATION
========================================================= */

function initializeProjectMonitoringNavigation() {

    const links =
        document.querySelectorAll(
            "[data-page='project-monitoring'], " +
            "[data-section='project-monitoring'], " +
            "#projectMonitoringNav, " +
            "#projectMonitoringLink"
        );


    links.forEach(
        link => {

            if (
                link.dataset.pdsMonitoringNavBound ===
                "true"
            ) {

                return;
            }


            link.dataset.pdsMonitoringNavBound =
                "true";


            link.addEventListener(
                "click",
                async () => {

                    try {

                        await openProjectMonitoring();

                    } catch (error) {

                        console.error(
                            "PDS: Monitoring navigation failed:",
                            error
                        );
                    }
                }
            );
        }
    );
}


/* =========================================================
   EXPORT MONITORING API
========================================================= */

window.openProjectMonitoring =
    openProjectMonitoring;

window.editMonitoringProject =
    editMonitoringProject;

window.submitMonitoringEdit =
    submitMonitoringEdit;

window.closeMonitoringEditModal =
    closeMonitoringEditModal;

window.createMonitoringEditModal =
    createMonitoringEditModal;

window.populateMonitoringEditModal =
    populateMonitoringEditModal;

window.initializeMonitoringEditor =
    initializeMonitoringEditor;

window.initializeProjectMonitoringNavigation =
    initializeProjectMonitoringNavigation;
/* =========================================================
   PAGE STATE — CONTINUED
========================================================= */

                }

                page.classList.add(
                    "hidden"
                );

                page.setAttribute(
                    "aria-hidden",
                    "true"
                );
            }
        }
    );


    /*
     * Update active navigation item.
     */

    document
        .querySelectorAll(
            "[data-page], [data-section]"
        )
        .forEach(
            nav => {

                const navPage =
                    normalizePageId(
                        getPageIdFromElement(
                            nav
                        )
                    );

                if (
                    navPage ===
                    normalized
                ) {

                    nav.classList.add(
                        "active"
                    );

                    nav.setAttribute(
                        "aria-current",
                        "page"
                    );

                } else {

                    nav.classList.remove(
                        "active"
                    );

                    nav.removeAttribute(
                        "aria-current"
                    );
                }
            }
        );


    pdsCurrentPage =
        normalized;


    /*
     * Save the page immediately.
     */

    try {

        localStorage.setItem(
            PDS_PAGE_STATE_KEY,
            normalized
        );

    } catch {
        /* Ignore storage errors. */
    }


    /*
     * Restore the previous scroll
     * position for this page.
     */

    if (
        restoreScroll
    ) {

        const savedScroll =
            Number(
                pdsScrollPositions[
                    normalized
                ] || 0
            );


        requestAnimationFrame(
            () => {

                window.scrollTo(
                    {
                        top:
                            savedScroll,
                        behavior:
                            "auto"
                    }
                );

            }
        );
    }


    /*
     * Optional browser history support.
     */

    if (
        updateHistory
    ) {

        try {

            history.replaceState(
                {
                    pdsPage:
                        normalized
                },
                "",
                `#${encodeURIComponent(
                    normalized
                )}`
            );

        } catch {
            /* Ignore history errors. */
        }
    }


    return true;
}


/* =========================================================
   INITIALIZE PAGE NAVIGATION
========================================================= */

function initializePDSPageNavigation() {

    if (
        window.__PDS_PAGE_NAVIGATION_READY__
    ) {

        return;
    }


    window.__PDS_PAGE_NAVIGATION_READY__ =
        true;


    /*
     * Load previously saved page.
     */

    loadSavedPageState();


    /*
     * Find all navigation links.
     */

    const navigationElements =
        document.querySelectorAll(
            "[data-page], " +
            "[data-section], " +
            "[data-target], " +
            "a[href^='#']"
        );


    navigationElements.forEach(
        element => {

            if (
                element.dataset.pdsPageNavBound ===
                "true"
            ) {

                return;
            }


            const pageId =
                getPageIdFromElement(
                    element
                );


            if (
                !pageId
            ) {

                return;
            }


            const normalized =
                normalizePageId(
                    pageId
                );


            if (
                !normalized
            ) {

                return;
            }


            element.dataset.pdsPageNavBound =
                "true";


            element.addEventListener(
                "click",
                event => {

                    /*
                     * Do not interfere with
                     * external links.
                     */

                    const href =
                        element.getAttribute(
                            "href"
                        );


                    if (
                        href &&
                        !href.startsWith("#")
                    ) {

                        return;
                    }


                    event.preventDefault();


                    showPDSPage(
                        normalized,
                        {
                            saveState:
                                true,
                            restoreScroll:
                                true,
                            updateHistory:
                                false
                        }
                    );
                }
            );
        }
    );


    /*
     * Restore the last page.
     */

    if (
        pdsCurrentPage
    ) {

        const restored =
            showPDSPage(
                pdsCurrentPage,
                {
                    saveState:
                        false,
                    restoreScroll:
                        true,
                    updateHistory:
                        false
                }
            );


        if (
            restored
        ) {

            console.log(
                "PDS: Restored page:",
                pdsCurrentPage
            );

        } else {

            console.warn(
                "PDS: Saved page could not be restored:",
                pdsCurrentPage
            );
        }
    }
}


/* =========================================================
   SAVE SCROLL POSITION
========================================================= */

function initializePDSScrollPersistence() {

    if (
        window.__PDS_SCROLL_PERSISTENCE_READY__
    ) {

        return;
    }


    window.__PDS_SCROLL_PERSISTENCE_READY__ =
        true;


    let scrollTimer =
        null;


    window.addEventListener(
        "scroll",
        () => {

            if (
                scrollTimer
            ) {

                clearTimeout(
                    scrollTimer
                );
            }


            scrollTimer =
                setTimeout(
                    () => {

                        if (
                            pdsCurrentPage
                        ) {

                            pdsScrollPositions[
                                pdsCurrentPage
                            ] =
                                window.scrollY ||
                                0;


                            try {

                                localStorage.setItem(
                                    PDS_SCROLL_STATE_KEY,
                                    JSON.stringify(
                                        pdsScrollPositions
                                    )
                                );

                            } catch {
                                /* Ignore storage errors. */
                            }
                        }

                    },
                    150
                );
        },
        {
            passive:
                true
        }
    );


    window.addEventListener(
        "beforeunload",
        () => {

            saveCurrentPageState();

        }
    );
}


/* =========================================================
   FINAL PDS PAGE INITIALIZATION
========================================================= */

function initializeFinalPDSPageState() {

    try {

        initializePDSPageNavigation();

        initializePDSScrollPersistence();

    } catch (error) {

        console.error(
            "PDS: Page state initialization failed:",
            error
        );
    }
}


/* =========================================================
   GLOBAL PAGE STATE API
========================================================= */

window.showPDSPage =
    showPDSPage;

window.saveCurrentPageState =
    saveCurrentPageState;

window.loadSavedPageState =
    loadSavedPageState;

window.initializePDSPageNavigation =
    initializePDSPageNavigation;

window.initializePDSScrollPersistence =
    initializePDSScrollPersistence;

window.initializeFinalPDSPageState =
    initializeFinalPDSPageState;


/* =========================================================
   FINAL DOM STARTUP
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            initializeFinalPDSPageState();

        },
        {
            once:
                true
        }
    );

} else {

    initializeFinalPDSPageState();
}
/* =========================================================
   PDS AUTHENTICATION STARTUP
========================================================= */

async function startPDSAuthentication() {

    console.log("PDS Auth: Starting authentication...");

    try {

        /*
         * WAIT FOR SUPABASE
         */
        const supabaseLoaded =
            await waitForSupabase();

        if (!supabaseLoaded) {

            console.error(
                "PDS Auth: Supabase library was not loaded."
            );

            showMessage(
                "Supabase could not be loaded. Please refresh the page.",
                "error"
            );

            return;
        }


        /*
         * INITIALIZE SUPABASE
         */
        const supabaseReady =
            initializeSupabase();

        if (!supabaseReady) {

            console.error(
                "PDS Auth: Supabase initialization failed."
            );

            showMessage(
                "Supabase authentication could not be initialized.",
                "error"
            );

            return;
        }


        console.log(
            "PDS Auth: Supabase initialized."
        );


        /*
         * START AUTH LISTENER
         */
        initializeAuthListener();


        /*
         * CONNECT SIGN-IN / SIGN-OUT FORMS
         */
        initializeAuthForms();


        /*
         * CHECK EXISTING SESSION
         */
        const session =
            await getCurrentSession();


        if (
            session &&
            session.user
        ) {

            currentUser =
                session.user;

            console.log(
                "PDS Auth: Existing session:",
                currentUser.email
            );


            await loadCurrentProfile(
                currentUser.id
            );


            updateAuthenticatedUI();

        } else {

            currentUser =
                null;

            currentProfile =
                null;

            console.log(
                "PDS Auth: No active session."
            );


            updateAuthenticatedUI();
        }


        console.log(
            "PDS Auth: Authentication startup complete."
        );

    } catch (error) {

        console.error(
            "PDS Auth: Startup error:",
            error
        );

        currentUser =
            null;

        currentProfile =
            null;

        updateAuthenticatedUI();

        showMessage(
            "Authentication could not be started. Please refresh the page.",
            "error"
        );
    }
}


/* =========================================================
   START AUTH AFTER HTML LOAD
========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        () => {
            startPDSAuthentication();
        },
        {
            once: true
        }
    );

} else {

    startPDSAuthentication();

}


/* =========================================================
   AUTH GLOBAL REFERENCES
========================================================= */

window.startPDSAuthentication =
    startPDSAuthentication;

window.signInUser =
    signInUser;

window.signOutUser =
    signOutUser;
/* =========================================================
   FINAL PDS AUTH STARTUP
========================================================= */

(function startPDSAuthSystem() {

    console.log("PDS AUTH: STARTING...");

    async function bootAuth() {

        try {

            /* WAIT FOR SUPABASE */
            const loaded =
                await waitForSupabase();

            if (!loaded) {
                console.error(
                    "PDS AUTH: Supabase library NOT loaded."
                );

                return;
            }


            /* CREATE SUPABASE CLIENT */
            const ready =
                initializeSupabase();

            if (!ready || !db) {

                console.error(
                    "PDS AUTH: Supabase client NOT initialized."
                );

                return;
            }


            console.log(
                "PDS AUTH: Supabase client ready."
            );


            /* AUTH STATE LISTENER */
            initializeAuthListener();


            /* SIGN IN / SIGN OUT BUTTONS */
            initializeAuthForms();


            /* CHECK CURRENT SESSION */
            const {
                data,
                error
            } =
                await db.auth.getSession();


            if (error) {

                console.error(
                    "PDS AUTH: Session error:",
                    error
                );

                currentUser = null;
                currentProfile = null;

                updateAuthenticatedUI();

                return;
            }


            currentUser =
                data?.session?.user || null;


            if (currentUser) {

                console.log(
                    "PDS AUTH: Session found:",
                    currentUser.email
                );


                await loadCurrentProfile(
                    currentUser.id
                );


            } else {

                console.log(
                    "PDS AUTH: No session."
                );

                currentProfile = null;

            }


            /* SHOW CORRECT SCREEN */
            updateAuthenticatedUI();


            console.log(
                "PDS AUTH: READY."
            );

        } catch (error) {

            console.error(
                "PDS AUTH: BOOT ERROR:",
                error
            );

            currentUser = null;
            currentProfile = null;

            try {
                updateAuthenticatedUI();
            } catch {}

        }

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            bootAuth,
            {
                once: true
            }
        );

    } else {

        bootAuth();

    }


    /* GLOBAL TEST FUNCTIONS */
    window.PDS_SIGN_IN =
        signInUser;

    window.PDS_SIGN_OUT =
        signOutUser;

})();
