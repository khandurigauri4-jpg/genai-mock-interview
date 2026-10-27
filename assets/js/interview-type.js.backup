document.addEventListener("DOMContentLoaded", function () {

    const buttons = document.querySelectorAll("button");

    buttons.forEach(button => {

        button.addEventListener("click", function () {

            const text = button.textContent.trim().toLowerCase();

            if (text.includes("hr")) {

                localStorage.setItem(
                    "interviewType",
                    "HR"
                );

                window.location.href = "difficulty.html";

            }

            else if (text.includes("technical")) {

                localStorage.setItem(
                    "interviewType",
                    "Technical"
                );

                window.location.href = "difficulty.html";

            }

        });

    });

});