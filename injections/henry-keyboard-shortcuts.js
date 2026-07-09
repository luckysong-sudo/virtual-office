<!-- [HENRY_KEYBOARD_SHORTCUTS_START] -->
<script>
document.addEventListener("keydown", function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); var si=document.getElementById("searchInput"); if(si)si.focus(); }
    if (e.key === "Escape") { document.querySelectorAll(".modal").forEach(function(el){el.style.display="none";}); }
});
</script>
<!-- [HENRY_KEYBOARD_SHORTCUTS_END] -->
