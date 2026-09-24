/* =========================================================
   PDS — PLANNING & DESIGN SECTION
   CLEAN / FIXED SCRIPT
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

function toNumber(
    value,
    fallback = 0
) {

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

    const program =
        String(
            monitoringState.program ||
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

                if (
                    program &&
                    String(
                        project.program ||
                        ""
                    )
                        .trim()
                        .toLowerCase() !==
                    program
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
   GET MONITORING PROGRAMS
========================================================= */

function getMonitoringPrograms() {

    const programs =
        new Set();

    (
        Array.isArray(
            cachedMonitoringProjects
        )
            ? cachedMonitoringProjects
            : []
    ).forEach(
        project => {

            const program =
                String(
                    project?.program ||
                    ""
                ).trim();

            if (
                program
            ) {

                programs.add(
                    program
                );
            }
        }
    );

    return Array.from(
        programs
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
            "https://graph.microsoft.com/v1.0" +
            endpoint,
            {
                ...options,

                headers: {
                    Authorization:
                        `Bearer ${oneDriveAccessToken}`,

                    Accept:
                        "application/json",

                    ...(options.body
                        ? {
                            "Content-Type":
                                "application/json"
                        }
                        : {}),

                    ...(options.headers ||
                        {})
                }
            }
        );

    const text =
        await response.text();

    let data =
        null;

    if (text) {

        try {

            data =
                JSON.parse(text);

        } catch {

            data =
                text;
        }
    }

    if (
        !response.ok
    ) {

        const message =
            data?.error?.message ||
            data?.message ||
            text ||
            `Microsoft Graph request failed with status ${response.status}.`;

        throw new Error(
            message
        );
    }

    return data;
}


/* =========================================================
   FIND ONEDRIVE WORKBOOK
========================================================= */

async function findOneDriveWorkbook() {

    if (
        oneDriveWorkbookId
    ) {

        return oneDriveWorkbookId;
    }

    const response =
        await graphRequest(
            "/me/drive/root/search" +
            `?q=${encodeURIComponent(
                PDS_ONEDRIVE_CONFIG.workbookName
            )}`
        );

    const items =
        response?.value ||
        [];

    const workbook =
        items.find(
            item =>
                item.name?.toLowerCase() ===
                PDS_ONEDRIVE_CONFIG.workbookName.toLowerCase()
        ) ||
        items.find(
            item =>
                item.file &&
                item.name
                    ?.toLowerCase()
                    .endsWith(".xlsx")
        );

    if (!workbook) {

        throw new Error(
            `OneDrive workbook "${PDS_ONEDRIVE_CONFIG.workbookName}" was not found.`
        );
    }

    oneDriveWorkbookId =
        workbook.id;

    return oneDriveWorkbookId;
}


/* =========================================================
   GET WORKBOOK
========================================================= */

async function getOneDriveWorkbook() {

    const workbookId =
        await findOneDriveWorkbook();

    return workbookId;
}


/* =========================================================
   EXCEL GRAPH REQUEST
========================================================= */

async function excelRequest(
    endpoint,
    options = {}
) {

    const workbookId =
        await getOneDriveWorkbook();

    return graphRequest(
        `/me/drive/items/${encodeURIComponent(
            workbookId
        )}/workbook${endpoint}`,
        options
    );
}


/* =========================================================
   GET WORKSHEET
========================================================= */

async function getOneDriveWorksheet() {

    const worksheetName =
        PDS_ONEDRIVE_CONFIG.worksheetName;

    return excelRequest(
        `/worksheets('${encodeURIComponent(
            worksheetName
        )}')`
    );
}


/* =========================================================
   GET USED RANGE
========================================================= */

async function getOneDriveUsedRange() {

    const worksheetName =
        PDS_ONEDRIVE_CONFIG.worksheetName;

    return excelRequest(
        `/worksheets('${encodeURIComponent(
            worksheetName
        )}')/usedRange`
    );
}


/* =========================================================
   READ ONEDRIVE EXCEL DATA
========================================================= */

async function readOneDriveExcelData() {

    if (
        !isOneDriveConnected()
    ) {

        const connected =
            await initializeOneDrive();

        if (!connected) {

            throw new Error(
                "OneDrive is not connected."
            );
        }
    }

    const range =
        await getOneDriveUsedRange();

    const values =
        range?.values ||
        [];

    return values;
}


/* =========================================================
   CONVERT EXCEL ROWS TO OBJECTS
========================================================= */

function convertExcelRowsToObjects(
    values
) {

    if (
        !Array.isArray(values) ||
        values.length === 0
    ) {

        return [];
    }

    const headers =
        values[0].map(
            header =>
                String(
                    header ??
                    ""
                ).trim()
        );

    return values
        .slice(1)
        .map(
            row => {

                const object =
                    {};

                headers.forEach(
                    (
                        header,
                        index
                    ) => {

                        if (!header) {
                            return;
                        }

                        object[header] =
                            row[index] ??
                            "";
                    }
                );

                return object;
            }
        )
        .filter(
            row =>
                Object.values(
                    row
                ).some(
                    value =>
                        String(
                            value ??
                            ""
                        ).trim() !==
                        ""
                )
        );
}


/* =========================================================
   NORMALIZE PROJECT OBJECT
========================================================= */

function normalizeMonitoringProject(
    project,
    index = 0
) {

    const get =
        (...keys) => {

            for (
                const key of keys
            ) {

                if (
                    project &&
                    Object.prototype.hasOwnProperty.call(
                        project,
                        key
                    )
                ) {

                    const value =
                        project[key];

                    if (
                        value !==
                            null &&
                        value !==
                            undefined &&
                        String(value)
                            .trim() !==
                            ""
                    ) {

                        return value;
                    }
                }
            }

            return "";
        };


    const projectTitle =
        get(
            "PROJECT TITLE AS PER GAA",
            "PROJECT TITLE",
            "Project Title",
            "projectTitle",
            "Title"
        );

    const projectNumber =
        get(
            "PROJECT ID",
            "PROJECT NO.",
            "PROJECT NUMBER",
            "Project No.",
            "projectNumber"
        );

    const municipality =
        get(
            "MUNICIPALITY",
            "Municipality",
            "municipality"
        );

    const program =
        get(
            "PROGRAM2",
            "PROGRAM",
            "Program",
            "program"
        );

    const allocation =
        get(
            "ALLOCATION",
            "Allocation",
            "allocation"
        );

    const status =
        get(
            "STATUS",
            "Status",
            "status"
        );

    const remarks =
        get(
            "REMARKS",
            "Remarks",
            "remarks"
        );


    return {
        ...project,

        _index:
            index,

        projectTitle:
            String(
                projectTitle ||
                ""
            ).trim(),

        projectNumber:
            String(
                projectNumber ||
                ""
            ).trim(),

        municipality:
            String(
                municipality ||
                ""
            ).trim(),

        program:
            String(
                program ||
                ""
            ).trim(),

        allocation:
            allocation,

        status:
            String(
                status ||
                ""
            ).trim(),

        remarks:
            String(
                remarks ||
                ""
            ).trim()
    };
}


/* =========================================================
   LOAD MONITORING DATA FROM ONEDRIVE
========================================================= */

async function loadMonitoringDataFromOneDrive(
    forceRefresh = false
) {

    if (
        monitoringDataLoaded &&
        !forceRefresh &&
        Array.isArray(
            monitoringProjects
        )
    ) {

        return monitoringProjects;
    }

    if (
        monitoringDataLoadingPromise
    ) {

        return monitoringDataLoadingPromise;
    }

    monitoringDataLoadingPromise =
        (async () => {

            try {

                if (
                    !isOneDriveConnected()
                ) {

                    const connected =
                        await initializeOneDrive();

                    if (!connected) {

                        console.warn(
                            "PDS Monitoring: OneDrive is not connected."
                        );

                        monitoringProjects =
                            [];

                        monitoringDataLoaded =
                            false;

                        return [];
                    }
                }

                const values =
                    await readOneDriveExcelData();

                const rows =
                    convertExcelRowsToObjects(
                        values
                    );

                monitoringProjects =
                    rows.map(
                        (
                            row,
                            index
                        ) =>
                            normalizeMonitoringProject(
                                row,
                                index
                            )
                    );

                monitoringDataLoaded =
                    true;

                console.log(
                    "PDS Monitoring: Loaded",
                    monitoringProjects.length,
                    "projects from OneDrive Excel."
                );

                return monitoringProjects;

            } catch (error) {

                console.error(
                    "PDS Monitoring: Failed to load OneDrive Excel data:",
                    error
                );

                monitoringProjects =
                    [];

                monitoringDataLoaded =
                    false;

                throw error;

            } finally {

                monitoringDataLoadingPromise =
                    null;
            }

        })();

    return monitoringDataLoadingPromise;
}


