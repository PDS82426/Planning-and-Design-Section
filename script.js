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

   ONEDRIVE EXCEL INTEGRATION
   SOURCE: trial for website.xlsx
   SHEET: OVERALL
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

async function waitForSupabase(
    maxAttempts = 50
) {

    for (
        let attempt = 0;
        attempt < maxAttempts;
        attempt++
    ) {

        if (
            window.supabase &&
            typeof window.supabase.createClient ===
                "function"
        ) {

            return true;

        }

        await new Promise(
            resolve => {

                setTimeout(
                    resolve,
                    100
                );

            }
        );

    }

    return false;

}


/* =========================================================
   INITIALIZE SUPABASE
========================================================= */

function initializeSupabase() {

    if (
        !window.supabase ||
        typeof window.supabase.createClient !==
            "function"
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
            "PDS: Supabase initialized successfully."
        );


        return true;


    } catch (error) {

        console.error(
            "PDS: Supabase initialization failed:",
            error
        );

        db = null;

        return false;

    }

}


/* =========================================================
   AUTH SCREEN
========================================================= */

function showLogin() {

    console.log(
        "PDS: Showing Sign In screen."
    );


    const authScreen =
        $("authScreen");

    const app =
        $("app");


    document.body.classList.add(
        "auth-active"
    );

    document.body.classList.remove(
        "app-active"
    );


    if (app) {

        app.classList.add(
            "hidden"
        );

        app.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    if (authScreen) {

        authScreen.classList.remove(
            "hidden"
        );

        authScreen.setAttribute(
            "aria-hidden",
            "false"
        );

    }


    document.body.style.overflow =
        "hidden";


    const loginEmail =
        $("loginEmail");

    if (loginEmail) {

        setTimeout(
            () => {

                try {

                    loginEmail.focus();

                } catch (_) {}

            },
            100
        );

    }

}


/* =========================================================
   HIDE AUTH SCREEN
========================================================= */

function hideLogin() {

    console.log(
        "PDS: Hiding Sign In screen."
    );


    const authScreen =
        $("authScreen");

    const app =
        $("app");


    document.body.classList.remove(
        "auth-active"
    );

    document.body.classList.add(
        "app-active"
    );


    if (authScreen) {

        authScreen.classList.add(
            "hidden"
        );

        authScreen.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    if (app) {

        app.classList.remove(
            "hidden"
        );

        app.setAttribute(
            "aria-hidden",
            "false"
        );

    }


    document.body.style.overflow =
        "";

}


/* =========================================================
   AUTH MESSAGE
========================================================= */

function authMessage(
    message,
    type = "info"
) {

    const element =
        $("authMessage");

    if (!element) {

        console.log(
            `PDS Auth [${type}]:`,
            message
        );

        return;

    }


    element.textContent =
        message;


    element.className =
        "auth-message";


    if (type) {

        element.classList.add(
            `is-${type}`
        );

    }


    element.style.display =
        message
            ? "block"
            : "none";

}


/* =========================================================
   CLEAR USER STATE
========================================================= */

function clearUserState() {

    currentUser = null;

    currentProfile = null;

    microsoftAccount = null;

    oneDriveReady = false;

    oneDriveAccessToken = null;

    oneDriveWorkbookRows = [];

    oneDriveHeaders = [];

    oneDriveWorkbookSessionId = null;

    cachedMonitoringProjects = [];

    pdsAIHistory = [];

}


/* =========================================================
   LOAD MICROSOFT MSAL BROWSER
========================================================= */

async function loadMicrosoftMSAL() {

    if (
        window.msal &&
        window.msal.PublicClientApplication
    ) {

        return window.msal;

    }


    if (
        oneDriveScriptLoading
    ) {

        return oneDriveScriptLoading;

    }


    oneDriveScriptLoading =
        new Promise(
            (resolve, reject) => {

                const existing =
                    document.querySelector(
                        'script[data-pds-msal="true"]'
                    );


                if (existing) {

                    existing.addEventListener(
                        "load",
                        () => {

                            if (
                                window.msal
                            ) {

                                resolve(
                                    window.msal
                                );

                            } else {

                                reject(
                                    new Error(
                                        "MSAL loaded but window.msal is unavailable."
                                    )
                                );

                            }

                        }
                    );


                    existing.addEventListener(
                        "error",
                        () => {

                            reject(
                                new Error(
                                    "Unable to load Microsoft MSAL."
                                )
                            );

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

                        if (
                            window.msal
                        ) {

                            resolve(
                                window.msal
                            );

                        } else {

                            reject(
                                new Error(
                                    "MSAL loaded but window.msal is unavailable."
                                )
                            );

                        }

                    };


                script.onerror =
                    () => {

                        reject(
                            new Error(
                                "Microsoft MSAL script failed to load."
                            )
                        );

                    };


                document.head.appendChild(
                    script
                );

            }
        );


    try {

        return await oneDriveScriptLoading;

    } finally {

        oneDriveScriptLoading =
            null;

    }

}


/* =========================================================
   INITIALIZE MICROSOFT AUTH
========================================================= */

async function initializeMicrosoftAuth() {

    if (
        MICROSOFT_CLIENT_ID ===
        "PASTE-YOUR-MICROSOFT-CLIENT-ID-HERE"
    ) {

        console.warn(
            "PDS OneDrive: Microsoft Client ID has not been configured."
        );

        return false;

    }


    try {

        const msal =
            await loadMicrosoftMSAL();


        if (
            !msal ||
            !msal.PublicClientApplication
        ) {

            throw new Error(
                "Microsoft MSAL Browser is unavailable."
            );

        }


        if (
            msalInstance
        ) {

            return true;

        }


        msalInstance =
            new msal.PublicClientApplication({

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
                        true

                }

            });


        await msalInstance.initialize();


        const redirectResult =
            await msalInstance.handleRedirectPromise();


        if (
            redirectResult?.account
        ) {

            microsoftAccount =
                redirectResult.account;

            msalInstance.setActiveAccount(
                microsoftAccount
            );

        }


        const accounts =
            msalInstance.getAllAccounts();


        if (
            !microsoftAccount &&
            accounts.length
        ) {

            microsoftAccount =
                accounts[0];

            msalInstance.setActiveAccount(
                microsoftAccount
            );

        }


        console.log(
            "PDS OneDrive: Microsoft authentication initialized."
        );


        return true;


    } catch (error) {

        console.error(
            "PDS OneDrive: Microsoft authentication initialization failed:",
            error
        );

        msalInstance =
            null;

        return false;

    }

}


/* =========================================================
   MICROSOFT LOGIN
========================================================= */

async function signInToMicrosoft() {

    if (
        !MICROSOFT_CLIENT_ID ||
        MICROSOFT_CLIENT_ID ===
            "PASTE-YOUR-MICROSOFT-CLIENT-ID-HERE"
    ) {

        alert(
            "Microsoft OneDrive is not configured yet.\n\nPlease enter your Microsoft Entra Client ID in script.js."
        );

        return false;

    }


    try {

        if (
            !msalInstance
        ) {

            const ready =
                await initializeMicrosoftAuth();


            if (!ready) {

                throw new Error(
                    "Microsoft authentication could not be initialized."
                );

            }

        }


        const loginRequest = {

            scopes:
                MICROSOFT_SCOPES

        };


        const response =
            await msalInstance.loginPopup(
                loginRequest
            );


        if (
            response?.account
        ) {

            microsoftAccount =
                response.account;

            msalInstance.setActiveAccount(
                microsoftAccount
            );

        }


        oneDriveAccessToken =
            await acquireMicrosoftAccessToken();


        if (
            oneDriveAccessToken
        ) {

            oneDriveReady =
                true;

            await loadOverallFromOneDrive();

            return true;

        }


        return false;


    } catch (error) {

        console.error(
            "PDS OneDrive sign-in failed:",
            error
        );


        alert(
            "Microsoft sign-in failed.\n\n" +
            (
                error?.message ||
                "Unknown Microsoft authentication error."
            )
        );


        return false;

    }

}


/* =========================================================
   MICROSOFT ACCESS TOKEN
========================================================= */

async function acquireMicrosoftAccessToken() {

    if (
        !msalInstance
    ) {

        throw new Error(
            "Microsoft authentication is not initialized."
        );

    }


    let account =
        microsoftAccount;


    if (!account) {

        account =
            msalInstance.getActiveAccount();

    }


    if (!account) {

        const accounts =
            msalInstance.getAllAccounts();


        account =
            accounts[0] ||
            null;

    }


    if (!account) {

        throw new Error(
            "No Microsoft account is signed in."
        );

    }


    microsoftAccount =
        account;


    msalInstance.setActiveAccount(
        account
    );


    try {

        const response =
            await msalInstance.acquireTokenSilent({

                account,

                scopes:
                    MICROSOFT_SCOPES

            });


        oneDriveAccessToken =
            response.accessToken;


        return response.accessToken;


    } catch (silentError) {

        console.warn(
            "PDS OneDrive: Silent token acquisition failed. Opening Microsoft sign-in.",
            silentError
        );


        const response =
            await msalInstance.acquireTokenPopup({

                account,

                scopes:
                    MICROSOFT_SCOPES

            });


        oneDriveAccessToken =
            response.accessToken;


        return response.accessToken;

    }

}


/* =========================================================
   GRAPH REQUEST
========================================================= */

async function graphRequest(
    endpoint,
    options = {},
    retry = true
) {

    let token =
        oneDriveAccessToken;


    if (!token) {

        token =
            await acquireMicrosoftAccessToken();

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
            endpoint,
            {

                ...options,

                headers

            }
        );


    if (
        response.status ===
            401 &&
        retry
    ) {

        oneDriveAccessToken =
            await acquireMicrosoftAccessToken();


        return graphRequest(
            endpoint,
            options,
            false
        );

    }


    const text =
        await response.text();


    let data =
        null;


    if (text) {

        try {

            data =
                JSON.parse(text);

        } catch (_) {

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
            `Microsoft Graph request failed (${response.status}).`;


        throw new Error(
            message
        );

    }


    return data;

}


/* =========================================================
   FIND EXCEL FILE IN ONEDRIVE
========================================================= */

async function findOverallWorkbook() {

    const encodedName =
        encodeURIComponent(
            ONEDRIVE_FILE_NAME
        );


    /*
     * Search OneDrive root recursively.
     */

    const endpoint =
        `${ONEDRIVE_GRAPH_ROOT}/me/drive/root/search(q='${encodedName}')`;


    const data =
        await graphRequest(
            endpoint
        );


    const items =
        Array.isArray(
            data?.value
        )
            ? data.value
            : [];


    const exact =
        items.find(
            item =>
                String(
                    item?.name ||
                    ""
                ).toLowerCase() ===
                ONEDRIVE_FILE_NAME.toLowerCase()
        );


    if (
        exact
    ) {

        return exact;

    }


    /*
     * Fallback:
     * search result may use encoded or
     * slightly different naming.
     */

    const fallback =
        items.find(
            item =>
                String(
                    item?.name ||
                    ""
                )
                    .toLowerCase()
                    .includes(
                        "trial for website"
                    )
        );


    if (
        fallback
    ) {

        return fallback;

    }


    throw new Error(
        `The OneDrive file "${ONEDRIVE_FILE_NAME}" could not be found.`
    );

}


/* =========================================================
   GET EXCEL WORKBOOK ITEM
========================================================= */

async function getOverallWorkbookItem() {

    const item =
        await findOverallWorkbook();


    if (
        !item?.id
    ) {

        throw new Error(
            "The OneDrive Excel workbook was found but has no valid item ID."
        );

    }


    return item;

}


/* =========================================================
   CREATE EXCEL WORKBOOK SESSION
========================================================= */

async function createWorkbookSession(
    driveItemId
) {

    const endpoint =
        `${ONEDRIVE_GRAPH_ROOT}/me/drive/items/${encodeURIComponent(driveItemId)}/workbook/createSession`;


    const data =
        await graphRequest(
            endpoint,
            {

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body:
                    JSON.stringify({

                        persistChanges:
                            true

                    })

            }
        );


    oneDriveWorkbookSessionId =
        data?.id ||
        null;


    return oneDriveWorkbookSessionId;

}


/* =========================================================
   EXCEL WORKBOOK URL
========================================================= */

function workbookEndpoint(
    driveItemId,
    path
) {

    let endpoint =
        `${ONEDRIVE_GRAPH_ROOT}/me/drive/items/${encodeURIComponent(driveItemId)}/workbook`;


    if (
        path
    ) {

        endpoint +=
            `/${path}`;

    }


    if (
        oneDriveWorkbookSessionId
    ) {

        endpoint +=
            endpoint.includes("?")
                ? "&"
                : "?";


        endpoint +=
            `workbook-session-id=${encodeURIComponent(
                oneDriveWorkbookSessionId
            )}`;

    }


    return endpoint;

}


/* =========================================================
   GET WORKSHEET
========================================================= */

async function getOverallWorksheet(
    driveItemId
) {

    const endpoint =
        workbookEndpoint(
            driveItemId,
            `worksheets('${encodeURIComponent(
                ONEDRIVE_SHEET_NAME
            )}')`
        );


    return graphRequest(
        endpoint
    );

}


/* =========================================================
   GET OVERALL USED RANGE
========================================================= */

async function getOverallUsedRange(
    driveItemId
) {

    const endpoint =
        workbookEndpoint(
            driveItemId,
            `worksheets('${encodeURIComponent(
                ONEDRIVE_SHEET_NAME
            )}')/usedRange(valuesOnly=false)`
        );


    return graphRequest(
        endpoint
    );

}


/* =========================================================
   NORMALIZE EXCEL VALUE
========================================================= */

function normalizeExcelValue(
    value
) {

    if (
        value ===
            null ||
        value ===
            undefined
    ) {

        return "";

    }


    if (
        typeof value ===
            "string"
    ) {

        return value.trim();

    }


    return value;

}


/* =========================================================
   FIND HEADER ROW
========================================================= */

function findOverallHeaderRow(
    values
) {

    if (
        !Array.isArray(values)
    ) {

        return -1;

    }


    const requiredHeaders = [

        "CATEGORY",

        "PROGRAM",

        "SUB-PROGRAM",

        "PROJECT TITLE AS PER GAA",

        "NO. OF PROJS",

        "ALLOCATION",

        "MUNICIPALITY",

        "PROGRAM2"

    ];


    let bestIndex =
        -1;


    let bestScore =
        0;


    values.forEach(
        (row, index) => {

            if (
                !Array.isArray(row)
            ) {

                return;

            }


            const normalized =
                row.map(
                    value =>
                        String(
                            value ??
                            ""
                        )
                            .trim()
                            .toLowerCase()
                );


            let score =
                0;


            requiredHeaders.forEach(
                header => {

                    if (
                        normalized.includes(
                            header.toLowerCase()
                        )
                    ) {

                        score++;

                    }

                }
            );


            if (
                score >
                bestScore
            ) {

                bestScore =
                    score;

                bestIndex =
                    index;

            }

        }
    );


    return bestIndex;

}


/* =========================================================
   BUILD OBJECT FROM EXCEL ROW
========================================================= */

function excelRowToObject(
    headers,
    row,
    excelRowNumber
) {

    const object =
        {

            __excelRowNumber:
                excelRowNumber

        };


    headers.forEach(
        (header, index) => {

            if (
                !header
            ) {

                return;

            }


            object[header] =
                normalizeExcelValue(
                    row?.[index]
                );

        }
    );


    return object;

}


/* =========================================================
   LOAD OVERALL FROM ONEDRIVE
========================================================= */

async function loadOverallFromOneDrive() {

    if (
        !MICROSOFT_CLIENT_ID ||
        MICROSOFT_CLIENT_ID ===
            "PASTE-YOUR-MICROSOFT-CLIENT-ID-HERE"
    ) {

        console.warn(
            "PDS OneDrive: Client ID not configured."
        );

        return [];

    }


    try {

        oneDriveAccessToken =
            oneDriveAccessToken ||
            await acquireMicrosoftAccessToken();


        const workbook =
            await getOverallWorkbookItem();


        /*
         * Create persistent workbook session.
         */

        try {

            await createWorkbookSession(
                workbook.id
            );

        } catch (sessionError) {

            console.warn(
                "PDS OneDrive: Workbook session could not be created. Continuing without persistent session.",
                sessionError
            );

            oneDriveWorkbookSessionId =
                null;

        }


        const usedRange =
            await getOverallUsedRange(
                workbook.id
            );


        const values =
            Array.isArray(
                usedRange?.values
            )
                ? usedRange.values
                : [];


        if (
            !values.length
        ) {

            throw new Error(
                `The "${ONEDRIVE_SHEET_NAME}" worksheet contains no readable values.`
            );

        }


        const headerIndex =
            findOverallHeaderRow(
                values
            );


        if (
            headerIndex <
            0
        ) {

            throw new Error(
                `Could not identify the header row in "${ONEDRIVE_SHEET_NAME}".`
            );

        }


        oneDriveHeaders =
            values[
                headerIndex
            ].map(
                value =>
                    String(
                        value ??
                        ""
                    ).trim()
            );


        const rows =
            [];


        for (
            let i =
                headerIndex + 1;
            i <
                values.length;
            i++
        ) {

            const row =
                values[i];


            if (
                !Array.isArray(row)
            ) {

                continue;

            }


            const titleIndex =
                oneDriveHeaders.findIndex(
                    header =>
                        String(
                            header
                        )
                            .trim()
                            .toLowerCase() ===
                        "project title as per gaa"
                            .toLowerCase()
                );


            const title =
                titleIndex >= 0
                    ? row[
                        titleIndex
                    ]
                    : "";


            /*
             * Ignore completely blank rows.
             */

            const hasAnyValue =
                row.some(
                    value =>
                        String(
                            value ??
                            ""
                        ).trim() !==
                        ""
                );


            if (
                !hasAnyValue
            ) {

                continue;

            }


            /*
             * The Excel row number is
             * Excel's actual 1-based row.
             */

            const excelRowNumber =
                i + 1;


            /*
             * Keep rows that contain
             * project information.
             */

            if (
                String(
                    title ??
                    ""
                ).trim() ===
                "" &&
                row.every(
                    value =>
                        String(
                            value ??
                            ""
                        ).trim() ===
                        ""
                )
            ) {

                continue;

            }


            rows.push(
                excelRowToObject(
                    oneDriveHeaders,
                    row,
                    excelRowNumber
                )
            );

        }


        oneDriveWorkbookRows =
            rows;


        cachedMonitoringProjects =
            [...rows];


        oneDriveReady =
            true;


        console.log(
            `PDS OneDrive: Loaded ${rows.length} project rows from OVERALL.`
        );


        /*
         * Refresh all project-monitoring
         * UI using the live Excel data.
         */

        if (
            typeof applyMonitoringFilters ===
            "function"
        ) {

            applyMonitoringFilters();

        }


        if (
            typeof renderProjectsFromOverall ===
            "function"
        ) {

            renderProjectsFromOverall(
                rows
            );

        }


        return rows;


    } catch (error) {

        oneDriveReady =
            false;


        console.error(
            "PDS OneDrive: Unable to load OVERALL:",
            error
        );


        throw error;

    }

}


/* =========================================================
   FIND EXCEL COLUMN INDEX
========================================================= */

function getOverallColumnIndex(
    columnName
) {

    const target =
        String(
            columnName ??
            ""
        )
            .trim()
            .toLowerCase();


    return oneDriveHeaders.findIndex(
        header =>
            String(
                header ??
                ""
            )
                .trim()
                .toLowerCase() ===
            target
    );

}


/* =========================================================
   CONVERT VALUE FOR EXCEL
========================================================= */

function prepareExcelValue(
    value
) {

    if (
        value ===
            null ||
        value ===
            undefined
    ) {

        return "";

    }


    if (
        typeof value ===
            "number"
    ) {

        return value;

    }


    if (
        typeof value ===
            "boolean"
    ) {

        return value;

    }


    return String(
        value
    );

}


/* =========================================================
   UPDATE SINGLE OVERALL CELL
========================================================= */

async function updateOverallCell(
    excelRowNumber,
    columnName,
    value
) {

    if (
        !oneDriveReady
    ) {

        throw new Error(
            "OneDrive is not connected."
        );

    }


    const columnIndex =
        getOverallColumnIndex(
            columnName
        );


    if (
        columnIndex <
        0
    ) {

        throw new Error(
            `Column "${columnName}" was not found in OVERALL.`
        );

    }


    /*
     * Excel Graph range addresses use
     * column letters. Convert zero-based
     * index to Excel letters.
     */

    function columnLetters(
        zeroBasedIndex
    ) {

        let index =
            zeroBasedIndex + 1;

        let letters =
            "";


        while (
            index >
            0
        ) {

            const remainder =
                (
                    index - 1
                ) %
                26;


            letters =
                String.fromCharCode(
                    65 +
                    remainder
                ) +
                letters;


            index =
                Math.floor(
                    (
                        index - 1
                    ) /
                    26
                );

        }


        return letters;

    }


    const columnLetter =
        columnLetters(
            columnIndex
        );


    const workbook =
        await getOverallWorkbookItem();


    const endpoint =
        workbookEndpoint(
            workbook.id,
            `worksheets('${encodeURIComponent(
                ONEDRIVE_SHEET_NAME
            )}')/range(address='${columnLetter}${excelRowNumber}')`
        );


    return graphRequest(
        endpoint,
        {

            method:
                "PATCH",

            headers: {

                "Content-Type":
                    "application/json"

            },

            body:
                JSON.stringify({

                    values: [
                        [
                            prepareExcelValue(
                                value
                            )
                        ]
                    ]

                })

        }
    );

}


/* =========================================================
   UPDATE MULTIPLE OVERALL CELLS
========================================================= */

async function updateOverallRow(
    project,
    changes
) {

    if (
        !project
    ) {

        throw new Error(
            "No project was supplied."
        );

    }


    const rowNumber =
        Number(
            project.__excelRowNumber
        );


    if (
        !Number.isFinite(
            rowNumber
        ) ||
        rowNumber <
            1
    ) {

        throw new Error(
            "The project does not contain a valid Excel row number."
        );

    }


    const entries =
        Object.entries(
            changes ||
            {}
        );


    if (
        !entries.length
    ) {

        return project;

    }


    /*
     * Update only the cells that
     * the website actually changed.
     */

    for (
        const [
            columnName,
            value
        ]
        of entries
    ) {

        await updateOverallCell(
            rowNumber,
            columnName,
            value
        );

    }


    /*
     * Reload from Excel so that
     * formulas and calculated fields
     * are reflected in the website.
     */

    await loadOverallFromOneDrive();


    const updated =
        oneDriveWorkbookRows.find(
            row =>
                Number(
                    row.__excelRowNumber
                ) ===
                rowNumber
        );


    return updated ||
        project;

}


/* =========================================================
   SAVE PROJECT TO OVERALL
========================================================= */

async function saveProjectToOverall(
    project,
    changes
) {

    try {

        const updated =
            await updateOverallRow(
                project,
                changes
            );


        console.log(
            "PDS OneDrive: Project saved to OVERALL.",
            updated
        );


        return updated;


    } catch (error) {

        console.error(
            "PDS OneDrive: Failed to save project:",
            error
        );


        alert(
            "Unable to save the project to OneDrive Excel.\n\n" +
            (
                error?.message ||
                "Unknown error."
            )
        );


        throw error;

    }

}


/* =========================================================
   REFRESH OVERALL
========================================================= */

async function refreshOverallFromOneDrive() {

    try {

        const rows =
            await loadOverallFromOneDrive();


        if (
            typeof renderProjectsFromOverall ===
            "function"
        ) {

            renderProjectsFromOverall(
                rows
            );

        }


        if (
            typeof loadProjectMonitoring ===
            "function"
        ) {

            await loadProjectMonitoring();

        }


        return rows;


    } catch (error) {

        console.error(
            "PDS OneDrive refresh failed:",
            error
        );


        return [];

    }

}
/* =========================================================
   VIEW MONITORING PROJECT — CONTINUATION
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


    const lastUpdated =
        getMonitoringValue(
            project,
            "LAST UPDATED"
        ) ||
        "—";


    content.innerHTML = `

        <div class="project-modal-header">

            <div>

                <span class="project-modal-kicker">
                    PROJECT MONITORING
                </span>

                <h2>
                    ${escapeHTML(title)}
                </h2>

            </div>

            <button
                type="button"
                class="modal-close"
                data-modal-close
                aria-label="Close"
            >
                ×
            </button>

        </div>


        <div class="project-modal-meta">

            <div>
                <span>PROJECT NO.</span>
                <strong>
                    ${escapeHTML(projectNo)}
                </strong>
            </div>

            <div>
                <span>MUNICIPALITY</span>
                <strong>
                    ${escapeHTML(municipality)}
                </strong>
            </div>

            <div>
                <span>PROGRAM ASSIGNED</span>
                <strong>
                    ${escapeHTML(programUser)}
                </strong>
            </div>

            <div>
                <span>PLAN ASSIGNED</span>
                <strong>
                    ${escapeHTML(planUser)}
                </strong>
            </div>

        </div>


        <div class="monitoring-detail-grid">

            <div class="monitoring-detail-card">

                <span>
                    PROGRAM STATUS
                </span>

                <strong>
                    ${escapeHTML(
                        getMonitoringValue(
                            project,
                            "PROGRAM STATUS"
                        ) || "—"
                    )}
                </strong>

                <div class="progress-track">

                    <div
                        class="progress-fill"
                        style="width:${programPercent}%"
                    ></div>

                </div>

                <b>
                    ${programPercent.toFixed(2)}%
                </b>

            </div>


            <div class="monitoring-detail-card">

                <span>
                    PLAN STATUS
                </span>

                <strong>
                    ${escapeHTML(
                        getMonitoringValue(
                            project,
                            "PLAN STATUS"
                        ) || "—"
                    )}
                </strong>

                <div class="progress-track">

                    <div
                        class="progress-fill"
                        style="width:${planPercent}%"
                    ></div>

                </div>

                <b>
                    ${planPercent.toFixed(2)}%
                </b>

            </div>


            <div class="monitoring-detail-card">

                <span>
                    OVERALL STATUS
                </span>

                <strong>
                    ${escapeHTML(overallStatus)}
                </strong>

            </div>


            <div class="monitoring-detail-card">

                <span>
                    LAST UPDATED
                </span>

                <strong>
                    ${escapeHTML(lastUpdated)}
                </strong>

            </div>

        </div>


        <div class="project-monitoring-fields">

            ${renderMonitoringField(
                project,
                "ADVERTISEMENT BATCH"
            )}

            ${renderMonitoringField(
                project,
                "CANVASS"
            )}

            ${renderMonitoringField(
                project,
                "MARKET SCOPING"
            )}

            ${renderMonitoringField(
                project,
                "CERT OF DED"
            )}

            ${renderMonitoringField(
                project,
                "CERT OF CMPD"
            )}

            ${renderMonitoringField(
                project,
                "CERT OF VALIDATION"
            )}

            ${renderMonitoringField(
                project,
                "PRINTED COMPLETE PROGRAM"
            )}

            ${renderMonitoringField(
                project,
                "SUBMITTED EXCEL FILE"
            )}

            ${renderMonitoringField(
                project,
                "REMARKS"
            )}

            ${renderMonitoringField(
                project,
                "ARCHITECTURAL"
            )}

            ${renderMonitoringField(
                project,
                "STRUCTURAL"
            )}

            ${renderMonitoringField(
                project,
                "PLUMBING"
            )}

            ${renderMonitoringField(
                project,
                "ELECTRICAL"
            )}

            ${renderMonitoringField(
                project,
                "MECHANICAL"
            )}

            ${renderMonitoringField(
                project,
                "SURVEY"
            )}

            ${renderMonitoringField(
                project,
                "PRINTED COMPLETE PLAN"
            )}

            ${renderMonitoringField(
                project,
                "REMARKS2"
            )}

        </div>

    `;


    modal.classList.remove(
        "hidden"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "modal-open"
    );

}


/* =========================================================
   RENDER MONITORING FIELD
========================================================= */

function renderMonitoringField(
    project,
    columnName
) {

    const value =
        getMonitoringValue(
            project,
            columnName
        );


    return `

        <div class="monitoring-field">

            <span>
                ${escapeHTML(
                    columnName
                )}
            </span>

            <strong>
                ${escapeHTML(
                    value || "—"
                )}
            </strong>

        </div>

    `;

}


/* =========================================================
   CLOSE PROJECT MODAL
========================================================= */

function closeProjectModal() {

    const modal =
        $("projectModal");


    if (!modal) {

        return;

    }


    modal.classList.add(
        "hidden"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.classList.remove(
        "modal-open"
    );

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


    openMonitoringEditModal(
        project
    );

}


/* =========================================================
   OPEN MONITORING EDIT MODAL
========================================================= */

function openMonitoringEditModal(
    project
) {

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


    const editableFields = [

        "ADVERTISEMENT BATCH",

        "CANVASS",

        "MARKET SCOPING",

        "CERT OF DED",

        "CERT OF CMPD",

        "CERT OF VALIDATION",

        "PRINTED COMPLETE PROGRAM",

        "SUBMITTED EXCEL FILE",

        "REMARKS",

        "ARCHITECTURAL",

        "STRUCTURAL",

        "PLUMBING",

        "ELECTRICAL",

        "MECHANICAL",

        "SURVEY",

        "PRINTED COMPLETE PLAN",

        "REMARKS2",

        "PROGRAM STATUS",

        "PROGRAM % COMPLETE",

        "PLAN STATUS",

        "PLAN % COMPLETE",

        "OVERALL STATUS"

    ];


    content.innerHTML = `

        <div class="project-modal-header">

            <div>

                <span class="project-modal-kicker">
                    EDIT PROJECT MONITORING
                </span>

                <h2>
                    ${escapeHTML(title)}
                </h2>

                <small>
                    ${escapeHTML(projectNo)}
                </small>

            </div>

            <button
                type="button"
                class="modal-close"
                data-modal-close
                aria-label="Close"
            >
                ×
            </button>

        </div>


        <form
            id="monitoringEditForm"
            class="monitoring-edit-form"
        >

            ${editableFields
                .map(
                    field =>
                        renderMonitoringEditField(
                            project,
                            field
                        )
                )
                .join("")}


            <div class="monitoring-edit-actions">

                <button
                    type="button"
                    class="btn-secondary"
                    data-modal-close
                >
                    CANCEL
                </button>

                <button
                    type="submit"
                    class="btn-primary"
                >
                    SAVE TO ONEDRIVE
                </button>

            </div>

        </form>

    `;


    modal.classList.remove(
        "hidden"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "modal-open"
    );


    const form =
        $("monitoringEditForm");


    if (form) {

        form.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                await saveMonitoringEdit(
                    project,
                    form
                );

            }
        );

    }

}


/* =========================================================
   RENDER EDIT FIELD
========================================================= */

function renderMonitoringEditField(
    project,
    columnName
) {

    const value =
        getMonitoringValue(
            project,
            columnName
        );


    const normalized =
        String(
            columnName
        )
            .trim()
            .toUpperCase();


    const isPercent =
        normalized ===
            "PROGRAM % COMPLETE" ||
        normalized ===
            "PLAN % COMPLETE";


    const isLongText =
        normalized ===
            "REMARKS" ||
        normalized ===
            "REMARKS2";


    const isStatus =
        normalized ===
            "PROGRAM STATUS" ||
        normalized ===
            "PLAN STATUS" ||
        normalized ===
            "OVERALL STATUS";


    if (isStatus) {

        return `

            <label class="monitoring-edit-field">

                <span>
                    ${escapeHTML(columnName)}
                </span>

                <input
                    type="text"
                    name="${escapeHTML(columnName)}"
                    value="${escapeAttribute(value)}"
                    autocomplete="off"
                >

            </label>

        `;

    }


    if (isPercent) {

        return `

            <label class="monitoring-edit-field">

                <span>
                    ${escapeHTML(columnName)}
                </span>

                <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    name="${escapeHTML(columnName)}"
                    value="${escapeAttribute(
                        monitoringPercent(value)
                    )}"
                >

            </label>

        `;

    }


    if (isLongText) {

        return `

            <label class="monitoring-edit-field monitoring-edit-wide">

                <span>
                    ${escapeHTML(columnName)}
                </span>

                <textarea
                    name="${escapeHTML(columnName)}"
                    rows="3"
                >${escapeHTML(
                    value
                )}</textarea>

            </label>

        `;

    }


    return `

        <label class="monitoring-edit-field">

            <span>
                ${escapeHTML(columnName)}
            </span>

            <input
                type="text"
                name="${escapeHTML(columnName)}"
                value="${escapeAttribute(value)}"
                autocomplete="off"
            >

        </label>

    `;

}


/* =========================================================
   SAVE MONITORING EDIT
========================================================= */

async function saveMonitoringEdit(
    project,
    form
) {

    if (
        !form
    ) {

        return;

    }


    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );


    if (submitButton) {

        submitButton.disabled =
            true;

        submitButton.textContent =
            "SAVING...";

    }


    try {

        if (
            !oneDriveReady
        ) {

            await signInToMicrosoft();

        }


        if (
            !oneDriveReady
        ) {

            throw new Error(
                "OneDrive is not connected."
            );

        }


        const changes =
            {};


        const formData =
            new FormData(
                form
            );


        formData.forEach(
            (
                value,
                key
            ) => {

                let finalValue =
                    value;


                if (
                    key ===
                        "PROGRAM % COMPLETE" ||
                    key ===
                        "PLAN % COMPLETE"
                ) {

                    finalValue =
                        monitoringPercent(
                            value
                        );

                }


                changes[key] =
                    finalValue;

            }
        );


        /*
         * LAST UPDATED is maintained
         * automatically whenever the
         * website changes a project.
         */

        changes[
            "LAST UPDATED"
        ] =
            new Date().toISOString();


        await saveProjectToOverall(
            project,
            changes
        );


        alert(
            "Project monitoring record successfully saved to OneDrive Excel."
        );


        closeProjectModal();


        await refreshOverallFromOneDrive();


    } catch (error) {

        console.error(
            "PDS: Monitoring save failed:",
            error
        );


        alert(
            "Save failed.\n\n" +
            (
                error?.message ||
                "Unable to update OneDrive Excel."
            )
        );


    } finally {

        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                "SAVE TO ONEDRIVE";

        }

    }

}


/* =========================================================
   MONITORING EVENT DELEGATION
========================================================= */

function setupMonitoringEvents() {

    const list =
        $("monitoringList");


    if (
        list &&
        !list.dataset.eventsReady
    ) {

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


        list.dataset.eventsReady =
            "true";

    }


    const search =
        $("monitoringSearch");


    if (
        search &&
        !search.dataset.eventsReady
    ) {

        search.addEventListener(
            "input",
            applyMonitoringFilters
        );


        search.dataset.eventsReady =
            "true";

    }


    const statusFilter =
        $("monitoringStatusFilter");


    if (
        statusFilter &&
        !statusFilter.dataset.eventsReady
    ) {

        statusFilter.addEventListener(
            "change",
            applyMonitoringFilters
        );


        statusFilter.dataset.eventsReady =
            "true";

    }


    const myProjectsFilter =
        $("myProjectsFilter");


    if (
        myProjectsFilter &&
        !myProjectsFilter.dataset.eventsReady
    ) {

        myProjectsFilter.addEventListener(
            "change",
            applyMonitoringFilters
        );


        myProjectsFilter.dataset.eventsReady =
            "true";

    }


    const refreshButton =
        $("refreshMonitoring");


    if (
        refreshButton &&
        !refreshButton.dataset.eventsReady
    ) {

        refreshButton.addEventListener(
            "click",
            async () => {

                refreshButton.disabled =
                    true;


                const originalText =
                    refreshButton.textContent;


                refreshButton.textContent =
                    "REFRESHING...";


                try {

                    await refreshOverallFromOneDrive();

                } finally {

                    refreshButton.disabled =
                        false;

                    refreshButton.textContent =
                        originalText;

                }

            }
        );


        refreshButton.dataset.eventsReady =
            "true";

    }

}


/* =========================================================
   MODAL EVENTS
========================================================= */

function setupProjectModalEvents() {

    const modal =
        $("projectModal");


    if (
        !modal ||
        modal.dataset.eventsReady
    ) {

        return;

    }


    modal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modal
            ) {

                closeProjectModal();

                return;

            }


            if (
                event.target.closest(
                    "[data-modal-close]"
                )
            ) {

                closeProjectModal();

            }

        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                closeProjectModal();

            }

        }
    );


    modal.dataset.eventsReady =
        "true";

}


