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

   AUTHENTICATION-STABLE VERSION
========================================================= */


/* =========================================================
   SUPABASE CONFIGURATION
========================================================= */

const SUPABASE_URL =
    "https://zvwghoabsqfyakbqzhil.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_oJ3Zc3TplfYgePQEmTrJ8Q_qycxR0jQ";


/* =========================================================
   MICROSOFT / ONEDRIVE CONFIGURATION

   IMPORTANT:
   1. Register this website as a SPA in Microsoft Entra ID.
   2. Add the exact GitHub Pages URL as a redirect URI.
   3. Add delegated Microsoft Graph permissions:
      - User.Read
      - Files.ReadWrite
   4. Replace the placeholder client ID below.
========================================================= */

const MICROSOFT_CLIENT_ID =
    "PASTE-YOUR-MICROSOFT-CLIENT-ID-HERE";

const MICROSOFT_AUTHORITY =
    "https://login.microsoftonline.com/consumers/";

const MICROSOFT_SCOPES = [
    "User.Read",
    "Files.ReadWrite"
];

const ONEDRIVE_FILE_NAME =
    "trial for website.xlsx";

const ONEDRIVE_SHEET_NAME =
    "OVERALL";

const ONEDRIVE_GRAPH_ROOT =
    "https://graph.microsoft.com/v1.0";

let msalInstance = null;
let microsoftAccount = null;
let oneDriveReady = false;
let oneDriveAccessToken = null;
let oneDriveWorkbookRows = [];
let oneDriveHeaders = [];
let oneDriveWorkbookSessionId = null;
let oneDriveScriptLoading = null;


/* =========================================================
   SUPABASE CLIENT
========================================================= */

let db = null;


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

let authStateSubscription = null;


/* =========================================================
   DOM HELPER
========================================================= */

function $(id) {
    return document.getElementById(id);
}


/* =========================================================
   WAIT FOR SUPABASE
========================================================= */

async function waitForSupabase(maxAttempts = 50) {

    for (let attempt = 0; attempt < maxAttempts; attempt++) {

        if (
            window.supabase &&
            typeof window.supabase.createClient === "function"
        ) {
            return true;
        }

        await new Promise(resolve => {
            setTimeout(resolve, 100);
        });
    }

    return false;
}


/* =========================================================
   INITIALIZE SUPABASE
========================================================= */

function initializeSupabase() {

    if (
        !window.supabase ||
        typeof window.supabase.createClient !== "function"
    ) {

        console.error(
            "PDS: Supabase library was not loaded."
        );

        return false;
    }


    if (!SUPABASE_URL) {

        console.error(
            "PDS: Supabase URL is missing."
        );

        return false;
    }


    if (!SUPABASE_ANON_KEY) {

        console.error(
            "PDS: Supabase Publishable key is missing."
        );

        return false;
    }


    try {

        db = window.supabase.createClient(
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
            "PDS: Supabase initialized successfully."
        );


        return true;

    } catch (error) {

        console.error(
            "PDS: Failed to initialize Supabase:",
            error
        );

        return false;
    }
}
/* =========================================================
   GET CURRENT SUPABASE SESSION
========================================================= */

async function getCurrentSession() {

    if (!db) {
        return null;
    }

    try {

        const {
            data,
            error
        } = await db.auth.getSession();

        if (error) {

            console.error(
                "PDS: Failed to get session:",
                error
            );

            return null;
        }

        return data?.session || null;

    } catch (error) {

        console.error(
            "PDS: Session error:",
            error
        );

        return null;
    }
}


/* =========================================================
   LOAD SUPABASE PROFILE
========================================================= */

async function loadCurrentProfile(userId) {

    if (!db || !userId) {
        return null;
    }

    try {

        const {
            data,
            error
        } = await db
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();


        if (error) {

            console.warn(
                "PDS: Profile lookup failed:",
                error
            );

            return null;
        }


        currentProfile = data || null;

        return currentProfile;

    } catch (error) {

        console.error(
            "PDS: Profile error:",
            error
        );

        return null;
    }
}


/* =========================================================
   UPDATE USER INTERFACE AFTER AUTH
========================================================= */

function updateAuthenticatedUI() {

    const signInPage =
        $("signInPage");

    const mainApp =
        $("mainApp");

    const userEmailElements =
        document.querySelectorAll(
            "[data-user-email], .user-email"
        );


    if (currentUser) {

        if (signInPage) {
            signInPage.classList.add("hidden");
        }

        if (mainApp) {
            mainApp.classList.remove("hidden");
        }


        userEmailElements.forEach(
            element => {

                element.textContent =
                    currentUser.email || "";

            }
        );


    } else {

        if (signInPage) {
            signInPage.classList.remove("hidden");
        }

        if (mainApp) {
            mainApp.classList.add("hidden");
        }


        userEmailElements.forEach(
            element => {

                element.textContent = "";

            }
        );
    }
}


/* =========================================================
   SHOW MESSAGE
========================================================= */

function showMessage(
    message,
    type = "info"
) {

    let container =
        $("pdsToastContainer");


    if (!container) {

        container =
            document.createElement("div");

        container.id =
            "pdsToastContainer";

        container.style.position =
            "fixed";

        container.style.top =
            "20px";

        container.style.right =
            "20px";

        container.style.zIndex =
            "99999";

        container.style.display =
            "flex";

        container.style.flexDirection =
            "column";

        container.style.gap =
            "10px";

        document.body.appendChild(
            container
        );
    }


    const toast =
        document.createElement("div");


    toast.textContent =
        message;


    toast.className =
        `pds-toast pds-toast-${type}`;


    toast.style.padding =
        "12px 16px";

    toast.style.borderRadius =
        "8px";

    toast.style.background =
        "#ffffff";

    toast.style.border =
        "1px solid #d1d5db";

    toast.style.boxShadow =
        "0 8px 24px rgba(0,0,0,.12)";

    toast.style.fontSize =
        "14px";

    toast.style.maxWidth =
        "360px";


    container.appendChild(
        toast
    );


    setTimeout(() => {

        toast.remove();

    }, 4000);
}


/* =========================================================
   AUTH ERROR MESSAGE
========================================================= */

function getAuthErrorMessage(error) {

    if (!error) {
        return "Authentication failed.";
    }


    const message =
        String(
            error.message ||
            error.error_description ||
            error
        );


    const lower =
        message.toLowerCase();


    if (
        lower.includes("invalid login credentials")
    ) {

        return "Invalid email or password.";
    }


    if (
        lower.includes("email not confirmed")
    ) {

        return "Please confirm your email address before signing in.";
    }


    if (
        lower.includes("user already registered")
    ) {

        return "This email is already registered.";
    }


    if (
        lower.includes("password")
    ) {

        return message;
    }


    return message;
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
            "Supabase is not initialized.",
            "error"
        );

        return false;
    }


    if (!email || !password) {

        showMessage(
            "Please enter your email and password.",
            "warning"
        );

        return false;
    }


    try {

        console.log(
            "PDS: Signing in:",
            email
        );


        const {
            data,
            error
        } = await db.auth.signInWithPassword({
            email: email.trim(),
            password: password
        });


        if (error) {

            console.error(
                "PDS: Sign-in failed:",
                error
            );

            showMessage(
                getAuthErrorMessage(error),
                "error"
            );

            return false;
        }


        currentUser =
            data?.user || null;


        if (currentUser) {

            await loadCurrentProfile(
                currentUser.id
            );

            updateAuthenticatedUI();

            await initializeAfterLogin();

            showMessage(
                "Signed in successfully.",
                "success"
            );

            return true;
        }


        showMessage(
            "Sign-in completed but no user session was returned.",
            "error"
        );

        return false;

    } catch (error) {

        console.error(
            "PDS: Unexpected sign-in error:",
            error
        );

        showMessage(
            getAuthErrorMessage(error),
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
        return;
    }


    try {

        console.log(
            "PDS: Signing out..."
        );


        const {
            error
        } = await db.auth.signOut();


        if (error) {

            console.error(
                "PDS: Sign-out failed:",
                error
            );

            showMessage(
                "Unable to sign out: " +
                error.message,
                "error"
            );

            return false;
        }


        currentUser = null;
        currentProfile = null;


        if (oneDriveAccessToken) {
            oneDriveAccessToken = null;
        }

        microsoftAccount = null;
        oneDriveReady = false;


        updateAuthenticatedUI();


        showMessage(
            "Signed out successfully.",
            "success"
        );


        return true;

    } catch (error) {

        console.error(
            "PDS: Sign-out error:",
            error
        );

        showMessage(
            "Sign-out failed.",
            "error"
        );

        return false;
    }
}


/* =========================================================
   AUTH FORM INITIALIZATION — FINAL FIX
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


    /*
     * SIGN IN FORM
     */

    const signInForm =
        document.getElementById(
            "signInForm"
        );


    /*
     * SIGN IN BUTTON
     */

    const signInButton =
        document.getElementById(
            "signInButton"
        ) ||
        document.getElementById(
            "loginButton"
        ) ||
        document.getElementById(
            "signInBtn"
        );


    /*
     * FORM SUBMIT
     */

    if (signInForm) {

        signInForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();
                event.stopPropagation();

                console.log(
                    "PDS Auth: Sign In form submitted."
                );


                const emailInput =
                    document.getElementById(
                        "email"
                    ) ||
                    document.getElementById(
                        "loginEmail"
                    ) ||
                    document.getElementById(
                        "signInEmail"
                    );


                const passwordInput =
                    document.getElementById(
                        "password"
                    ) ||
                    document.getElementById(
                        "loginPassword"
                    ) ||
                    document.getElementById(
                        "signInPassword"
                    );


                const email =
                    emailInput?.value
                        ?.trim() ||
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


                await signInUser(
                    email,
                    password
                );

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


    /*
     * FALLBACK SIGN IN BUTTON
     *
     * This is used if the HTML does not have
     * a form submit event.
     */

    if (
        !signInForm &&
        signInButton
    ) {

        signInButton.addEventListener(
            "click",
            async function (event) {

                event.preventDefault();
                event.stopPropagation();

                console.log(
                    "PDS Auth: Sign In button clicked."
                );


                const emailInput =
                    document.getElementById(
                        "email"
                    ) ||
                    document.getElementById(
                        "loginEmail"
                    ) ||
                    document.getElementById(
                        "signInEmail"
                    );


                const passwordInput =
                    document.getElementById(
                        "password"
                    ) ||
                    document.getElementById(
                        "loginPassword"
                    ) ||
                    document.getElementById(
                        "signInPassword"
                    );


                const email =
                    emailInput?.value
                        ?.trim() ||
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
            "PDS Auth: Sign In button listener attached."
        );
    }


    /*
     * SIGN OUT BUTTONS
     */

    const signOutButtons =
        document.querySelectorAll(
            "#signOutButton, #logoutButton, .sign-out-button, [data-action='sign-out']"
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
                async function (event) {

                    event.preventDefault();
                    event.stopPropagation();

                    await signOutUser();

                }
            );

        }
    );


    authFormsReady =
        true;


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
                    session?.user || null;


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

                    updateAuthenticatedUI();
                }
            }
        );


    authStateSubscription =
        result?.data?.subscription ||
        null;
}


/* =========================================================
   INITIALIZE AFTER LOGIN
========================================================= */

async function initializeAfterLogin() {

    console.log(
        "PDS: Initializing authenticated workspace..."
    );


    try {

        await initializeNavigation();

    } catch (error) {

        console.error(
            "PDS: Navigation initialization failed:",
            error
        );
    }


    try {

        await initializeDocuments();

    } catch (error) {

        console.error(
            "PDS: Document initialization failed:",
            error
        );
    }


    try {

        await initializeProjectMonitoring();

    } catch (error) {

        console.error(
            "PDS: Project Monitoring initialization failed:",
            error
        );
    }


    try {

        await initializeDepartmentOrders();

    } catch (error) {

        console.error(
            "PDS: Department Orders initialization failed:",
            error
        );
    }


    try {

        await initializePDSAI();

    } catch (error) {

        console.error(
            "PDS: PDS AI initialization failed:",
            error
        );
    }


    /*
     * OneDrive initialization is intentionally
     * separated from Supabase authentication.
     *
     * Project Monitoring uses OneDrive Excel
     * as its data source.
     */

    try {

        await initializeOneDrive();

    } catch (error) {

        console.warn(
            "PDS: OneDrive initialization did not complete:",
            error
        );
    }
}
/* =========================================================
   LOAD MSAL BROWSER LIBRARY
========================================================= */

function loadMSAL() {

    if (
        window.msal &&
        typeof window.msal.PublicClientApplication ===
            "function"
    ) {
        return Promise.resolve(true);
    }


    if (oneDriveScriptLoading) {
        return oneDriveScriptLoading;
    }


    oneDriveScriptLoading =
        new Promise((resolve, reject) => {

            const existing =
                document.querySelector(
                    "script[data-pds-msal]"
                );


            if (existing) {

                existing.addEventListener(
                    "load",
                    () => resolve(true)
                );

                existing.addEventListener(
                    "error",
                    () => reject(
                        new Error(
                            "Unable to load Microsoft MSAL."
                        )
                    )
                );

                return;
            }


            const script =
                document.createElement("script");


            script.src =
                "https://alcdn.msauth.net/browser/2.38.2/js/msal-browser.min.js";


            script.async = true;


            script.dataset.pdsMsal =
                "true";


            script.onload = () => {

                console.log(
                    "PDS: Microsoft MSAL loaded."
                );

                resolve(true);
            };


            script.onerror = () => {

                reject(
                    new Error(
                        "Microsoft MSAL failed to load."
                    )
                );
            };


            document.head.appendChild(
                script
            );
        });


    return oneDriveScriptLoading;
}


/* =========================================================
   INITIALIZE ONEDRIVE
========================================================= */