/* =========================================================
   PROJECT MONITORING INITIALIZATION
========================================================= */

async function initializeProjectMonitoring() {

    if (
        projectMonitoringInitialized
    ) {

        return;
    }

    projectMonitoringInitialized =
        true;

    console.log(
        "PDS Monitoring: Initializing..."
    );

    try {

        setupMonitoringControls();

        await loadMonitoringDataFromOneDrive();

        renderProjectMonitoring();

    } catch (error) {

        console.error(
            "PDS Monitoring: Initialization failed:",
            error
        );

        renderProjectMonitoringError(
            error
        );
    }
}


/* =========================================================
   MONITORING FILTER CONTROLS
========================================================= */

function setupMonitoringControls() {

    const searchInput =
        document.querySelector(
            [
                "#projectSearch",
                "#monitoringSearch",
                "#projectMonitoringSearch",
                "[data-monitoring-search]"
            ].join(",")
        );

    const categorySelect =
        document.querySelector(
            [
                "#monitoringCategory",
                "#projectCategory",
                "[data-monitoring-category]"
            ].join(",")
        );

    const municipalitySelect =
        document.querySelector(
            [
                "#monitoringMunicipality",
                "#projectMunicipality",
                "[data-monitoring-municipality]"
            ].join(",")
        );

    const statusSelect =
        document.querySelector(
            [
                "#monitoringStatus",
                "#projectStatus",
                "[data-monitoring-status]"
            ].join(",")
        );

    const programSelect =
        document.querySelector(
            [
                "#monitoringProgram",
                "#projectProgram",
                "[data-monitoring-program]"
            ].join(",")
        );


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            event => {

                monitoringState.search =
                    event.target.value
                        .trim()
                        .toLowerCase();

                monitoringState.currentPage =
                    1;

                renderProjectMonitoring();
            }
        );
    }


    if (categorySelect) {

        categorySelect.addEventListener(
            "change",
            event => {

                monitoringState.category =
                    event.target.value;

                monitoringState.currentPage =
                    1;

                renderProjectMonitoring();
            }
        );
    }


    if (municipalitySelect) {

        municipalitySelect.addEventListener(
            "change",
            event => {

                monitoringState.municipality =
                    event.target.value;

                monitoringState.currentPage =
                    1;

                renderProjectMonitoring();
            }
        );
    }


    if (statusSelect) {

        statusSelect.addEventListener(
            "change",
            event => {

                monitoringState.status =
                    event.target.value;

                monitoringState.currentPage =
                    1;

                renderProjectMonitoring();
            }
        );
    }


    if (programSelect) {

        programSelect.addEventListener(
            "change",
            event => {

                monitoringState.program =
                    event.target.value;

                monitoringState.currentPage =
                    1;

                renderProjectMonitoring();
            }
        );
    }


    setupMonitoringSortControls();

    setupMonitoringPaginationControls();
}


/* =========================================================
   MONITORING SORT CONTROLS
========================================================= */

function setupMonitoringSortControls() {

    const sortableHeaders =
        document.querySelectorAll(
            "[data-monitoring-sort]"
        );

    sortableHeaders.forEach(
        header => {

            if (
                header.dataset.sortBound ===
                "true"
            ) {

                return;
            }

            header.dataset.sortBound =
                "true";

            header.addEventListener(
                "click",
                () => {

                    const sortBy =
                        header.dataset.monitoringSort;

                    if (!sortBy) {
                        return;
                    }

                    if (
                        monitoringState.sortBy ===
                        sortBy
                    ) {

                        monitoringState.sortDirection =
                            monitoringState.sortDirection ===
                            "asc"
                                ? "desc"
                                : "asc";

                    } else {

                        monitoringState.sortBy =
                            sortBy;

                        monitoringState.sortDirection =
                            "asc";
                    }

                    monitoringState.currentPage =
                        1;

                    renderProjectMonitoring();
                }
            );
        }
    );
}


/* =========================================================
   MONITORING PAGINATION CONTROLS
========================================================= */

function setupMonitoringPaginationControls() {

    const previousButton =
        document.querySelector(
            [
                "#monitoringPrevious",
                "#projectPrevious",
                "[data-monitoring-prev]"
            ].join(",")
        );

    const nextButton =
        document.querySelector(
            [
                "#monitoringNext",
                "#projectNext",
                "[data-monitoring-next]"
            ].join(",")
        );

    const pageSizeSelect =
        document.querySelector(
            [
                "#monitoringPageSize",
                "#projectPageSize",
                "[data-monitoring-page-size]"
            ].join(",")
        );


    if (previousButton) {

        previousButton.addEventListener(
            "click",
            () => {

                if (
                    monitoringState.currentPage >
                    1
                ) {

                    monitoringState.currentPage--;

                    renderProjectMonitoring();
                }
            }
        );
    }


    if (nextButton) {

        nextButton.addEventListener(
            "click",
            () => {

                const filtered =
                    getFilteredMonitoringProjects();

                const totalPages =
                    Math.max(
                        1,
                        Math.ceil(
                            filtered.length /
                            monitoringState.pageSize
                        )
                    );

                if (
                    monitoringState.currentPage <
                    totalPages
                ) {

                    monitoringState.currentPage++;

                    renderProjectMonitoring();
                }
            }
        );
    }


    if (pageSizeSelect) {

        pageSizeSelect.addEventListener(
            "change",
            event => {

                const size =
                    Number(
                        event.target.value
                    );

                if (
                    Number.isFinite(size) &&
                    size > 0
                ) {

                    monitoringState.pageSize =
                        size;

                    monitoringState.currentPage =
                        1;

                    renderProjectMonitoring();
                }
            }
        );
    }
}


/* =========================================================
   MONITORING FILTER OPTIONS
========================================================= */

function populateMonitoringFilterOptions() {

    const projects =
        Array.isArray(
            monitoringProjects
        )
            ? monitoringProjects
            : [];


    const uniqueValues =
        key =>
            [
                ...new Set(
                    projects
                        .map(
                            project =>
                                String(
                                    project?.[key] ??
                                    ""
                                ).trim()
                        )
                        .filter(Boolean)
                )
            ].sort(
                (a, b) =>
                    a.localeCompare(
                        b
                    )
            );


    const categoryValues =
        uniqueValues(
            "category"
        );

    const municipalityValues =
        uniqueValues(
            "municipality"
        );

    const statusValues =
        uniqueValues(
            "status"
        );

    const programValues =
        uniqueValues(
            "program"
        );


    populateSelectOptions(
        [
            "#monitoringCategory",
            "#projectCategory",
            "[data-monitoring-category]"
        ],
        categoryValues,
        "All Categories"
    );


    populateSelectOptions(
        [
            "#monitoringMunicipality",
            "#projectMunicipality",
            "[data-monitoring-municipality]"
        ],
        municipalityValues,
        "All Municipalities"
    );


    populateSelectOptions(
        [
            "#monitoringStatus",
            "#projectStatus",
            "[data-monitoring-status]"
        ],
        statusValues,
        "All Statuses"
    );


    populateSelectOptions(
        [
            "#monitoringProgram",
            "#projectProgram",
            "[data-monitoring-program]"
        ],
        programValues,
        "All Programs"
    );
}


/* =========================================================
   POPULATE SELECT
========================================================= */

