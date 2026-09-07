/* =========================================================
   PDS HUB
   COMPLETE SUPABASE + GITHUB PAGES SCRIPT
   ========================================================= */


/* =========================================================
   SUPABASE CONFIGURATION
========================================================= */

const SUPABASE_URL =
    "https://zvwghoabsqfyakbqzhil.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_oJ3Zc3TplfYgePQEmTrJ8Q_qycxR0jQ";


/* =========================================================
   CREATE SUPABASE CLIENT
========================================================= */

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


/* =========================================================
   GLOBAL STATE
========================================================= */

let currentUser = null;
let currentProfile = null;
let modalMode = "project";
let pdsAIHistory = [];

/* =========================================================
   AUTH SCREEN
========================================================= */

function showLogin() {

    const loginPanel =
        document.getElementById("loginPanel");

    const registerPanel =
        document.getElementById("registerPanel");

    if (loginPanel) {
        loginPanel.style.display = "block";
    }

    if (registerPanel) {
        registerPanel.style.display = "none";
    }

    clearAuthMessages();
       document.getElementById("tabLogin")?.classList.add("is-active");
    document.getElementById("tabRegister")?.classList.remove("is-active");
}


function showRegister() {

    const loginPanel =
        document.getElementById("loginPanel");

    const registerPanel =
        document.getElementById("registerPanel");

    if (loginPanel) {
        loginPanel.style.display = "none";
    }

    if (registerPanel) {
        registerPanel.style.display = "block";
    }

    clearAuthMessages();
       document.getElementById("tabRegister")?.classList.add("is-active");
    document.getElementById("tabLogin")?.classList.remove("is-active");
}


function clearAuthMessages() {

    const loginMessage =
        document.getElementById("loginMessage");

    const registerMessage =
        document.getElementById("registerMessage");

    if (loginMessage) {
        loginMessage.textContent = "";
    }

    if (registerMessage) {
        registerMessage.textContent = "";
    }
}


/* =========================================================
   AUTH MESSAGE
========================================================= */

function authMessage(
    elementId,
    message,
    success = false
) {

    const element =
        document.getElementById(elementId);

    if (!element) {
        return;
    }

    element.textContent = message;

    element.style.color =
        success
            ? "#1d5b45"
            : "#b34b42";
}


/* =========================================================
   CREATE ACCOUNT
========================================================= */

async function registerUser(event) {

    event.preventDefault();

    const name =
        document
            .getElementById("registerName")
            .value
            .trim();

    const position =
        document
            .getElementById("registerPosition")
            .value
            .trim();

    const email =
        document
            .getElementById("registerEmail")
            .value
            .trim();

    const password =
        document
            .getElementById("registerPassword")
            .value;

    const confirm =
        document
            .getElementById("registerConfirm")
            .value;


    if (!name) {

        authMessage(
            "registerMessage",
            "Please enter your full name."
        );

        return;
    }


    if (!email) {

        authMessage(
            "registerMessage",
            "Please enter your email."
        );

        return;
    }


    if (password.length < 6) {

        authMessage(
            "registerMessage",
            "Password must be at least 6 characters."
        );

        return;
    }


    if (password !== confirm) {

        authMessage(
            "registerMessage",
            "Passwords do not match."
        );

        return;
    }


    const button =
        document.querySelector(
            "#registerForm button[type='submit']"
        );


    if (button) {

        button.disabled = true;
        button.textContent = "Creating account...";

    }


    authMessage(
        "registerMessage",
        "Creating account..."
    );


    try {

        const {
            data,
            error
        } = await db.auth.signUp({

            email: email,

            password: password,

            options: {

                data: {

                    full_name: name,

                    position: position

                }

            }

        });


        if (error) {

            throw error;

        }


        /*
           Supabase may return a user without
           a session when email confirmation
           is enabled.
        */

        if (data && data.user) {

            if (data.session) {

                currentUser =
                    data.user;

                await createProfile(
                    data.user,
                    name,
                    position
                );

                authMessage(
                    "registerMessage",
                    "Account created successfully. Loading PDS Hub...",
                    true
                );

                await loadApplication();

            } else {

                authMessage(
                    "registerMessage",
                    "Account created. Please check your email to confirm your account before signing in.",
                    true
                );

                document
                    .getElementById("registerForm")
                    .reset();

            }

        } else {

            authMessage(
                "registerMessage",
                "Account creation did not return a user. Please try again."
            );

        }

    } catch (error) {

        console.error(
            "CREATE ACCOUNT ERROR:",
            error
        );


        authMessage(
            "registerMessage",
            error.message ||
            "Unable to create account."
        );

    } finally {

        if (button) {

            button.disabled = false;
            button.textContent = "Create Account";

        }

    }

}


/* =========================================================
   CREATE PROFILE
========================================================= */

async function createProfile(
    user,
    name = "",
    position = ""
) {

    if (!user) {
        return;
    }


    const {
        error
    } = await db
        .from("profiles")
        .upsert({

            id: user.id,

            full_name:
                name ||
                user.user_metadata?.full_name ||
                user.email,

            position:
                position ||
                user.user_metadata?.position ||
                "",

            role: "member"

        }, {

            onConflict: "id"

        });


    if (error) {

        console.error(
            "PROFILE CREATION ERROR:",
            error
        );

    }

}


/* =========================================================
   SIGN IN
========================================================= */