async function initializeOneDrive() {

    console.log(
        "PDS: Initializing OneDrive..."
    );


    if (
        !MICROSOFT_CLIENT_ID ||
        MICROSOFT_CLIENT_ID ===
            "PASTE-YOUR-MICROSOFT-CLIENT-ID-HERE"
    ) {

        console.warn(
            "PDS: Microsoft Client ID has not been configured."
        );


        oneDriveReady =
            false;


        updateOneDriveStatus(
            "Microsoft account connection required."
        );


        return false;
    }


    try {

        await loadMSAL();


        if (
            !window.msal ||
            typeof window.msal.PublicClientApplication !==
                "function"
        ) {

            throw new Error(
                "MSAL browser library is unavailable."
            );
        }


        const msalConfig = {

            auth: {

                clientId:
                    MICROSOFT_CLIENT_ID,

                authority:
                    MICROSOFT_AUTHORITY,

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
        };


        msalInstance =
            new window.msal.PublicClientApplication(
                msalConfig
            );


        await msalInstance.initialize();


        const accounts =
            msalInstance.getAllAccounts();


        if (accounts.length > 0) {

            microsoftAccount =
                accounts[0];

            console.log(
                "PDS: Microsoft account found:",
                microsoftAccount.username
            );


            oneDriveReady =
                true;


            updateOneDriveStatus(
                "Microsoft account connected."
            );


            return true;
        }


        oneDriveReady =
            false;


        updateOneDriveStatus(
            "Connect OneDrive to load Excel data."
        );


        return false;

    } catch (error) {

        console.error(
            "PDS: OneDrive initialization error:",
            error
        );


        oneDriveReady =
            false;


        updateOneDriveStatus(
            "OneDrive connection unavailable."
        );


        return false;
    }
}


/* =========================================================
   ONEDRIVE STATUS UI
========================================================= */

function updateOneDriveStatus(
    message
) {

    const elements =
        document.querySelectorAll(
            "[data-onedrive-status], #oneDriveStatus"
        );


    elements.forEach(
        element => {

            element.textContent =
                message;

        }
    );
}


/* =========================================================
   MICROSOFT SIGN-IN
========================================================= */

async function signInToMicrosoft() {

    if (!msalInstance) {

        const initialized =
            await initializeOneDrive();


        if (!initialized) {

            showMessage(
                "Microsoft OneDrive is not configured yet.",
                "warning"
            );

            return false;
        }
    }


    try {

        const loginRequest = {

            scopes:
                MICROSOFT_SCOPES

        };


        const response =
            await msalInstance.loginPopup(
                loginRequest
            );


        if (!response) {

            throw new Error(
                "Microsoft sign-in returned no response."
            );
        }


        microsoftAccount =
            response.account;


        msalInstance.setActiveAccount(
            microsoftAccount
        );


        oneDriveReady =
            true;


        updateOneDriveStatus(
            `Connected: ${microsoftAccount.username}`
        );


        showMessage(
            "OneDrive connected successfully.",
            "success"
        );


        return true;

    } catch (error) {

        console.error(
            "PDS: Microsoft sign-in failed:",
            error
        );


        showMessage(
            "Unable to connect to OneDrive: " +
            (error.message || error),
            "error"
        );


        return false;
    }
}


/* =========================================================
   GET ONEDRIVE ACCESS TOKEN
========================================================= */

async function getOneDriveAccessToken() {

    if (!msalInstance) {

        const initialized =
            await initializeOneDrive();


        if (!initialized) {
            return null;
        }
    }


    const account =
        microsoftAccount ||
        msalInstance.getActiveAccount() ||
        msalInstance.getAllAccounts()[0];


    if (!account) {

        const signedIn =
            await signInToMicrosoft();


        if (!signedIn) {
            return null;
        }
    }


    const activeAccount =
        microsoftAccount ||
        msalInstance.getActiveAccount();


    try {

        const response =
            await msalInstance.acquireTokenSilent({

                scopes:
                    MICROSOFT_SCOPES,

                account:
                    activeAccount
            });


        oneDriveAccessToken =
            response.accessToken;


        return oneDriveAccessToken;

    } catch (silentError) {

        console.warn(
            "PDS: Silent Microsoft token request failed. Opening login.",
            silentError
        );


        try {

            const response =
                await msalInstance.acquireTokenPopup({

                    scopes:
                        MICROSOFT_SCOPES
                });


            oneDriveAccessToken =
                response.accessToken;


            microsoftAccount =
                response.account ||
                microsoftAccount;


            return oneDriveAccessToken;

        } catch (popupError) {

            console.error(
                "PDS: Microsoft token acquisition failed:",
                popupError
            );


            showMessage(
                "OneDrive authorization failed.",
                "error"
            );


            return null;
        }
    }
}


/* =========================================================
   GRAPH API REQUEST
========================================================= */

async function graphRequest(
    endpoint,
    options = {}
) {

    const token =
        await getOneDriveAccessToken();


    if (!token) {

        throw new Error(
            "No Microsoft access token available."
        );
    }


    const headers = {

        Authorization:
            `Bearer ${token}`,

        Accept:
            "application/json",

        ...(options.headers || {})
    };


    const response =
        await fetch(
            ONEDRIVE_GRAPH_ROOT +
            endpoint,
            {
                ...options,
                headers
            }
        );


    if (!response.ok) {

        let errorText = "";


        try {

            errorText =
                await response.text();

        } catch {
            errorText =
                response.statusText;
        }


        throw new Error(
            `Microsoft Graph ${response.status}: ${errorText}`
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

        return response.json();
    }


    return response.text();
}


/* =========================================================
   FIND EXCEL FILE IN ONEDRIVE
========================================================= */

async function findOneDriveWorkbook() {

    const encodedFileName =
        encodeURIComponent(
            ONEDRIVE_FILE_NAME
        );


    /*
     * Search the user's OneDrive for the
     * exact workbook name.
     */

    const data =
        await graphRequest(
            `/me/drive/root/search(q='${encodedFileName}')`
        );


    const items =
        Array.isArray(data?.value)
            ? data.value
            : [];


    const workbook =
        items.find(
            item =>
                item?.name?.toLowerCase() ===
                ONEDRIVE_FILE_NAME.toLowerCase()
        );


    if (!workbook) {

        throw new Error(
            `Could not find "${ONEDRIVE_FILE_NAME}" in OneDrive.`
        );
    }


    return workbook;
}


/* =========================================================
   LOAD OVERALL WORKSHEET
========================================================= */

async function loadOneDriveOverallSheet() {

    console.log(
        "PDS: Loading OVERALL worksheet..."
    );


    try {

        const workbook =
            await findOneDriveWorkbook();


        const worksheetName =
            encodeURIComponent(
                ONEDRIVE_SHEET_NAME
            );


        const rangeResponse =
            await graphRequest(
                `/me/drive/items/${workbook.id}/workbook/worksheets('${worksheetName}')/usedRange(valuesOnly=false)`
            );


        if (!rangeResponse) {

            throw new Error(
                "The OVERALL worksheet returned no data."
            );
        }


        const values =
            rangeResponse.values ||
            [];


        if (!values.length) {

            throw new Error(
                "The OVERALL worksheet is empty."
            );
        }


        /*
         * Excel row 1 in the returned usedRange
         * may not necessarily correspond to
         * worksheet row 1.
         *
         * We normalize the returned matrix
         * into headers + data rows.
         */

        const normalized =
            normalizeWorkbookMatrix(
                values
            );


        oneDriveHeaders =
            normalized.headers;


        oneDriveWorkbookRows =
            normalized.rows.map(
                row =>
                    rowToProject(
                        row,
                        oneDriveHeaders
                    )
            );


        console.log(
            "PDS: OVERALL loaded:",
            oneDriveWorkbookRows.length,
            "records"
        );


        return {

            workbook,

            values,

            headers:
                oneDriveHeaders,

            projects:
                oneDriveWorkbookRows
        };

    } catch (error) {

        console.error(
            "PDS: Failed to load OVERALL:",
            error
        );


        showMessage(
            "Unable to load the OVERALL sheet: " +
            error.message,
            "error"
        );


        return null;
    }
}


/* =========================================================
   NORMALIZE EXCEL MATRIX
========================================================= */

function normalizeWorkbookMatrix(
    values
) {

    if (
        !Array.isArray(values) ||
        values.length === 0
    ) {

        return {

            headers: [],

            rows: []
        };
    }


    let headerIndex =
        -1;


    /*
     * Find the row containing the project
     * monitoring headers.
     */

    for (
        let i = 0;
        i < Math.min(values.length, 20);
        i++
    ) {

        const row =
            Array.isArray(values[i])
                ? values[i]
                : [];


        const text =
            row
                .map(
                    value =>
                        String(
                            value ?? ""
                        )
                            .trim()
                            .toUpperCase()
                )
                .join(" | ");


        if (
            text.includes(
                "PROJECT TITLE AS PER GAA"
            ) ||
            text.includes(
                "ALLOCATION"
            ) ||
            text.includes(
                "MUNICIPALITY"
            )
        ) {

            headerIndex =
                i;

            break;
        }
    }


    /*
     * If the header cannot be detected,
     * use the first non-empty row.
     */

    if (headerIndex < 0) {

        for (
            let i = 0;
            i < values.length;
            i++
        ) {

            const row =
                values[i] || [];


            if (
                row.some(
                    value =>
                        String(
                            value ?? ""
                        ).trim() !== ""
                )
            ) {

                headerIndex =
                    i;

                break;
            }
        }
    }


    if (headerIndex < 0) {

        return {

            headers: [],

            rows: []
        };
    }


    const headers =
        (values[headerIndex] || [])
            .map(
                value =>
                    String(
                        value ?? ""
                    ).trim()
            );


    const rows =
        values
            .slice(headerIndex + 1)
            .filter(
                row =>
                    Array.isArray(row) &&
                    row.some(
                        value =>
                            String(
                                value ?? ""
                            ).trim() !== ""
                    )
            );


    return {

        headers,

        rows
    };
}
/* =========================================================
   NORMALIZE HEADER NAME
========================================================= */

function normalizeHeaderName(value) {

    return String(value ?? "")
        .replace(/\r?\n/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}


/* =========================================================
   FIND HEADER INDEX
========================================================= */

function findHeaderIndex(
    headers,
    names
) {

    if (!Array.isArray(headers)) {
        return -1;
    }


    const wanted =
        Array.isArray(names)
            ? names
            : [names];


    const normalizedWanted =
        wanted.map(
            name =>
                normalizeHeaderName(name)
        );


    return headers.findIndex(
        header =>
            normalizedWanted.includes(
                normalizeHeaderName(header)
            )
    );
}


/* =========================================================
   GET VALUE FROM EXCEL ROW
========================================================= */

function getRowValue(
    row,
    headers,
    names
) {

    const index =
        findHeaderIndex(
            headers,
            names
        );


    if (
        index < 0 ||
        !Array.isArray(row)
    ) {

        return "";
    }


    return row[index] ?? "";
}


/* =========================================================
   CONVERT EXCEL VALUE TO NUMBER
========================================================= */

function excelNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return null;
    }


    if (
        typeof value === "number"
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
        : null;
}


/* =========================================================
   CONVERT EXCEL DATE
========================================================= */

function excelDateToJS(
    value
) {

    if (!value) {
        return null;
    }


    if (
        value instanceof Date
    ) {

        return value;
    }


    /*
     * Microsoft Graph can return Excel
     * dates as ISO strings or numeric
     * serial values depending on the
     * workbook/range.
     */

    if (
        typeof value === "number"
    ) {

        /*
         * Excel's default 1900 date system.
         */

        const excelEpoch =
            new Date(
                Date.UTC(
                    1899,
                    11,
                    30
                )
            );


        return new Date(
            excelEpoch.getTime() +
            value * 86400000
        );
    }


    const parsed =
        new Date(value);


    if (
        !Number.isNaN(
            parsed.getTime()
        )
    ) {

        return parsed;
    }


    return null;
}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
    value
) {

    if (!value) {
        return "";
    }


    const date =
        excelDateToJS(value);


    if (!date) {
        return String(value);
    }


    return date.toLocaleDateString(
        "en-PH",
        {
            year: "numeric",
            month: "short",
            day: "2-digit"
        }
    );
}


/* =========================================================
   NORMALIZE STATUS
========================================================= */

function normalizeStatus(
    value
) {

    const text =
        String(
            value ?? ""
        ).trim();


    if (!text) {
        return "NOT STARTED";
    }


    return text.toUpperCase();
}


/* =========================================================
   NORMALIZE PERCENTAGE
========================================================= */

function normalizePercentage(
    value
) {

    const number =
        excelNumber(value);


    if (number === null) {
        return 0;
    }


    /*
     * Excel percentages may arrive as:
     *
     * 0.75  -> 75%
     * 75    -> 75%
     *
     * Normalize everything to 0–100.
     */

    if (
        number >= 0 &&
        number <= 1
    ) {

        return number * 100;
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
   PROJECT OBJECT FROM EXCEL ROW
========================================================= */

function rowToProject(
    row,
    headers
) {

    const project = {};


    /*
     * Preserve the original Excel row.
     * This is important because saving
     * should update the correct row.
     */

    project.__excelRow =
        Array.isArray(row)
            ? [...row]
            : [];


    project.__headers =
        Array.isArray(headers)
            ? [...headers]
            : [];


    project.category =
        getRowValue(
            row,
            headers,
            [
                "CATEGORY"
            ]
        );


    project.program =
        getRowValue(
            row,
            headers,
            [
                "PROGRAM"
            ]
        );


    project.subProgram =
        getRowValue(
            row,
            headers,
            [
                "SUB-PROGRAM",
                "SUB PROGRAM"
            ]
        );


    project.projectTitle =
        getRowValue(
            row,
            headers,
            [
                "PROJECT TITLE AS PER GAA",
                "PROJECT TITLE"
            ]
        );


    project.projectTitleGAA =
        project.projectTitle;


    project.noOfProjects =
        getRowValue(
            row,
            headers,
            [
                "NO. OF PROJS",
                "NO OF PROJS",
                "NO. OF PROJECTS"
            ]
        );


    project.allocation =
        excelNumber(
            getRowValue(
                row,
                headers,
                [
                    "ALLOCATION"
                ]
            )
        );


    project.municipality =
        getRowValue(
            row,
            headers,
            [
                "MUNICIPALITY"
            ]
        );


    project.program2 =
        getRowValue(
            row,
            headers,
            [
                "PROGRAM2",
                "PROGRAM 2"
            ]
        );


    project.plan =
        getRowValue(
            row,
            headers,
            [
                "PLAN"
            ]
        );


    project.advertisementBatch =
        getRowValue(
            row,
            headers,
            [
                "ADVERTISEMENT BATCH",
                "ADVERTISEMENT"
            ]
        );


    project.contractId =
        getRowValue(
            row,
            headers,
            [
                "CONTRACT ID"
            ]
        );


    project.canvass =
        getRowValue(
            row,
            headers,
            [
                "CANVASS"
            ]
        );


    project.marketScoping =
        getRowValue(
            row,
            headers,
            [
                "MARKET SCOPING"
            ]
        );


    project.certOfDed =
        getRowValue(
            row,
            headers,
            [
                "CERT OF DED"
            ]
        );


    project.certOfCmpd =
        getRowValue(
            row,
            headers,
            [
                "CERT OF CMPD"
            ]
        );


    project.certOfValidation =
        getRowValue(
            row,
            headers,
            [
                "CERT OF VALIDATION"
            ]
        );


    project.printedCompleteProgram =
        getRowValue(
            row,
            headers,
            [
                "PRINTED COMPLETE PROGRAM"
            ]
        );


    project.submittedExcelFile =
        getRowValue(
            row,
            headers,
            [
                "SUBMITTED EXCEL FILE"
            ]
        );


    project.remarks =
        getRowValue(
            row,
            headers,
            [
                "REMARKS"
            ]
        );


    project.architectural =
        getRowValue(
            row,
            headers,
            [
                "ARCHITECTURAL"
            ]
        );


    project.structural =
        getRowValue(
            row,
            headers,
            [
                "STRUCTURAL"
            ]
        );


    project.plumbing =
        getRowValue(
            row,
            headers,
            [
                "PLUMBING"
            ]
        );


    project.electrical =
        getRowValue(
            row,
            headers,
            [
                "ELECTRICAL"
            ]
        );


    project.mechanical =
        getRowValue(
            row,
            headers,
            [
                "MECHANICAL"
            ]
        );


    project.survey =
        getRowValue(
            row,
            headers,
            [
                "SURVEY"
            ]
        );


    project.printedCompletePlan =
        getRowValue(
            row,
            headers,
            [
                "PRINTED COMPLETE PLAN"
            ]
        );


    project.remarks2 =
        getRowValue(
            row,
            headers,
            [
                "REMARKS2",
                "REMARKS 2"
            ]
        );


    project.programStatus =
        normalizeStatus(
            getRowValue(
                row,
                headers,
                [
                    "PROGRAM STATUS"
                ]
            )
        );


    project.programPercent =
        normalizePercentage(
            getRowValue(
                row,
                headers,
                [
                    "PROGRAM % COMPLETE",
                    "PROGRAM PERCENT COMPLETE"
                ]
            )
        );


    project.planStatus =
        normalizeStatus(
            getRowValue(
                row,
                headers,
                [
                    "PLAN STATUS"
                ]
            )
        );


    project.planPercent =
        normalizePercentage(
            getRowValue(
                row,
                headers,
                [
                    "PLAN % COMPLETE",
                    "PLAN PERCENT COMPLETE"
                ]
            )
        );


    project.lastUpdated =
        getRowValue(
            row,
            headers,
            [
                "LAST UPDATED"
            ]
        );


    project.daysSinceUpdate =
        excelNumber(
            getRowValue(
                row,
                headers,
                [
                    "DAYS SINCE UPDATE"
                ]
            )
        );


    project.overallStatus =
        normalizeStatus(
            getRowValue(
                row,
                headers,
                [
                    "OVERALL STATUS"
                ]
            )
        );


    /*
     * Generate a stable project ID.
     *
     * The Excel row number is preferred
     * because it points directly to the
     * source record.
     */

    project.id =
        `overall-row-${project.__excelRowNumber || ""}`;


    if (
        !project.projectTitle
    ) {

        project.projectTitle =
            project.contractId ||
            project.projectTitleGAA ||
            "Untitled Project";
    }


    return project;
}


/* =========================================================
   ASSIGN EXCEL ROW NUMBERS
========================================================= */

function assignExcelRowNumbers(
    projects,
    rangeResponse
) {

    if (!Array.isArray(projects)) {
        return projects;
    }


    /*
     * We normally read the complete usedRange.
     * The actual worksheet starting row is
     * obtained from the Graph range address.
     *
     * Example:
     * OVERALL!A8:AI150
     */

    let startRow =
        1;


    const address =
        String(
            rangeResponse?.address ||
            ""
        );


    const match =
        address.match(
            /![A-Z]+(\d+):/i
        );


    if (match) {

        startRow =
            Number(match[1]);
    }


    /*
     * projects correspond to rows after
     * the detected header.
     */

    const headerIndex =
        projects.__headerIndex || 0;


    projects.forEach(
        (project, index) => {

            project.__excelRowNumber =
                startRow +
                headerIndex +
                1 +
                index;


            project.id =
                `overall-row-${project.__excelRowNumber}`;
        }
    );


    return projects;
}


/* =========================================================
   LOAD MONITORING PROJECTS FROM ONEDRIVE
========================================================= */

async function refreshMonitoringFromOneDrive() {

    const result =
        await loadOneDriveOverallSheet();


    if (!result) {

        return [];
    }


    let projects =
        result.projects || [];


    /*
     * Store row information so that
     * website edits know exactly which
     * Excel row must be updated.
     */

    const values =
        result.values || [];


    const headers =
        result.headers || [];


    let headerIndex =
        -1;


    for (
        let i = 0;
        i < values.length;
        i++
    ) {

        const row =
            values[i] || [];


        const joined =
            row
                .map(
                    value =>
                        normalizeHeaderName(
                            value
                        )
                )
                .join("|");


        if (
            joined.includes(
                "PROJECT TITLE AS PER GAA"
            )
        ) {

            headerIndex =
                i;

            break;
        }
    }


    if (headerIndex < 0) {
        headerIndex = 0;
    }


    projects.forEach(
        (project, index) => {

            /*
             * +1 because Excel rows are
             * 1-based and the project begins
             * after the header.
             */

            project.__excelRowNumber =
                headerIndex +
                index +
                2;


            project.id =
                `overall-row-${project.__excelRowNumber}`;

            project.__workbookId =
                result.workbook?.id ||
                null;
        }
    );


    cachedMonitoringProjects =
        projects;


    oneDriveWorkbookRows =
        projects;


    oneDriveHeaders =
        headers;


    console.log(
        "PDS: Monitoring cache refreshed:",
        cachedMonitoringProjects.length
    );


    return cachedMonitoringProjects;
}


/* =========================================================
   GET MONITORING PROJECTS
========================================================= */

async function getMonitoringProjects(
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


    return refreshMonitoringFromOneDrive();
}


/* =========================================================
   FIND MONITORING PROJECT BY ID
========================================================= */

function findMonitoringProject(
    projectId
) {

    if (!projectId) {
        return null;
    }


    return (
        cachedMonitoringProjects.find(
            project =>
                String(
                    project.id
                ) === String(projectId)
        ) ||
        null
    );
}


/* =========================================================
   FIND MONITORING PROJECT BY TITLE
========================================================= */

function findMonitoringProjectByTitle(
    title
) {

    if (!title) {
        return null;
    }


    const target =
        String(title)
            .trim()
            .toLowerCase();


    return (
        cachedMonitoringProjects.find(
            project =>
                String(
                    project.projectTitle || ""
                )
                    .trim()
                    .toLowerCase() === target
        ) ||
        null
    );
}
/* =========================================================
   FIND COLUMN INDEX FOR UPDATE
========================================================= */

function getExcelColumnIndex(
    headers,
    names
) {

    return findHeaderIndex(
        headers,
        names
    );
}


/* =========================================================
   EXCEL COLUMN LETTER
========================================================= */

function excelColumnLetter(
    columnNumber
) {

    let result = "";
    let number = columnNumber;


    while (number > 0) {

        const remainder =
            (number - 1) % 26;


        result =
            String.fromCharCode(
                65 + remainder
            ) + result;


        number =
            Math.floor(
                (number - 1) / 26
            );
    }


    return result;
}


/* =========================================================
   BUILD EXCEL CELL ADDRESS
========================================================= */

function excelCellAddress(
    rowNumber,
    columnNumber
) {

    return (
        `${excelColumnLetter(columnNumber)}${rowNumber}`
    );
}


/* =========================================================
   CONVERT VALUE FOR EXCEL
========================================================= */

function valueForExcel(
    value,
    header
) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";
    }


    const normalizedHeader =
        normalizeHeaderName(
            header
        );


    /*
     * Percentage columns are stored in
     * Excel as decimal fractions.
     *
     * Example:
     * Website 75 -> Excel 0.75
     */

    if (
        normalizedHeader.includes(
            "% COMPLETE"
        )
    ) {

        const number =
            Number(value);


        if (
            Number.isFinite(number)
        ) {

            return number > 1
                ? number / 100
                : number;
        }
    }


    /*
     * Allocation and numeric fields.
     */

    if (
        normalizedHeader ===
            "ALLOCATION" ||
        normalizedHeader ===
            "NO. OF PROJS" ||
        normalizedHeader ===
            "DAYS SINCE UPDATE"
    ) {

        const number =
            excelNumber(value);


        return number === null
            ? ""
            : number;
    }


    return value;
}


/* =========================================================
   UPDATE EXCEL CELL
========================================================= */

async function updateExcelCell(
    workbookId,
    worksheetName,
    rowNumber,
    columnNumber,
    value,
    header
) {

    if (
        !workbookId ||
        !rowNumber ||
        !columnNumber
    ) {

        throw new Error(
            "Invalid Excel cell location."
        );
    }


    const address =
        excelCellAddress(
            rowNumber,
            columnNumber
        );


    const encodedWorksheet =
        encodeURIComponent(
            worksheetName
        );


    const endpoint =
        `/me/drive/items/${workbookId}` +
        `/workbook/worksheets('${encodedWorksheet}')` +
        `/range(address='${address}')`;


    const excelValue =
        valueForExcel(
            value,
            header
        );


    return graphRequest(
        endpoint,
        {

            method: "PATCH",

            headers: {

                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({

                values: [
                    [
                        excelValue
                    ]
                ]
            })
        }
    );
}


/* =========================================================
   SAVE PROJECT CHANGES TO OVERALL
========================================================= */

async function saveProjectToOverall(
    project,
    changes = {}
) {

    if (!project) {

        throw new Error(
            "No project was supplied."
        );
    }


    const workbookId =
        project.__workbookId ||
        oneDriveWorkbookRows.find(
            item =>
                item.id === project.id
        )?.__workbookId;


    if (!workbookId) {

        throw new Error(
            "Workbook ID is missing. Refresh the OVERALL sheet first."
        );
    }


    const rowNumber =
        Number(
            project.__excelRowNumber
        );


    if (
        !Number.isFinite(rowNumber) ||
        rowNumber < 1
    ) {

        throw new Error(
            "Excel row number is missing."
        );
    }


    if (
        !oneDriveHeaders ||
        !oneDriveHeaders.length
    ) {

        throw new Error(
            "Excel headers have not been loaded."
        );
    }


    const entries =
        Object.entries(
            changes
        );


    if (!entries.length) {

        return {

            success: true,

            updated: 0,

            rowNumber
        };
    }


    const fieldMap = {

        category: [
            "CATEGORY"
        ],

        program: [
            "PROGRAM"
        ],

        subProgram: [
            "SUB-PROGRAM",
            "SUB PROGRAM"
        ],

        projectTitle: [
            "PROJECT TITLE AS PER GAA"
        ],

        projectTitleGAA: [
            "PROJECT TITLE AS PER GAA"
        ],

        noOfProjects: [
            "NO. OF PROJS"
        ],

        allocation: [
            "ALLOCATION"
        ],

        municipality: [
            "MUNICIPALITY"
        ],

        program2: [
            "PROGRAM2"
        ],

        plan: [
            "PLAN"
        ],

        advertisementBatch: [
            "ADVERTISEMENT BATCH"
        ],

        contractId: [
            "CONTRACT ID"
        ],

        canvass: [
            "CANVASS"
        ],

        marketScoping: [
            "MARKET SCOPING"
        ],

        certOfDed: [
            "CERT OF DED"
        ],

        certOfCmpd: [
            "CERT OF CMPD"
        ],

        certOfValidation: [
            "CERT OF VALIDATION"
        ],

        printedCompleteProgram: [
            "PRINTED COMPLETE PROGRAM"
        ],

        submittedExcelFile: [
            "SUBMITTED EXCEL FILE"
        ],

        remarks: [
            "REMARKS"
        ],

        architectural: [
            "ARCHITECTURAL"
        ],

        structural: [
            "STRUCTURAL"
        ],

        plumbing: [
            "PLUMBING"
        ],

        electrical: [
            "ELECTRICAL"
        ],

        mechanical: [
            "MECHANICAL"
        ],

        survey: [
            "SURVEY"
        ],

        printedCompletePlan: [
            "PRINTED COMPLETE PLAN"
        ],

        remarks2: [
            "REMARKS2",
            "REMARKS 2"
        ],

        programStatus: [
            "PROGRAM STATUS"
        ],

        programPercent: [
            "PROGRAM % COMPLETE"
        ],

        planStatus: [
            "PLAN STATUS"
        ],

        planPercent: [
            "PLAN % COMPLETE"
        ],

        lastUpdated: [
            "LAST UPDATED"
        ],

        daysSinceUpdate: [
            "DAYS SINCE UPDATE"
        ],

        overallStatus: [
            "OVERALL STATUS"
        ]
    };


    let updatedCount =
        0;


    /*
     * Update only the fields that changed.
     *
     * This is intentional:
     * we do not overwrite the entire row.
     */

    for (
        const [field, value] of entries
    ) {

        const possibleHeaders =
            fieldMap[field] ||
            [field];


        const columnIndex =
            findHeaderIndex(
                oneDriveHeaders,
                possibleHeaders
            );


        if (columnIndex < 0) {

            console.warn(
                `PDS: Excel column not found for field "${field}".`
            );

            continue;
        }


        /*
         * Excel columns are 1-based.
         */

        const columnNumber =
            columnIndex + 1;


        await updateExcelCell(
            workbookId,
            ONEDRIVE_SHEET_NAME,
            rowNumber,
            columnNumber,
            value,
            oneDriveHeaders[columnIndex]
        );


        updatedCount++;
    }


    /*
     * Update local cache after successful
     * OneDrive writes.
     */

    Object.assign(
        project,
        changes
    );


    /*
     * Recalculate local derived values.
     */

    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "programPercent"
        )
    ) {

        project.programPercent =
            normalizePercentage(
                project.programPercent
            );
    }


    if (
        Object.prototype.hasOwnProperty.call(
            changes,
            "planPercent"
        )
    ) {

        project.planPercent =
            normalizePercentage(
                project.planPercent
            );
    }


    /*
     * Keep cached project synchronized.
     */

    const cached =
        findMonitoringProject(
            project.id
        );


    if (cached) {

        Object.assign(
            cached,
            changes
        );
    }


    return {

        success: true,

        updated:
            updatedCount,

        rowNumber,

        project
    };
}