function populateSelectOptions(
    selectors,
    values,
    defaultLabel
) {

    let select =
        null;

    for (
        const selector of selectors
    ) {

        select =
            document.querySelector(
                selector
            );

        if (select) {
            break;
        }
    }

    if (!select) {
        return;
    }

    const currentValue =
        select.value;

    select.innerHTML =
        "";

    const defaultOption =
        document.createElement(
            "option"
        );

    defaultOption.value =
        "";

    defaultOption.textContent =
        defaultLabel;

    select.appendChild(
        defaultOption
    );


    values.forEach(
        value => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                value;

            option.textContent =
                value;

            select.appendChild(
                option
            );
        }
    );


    if (
        values.includes(
            currentValue
        )
    ) {

        select.value =
            currentValue;

    } else {

        select.value =
            "";
    }
}


/* =========================================================
   FILTER MONITORING PROJECTS
========================================================= */

function getFilteredMonitoringProjects() {

    const search =
        monitoringState.search
            .trim()
            .toLowerCase();

    const category =
        monitoringState.category
            .trim()
            .toLowerCase();

    const municipality =
        monitoringState.municipality
            .trim()
            .toLowerCase();

    const status =
        monitoringState.status
            .trim()
            .toLowerCase();

    const program =
        monitoringState.program
            .trim()
            .toLowerCase();


    return (
        Array.isArray(
            monitoringProjects
        )
            ? monitoringProjects
            : []
    ).filter(
        project => {

            if (
                search
            ) {

                const searchableText =
                    [
                        project.projectTitle,
                        project.projectNumber,
                        project.municipality,
                        project.program,
                        project.status,
                        project.remarks,
                        project.category
                    ]
                        .map(
                            value =>
                                String(
                                    value ??
                                    ""
                                )
                        )
                        .join(" ")
                        .toLowerCase();

                if (
                    !searchableText.includes(
                        search
                    )
                ) {

                    return false;
                }
            }


            if (
                category &&
                String(
                    project.category ??
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
                    project.municipality ??
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
                    project.status ??
                    ""
                )
                    .trim()
                    .toLowerCase() !==
                    status
            ) {

                return false;
            }


            if (
                program &&
                String(
                    project.program ??
                    ""
                )
                    .trim()
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
   SORT MONITORING PROJECTS
========================================================= */

function sortMonitoringProjects(
    projects
) {

    const sortBy =
        monitoringState.sortBy;

    const direction =
        monitoringState.sortDirection ===
        "desc"
            ? -1
            : 1;


    return [
        ...projects
    ].sort(
        (
            a,
            b
        ) => {

            let valueA =
                a?.[sortBy];

            let valueB =
                b?.[sortBy];


            if (
                valueA ===
                null ||
                valueA ===
                undefined
            ) {

                valueA =
                    "";
            }

            if (
                valueB ===
                null ||
                valueB ===
                undefined
            ) {

                valueB =
                    "";
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
                ) *
                direction;
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
                        numeric:
                            true,
                        sensitivity:
                            "base"
                    }
                ) *
                direction;
        }
    );
}


/* =========================================================
   PAGINATE MONITORING PROJECTS
========================================================= */

function paginateMonitoringProjects(
    projects
) {

    const pageSize =
        Math.max(
            1,
            Number(
                monitoringState.pageSize
            ) || 25
        );

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                projects.length /
                pageSize
            )
        );


    if (
        monitoringState.currentPage >
        totalPages
    ) {

        monitoringState.currentPage =
            totalPages;
    }


    const currentPage =
        Math.max(
            1,
            monitoringState.currentPage
        );

    const start =
        (
            currentPage -
            1
        ) *
        pageSize;


    return {
        rows:
            projects.slice(
                start,
                start +
                pageSize
            ),

        currentPage,

        pageSize,

        totalPages,

        totalRows:
            projects.length
    };
}


/* =========================================================
   RENDER PROJECT MONITORING
========================================================= */

function renderProjectMonitoring() {

    const container =
        document.querySelector(
            [
                "#projectMonitoringTable",
                "#monitoringTable",
                "[data-monitoring-table]"
            ].join(",")
        );

    if (!container) {

        return;
    }


    populateMonitoringFilterOptions();


    const filtered =
        getFilteredMonitoringProjects();

    const sorted =
        sortMonitoringProjects(
            filtered
        );

    const page =
        paginateMonitoringProjects(
            sorted
        );


    renderMonitoringTableRows(
        container,
        page.rows
    );

    updateMonitoringPaginationUI(
        page
    );

    updateMonitoringSummaryUI(
        page,
        filtered
    );
}


/* =========================================================
   RENDER MONITORING TABLE ROWS
========================================================= */

function renderMonitoringTableRows(
    container,
    rows
) {

    const tbody =
        container.tagName?.toLowerCase() ===
        "tbody"
            ? container
            : container.querySelector(
                "tbody"
            );


    if (!tbody) {

        return;
    }


    tbody.innerHTML =
        "";


    if (
        !rows.length
    ) {

        const tr =
            document.createElement(
                "tr"
            );

        const td =
            document.createElement(
                "td"
            );

        td.colSpan =
            20;

        td.className =
            "monitoring-empty";

        td.textContent =
            "No project records found.";

        tr.appendChild(
            td
        );

        tbody.appendChild(
            tr
        );

        return;
    }


    rows.forEach(
        (
            project,
            index
        ) => {

            const tr =
                document.createElement(
                    "tr"
                );

            tr.dataset.projectId =
                getMonitoringProjectId(
                    project,
                    index
                );


            const cells = [
                project.projectNumber,
                project.projectTitle,
                project.municipality,
                project.program,
                project.allocation,
                project.status,
                project.remarks
            ];


            cells.forEach(
                (
                    value,
                    cellIndex
                ) => {

                    const td =
                        document.createElement(
                            "td"
                        );

                    td.textContent =
                        formatMonitoringCellValue(
                            value,
                            cellIndex
                        );

                    tr.appendChild(
                        td
                    );
                }
            );


            const actionTd =
                document.createElement(
                    "td"
                );

            actionTd.className =
                "monitoring-actions";


            const viewButton =
                document.createElement(
                    "button"
                );

            viewButton.type =
                "button";

            viewButton.className =
                "monitoring-action-btn view";

            viewButton.textContent =
                "View";

            viewButton.addEventListener(
                "click",
                () => {

                    viewMonitoringProject(
                        getMonitoringProjectId(
                            project,
                            index
                        )
                    );
                }
            );


            actionTd.appendChild(
                viewButton
            );


            if (
                canEditMonitoringProject(
                    project
                )
            ) {

                const editButton =
                    document.createElement(
                        "button"
                    );

                editButton.type =
                    "button";

                editButton.className =
                    "monitoring-action-btn edit";

                editButton.textContent =
                    "Edit";

                editButton.addEventListener(
                    "click",
                    () => {

                        editMonitoringProject(
                            getMonitoringProjectId(
                                project,
                                index
                            )
                        );
                    }
                );

                actionTd.appendChild(
                    editButton
                );
            }


            tr.appendChild(
                actionTd
            );

            tbody.appendChild(
                tr
            );
        }
    );
}


/* =========================================================
   MONITORING PROJECT ID
========================================================= */

function getMonitoringProjectId(
    project,
    index = 0
) {

    return String(
        project?.id ||
        project?.projectId ||
        project?.projectNumber ||
        project?.["PROJECT ID"] ||
        `monitoring-${project?._index ?? index}`
    );
}


/* =========================================================
   FORMAT MONITORING CELL
========================================================= */

function formatMonitoringCellValue(
    value,
    index
) {

    if (
        value ===
        null ||
        value ===
        undefined ||
        value ===
        ""
    ) {

        return "—";
    }


    if (
        index ===
        4
    ) {

        return formatMonitoringCurrency(
            value
        );
    }


    return String(
        value
    );
}


/* =========================================================
   FORMAT CURRENCY
========================================================= */

