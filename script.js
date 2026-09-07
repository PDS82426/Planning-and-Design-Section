/* =========================================================
   PDS — SINGLE PAGE NAVIGATION
   SIDEBAR CLICK = SHOW ONLY SELECTED SECTION
   NO LONG PAGE SCROLLING
========================================================= */

function setupNavigation() {

    const navItems = document.querySelectorAll(
        ".sidebar .nav-item"
    );

    navItems.forEach(item => {

        item.addEventListener("click", function (event) {

            event.preventDefault();

            const pageName = this.dataset.page;

            if (!pageName) return;

            showPage(pageName);

        });

    });

}


/* =========================================================
   SHOW ONLY ONE SECTION
========================================================= */

function showPage(pageName) {

    if (!pageName) {
        pageName = "overview";
    }

    /* -----------------------------------------
       ALL MAIN SECTIONS
    ----------------------------------------- */

    const pages = document.querySelectorAll(
        ".content > section"
    );


    /* -----------------------------------------
       HIDE EVERYTHING
    ----------------------------------------- */

    pages.forEach(page => {

        page.classList.remove("active");
        page.classList.remove("active-page");

        page.style.display = "none";

    });


    /* -----------------------------------------
       SHOW SELECTED SECTION
    ----------------------------------------- */

    const selectedPage =
        document.getElementById(pageName);

    if (selectedPage) {

        selectedPage.style.display = "block";

        selectedPage.classList.add("active");

        selectedPage.classList.add("active-page");

    }


    /* -----------------------------------------
       SIDEBAR ACTIVE ITEM
    ----------------------------------------- */

    const navItems = document.querySelectorAll(
        ".sidebar .nav-item"
    );

    navItems.forEach(item => {

        item.classList.remove("active");

        if (item.dataset.page === pageName) {
            item.classList.add("active");
        }

    });


    /* -----------------------------------------
       MOBILE NAV ACTIVE STATE
    ----------------------------------------- */

    const mobileButtons =
        document.querySelectorAll(".mobile-nav button");

    mobileButtons.forEach(button => {

        button.classList.remove("active");

    });


    /* -----------------------------------------
       GO TO TOP
    ----------------------------------------- */

    window.scrollTo(0, 0);


    /* -----------------------------------------
       PAGE-SPECIFIC FUNCTIONS
    ----------------------------------------- */

    if (
        pageName === "projects" &&
        typeof loadProjects === "function"
    ) {
        loadProjects();
    }


    if (
        pageName === "myprojects" &&
        typeof loadMyProjects === "function"
    ) {
        loadMyProjects();
    }


    if (
        pageName === "team" &&
        typeof loadTeam === "function"
    ) {
        loadTeam();
    }


    if (
        pageName === "orders" &&
        typeof renderDepartmentOrders === "function"
    ) {
        renderDepartmentOrders();
    }


    if (
        pageName === "standards" &&
        typeof loadDocuments === "function"
    ) {
        loadDocuments();
    }


    if (
        pageName === "forms" &&
        typeof loadDocuments === "function"
    ) {
        loadDocuments();
    }


    if (
        pageName === "content" &&
        typeof loadDocuments === "function"
    ) {
        loadDocuments();
    }

}


/* =========================================================
   INITIALIZE NAVIGATION
========================================================= */

function initializePageNavigation() {

    const activeItem =
        document.querySelector(
            ".sidebar .nav-item.active"
        );

    const initialPage =
        activeItem?.dataset.page || "overview";

    showPage(initialPage);

}


/* =========================================================
   START NAVIGATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        setupNavigation();

        initializePageNavigation();

    }
);
