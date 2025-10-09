(() => {
    document.addEventListener("DOMContentLoaded", () => {
        const cards = document.querySelectorAll(".module-card");
        cards.forEach((card) => {
            const link = card.querySelector("a");
            if (!link) return;
            card.addEventListener("mouseenter", () => card.classList.add("is-active"));
            card.addEventListener("mouseleave", () => card.classList.remove("is-active"));
            link.addEventListener("focus", () => card.classList.add("is-active"));
            link.addEventListener("blur", () => card.classList.remove("is-active"));
        });
    });
})();