function formatMonitoringCurrency(
    value
) {

    if (
        value ===
        null ||
        value ===
        undefined ||
        value ===
        ""
    ) {

        return "—";
    }


    const numeric =
        Number(
            String(
                value
            )
                .replace(
                    /[₱,\s]/g,
                    ""
                )
        );


    if (
        Number.isFinite(
            numeric
        )
    ) {

        return new Intl.NumberFormat(
            "en-PH",
            {
                style:
                    "currency",

                currency:
                    "PHP",

                minimumFractionDigits:
                    2
            }
        ).format(
            numeric
        );
    }


    return String(
        value
    );
}


/* =========================================================
   MONITORING PAGINATION UI
========================================================= */

function updateMonitoringPaginationUI(
    page
) {

    const previousButton =
        document.querySelector(
            [
                "#monitoringPrevious",
                "#projectPrevious",
                "[data-monitoring-prev]"
            ].join(",")
        );

    const nextButton =
        document.querySelector(
            [
                "#monitoringNext",
                "#projectNext",
                "[data-monitoring-next]"
            ].join(",")
        );

    const pageIndicator =
        document.querySelector(
            [
                "#monitoringPageIndicator",
                "#projectPageIndicator",
                "[data-monitoring-page]"
            ].join(",")
        );


    if (previousButton) {

        previousButton.disabled =
            page.currentPage <=
            1;
    }


    if (nextButton) {

        nextButton.disabled =
            page.currentPage >=
            page.totalPages;
    }


    if (pageIndicator) {

        pageIndicator.textContent =
            `Page ${page.currentPage} of ${page.totalPages}`;
    }
}


/* =========================================================
   MONITORING SUMMARY UI
========================================================= */

function updateMonitoringSummaryUI(
    page,
    filtered
) {

    const totalElement =
        document.querySelector(
            [
                "#monitoringTotal",
                "#projectMonitoringTotal",
                "[data-monitoring-total]"
            ].join(",")
        );

    const shownElement =
        document.querySelector(
            [
                "#monitoringShown",
                "#projectMonitoringShown",
                "[data-monitoring-shown]"
            ].join(",")
        );


    if (totalElement) {

        totalElement.textContent =
            String(
                filtered.length
            );
    }


    if (shownElement) {

        shownElement.textContent =
            String(
                page.rows.length
            );
    }
}


/* =========================================================
   MONITORING ERROR
========================================================= */

function renderProjectMonitoringError(
    error
) {

    const container =
        document.querySelector(
            [
                "#projectMonitoringTable",
                "#monitoringTable",
                "[data-monitoring-table]"
            ].join(",")
        );

    if (!container) {
        return;
    }


    const tbody =
        container.tagName?.toLowerCase() ===
        "tbody"
            ? container
            : container.querySelector(
                "tbody"
            );


    if (!tbody) {
        return;
    }


    tbody.innerHTML =
        "";


    const tr =
        document.createElement(
            "tr"
        );

    const td =
        document.createElement(
            "td"
        );

    td.colSpan =
        20;

    td.className =
        "monitoring-error";

    td.textContent =
        error?.message ||
        "Unable to load project monitoring data.";

    tr.appendChild(
        td
    );

    tbody.appendChild(
        tr
    );
}


/* =========================================================
   CHECK MONITORING EDIT PERMISSION
========================================================= */

function canEditMonitoringProject(
    project
) {

    if (!currentUser) {

        return false;
    }


    if (
        currentProfile?.role ===
            "admin" ||
        currentProfile?.role ===
            "administrator"
    ) {

        return true;
    }


    const assignedTo =
        String(
            project?.assignedTo ||
            project?.assigned_to ||
            project?.["ASSIGNED TO"] ||
            ""
        )
            .trim()
            .toLowerCase();


    const userEmail =
        String(
            currentUser.email ||
            ""
        )
            .trim()
            .toLowerCase();


    if (
        assignedTo &&
        userEmail &&
        assignedTo ===
        userEmail
    ) {

        return true;
    }


    const assignedUserId =
        String(
            project?.assignedUserId ||
            project?.assigned_user_id ||
            project?.["ASSIGNED USER ID"] ||
            ""
        ).trim();


    if (
        assignedUserId &&
        assignedUserId ===
        currentUser.id
    ) {

        return true;
    }


    return false;
}


/* =========================================================
   VIEW MONITORING PROJECT
========================================================= */

function viewMonitoringProject(
    projectId
) {

    const project =
        findMonitoringProjectById(
            projectId
        );

    if (!project) {

        showPDSNotification(
            "Project record not found.",
            "error"
        );

        return;
    }


    monitoringState.selectedProjectId =
        projectId;


    const modal =
        document.querySelector(
            [
                "#monitoringViewModal",
                "#projectViewModal",
                "[data-monitoring-view-modal]"
            ].join(",")
        );


    if (!modal) {

        console.log(
            "PDS Monitoring Project:",
            project
        );

        return;
    }


    populateMonitoringViewModal(
        modal,
        project
    );


    modal.classList.add(
        "active",
        "show",
        "open"
    );

    modal.removeAttribute(
        "hidden"
    );
}


/* =========================================================
   FIND MONITORING PROJECT
========================================================= */

function findMonitoringProjectById(
    projectId
) {

    return (
        Array.isArray(
            monitoringProjects
        )
            ? monitoringProjects
            : []
    ).find(
        (
            project,
            index
        ) =>
            getMonitoringProjectId(
                project,
                index
            ) ===
            String(
                projectId
            )
    );
}


/* =========================================================
   POPULATE MONITORING VIEW MODAL
========================================================= */

function populateMonitoringViewModal(
    modal,
    project
) {

    const mappings = {
        projectTitle:
            project.projectTitle,

        projectNumber:
            project.projectNumber,

        municipality:
            project.municipality,

        program:
            project.program,

        allocation:
            formatMonitoringCurrency(
                project.allocation
            ),

        status:
            project.status,

        remarks:
            project.remarks
    };


    Object.entries(
        mappings
    ).forEach(
        (
            [
                key,
                value
            ]
        ) => {

            const element =
                modal.querySelector(
                    `[data-monitoring-field="${key}"]`
                );

            if (element) {

                element.textContent =
                    value ||
                    "—";
            }
        }
    );
}


/* =========================================================
   CLOSE MONITORING MODAL
========================================================= */

function closeMonitoringModal() {

    const modals =
        document.querySelectorAll(
            [
                "#monitoringViewModal",
                "#projectViewModal",
                "#monitoringEditModal",
                "#projectEditModal",
                "[data-monitoring-modal]"
            ].join(",")
        );


    modals.forEach(
        modal => {

            modal.classList.remove(
                "active",
                "show",
                "open"
            );

            modal.setAttribute(
                "hidden",
                ""
            );
        }
    );


    monitoringState.selectedProjectId =
        null;
}


/* =========================================================
   MONITORING EDIT
========================================================= */

async function editMonitoringProject(
    projectId
) {

    const project =
        findMonitoringProjectById(
            projectId
        );

    if (!project) {

        showPDSNotification(
            "Project record not found.",
            "error"
        );

        return;
    }


    if (
        !canEditMonitoringProject(
            project
        )
    ) {

        showPDSNotification(
            "You are not authorized to edit this project.",
            "error"
        );

        return;
    }


    monitoringState.selectedProjectId =
        projectId;


    const modal =
        document.querySelector(
            [
                "#monitoringEditModal",
                "#projectEditModal",
                "[data-monitoring-edit-modal]"
            ].join(",")
        );


    if (!modal) {

        console.warn(
            "PDS Monitoring: Edit modal was not found."
        );

        return;
    }


    populateMonitoringEditModal(
        modal,
        project
    );


    modal.classList.add(
        "active",
        "show",
        "open"
    );

    modal.removeAttribute(
        "hidden"
    );
}


/* =========================================================
   POPULATE MONITORING EDIT MODAL
========================================================= */