async function loginUser(event) {

    event.preventDefault();


    const email =
        document
            .getElementById("loginEmail")
            .value
            .trim();

    const password =
        document
            .getElementById("loginPassword")
            .value;


    authMessage(
        "loginMessage",
        "Signing in..."
    );


    const button =
        document.querySelector(
            "#loginForm button[type='submit']"
        );


    if (button) {

        button.disabled = true;
        button.textContent = "Signing in...";

    }


    try {

        const {
            data,
            error
        } = await db.auth.signInWithPassword({

            email: email,

            password: password

        });


        if (error) {

            throw error;

        }


        currentUser =
            data.user;


        authMessage(
            "loginMessage",
            "Sign in successful.",
            true
        );


        await loadApplication();


        document
            .getElementById("loginForm")
            .reset();


    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );


        authMessage(
            "loginMessage",
            error.message ||
            "Unable to sign in."
        );

    } finally {

        if (button) {

            button.disabled = false;
            button.textContent = "Sign In";

        }

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
            "SIGN OUT ERROR:",
            error
        );

    }


    currentUser = null;

    currentProfile = null;


    const app =
        document.getElementById("app");

    const authScreen =
        document.getElementById("authScreen");


    if (app) {
        app.style.display = "none";
    }

    if (authScreen) {
        authScreen.style.display = "flex";
    }


    showLogin();

}


/* =========================================================
   LOAD APPLICATION
========================================================= */

async function loadApplication() {

    try {

        const {
            data,
            error
        } = await db.auth.getUser();


        if (error) {

            console.error(
                "GET USER ERROR:",
                error
            );

            return;

        }


        const user =
            data?.user;


        if (!user) {

            document
                .getElementById("authScreen")
                .style.display = "flex";

            document
                .getElementById("app")
                .style.display = "none";

            return;

        }


        currentUser =
            user;


        await loadProfile();


        document
            .getElementById("authScreen")
            .style.display = "none";


        document
            .getElementById("app")
            .style.display = "flex";


        updateUserInterface();


        await refreshAll();


        showPage("overview");


    } catch (error) {

        console.error(
            "APPLICATION LOAD ERROR:",
            error
        );

    }

}


/* =========================================================
   LOAD PROFILE
========================================================= */

async function loadProfile() {

    if (!currentUser) {
        return;
    }


    const {
        data,
        error
    } = await db
        .from("profiles")
        .select("*")
        .eq(
            "id",
            currentUser.id
        )
        .maybeSingle();


    if (error) {

        console.error(
            "PROFILE LOAD ERROR:",
            error
        );

        return;

    }


if (data) {

    // Backfill full_name if it's missing but we have it in auth metadata
    if (!data.full_name && currentUser.user_metadata?.full_name) {

        const { data: updated } = await db
            .from("profiles")
            .update({ full_name: currentUser.user_metadata.full_name })
            .eq("id", currentUser.id)
            .select()
            .maybeSingle();

        currentProfile = updated || data;
        return;
    }

    currentProfile = data;
    return;
}


    await createProfile(

        currentUser,

        currentUser
            .user_metadata
            ?.full_name ||
        "",

        currentUser
            .user_metadata
            ?.position ||
        ""

    );


    const {
        data: profile
    } = await db
        .from("profiles")
        .select("*")
        .eq(
            "id",
            currentUser.id
        )
        .maybeSingle();


    currentProfile =
        profile || null;

}


/* =========================================================
   UPDATE USER INTERFACE
========================================================= */

function updateUserInterface() {

    const name =
        currentProfile?.full_name ||
        currentUser?.user_metadata?.full_name ||
        currentUser?.email ||
        "User";


    const position =
        currentProfile?.position ||
        "Member";


    const initials =
        getInitials(name);


    setText(
        "welcomeName",
        name.split(" ")[0]
    );


    setText(
        "sidebarName",
        name
    );


    setText(
        "sidebarPosition",
        position
    );


    setText(
        "sidebarAvatar",
        initials
    );


    setText(
        "topAvatar",
        initials
    );

}


function getInitials(name) {

    return String(name || "U")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(
            word => word[0]
        )
        .join("")
        .toUpperCase() || "U";

}
/* =========================================================
   PDS AI — CHAT
========================================================= */

async function askPDSAI() {

    const input =
        document.getElementById("aiInput");

    const responseBox =
        document.getElementById("aiResponse");

    if (!input || !responseBox) {
        return;
    }

    const message =
        input.value.trim();

    if (!message) {
        return;
    }


    /* =====================================================
       SHOW USER MESSAGE
    ===================================================== */

    const userMessage =
        document.createElement("div");

    userMessage.className =
        "pds-ai-message pds-ai-user";

    userMessage.textContent =
        message;

    responseBox.appendChild(
        userMessage
    );


    /* =====================================================
       CLEAR INPUT
    ===================================================== */

    input.value = "";

    input.focus();


    /* =====================================================
       THINKING MESSAGE
    ===================================================== */

    const thinkingMessage =
        document.createElement("div");

    thinkingMessage.className =
        "pds-ai-message pds-ai-bot";

    thinkingMessage.textContent =
        "PDS AI is thinking...";

    responseBox.appendChild(
        thinkingMessage
    );


    responseBox.scrollTop =
        responseBox.scrollHeight;


    try {

        /* =================================================
           SEND MESSAGE + HISTORY
        ================================================= */

        const {
            data,
            error
        } = await db.functions.invoke(
            "PDS-AI",
            {
                body: {

                    message: message,

                    history:
                        pdsAIHistory

                }
            }
        );


        /* =================================================
           ERROR
        ================================================= */

        if (error) {

            console.error(
                "PDS AI ERROR:",
                error
            );

            thinkingMessage.textContent =
                "PDS AI could not respond.";

            return;
        }


        /* =================================================
           GET COMPLETE ANSWER
        ================================================= */

        const answer =
            data?.answer ||
            data?.response ||
            data?.message ||
            "No response received from PDS AI.";


        thinkingMessage.textContent =
            answer;


        /* =================================================
           SAVE CONVERSATION
        ================================================= */

        pdsAIHistory.push({

            role: "user",

            text: message

        });


        pdsAIHistory.push({

            role: "model",

            text: answer

        });


        /* =================================================
           SHOW NEWEST MESSAGE
        ================================================= */

        responseBox.scrollTop =
            responseBox.scrollHeight;


    } catch (error) {

        console.error(
            "PDS AI REQUEST ERROR:",
            error
        );

        thinkingMessage.textContent =
            "PDS AI could not respond.";

    }

}

