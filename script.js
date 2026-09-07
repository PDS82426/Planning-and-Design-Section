/* =========================================================
   PDS — SINGLE PAGE NAVIGATION
   SIDEBAR CLICK = SHOW ONLY SELECTED SECTION
   NO LONG PAGE SCROLLING
========================================================= */


/* =========================================================
   SETUP SIDEBAR NAVIGATION
========================================================= */

function setupNavigation() {

    const navItems = document.querySelectorAll(
        ".sidebar .nav-item, " +
        ".sidebar .nav-link, " +
        ".sidebar [data-page], " +
        ".sidebar [data-section]"
    );

    if (!navItems.length) {
        console.warn("PDS Navigation: No sidebar navigation items found.");
        return;
    }

    navItems.forEach(item => {

        /* Prevent duplicate event listeners */
        if (item.dataset.pdsNavigationReady === "true") {
            return;
        }

        item.dataset.pdsNavigationReady = "true";

        item.addEventListener("click", function(event) {

            event.preventDefault();
            event.stopPropagation();

            const pageName =
                this.dataset.page ||
                this.dataset.section ||
                this.getAttribute("href")?.replace("#", "");

            if (!pageName) {
                console.warn("PDS Navigation: No page assigned to:", this);
                return;
            }

            showPage(pageName);

        });

    });

}


/* =========================================================
   FIND ALL PDS SECTIONS
========================================================= */

function getPDSPages() {

    return document.querySelectorAll(
        "#app .page-section, " +
        "#app [data-page-section], " +
        "#app section[data-section], " +
        ".content > section"
    );

}


/* =========================================================
   SHOW ONLY ONE SECTION
========================================================= */

function showPage(pageName) {

    if (!pageName) {
        pageName = "overview";
    }

    console.log("PDS Navigation →", pageName);


    /* -----------------------------------------
       GET ALL MAIN SECTIONS
    ----------------------------------------- */

    const pages = getPDSPages();


    /* -----------------------------------------
       HIDE ALL SECTIONS
    ----------------------------------------- */

    pages.forEach(page => {

        page.classList.remove("active");
        page.classList.remove("active-page");

        page.style.display = "none";

    });


    /* -----------------------------------------
       FIND SELECTED PAGE
    ----------------------------------------- */

    let selectedPage =
        document.getElementById(pageName);


    /* -----------------------------------------
       FALLBACK:
       SEARCH DATA ATTRIBUTES
    ----------------------------------------- */

    if (!selectedPage) {

        selectedPage =
            document.querySelector(
                `[data-page-section="${pageName}"], ` +
                `[data-section="${pageName}"]`
            );

    }


    /* -----------------------------------------
       SHOW SELECTED PAGE
    ----------------------------------------- */

    if (selectedPage) {

        selectedPage.style.display = "block";

        selectedPage.classList.add("active");
        selectedPage.classList.add("active-page");

        console.log(
            "PDS Navigation: Showing",
            selectedPage.id || pageName
        );

    } else {

        console.warn(
            "PDS Navigation: Section not found:",
            pageName
        );

    }


    /* -----------------------------------------
       SIDEBAR ACTIVE STATE
    ----------------------------------------- */

    const navItems = document.querySelectorAll(
        ".sidebar .nav-item, " +
        ".sidebar .nav-link, " +
        ".sidebar [data-page], " +
        ".sidebar [data-section]"
    );

    navItems.forEach(item => {

        item.classList.remove("active");

        const itemPage =
            item.dataset.page ||
            item.dataset.section ||
            item.getAttribute("href")?.replace("#", "");

        if (itemPage === pageName) {

            item.classList.add("active");

        }

    });


    /* -----------------------------------------
       MOBILE NAV
    ----------------------------------------- */

    const mobileButtons =
        document.querySelectorAll(
            ".mobile-nav button, " +
            ".mobile-nav [data-page], " +
            ".mobile-nav [data-section]"
        );

    mobileButtons.forEach(button => {

        button.classList.remove("active");

        const buttonPage =
            button.dataset.page ||
            button.dataset.section;

        if (buttonPage === pageName) {

            button.classList.add("active");

        }

    });


    /* -----------------------------------------
       ALWAYS RETURN TO TOP
    ----------------------------------------- */

    window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant"
    });


    /* -----------------------------------------
       PAGE-SPECIFIC FUNCTIONS
    ----------------------------------------- */

    switch (pageName) {

        case "projects":

            if (typeof loadProjects === "function") {
                loadProjects();
            }

            break;


        case "myprojects":

            if (typeof loadMyProjects === "function") {
                loadMyProjects();
            }

            break;


        case "team":

            if (typeof loadTeam === "function") {
                loadTeam();
            }

            break;


        case "orders":

            if (typeof renderDepartmentOrders === "function") {
                renderDepartmentOrders();
            }

            break;


        case "standards":

            if (typeof loadDocuments === "function") {
                loadDocuments();
            }

            break;


        case "forms":

            if (typeof loadDocuments === "function") {
                loadDocuments();
            }

            break;


        case "content":

            if (typeof loadDocuments === "function") {
                loadDocuments();
            }

            break;

    }

}


/* =========================================================
   INITIALIZE PAGE
========================================================= */

function initializePageNavigation() {

    const activeItem =
        document.querySelector(
            ".sidebar .nav-item.active, " +
            ".sidebar .nav-link.active"
        );


    let initialPage =
        activeItem?.dataset.page ||
        activeItem?.dataset.section;


    /* -----------------------------------------
       IF NO ACTIVE SIDEBAR ITEM
       DEFAULT TO OVERVIEW
    ----------------------------------------- */

    if (!initialPage) {

        initialPage = "overview";

    }


    showPage(initialPage);

}


/* =========================================================
   START PDS NAVIGATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        setupNavigation();

        initializePageNavigation();

    }
);