function populateMonitoringEditModal(
    modal,
    project
) {

    const fields = {
        projectTitle:
            project.projectTitle,

        projectNumber:
            project.projectNumber,

        municipality:
            project.municipality,

        program:
            project.program,

        allocation:
            project.allocation,

        status:
            project.status,

        remarks:
            project.remarks
    };


    Object.entries(
        fields
    ).forEach(
        (
            [
                key,
                value
            ]
        ) => {

            const element =
                modal.querySelector(
                    `[data-monitoring-input="${key}"]`
                ) ||
                modal.querySelector(
                    `#${key}`
                );


            if (!element) {
                return;
            }


            element.value =
                value ??
                "";
        }
    );
}


/* =========================================================
   MONITORING EDIT FORM
========================================================= */

function initializeMonitoringEditForm() {

    const form =
        document.querySelector(
            [
                "#monitoringEditForm",
                "#projectEditForm",
                "[data-monitoring-edit-form]"
            ].join(",")
        );

    if (!form) {
        return;
    }


    if (
        form.dataset.monitoringBound ===
        "true"
    ) {

        return;
    }


    form.dataset.monitoringBound =
        "true";


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();
            event.stopPropagation();

            await submitMonitoringEditForm(
                form
            );
        }
    );
}


/* =========================================================
   MONITORING EDIT INITIALIZATION
========================================================= */

function initializeMonitoringEditing() {

    initializeMonitoringEditForm();


    document
        .querySelectorAll(
            [
                "#monitoringCloseModal",
                "#projectCloseModal",
                "[data-monitoring-close]"
            ].join(",")
        )
        .forEach(
            button => {

                if (
                    button.dataset.closeBound ===
                    "true"
                ) {

                    return;
                }

                button.dataset.closeBound =
                    "true";

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        closeMonitoringModal();
                    }
                );
            }
        );
}


/* =========================================================
   SUBMIT MONITORING EDIT
========================================================= */

async function submitMonitoringEditForm(
    form
) {

    if (
        !currentUser
    ) {

        showPDSNotification(
            "Please sign in first.",
            "error"
        );

        return;
    }


    const projectId =
        monitoringState.selectedProjectId;


    if (!projectId) {

        showPDSNotification(
            "No project selected.",
            "error"
        );

        return;
    }


    const project =
        findMonitoringProjectById(
            projectId
        );


    if (!project) {

        showPDSNotification(
            "Project record not found.",
            "error"
        );

        return;
    }


    if (
        !canEditMonitoringProject(
            project
        )
    ) {

        showPDSNotification(
            "You are not authorized to edit this project.",
            "error"
        );

        return;
    }


    const getValue =
        key => {

            const element =
                form.querySelector(
                    `[data-monitoring-input="${key}"]`
                ) ||
                form.querySelector(
                    `#${key}`
                ) ||
                form.querySelector(
                    `[name="${key}"]`
                );

            return (
                element?.value ??
                ""
            ).trim();
        };


    const changes = {
        projectTitle:
            getValue(
                "projectTitle"
            ),

        projectNumber:
            getValue(
                "projectNumber"
            ),

        municipality:
            getValue(
                "municipality"
            ),

        program:
            getValue(
                "program"
            ),

        allocation:
            getValue(
                "allocation"
            ),

        status:
            getValue(
                "status"
            ),

        remarks:
            getValue(
                "remarks"
            )
    };


    const saveButton =
        form.querySelector(
            [
                "button[type='submit']",
                "[data-monitoring-save]"
            ].join(",")
        );


    const originalText =
        saveButton?.textContent ||
        "";


    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            "Saving...";
    }


    try {

        const result =
            await saveMonitoringProject(
                projectId,
                changes
            );


        if (
            result
        ) {

            showPDSNotification(
                "Project monitoring record updated successfully.",
                "success"
            );

            closeMonitoringModal();

            await loadMonitoringDataFromOneDrive(
                true
            );

            renderProjectMonitoring();
        }

    } catch (error) {

        console.error(
            "PDS Monitoring: Save failed:",
            error
        );

        showPDSNotification(
            error?.message ||
            "Unable to save project monitoring record.",
            "error"
        );

    } finally {

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                originalText;
        }
    }
}


/* =========================================================
   SAVE MONITORING PROJECT
========================================================= */

async function saveMonitoringProject(
    projectId,
    changes
) {

    if (
        !isOneDriveConnected()
    ) {

        const connected =
            await signInToOneDrive();

        if (!connected) {

            throw new Error(
                "OneDrive connection is required to save monitoring data."
            );
        }
    }


    const project =
        findMonitoringProjectById(
            projectId
        );


    if (!project) {

        throw new Error(
            "Project record not found."
        );
    }


    const rowIndex =
        Number(
            project._index
        );


    if (
        !Number.isInteger(
            rowIndex
        ) ||
        rowIndex <
        0
    ) {

        throw new Error(
            "Project row index is invalid."
        );
    }


    const worksheet =
        PDS_ONEDRIVE_CONFIG.worksheetName;


    const excelRow =
        rowIndex +
        2;


    const updateMap = {
        "PROJECT TITLE AS PER GAA":
            changes.projectTitle,

        "PROJECT ID":
            changes.projectNumber,

        "MUNICIPALITY":
            changes.municipality,

        "PROGRAM2":
            changes.program,

        "ALLOCATION":
            changes.allocation,

        "STATUS":
            changes.status,

        "REMARKS":
            changes.remarks
    };


    const headerRange =
        await excelRequest(
            `/worksheets('${encodeURIComponent(
                worksheet
            )}')/usedRange`
        );


    const headers =
        headerRange?.values?.[0] ||
        [];


    if (
        !headers.length
    ) {

        throw new Error(
            "The OneDrive worksheet does not contain a header row."
        );
    }


    for (
        const [
            header,
            value
        ]
        of Object.entries(
            updateMap
        )
    ) {

        const columnIndex =
            headers.findIndex(
                cell =>
                    String(
                        cell ??
                        ""
                    )
                        .trim()
                        .toLowerCase() ===
                    header
                        .trim()
                        .toLowerCase()
            );


        if (
            columnIndex <
            0
        ) {

            continue;
        }


        const columnLetter =
            getExcelColumnLetter(
                columnIndex +
                1
            );


        await excelRequest(
            `/worksheets('${encodeURIComponent(
                worksheet
            )}')/range(address='${columnLetter}${excelRow}')`,
            {
                method:
                    "PATCH",

                body:
                    JSON.stringify(
                        {
                            values: [
                                [
                                    value
                                ]
                            ]
                        }
                    )
            }
        );
    }


    return true;
}


/* =========================================================
   EXCEL COLUMN LETTER
========================================================= */

function getExcelColumnLetter(
    columnNumber
) {

    let number =
        Number(
            columnNumber
        );

    let letters =
        "";


    while (
        number >
        0
    ) {

        const remainder =
            (
                number -
                1
            ) %
            26;

        letters =
            String.fromCharCode(
                65 +
                remainder
            ) +
            letters;

        number =
            Math.floor(
                (
                    number -
                    1
                ) /
                26
            );
    }


    return letters;
}


/* =========================================================
   MONITORING REFRESH
========================================================= */

async function refreshProjectMonitoring() {

    try {

        await loadMonitoringDataFromOneDrive(
            true
        );

        populateMonitoringFilterOptions();

        renderProjectMonitoring();

        showPDSNotification(
            "Project monitoring data refreshed.",
            "success"
        );

    } catch (error) {

        console.error(
            "PDS Monitoring: Refresh failed:",
            error
        );

        showPDSNotification(
            error?.message ||
            "Unable to refresh project monitoring data.",
            "error"
        );
    }
}


/* =========================================================
   MONITORING REFRESH BUTTON
========================================================= */

function initializeMonitoringRefreshButton() {

    const buttons =
        document.querySelectorAll(
            [
                "#refreshMonitoring",
                "#refreshProjectMonitoring",
                "[data-refresh-monitoring]"
            ].join(",")
        );


    buttons.forEach(
        button => {

            if (
                button.dataset.refreshBound ===
                "true"
            ) {

                return;
            }


            button.dataset.refreshBound =
                "true";


            button.addEventListener(
                "click",
                async event => {

                    event.preventDefault();

                    await refreshProjectMonitoring();
                }
            );
        }
    );
}