/* =========================================================
   PAGE NAVIGATION
========================================================= */

function showPage(pageId) {

    const pages =
        document.querySelectorAll(".page");

    const navItems =
        document.querySelectorAll(".nav-item");


    pages.forEach(page => {

        page.classList.remove(
            "active-page"
        );

    });


    const selectedPage =
        document.getElementById(pageId);


    if (selectedPage) {

        selectedPage.classList.add(
            "active-page"
        );

    }


    navItems.forEach(item => {

        item.classList.remove(
            "active"
        );


        if (
            item.dataset.page ===
            pageId
        ) {

            item.classList.add(
                "active"
            );

        }

    });


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   GLOBAL SEARCH
========================================================= */

function setupGlobalSearch() {

    const globalSearch =
        document.getElementById(
            "globalSearch"
        );


    if (!globalSearch) {
        return;
    }


    globalSearch.addEventListener(
        "input",
        function () {

            const search =
                this.value
                    .toLowerCase()
                    .trim();


            if (!search) {

                showPage(
                    "overview"
                );

                return;

            }


            const pages =
                document.querySelectorAll(
                    ".page"
                );


            let found = false;


            pages.forEach(page => {

                if (
                    !found &&
                    page.innerText
                        .toLowerCase()
                        .includes(search)
                ) {

                    showPage(
                        page.id
                    );

                    found = true;

                }

            });

        }
    );

}


/* =========================================================
   SEARCH SHORTCUT
========================================================= */

function focusSearch() {

    const search =
        document.getElementById(
            "globalSearch"
        );


    if (search) {

        search.focus();
        search.select();

    }

}


document.addEventListener(
    "keydown",
    function (event) {

        if (
            (event.ctrlKey ||
             event.metaKey) &&
            event.key.toLowerCase() === "k"
        ) {

            event.preventDefault();

            focusSearch();

        }

    }
);


/* =========================================================
   MODAL
========================================================= */

function openModal(
    title,
    description
) {

    const modal =
        document.getElementById(
            "modal"
        );


    setText(
        "modalTitle",
        title
    );


    setText(
        "modalDescription",
        description
    );


    if (modal) {

        modal.classList.add(
            "open"
        );

    }

}


function closeModal() {

    const modal =
        document.getElementById(
            "modal"
        );


    if (modal) {

        modal.classList.remove(
            "open"
        );

    }


    const form =
        document.getElementById(
            "modalForm"
        );


    if (form) {
        form.reset();
    }

}


/* =========================================================
   MODAL FIELD CONTROL
========================================================= */

function setModalFieldState(mode) {

    const projectFields =
        document.getElementById("projectFields");

    const uploadFields =
        document.getElementById("uploadFields");

    if (!projectFields || !uploadFields) {
        return;
    }


    if (mode === "project") {

        projectFields.style.display = "block";
        uploadFields.style.display = "none";


        projectFields
            .querySelectorAll("input, select, textarea")
            .forEach(field => {

                field.disabled = false;

            });


        uploadFields
            .querySelectorAll("input, select, textarea")
            .forEach(field => {

                field.disabled = true;

            });


        const projectName =
            document.getElementById("projectName");

        if (projectName) {
            projectName.required = true;
        }


        const documentTitle =
            document.getElementById("documentTitle");

        if (documentTitle) {
            documentTitle.required = false;
        }

    } else {

        projectFields.style.display = "none";
        uploadFields.style.display = "block";


        projectFields
            .querySelectorAll("input, select, textarea")
            .forEach(field => {

                field.disabled = true;

            });


        uploadFields
            .querySelectorAll("input, select, textarea")
            .forEach(field => {

                field.disabled = false;

            });


        const projectName =
            document.getElementById("projectName");

        if (projectName) {
            projectName.required = false;
        }


        const documentTitle =
            document.getElementById("documentTitle");

        if (documentTitle) {
            documentTitle.required = true;
        }

    }

}


/* =========================================================
   OPEN PROJECT MODAL
========================================================= */

function openProjectModal() {

    modalMode = "project";

    setModalFieldState("project");

    openModal(
        "New project",
        "Create a new project for monitoring."
    );

}


/* =========================================================
   OPEN UPLOAD MODAL
========================================================= */

function openUploadModal(
    category = "General"
) {

    modalMode = "upload";

    setModalFieldState("upload");


    const categoryInput =
        document.getElementById(
            "documentCategory"
        );


    if (categoryInput) {

        categoryInput.value =
            category;

    }


    openModal(
        "Upload document",
        "Upload a PDF, Excel, or Word document."
    );

}

/* =========================================================
   SAVE PROJECT
========================================================= */

async function saveProject() {

    if (!currentUser) {

        alert(
            "Please sign in first."
        );

        return;

    }


    const project = {

        owner_id:
            currentUser.id,

        project_code:
            document
                .getElementById(
                    "projectCode"
                )
                .value
                .trim() ||
            null,

        name:
            document
                .getElementById(
                    "projectName"
                )
                .value
                .trim(),

        location:
            document
                .getElementById(
                    "projectLocation"
                )
                .value
                .trim() ||
            null,

        status:
            document
                .getElementById(
                    "projectStatus"
                )
                .value,

        target_date:
            document
                .getElementById(
                    "projectTargetDate"
                )
                .value ||
            null,

        notes:
            document
                .getElementById(
                    "projectNotes"
                )
                .value
                .trim() ||
            null

    };


    const progress =
        Math.max(
            0,
            Math.min(
                100,
                Number(
                    document
                        .getElementById(
                            "projectProgress"
                        )
                        .value || 0
                )
            )
        );


    project.progress =
        progress;


    if (!project.name) {

        alert(
            "Please enter a project name."
        );

        return;

    }


    try {

        const {
            error
        } = await db
            .from("projects")
            .insert(project);


        if (error) {

            throw error;

        }


        closeModal();


        await refreshAll();


        showPage(
            "projects"
        );


    } catch (error) {

        console.error(
            "SAVE PROJECT ERROR:",
            error
        );


        alert(
            "Could not save project:\n\n" +
            error.message
        );

    }

}


/* =========================================================
   UPLOAD DOCUMENT — FIXED
========================================================= */

async function uploadDocument() {

    if (!currentUser) {
        alert("Please sign in first.");
        return;
    }

    const fileInput =
        document.getElementById("documentFile");

    const titleInput =
        document.getElementById("documentTitle");

    const categoryInput =
        document.getElementById("documentCategory");

    const submitButton =
        document.getElementById("modalSubmitButton");

    const file =
        fileInput?.files?.[0];

    const title =
        titleInput?.value?.trim();

    const category =
        categoryInput?.value || "General";


    /* -----------------------------------------------------
       VALIDATION
    ----------------------------------------------------- */

    if (!file) {
        alert("Please select a file.");
        return;
    }

    if (!title) {
        alert("Please enter a document title.");
        titleInput?.focus();
        return;
    }


    /* -----------------------------------------------------
       FILE SIZE CHECK
       50 MB maximum
    ----------------------------------------------------- */

    const MAX_FILE_SIZE =
        50 * 1024 * 1024;

    if (file.size > MAX_FILE_SIZE) {

        alert(
            "File is too large.\n\n" +
            "Maximum allowed size is 50 MB."
        );

        return;
    }


    /* -----------------------------------------------------
       SAFE FILE NAME
    ----------------------------------------------------- */

    const safeFileName =
        file.name
            .replace(
                /[^a-zA-Z0-9._-]/g,
                "_"
            );


    const filePath =
        currentUser.id +
        "/" +
        Date.now() +
        "_" +
        safeFileName;


    /* -----------------------------------------------------
       LOCK BUTTON
    ----------------------------------------------------- */

    if (submitButton) {

        submitButton.disabled = true;

        submitButton.textContent =
            "Uploading...";

    }


    /* -----------------------------------------------------
       HELPER — TIMEOUT
    ----------------------------------------------------- */

    function timeoutPromise(
        promise,
        milliseconds,
        message
    ) {

        const timeout =
            new Promise(
                (_, reject) => {

                    setTimeout(
                        () => {

                            reject(
                                new Error(
                                    message
                                )
                            );

                        },
                        milliseconds
                    );

                }
            );


        return Promise.race([
            promise,
            timeout
        ]);

    }


    let uploaded = false;


    try {

        console.log(
            "UPLOAD STARTED"
        );

        console.log(
            "User:",
            currentUser.id
        );

        console.log(
            "File:",
            file.name
        );

        console.log(
            "Size:",
            file.size
        );

        console.log(
            "Path:",
            filePath
        );


        /* -------------------------------------------------
           STEP 1 — UPLOAD TO SUPABASE STORAGE
        ------------------------------------------------- */

        console.log(
            "Uploading to Storage..."
        );


        const {
            error: uploadError
        } = await timeoutPromise(

            db
                .storage
                .from("documents")
                .upload(
                    filePath,
                    file,
                    {
                        cacheControl: "3600",
                        upsert: false,
                        contentType:
                            file.type ||
                            "application/octet-stream"
                    }
                ),

            30000,

            "The Storage upload timed out after 30 seconds.\n\n" +
            "This usually means the Supabase Storage policy, bucket, " +
            "network connection, or bucket configuration needs to be checked."
        );


        if (uploadError) {

            console.error(
                "SUPABASE STORAGE ERROR:",
                uploadError
            );

            throw uploadError;

        }


        uploaded = true;


        console.log(
            "STORAGE UPLOAD SUCCESS"
        );


        /* -------------------------------------------------
           STEP 2 — SAVE DATABASE RECORD
        ------------------------------------------------- */

        if (submitButton) {

            submitButton.textContent =
                "Saving...";

        }


        console.log(
            "Saving document metadata..."
        );


        const {
            error: databaseError
        } = await timeoutPromise(

            db
                .from("documents")
                .insert({

                    owner_id:
                        currentUser.id,

                    title:
                        title,

                    project_name:
                        category,

                    file_name:
                        file.name,

                    file_path:
                        filePath,

                    mime_type:
                        file.type ||
                        "application/octet-stream",

                    size_bytes:
                        file.size

                }),

            30000,

            "The file uploaded, but saving the document record timed out.\n\n" +
            "Please check the Supabase documents table policy."
        );


        if (databaseError) {

            console.error(
                "DOCUMENT DATABASE ERROR:",
                databaseError
            );


            /* ---------------------------------------------
               ROLLBACK STORAGE FILE
            --------------------------------------------- */

            console.log(
                "Removing uploaded file..."
            );


            await db
                .storage
                .from("documents")
                .remove([
                    filePath
                ]);


            uploaded = false;


            throw databaseError;

        }


        console.log(
            "DATABASE SAVE SUCCESS"
        );


        /* -------------------------------------------------
           SUCCESS
        ------------------------------------------------- */

        alert(
            "Document uploaded successfully."
        );


        closeModal();


        await refreshAll();


        showPage(
            "content"
        );


    } catch (error) {

        console.error(
            "================================"
        );

        console.error(
            "UPLOAD FAILED"
        );

        console.error(
            error
        );

        console.error(
            "================================"
        );


        let message =
            error?.message ||
            "Unknown upload error.";


        /* -------------------------------------------------
           FRIENDLY SUPABASE ERRORS
        ------------------------------------------------- */

        if (
            message
                .toLowerCase()
                .includes("row-level security")
        ) {

            message =
                "Supabase Row Level Security blocked the upload.\n\n" +
                "The Storage or documents table policy needs to allow " +
                "authenticated users to upload.";

        }


        else if (
            message
                .toLowerCase()
                .includes("not found")
        ) {

            message =
                "The Supabase Storage bucket 'documents' could not be found.\n\n" +
                "Please check that the bucket exists and is named exactly:\n" +
                "documents";

        }


        else if (
            message
                .toLowerCase()
                .includes("duplicate")
        ) {

            message =
                "A file with this path already exists.\n\n" +
                "Please try uploading again.";

        }


        alert(
            "UPLOAD FAILED\n\n" +
            message
        );


    } finally {

        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                "Save";

        }

    }

}