/* =========================================================
   SAVE COMPLETE MONITORING PROJECT
========================================================= */

async function saveMonitoringProject(
    projectId,
    changes
) {

    let project =
        findMonitoringProject(
            projectId
        );


    /*
     * If the project isn't currently cached,
     * refresh OneDrive first.
     */

    if (!project) {

        await refreshMonitoringFromOneDrive();


        project =
            findMonitoringProject(
                projectId
            );
    }


    if (!project) {

        throw new Error(
            "Project could not be found in the OVERALL sheet."
        );
    }


    const result =
        await saveProjectToOverall(
            project,
            changes
        );


    if (result.success) {

        showMessage(
            `Saved ${result.updated} change(s) to OneDrive Excel.`,
            "success"
        );
    }


    return result;
}


/* =========================================================
   REFRESH AFTER SAVE
========================================================= */

async function refreshAfterExcelSave() {

    try {

        await refreshMonitoringFromOneDrive();


        /*
         * Re-render the currently visible
         * monitoring page if available.
         */

        if (
            typeof renderMonitoringProjects ===
            "function"
        ) {

            await renderMonitoringProjects(
                cachedMonitoringProjects
            );
        }


        if (
            typeof renderProjects ===
            "function"
        ) {

            /*
             * Only refresh if the project
             * rendering function is being
             * used by the monitoring page.
             */

            try {

                await renderProjects(
                    cachedMonitoringProjects
                );

            } catch {
                /*
                 * Ignore incompatible legacy
                 * renderProjects signatures.
                 */
            }
        }


    } catch (error) {

        console.warn(
            "PDS: Post-save refresh failed:",
            error
        );
    }
}


/* =========================================================
   OPEN EXCEL IN ONEDRIVE
========================================================= */

async function openOverallWorkbook() {

    try {

        const workbook =
            await findOneDriveWorkbook();


        if (
            workbook?.webUrl
        ) {

            window.open(
                workbook.webUrl,
                "_blank",
                "noopener,noreferrer"
            );


            return true;
        }


        showMessage(
            "The Excel workbook does not have a web URL.",
            "warning"
        );


        return false;

    } catch (error) {

        console.error(
            "PDS: Unable to open workbook:",
            error
        );


        showMessage(
            "Unable to open the OneDrive Excel file: " +
            error.message,
            "error"
        );


        return false;
    }
}


/* =========================================================
   CREATE ONEDRIVE BUTTON
========================================================= */

function setupOneDriveButton() {

    const buttons =
        document.querySelectorAll(
            "#connectOneDrive, #oneDriveConnect, [data-action='connect-onedrive']"
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
                async event => {

                    event.preventDefault();


                    await signInToMicrosoft();

                }
            );
        }
    );


    const openButtons =
        document.querySelectorAll(
            "#openOverallExcel, #openOneDriveExcel, [data-action='open-overall-excel']"
        );


    openButtons.forEach(
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

                    await openOverallWorkbook();

                }
            );
        }
    );
}


/* =========================================================
   INITIALIZE PROJECT MONITORING
========================================================= */

async function initializeProjectMonitoring() {

    console.log(
        "PDS: Initializing Project Monitoring..."
    );


    setupOneDriveButton();


    /*
     * Do not automatically force a Microsoft
     * login popup on page load.
     *
     * The user can connect OneDrive when
     * Project Monitoring is opened.
     */

    if (
        !MICROSOFT_CLIENT_ID ||
        MICROSOFT_CLIENT_ID ===
            "PASTE-YOUR-MICROSOFT-CLIENT-ID-HERE"
    ) {

        console.warn(
            "PDS: OneDrive Client ID is not configured."
        );


        updateOneDriveStatus(
            "OneDrive setup required."
        );


        return;
    }


    /*
     * If an existing Microsoft account
     * is already cached, load the workbook.
     */

    try {

        if (
            msalInstance &&
            msalInstance.getAllAccounts().length
        ) {

            microsoftAccount =
                msalInstance.getAllAccounts()[0];


            oneDriveReady =
                true;


            await refreshMonitoringFromOneDrive();

        }

    } catch (error) {

        console.warn(
            "PDS: Existing OneDrive session could not be restored:",
            error
        );
    }
}
/* =========================================================
   PROJECT MONITORING STATE
========================================================= */

let monitoringState = {

    search: "",

    category: "",

    municipality: "",

    status: "",

    sortBy: "projectTitle",

    sortDirection: "asc",

    currentPage: 1,

    pageSize: 25,

    selectedProjectId: null
};


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
                        .toLowerCase() !==
                    municipality
                ) {

                    return false;
                }


                if (status) {

                    const projectStatus =
                        String(
                            project.overallStatus ||
                            ""
                        )
                            .toLowerCase();


                    if (
                        projectStatus !==
                        status
                    ) {

                        return false;
                    }
                }


                return true;
            }
        );


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

            let aValue =
                a?.[sortBy] ?? "";


            let bValue =
                b?.[sortBy] ?? "";


            if (
                typeof aValue ===
                "number" ||
                typeof bValue ===
                "number"
            ) {

                aValue =
                    Number(aValue) || 0;

                bValue =
                    Number(bValue) || 0;

            } else {

                aValue =
                    String(
                        aValue
                    ).toLowerCase();

                bValue =
                    String(
                        bValue
                    ).toLowerCase();
            }


            if (
                aValue <
                bValue
            ) {

                return -1 * direction;
            }


            if (
                aValue >
                bValue
            ) {

                return 1 * direction;
            }


            return 0;
        }
    );


    return projects;
}


/* =========================================================
   POPULATE MONITORING FILTERS
========================================================= */

function populateMonitoringFilters() {

    const categorySelect =
        $("monitoringCategoryFilter");


    const municipalitySelect =
        $("monitoringMunicipalityFilter");


    const statusSelect =
        $("monitoringStatusFilter");


    const projects =
        Array.isArray(
            cachedMonitoringProjects
        )
            ? cachedMonitoringProjects
            : [];


    if (categorySelect) {

        const categories =
            [
                ...new Set(
                    projects
                        .map(
                            project =>
                                String(
                                    project.category ||
                                    ""
                                ).trim()
                        )
                        .filter(Boolean)
                )
            ]
                .sort(
                    (a, b) =>
                        a.localeCompare(b)
                );


        const currentValue =
            categorySelect.value;


        categorySelect.innerHTML =
            `<option value="">All Categories</option>`;


        categories.forEach(
            category => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    category;


                option.textContent =
                    category;


                categorySelect.appendChild(
                    option
                );
            }
        );


        categorySelect.value =
            currentValue;
    }


    if (municipalitySelect) {

        const municipalities =
            [
                ...new Set(
                    projects
                        .map(
                            project =>
                                String(
                                    project.municipality ||
                                    ""
                                ).trim()
                        )
                        .filter(Boolean)
                )
            ]
                .sort(
                    (a, b) =>
                        a.localeCompare(b)
                );


        const currentValue =
            municipalitySelect.value;


        municipalitySelect.innerHTML =
            `<option value="">All Municipalities</option>`;


        municipalities.forEach(
            municipality => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    municipality;


                option.textContent =
                    municipality;


                municipalitySelect.appendChild(
                    option
                );
            }
        );


        municipalitySelect.value =
            currentValue;
    }


    if (statusSelect) {

        const statuses =
            [
                ...new Set(
                    projects
                        .map(
                            project =>
                                String(
                                    project.overallStatus ||
                                    ""
                                ).trim()
                        )
                        .filter(Boolean)
                )
            ]
                .sort(
                    (a, b) =>
                        a.localeCompare(b)
                );


        const currentValue =
            statusSelect.value;


        statusSelect.innerHTML =
            `<option value="">All Statuses</option>`;


        statuses.forEach(
            status => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    status;


                option.textContent =
                    status;


                statusSelect.appendChild(
                    option
                );
            }
        );


        statusSelect.value =
            currentValue;
    }
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
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
   FORMAT CURRENCY
========================================================= */