/* =========================================================
   MONITORING PROGRAMS
========================================================= */

function getMonitoringPrograms() {

    return [
        ...new Set(
            (
                Array.isArray(
                    monitoringProjects
                )
                    ? monitoringProjects
                    : []
            )
                .map(
                    project =>
                        project.program
                )
                .filter(
                    Boolean
                )
        )
    ].sort(
        (
            a,
            b
        ) =>
            String(a).localeCompare(
                String(b)
            )
    );
}
/* =========================================================
   DOCUMENT LIBRARY
========================================================= */

let documentsInitialized =
    false;

let documentsCache =
    [];

let documentsLoadingPromise =
    null;


/* =========================================================
   DOCUMENT CATEGORIES
========================================================= */

const DOCUMENT_CATEGORIES = [
    {
        id:
            "department-orders",

        name:
            "Department Orders",

        description:
            "DPWH Department Orders and related issuances.",

        icon:
            "fa-file-lines"
    },

    {
        id:
            "standards-guidelines",

        name:
            "Standards & Guidelines",

        description:
            "DPWH standards, manuals, guidelines and technical references.",

        icon:
            "fa-book"
    },

    {
        id:
            "forms-templates",

        name:
            "Forms & Templates",

        description:
            "Standard forms, templates and technical worksheets.",

        icon:
            "fa-file-signature"
    },

    {
        id:
            "dupa",

        name:
            "DUPA",

        description:
            "Detailed Unit Price Analysis references and templates.",

        icon:
            "fa-calculator"
    },

    {
        id:
            "pow",

        name:
            "Program of Work",

        description:
            "Program of Work templates and supporting documents.",

        icon:
            "fa-clipboard-list"
    },

    {
        id:
            "abc",

        name:
            "ABC / Cost Estimates",

        description:
            "Approved Budget for the Contract and cost estimation references.",

        icon:
            "fa-money-bill"
    }
];


/* =========================================================
   INITIALIZE DOCUMENTS
========================================================= */

async function initializeDocuments() {

    if (
        documentsInitialized
    ) {

        return;
    }

    documentsInitialized =
        true;

    console.log(
        "PDS Documents: Initializing..."
    );

    try {

        setupDocumentControls();

        await loadDocuments();

        renderDocuments();

    } catch (error) {

        console.error(
            "PDS Documents: Initialization failed:",
            error
        );
    }
}


/* =========================================================
   DOCUMENT CONTROLS
========================================================= */

function setupDocumentControls() {

    const searchInput =
        document.querySelector(
            [
                "#documentSearch",
                "#documentsSearch",
                "[data-document-search]"
            ].join(",")
        );


    if (searchInput) {

        if (
            searchInput.dataset.documentBound !==
            "true"
        ) {

            searchInput.dataset.documentBound =
                "true";

            searchInput.addEventListener(
                "input",
                event => {

                    documentState.search =
                        event.target.value
                            .trim()
                            .toLowerCase();

                    renderDocuments();
                }
            );
        }
    }


    const categoryButtons =
        document.querySelectorAll(
            [
                "[data-document-category]",
                ".document-category-filter"
            ].join(",")
        );


    categoryButtons.forEach(
        button => {

            if (
                button.dataset.documentBound ===
                "true"
            ) {

                return;
            }

            button.dataset.documentBound =
                "true";

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    documentState.category =
                        button.dataset.documentCategory ||
                        "";

                    documentState.currentPage =
                        1;

                    renderDocuments();
                }
            );
        }
    );


    const uploadButtons =
        document.querySelectorAll(
            [
                "#uploadDocumentButton",
                "#uploadDocument",
                "[data-upload-document]"
            ].join(",")
        );


    uploadButtons.forEach(
        button => {

            if (
                button.dataset.uploadBound ===
                "true"
            ) {

                return;
            }

            button.dataset.uploadBound =
                "true";

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    openDocumentUploadModal();
                }
            );
        }
    );


    const refreshButtons =
        document.querySelectorAll(
            [
                "#refreshDocuments",
                "#refreshDocumentLibrary",
                "[data-refresh-documents]"
            ].join(",")
        );


    refreshButtons.forEach(
        button => {

            if (
                button.dataset.refreshBound ===
                "true"
            ) {

                return;
            }

            button.dataset.refreshBound =
                "true";

            button.addEventListener(
                "click",
                async event => {

                    event.preventDefault();

                    await refreshDocuments();
                }
            );
        }
    );
}


/* =========================================================
   LOAD DOCUMENTS
========================================================= */

async function loadDocuments(
    forceRefresh = false
) {

    if (
        documentsCache.length &&
        !forceRefresh
    ) {

        return documentsCache;
    }

    if (
        documentsLoadingPromise
    ) {

        return documentsLoadingPromise;
    }


    documentsLoadingPromise =
        (async () => {

            try {

                /*
                 * Supabase Storage is used for the
                 * PDS document library.
                 */

                if (!db) {

                    documentsCache =
                        [];

                    return [];
                }


                const result =
                    await db.storage
                        .from(
                            "documents"
                        )
                        .list(
                            "",
                            {
                                limit:
                                    1000,

                                sortBy: {
                                    column:
                                        "name",

                                    order:
                                        "asc"
                                }
                            }
                        );


                if (
                    result.error
                ) {

                    throw result.error;
                }


                documentsCache =
                    (
                        result.data ||
                        []
                    ).map(
                        item =>
                            normalizeDocument(
                                item
                            )
                    );


                console.log(
                    "PDS Documents: Loaded",
                    documentsCache.length,
                    "documents."
                );


                return documentsCache;

            } catch (error) {

                console.error(
                    "PDS Documents: Failed to load documents:",
                    error
                );

                documentsCache =
                    [];

                return [];

            } finally {

                documentsLoadingPromise =
                    null;
            }
        })();


    return documentsLoadingPromise;
}


/* =========================================================
   NORMALIZE DOCUMENT
========================================================= */

function normalizeDocument(
    item
) {

    const name =
        item?.name ||
        "";

    const metadata =
        item?.metadata ||
        {};


    return {
        ...item,

        id:
            item?.id ||
            name,

        name,

        displayName:
            name,

        size:
            Number(
                metadata?.size ||
                item?.metadata?.size ||
                0
            ),

        mimeType:
            metadata?.mimetype ||
            metadata?.mimeType ||
            getMimeTypeFromFilename(
                name
            ),

        category:
            detectDocumentCategory(
                name
            ),

        createdAt:
            item?.created_at ||
            metadata?.created_at ||
            null,

        updatedAt:
            item?.updated_at ||
            null
    };
}


/* =========================================================
   DOCUMENT CATEGORY DETECTION
========================================================= */

function detectDocumentCategory(
    filename
) {

    const name =
        String(
            filename ||
            ""
        ).toLowerCase();


    if (
        name.includes(
            "department order"
        ) ||
        /^do[\s._-]?\d+/i.test(
            name
        )
    ) {

        return "department-orders";
    }


    if (
        name.includes(
            "dupa"
        )
    ) {

        return "dupa";
    }


    if (
        name.includes(
            "program of work"
        ) ||
        name.includes(
            "pow"
        )
    ) {

        return "pow";
    }


    if (
        name.includes(
            "abc"
        ) ||
        name.includes(
            "cost estimate"
        )
    ) {

        return "abc";
    }


    if (
        name.includes(
            "form"
        ) ||
        name.includes(
            "template"
        )
    ) {

        return "forms-templates";
    }


    if (
        name.includes(
            "standard"
        ) ||
        name.includes(
            "guideline"
        ) ||
        name.includes(
            "manual"
        )
    ) {

        return "standards-guidelines";
    }


    return "standards-guidelines";
}


/* =========================================================
   DOCUMENT FILTER
========================================================= */