/* =========================================================
   MODAL SUBMIT
========================================================= */

/* =========================================================
   MODAL SUBMIT
========================================================= */

function setupModalForm() {

    const form =
        document.getElementById("modalForm");


    if (!form) {

        console.error(
            "MODAL FORM NOT FOUND"
        );

        return;

    }


    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            console.log(
                "MODAL SUBMIT:",
                modalMode
            );


            if (modalMode === "project") {

                await saveProject();

            }

            else if (modalMode === "upload") {

                await uploadDocument();

            }

        }
    );

}


/* =========================================================
   LOAD PROJECTS
========================================================= */

async function loadProjects() {

    if (!currentUser) {
        return;
    }


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

        console.error(
            "PROJECT ERROR:",
            error
        );

        return;

    }


    renderProjects(
        data || []
    );

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


    const myList =
        document.getElementById(
            "myProjectList"
        );


    const overview =
        document.getElementById(
            "overviewProjects"
        );


    if (!projects.length) {

        if (list) {

            list.innerHTML = `
                <div class="empty-card">

                    <div class="empty-icon">
                        ◫
                    </div>

                    <h2>
                        No projects yet
                    </h2>

                    <p>
                        Create your first project.
                    </p>

                    <button
                        class="button primary"
                        onclick="openProjectModal()">

                        + New project

                    </button>

                </div>
            `;

        }


        if (myList) {

            myList.innerHTML = `
                <div class="empty-card">

                    <div class="empty-icon">
                        ✓
                    </div>

                    <h2>
                        No projects yet
                    </h2>

                    <p>
                        Your projects will appear here.
                    </p>

                </div>
            `;

        }


        if (overview) {

            overview.innerHTML = `
                <div class="empty-card">

                    <div class="empty-icon">
                        ◫
                    </div>

                    <h2>
                        No projects
                    </h2>

                    <p>
                        Create a project to begin monitoring.
                    </p>

                </div>
            `;

        }


        updateProjectStats([]);

        return;

    }


    if (list) {

        list.innerHTML =
            projects
                .map(projectRow)
                .join("");

    }


    if (myList) {

        const mine =
            projects.filter(
                project =>
                    project.owner_id ===
                    currentUser.id
            );


        myList.innerHTML =
            mine.length
                ? mine
                    .map(projectCard)
                    .join("")
                : `
                    <div class="empty-card">

                        <div class="empty-icon">
                            ✓
                        </div>

                        <h2>
                            No projects assigned
                        </h2>

                        <p>
                            You don't have any projects yet.
                        </p>

                    </div>
                `;

    }


    if (overview) {

        overview.innerHTML =
            projects
                .slice(0, 5)
                .map(projectDeadline)
                .join("");

    }


    updateProjectStats(
        projects
    );

}


