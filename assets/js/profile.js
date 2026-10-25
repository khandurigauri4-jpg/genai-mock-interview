document.addEventListener("DOMContentLoaded", function () {

    // ==============================
    // GET LOGGED-IN USER
    // ==============================

    const currentUser = JSON.parse(
        localStorage.getItem("currentUser")
    );

    if (!currentUser) {
        window.location.href = "login.html";
        return;
    }

    const userId = currentUser.id;

    console.log("Logged-in user ID:", userId);


    // ==============================
    // GET HTML ELEMENTS
    // ==============================

    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");

    const college = document.getElementById("college");
    const degree = document.getElementById("degree");
    const year = document.getElementById("year");
    const location = document.getElementById("location");

    const editProfile = document.getElementById("editProfile");
    const dashboardBtn = document.getElementById("dashboardBtn");


    // ==============================
    // LOAD PROFILE FROM MONGODB
    // ==============================

    async function loadProfile() {

        console.log("Loading profile...");

        try {

            const response = await fetch(
                `http://localhost:5050/api/profile/${userId}`
            );

            console.log("Profile response status:", response.status);

            const data = await response.json();

            console.log("Profile data:", data);


            if (!data.success) {

                alert(
                    data.message ||
                    "Could not load profile."
                );

                return;
            }


            const user = data.user;
            const profile = user.profile || {};


            // Name and email

            if (profileName) {
                profileName.textContent =
                    user.name || "No name";
            }

            if (profileEmail) {
                profileEmail.textContent =
                    user.email || "No email";
            }


            // Personal information

            if (college) {
                college.textContent =
                    profile.college || "Not added";
            }

            if (degree) {
                degree.textContent =
                    profile.degree || "Not added";
            }

            if (year) {
                year.textContent =
                    profile.year || "Not added";
            }

            if (location) {
                location.textContent =
                    profile.location || "Not added";
            }


            console.log("Profile loaded successfully!");

        } catch (error) {

            console.error(
                "PROFILE LOAD ERROR:",
                error
            );

            alert(
                "Could not connect to the backend. Make sure your server is running."
            );
        }
    }


    // ==============================
    // EDIT PROFILE BUTTON
    // ==============================

    if (editProfile) {

        editProfile.addEventListener(
            "click",
            async function () {

                console.log("Edit Profile clicked");


                const newCollege = prompt(
                    "Enter your college:",
                    college ? college.textContent : ""
                );

                if (newCollege === null) {
                    return;
                }


                const newDegree = prompt(
                    "Enter your degree:",
                    degree ? degree.textContent : ""
                );

                if (newDegree === null) {
                    return;
                }


                const newYear = prompt(
                    "Enter your year:",
                    year ? year.textContent : ""
                );

                if (newYear === null) {
                    return;
                }


                const newLocation = prompt(
                    "Enter your location:",
                    location ? location.textContent : ""
                );

                if (newLocation === null) {
                    return;
                }


                // ==============================
                // SAVE TO MONGODB
                // ==============================

                try {

                    const response = await fetch(
                        `http://localhost:5050/api/profile/${userId}`,
                        {
                            method: "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({

                                college:
                                    newCollege.trim(),

                                degree:
                                    newDegree.trim(),

                                year:
                                    newYear.trim(),

                                location:
                                    newLocation.trim()

                            })
                        }
                    );


                    const data =
                        await response.json();


                    console.log(
                        "Update response:",
                        data
                    );


                    if (data.success) {

                        alert(
                            "Profile updated successfully!"
                        );

                        // Load the updated information
                        loadProfile();

                    } else {

                        alert(
                            data.message ||
                            "Profile update failed."
                        );
                    }


                } catch (error) {

                    console.error(
                        "PROFILE UPDATE ERROR:",
                        error
                    );

                    alert(
                        "Could not connect to the backend."
                    );
                }

            }
        );

    } else {

        console.error(
            "Edit Profile button not found!"
        );

    }


    // ==============================
    // BACK TO DASHBOARD
    // ==============================

    if (dashboardBtn) {

        dashboardBtn.addEventListener(
            "click",
            function () {

                window.location.href =
                    "dashboard.html";

            }
        );

    } else {

        console.error(
            "Dashboard button not found!"
        );

    }


    // ==============================
    // LOAD PROFILE WHEN PAGE OPENS
    // ==============================

    loadProfile();

});