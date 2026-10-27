document.addEventListener("DOMContentLoaded", function () {

    const buttons = document.querySelectorAll("button");

    buttons.forEach(button => {

        button.addEventListener("click", function () {

            const text = button.textContent.trim().toLowerCase();

            if (text.includes("beginner")) {

                localStorage.setItem(
                    "interviewDifficulty",
                    "Beginner"
                );

                window.location.href = "instructions.html";

            }

            else if (text.includes("intermediate")) {

                localStorage.setItem(
                    "interviewDifficulty",
                    "Intermediate"
                );

                window.location.href = "instructions.html";

            }

            else if (text.includes("advanced")) {

                localStorage.setItem(
                    "interviewDifficulty",
                    "Advanced"
                );

                window.location.href = "instructions.html";

            }

        });

    });

});