/* =========================================================
   PROJECT ROW
========================================================= */

function projectRow(
    project
) {

    const progress =
        Number(
            project.progress || 0
        );


    return `
        <div class="project-row">

            <div>

                <strong>
                    ${escapeHTML(project.name)}
                </strong>

                <small>
                    ${escapeHTML(
                        project.project_code || ""
                    )}
                </small>

            </div>


            <div>
                ${escapeHTML(
                    project.location || "—"
                )}
            </div>


            <div>

                <span class="status ${statusClass(
                    project.status
                )}">

                    ${escapeHTML(
                        project.status
                    )}

                </span>

            </div>


            <div>

                <div class="progress">

                    <div
                        style="width:${progress}%">
                    </div>

                </div>

                <small>
                    ${progress}%
                </small>

            </div>


            <div>

                <button
                    onclick="deleteProject('${project.id}')">

                    Delete

                </button>

            </div>

        </div>
    `;

}


/* =========================================================
   PROJECT CARD
========================================================= */

function projectCard(
    project
) {

    const progress =
        Number(
            project.progress || 0
        );


    return `
        <div
            class="panel"
            style="margin-bottom:15px">

            <div class="panel-header">

                <div>

                    <div class="eyebrow">

                        ${escapeHTML(
                            project.project_code ||
                            "PROJECT"
                        )}

                    </div>


                    <h2>

                        ${escapeHTML(
                            project.name
                        )}

                    </h2>


                    <p>

                        ${escapeHTML(
                            project.location ||
                            "No location"
                        )}

                    </p>

                </div>


                <span class="status ${statusClass(
                    project.status
                )}">

                    ${escapeHTML(
                        project.status
                    )}

                </span>

            </div>


            <div class="progress">

                <div
                    style="width:${progress}%">
                </div>

            </div>


            <p>

                Progress:

                <strong>
                    ${progress}%
                </strong>

            </p>

        </div>
    `;

}


/* =========================================================
   PROJECT DEADLINE
========================================================= */

function projectDeadline(
    project
) {

    let day = "—";
    let month = "";


    if (project.target_date) {

        const date =
            new Date(
                project.target_date +
                "T00:00:00"
            );


        day =
            date.getDate();


        month =
            date
                .toLocaleDateString(
                    "en-US",
                    {
                        month: "short"
                    }
                )
                .toUpperCase();

    }


    return `
        <div class="deadline">

            <div class="deadline-date">

                <strong>
                    ${day}
                </strong>

                <span>
                    ${month}
                </span>

            </div>


            <div class="deadline-info">

                <strong>
                    ${escapeHTML(
                        project.name
                    )}
                </strong>

                <span>
                    ${escapeHTML(
                        project.location ||
                        "No location"
                    )}
                </span>

            </div>


            <span class="status ${statusClass(
                project.status
            )}">

                ${escapeHTML(
                    project.status
                )}

            </span>

        </div>
    `;

}


