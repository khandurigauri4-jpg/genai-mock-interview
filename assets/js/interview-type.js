document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".card").forEach((card) => {
        const button = card.querySelector(".select-btn");
        const heading = card.querySelector("h2");
        if (!button || !heading) return;
        button.addEventListener("click", (event) => {
            event.preventDefault();
            const title = heading.textContent.trim().toLowerCase();
            const selectedType = title.includes("technical") ? "Technical" :
                title.includes("hr") ? "HR" : null;
            if (!selectedType) {
                alert("Please select HR or Technical interview.");
                return;
            }
            localStorage.setItem("interviewType", selectedType);
            localStorage.removeItem("interviewDifficulty");
            localStorage.removeItem("currentInterviewId");
            localStorage.setItem("selectedInterviewStartedAt", String(Date.now()));
            console.log("[Interview setup] Selected type:", selectedType);
            window.location.href = "difficulty.html";
        });
    });
});
