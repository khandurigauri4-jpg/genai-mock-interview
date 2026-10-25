const currentUser = JSON.parse(
    localStorage.getItem("currentUser")
);

if (!currentUser) {
    window.location.href = "login.html";
}
const data = JSON.parse(
    localStorage.getItem("resumeData")
);


/* If no resume data exists */

if (!data) {

    window.location.href = "resume-builder.html";

}


/* BASIC INFORMATION */

document.getElementById("resumeName").textContent =
    data.name || "Your Name";


let contact = [];

if (data.location)
    contact.push(data.location);

if (data.phone)
    contact.push(data.phone);

if (data.email)
    contact.push(data.email);

if (data.linkedin)
    contact.push(data.linkedin);

if (data.github)
    contact.push(data.github);


document.getElementById("contactInfo").textContent =
    contact.join("  |  ");


/* SUMMARY */

if (data.summary) {

    document.getElementById("resumeSummary").textContent =
        data.summary;

} else {

    document.getElementById("summarySection").style.display =
        "none";

}


/* EDUCATION */

if (data.degree || data.college) {

    document.getElementById("resumeDegree").textContent =
        data.degree;

    document.getElementById("resumeCollege").textContent =
        data.college;

    document.getElementById("resumeGraduation").textContent =
        data.graduation;

    document.getElementById("resumeCgpa").textContent =
        data.cgpa;

} else {

    document.getElementById("educationSection").style.display =
        "none";

}


/* SKILLS */

if (data.skills) {

    const skills = data.skills
        .split(",")
        .map(skill => skill.trim())
        .filter(skill => skill !== "");

    const skillsElement =
        document.getElementById("resumeSkills");

    skillsElement.textContent =
        skills.join("  •  ");

} else {

    document.getElementById("skillsSection").style.display =
        "none";

}


/* EXPERIENCE */

if (
    data.role ||
    data.company ||
    data.duration ||
    data.experience
) {

    document.getElementById("resumeRole").textContent =
        data.role;

    document.getElementById("resumeCompany").textContent =
        data.company;

    document.getElementById("resumeDuration").textContent =
        data.duration;

    document.getElementById("resumeExperience").textContent =
        data.experience;

} else {

    document.getElementById("experienceSection").style.display =
        "none";

}


/* PROJECT 1 */

if (data.project1Title || data.project1) {

    document.getElementById("resumeProject1Title").textContent =
        data.project1Title;

    document.getElementById("resumeProject1").textContent =
        data.project1;

} else {

    document.getElementById("projectOne").style.display =
        "none";

}


/* PROJECT 2 */

if (data.project2Title || data.project2) {

    document.getElementById("resumeProject2Title").textContent =
        data.project2Title;

    document.getElementById("resumeProject2").textContent =
        data.project2;

} else {

    document.getElementById("projectTwo").style.display =
        "none";

}


/* HIDE PROJECT SECTION IF BOTH ARE EMPTY */

if (
    !data.project1Title &&
    !data.project1 &&
    !data.project2Title &&
    !data.project2
) {

    document.getElementById("projectsSection").style.display =
        "none";

}


/* CERTIFICATIONS */

function createList(text, elementId, sectionId) {

    const section = document.getElementById(sectionId);

    const list = document.getElementById(elementId);

    if (!text) {

        section.style.display = "none";

        return;

    }

    const items = text
        .split("\n")
        .map(item => item.trim())
        .filter(item => item !== "");

    items.forEach(item => {

        const li = document.createElement("li");

        li.textContent = item;

        list.appendChild(li);

    });

}


createList(
    data.certifications,
    "resumeCertifications",
    "certificationSection"
);


createList(
    data.achievements,
    "resumeAchievements",
    "achievementSection"
);


/* EDIT BUTTON */

document
    .getElementById("editBtn")
    .addEventListener("click", function() {

        window.location.href =
            "resume-builder.html";

    });


/* ATS BUTTON */

document
    .getElementById("atsBtn")
    .addEventListener("click", function() {

        window.location.href =
            "ats-score.html";

    });