function formatCurrency(
    value
) {

    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        return "₱0.00";
    }


    return number.toLocaleString(
        "en-PH",
        {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}


/* =========================================================
   PROGRESS BAR
========================================================= */

function createProgressBar(
    percentage
) {

    const value =
        Math.max(
            0,
            Math.min(
                100,
                Number(
                    percentage
                ) || 0
            )
        );


    return `
        <div class="pds-progress">
            <div
                class="pds-progress-track"
                style="
                    width:100%;
                    height:8px;
                    background:#e5e7eb;
                    border-radius:999px;
                    overflow:hidden;
                "
            >
                <div
                    class="pds-progress-fill"
                    style="
                        width:${value}%;
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
                ${value.toFixed(1)}%
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
   RENDER MONITORING PROJECTS
========================================================= */

async function renderMonitoringProjects(
    projects = null
) {

    const container =
        $("monitoringProjectsContainer") ||
        $("projectMonitoringContainer") ||
        $("monitoringTableBody");


    if (!container) {

        console.warn(
            "PDS: Monitoring container was not found."
        );

        return;
    }


    const source =
        Array.isArray(projects)
            ? projects
            : getFilteredMonitoringProjects();


    /*
     * If the target is a table body, render
     * table rows only.
     */

    const isTableBody =
        container.tagName ===
        "TBODY";


    if (isTableBody) {

        container.innerHTML =
            "";


        source.forEach(
            project => {

                const tr =
                    document.createElement(
                        "tr"
                    );


                tr.dataset.projectId =
                    project.id;


                tr.innerHTML = `
                    <td>
                        ${escapeHTML(
                            project.projectTitle
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            project.municipality
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            project.allocation
                        )}
                    </td>

                    <td>
                        ${createProgressBar(
                            project.programPercent
                        )}
                    </td>

                    <td>
                        ${createProgressBar(
                            project.planPercent
                        )}
                    </td>

                    <td>
                        ${createStatusBadge(
                            project.overallStatus
                        )}
                    </td>

                    <td>
                        <button
                            type="button"
                            class="monitoring-edit-button"
                            data-project-id="${escapeHTML(
                                project.id
                            )}"
                        >
                            Edit
                        </button>
                    </td>
                `;


                container.appendChild(
                    tr
                );
            }
        );


    } else {

        container.innerHTML =
            "";


        if (!source.length) {

            container.innerHTML = `
                <div
                    class="pds-empty-state"
                    style="
                        padding:40px;
                        text-align:center;
                    "
                >
                    No project monitoring records found.
                </div>
            `;


            return;
        }


        const table =
            document.createElement(
                "table"
            );


        table.className =
            "pds-monitoring-table";


        table.innerHTML = `
            <thead>
                <tr>

                    <th>Project Title</th>

                    <th>Municipality</th>

                    <th>Allocation</th>

                    <th>Program</th>

                    <th>Plan</th>

                    <th>Overall Status</th>

                    <th>Action</th>

                </tr>
            </thead>

            <tbody></tbody>
        `;


        const tbody =
            table.querySelector(
                "tbody"
            );


        source.forEach(
            project => {

                const tr =
                    document.createElement(
                        "tr"
                    );


                tr.dataset.projectId =
                    project.id;


                tr.innerHTML = `
                    <td>
                        <strong>
                            ${escapeHTML(
                                project.projectTitle
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(
                            project.municipality
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            project.allocation
                        )}
                    </td>

                    <td>
                        ${createProgressBar(
                            project.programPercent
                        )}
                    </td>

                    <td>
                        ${createProgressBar(
                            project.planPercent
                        )}
                    </td>

                    <td>
                        ${createStatusBadge(
                            project.overallStatus
                        )}
                    </td>

                    <td>
                        <button
                            type="button"
                            class="monitoring-edit-button"
                            data-project-id="${escapeHTML(
                                project.id
                            )}"
                        >
                            Edit
                        </button>
                    </td>
                `;


                tbody.appendChild(
                    tr
                );
            }
        );


        container.appendChild(
            table
        );
    }


    /*
     * Bind edit buttons after rendering.
     */

    container
        .querySelectorAll(
            ".monitoring-edit-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();


                        const projectId =
                            button.dataset.projectId;


                        editMonitoringProject(
                            projectId
                        );
                    }
                );
            }
        );
}


/* =========================================================
   LOAD AND RENDER PROJECT MONITORING
========================================================= */

async function loadProjectMonitoring(
    forceRefresh = false
) {

    const projects =
        await getMonitoringProjects(
            forceRefresh
        );


    populateMonitoringFilters();


    monitoringState.currentPage =
        1;


    const filtered =
        getFilteredMonitoringProjects();


    await renderMonitoringProjects(
        filtered
    );


    updateMonitoringSummary(
        filtered
    );


    return filtered;
}


/* =========================================================
   MONITORING SUMMARY
========================================================= */

function updateMonitoringSummary(
    projects
) {

    const data =
        Array.isArray(projects)
            ? projects
            : [];


    const total =
        data.length;


    const totalAllocation =
        data.reduce(
            (sum, project) =>
                sum +
                (
                    Number(
                        project.allocation
                    ) || 0
                ),
            0
        );


    const programAverage =
        total
            ? data.reduce(
                (sum, project) =>
                    sum +
                    (
                        Number(
                            project.programPercent
                        ) || 0
                    ),
                0
            ) / total
            : 0;


    const planAverage =
        total
            ? data.reduce(
                (sum, project) =>
                    sum +
                    (
                        Number(
                            project.planPercent
                        ) || 0
                    ),
                0
            ) / total
            : 0;


    const elements = {

        total:
            document.querySelector(
                "[data-monitoring-total]"
            ),

        allocation:
            document.querySelector(
                "[data-monitoring-allocation]"
            ),

        program:
            document.querySelector(
                "[data-monitoring-program-average]"
            ),

        plan:
            document.querySelector(
                "[data-monitoring-plan-average]"
            )
    };


    if (elements.total) {

        elements.total.textContent =
            total.toLocaleString(
                "en-PH"
            );
    }


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
   MONITORING FILTER EVENTS
========================================================= */

function initializeMonitoringFilters() {

    if (
        monitoringFiltersReady
    ) {
        return;
    }


    const searchInput =
        $("monitoringSearch") ||
        $("projectMonitoringSearch");


    const categorySelect =
        $("monitoringCategoryFilter");


    const municipalitySelect =
        $("monitoringMunicipalityFilter");


    const statusSelect =
        $("monitoringStatusFilter");


    const applyFilters =
        async () => {

            monitoringState.search =
                searchInput?.value ||
                "";


            monitoringState.category =
                categorySelect?.value ||
                "";


            monitoringState.municipality =
                municipalitySelect?.value ||
                "";


            monitoringState.status =
                statusSelect?.value ||
                "";


            monitoringState.currentPage =
                1;


            const filtered =
                getFilteredMonitoringProjects();


            await renderMonitoringProjects(
                filtered
            );


            updateMonitoringSummary(
                filtered
            );
        };


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            applyFilters
        );
    }


    if (categorySelect) {

        categorySelect.addEventListener(
            "change",
            applyFilters
        );
    }


    if (municipalitySelect) {

        municipalitySelect.addEventListener(
            "change",
            applyFilters
        );
    }


    if (statusSelect) {

        statusSelect.addEventListener(
            "change",
            applyFilters
        );
    }


    monitoringFiltersReady =
        true;
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


    if (!project) {

        try {

            await refreshMonitoringFromOneDrive();

            project =
                findMonitoringProject(
                    projectId
                );

        } catch (error) {

            console.error(
                "PDS: Unable to refresh project:",
                error
            );
        }
    }


    if (!project) {

        showMessage(
            "Project was not found in the OVERALL sheet.",
            "error"
        );

        return;
    }


    monitoringState.selectedProjectId =
        project.id;


    /*
     * Use an existing modal if the HTML already
     * provides one. Otherwise create a simple
     * editor dynamically.
     */

    let modal =
        $("monitoringEditModal");


    if (!modal) {

        modal =
            createMonitoringEditModal();
    }


    populateMonitoringEditModal(
        modal,
        project
    );


    modal.classList.remove(
        "hidden"
    );


    modal.style.display =
        "flex";


    /*
     * Keep the user on the current page.
     * Do not navigate to another section.
     */

    if (
        typeof saveCurrentPageState ===
        "function"
    ) {

        try {
            saveCurrentPageState();
        } catch {
            /* ignore legacy function */
        }
    }
}


/* =========================================================
   CREATE MONITORING EDIT MODAL
========================================================= */

function createMonitoringEditModal() {

    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "monitoringEditModal";


    modal.className =
        "pds-modal";


    modal.style.position =
        "fixed";

    modal.style.inset =
        "0";

    modal.style.zIndex =
        "99990";

    modal.style.display =
        "flex";

    modal.style.alignItems =
        "center";

    modal.style.justifyContent =
        "center";

    modal.style.background =
        "rgba(0,0,0,.45)";

    modal.innerHTML = `

        <div
            class="pds-modal-content"
            style="
                width:min(900px,94vw);
                max-height:90vh;
                overflow:auto;
                background:#fff;
                border-radius:12px;
                box-shadow:0 20px 60px rgba(0,0,0,.25);
            "
        >

            <div
                style="
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    padding:18px 22px;
                    border-bottom:1px solid #e5e7eb;
                    position:sticky;
                    top:0;
                    background:#fff;
                    z-index:2;
                "
            >

                <div>

                    <div
                        style="
                            font-size:18px;
                            font-weight:700;
                        "
                    >
                        Edit Project Monitoring
                    </div>

                    <div
                        id="monitoringEditProjectTitle"
                        style="
                            margin-top:4px;
                            font-size:13px;
                            color:#6b7280;
                        "
                    ></div>

                </div>


                <button
                    type="button"
                    id="monitoringEditClose"
                    style="
                        border:0;
                        background:transparent;
                        font-size:24px;
                        cursor:pointer;
                    "
                    aria-label="Close"
                >
                    ×
                </button>

            </div>


            <form
                id="monitoringEditForm"
                style="
                    padding:22px;
                "
            >

                <input
                    type="hidden"
                    id="monitoringEditProjectId"
                >


                <div
                    style="
                        display:grid;
                        grid-template-columns:
                            repeat(2,minmax(0,1fr));
                        gap:16px;
                    "
                >

                    <label>
                        <span>Program Status</span>

                        <select
                            id="editProgramStatus"
                            name="programStatus"
                        >

                            <option value="">
                                Select status
                            </option>

                            <option value="NOT STARTED">
                                NOT STARTED
                            </option>

                            <option value="ONGOING">
                                ONGOING
                            </option>

                            <option value="COMPLETED">
                                COMPLETED
                            </option>

                            <option value="ON HOLD">
                                ON HOLD
                            </option>

                            <option value="DEFERRED">
                                DEFERRED
                            </option>

                        </select>

                    </label>


                    <label>
                        <span>Program % Complete</span>

                        <input
                            type="number"
                            id="editProgramPercent"
                            name="programPercent"
                            min="0"
                            max="100"
                            step="0.1"
                        >

                    </label>


                    <label>
                        <span>Plan Status</span>

                        <select
                            id="editPlanStatus"
                            name="planStatus"
                        >

                            <option value="">
                                Select status
                            </option>

                            <option value="NOT STARTED">
                                NOT STARTED
                            </option>

                            <option value="ONGOING">
                                ONGOING
                            </option>

                            <option value="COMPLETED">
                                COMPLETED
                            </option>

                            <option value="ON HOLD">
                                ON HOLD
                            </option>

                            <option value="DEFERRED">
                                DEFERRED
                            </option>

                        </select>

                    </label>


                    <label>
                        <span>Plan % Complete</span>

                        <input
                            type="number"
                            id="editPlanPercent"
                            name="planPercent"
                            min="0"
                            max="100"
                            step="0.1"
                        >

                    </label>


                    <label>
                        <span>Overall Status</span>

                        <select
                            id="editOverallStatus"
                            name="overallStatus"
                        >

                            <option value="">
                                Select status
                            </option>

                            <option value="NOT STARTED">
                                NOT STARTED
                            </option>

                            <option value="ONGOING">
                                ONGOING
                            </option>

                            <option value="COMPLETED">
                                COMPLETED
                            </option>

                            <option value="ON HOLD">
                                ON HOLD
                            </option>

                            <option value="DEFERRED">
                                DEFERRED
                            </option>

                        </select>

                    </label>


                    <label>
                        <span>Last Updated</span>

                        <input
                            type="date"
                            id="editLastUpdated"
                            name="lastUpdated"
                        >

                    </label>


                    <label
                        style="
                            grid-column:1/-1;
                        "
                    >
                        <span>Remarks</span>

                        <textarea
                            id="editRemarks"
                            name="remarks"
                            rows="4"
                        ></textarea>

                    </label>


                    <label
                        style="
                            grid-column:1/-1;
                        "
                    >
                        <span>Plan Remarks</span>

                        <textarea
                            id="editRemarks2"
                            name="remarks2"
                            rows="4"
                        ></textarea>

                    </label>

                </div>


                <div
                    style="
                        display:flex;
                        justify-content:flex-end;
                        gap:10px;
                        margin-top:22px;
                    "
                >

                    <button
                        type="button"
                        id="monitoringEditCancel"
                    >
                        Cancel
                    </button>


                    <button
                        type="submit"
                        id="monitoringEditSave"
                    >
                        Save to OneDrive
                    </button>

                </div>

            </form>

        </div>
    `;


    document.body.appendChild(
        modal
    );


    const closeButton =
        modal.querySelector(
            "#monitoringEditClose"
        );


    const cancelButton =
        modal.querySelector(
            "#monitoringEditCancel"
        );


    const form =
        modal.querySelector(
            "#monitoringEditForm"
        );


    closeButton?.addEventListener(
        "click",
        () => closeMonitoringEditModal()
    );


    cancelButton?.addEventListener(
        "click",
        () => closeMonitoringEditModal()
    );


    modal.addEventListener(
        "click",
        event => {

            if (
                event.target === modal
            ) {

                closeMonitoringEditModal();
            }
        }
    );


    form?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            await submitMonitoringEdit(
                modal
            );
        }
    );


    return modal;
}


/* =========================================================
   POPULATE MONITORING EDIT MODAL
========================================================= */

function populateMonitoringEditModal(
    modal,
    project
) {

    const setValue =
        (selector, value) => {

            const element =
                modal.querySelector(
                    selector
                );


            if (element) {

                element.value =
                    value ?? "";
            }
        };


    const titleElement =
        modal.querySelector(
            "#monitoringEditProjectTitle"
        );


    if (titleElement) {

        titleElement.textContent =
            project.projectTitle || "";
    }


    setValue(
        "#monitoringEditProjectId",
        project.id
    );


    setValue(
        "#editProgramStatus",
        project.programStatus
    );


    setValue(
        "#editProgramPercent",
        Number(
            project.programPercent || 0
        ).toFixed(1)
    );


    setValue(
        "#editPlanStatus",
        project.planStatus
    );


    setValue(
        "#editPlanPercent",
        Number(
            project.planPercent || 0
        ).toFixed(1)
    );


    setValue(
        "#editOverallStatus",
        project.overallStatus
    );


    /*
     * Convert the Excel date to the
     * format required by <input type="date">.
     */

    const date =
        excelDateToJS(
            project.lastUpdated
        );


    if (date) {

        const year =
            date.getFullYear();


        const month =
            String(
                date.getMonth() + 1
            ).padStart(
                2,
                "0"
            );


        const day =
            String(
                date.getDate()
            ).padStart(
                2,
                "0"
            );


        setValue(
            "#editLastUpdated",
            `${year}-${month}-${day}`
        );

    } else {

        setValue(
            "#editLastUpdated",
            ""
        );
    }


    setValue(
        "#editRemarks",
        project.remarks
    );


    setValue(
        "#editRemarks2",
        project.remarks2
    );
}


/* =========================================================
   CLOSE MONITORING EDIT MODAL
========================================================= */

function closeMonitoringEditModal() {

    const modal =
        $("monitoringEditModal");


    if (!modal) {
        return;
    }


    modal.classList.add(
        "hidden"
    );


    modal.style.display =
        "none";


    monitoringState.selectedProjectId =
        null;
}


/* =========================================================
   SUBMIT MONITORING EDIT
========================================================= */

async function submitMonitoringEdit(
    modal
) {

    const projectId =
        modal.querySelector(
            "#monitoringEditProjectId"
        )?.value;


    if (!projectId) {

        showMessage(
            "Project ID is missing.",
            "error"
        );

        return;
    }


    const saveButton =
        modal.querySelector(
            "#monitoringEditSave"
        );


    const changes = {

        programStatus:
            modal.querySelector(
                "#editProgramStatus"
            )?.value || "",

        programPercent:
            Number(
                modal.querySelector(
                    "#editProgramPercent"
                )?.value || 0
            ),

        planStatus:
            modal.querySelector(
                "#editPlanStatus"
            )?.value || "",

        planPercent:
            Number(
                modal.querySelector(
                    "#editPlanPercent"
                )?.value || 0
            ),

        overallStatus:
            modal.querySelector(
                "#editOverallStatus"
            )?.value || "",

        lastUpdated:
            modal.querySelector(
                "#editLastUpdated"
            )?.value || "",

        remarks:
            modal.querySelector(
                "#editRemarks"
            )?.value || "",

        remarks2:
            modal.querySelector(
                "#editRemarks2"
            )?.value || ""
    };


    /*
     * Validate percentages.
     */

    if (
        changes.programPercent < 0 ||
        changes.programPercent > 100
    ) {

        showMessage(
            "Program % Complete must be between 0 and 100.",
            "warning"
        );

        return;
    }


    if (
        changes.planPercent < 0 ||
        changes.planPercent > 100
    ) {

        showMessage(
            "Plan % Complete must be between 0 and 100.",
            "warning"
        );

        return;
    }


    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            "Saving...";
    }


    try {

        await saveMonitoringProject(
            projectId,
            changes
        );


        closeMonitoringEditModal();


        /*
         * Pull the latest values directly
         * from OneDrive after the write.
         */

        await refreshAfterExcelSave();


        /*
         * Re-render the filtered view.
         */

        const filtered =
            getFilteredMonitoringProjects();


        await renderMonitoringProjects(
            filtered
        );


        updateMonitoringSummary(
            filtered
        );


    } catch (error) {

        console.error(
            "PDS: Monitoring save failed:",
            error
        );


        showMessage(
            "Unable to save changes to OneDrive: " +
            error.message,
            "error"
        );

    } finally {

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "Save to OneDrive";
        }
    }
}


/* =========================================================
   OPEN MONITORING PROJECT DETAILS
========================================================= */

async function openMonitoringProject(
    projectId
) {

    let project =
        findMonitoringProject(
            projectId
        );


    if (!project) {

        await refreshMonitoringFromOneDrive();


        project =
            findMonitoringProject(
                projectId
            );
    }


    if (!project) {

        showMessage(
            "Project not found.",
            "error"
        );

        return;
    }


    monitoringState.selectedProjectId =
        project.id;


    /*
     * If the website already has a project
     * details renderer, use it.
     */

    if (
        typeof showProjectDetails ===
        "function"
    ) {

        try {

            await showProjectDetails(
                project
            );

            return;

        } catch (error) {

            console.warn(
                "PDS: Existing project details renderer failed:",
                error
            );
        }
    }


    /*
     * Otherwise use a simple details modal.
     */

    showSimpleMonitoringDetails(
        project
    );
}


/* =========================================================
   SIMPLE PROJECT DETAILS
========================================================= */

function showSimpleMonitoringDetails(
    project
) {

    let modal =
        $("monitoringDetailsModal");


    if (!modal) {

        modal =
            document.createElement(
                "div"
            );


        modal.id =
            "monitoringDetailsModal";


        modal.style.position =
            "fixed";

        modal.style.inset =
            "0";

        modal.style.zIndex =
            "99980";

        modal.style.display =
            "flex";

        modal.style.alignItems =
            "center";

        modal.style.justifyContent =
            "center";

        modal.style.background =
            "rgba(0,0,0,.45)";


        modal.innerHTML = `

            <div
                style="
                    width:min(900px,94vw);
                    max-height:90vh;
                    overflow:auto;
                    background:#fff;
                    border-radius:12px;
                    padding:24px;
                "
            >

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                    "
                >

                    <h2>
                        Project Details
                    </h2>

                    <button
                        type="button"
                        id="monitoringDetailsClose"
                    >
                        ×
                    </button>

                </div>


                <div
                    id="monitoringDetailsBody"
                ></div>

            </div>
        `;


        document.body.appendChild(
            modal
        );


        modal
            .querySelector(
                "#monitoringDetailsClose"
            )
            ?.addEventListener(
                "click",
                () => {

                    modal.style.display =
                        "none";
                }
            );
    }


    const body =
        modal.querySelector(
            "#monitoringDetailsBody"
        );


    body.innerHTML = `

        <div
            style="
                display:grid;
                grid-template-columns:
                    180px 1fr;
                gap:10px 20px;
            "
        >

            <strong>
                Project Title
            </strong>

            <span>
                ${escapeHTML(
                    project.projectTitle
                )}
            </span>


            <strong>
                Municipality
            </strong>

            <span>
                ${escapeHTML(
                    project.municipality
                )}
            </span>


            <strong>
                Contract ID
            </strong>

            <span>
                ${escapeHTML(
                    project.contractId
                )}
            </span>


            <strong>
                Allocation
            </strong>

            <span>
                ${formatCurrency(
                    project.allocation
                )}
            </span>


            <strong>
                Program Status
            </strong>

            <span>
                ${createStatusBadge(
                    project.programStatus
                )}
            </span>


            <strong>
                Program %
            </strong>

            <span>
                ${Number(
                    project.programPercent || 0
                ).toFixed(1)}%
            </span>


            <strong>
                Plan Status
            </strong>

            <span>
                ${createStatusBadge(
                    project.planStatus
                )}
            </span>


            <strong>
                Plan %
            </strong>

            <span>
                ${Number(
                    project.planPercent || 0
                ).toFixed(1)}%
            </span>


            <strong>
                Overall Status
            </strong>

            <span>
                ${createStatusBadge(
                    project.overallStatus
                )}
            </span>


            <strong>
                Last Updated
            </strong>

            <span>
                ${escapeHTML(
                    formatDate(
                        project.lastUpdated
                    )
                )}
            </span>


            <strong>
                Remarks
            </strong>

            <span>
                ${escapeHTML(
                    project.remarks
                )}
            </span>

        </div>


        <div
            style="
                margin-top:24px;
                display:flex;
                justify-content:flex-end;
                gap:10px;
            "
        >

            <button
                type="button"
                onclick="
                    editMonitoringProject(
                        '${escapeHTML(project.id)}'
                    )
                "
            >
                Edit
            </button>

        </div>
    `;


    modal.style.display =
        "flex";
}
/* =========================================================
   PAGE STATE
   Keeps the website on the page/tab where the user
   left it instead of returning to the dashboard.
========================================================= */

const PDS_PAGE_STATE_KEY =
    "pds_current_page";


const PDS_SCROLL_STATE_KEY =
    "pds_scroll_positions";


let pdsCurrentPage =
    null;


let pdsScrollPositions =
    {};


/* =========================================================
   GET PAGE ID
========================================================= */

function getPageIdFromElement(
    element
) {

    if (!element) {
        return null;
    }


    return (
        element.dataset?.page ||
        element.dataset?.target ||
        element.getAttribute(
            "data-section"
        ) ||
        element.getAttribute(
            "href"
        ) ||
        null
    );
}


/* =========================================================
   NORMALIZE PAGE ID
========================================================= */

function normalizePageId(
    value
) {

    if (!value) {
        return null;
    }


    let page =
        String(value)
            .trim();


    if (
        page.startsWith("#")
    ) {

        page =
            page.substring(1);
    }


    return page;
}


/* =========================================================
   SAVE CURRENT PAGE
========================================================= */

function saveCurrentPageState() {

    try {

        if (
            pdsCurrentPage
        ) {

            localStorage.setItem(
                PDS_PAGE_STATE_KEY,
                pdsCurrentPage
            );
        }


        /*
         * Save scroll position for the current
         * page so that returning to it restores
         * the previous location.
         */

        if (
            pdsCurrentPage
        ) {

            pdsScrollPositions[
                pdsCurrentPage
            ] =
                window.scrollY || 0;


            localStorage.setItem(
                PDS_SCROLL_STATE_KEY,
                JSON.stringify(
                    pdsScrollPositions
                )
            );
        }

    } catch (error) {

        console.warn(
            "PDS: Unable to save page state:",
            error
        );
    }
}


/* =========================================================
   LOAD SAVED PAGE STATE
========================================================= */

function loadSavedPageState() {

    try {

        const savedPage =
            localStorage.getItem(
                PDS_PAGE_STATE_KEY
            );


        const savedScroll =
            localStorage.getItem(
                PDS_SCROLL_STATE_KEY
            );


        if (savedPage) {

            pdsCurrentPage =
                savedPage;
        }


        if (savedScroll) {

            try {

                const parsed =
                    JSON.parse(
                        savedScroll
                    );


                if (
                    parsed &&
                    typeof parsed ===
                        "object"
                ) {

                    pdsScrollPositions =
                        parsed;
                }

            } catch {
                pdsScrollPositions = {};
            }
        }


    } catch (error) {

        console.warn(
            "PDS: Unable to restore page state:",
            error
        );
    }
}


/* =========================================================
   GET ALL PAGE/SECTION ELEMENTS
========================================================= */

function getPDSPageElements() {

    const selectors = [

        "[data-page]",

        "[data-section]",

        ".page-section",

        ".content-section",

        ".dashboard-section",

        "main section"

    ];


    const elements = [];


    selectors.forEach(
        selector => {

            document
                .querySelectorAll(
                    selector
                )
                .forEach(
                    element => {

                        if (
                            !elements.includes(
                                element
                            )
                        ) {

                            elements.push(
                                element
                            );
                        }
                    }
                );
        }
    );


    return elements;
}


/* =========================================================
   FIND PAGE ELEMENT
========================================================= */

function findPDSPage(
    pageId
) {

    const normalized =
        normalizePageId(
            pageId
        );


    if (!normalized) {
        return null;
    }


    const selectors = [

        `[data-page="${CSS.escape(normalized)}"]`,

        `[data-section="${CSS.escape(normalized)}"]`,

        `#${CSS.escape(normalized)}`,

        `.page-${CSS.escape(normalized)}`

    ];


    for (
        const selector of selectors
    ) {

        const element =
            document.querySelector(
                selector
            );


        if (element) {
            return element;
        }
    }


    return null;
}


/* =========================================================
   SHOW PAGE
========================================================= */

