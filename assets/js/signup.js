document.addEventListener("DOMContentLoaded", function () {

    const signupForm = document.getElementById("signupForm");

    signupForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        // Get form values
        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        const terms = document.getElementById("terms");

        // Basic validation
        if (name === "" || email === "" || password === "" || confirmPassword === "") {
            alert("Please fill in all fields.");
            return;
        }

        // Check password match
        if (password !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        // Check terms and conditions
        if (!terms.checked) {
            alert("Please agree to the Terms & Conditions.");
            return;
        }

        try {

            // Send data to Node.js + Express backend
            const response = await fetch("http://localhost:5050/api/signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            // Successful signup
            if (data.success) {

                alert("Account created successfully!");

                // Go to login page
                window.location.href = "login.html";

            } else {

                alert(data.message || "Unable to create account.");

            }

        } catch (error) {

            console.error("Signup Error:", error);

            alert("Unable to connect to the server.");

        }
    });

});