function getFilteredDocuments() {

    const search =
        String(
            documentState.search ||
            ""
        )
            .trim()
            .toLowerCase();

    const category =
        String(
            documentState.category ||
            ""
        )
            .trim()
            .toLowerCase();


    return documentsCache.filter(
        document => {

            if (
                category &&
                document.category
                    ?.toLowerCase() !==
                category
            ) {

                return false;
            }


            if (
                search
            ) {

                const searchable =
                    [
                        document.name,
                        document.displayName,
                        document.category,
                        document.mimeType
                    ]
                        .map(
                            value =>
                                String(
                                    value ||
                                    ""
                                )
                        )
                        .join(" ")
                        .toLowerCase();


                if (
                    !searchable.includes(
                        search
                    )
                ) {

                    return false;
                }
            }


            return true;
        }
    );
}


/* =========================================================
   RENDER DOCUMENTS
========================================================= */

function renderDocuments() {

    const container =
        document.querySelector(
            [
                "#documentsGrid",
                "#documentGrid",
                "#documentsList",
                "[data-documents-container]"
            ].join(",")
        );


    if (!container) {

        return;
    }


    const documents =
        getFilteredDocuments();


    container.innerHTML =
        "";


    if (
        !documents.length
    ) {

        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "documents-empty";

        empty.textContent =
            "No documents found.";

        container.appendChild(
            empty
        );

        updateDocumentCounts(
            []
        );

        return;
    }


    documents.forEach(
        documentItem => {

            const card =
                createDocumentCard(
                    documentItem
                );

            container.appendChild(
                card
            );
        }
    );


    updateDocumentCounts(
        documents
    );
}


/* =========================================================
   CREATE DOCUMENT CARD
========================================================= */

function createDocumentCard(
    documentItem
) {

    const card =
        document.createElement(
            "article"
        );

    card.className =
        "document-card";


    const icon =
        document.createElement(
            "div"
        );

    icon.className =
        "document-card-icon";


    const iconElement =
        document.createElement(
            "i"
        );

    iconElement.className =
        getDocumentIconClass(
            documentItem
        );


    icon.appendChild(
        iconElement
    );


    const content =
        document.createElement(
            "div"
        );

    content.className =
        "document-card-content";


    const title =
        document.createElement(
            "h3"
        );

    title.textContent =
        documentItem.displayName ||
        documentItem.name;


    const category =
        document.createElement(
            "div"
        );

    category.className =
        "document-card-category";

    category.textContent =
        getDocumentCategoryName(
            documentItem.category
        );


    const metadata =
        document.createElement(
            "div"
        );

    metadata.className =
        "document-card-meta";

    metadata.textContent =
        formatDocumentSize(
            documentItem.size
        );


    content.appendChild(
        title
    );

    content.appendChild(
        category
    );

    content.appendChild(
        metadata
    );


    const actions =
        document.createElement(
            "div"
        );

    actions.className =
        "document-card-actions";


    const viewButton =
        createButton(
            "View",
            "document-view-button"
        );


    viewButton.addEventListener(
        "click",
        async event => {

            event.preventDefault();

            await viewDocument(
                documentItem
            );
        }
    );


    const downloadButton =
        createButton(
            "Download",
            "document-download-button"
        );


    downloadButton.addEventListener(
        "click",
        async event => {

            event.preventDefault();

            await downloadDocument(
                documentItem
            );
        }
    );


    actions.appendChild(
        viewButton
    );

    actions.appendChild(
        downloadButton
    );


    if (
        canManageDocuments()
    ) {

        const deleteButton =
            createButton(
                "Delete",
                "document-delete-button"
            );


        deleteButton.addEventListener(
            "click",
            async event => {

                event.preventDefault();

                await deleteDocument(
                    documentItem
                );
            }
        );


        actions.appendChild(
            deleteButton
        );
    }


    card.appendChild(
        icon
    );

    card.appendChild(
        content
    );

    card.appendChild(
        actions
    );


    return card;
}


/* =========================================================
   DOCUMENT ICON
========================================================= */

function getDocumentIconClass(
    documentItem
) {

    const mime =
        String(
            documentItem?.mimeType ||
            ""
        ).toLowerCase();

    const name =
        String(
            documentItem?.name ||
            ""
        ).toLowerCase();


    if (
        mime.includes(
            "pdf"
        ) ||
        name.endsWith(
            ".pdf"
        )
    ) {

        return "fa-solid fa-file-pdf";
    }


    if (
        mime.includes(
            "spreadsheet"
        ) ||
        mime.includes(
            "excel"
        ) ||
        name.endsWith(
            ".xlsx"
        ) ||
        name.endsWith(
            ".xls"
        )
    ) {

        return "fa-solid fa-file-excel";
    }


    if (
        mime.includes(
            "word"
        ) ||
        name.endsWith(
            ".docx"
        ) ||
        name.endsWith(
            ".doc"
        )
    ) {

        return "fa-solid fa-file-word";
    }


    if (
        mime.includes(
            "powerpoint"
        ) ||
        name.endsWith(
            ".pptx"
        ) ||
        name.endsWith(
            ".ppt"
        )
    ) {

        return "fa-solid fa-file-powerpoint";
    }


    if (
        mime.includes(
            "image"
        )
    ) {

        return "fa-solid fa-file-image";
    }


    return "fa-solid fa-file";
}


/* =========================================================
   DOCUMENT CATEGORY NAME
========================================================= */

function getDocumentCategoryName(
    category
) {

    const item =
        DOCUMENT_CATEGORIES.find(
            item =>
                item.id ===
                category
        );


    return (
        item?.name ||
        "Technical Documents"
    );
}


/* =========================================================
   DOCUMENT SIZE
========================================================= */

function formatDocumentSize(
    bytes
) {

    const value =
        Number(
            bytes
        );


    if (
        !Number.isFinite(
            value
        ) ||
        value <=
        0
    ) {

        return "";
    }


    const units = [
        "B",
        "KB",
        "MB",
        "GB"
    ];


    const exponent =
        Math.min(
            Math.floor(
                Math.log(
                    value
                ) /
                Math.log(
                    1024
                )
            ),
            units.length -
            1
        );


    const size =
        value /
        Math.pow(
            1024,
            exponent
        );


    return `${size.toFixed(
        exponent === 0
            ? 0
            : 1
    )} ${units[exponent]}`;
}


/* =========================================================
   DOCUMENT COUNTS
========================================================= */

function updateDocumentCounts(
    documents
) {

    DOCUMENT_CATEGORIES.forEach(
        category => {

            const count =
                documents.filter(
                    document =>
                        document.category ===
                        category.id
                ).length;


            const element =
                document.querySelector(
                    [
                        `[data-document-count="${category.id}"]`,
                        `#documentCount-${category.id}`
                    ].join(",")
                );


            if (element) {

                element.textContent =
                    String(
                        count
                    );
            }
        }
    );
}


/* =========================================================
   DOCUMENT VIEW
========================================================= */

async function viewDocument(
    documentItem
) {

    try {

        const result =
            db.storage
                .from(
                    "documents"
                )
                .getPublicUrl(
                    documentItem.name
                );


        const url =
            result?.data?.publicUrl;


        if (!url) {

            throw new Error(
                "Unable to generate document URL."
            );
        }


        window.open(
            url,
            "_blank",
            "noopener,noreferrer"
        );

    } catch (error) {

        console.error(
            "PDS Documents: View failed:",
            error
        );

        showPDSNotification(
            error?.message ||
            "Unable to open document.",
            "error"
        );
    }
}


/* =========================================================
   DOCUMENT DOWNLOAD
========================================================= */

async function downloadDocument(
    documentItem
) {

    try {

        const result =
            await db.storage
                .from(
                    "documents"
                )
                .download(
                    documentItem.name
                );


        if (
            result.error
        ) {

            throw result.error;
        }


        const blob =
            result.data;


        const url =
            URL.createObjectURL(
                blob
            );


        const anchor =
            document.createElement(
                "a"
            );

        anchor.href =
            url;

        anchor.download =
            documentItem.name;


        document.body.appendChild(
            anchor
        );

        anchor.click();

        anchor.remove();


        setTimeout(
            () => {

                URL.revokeObjectURL(
                    url
                );

            },
            1000
        );

    } catch (error) {

        console.error(
            "PDS Documents: Download failed:",
            error
        );

        showPDSNotification(
            error?.message ||
            "Unable to download document.",
            "error"
        );
    }
}