function showPDSPage(
    pageId,
    options = {}
) {

    const normalized =
        normalizePageId(
            pageId
        );


    if (!normalized) {
        return false;
    }


    const {

        saveState = true,

        restoreScroll = true,

        updateHistory = false

    } = options;


    if (
        saveState &&
        pdsCurrentPage &&
        pdsCurrentPage !==
            normalized
    ) {

        saveCurrentPageState();
    }


    const pages =
        getPDSPageElements();


    let target =
        findPDSPage(
            normalized
        );


    /*
     * Some existing PDS HTML structures use
     * IDs directly rather than data-page.
     */

    if (!target) {

        target =
            document.getElementById(
                normalized
            );
    }


    if (!target) {

        console.warn(
            "PDS: Page not found:",
            normalized
        );

        return false;
    }


    /*
     * Hide only actual page/section elements.
     * Do not hide the permanent sidebar,
     * top navigation, or sign-in shell.
     */

    pages.forEach(
        page => {

            if (
                page === target
            ) {

                page.classList.remove(
                    "hidden"
                );

                page.style.display =
                    "";

                page.setAttribute(
                    "aria-hidden",
                    "false"
                );

            } else {

                /*
                 * Avoid hiding elements that are
                 * parents of the target.
                 */

                if (
                    page.contains(
                        target
                    ) ||
                    target.contains(
                        page
                    )
                ) {

                    return;
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


    pdsCurrentPage =
        normalized;


    if (saveState) {

        try {

            localStorage.setItem(
                PDS_PAGE_STATE_KEY,
                normalized
            );

        } catch {
            /* ignore */
        }
    }


    /*
     * Update navigation buttons.
     */

    document
        .querySelectorAll(
            "[data-page], [data-section]"
        )
        .forEach(
            nav => {

                const navPage =
                    normalizePageId(
                        nav.dataset?.page ||
                        nav.dataset?.section
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


    if (updateHistory) {

        try {

            history.replaceState(
                {
                    pdsPage:
                        normalized
                },
                "",
                `#${encodeURIComponent(normalized)}`
            );

        } catch {
            /* ignore */
        }
    }


    /*
     * Restore the previous scroll position.
     */

    if (restoreScroll) {

        const scrollTop =
            Number(
                pdsScrollPositions[
                    normalized
                ]
            );


        requestAnimationFrame(
            () => {

                if (
                    Number.isFinite(
                        scrollTop
                    ) &&
                    scrollTop > 0
                ) {

                    window.scrollTo(
                        {
                            top:
                                scrollTop,

                            behavior:
                                "auto"
                        }
                    );

                } else {

                    window.scrollTo(
                        {
                            top: 0,

                            behavior:
                                "auto"
                        }
                    );
                }
            }
        );
    }


    /*
     * Load page-specific data only when
     * that page is actually opened.
     */

    if (
        normalized
            .toLowerCase()
            .includes(
                "monitor"
            )
    ) {

        loadProjectMonitoring(
            false
        ).catch(
            error => {

                console.error(
                    "PDS: Monitoring page load failed:",
                    error
                );
            }
        );
    }


    return true;
}


/* =========================================================
   NAVIGATION CLICK HANDLER
========================================================= */

function handlePDSNavigationClick(
    event
) {

    const link =
        event.target.closest(
            "[data-page], [data-section], [data-target]"
        );


    if (!link) {
        return;
    }


    /*
     * Do not intercept buttons that have their
     * own application action unless they are
     * explicitly navigation links.
     */

    const pageId =
        getPageIdFromElement(
            link
        );


    if (!pageId) {
        return;
    }


    /*
     * Ignore external URLs.
     */

    const href =
        link.getAttribute(
            "href"
        );


    if (
        href &&
        (
            href.startsWith(
                "http://"
            ) ||
            href.startsWith(
                "https://"
            )
        )
    ) {

        return;
    }


    event.preventDefault();


    showPDSPage(
        pageId,
        {
            saveState: true,
            restoreScroll: true,
            updateHistory: true
        }
    );
}


/* =========================================================
   INITIALIZE NAVIGATION
========================================================= */

async function initializeNavigation() {

    if (
        navigationReady
    ) {
        return;
    }


    loadSavedPageState();


    /*
     * Capture scroll before leaving a page.
     */

    window.addEventListener(
        "scroll",
        () => {

            if (
                pdsCurrentPage
            ) {

                pdsScrollPositions[
                    pdsCurrentPage
                ] =
                    window.scrollY || 0;
            }

        },
        {
            passive: true
        }
    );


    /*
     * Save page position before reload,
     * closing, or navigation away.
     */

    window.addEventListener(
        "beforeunload",
        () => {

            saveCurrentPageState();

        }
    );


    /*
     * Use event delegation so dynamically
     * generated navigation elements work too.
     */

    document.addEventListener(
        "click",
        handlePDSNavigationClick
    );


    navigationReady =
        true;


    /*
     * Restore the last page.
     *
     * If no previous page exists, use the
     * dashboard as the default.
     */

    const hash =
        window.location.hash
            ? decodeURIComponent(
                window.location.hash
                    .substring(1)
            )
            : null;


    const initialPage =
        hash ||
        pdsCurrentPage ||
        "dashboard";


    const shown =
        showPDSPage(
            initialPage,
            {
                saveState: false,
                restoreScroll: true,
                updateHistory: false
            }
        );


    if (!shown) {

        showPDSPage(
            "dashboard",
            {
                saveState: false,
                restoreScroll: false,
                updateHistory: false
            }
        );
    }
}


/* =========================================================
   REMEMBER CURRENT PAGE BEFORE TAB CHANGE
========================================================= */

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.visibilityState ===
            "hidden"
        ) {

            saveCurrentPageState();
        }
    }
);


/* =========================================================
   PROJECT MONITORING NAVIGATION
========================================================= */

function openProjectMonitoringPage() {

    const possiblePages = [

        "projectMonitoring",

        "project-monitoring",

        "monitoring",

        "projectMonitoringPage",

        "monitoringPage"

    ];


    for (
        const page of possiblePages
    ) {

        if (
            findPDSPage(page)
        ) {

            showPDSPage(
                page,
                {
                    saveState: true,
                    restoreScroll: true,
                    updateHistory: true
                }
            );


            loadProjectMonitoring(
                false
            ).catch(
                error => {

                    console.error(
                        "PDS: Unable to load Project Monitoring:",
                        error
                    );
                }
            );


            return true;
        }
    }


    /*
     * If the existing HTML uses a
     * navigation function, fall back to it.
     */

    if (
        typeof showSection ===
        "function"
    ) {

        try {

            showSection(
                "project-monitoring"
            );

            return true;

        } catch {
            /* continue */
        }
    }


    return false;
}


/* =========================================================
   PROJECT MONITORING REFRESH BUTTON
========================================================= */

function setupMonitoringRefreshButton() {

    const buttons =
        document.querySelectorAll(
            "#refreshMonitoring, #refreshProjectMonitoring, [data-action='refresh-monitoring']"
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
                async event => {

                    event.preventDefault();


                    const originalText =
                        button.textContent;


                    button.disabled =
                        true;


                    button.textContent =
                        "Refreshing...";


                    try {

                        await loadProjectMonitoring(
                            true
                        );


                        showMessage(
                            "Project Monitoring refreshed from OneDrive.",
                            "success"
                        );

                    } catch (error) {

                        console.error(
                            "PDS: Monitoring refresh failed:",
                            error
                        );


                        showMessage(
                            "Unable to refresh Project Monitoring.",
                            "error"
                        );

                    } finally {

                        button.disabled =
                            false;

                        button.textContent =
                            originalText;
                    }
                }
            );
        }
    );
}


/* =========================================================
   INITIALIZE MONITORING CONTROLS
========================================================= */

function initializeMonitoringControls() {

    initializeMonitoringFilters();

    setupMonitoringRefreshButton();

    setupOneDriveButton();
}
/* =========================================================
   PROJECT MONITORING — FILTER EVENTS
========================================================= */

function initializeMonitoringFilters() {

    const searchInput =
        document.querySelector(
            "#monitoringSearch"
        );

    const categoryFilter =
        document.querySelector(
            "#monitoringCategory"
        );

    const municipalityFilter =
        document.querySelector(
            "#monitoringMunicipality"
        );

    const programFilter =
        document.querySelector(
            "#monitoringProgram"
        );

    const statusFilter =
        document.querySelector(
            "#monitoringStatus"
        );


    if (
        searchInput &&
        searchInput.dataset.pdsBound !==
            "true"
    ) {

        searchInput.dataset.pdsBound =
            "true";


        searchInput.addEventListener(
            "input",
            () => {

                monitoringFilters.search =
                    searchInput.value
                        .trim()
                        .toLowerCase();


                renderMonitoringProjects();
            }
        );
    }


    if (
        categoryFilter &&
        categoryFilter.dataset.pdsBound !==
            "true"
    ) {

        categoryFilter.dataset.pdsBound =
            "true";


        categoryFilter.addEventListener(
            "change",
            () => {

                monitoringFilters.category =
                    categoryFilter.value;


                renderMonitoringProjects();
            }
        );
    }


    if (
        municipalityFilter &&
        municipalityFilter.dataset.pdsBound !==
            "true"
    ) {

        municipalityFilter.dataset.pdsBound =
            "true";


        municipalityFilter.addEventListener(
            "change",
            () => {

                monitoringFilters.municipality =
                    municipalityFilter.value;


                renderMonitoringProjects();
            }
        );
    }


    if (
        programFilter &&
        programFilter.dataset.pdsBound !==
            "true"
    ) {

        programFilter.dataset.pdsBound =
            "true";


        programFilter.addEventListener(
            "change",
            () => {

                monitoringFilters.program =
                    programFilter.value;


                renderMonitoringProjects();
            }
        );
    }


    if (
        statusFilter &&
        statusFilter.dataset.pdsBound !==
            "true"
    ) {

        statusFilter.dataset.pdsBound =
            "true";


        statusFilter.addEventListener(
            "change",
            () => {

                monitoringFilters.status =
                    statusFilter.value;


                renderMonitoringProjects();
            }
        );
    }


    populateMonitoringFilterOptions();
}


/* =========================================================
   POPULATE FILTER OPTIONS
========================================================= */

function populateMonitoringFilterOptions() {

    const projects =
        Array.isArray(
            cachedMonitoringProjects
        )
            ? cachedMonitoringProjects
            : [];


    const categories =
        new Set();

    const municipalities =
        new Set();

    const programs =
        new Set();

    const statuses =
        new Set();


    projects.forEach(
        project => {

            if (
                project.category
            ) {

                categories.add(
                    String(
                        project.category
                    ).trim()
                );
            }


            if (
                project.municipality
            ) {

                municipalities.add(
                    String(
                        project.municipality
                    ).trim()
                );
            }


            if (
                project.program
            ) {

                programs.add(
                    String(
                        project.program
                    ).trim()
                );
            }


            if (
                project.overallStatus
            ) {

                statuses.add(
                    String(
                        project.overallStatus
                    ).trim()
                );
            }
        }
    );


    populateSelect(
        "#monitoringCategory",
        categories,
        "All Categories"
    );


    populateSelect(
        "#monitoringMunicipality",
        municipalities,
        "All Municipalities"
    );


    populateSelect(
        "#monitoringProgram",
        programs,
        "All Programs"
    );


    populateSelect(
        "#monitoringStatus",
        statuses,
        "All Statuses"
    );
}


/* =========================================================
   SELECT BUILDER
========================================================= */

function populateSelect(
    selector,
    values,
    defaultText
) {

    const select =
        document.querySelector(
            selector
        );


    if (!select) {
        return;
    }


    const currentValue =
        select.value;


    const sorted =
        Array.from(values)
            .filter(
                value =>
                    value !==
                    ""
            )
            .sort(
                (a, b) =>
                    a.localeCompare(
                        b
                    )
            );


    select.innerHTML = "";


    const defaultOption =
        document.createElement(
            "option"
        );


    defaultOption.value =
        "";


    defaultOption.textContent =
        defaultText;


    select.appendChild(
        defaultOption
    );


    sorted.forEach(
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
        sorted.includes(
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
   APPLY MONITORING FILTERS
========================================================= */

function getFilteredMonitoringProjects() {

    const projects =
        Array.isArray(
            cachedMonitoringProjects
        )
            ? cachedMonitoringProjects
            : [];


    const search =
        String(
            monitoringFilters.search ||
            ""
        )
            .trim()
            .toLowerCase();


    const category =
        String(
            monitoringFilters.category ||
            ""
        )
            .trim()
            .toLowerCase();


    const municipality =
        String(
            monitoringFilters.municipality ||
            ""
        )
            .trim()
            .toLowerCase();


    const program =
        String(
            monitoringFilters.program ||
            ""
        )
            .trim()
            .toLowerCase();


    const status =
        String(
            monitoringFilters.status ||
            ""
        )
            .trim()
            .toLowerCase();


    return projects.filter(
        project => {

            const searchableText = [

                project.category,

                project.program,

                project.subProgram,

                project.projectTitle,

                project.municipality,

                project.program2,

                project.plan,

                project.contractId,

                project.remarks,

                project.remarks2,

                project.overallStatus,

                project.programStatus,

                project.planStatus

            ]
                .filter(
                    value =>
                        value !==
                        undefined &&
                        value !==
                        null
                )
                .join(" ")
                .toLowerCase();


            if (
                search &&
                !searchableText.includes(
                    search
                )
            ) {

                return false;
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
}


/* =========================================================
   CLEAR MONITORING FILTERS
========================================================= */

function clearMonitoringFilters() {

    monitoringFilters = {

        search: "",

        category: "",

        municipality: "",

        program: "",

        status: ""
    };


    const selectors = [

        "#monitoringSearch",

        "#monitoringCategory",

        "#monitoringMunicipality",

        "#monitoringProgram",

        "#monitoringStatus"

    ];


    selectors.forEach(
        selector => {

            const element =
                document.querySelector(
                    selector
                );


            if (element) {

                element.value =
                    "";
            }
        }
    );


    renderMonitoringProjects();
}


/* =========================================================
   CLEAR FILTER BUTTON
========================================================= */

function setupMonitoringClearButton() {

    const buttons =
        document.querySelectorAll(
            "#clearMonitoringFilters, [data-action='clear-monitoring-filters']"
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

                    clearMonitoringFilters();
                }
            );
        }
    );
}


/* =========================================================
   MONITORING SUMMARY
========================================================= */

function updateMonitoringSummary(
    projects
) {

    const list =
        Array.isArray(
            projects
        )
            ? projects
            : [];


    const total =
        list.length;


    const programComplete =
        list.filter(
            project =>
                isCompletedValue(
                    project.programStatus
                ) ||
                Number(
                    project.programPercent
                ) >= 100
        ).length;


    const planComplete =
        list.filter(
            project =>
                isCompletedValue(
                    project.planStatus
                ) ||
                Number(
                    project.planPercent
                ) >= 100
        ).length;


    const completed =
        list.filter(
            project =>
                isCompletedValue(
                    project.overallStatus
                )
        ).length;


    const active =
        list.filter(
            project =>
                !isCompletedValue(
                    project.overallStatus
                )
        ).length;


    setText(
        [
            "#monitoringTotal",

            "#totalMonitoringProjects",

            "#monitoringProjectCount"

        ],
        total
    );


    setText(
        [
            "#monitoringProgramComplete",

            "#programCompleteCount"

        ],
        programComplete
    );


    setText(
        [
            "#monitoringPlanComplete",

            "#planCompleteCount"

        ],
        planComplete
    );


    setText(
        [
            "#monitoringCompleted",

            "#completedMonitoringCount"

        ],
        completed
    );


    setText(
        [
            "#monitoringActive",

            "#activeMonitoringCount"

        ],
        active
    );
}


/* =========================================================
   SET TEXT HELPER
========================================================= */

function setText(
    selectors,
    value
) {

    selectors.forEach(
        selector => {

            const element =
                document.querySelector(
                    selector
                );


            if (element) {

                element.textContent =
                    String(
                        value ??
                        ""
                    );
            }
        }
    );
}


/* =========================================================
   COMPLETION CHECK
========================================================= */

function isCompletedValue(
    value
) {

    if (
        value ===
        undefined ||
        value ===
        null
    ) {

        return false;
    }


    const normalized =
        String(
            value
        )
            .trim()
            .toLowerCase();


    return [

        "completed",

        "complete",

        "100%",

        "done",

        "closed",

        "finished"

    ].includes(
        normalized
    );
}


/* =========================================================
   PERCENTAGE FORMAT
========================================================= */

function formatPercent(
    value
) {

    if (
        value ===
        undefined ||
        value ===
        null ||
        value ===
        ""
    ) {

        return "0%";
    }


    const number =
        Number(
            String(
                value
            )
                .replace(
                    "%",
                    ""
                )
                .replace(
                    ",",
                    ""
                )
                .trim()
        );


    if (
        Number.isNaN(
            number
        )
    ) {

        return "0%";
    }


    return `${Math.max(
        0,
        Math.min(
            100,
            number
        )
    )}%`;
}


/* =========================================================
   STATUS CLASS
========================================================= */

function getStatusClass(
    status
) {

    const normalized =
        String(
            status ||
            ""
        )
            .trim()
            .toLowerCase();


    if (
        normalized.includes(
            "complete"
        ) ||
        normalized.includes(
            "done"
        ) ||
        normalized.includes(
            "finish"
        )
    ) {

        return "status-complete";
    }


    if (
        normalized.includes(
            "ongoing"
        ) ||
        normalized.includes(
            "progress"
        ) ||
        normalized.includes(
            "active"
        )
    ) {

        return "status-ongoing";
    }


    if (
        normalized.includes(
            "delayed"
        ) ||
        normalized.includes(
            "delay"
        )
    ) {

        return "status-delayed";
    }


    if (
        normalized.includes(
            "pending"
        ) ||
        normalized.includes(
            "not started"
        )
    ) {

        return "status-pending";
    }


    return "status-default";
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    if (
        value ===
        undefined ||
        value ===
        null
    ) {

        return "";
    }


    return String(
        value
    )
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
   MONITORING PROJECT ROW
========================================================= */

function renderMonitoringProjectRow(
    project
) {

    const status =
        project.overallStatus ||
        "Not Started";


    const programPercent =
        formatPercent(
            project.programPercent
        );


    const planPercent =
        formatPercent(
            project.planPercent
        );


    return `

        <tr
            data-project-id="${escapeHTML(
                project.id
            )}"
        >

            <td>
                ${escapeHTML(
                    project.category
                )}
            </td>

            <td>
                <strong>
                    ${escapeHTML(
                        project.projectTitle
                    )}
                </strong>
            </td>

            <td>
                ${escapeHTML(
                    project.municipality
                )}
            </td>

            <td>
                ${escapeHTML(
                    project.contractId
                )}
            </td>

            <td>
                <span
                    class="monitoring-status ${getStatusClass(
                        status
                    )}"
                >
                    ${escapeHTML(
                        status
                    )}
                </span>
            </td>

            <td>
                ${programPercent}
            </td>

            <td>
                ${planPercent}
            </td>

            <td>
                <button
                    type="button"
                    class="btn btn-sm"
                    data-monitoring-edit="${escapeHTML(
                        project.id
                    )}"
                >
                    Edit
                </button>
            </td>

        </tr>

    `;
}


/* =========================================================
   RENDER MONITORING PROJECTS
========================================================= */

function renderMonitoringProjects() {

    const filtered =
        getFilteredMonitoringProjects();


    updateMonitoringSummary(
        filtered
    );


    populateMonitoringFilterOptions();


    const tbody =
        document.querySelector(
            "#monitoringProjectsBody"
        );


    if (!tbody) {

        console.warn(
            "PDS: #monitoringProjectsBody not found."
        );

        return;
    }


    if (
        filtered.length ===
        0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="empty-state"
                >
                    No project monitoring
                    records found.
                </td>

            </tr>

        `;

        return;
    }


    tbody.innerHTML =
        filtered
            .map(
                renderMonitoringProjectRow
            )
            .join("");


    /*
     * Bind Edit buttons after rendering.
     */

    tbody
        .querySelectorAll(
            "[data-monitoring-edit]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();


                        const projectId =
                            button.getAttribute(
                                "data-monitoring-edit"
                            );


                        if (
                            typeof editMonitoringProject ===
                            "function"
                        ) {

                            editMonitoringProject(
                                projectId
                            );
                        }
                    }
                );
            }
        );
}


/* =========================================================
   LOAD PROJECT MONITORING
========================================================= */

async function loadProjectMonitoring(
    forceRefresh = false
) {

    /*
     * If data is already loaded and the caller
     * did not explicitly request refresh,
     * use the existing data.
     */

    if (
        !forceRefresh &&
        Array.isArray(
            cachedMonitoringProjects
        ) &&
        cachedMonitoringProjects.length
    ) {

        populateMonitoringFilterOptions();

        renderMonitoringProjects();

        return cachedMonitoringProjects;
    }


    if (
        typeof refreshMonitoringFromOneDrive !==
        "function"
    ) {

        console.error(
            "PDS: refreshMonitoringFromOneDrive() is not available."
        );

        return [];
    }


    const projects =
        await refreshMonitoringFromOneDrive();


    cachedMonitoringProjects =
        Array.isArray(
            projects
        )
            ? projects
            : [];


    populateMonitoringFilterOptions();

    renderMonitoringProjects();


    return cachedMonitoringProjects;
}
/* =========================================================
   MONITORING EDITOR — FORM HELPERS
========================================================= */

function getMonitoringEditModal() {

    return (
        document.querySelector(
            "#monitoringEditModal"
        ) ||
        document.querySelector(
            "#editMonitoringModal"
        ) ||
        document.querySelector(
            "#monitoringModal"
        )
    );
}


/* =========================================================
   GET INPUT VALUE
========================================================= */

function getInputValue(
    selectors
) {

    if (
        !Array.isArray(
            selectors
        )
    ) {

        selectors = [
            selectors
        ];
    }


    for (
        const selector of selectors
    ) {

        const element =
            document.querySelector(
                selector
            );


        if (element) {

            return element.value;
        }
    }


    return "";
}


/* =========================================================
   SET INPUT VALUE
========================================================= */

function setInputValue(
    selectors,
    value
) {

    if (
        !Array.isArray(
            selectors
        )
    ) {

        selectors = [
            selectors
        ];
    }


    for (
        const selector of selectors
    ) {

        const element =
            document.querySelector(
                selector
            );


        if (element) {

            element.value =
                value ??
                "";

            return true;
        }
    }


    return false;
}


/* =========================================================
   EDIT PROJECT MONITORING
========================================================= */

function editMonitoringProject(
    projectId
) {

    const project =
        cachedMonitoringProjects.find(
            item =>
                String(
                    item.id
                ) ===
                String(
                    projectId
                )
        );


    if (!project) {

        showMessage(
            "Project record was not found.",
            "error"
        );

        return;
    }


    /*
     * Store the currently edited project.
     */

    currentEditingMonitoringProject =
        project;


    /*
     * Fill the monitoring editor.
     */

    setInputValue(
        [
            "#monitoringEditProjectTitle",
            "#editMonitoringProjectTitle",
            "#editProjectTitle"
        ],
        project.projectTitle
    );


    setInputValue(
        [
            "#monitoringEditCategory",
            "#editMonitoringCategory"
        ],
        project.category
    );


    setInputValue(
        [
            "#monitoringEditProgram",
            "#editMonitoringProgram"
        ],
        project.program
    );


    setInputValue(
        [
            "#monitoringEditSubProgram",
            "#editMonitoringSubProgram"
        ],
        project.subProgram
    );


    setInputValue(
        [
            "#monitoringEditMunicipality",
            "#editMonitoringMunicipality"
        ],
        project.municipality
    );


    setInputValue(
        [
            "#monitoringEditContractId",
            "#editMonitoringContractId"
        ],
        project.contractId
    );


    setInputValue(
        [
            "#monitoringEditProgramStatus",
            "#editMonitoringProgramStatus"
        ],
        project.programStatus
    );


    setInputValue(
        [
            "#monitoringEditProgramPercent",
            "#editMonitoringProgramPercent"
        ],
        project.programPercent
    );


    setInputValue(
        [
            "#monitoringEditPlanStatus",
            "#editMonitoringPlanStatus"
        ],
        project.planStatus
    );


    setInputValue(
        [
            "#monitoringEditPlanPercent",
            "#editMonitoringPlanPercent"
        ],
        project.planPercent
    );


    setInputValue(
        [
            "#monitoringEditOverallStatus",
            "#editMonitoringOverallStatus"
        ],
        project.overallStatus
    );


    setInputValue(
        [
            "#monitoringEditRemarks",
            "#editMonitoringRemarks"
        ],
        project.remarks
    );


    setInputValue(
        [
            "#monitoringEditRemarks2",
            "#editMonitoringRemarks2"
        ],
        project.remarks2
    );


    /*
     * Display the modal.
     */

    const modal =
        getMonitoringEditModal();


    if (modal) {

        modal.style.display =
            "flex";

        modal.classList.add(
            "active"
        );

        modal.setAttribute(
            "aria-hidden",
            "false"
        );
    }


    /*
     * Focus first editable field.
     */

    setTimeout(
        () => {

            const firstInput =
                document.querySelector(
                    "#monitoringEditProgramStatus, #editMonitoringProgramStatus"
                );


            if (firstInput) {

                firstInput.focus();
            }

        },
        50
    );
}


/* =========================================================
   CLOSE MONITORING EDITOR
========================================================= */

function closeMonitoringEditModal() {

    const modal =
        getMonitoringEditModal();


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "active"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    modal.style.display =
        "none";


    currentEditingMonitoringProject =
        null;
}


/* =========================================================
   COLLECT MONITORING FORM
========================================================= */

function collectMonitoringFormData() {

    const current =
        currentEditingMonitoringProject;


    if (!current) {

        throw new Error(
            "No monitoring project is currently being edited."
        );
    }


    const updated = {

        ...current,

        programStatus:
            getInputValue(
                [
                    "#monitoringEditProgramStatus",
                    "#editMonitoringProgramStatus"
                ]
            ),

        programPercent:
            getInputValue(
                [
                    "#monitoringEditProgramPercent",
                    "#editMonitoringProgramPercent"
                ]
            ),

        planStatus:
            getInputValue(
                [
                    "#monitoringEditPlanStatus",
                    "#editMonitoringPlanStatus"
                ]
            ),

        planPercent:
            getInputValue(
                [
                    "#monitoringEditPlanPercent",
                    "#editMonitoringPlanPercent"
                ]
            ),

        overallStatus:
            getInputValue(
                [
                    "#monitoringEditOverallStatus",
                    "#editMonitoringOverallStatus"
                ]
            ),

        remarks:
            getInputValue(
                [
                    "#monitoringEditRemarks",
                    "#editMonitoringRemarks"
                ]
            ),

        remarks2:
            getInputValue(
                [
                    "#monitoringEditRemarks2",
                    "#editMonitoringRemarks2"
                ]
            )

    };


    /*
     * Automatically determine overall status
     * when no explicit status was entered.
     */

    if (
        !String(
            updated.overallStatus ||
            ""
        ).trim()
    ) {

        const program =
            Number(
                String(
                    updated.programPercent ||
                    0
                ).replace(
                    "%",
                    ""
                )
            );


        const plan =
            Number(
                String(
                    updated.planPercent ||
                    0
                ).replace(
                    "%",
                    ""
                )
            );


        if (
            program >= 100 &&
            plan >= 100
        ) {

            updated.overallStatus =
                "Completed";

        } else if (
            program > 0 ||
            plan > 0
        ) {

            updated.overallStatus =
                "Ongoing";

        } else {

            updated.overallStatus =
                "Not Started";
        }
    }


    /*
     * Update timestamp.
     */

    updated.lastUpdated =
        new Date().toISOString();


    return updated;
}


/* =========================================================
   SAVE MONITORING PROJECT FROM FORM
========================================================= */

async function saveMonitoringProjectFromForm() {

    if (
        !currentEditingMonitoringProject
    ) {

        showMessage(
            "No project selected.",
            "error"
        );

        return false;
    }


    const saveButton =
        document.querySelector(
            "#saveMonitoringProject, #saveMonitoringBtn, [data-action='save-monitoring-project']"
        );


    const originalText =
        saveButton
            ? saveButton.textContent
            : "";


    try {

        if (saveButton) {

            saveButton.disabled =
                true;

            saveButton.textContent =
                "Saving...";
        }


        const updatedProject =
            collectMonitoringFormData();


        /*
         * Write changes directly to the
         * OVERALL worksheet in OneDrive Excel.
         */

        if (
            typeof saveMonitoringProject ===
            "function"
        ) {

            await saveMonitoringProject(
                updatedProject
            );

        } else {

            throw new Error(
                "saveMonitoringProject() is unavailable."
            );
        }


        /*
         * Update local cache only after the
         * Excel save succeeds.
         */

        const index =
            cachedMonitoringProjects.findIndex(
                item =>
                    String(
                        item.id
                    ) ===
                    String(
                        updatedProject.id
                    )
            );


        if (
            index >= 0
        ) {

            cachedMonitoringProjects[
                index
            ] =
                {
                    ...cachedMonitoringProjects[
                        index
                    ],
                    ...updatedProject
                };
        }


        /*
         * Close editor.
         */

        closeMonitoringEditModal();


        /*
         * Re-render the current page without
         * navigating back to the dashboard.
         */

        renderMonitoringProjects();


        showMessage(
            "Project monitoring updated successfully in OneDrive Excel.",
            "success"
        );


        return true;

    } catch (error) {

        console.error(
            "PDS: Failed to save monitoring project:",
            error
        );


        showMessage(
            error?.message ||
            "Unable to save project monitoring changes.",
            "error"
        );


        return false;

    } finally {

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                originalText ||
                "Save";
        }
    }
}


/* =========================================================
   BIND MONITORING EDIT FORM
========================================================= */

function setupMonitoringEditForm() {

    const saveButtons =
        document.querySelectorAll(
            "#saveMonitoringProject, #saveMonitoringBtn, [data-action='save-monitoring-project']"
        );


    saveButtons.forEach(
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


                    saveMonitoringProjectFromForm();
                }
            );
        }
    );


    const closeButtons =
        document.querySelectorAll(
            "#closeMonitoringEdit, #closeMonitoringModal, [data-action='close-monitoring-editor']"
        );


    closeButtons.forEach(
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

                    closeMonitoringEditModal();
                }
            );
        }
    );
}


/* =========================================================
   ESC KEY — CLOSE MONITORING MODAL
========================================================= */

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
            getMonitoringEditModal();


        if (
            modal &&
            (
                modal.classList.contains(
                    "active"
                ) ||
                modal.style.display ===
                    "flex"
            )
        ) {

            closeMonitoringEditModal();
        }
    }
);


/* =========================================================
   CLICK OUTSIDE MODAL
========================================================= */

document.addEventListener(
    "click",
    event => {

        const modal =
            getMonitoringEditModal();


        if (
            !modal ||
            event.target !==
                modal
        ) {

            return;
        }


        closeMonitoringEditModal();
    }
);


/* =========================================================
   MONITORING INITIALIZATION
========================================================= */

function initializeMonitoringEditor() {

    setupMonitoringEditForm();

    setupMonitoringClearButton();

    initializeMonitoringControls();
}


/* =========================================================
   MESSAGE / TOAST
========================================================= */

function showMessage(
    message,
    type = "info"
) {

    let container =
        document.querySelector(
            "#pdsToastContainer"
        );


    if (!container) {

        container =
            document.createElement(
                "div"
            );


        container.id =
            "pdsToastContainer";


        container.className =
            "pds-toast-container";


        document.body.appendChild(
            container
        );
    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        `pds-toast pds-toast-${type}`;


    toast.textContent =
        message;


    container.appendChild(
        toast
    );


    requestAnimationFrame(
        () => {

            toast.classList.add(
                "show"
            );
        }
    );


    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );


            setTimeout(
                () => {

                    toast.remove();

                },
                250
            );

        },
        3500
    );
}
/* =========================================================
   PART 11
   PROJECT DETAIL + DASHBOARD INTEGRATION
========================================================= */


/* =========================================================
   FIND PROJECT BY ID
========================================================= */

function findMonitoringProject(
    projectId
) {

    if (
        !Array.isArray(
            cachedMonitoringProjects
        )
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
   OPEN PROJECT DETAILS
========================================================= */

function openMonitoringProjectDetails(
    projectId
) {

    const project =
        findMonitoringProject(
            projectId
        );


    if (!project) {

        showMessage(
            "Project record not found.",
            "error"
        );

        return;
    }


    currentSelectedProject =
        project;


    /*
     * Try the existing project-detail
     * container first.
     */

    const detailContainer =
        document.querySelector(
            "#projectDetails"
        ) ||
        document.querySelector(
            "#monitoringProjectDetails"
        ) ||
        document.querySelector(
            "#projectDetail"
        );


    if (!detailContainer) {

        showSimpleMonitoringDetails(
            project
        );

        return;
    }


    detailContainer.innerHTML = `

        <div class="project-detail-header">

            <div>

                <div class="project-detail-category">
                    ${escapeHTML(
                        project.category ||
                        ""
                    )}
                </div>

                <h2>
                    ${escapeHTML(
                        project.projectTitle ||
                        "Untitled Project"
                    )}
                </h2>

                <div class="project-detail-location">
                    ${escapeHTML(
                        project.municipality ||
                        ""
                    )}
                </div>

            </div>

            <button
                type="button"
                class="btn"
                data-action="close-project-details"
            >
                Close
            </button>

        </div>


        <div class="project-detail-grid">

            <div class="project-detail-item">

                <span>
                    Program
                </span>

                <strong>
                    ${escapeHTML(
                        project.program ||
                        ""
                    )}
                </strong>

            </div>


            <div class="project-detail-item">

                <span>
                    Sub-Program
                </span>

                <strong>
                    ${escapeHTML(
                        project.subProgram ||
                        ""
                    )}
                </strong>

            </div>


            <div class="project-detail-item">

                <span>
                    Contract ID
                </span>

                <strong>
                    ${escapeHTML(
                        project.contractId ||
                        ""
                    )}
                </strong>

            </div>


            <div class="project-detail-item">

                <span>
                    Allocation
                </span>

                <strong>
                    ${escapeHTML(
                        project.allocation ||
                        ""
                    )}
                </strong>

            </div>


            <div class="project-detail-item">

                <span>
                    Program Status
                </span>

                <strong
                    class="${getStatusClass(
                        project.programStatus
                    )}"
                >
                    ${escapeHTML(
                        project.programStatus ||
                        "Not Started"
                    )}
                </strong>

            </div>


            <div class="project-detail-item">

                <span>
                    Program Progress
                </span>

                <strong>
                    ${formatPercent(
                        project.programPercent
                    )}
                </strong>

            </div>


            <div class="project-detail-item">

                <span>
                    Plan Status
                </span>

                <strong
                    class="${getStatusClass(
                        project.planStatus
                    )}"
                >
                    ${escapeHTML(
                        project.planStatus ||
                        "Not Started"
                    )}
                </strong>

            </div>


            <div class="project-detail-item">

                <span>
                    Plan Progress
                </span>

                <strong>
                    ${formatPercent(
                        project.planPercent
                    )}
                </strong>

            </div>


            <div class="project-detail-item">

                <span>
                    Overall Status
                </span>

                <strong
                    class="${getStatusClass(
                        project.overallStatus
                    )}"
                >
                    ${escapeHTML(
                        project.overallStatus ||
                        "Not Started"
                    )}
                </strong>

            </div>


            <div class="project-detail-item">

                <span>
                    Last Updated
                </span>

                <strong>
                    ${escapeHTML(
                        formatMonitoringDate(
                            project.lastUpdated
                        )
                    )}
                </strong>

            </div>

        </div>


        <div class="project-detail-remarks">

            <h3>
                Remarks
            </h3>

            <p>
                ${escapeHTML(
                    project.remarks ||
                    "No remarks."
                )}
            </p>

        </div>


        <div class="project-detail-actions">

            <button
                type="button"
                class="btn btn-primary"
                data-monitoring-edit="${escapeHTML(
                    project.id
                )}"
            >
                Edit Monitoring
            </button>

        </div>

    `;


    detailContainer.style.display =
        "";


    detailContainer.classList.add(
        "active"
    );


    /*
     * Bind buttons created above.
     */

    const closeButton =
        detailContainer.querySelector(
            "[data-action='close-project-details']"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            () => {

                closeMonitoringProjectDetails();
            }
        );
    }


    const editButton =
        detailContainer.querySelector(
            "[data-monitoring-edit]"
        );


    if (editButton) {

        editButton.addEventListener(
            "click",
            () => {

                editMonitoringProject(
                    editButton.getAttribute(
                        "data-monitoring-edit"
                    )
                );
            }
        );
    }
}


/* =========================================================
   FORMAT MONITORING DATE
========================================================= */

function formatMonitoringDate(
    value
) {

    if (
        !value
    ) {

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

        return String(
            value
        );
    }


    return date.toLocaleString(
        "en-PH",
        {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


/* =========================================================
   CLOSE PROJECT DETAILS
========================================================= */

function closeMonitoringProjectDetails() {

    const containers = [

        "#projectDetails",

        "#monitoringProjectDetails",

        "#projectDetail"

    ];


    containers.forEach(
        selector => {

            const element =
                document.querySelector(
                    selector
                );


            if (!element) {
                return;
            }


            element.classList.remove(
                "active"
            );


            element.style.display =
                "none";
        }
    );


    currentSelectedProject =
        null;
}


/* =========================================================
   DASHBOARD PROJECT COUNTS
========================================================= */

function updateDashboardProjectCounts(
    projects
) {

    const list =
        Array.isArray(
            projects
        )
            ? projects
            : [];


    const total =
        list.length;


    const completed =
        list.filter(
            project =>
                isCompletedValue(
                    project.overallStatus
                )
        ).length;


    const ongoing =
        list.filter(
            project => {

                const status =
                    String(
                        project.overallStatus ||
                        ""
                    )
                        .toLowerCase();


                return (
                    status.includes(
                        "ongoing"
                    ) ||
                    status.includes(
                        "progress"
                    ) ||
                    status.includes(
                        "active"
                    )
                );
            }
        ).length;


    const pending =
        list.filter(
            project => {

                const status =
                    String(
                        project.overallStatus ||
                        ""
                    )
                        .toLowerCase();


                return (
                    status.includes(
                        "pending"
                    ) ||
                    status.includes(
                        "not started"
                    )
                );
            }
        ).length;


    setText(
        [
            "#projectCount",
            "#totalProjects",
            "#dashboardProjectCount"
        ],
        total
    );


    setText(
        [
            "#completedProjects",
            "#dashboardCompletedProjects"
        ],
        completed
    );


    setText(
        [
            "#ongoingProjects",
            "#dashboardOngoingProjects"
        ],
        ongoing
    );


    setText(
        [
            "#pendingProjects",
            "#dashboardPendingProjects"
        ],
        pending
    );
}


/* =========================================================
   DASHBOARD RECENT PROJECTS
========================================================= */

function renderDashboardRecentProjects(
    projects
) {

    const container =
        document.querySelector(
            "#recentProjects"
        ) ||
        document.querySelector(
            "#dashboardRecentProjects"
        );


    if (!container) {
        return;
    }


    const list =
        Array.isArray(
            projects
        )
            ? projects.slice(
                0,
                8
            )
            : [];


    if (
        list.length ===
        0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                No project records available.

            </div>

        `;

        return;
    }


    container.innerHTML =
        list.map(
            project => `

                <div
                    class="recent-project-item"
                    data-project-id="${escapeHTML(
                        project.id
                    )}"
                >

                    <div
                        class="recent-project-info"
                    >

                        <strong>
                            ${escapeHTML(
                                project.projectTitle ||
                                "Untitled Project"
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                                project.municipality ||
                                ""
                            )}
                        </span>

                    </div>


                    <span
                        class="monitoring-status ${getStatusClass(
                            project.overallStatus
                        )}"
                    >
                        ${escapeHTML(
                            project.overallStatus ||
                            "Not Started"
                        )}
                    </span>

                </div>

            `
        )
        .join("");


    container
        .querySelectorAll(
            "[data-project-id]"
        )
        .forEach(
            element => {

                element.addEventListener(
                    "click",
                    () => {

                        openMonitoringProjectDetails(
                            element.getAttribute(
                                "data-project-id"
                            )
                        );
                    }
                );
            }
        );
}


