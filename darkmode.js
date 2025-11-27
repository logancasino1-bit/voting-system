// Global Dark Mode Script
function toggleDarkMode() {
    const body = document.body;
    const icon = document.getElementById("themeIcon");
    const toggle = document.querySelector(".theme-toggle");

    body.classList.toggle("dark-mode");

    if (body.classList.contains("dark-mode")) {
        if(icon){
            icon.classList.remove("fa-moon");
            icon.classList.add("fa-sun");
        }
        if(toggle){
            toggle.classList.remove("light-glow");
            toggle.classList.add("dark-glow");
        }
        localStorage.setItem("theme", "dark");
    } else {
        if(icon){
            icon.classList.remove("fa-sun");
            icon.classList.add("fa-moon");
        }
        if(toggle){
            toggle.classList.remove("dark-glow");
            toggle.classList.add("light-glow");
        }
        localStorage.setItem("theme", "light");
    }
}

// Apply saved theme on every page load
window.addEventListener("DOMContentLoaded", () => {
    const body = document.body;
    const icon = document.getElementById("themeIcon");
    const toggle = document.querySelector(".theme-toggle");

    const savedTheme = localStorage.getItem("theme");
    if(savedTheme === "dark"){
        body.classList.add("dark-mode");
        if(icon){
            icon.classList.remove("fa-moon");
            icon.classList.add("fa-sun");
        }
        if(toggle){
            toggle.classList.remove("light-glow");
            toggle.classList.add("dark-glow");
        }
    } else {
        if(toggle){
            toggle.classList.add("light-glow");
        }
    }
});
