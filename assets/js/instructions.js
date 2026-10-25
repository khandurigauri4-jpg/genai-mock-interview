document.addEventListener("DOMContentLoaded", function () {

    const currentUser = JSON.parse(
        localStorage.getItem("currentUser")
    );

    if (!currentUser) {
        window.location.href = "login.html";
        return;
    }


    const startButton = document.querySelector(
        'button:last-of-type'
    );


    if (!startButton) {
        console.error("Start Interview button not found.");
        return;
    }


    startButton.addEventListener("click", async function () {

        const type =
            localStorage.getItem("interviewType") || "HR";

        const difficulty =
            localStorage.getItem("interviewDifficulty") ||
            "Beginner";


        console.log("Interview Type:", type);
        console.log("Difficulty:", difficulty);


        try {

            // Create interview in MongoDB

            const response = await fetch(
                "http://localhost:5050/api/interviews",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        userId: currentUser.id,

                        type: type,

                        difficulty: difficulty

                    })
                }
            );


            const data = await response.json();


            console.log(
                "Interview creation response:",
                data
            );


            if (!data.success) {

                alert(
                    data.message ||
                    "Could not start interview."
                );

                return;
            }


            // Store interview ID

            localStorage.setItem(
                "currentInterviewId",
                data.interviewId
            );


            console.log(
                "Interview ID:",
                data.interviewId
            );


            // Go to interview page

            window.location.href =
                "interview.html";


        } catch (error) {

            console.error(
                "START INTERVIEW ERROR:",
                error
            );

            alert(
                "Could not connect to the backend."
            );

        }

    });

});