/* =========================================================
   REFRESH DASHBOARD DATA
========================================================= */

async function refreshDashboardFromOneDrive() {

    try {

        const projects =
            await refreshMonitoringFromOneDrive();


        if (
            !Array.isArray(
                projects
            )
        ) {

            return [];
        }


        updateDashboardProjectCounts(
            projects
        );


        renderDashboardRecentProjects(
            projects
        );


        return projects;

    } catch (error) {

        console.error(
            "PDS: Dashboard OneDrive refresh failed:",
            error
        );


        return [];
    }
}


/* =========================================================
   DASHBOARD INITIALIZATION
========================================================= */

function initializeDashboardData() {

    if (
        Array.isArray(
            cachedMonitoringProjects
        ) &&
        cachedMonitoringProjects.length
    ) {

        updateDashboardProjectCounts(
            cachedMonitoringProjects
        );


        renderDashboardRecentProjects(
            cachedMonitoringProjects
        );
    }


    /*
     * Refresh only when the user is authenticated
     * and OneDrive has already been initialized.
     */

    if (
        oneDriveInitialized
    ) {

        refreshDashboardFromOneDrive();
    }
}


/* =========================================================
   MONITORING TABLE CLICK — DETAILS
========================================================= */

function setupMonitoringRowDetails() {

    const tbody =
        document.querySelector(
            "#monitoringProjectsBody"
        );


    if (!tbody) {
        return;
    }


    if (
        tbody.dataset.detailsBound ===
        "true"
    ) {

        return;
    }


    tbody.dataset.detailsBound =
        "true";


    tbody.addEventListener(
        "dblclick",
        event => {

            const row =
                event.target.closest(
                    "tr[data-project-id]"
                );


            if (!row) {
                return;
            }


            openMonitoringProjectDetails(
                row.getAttribute(
                    "data-project-id"
                )
            );
        }
    );
}


/* =========================================================
   DOCUMENT CLICK — CLOSE DETAILS
========================================================= */

document.addEventListener(
    "click",
    event => {

        const action =
            event.target.closest(
                "[data-action='close-project-details']"
            );


        if (
            action
        ) {

            event.preventDefault();

            closeMonitoringProjectDetails();
        }
    }
);


/* =========================================================
   PROJECT DATA EVENT
========================================================= */

function notifyProjectDataChanged() {

    updateDashboardProjectCounts(
        cachedMonitoringProjects
    );


    renderDashboardRecentProjects(
        cachedMonitoringProjects
    );


    /*
     * Keep the monitoring page in place.
     * Do NOT redirect the user to Dashboard.
     */

    if (
        pdsCurrentPage &&
        (
            pdsCurrentPage
                .toLowerCase()
                .includes(
                    "monitor"
                )
        )
    ) {

        renderMonitoringProjects();
    }
}
/* =========================================================
   PART 12
   FINAL INITIALIZATION + EVENT WIRING
========================================================= */


/* =========================================================
   INITIALIZE PDS MONITORING MODULE
========================================================= */

