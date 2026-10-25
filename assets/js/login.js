const loginForm =
    document.getElementById("loginForm");


loginForm.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const email =
            document
            .getElementById("email")
            .value
            .trim();


        const password =
            document
            .getElementById("password")
            .value;


        try {

            const response =
                await fetch(
                    "http://localhost:5050/api/login",
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                email,
                                password

                            })

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


            localStorage.setItem(
                "currentUser",
                JSON.stringify(
                    data.user
                )
            );


            window.location.href =
                "dashboard.html";


        } catch (error) {

            console.error(error);

            alert(
                "Unable to connect to the server."
            );

        }

    }
);