/* =========================================================
   MONITORING INITIALIZATION
========================================================= */

async function initializeProjectMonitoring() {

    setupMonitoringEvents();

    setupProjectModalEvents();


    /*
     * If the Microsoft account is
     * already available, immediately
     * load the live Excel data.
     */

    try {

        if (
            MICROSOFT_CLIENT_ID !==
            "PASTE-YOUR-MICROSOFT-CLIENT-ID-HERE"
        ) {

            const ready =
                await initializeMicrosoftAuth();


            if (
                ready &&
                microsoftAccount
            ) {

                oneDriveAccessToken =
                    await acquireMicrosoftAccessToken();


                await loadOverallFromOneDrive();

            }

        }

    } catch (error) {

        console.warn(
            "PDS: OneDrive automatic initialization was not completed:",
            error
        );

    }


    /*
     * If no live data is available,
     * do not silently replace it with
     * the old local test dataset.
     *
     * This keeps OVERALL as the source
     * of truth.
     */

    if (
        !oneDriveReady
    ) {

        cachedMonitoringProjects =
            [];

        renderProjectMonitoring(
            []
        );

    }

}


/* =========================================================
   CONNECT ONEDRIVE BUTTON
========================================================= */

function setupOneDriveButton() {

    const buttons =
        document.querySelectorAll(
            "#connectOneDrive, [data-action='connect-onedrive']"
        );


    buttons.forEach(
        button => {

            if (
                button.dataset.oneDriveReady
            ) {

                return;

            }


            button.addEventListener(
                "click",
                async event => {

                    event.preventDefault();


                    const originalText =
                        button.textContent;


                    button.disabled =
                        true;


                    button.textContent =
                        "CONNECTING...";


                    try {

                        const connected =
                            await signInToMicrosoft();


                        if (
                            connected
                        ) {

                            button.textContent =
                                "ONEDRIVE CONNECTED";

                        } else {

                            button.textContent =
                                originalText;

                        }

                    } catch (error) {

                        console.error(
                            "PDS OneDrive connection failed:",
                            error
                        );


                        button.textContent =
                            originalText;

                    } finally {

                        button.disabled =
                            false;

                    }

                }
            );


            button.dataset.oneDriveReady =
                "true";

        }
    );

}