function initializePDSMonitoringModule() {

    try {

        /*
         * Restore the last page first.
         */

        loadSavedPageState();


        /*
         * Initialize navigation.
         */

        initializeNavigation();


        /*
         * Initialize monitoring controls.
         */

        initializeMonitoringEditor();


        /*
         * Enable row double-click details.
         */

        setupMonitoringRowDetails();


        /*
         * If OneDrive data is already available,
         * render it immediately.
         */

        if (
            Array.isArray(
                cachedMonitoringProjects
            ) &&
            cachedMonitoringProjects.length
        ) {

            populateMonitoringFilterOptions();

            renderMonitoringProjects();

            updateDashboardProjectCounts(
                cachedMonitoringProjects
            );

            renderDashboardRecentProjects(
                cachedMonitoringProjects
            );
        }


        console.log(
            "PDS: Monitoring module initialized."
        );


    } catch (error) {

        console.error(
            "PDS: Monitoring initialization error:",
            error
        );
    }
}


/* =========================================================
   AUTH STATE → REFRESH ONE DRIVE DATA
========================================================= */

function handlePDSAuthenticatedState() {

    /*
     * Do not automatically navigate to Dashboard.
     *
     * The saved page is restored instead.
     */

    const savedPage =
        localStorage.getItem(
            PDS_PAGE_STATE_KEY
        );


    if (
        savedPage
    ) {

        showPDSPage(
            savedPage,
            {
                saveState: false,
                restoreScroll: true,
                updateHistory: false
            }
        );
    }


    /*
     * Refresh project data from Excel.
     */

    if (
        oneDriveInitialized
    ) {

        refreshMonitoringFromOneDrive()
            .then(
                projects => {

                    cachedMonitoringProjects =
                        Array.isArray(
                            projects
                        )
                            ? projects
                            : [];


                    populateMonitoringFilterOptions();

                    renderMonitoringProjects();

                    updateDashboardProjectCounts(
                        cachedMonitoringProjects
                    );

                    renderDashboardRecentProjects(
                        cachedMonitoringProjects
                    );

                }
            )
            .catch(
                error => {

                    console.error(
                        "PDS: Failed to refresh Excel data after authentication:",
                        error
                    );
                }
            );
    }
}


/* =========================================================
   HANDLE HASH NAVIGATION
========================================================= */

window.addEventListener(
    "hashchange",
    () => {

        const hash =
            window.location.hash;


        if (
            !hash
        ) {

            return;
        }


        let pageId =
            hash.substring(1);


        try {

            pageId =
                decodeURIComponent(
                    pageId
                );

        } catch {
            /* keep original value */
        }


        if (
            pageId
        ) {

            showPDSPage(
                pageId,
                {
                    saveState: true,
                    restoreScroll: true,
                    updateHistory: false
                }
            );
        }
    }
);


/* =========================================================
   GLOBAL PAGE SAVE
========================================================= */

window.addEventListener(
    "pagehide",
    () => {

        saveCurrentPageState();

    }
);


/* =========================================================
   INITIAL DOM SETUP
========================================================= */

function initializePDSMonitoringDOM() {

    /*
     * These functions are intentionally called
     * after the DOM exists.
     */

    initializePDSMonitoringModule();


    /*
     * Bind monitoring buttons that may have been
     * generated by the HTML after initialization.
     */

    setupMonitoringRefreshButton();

    setupMonitoringClearButton();

    setupMonitoringEditForm();
}


/* =========================================================
   DOM READY
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializePDSMonitoringDOM,
        {
            once: true
        }
    );

} else {

    initializePDSMonitoringDOM();
}


/* =========================================================
   ONE DRIVE DATA REFRESH EVENT
========================================================= */

window.addEventListener(
    "pds:onedrive-data-updated",
    event => {

        const projects =
            event.detail?.projects;


        if (
            Array.isArray(
                projects
            )
        ) {

            cachedMonitoringProjects =
                projects;


            populateMonitoringFilterOptions();

            renderMonitoringProjects();

            updateDashboardProjectCounts(
                projects
            );

            renderDashboardRecentProjects(
                projects
            );
        }
    }
);


/* =========================================================
   DISPATCH DATA UPDATE EVENT
========================================================= */

function dispatchPDSDataUpdated(
    projects
) {

    try {

        window.dispatchEvent(
            new CustomEvent(
                "pds:onedrive-data-updated",
                {
                    detail: {
                        projects:
                            Array.isArray(
                                projects
                            )
                                ? projects
                                : []
                    }
                }
            )
        );

    } catch (error) {

        console.warn(
            "PDS: Unable to dispatch data update event:",
            error
        );
    }
}


/* =========================================================
   OVERRIDE-SAFE DATA REFRESH
========================================================= */

async function refreshPDSMonitoringData() {

    try {

        const projects =
            await refreshMonitoringFromOneDrive();


        cachedMonitoringProjects =
            Array.isArray(
                projects
            )
                ? projects
                : [];


        dispatchPDSDataUpdated(
            cachedMonitoringProjects
        );


        return cachedMonitoringProjects;

    } catch (error) {

        console.error(
            "PDS: Monitoring data refresh failed:",
            error
        );


        showMessage(
            "Unable to retrieve the latest data from OneDrive Excel.",
            "error"
        );


        throw error;
    }
}


/* =========================================================
   MANUAL SAVE + REFRESH
========================================================= */

async function saveAndRefreshMonitoringProject(
    project
) {

    try {

        await saveMonitoringProject(
            project
        );


        const projects =
            await refreshPDSMonitoringData();


        showMessage(
            "Excel updated successfully. Website data has been refreshed.",
            "success"
        );


        return projects;

    } catch (error) {

        console.error(
            "PDS: Save and refresh failed:",
            error
        );


        showMessage(
            error?.message ||
            "Unable to update OneDrive Excel.",
            "error"
        );


        throw error;
    }
}


/* =========================================================
   CLEAN UP INVALID PAGE STATE
========================================================= */

function validateSavedPageState() {

    const savedPage =
        localStorage.getItem(
            PDS_PAGE_STATE_KEY
        );


    if (
        !savedPage
    ) {

        return;
    }


    /*
     * The page may not exist yet if this function
     * executes before all HTML has been loaded.
     */

    if (
        !findPDSPage(
            savedPage
        )
    ) {

        /*
         * Do not erase the state immediately.
         * It may be created dynamically later.
         */

        console.warn(
            "PDS: Saved page is not currently present:",
            savedPage
        );
    }
}


/* =========================================================
   PERIODIC EXCEL REFRESH
========================================================= */

let pdsExcelRefreshTimer =
    null;


function startPDSExcelRefresh() {

    stopPDSExcelRefresh();


    /*
     * Refresh every 5 minutes.
     *
     * This does NOT redirect the user or reset
     * the current page.
     */

    pdsExcelRefreshTimer =
        setInterval(
            async () => {

                if (
                    !oneDriveInitialized
                ) {

                    return;
                }


                try {

                    const currentPage =
                        pdsCurrentPage;


                    await refreshPDSMonitoringData();


                    /*
                     * Return to the same page after
                     * the refresh.
                     */

                    if (
                        currentPage
                    ) {

                        showPDSPage(
                            currentPage,
                            {
                                saveState: false,
                                restoreScroll: true,
                                updateHistory: false
                            }
                        );
                    }

                } catch (error) {

                    console.warn(
                        "PDS: Automatic Excel refresh failed:",
                        error
                    );
                }

            },
            5 * 60 * 1000
        );
}


function stopPDSExcelRefresh() {

    if (
        pdsExcelRefreshTimer
    ) {

        clearInterval(
            pdsExcelRefreshTimer
        );


        pdsExcelRefreshTimer =
            null;
    }
}


/* =========================================================
   START AUTOMATIC REFRESH AFTER ONE DRIVE LOGIN
========================================================= */

window.addEventListener(
    "pds:onedrive-ready",
    () => {

        console.log(
            "PDS: OneDrive ready."
        );


        startPDSExcelRefresh();


        refreshPDSMonitoringData()
            .catch(
                error => {

                    console.warn(
                        "PDS: Initial Excel refresh failed:",
                        error
                    );
                }
            );
    }
);


/* =========================================================
   ONE DRIVE LOGOUT CLEANUP
========================================================= */

window.addEventListener(
    "pds:onedrive-logout",
    () => {

        stopPDSExcelRefresh();


        cachedMonitoringProjects =
            [];


        renderMonitoringProjects();


        updateDashboardProjectCounts(
            []
        );


        renderDashboardRecentProjects(
            []
        );
    }
);


/* =========================================================
   FINAL PDS STATUS
========================================================= */

console.log(
    "PDS — Planning & Design Section: script loaded."
);
/* =========================================================
   PART 13
   FINAL UTILITY FUNCTIONS
========================================================= */


/* =========================================================
   SAFE NUMBER
========================================================= */

function safeNumber(
    value,
    fallback = 0
) {

    if (
        value ===
        undefined ||
        value ===
        null ||
        value ===
        ""
    ) {

        return fallback;
    }


    const cleaned =
        String(
            value
        )
            .replace(
                /,/g,
                ""
            )
            .replace(
                /%/g,
                ""
            )
            .trim();


    const number =
        Number(
            cleaned
        );


    return Number.isFinite(
        number
    )
        ? number
        : fallback;
}


/* =========================================================
   SAFE STRING
========================================================= */

function safeString(
    value,
    fallback = ""
) {

    if (
        value ===
        undefined ||
        value ===
        null
    ) {

        return fallback;
    }


    return String(
        value
    ).trim();
}


/* =========================================================
   NORMALIZE STATUS
========================================================= */

function normalizeStatus(
    value
) {

    return safeString(
        value,
        "Not Started"
    );
}


/* =========================================================
   NORMALIZE PERCENT
========================================================= */

function normalizePercent(
    value
) {

    const number =
        safeNumber(
            value,
            0
        );


    return Math.max(
        0,
        Math.min(
            100,
            number
        )
    );
}


/* =========================================================
   FORMAT CURRENCY
========================================================= */

function formatCurrency(
    value
) {

    const number =
        safeNumber(
            value,
            0
        );


    return number.toLocaleString(
        "en-PH",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}


/* =========================================================
   FORMAT NUMBER
========================================================= */

function formatNumber(
    value
) {

    const number =
        safeNumber(
            value,
            0
        );


    return number.toLocaleString(
        "en-PH"
    );
}


/* =========================================================
   DEBOUNCE
========================================================= */

function debounce(
    callback,
    delay = 300
) {

    let timer =
        null;


    return function (
        ...args
    ) {

        clearTimeout(
            timer
        );


        timer =
            setTimeout(
                () => {

                    callback.apply(
                        this,
                        args
                    );

                },
                delay
            );
    };
}


/* =========================================================
   COPY TO CLIPBOARD
========================================================= */

async function copyToClipboard(
    text
) {

    const value =
        safeString(
            text
        );


    if (!value) {

        return false;
    }


    try {

        if (
            navigator.clipboard &&
            navigator.clipboard.writeText
        ) {

            await navigator.clipboard.writeText(
                value
            );

            return true;
        }


        /*
         * Fallback for older browsers.
         */

        const textarea =
            document.createElement(
                "textarea"
            );


        textarea.value =
            value;


        textarea.style.position =
            "fixed";


        textarea.style.left =
            "-9999px";


        document.body.appendChild(
            textarea
        );


        textarea.select();


        const success =
            document.execCommand(
                "copy"
            );


        textarea.remove();


        return success;

    } catch (error) {

        console.warn(
            "PDS: Clipboard operation failed:",
            error
        );


        return false;
    }
}


/* =========================================================
   DOWNLOAD TEXT FILE
========================================================= */

function downloadTextFile(
    filename,
    content
) {

    const blob =
        new Blob(
            [
                content
            ],
            {
                type:
                    "text/plain;charset=utf-8"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        filename ||
        "pds-export.txt";


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    setTimeout(
        () => {

            URL.revokeObjectURL(
                url
            );

        },
        1000
    );
}


/* =========================================================
   CONFIRM ACTION
========================================================= */

function pdsConfirm(
    message
) {

    return window.confirm(
        message ||
        "Are you sure?"
    );
}


/* =========================================================
   WAIT
========================================================= */

function pdsWait(
    milliseconds
) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                milliseconds
            )
    );
}


/* =========================================================
   WAIT FOR ELEMENT
========================================================= */

function waitForElement(
    selector,
    timeout = 10000
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const existing =
                document.querySelector(
                    selector
                );


            if (
                existing
            ) {

                resolve(
                    existing
                );

                return;
            }


            const observer =
                new MutationObserver(
                    () => {

                        const element =
                            document.querySelector(
                                selector
                            );


                        if (
                            element
                        ) {

                            observer.disconnect();

                            resolve(
                                element
                            );
                        }
                    }
                );


            observer.observe(
                document.documentElement,
                {
                    childList: true,
                    subtree: true
                }
            );


            setTimeout(
                () => {

                    observer.disconnect();


                    reject(
                        new Error(
                            `Element not found: ${selector}`
                        )
                    );

                },
                timeout
            );
        }
    );
}


/* =========================================================
   GET CURRENT PDS PAGE
========================================================= */

function getCurrentPDSPage() {

    return (
        pdsCurrentPage ||
        localStorage.getItem(
            PDS_PAGE_STATE_KEY
        ) ||
        "dashboard"
    );
}


/* =========================================================
   FORCE PAGE SAVE
========================================================= */

function savePDSPageState() {

    saveCurrentPageState();
}


/* =========================================================
   RESTORE PAGE
========================================================= */

function restorePDSPageState() {

    const page =
        getCurrentPDSPage();


    return showPDSPage(
        page,
        {
            saveState: false,
            restoreScroll: true,
            updateHistory: false
        }
    );
}


/* =========================================================
   REFRESH CURRENT PAGE
========================================================= */

async function refreshCurrentPDSPage() {

    const currentPage =
        getCurrentPDSPage();


    if (
        currentPage
            .toLowerCase()
            .includes(
                "monitor"
            )
    ) {

        await refreshPDSMonitoringData();

    } else if (
        currentPage
            .toLowerCase()
            .includes(
                "dashboard"
            )
    ) {

        await refreshDashboardFromOneDrive();

    }


    /*
     * IMPORTANT:
     * Keep the user on the same page.
     */

    showPDSPage(
        currentPage,
        {
            saveState: false,
            restoreScroll: true,
            updateHistory: false
        }
    );
}


/* =========================================================
   WINDOW EXPORTS
   Allows HTML onclick handlers to continue working.
========================================================= */

window.showPDSPage =
    showPDSPage;


window.openProjectMonitoringPage =
    openProjectMonitoringPage;


window.editMonitoringProject =
    editMonitoringProject;


window.closeMonitoringEditModal =
    closeMonitoringEditModal;


window.saveMonitoringProjectFromForm =
    saveMonitoringProjectFromForm;


window.openMonitoringProjectDetails =
    openMonitoringProjectDetails;


window.closeMonitoringProjectDetails =
    closeMonitoringProjectDetails;


window.refreshPDSMonitoringData =
    refreshPDSMonitoringData;


window.refreshCurrentPDSPage =
    refreshCurrentPDSPage;


window.clearMonitoringFilters =
    clearMonitoringFilters;


window.savePDSPageState =
    savePDSPageState;


/* =========================================================
   FINAL ERROR HANDLER
========================================================= */

window.addEventListener(
    "error",
    event => {

        console.error(
            "PDS JavaScript Error:",
            event.error ||
            event.message
        );
    }
);


window.addEventListener(
    "unhandledrejection",
    event => {

        console.error(
            "PDS Unhandled Promise Rejection:",
            event.reason
        );
    }
);


/* =========================================================
   FINAL STARTUP MESSAGE
========================================================= */

console.log(
    "PDS — Planning & Design Section initialized."
);

console.log(
    "PDS: Current page =",
    getCurrentPDSPage()
);
/* =========================================================
   PART 14
   FINAL PROJECT ↔ ONEDRIVE EXCEL SYNCHRONIZATION
========================================================= */


/* =========================================================
   BUILD EXCEL UPDATE PAYLOAD
========================================================= */

function buildExcelUpdatePayload(
    project
) {

    if (!project) {

        throw new Error(
            "Project data is required."
        );
    }


    return {

        category:
            safeString(
                project.category
            ),

        program:
            safeString(
                project.program
            ),

        subProgram:
            safeString(
                project.subProgram
            ),

        projectTitle:
            safeString(
                project.projectTitle
            ),

        noOfProjects:
            safeString(
                project.noOfProjects
            ),

        allocation:
            safeString(
                project.allocation
            ),

        municipality:
            safeString(
                project.municipality
            ),

        program2:
            safeString(
                project.program2
            ),

        plan:
            safeString(
                project.plan
            ),

        advertisementBatch:
            safeString(
                project.advertisementBatch
            ),

        contractId:
            safeString(
                project.contractId
            ),

        canvass:
            safeString(
                project.canvass
            ),

        marketScoping:
            safeString(
                project.marketScoping
            ),

        certOfDed:
            safeString(
                project.certOfDed
            ),

        certOfCmpd:
            safeString(
                project.certOfCmpd
            ),

        certOfValidation:
            safeString(
                project.certOfValidation
            ),

        printedCompleteProgram:
            safeString(
                project.printedCompleteProgram
            ),

        submittedExcelFile:
            safeString(
                project.submittedExcelFile
            ),

        remarks:
            safeString(
                project.remarks
            ),

        architectural:
            safeString(
                project.architectural
            ),

        structural:
            safeString(
                project.structural
            ),

        plumbing:
            safeString(
                project.plumbing
            ),

        electrical:
            safeString(
                project.electrical
            ),

        mechanical:
            safeString(
                project.mechanical
            ),

        survey:
            safeString(
                project.survey
            ),

        printedCompletePlan:
            safeString(
                project.printedCompletePlan
            ),

        remarks2:
            safeString(
                project.remarks2
            ),

        programStatus:
            safeString(
                project.programStatus
            ),

        programPercent:
            normalizePercent(
                project.programPercent
            ),

        planStatus:
            safeString(
                project.planStatus
            ),

        planPercent:
            normalizePercent(
                project.planPercent
            ),

        lastUpdated:
            project.lastUpdated ||
            new Date().toISOString(),

        daysSinceUpdate:
            safeNumber(
                project.daysSinceUpdate,
                0
            ),

        overallStatus:
            safeString(
                project.overallStatus
            )

    };
}


/* =========================================================
   VALIDATE PROJECT BEFORE EXCEL SAVE
========================================================= */

function validateMonitoringProject(
    project
) {

    const errors = [];


    if (!project) {

        errors.push(
            "Project data is missing."
        );

        return errors;
    }


    if (
        !safeString(
            project.projectTitle
        )
    ) {

        errors.push(
            "Project Title is required."
        );
    }


    const programPercent =
        normalizePercent(
            project.programPercent
        );


    const planPercent =
        normalizePercent(
            project.planPercent
        );


    if (
        programPercent < 0 ||
        programPercent > 100
    ) {

        errors.push(
            "Program % must be between 0 and 100."
        );
    }


    if (
        planPercent < 0 ||
        planPercent > 100
    ) {

        errors.push(
            "Plan % must be between 0 and 100."
        );
    }


    return errors;
}


/* =========================================================
   SAVE PROJECT DIRECTLY TO OVERALL
========================================================= */

async function synchronizeProjectToOverall(
    project
) {

    const errors =
        validateMonitoringProject(
            project
        );


    if (
        errors.length
    ) {

        throw new Error(
            errors.join(" ")
        );
    }


    /*
     * OneDrive must already be authenticated.
     */

    if (
        !oneDriveInitialized
    ) {

        throw new Error(
            "OneDrive is not connected. Please sign in to OneDrive first."
        );
    }


    const payload =
        buildExcelUpdatePayload(
            project
        );


    /*
     * Use the existing Excel writer.
     */

    if (
        typeof saveProjectToOverall !==
        "function"
    ) {

        throw new Error(
            "The Excel OVERALL save function is unavailable."
        );
    }


    await saveProjectToOverall(
        project,
        payload
    );


    /*
     * Excel is the source of truth.
     * Refresh the data after the write.
     */

    const refreshed =
        await refreshMonitoringFromOneDrive();


    cachedMonitoringProjects =
        Array.isArray(
            refreshed
        )
            ? refreshed
            : [];


    dispatchPDSDataUpdated(
        cachedMonitoringProjects
    );


    return cachedMonitoringProjects;
}


/* =========================================================
   UPDATE LOCAL PROJECT CACHE
========================================================= */

