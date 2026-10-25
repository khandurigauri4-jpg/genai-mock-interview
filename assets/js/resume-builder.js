const currentUser =
    JSON.parse(
        localStorage.getItem(
            "currentUser"
        )
    );


if (!currentUser) {

    window.location.href =
        "login.html";

}


const resumeForm =
    document.getElementById(
        "resumeForm"
    );


resumeForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const resumeData = {

            name:
                document
                .getElementById("name")
                .value
                .trim(),

            email:
                document
                .getElementById("email")
                .value
                .trim(),

            phone:
                document
                .getElementById("phone")
                .value
                .trim(),

            location:
                document
                .getElementById("location")
                .value
                .trim(),

            linkedin:
                document
                .getElementById("linkedin")
                .value
                .trim(),

            github:
                document
                .getElementById("github")
                .value
                .trim(),

            summary:
                document
                .getElementById("summary")
                .value
                .trim(),

            degree:
                document
                .getElementById("degree")
                .value
                .trim(),

            college:
                document
                .getElementById("college")
                .value
                .trim(),

            graduation:
                document
                .getElementById("graduation")
                .value
                .trim(),

            cgpa:
                document
                .getElementById("cgpa")
                .value
                .trim(),

            skills:
                document
                .getElementById("skills")
                .value
                .trim(),

            project1Title:
                document
                .getElementById("project1Title")
                .value
                .trim(),

            project1:
                document
                .getElementById("project1")
                .value
                .trim(),

            project2Title:
                document
                .getElementById("project2Title")
                .value
                .trim(),

            project2:
                document
                .getElementById("project2")
                .value
                .trim(),

            role:
                document
                .getElementById("role")
                .value
                .trim(),

            company:
                document
                .getElementById("company")
                .value
                .trim(),

            duration:
                document
                .getElementById("duration")
                .value
                .trim(),

            experience:
                document
                .getElementById("experience")
                .value
                .trim(),

            certifications:
                document
                .getElementById("certifications")
                .value
                .trim(),

            achievements:
                document
                .getElementById("achievements")
                .value
                .trim()

        };


        try {

            const response =
                await fetch(
                    `http://localhost:5050/api/resume/${currentUser.id}`,
                    {

                        method: "PUT",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify(
                                resumeData
                            )

                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                alert(
                    data.message
                );

                return;

            }


            /*
              Keep a temporary local copy
              for the preview page.
            */

            localStorage.setItem(
                "resumeData",
                JSON.stringify(
                    resumeData
                )
            );


            window.location.href =
                "resume-preview.html";


        } catch (error) {

            console.error(error);

            alert(
                "Unable to connect to the backend."
            );

        }

    }
);