document.addEventListener("DOMContentLoaded", async function () {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!currentUser) {
        window.location.href = "login.html";
        return;
    }

    let data = JSON.parse(localStorage.getItem("resumeData") || "null");
    try {
        const response = await fetch(`http://localhost:5050/api/resume/${encodeURIComponent(currentUser.id)}`);
        const result = await response.json();
        if (response.ok && result.success && result.resume) {
            data = result.resume;
            localStorage.setItem("resumeData", JSON.stringify(data));
        }
    } catch (error) {
        console.warn("Resume could not be refreshed from database; using local saved copy.", error);
    }

    if (!data) {
        window.location.href = "resume-builder.html";
        return;
    }

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || "";
    };
    const hide = id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    };

    setText("resumeName", data.name || "Your Name");
    setText("contactInfo", [data.location, data.phone, data.email, data.linkedin, data.github].filter(Boolean).join(" | "));

    if (data.summary) setText("resumeSummary", data.summary);
    else hide("summarySection");

    if (data.degree || data.college) {
        setText("resumeDegree", data.degree);
        setText("resumeCollege", data.college);
        setText("resumeGraduation", data.graduation);
        setText("resumeCgpa", data.cgpa);
    } else hide("educationSection");

    if (data.skills) {
        setText("resumeSkills", data.skills.split(/[,;\n]/).map(s => s.trim()).filter(Boolean).join(" • "));
    } else hide("skillsSection");

    if (data.role || data.company || data.duration || data.experience) {
        setText("resumeRole", data.role);
        setText("resumeCompany", data.company);
        setText("resumeDuration", data.duration);
        setText("resumeExperience", data.experience);
    } else hide("experienceSection");

    if (data.project1Title || data.project1) {
        setText("resumeProject1Title", data.project1Title || "Project 1");
        setText("resumeProject1", data.project1);
    } else hide("projectOne");

    if (data.project2Title || data.project2) {
        setText("resumeProject2Title", data.project2Title || "Project 2");
        setText("resumeProject2", data.project2);
    } else hide("projectTwo");

    if (!(data.project1Title || data.project1 || data.project2Title || data.project2)) hide("projectsSection");

    function createList(text, elementId, sectionId) {
        const section = document.getElementById(sectionId);
        const list = document.getElementById(elementId);
        if (!text) {
            if (section) section.style.display = "none";
            return;
        }
        if (!list) return;
        list.innerHTML = "";
        String(text).split(/\n|;/).map(item => item.trim()).filter(Boolean).forEach(item => {
            const li = document.createElement("li");
            li.textContent = item;
            list.appendChild(li);
        });
    }

    createList(data.certifications, "resumeCertifications", "certificationSection");
    createList(data.achievements, "resumeAchievements", "achievementSection");

    const editBtn = document.getElementById("editBtn");
    if (editBtn) editBtn.addEventListener("click", () => { window.location.href = "resume-builder.html"; });
    const atsBtn = document.getElementById("atsBtn");
    if (atsBtn) atsBtn.addEventListener("click", () => { window.location.href = "ats-score.html"; });
});