/* =========================================================
   PROJECT STATISTICS
========================================================= */

function updateProjectStats(
    projects
) {

    const active =
        projects.filter(
            project =>
                project.status !==
                "Completed"
        ).length;


    const review =
        projects.filter(
            project =>
                project.status ===
                "For Review"
        ).length;


    const completed =
        projects.filter(
            project =>
                project.status ===
                "Completed"
        ).length;


    const total =
        projects.length;


    const progress =
        total
            ? Math.round(
                projects.reduce(
                    (
                        sum,
                        project
                    ) =>
                        sum +
                        Number(
                            project.progress ||
                            0
                        ),
                    0
                ) / total
            )
            : 0;


    setText(
        "activeProjectsCount",
        active
    );


    setText(
        "reviewProjectsCount",
        review
    );


    setText(
        "completedProjectsCount",
        completed
    );


    setText(
        "workspaceProgress",
        progress + "%"
    );


    setText(
        "projectBadge",
        total
    );

}


/* =========================================================
   DELETE PROJECT
========================================================= */

async function deleteProject(
    id
) {

    if (
        !confirm(
            "Delete this project?"
        )
    ) {

        return;

    }


    const {
        error
    } = await db
        .from("projects")
        .delete()
        .eq(
            "id",
            id
        );


    if (error) {

        alert(
            "Could not delete project:\n\n" +
            error.message
        );

        return;

    }


    await refreshAll();

}


/* =========================================================
   LOAD DOCUMENTS
========================================================= */

async function loadDocuments() {

    if (!currentUser) {
        return;
    }


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

        console.error(
            "DOCUMENT ERROR:",
            error
        );

        return;

    }


    renderDocuments(
        data || []
    );

}


/* =========================================================
   RENDER DOCUMENTS
========================================================= */

function renderDocuments(
    documents
) {

    const library =
        document.getElementById(
            "libraryList"
        );


    if (library) {

        library.innerHTML =
            documents.length
                ? documents
                    .map(libraryItem)
                    .join("")
                : `
                    <div class="empty-card">

                        <div class="empty-icon">
                            D
                        </div>

                        <h2>
                            No documents
                        </h2>

                        <p>
                            Upload your first document.
                        </p>

                    </div>
                `;

    }


    setText(
        "documentsCount",
        documents.length
    );


    renderCategory(
        documents,
        "Department Order",
        "ordersDocuments"
    );


    renderCategory(
        documents,
        "Standard / Template",
        "standardsDocuments"
    );


    renderCategory(
        documents,
        "Form",
        "formsDocuments"
    );


    const recent =
        document.getElementById(
            "recentFiles"
        );


    if (recent) {

        recent.innerHTML =
            documents
                .slice(0, 5)
                .map(recentFile)
                .join("");

    }

}


/* =========================================================
   CATEGORY DOCUMENTS
========================================================= */

function renderCategory(
    documents,
    category,
    elementId
) {

    const container =
        document.getElementById(
            elementId
        );


    if (!container) {
        return;
    }


    const filtered =
        documents.filter(
            document =>
                document.project_name ===
                category
        );


    container.innerHTML =
        filtered.length
            ? filtered
                .map(documentCard)
                .join("")
            : `
                <div class="empty-card">

                    <div class="empty-icon">
                        D
                    </div>

                    <h2>
                        No documents
                    </h2>

                    <p>
                        Upload a document to this category.
                    </p>

                </div>
            `;

}


/* =========================================================
   DOCUMENT CARD
========================================================= */

function documentCard(
    document
) {

    return `
        <div class="document-card">

            <div class="document-icon">

                ${fileExtension(
                    document.file_name
                )}

            </div>


            <h3>

                ${escapeHTML(
                    document.title
                )}

            </h3>


            <p>

                ${escapeHTML(
                    document.file_name
                )}

            </p>


            <span>

                ${formatBytes(
                    document.size_bytes
                )}

            </span>


            <br>
            <br>


            <button
                class="button secondary"
                onclick="openDocument('${document.id}')">

                Open

            </button>


            <button
                class="button secondary"
                onclick="deleteDocument('${document.id}')">

                Delete

            </button>

        </div>
    `;

}


/* =========================================================
   LIBRARY ITEM
========================================================= */

function libraryItem(
    document
) {

    const type =
        fileExtension(
            document.file_name
        );


    return `
        <div
            class="library-item"
            data-type="${type}">

            <div class="library-icon">

                ${type}

            </div>


            <div>

                <strong>

                    ${escapeHTML(
                        document.title
                    )}

                </strong>


                <span>

                    ${escapeHTML(
                        document.file_name
                    )}

                    ·

                    ${formatBytes(
                        document.size_bytes
                    )}

                </span>

            </div>


            <button
                onclick="openDocument('${document.id}')">

                Open

            </button>


            <button
                onclick="deleteDocument('${document.id}')">

                Delete

            </button>

        </div>
    `;

}


/* =========================================================
   RECENT FILE
========================================================= */

function recentFile(
    document
) {

    return `
        <div class="file-row">

            <div class="file-icon">

                ${fileExtension(
                    document.file_name
                )}

            </div>


            <div class="file-info">

                <strong>

                    ${escapeHTML(
                        document.title
                    )}

                </strong>


                <span>

                    ${formatBytes(
                        document.size_bytes
                    )}

                </span>

            </div>


            <span class="file-tag">

                ${fileExtension(
                    document.file_name
                )}

            </span>


            <button
                class="download"
                onclick="openDocument('${document.id}')">

                ↗

            </button>

        </div>
    `;

}


/* =========================================================
   OPEN DOCUMENT
========================================================= */