/* =========================================================
   MICROSOFT SIGN OUT
========================================================= */

async function signOutMicrosoft() {

    try {

        if (
            msalInstance &&
            microsoftAccount
        ) {

            await msalInstance.logoutPopup({

                account:
                    microsoftAccount,

                mainWindowRedirectUri:
                    window.location.origin +
                    window.location.pathname

            });

        }

    } catch (error) {

        console.warn(
            "PDS OneDrive Microsoft sign-out:",
            error
        );

    } finally {

        microsoftAccount =
            null;

        oneDriveReady =
            false;

        oneDriveAccessToken =
            null;

        oneDriveWorkbookRows =
            [];

        oneDriveHeaders =
            [];

        oneDriveWorkbookSessionId =
            null;

        cachedMonitoringProjects =
            [];

    }

}
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

                    <span>
                        PROJECT NO.
                    </span>

                    <strong>
                        ${escapeHTML(projectNo)}
                    </strong>

                </div>


                <div>

                    <span>
                        LOCATION
                    </span>

                    <strong>
                        ${escapeHTML(municipality)}
                    </strong>

                </div>


                <div>

                    <span>
                        PROGRAM
                    </span>

                    <strong>
                        ${escapeHTML(programUser)}
                    </strong>

                </div>


                <div>

                    <span>
                        PLAN
                    </span>

                    <strong>
                        ${escapeHTML(planUser)}
                    </strong>

                </div>


                <div>

                    <span>
                        PROGRAM COMPLETION
                    </span>

                    <strong>
                        ${programPercent.toFixed(2)}%
                    </strong>

                </div>


                <div>

                    <span>
                        PLAN COMPLETION
                    </span>

                    <strong>
                        ${planPercent.toFixed(2)}%
                    </strong>

                </div>


                <div>

                    <span>
                        PROGRAM STATUS
                    </span>

                    <strong>
                        ${escapeHTML(programStatus)}
                    </strong>

                </div>


                <div>

                    <span>
                        PLAN STATUS
                    </span>

                    <strong>
                        ${escapeHTML(planStatus)}
                    </strong>

                </div>


                <div>

                    <span>
                        OVERALL STATUS
                    </span>

                    <strong>
                        ${escapeHTML(overallStatus)}
                    </strong>

                </div>

            </div>


            <div
                style="margin-top:20px;"
            >

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


    alert(
        "Project editing will be enabled after the OneDrive monitoring editor is connected."
    );

}


