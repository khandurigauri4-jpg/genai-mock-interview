document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".difficulty-card").forEach((card) => {
        const button = card.querySelector(".select-btn");
        const heading = card.querySelector("h2");
        if (!button || !heading) return;
        button.addEventListener("click", (event) => {
            event.preventDefault();
            const title = heading.textContent.trim().toLowerCase();
            let selectedDifficulty = null;
            if (title.includes("beginner")) selectedDifficulty = "Beginner";
            else if (title.includes("intermediate")) selectedDifficulty = "Intermediate";
            else if (title.includes("advanced")) selectedDifficulty = "Advanced";
            if (!selectedDifficulty) {
                alert("Please select a difficulty level.");
                return;
            }
            const selectedType = localStorage.getItem("interviewType");
            if (!["HR", "Technical"].includes(selectedType)) {
                alert("Please choose your interview type first.");
                window.location.href = "interview-type.html";
                return;
            }
            localStorage.setItem("interviewDifficulty", selectedDifficulty);
            localStorage.removeItem("currentInterviewId");
            console.log("[Interview setup] Selected type:", selectedType, "| difficulty:", selectedDifficulty);
            window.location.href = "instructions.html";
        });
    });
});