async function openDocument(
    id
) {

    try {

        const {
            data: document,
            error
        } = await db
            .from("documents")
            .select("*")
            .eq(
                "id",
                id
            )
            .single();


        if (error) {

            throw error;

        }


        const {
            data,
            error: storageError
        } = await db
            .storage
            .from("documents")
            .createSignedUrl(
                document.file_path,
                3600
            );


        if (storageError) {

            throw storageError;

        }


        window.open(
            data.signedUrl,
            "_blank"
        );


    } catch (error) {

        console.error(
            "OPEN DOCUMENT ERROR:",
            error
        );


        alert(
            "Could not open document:\n\n" +
            error.message
        );

    }

}


/* =========================================================
   DELETE DOCUMENT
========================================================= */

async function deleteDocument(
    id
) {

    if (
        !confirm(
            "Delete this document?"
        )
    ) {

        return;

    }


    try {

        const {
            data: document,
            error
        } = await db
            .from("documents")
            .select(
                "file_path"
            )
            .eq(
                "id",
                id
            )
            .single();


        if (error) {

            throw error;

        }


        const {
            error: storageError
        } = await db
            .storage
            .from("documents")
            .remove([
                document.file_path
            ]);


        if (storageError) {

            throw storageError;

        }


        const {
            error: databaseError
        } = await db
            .from("documents")
            .delete()
            .eq(
                "id",
                id
            );


        if (databaseError) {

            throw databaseError;

        }


        await refreshAll();


    } catch (error) {

        console.error(
            "DELETE DOCUMENT ERROR:",
            error
        );


        alert(
            "Could not delete document:\n\n" +
            error.message
        );

    }

}


/* =========================================================
   LIBRARY SEARCH
========================================================= */

function filterLibrary() {

    const searchInput =
        document.getElementById(
            "librarySearch"
        );


    const typeFilter =
        document.getElementById(
            "fileTypeFilter"
        );


    if (!searchInput ||
        !typeFilter) {

        return;

    }


    const search =
        searchInput.value
            .toLowerCase()
            .trim();


    const type =
        typeFilter.value;


    const items =
        document.querySelectorAll(
            ".library-item"
        );


    items.forEach(
        item => {

            const text =
                item.innerText
                    .toLowerCase();


            const itemType =
                item.dataset.type;


            const matchesSearch =
                text.includes(
                    search
                );


            const matchesType =
                type === "all" ||
                itemType === type;


            item.style.display =
                matchesSearch &&
                matchesType
                    ? "flex"
                    : "none";

        }
    );

}


/* =========================================================
   TEAM
========================================================= */

async function loadTeam() {

    const {
        data,
        error
    } = await db
        .from("profiles")
        .select("*")
        .order(
            "full_name"
        );


    if (error) {

        console.error(
            "TEAM ERROR:",
            error
        );

        return;

    }


    const container =
        document.getElementById(
            "teamList"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        (data || [])
            .map(teamMember)
            .join("");

}


function teamMember(
    member
) {

    const name =
        member.full_name ||
        "User";


    return `
        <div class="team-card">

            <div class="team-avatar">

                ${getInitials(name)}

            </div>


            <h3>

                ${escapeHTML(
                    name
                )}

            </h3>


            <p>

                ${escapeHTML(
                    member.position ||
                    "Member"
                )}

            </p>

        </div>
    `;

}


/* =========================================================
   REFRESH EVERYTHING
========================================================= */

async function refreshAll() {

    await Promise.all([

        loadProjects(),

        loadDocuments(),

        loadTeam()

    ]);

}


/* =========================================================
   HELPERS
========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

}


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


function statusClass(
    status
) {

    switch (status) {

        case "Completed":
            return "completed";

        case "For Review":
            return "review";

        case "Ongoing":
            return "ongoing";

        case "Suspended":
            return "urgent";

        default:
            return "upcoming";

    }

}


function fileExtension(
    filename
) {

    const ext =
        String(filename || "")
            .split(".")
            .pop()
            .toUpperCase();


    if (ext === "XLS") {
        return "XLSX";
    }


    if (ext === "DOC") {
        return "DOCX";
    }


    return ext || "FILE";

}


function formatBytes(
    bytes
) {

    if (!bytes) {
        return "0 KB";
    }


    const units = [
        "Bytes",
        "KB",
        "MB",
        "GB"
    ];


    const index =
        Math.min(
            Math.floor(
                Math.log(bytes) /
                Math.log(1024)
            ),
            units.length - 1
        );


    return (
        parseFloat(
            (
                bytes /
                Math.pow(
                    1024,
                    index
                )
            ).toFixed(1)
        ) +
        " " +
        units[index]
    );

}


/* =========================================================
   SIDEBAR NAVIGATION
========================================================= */

function setupNavigation() {

    document
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(
            item => {

                item.addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();


                        const page =
                            this.dataset.page;


                        if (page) {

                            showPage(
                                page
                            );

                        }

                    }
                );

            }
        );

}


/* =========================================================
   ESC CLOSE MODAL
========================================================= */

document.addEventListener(
    "keydown",
    function (event) {

        const modal =
            document.getElementById(
                "modal"
            );


        if (
            event.key === "Escape" &&
            modal &&
            modal.classList.contains(
                "open"
            )
        ) {

            closeModal();

        }

    }
);


/* =========================================================
   AUTH EVENT SETUP
========================================================= */

function setupAuthForms() {

    const loginForm =
        document.getElementById(
            "loginForm"
        );


    const registerForm =
        document.getElementById(
            "registerForm"
        );


    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            loginUser
        );

    }


    if (registerForm) {

        registerForm.addEventListener(
            "submit",
            registerUser
        );

    }

}


/* =========================================================
   AUTH STATE LISTENER
   Keeps the user signed in after page refresh
========================================================= */