/* =========================================================
   MONITORING FILTER SETUP
========================================================= */

function setupProjectMonitoringFilters() {

    if (
        monitoringFiltersReady
    ) {

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
   INITIALIZE PDS
========================================================= */

async function initializePDS() {

    if (
        initialized
    ) {

        return;

    }


    initialized =
        true;


    console.log(
        "PDS — Initializing..."
    );


    /*
     * START WITH BOTH SCREENS HIDDEN.
     * This prevents the dashboard/sidebar from
     * flashing behind the login screen.
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
     * WAIT FOR SUPABASE LIBRARY.
     */

    const supabaseLoaded =
        await waitForSupabase();


    if (!supabaseLoaded) {

        console.error(
            "PDS: Supabase library was not loaded."
        );


        showLogin();


        authMessage(
            "Supabase could not be loaded. Please refresh the page.",
            "error"
        );


        return;

    }


    /*
     * INITIALIZE CLIENT.
     */

    const supabaseReady =
        initializeSupabase();


    if (!supabaseReady) {

        console.error(
            "PDS: Supabase initialization failed."
        );


        showLogin();


        authMessage(
            "Supabase configuration error. Check the Supabase settings in script.js.",
            "error"
        );


        return;

    }


    /*
     * SETUP AUTHENTICATION FIRST.
     */

    setupAuthStateListener();

    setupAuthForms();

    setupSignOut();


    /*
     * SETUP APPLICATION UI.
     */

    setupNavigation();

    setupSectionTargets();

    setupGlobalSearch();

    setupProjectMonitoringFilters();

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
     * DEFAULT TO LOGIN WHILE SESSION IS BEING CHECKED.
     */

    showLogin();


    /*
     * RESTORE SESSION.
     */

    await restoreSession();


    console.log(
        "PDS — Ready."
    );

}


/* =========================================================
   START APPLICATION
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializePDS,
        {
            once: true
        }
    );

} else {

    initializePDS();

}
