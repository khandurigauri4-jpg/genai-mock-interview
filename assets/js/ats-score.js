document.addEventListener("DOMContentLoaded", async function () {

    console.log("🔥 ATS SCORE JS LOADED");


    // =====================================================
    // GET CURRENT USER
    // =====================================================

    const currentUser = JSON.parse(
        localStorage.getItem("currentUser")
    );


    if (!currentUser) {

        console.error("❌ No logged-in user found.");

        window.location.href = "login.html";

        return;
    }


    console.log("👤 Current User:", currentUser);


    // =====================================================
    // EXISTING ATS DATA
    // =====================================================

    const atsData = {

        userId: currentUser.id,

        overallScore: 82,

        keywordMatch: 85,

        formatting: 90,

        readability: 88,

        completeness: 78,

        suggestedSkills: [
            "SQL",
            "Python",
            "React",
            "Problem Solving"
        ],

        suggestions: [
            "Add measurable achievements in projects.",
            "Include relevant technical keywords.",
            "Keep the resume within one page.",
            "Add internship or certification details."
        ]

    };


    // =====================================================
    // SAVE ATS SCORE TO MONGODB
    // =====================================================

    try {

        console.log(
            "📡 Saving ATS score to MongoDB..."
        );


        const response = await fetch(
            "http://localhost:5050/api/ats-score",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(atsData)

            }
        );


        const data =
            await response.json();


        console.log(
            "📥 ATS response:",
            data
        );


        if (data.success) {

            console.log(
                "✅ ATS score saved successfully!"
            );

        } else {

            console.error(
                "❌ ATS score was not saved:",
                data.message
            );

        }


    } catch (error) {

        console.error(
            "❌ ATS DATABASE ERROR:",
            error
        );

    }


    // =====================================================
    // DASHBOARD BUTTON
    // =====================================================

    const dashboard =
        document.getElementById("dashboard");


    if (dashboard) {

        dashboard.addEventListener(
            "click",
            function () {

                console.log(
                    "➡️ Returning to dashboard..."
                );

                window.location.href =
                    "dashboard.html";

            }
        );

    }


    // =====================================================
    // DOWNLOAD BUTTON
    // =====================================================

    const downloadResume =
        document.getElementById("downloadResume");


    if (downloadResume) {

        downloadResume.addEventListener(
            "click",
            function () {

                alert(
                    "Resume download feature will be implemented later."
                );

            }
        );

    }

});