/* =========================================================
   DOCUMENT UPLOAD PERMISSION
========================================================= */

function canManageDocuments() {

    if (!currentUser) {
        return false;
    }


    const role =
        String(
            currentProfile?.role ||
            ""
        )
            .trim()
            .toLowerCase();


    return [
        "admin",
        "administrator",
        "editor",
        "content_manager"
    ].includes(
        role
    );
}


/* =========================================================
   DOCUMENT UPLOAD MODAL
========================================================= */

function openDocumentUploadModal() {

    if (
        !canManageDocuments()
    ) {

        showPDSNotification(
            "You are not authorized to upload documents.",
            "error"
        );

        return;
    }


    const modal =
        document.querySelector(
            [
                "#documentUploadModal",
                "#uploadDocumentModal",
                "[data-document-upload-modal]"
            ].join(",")
        );


    if (!modal) {

        const input =
            document.createElement(
                "input"
            );

        input.type =
            "file";

        input.multiple =
            true;

        input.accept =
            ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx";


        input.addEventListener(
            "change",
            async () => {

                await uploadDocuments(
                    input.files
                );
            }
        );


        input.click();

        return;
    }


    modal.classList.add(
        "active",
        "show",
        "open"
    );

    modal.removeAttribute(
        "hidden"
    );
}


/* =========================================================
   UPLOAD DOCUMENTS
========================================================= */

async function uploadDocuments(
    files
) {

    if (
        !canManageDocuments()
    ) {

        throw new Error(
            "You are not authorized to upload documents."
        );
    }


    if (
        !files ||
        !files.length
    ) {

        return;
    }


    const fileArray =
        Array.from(
            files
        );


    for (
        const file of fileArray
    ) {

        try {

            const safeName =
                createDocumentStorageName(
                    file.name
                );


            const result =
                await db.storage
                    .from(
                        "documents"
                    )
                    .upload(
                        safeName,
                        file,
                        {
                            upsert:
                                false,

                            cacheControl:
                                "3600",

                            contentType:
                                file.type ||
                                "application/octet-stream"
                        }
                    );


            if (
                result.error
            ) {

                throw result.error;
            }


            console.log(
                "PDS Documents: Uploaded:",
                safeName
            );

        } catch (error) {

            console.error(
                "PDS Documents: Upload failed:",
                file.name,
                error
            );

            showPDSNotification(
                `Failed to upload ${file.name}: ${error.message}`,
                "error"
            );

            continue;
        }
    }


    closeDocumentUploadModal();

    await refreshDocuments();


    showPDSNotification(
        "Document upload completed.",
        "success"
    );
}


/* =========================================================
   DOCUMENT STORAGE NAME
========================================================= */

function createDocumentStorageName(
    filename
) {

    const original =
        String(
            filename ||
            "document"
        ).trim();


    const timestamp =
        new Date()
            .toISOString()
            .replace(
                /[:.]/g,
                "-"
            );


    return `${timestamp}_${original}`;
}


/* =========================================================
   CLOSE DOCUMENT UPLOAD MODAL
========================================================= */

function closeDocumentUploadModal() {

    const modals =
        document.querySelectorAll(
            [
                "#documentUploadModal",
                "#uploadDocumentModal",
                "[data-document-upload-modal]"
            ].join(",")
        );


    modals.forEach(
        modal => {

            modal.classList.remove(
                "active",
                "show",
                "open"
            );

            modal.setAttribute(
                "hidden",
                ""
            );
        }
    );
}


/* =========================================================
   REFRESH DOCUMENTS
========================================================= */

async function refreshDocuments() {

    try {

        await loadDocuments(
            true
        );

        renderDocuments();

    } catch (error) {

        console.error(
            "PDS Documents: Refresh failed:",
            error
        );
    }
}


/* =========================================================
   DEPARTMENT ORDERS
========================================================= */

let departmentOrdersInitialized =
    false;

let departmentOrdersCache =
    [];


/* =========================================================
   INITIALIZE DEPARTMENT ORDERS
========================================================= */

async function initializeDepartmentOrders() {

    if (
        departmentOrdersInitialized
    ) {

        return;
    }

    departmentOrdersInitialized =
        true;


    try {

        await loadDepartmentOrders();

        renderDepartmentOrders();

    } catch (error) {

        console.error(
            "PDS Department Orders:",
            error
        );
    }
}


/* =========================================================
   LOAD DEPARTMENT ORDERS
========================================================= */

async function loadDepartmentOrders() {

    const documents =
        await loadDocuments();


    departmentOrdersCache =
        documents.filter(
            document =>
                document.category ===
                "department-orders"
        );


    return departmentOrdersCache;
}


/* =========================================================
   RENDER DEPARTMENT ORDERS
========================================================= */

function renderDepartmentOrders() {

    const container =
        document.querySelector(
            [
                "#departmentOrdersList",
                "#departmentOrdersGrid",
                "[data-department-orders]"
            ].join(",")
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    if (
        !departmentOrdersCache.length
    ) {

        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "documents-empty";

        empty.textContent =
            "No Department Orders uploaded yet.";

        container.appendChild(
            empty
        );

        return;
    }


    departmentOrdersCache.forEach(
        documentItem => {

            const card =
                createDocumentCard(
                    documentItem
                );

            container.appendChild(
                card
            );
        }
    );
}


/* =========================================================
   NEWS / ANNOUNCEMENTS
========================================================= */

let announcementsInitialized =
    false;

let announcementsCache =
    [];


/* =========================================================
   INITIALIZE ANNOUNCEMENTS
========================================================= */

async function initializeAnnouncements() {

    if (
        announcementsInitialized
    ) {

        return;
    }

    announcementsInitialized =
        true;


    try {

        await loadAnnouncements();

        renderAnnouncements();

    } catch (error) {

        console.error(
            "PDS Announcements:",
            error
        );
    }
}


/* =========================================================
   LOAD ANNOUNCEMENTS
========================================================= */

async function loadAnnouncements() {

    /*
     * Announcements can be loaded from a
     * Supabase table named "announcements".
     *
     * If the table is unavailable, the
     * dashboard remains functional.
     */

    if (!db) {

        announcementsCache =
            [];

        return [];
    }


    try {

        const result =
            await db
                .from(
                    "announcements"
                )
                .select(
                    "*"
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            false
                    }
                )
                .limit(
                    20
                );


        if (
            result.error
        ) {

            console.warn(
                "PDS Announcements:",
                result.error.message
            );

            announcementsCache =
                [];

            return [];
        }


        announcementsCache =
            result.data ||
            [];


        return announcementsCache;

    } catch (error) {

        console.warn(
            "PDS Announcements: Unable to load:",
            error
        );

        announcementsCache =
            [];

        return [];
    }
}


/* =========================================================
   RENDER ANNOUNCEMENTS
========================================================= */

function renderAnnouncements() {

    const container =
        document.querySelector(
            [
                "#announcementsList",
                "#announcementList",
                "[data-announcements]"
            ].join(",")
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    if (
        !announcementsCache.length
    ) {

        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "announcement-empty";

        empty.textContent =
            "No announcements available.";

        container.appendChild(
            empty
        );

        return;
    }


    announcementsCache.forEach(
        announcement => {

            const article =
                document.createElement(
                    "article"
                );

            article.className =
                "announcement-card";


            const title =
                document.createElement(
                    "h3"
                );

            title.textContent =
                announcement.title ||
                "Announcement";


            const content =
                document.createElement(
                    "p"
                );

            content.textContent =
                announcement.content ||
                announcement.description ||
                "";


            const date =
                document.createElement(
                    "time"
                );

            date.textContent =
                formatDate(
                    announcement.created_at ||
                    announcement.date
                );


            article.appendChild(
                title
            );

            article.appendChild(
                content
            );

            article.appendChild(
                date
            );


            container.appendChild(
                article
            );
        }
    );
}