db.auth.onAuthStateChange(
    async (event, session) => {

        console.log(
            "Supabase Auth:",
            event
        );

        /* ---------------------------------------------
           USER SIGNED IN / SESSION RESTORED
        --------------------------------------------- */

        if (session?.user) {

            currentUser =
                session.user;

            /*
               IMPORTANT:
               Do NOT show the login screen here.
               Supabase has already restored the session.
            */

            if (
                event === "SIGNED_IN" ||
                event === "INITIAL_SESSION" ||
                event === "TOKEN_REFRESHED"
            ) {

                await loadApplication();

            }

            return;
        }


        /* ---------------------------------------------
           USER SIGNED OUT
        --------------------------------------------- */

        if (event === "SIGNED_OUT") {

            currentUser = null;

            currentProfile = null;


            const app =
                document.getElementById("app");

            const authScreen =
                document.getElementById("authScreen");


            if (app) {

                app.style.display =
                    "none";

            }


            if (authScreen) {

                authScreen.style.display =
                    "flex";

            }


            showLogin();

        }

    }
);

/* =========================================================
   INITIALIZE
   Restores Supabase session before showing login screen
========================================================= */

async function initializePDSHub() {

    console.log(
        "PDS initializing..."
    );


    setupAuthForms();

    setupModalForm();

    setupNavigation();

    setupGlobalSearch();


    const authScreen =
        document.getElementById("authScreen");

    const app =
        document.getElementById("app");


    /*
       Hide both screens temporarily while
       Supabase checks the existing session.
    */

    if (authScreen) {

        authScreen.style.display =
            "none";

    }


    if (app) {

        app.style.display =
            "none";

    }


    try {

        const {
            data,
            error
        } = await db.auth.getSession();


        if (error) {

            console.error(
                "SESSION ERROR:",
                error
            );


            if (authScreen) {

                authScreen.style.display =
                    "flex";

            }


            showLogin();

            return;

        }


        /*
           EXISTING SESSION FOUND
        */

        if (data?.session?.user) {

            console.log(
                "Existing Supabase session restored."
            );


            currentUser =
                data.session.user;


            await loadApplication();


            return;

        }


        /*
           NO SESSION
        */

        console.log(
            "No active Supabase session."
        );


        if (app) {

            app.style.display =
                "none";

        }


        if (authScreen) {

            authScreen.style.display =
                "flex";

        }


        showLogin();


    } catch (error) {

        console.error(
            "INITIALIZATION ERROR:",
            error
        );


        if (app) {

            app.style.display =
                "none";

        }


        if (authScreen) {

            authScreen.style.display =
                "flex";

        }


        showLogin();

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
        initializePDSHub
    );

} else {

    initializePDSHub();

}
/* =========================================================
   PDS HUB — PLANNING & DESIGN DEPARTMENT ORDERS
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

        categoryName: "Planning & Project Development",

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

        categoryName: "Right-of-Way",

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

        categoryName: "Roads",

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

        categoryName: "Hydrology & Drainage",

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

        categoryName: "Standards & Manuals",

        url:
            "https://www.dpwh.gov.ph/"
    }

];


/* =========================================================
   DISPLAY DEPARTMENT ORDERS
========================================================= */

function displayDepartmentOrders(orders) {

    const container =
        document.getElementById("departmentOrdersGrid");

    const count =
        document.getElementById("ordersResultCount");

    const noResults =
        document.getElementById("ordersNoResults");

    if (!container) return;

    container.innerHTML = "";

    count.textContent = orders.length;


    if (orders.length === 0) {

        noResults.style.display = "block";

        return;

    }


    noResults.style.display = "none";


    orders.forEach(order => {

        const card =
            document.createElement("article");

        card.className =
            "department-order-card";


        card.innerHTML = `

            <div class="department-order-top">

                <span class="department-order-number">
                    ${order.number}
                </span>

                <span class="department-order-year">
                    Series of ${order.year}
                </span>

            </div>


            <h3>
                ${order.title}
            </h3>


            <p>
                ${order.description}
            </p>


            <span class="department-order-category">
                ${order.categoryName}
            </span>


            <div class="department-order-footer">

                <span class="department-order-source">
                    Official DPWH
                </span>

                <a
                    class="department-order-link"
                    href="${order.url}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    View Document ↗
                </a>

            </div>

        `;


        container.appendChild(card);

    });

}


/* =========================================================
   FILTER DEPARTMENT ORDERS
========================================================= */

function filterDepartmentOrders() {

    const searchElement =
        document.getElementById("ordersSearch");

    const categoryElement =
        document.getElementById("ordersCategory");

    const yearElement =
        document.getElementById("ordersYear");


    if (!searchElement) return;


    const search =
        searchElement.value
            .toLowerCase()
            .trim();


    const category =
        categoryElement.value;


    const year =
        yearElement.value;


    const filtered =
        planningDesignOrders.filter(order => {

            const text = `

                ${order.number}
                ${order.year}
                ${order.title}
                ${order.description}
                ${order.categoryName}

            `.toLowerCase();


            const matchesSearch =
                text.includes(search);


            const matchesCategory =
                category === "all" ||
                order.category === category;


            const matchesYear =
                year === "all" ||
                order.year === year;


            return (
                matchesSearch &&
                matchesCategory &&
                matchesYear
            );

        });


    displayDepartmentOrders(filtered);


    const clearButton =
        document.getElementById(
            "clearOrdersSearch"
        );


    if (clearButton) {

        clearButton.style.display =
            search.length
                ? "block"
                : "none";

    }

}


/* =========================================================
   CLEAR SEARCH
========================================================= */

function clearOrdersSearch() {

    const input =
        document.getElementById("ordersSearch");

    input.value = "";

    filterDepartmentOrders();

    input.focus();

}


/* =========================================================
   RESET
========================================================= */

function resetDepartmentOrders() {

    document.getElementById(
        "ordersSearch"
    ).value = "";


    document.getElementById(
        "ordersCategory"
    ).value = "all";


    document.getElementById(
        "ordersYear"
    ).value = "all";


    filterDepartmentOrders();

}


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        displayDepartmentOrders(
            planningDesignOrders
        );

    }
);



