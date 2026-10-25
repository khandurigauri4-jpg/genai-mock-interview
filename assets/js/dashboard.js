document.addEventListener("DOMContentLoaded", async function () {

    console.log("🔥 DASHBOARD JS LOADED");


    // =====================================================
    // GET CURRENT LOGGED-IN USER
    // =====================================================

    const currentUser = JSON.parse(
        localStorage.getItem("currentUser")
    );


    // If user is not logged in
    if (!currentUser) {

        console.log("❌ No current user found.");

        window.location.href = "login.html";

        return;

    }


    console.log("👤 Current User:", currentUser);


    // =====================================================
    // DISPLAY USER NAME
    // =====================================================

    const dashboardUserName =
        document.getElementById("dashboardUserName");

    const welcomeName =
        document.getElementById("welcomeName");


    if (dashboardUserName) {

        dashboardUserName.textContent =
            currentUser.name || "User";

    }


    if (welcomeName) {

        welcomeName.textContent =
            currentUser.name || "User";

    }


    // =====================================================
    // GET DASHBOARD ELEMENTS
    // =====================================================

    const interviewsTaken =
        document.getElementById("interviewsTaken");

    const averageScore =
        document.getElementById("averageScore");

    const bestScore =
        document.getElementById("bestScore");

    const atsScore =
        document.getElementById("atsScore");

    const historyBody =
        document.getElementById("historyBody");


    // =====================================================
    // FETCH INTERVIEW DATA FROM MONGODB
    // =====================================================

    try {

        console.log("📡 Fetching interviews...");


        const interviewResponse = await fetch(
            `http://localhost:5050/api/interviews/user/${currentUser.id}`
        );


        const interviewData =
            await interviewResponse.json();


        console.log(
            "📥 Interview Data:",
            interviewData
        );


        // =================================================
        // CHECK INTERVIEW RESPONSE
        // =================================================

        if (!interviewData.success) {

            console.error(
                "❌ Could not load interviews."
            );

            return;

        }


        const interviews =
            interviewData.interviews || [];


        console.log(
            "🎤 Interviews:",
            interviews
        );


        // =================================================
        // FETCH FEEDBACK DATA
        // =================================================

        console.log("📡 Fetching feedback...");


        const feedbackResponse = await fetch(
            `http://localhost:5050/api/feedback/user/${currentUser.id}`
        );


        const feedbackData =
            await feedbackResponse.json();


        console.log(
            "📥 Feedback Data:",
            feedbackData
        );


        let feedback = [];


        if (feedbackData.success) {

            feedback =
                feedbackData.feedback || [];

        }


        console.log(
            "📊 Feedback:",
            feedback
        );
        // =====================================================
// FETCH ATS SCORE
// =====================================================

const atsResponse = await fetch(
    `http://localhost:5050/api/ats-score/user/${currentUser.id}`
);

const atsData = await atsResponse.json();

console.log(
    "📄 ATS Score:",
    atsData
);


if (
    atsData.success &&
    atsData.atsScore &&
    atsScore
) {

    atsScore.textContent =
        atsData.atsScore.overallScore + "%";

}


        // =================================================
        // INTERVIEWS TAKEN
        // =================================================

        if (interviewsTaken) {

            interviewsTaken.textContent =
                interviews.length;

        }


        // =================================================
        // CALCULATE SCORES
        // =================================================

        const scores = feedback
            .map(function (item) {

                return Number(
                    item.overallScore
                );

            })
            .filter(function (score) {

                return !isNaN(score);

            });


        console.log(
            "📈 Scores:",
            scores
        );


        // =================================================
        // AVERAGE + BEST SCORE
        // =================================================

        if (scores.length > 0) {

            const total =
                scores.reduce(
                    function (sum, score) {

                        return sum + score;

                    },
                    0
                );


            const average =
                Math.round(
                    total / scores.length
                );


            const best =
                Math.max(...scores);


            if (averageScore) {

                averageScore.textContent =
                    average + "%";

            }


            if (bestScore) {

                bestScore.textContent =
                    best + "%";

            }

        }


        // =================================================
        // INTERVIEW HISTORY
        // =================================================

        if (historyBody) {

            historyBody.innerHTML = "";


            // ---------------------------------------------
            // NO INTERVIEWS
            // ---------------------------------------------

            if (interviews.length === 0) {

                historyBody.innerHTML = `

                    <tr>

                        <td colspan="5">

                            No interviews completed yet.

                        </td>

                    </tr>

                `;

            }


            // ---------------------------------------------
            // DISPLAY INTERVIEWS
            // ---------------------------------------------

            else {

                interviews.forEach(function (interview) {


                    // =====================================
                    // FIND FEEDBACK FOR THIS INTERVIEW
                    // =====================================

                    const interviewFeedback =
                        feedback.find(function (item) {

                            return String(
                                item.interviewId
                            ) === String(
                                interview.id
                            );

                        });


                    // =====================================
                    // SCORE
                    // =====================================

                    let score = "--";


                    if (interviewFeedback) {

                        const feedbackScore =
                            Number(
                                interviewFeedback.overallScore
                            );


                        if (!isNaN(feedbackScore)) {

                            score =
                                feedbackScore + "%";

                        }

                    }


                    // =====================================
                    // DATE
                    // =====================================

                    let date = "--";


                    if (interview.startedAt) {

                        const interviewDate =
                            new Date(
                                interview.startedAt
                            );


                        if (
                            !isNaN(
                                interviewDate.getTime()
                            )
                        ) {

                            date =
                                interviewDate.toLocaleDateString(
                                    "en-IN",
                                    {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric"
                                    }
                                );

                        }

                    }


                    // =====================================
                    // STATUS
                    // =====================================

                    const status =
                        interview.status ||
                        "In Progress";


                    // =====================================
                    // CREATE TABLE ROW
                    // =====================================

                    const row =
                        document.createElement("tr");


                    row.innerHTML = `

                        <td>
                            ${date}
                        </td>

                        <td>
                            ${interview.type || "--"}
                        </td>

                        <td>
                            ${interview.difficulty || "--"}
                        </td>

                        <td>
                            ${score}
                        </td>

                        <td class="${
                            status.toLowerCase() === "completed"
                                ? "completed"
                                : ""
                        }">

                            ${status}

                        </td>

                    `;


                    historyBody.appendChild(row);

                });

            }

        }


    } catch (error) {

        console.error(
            "❌ DASHBOARD ERROR:",
            error
        );


        // Show error inside table

        if (historyBody) {

            historyBody.innerHTML = `

                <tr>

                    <td colspan="5">

                        Unable to load interview history.

                    </td>

                </tr>

            `;

        }

    }


    // =====================================================
    // LOGOUT BUTTON
    // =====================================================

    const logoutBtn =
        document.getElementById("logoutBtn");


    const topLogoutBtn =
        document.getElementById("topLogoutBtn");


    // =====================================================
    // LOGOUT FUNCTION
    // =====================================================

    function logout(event) {

        event.preventDefault();


        console.log(
            "🚪 Logging out..."
        );


        // Remove login information

        localStorage.removeItem(
            "currentUser"
        );


        // Remove current interview information

        localStorage.removeItem(
            "currentInterviewId"
        );

        localStorage.removeItem(
            "interviewType"
        );

        localStorage.removeItem(
            "interviewDifficulty"
        );


        // Go to home page

        window.location.href =
            "index.html";

    }


    // =====================================================
    // ATTACH LOGOUT EVENTS
    // =====================================================

    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            logout
        );

    }


    if (topLogoutBtn) {

        topLogoutBtn.addEventListener(
            "click",
            logout
        );

    }


});