function updateCachedProject(
    project
) {

    if (
        !project
    ) {

        return;
    }


    if (
        !Array.isArray(
            cachedMonitoringProjects
        )
    ) {

        cachedMonitoringProjects =
            [];
    }


    const index =
        cachedMonitoringProjects.findIndex(
            item =>
                String(
                    item.id
                ) ===
                String(
                    project.id
                )
        );


    if (
        index >= 0
    ) {

        cachedMonitoringProjects[
            index
        ] = {

            ...cachedMonitoringProjects[
                index
            ],

            ...project
        };

    } else {

        cachedMonitoringProjects.push(
            project
        );
    }
}


/* =========================================================
   PROJECT DATA CHANGED
========================================================= */

function handleProjectDataChanged(
    project
) {

    updateCachedProject(
        project
    );


    updateDashboardProjectCounts(
        cachedMonitoringProjects
    );


    renderDashboardRecentProjects(
        cachedMonitoringProjects
    );


    if (
        pdsCurrentPage &&
        pdsCurrentPage
            .toLowerCase()
            .includes(
                "monitor"
            )
    ) {

        renderMonitoringProjects();
    }
}


/* =========================================================
   SAVE MONITORING + SYNCHRONIZE
========================================================= */

async function commitMonitoringProject(
    project
) {

    const previousPage =
        getCurrentPDSPage();


    try {

        showMessage(
            "Saving changes to OneDrive Excel...",
            "info"
        );


        const projects =
            await synchronizeProjectToOverall(
                project
            );


        /*
         * Find the saved record again from
         * the refreshed Excel data.
         */

        const savedProject =
            projects.find(
                item =>
                    String(
                        item.projectTitle
                    ).trim()
                    ===
                    String(
                        project.projectTitle
                    ).trim()
            ) ||
            project;


        handleProjectDataChanged(
            savedProject
        );


        /*
         * Restore the page the user was on.
         */

        showPDSPage(
            previousPage,
            {
                saveState: false,
                restoreScroll: true,
                updateHistory: false
            }
        );


        showMessage(
            "Changes saved to OneDrive Excel.",
            "success"
        );


        return savedProject;

    } catch (error) {

        console.error(
            "PDS: Excel synchronization failed:",
            error
        );


        showMessage(
            error?.message ||
            "Unable to synchronize changes with OneDrive Excel.",
            "error"
        );


        throw error;
    }
}


/* =========================================================
   REPLACE FORM SAVE WITH SYNCHRONIZED SAVE
========================================================= */

async function saveMonitoringChanges() {

    if (
        !currentEditingMonitoringProject
    ) {

        showMessage(
            "No project is currently selected.",
            "error"
        );

        return;
    }


    let updatedProject;


    try {

        updatedProject =
            collectMonitoringFormData();

    } catch (error) {

        showMessage(
            error.message,
            "error"
        );

        return;
    }


    try {

        const savedProject =
            await commitMonitoringProject(
                updatedProject
            );


        currentEditingMonitoringProject =
            null;


        closeMonitoringEditModal();


        return savedProject;

    } catch (
        error
    ) {

        console.error(
            "PDS: Monitoring save failed:",
            error
        );
    }
}


/* =========================================================
   BIND SYNCHRONIZED SAVE BUTTON
========================================================= */

function setupSynchronizedSaveButton() {

    const buttons =
        document.querySelectorAll(
            "#saveMonitoringProject, #saveMonitoringBtn, [data-action='save-monitoring-project']"
        );


    buttons.forEach(
        button => {

            /*
             * Remove the old handler by replacing
             * the element with a clone.
             */

            if (
                button.dataset.syncBound ===
                "true"
            ) {

                return;
            }


            button.dataset.syncBound =
                "true";


            button.addEventListener(
                "click",
                async event => {

                    event.preventDefault();

                    event.stopPropagation();


                    await saveMonitoringChanges();
                }
            );
        }
    );
}


/* =========================================================
   SAVE PROJECT FROM OUTSIDE MONITORING EDITOR
========================================================= */

async function saveProjectAndSync(
    project
) {

    if (
        !project
    ) {

        throw new Error(
            "No project data supplied."
        );
    }


    return await commitMonitoringProject(
        project
    );
}


/* =========================================================
   EXCEL SOURCE-OF-TRUTH CHECK
========================================================= */

function isExcelSourceAvailable() {

    return (
        oneDriveInitialized ===
        true
    );
}


/* =========================================================
   REQUIRE EXCEL CONNECTION
========================================================= */

function requireExcelConnection() {

    if (
        !isExcelSourceAvailable()
    ) {

        throw new Error(
            "OneDrive Excel is not connected. Connect OneDrive before editing project monitoring data."
        );
    }


    return true;
}


/* =========================================================
   ONE DRIVE STATUS DISPLAY
========================================================= */

function updateOneDriveStatusUI() {

    const statusElements =
        document.querySelectorAll(
            "#oneDriveStatus, #onedriveStatus, [data-onedrive-status]"
        );


    const connected =
        isExcelSourceAvailable();


    statusElements.forEach(
        element => {

            if (
                connected
            ) {

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
   ONE DRIVE READY UI HOOK
========================================================= */

window.addEventListener(
    "pds:onedrive-ready",
    () => {

        updateOneDriveStatusUI();

        setupSynchronizedSaveButton();

    }
);


/* =========================================================
   INITIAL EXCEL STATUS
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        updateOneDriveStatusUI();

        setupSynchronizedSaveButton();

    },
    {
        once: true
    }
);


/* =========================================================
   GLOBAL EXPORTS
========================================================= */

window.saveMonitoringChanges =
    saveMonitoringChanges;


window.saveProjectAndSync =
    saveProjectAndSync;


window.synchronizeProjectToOverall =
    synchronizeProjectToOverall;


window.requireExcelConnection =
    requireExcelConnection;


window.isExcelSourceAvailable =
    isExcelSourceAvailable;/* =========================================================
   PART 15
   FINALIZATION + COMPATIBILITY LAYER
========================================================= */


/* =========================================================
   COMPATIBILITY — OLD FUNCTION NAMES
========================================================= */

/*
 * Keep older HTML onclick handlers working.
 */

if (
    typeof window.openProjectMonitoring !==
    "function"
) {

    window.openProjectMonitoring =
        openProjectMonitoringPage;
}


if (
    typeof window.loadProjectMonitoring !==
    "function"
) {

    window.loadProjectMonitoring =
        loadProjectMonitoring;
}


if (
    typeof window.renderMonitoringProjects !==
    "function"
) {

    window.renderMonitoringProjects =
        renderMonitoringProjects;
}


/* =========================================================
   MONITORING SEARCH SHORTCUT
========================================================= */

function focusMonitoringSearch() {

    const input =
        document.querySelector(
            "#monitoringSearch"
        );


    if (!input) {
        return;
    }


    input.focus();


    try {

        input.select();

    } catch {
        /* ignore */
    }
}


/* =========================================================
   KEYBOARD SHORTCUT — CTRL + K
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.ctrlKey &&
            event.key.toLowerCase() ===
                "k"
        ) {

            const currentPage =
                getCurrentPDSPage();


            if (
                currentPage
                    .toLowerCase()
                    .includes(
                        "monitor"
                    )
            ) {

                event.preventDefault();

                focusMonitoringSearch();
            }
        }
    }
);


/* =========================================================
   MONITORING TABLE EMPTY STATE
========================================================= */

function showMonitoringLoadingState() {

    const tbody =
        document.querySelector(
            "#monitoringProjectsBody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = `

        <tr>

            <td
                colspan="8"
                class="empty-state"
            >

                Loading project monitoring
                data from OneDrive Excel...

            </td>

        </tr>

    `;
}


/* =========================================================
   MONITORING ERROR STATE
========================================================= */

function showMonitoringErrorState(
    message
) {

    const tbody =
        document.querySelector(
            "#monitoringProjectsBody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = `

        <tr>

            <td
                colspan="8"
                class="empty-state"
            >

                ${escapeHTML(
                    message ||
                    "Unable to load project monitoring data."
                )}

            </td>

        </tr>

    `;
}


/* =========================================================
   SAFE MONITORING LOAD
========================================================= */

async function safelyLoadMonitoring() {

    showMonitoringLoadingState();


    try {

        const projects =
            await loadProjectMonitoring(
                true
            );


        if (
            Array.isArray(
                projects
            )
        ) {

            cachedMonitoringProjects =
                projects;


            renderMonitoringProjects();

            updateDashboardProjectCounts(
                projects
            );

            renderDashboardRecentProjects(
                projects
            );
        }


        return projects;

    } catch (error) {

        console.error(
            "PDS: Safe monitoring load failed:",
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
   MONITORING NAVIGATION HOOK
========================================================= */

document.addEventListener(
    "click",
    event => {

        const link =
            event.target.closest(
                "[data-open-monitoring]"
            );


        if (!link) {
            return;
        }


        event.preventDefault();


        openProjectMonitoringPage();
    }
);


/* =========================================================
   ONE DRIVE CONNECTION BUTTON
========================================================= */

function setupOneDriveConnectionUI() {

    const buttons =
        document.querySelectorAll(
            "#connectOneDrive, #connectOneDriveBtn, [data-action='connect-onedrive']"
        );


    buttons.forEach(
        button => {

            if (
                button.dataset.connectionBound ===
                "true"
            ) {

                return;
            }


            button.dataset.connectionBound =
                "true";


            button.addEventListener(
                "click",
                async event => {

                    event.preventDefault();


                    try {

                        if (
                            typeof initializeOneDrive ===
                            "function"
                        ) {

                            await initializeOneDrive();

                        } else if (
                            typeof signInToOneDrive ===
                            "function"
                        ) {

                            await signInToOneDrive();

                        } else {

                            throw new Error(
                                "OneDrive authentication function is unavailable."
                            );
                        }


                        updateOneDriveStatusUI();


                    } catch (error) {

                        console.error(
                            "PDS: OneDrive connection failed:",
                            error
                        );


                        showMessage(
                            error?.message ||
                            "Unable to connect to OneDrive.",
                            "error"
                        );
                    }
                }
            );
        }
    );
}


/* =========================================================
   ONE DRIVE STATUS REFRESH
========================================================= */

function refreshOneDriveStatus() {

    updateOneDriveStatusUI();


    if (
        oneDriveInitialized
    ) {

        startPDSExcelRefresh();

    } else {

        stopPDSExcelRefresh();
    }
}


/* =========================================================
   INITIALIZE FINAL UI
========================================================= */

function initializeFinalPDSUI() {

    try {

        setupOneDriveConnectionUI();

        setupMonitoringRefreshButton();

        setupMonitoringClearButton();

        setupMonitoringEditForm();

        setupSynchronizedSaveButton();

        setupMonitoringRowDetails();

        refreshOneDriveStatus();


        /*
         * Restore the user's last page.
         */

        const savedPage =
            getCurrentPDSPage();


        if (
            savedPage
        ) {

            const restored =
                showPDSPage(
                    savedPage,
                    {
                        saveState: false,
                        restoreScroll: true,
                        updateHistory: false
                    }
                );


            if (!restored) {

                showPDSPage(
                    "dashboard",
                    {
                        saveState: false,
                        restoreScroll: false,
                        updateHistory: false
                    }
                );
            }
        }


        console.log(
            "PDS: Final UI initialization complete."
        );

    } catch (error) {

        console.error(
            "PDS: Final UI initialization failed:",
            error
        );
    }
}


/* =========================================================
   FINAL DOM READY
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeFinalPDSUI,
        {
            once: true
        }
    );

} else {

    initializeFinalPDSUI();
}


/* =========================================================
   FINAL GLOBAL REFERENCES
========================================================= */

window.focusMonitoringSearch =
    focusMonitoringSearch;


window.safelyLoadMonitoring =
    safelyLoadMonitoring;


window.refreshOneDriveStatus =
    refreshOneDriveStatus;


/* =========================================================
   FINAL DIAGNOSTIC
========================================================= */

window.PDS_DIAGNOSTIC =
    function () {

        return {

            currentPage:
                getCurrentPDSPage(),

            oneDriveInitialized:
                oneDriveInitialized,

            monitoringProjects:
                Array.isArray(
                    cachedMonitoringProjects
                )
                    ? cachedMonitoringProjects.length
                    : 0,

            currentUser:
                currentUser?.email ||
                null,

            workbook:
                ONEDRIVE_FILE_NAME,

            worksheet:
                ONEDRIVE_SHEET_NAME

        };
    };


console.log(
    "PDS: Diagnostic available as PDS_DIAGNOSTIC()."
);


/* =========================================================
   END OF PART 15
========================================================= */
/* =========================================================
   PART 16
   FINAL SCRIPT CLOSURE
========================================================= */


/* =========================================================
   FINAL SAFE INITIALIZATION
========================================================= */

(function () {

    "use strict";


    /*
     * Prevent duplicate initialization if this
     * script is accidentally loaded more than once.
     */

    if (
        window.__PDS_SCRIPT_INITIALIZED__
    ) {

        console.warn(
            "PDS: script.js was already initialized."
        );

        return;
    }


    window.__PDS_SCRIPT_INITIALIZED__ =
        true;


    console.log(
        "PDS: Final script initialization started."
    );


    /* =====================================================
       ENSURE BASIC STATE
    ===================================================== */

    try {

        if (
            typeof pdsCurrentPage ===
            "undefined"
        ) {

            pdsCurrentPage =
                localStorage.getItem(
                    PDS_PAGE_STATE_KEY
                ) ||
                "dashboard";
        }


        if (
            typeof pdsScrollPositions ===
            "undefined"
        ) {

            pdsScrollPositions =
                {};
        }


    } catch (error) {

        console.warn(
            "PDS: Unable to restore page state:",
            error
        );
    }


    /* =====================================================
       FINAL PAGE RESTORATION
    ===================================================== */

    function restoreLastPDSPage() {

        try {

            const hash =
                window.location.hash;


            let pageId =
                null;


            if (
                hash &&
                hash.length > 1
            ) {

                pageId =
                    decodeURIComponent(
                        hash.substring(1)
                    );
            }


            if (
                !pageId
            ) {

                pageId =
                    localStorage.getItem(
                        PDS_PAGE_STATE_KEY
                    );
            }


            if (
                !pageId
            ) {

                pageId =
                    "dashboard";
            }


            const restored =
                showPDSPage(
                    pageId,
                    {
                        saveState: false,
                        restoreScroll: true,
                        updateHistory: false
                    }
                );


            if (
                !restored
            ) {

                showPDSPage(
                    "dashboard",
                    {
                        saveState: false,
                        restoreScroll: false,
                        updateHistory: false
                    }
                );
            }


        } catch (error) {

            console.error(
                "PDS: Page restoration failed:",
                error
            );


            try {

                showPDSPage(
                    "dashboard",
                    {
                        saveState: false,
                        restoreScroll: false,
                        updateHistory: false
                    }
                );

            } catch {
                /* ignore */
            }
        }
    }


    /* =====================================================
       FINAL DOM EVENT
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            () => {

                restoreLastPDSPage();

            },
            {
                once: true
            }
        );

    } else {

        restoreLastPDSPage();
    }


    /* =====================================================
       EXPOSE FINAL CONTROLS
    ===================================================== */

    window.PDS = {

        getCurrentPage:
            getCurrentPDSPage,

        showPage:
            showPDSPage,

        savePageState:
            savePDSPageState,

        restorePage:
            restorePDSPageState,

        refresh:
            refreshCurrentPDSPage,

        refreshMonitoring:
            refreshPDSMonitoringData,

        editMonitoring:
            editMonitoringProject,

        saveMonitoring:
            saveMonitoringChanges,

        openProject:
            openMonitoringProjectDetails,

        closeProject:
            closeMonitoringProjectDetails,

        clearFilters:
            clearMonitoringFilters,

        oneDriveConnected:
            isExcelSourceAvailable

    };


    /* =====================================================
       FINAL CONSOLE INFORMATION
    ===================================================== */

    console.log(
        "PDS — Planning & Design Section"
    );

    console.log(
        "PDS: OneDrive workbook:",
        typeof ONEDRIVE_FILE_NAME !==
            "undefined"
            ? ONEDRIVE_FILE_NAME
            : "Not configured"
    );

    console.log(
        "PDS: Worksheet:",
        typeof ONEDRIVE_SHEET_NAME !==
            "undefined"
            ? ONEDRIVE_SHEET_NAME
            : "Not configured"
    );

    console.log(
        "PDS: Current page:",
        getCurrentPDSPage()
    );

    console.log(
        "PDS: Excel source-of-truth mode enabled."
    );


})();
/* =========================================================
   PDS AUTHENTICATION STARTUP
   FIX FOR SIGN IN NOT WORKING
========================================================= */

async function startPDSApplication() {

    console.log(
        "PDS: Starting application..."
    );


    if (initialized) {

        console.log(
            "PDS: Application already initialized."
        );

        return;
    }


    /*
     * Wait for the Supabase CDN to become available.
     */

    const supabaseReady =
        await waitForSupabase();


    if (!supabaseReady) {

        console.error(
            "PDS: Supabase library did not load."
        );


        showMessage(
            "Unable to load the authentication service. Please refresh the page.",
            "error"
        );


        return;
    }


    /*
     * Create the Supabase client.
     */

    const supabaseInitialized =
        initializeSupabase();


    if (!supabaseInitialized) {

        console.error(
            "PDS: Supabase initialization failed."
        );


        showMessage(
            "Supabase authentication could not be initialized.",
            "error"
        );


        return;
    }


    /*
     * IMPORTANT:
     * Register the authentication listener BEFORE
     * checking the existing session.
     */

    initializeAuthListener();


    /*
     * Connect the Sign In and Sign Out controls.
     */

    initializeAuthForms();


    initialized =
        true;


    console.log(
        "PDS: Authentication initialized successfully."
    );


    /*
     * Check whether the user already has a session.
     */

    const session =
        await getCurrentSession();


    if (
        session?.user
    ) {

        currentUser =
            session.user;


        await loadCurrentProfile(
            currentUser.id
        );


        updateAuthenticatedUI();


        console.log(
            "PDS: Existing session restored:",
            currentUser.email
        );

    } else {

        currentUser =
            null;


        currentProfile =
            null;


        updateAuthenticatedUI();


        console.log(
            "PDS: No active session. Showing Sign In page."
        );
    }
}


/* =========================================================
   START APPLICATION AFTER DOM IS READY
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            startPDSApplication();

        },
        {
            once: true
        }
    );

} else {

    startPDSApplication();
}


/* =========================================================
   GLOBAL AUTH FUNCTIONS
========================================================= */

window.signInUser =
    signInUser;


window.signOutUser =
    signOutUser;


window.initializeAuthForms =
    initializeAuthForms;


window.initializeAuthListener =
    initializeAuthListener;


window.startPDSApplication =
    startPDSApplication;
/* =========================================================
   PDS AUTH STARTUP — FINAL
========================================================= */

async function startPDSAuthentication() {

    console.log(
        "PDS Auth: Starting authentication..."
    );


    /*
     * WAIT FOR SUPABASE LIBRARY
     */

    const ready =
        await waitForSupabase();


    if (!ready) {

        console.error(
            "PDS Auth: Supabase library not available."
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

    const initializedSupabase =
        initializeSupabase();


    if (!initializedSupabase) {

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
     * AUTH STATE LISTENER
     */

    initializeAuthListener();


    /*
     * SIGN IN / SIGN OUT EVENTS
     */

    initializeAuthForms();


    /*
     * CHECK CURRENT SESSION
     */

    try {

        const {
            data,
            error
        } =
            await db.auth.getSession();


        if (error) {

            console.error(
                "PDS Auth: Session check failed:",
                error
            );


            updateAuthenticatedUI();

            return;
        }


        const session =
            data?.session ||
            null;


        if (
            session?.user
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


    } catch (error) {

        console.error(
            "PDS Auth: Session initialization error:",
            error
        );


        updateAuthenticatedUI();
    }


    console.log(
        "PDS Auth: Authentication startup complete."
    );
}


/* =========================================================
   START AUTH AFTER DOM IS READY
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        function () {

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
   GLOBAL AUTH CONTROLS
========================================================= */

window.startPDSAuthentication =
    startPDSAuthentication;

window.signInUser =
    signInUser;

window.signOutUser =
    signOutUser;
