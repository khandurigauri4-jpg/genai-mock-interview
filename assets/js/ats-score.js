document.addEventListener("DOMContentLoaded", async function () {
    const API_BASE = "http://localhost:5050";
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!currentUser) {
        window.location.href = "login.html";
        return;
    }

    const $ = id => document.getElementById(id);
    const safe = value => String(value || "").trim();
    const escapeHtml = value => String(value || "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));

    let resume = JSON.parse(localStorage.getItem("resumeData") || "null");
    try {
        const response = await fetch(`${API_BASE}/api/resume/${encodeURIComponent(currentUser.id)}`);
        const data = await response.json();
        if (response.ok && data.success && data.resume) {
            resume = data.resume;
            localStorage.setItem("resumeData", JSON.stringify(resume));
        }
    } catch (error) {
        console.warn("Could not fetch resume from database; checking local copy.", error);
    }

    if (!resume) {
        alert("Create and save your resume first. ATS scoring uses your actual resume content.");
        window.location.href = "resume-builder.html";
        return;
    }

    const fields = [
        "name", "email", "phone", "location", "summary", "degree",
        "college", "graduation", "skills", "project1Title", "project1",
        "certifications", "achievements"
    ];
    const filled = fields.filter(key => safe(resume[key])).length;
    const completeness = Math.round(filled / fields.length * 100);

    const allText = [
        resume.summary, resume.skills, resume.project1Title, resume.project1,
        resume.project2Title, resume.project2, resume.experience, resume.certifications,
        resume.achievements, resume.degree
    ].map(safe).join(" ").toLowerCase();

    const keywords = [
        "java", "python", "c++", "c", "javascript", "html", "css", "react",
        "node", "express", "mongodb", "sql", "git", "github", "data structures",
        "algorithms", "dsa", "oop", "api", "problem solving", "communication",
        "machine learning", "ai", "cloud", "testing"
    ];
    const foundKeywords = keywords.filter(keyword => {
        if (keyword === "c++") return /\\bc\\+\\+/i.test(allText);
        if (keyword === "node") return /\\bnode(?:\\.js|js)?\\b/i.test(allText);
        const escaped = keyword.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");
        return new RegExp("\\\\b" + escaped + "\\\\b", "i").test(allText);
    });
    const keywordMatch = Math.round(foundKeywords.length / 12 * 100 > 100 ? 100 : foundKeywords.length / 12 * 100);

    const hasContact = Boolean(safe(resume.email) && safe(resume.phone));
    const hasEducation = Boolean(safe(resume.degree) && safe(resume.college));
    const hasProjects = Boolean((safe(resume.project1Title) && safe(resume.project1)) ||
        (safe(resume.project2Title) && safe(resume.project2)));
    const formatting = Math.round(
        (hasContact ? 30 : 0) +
        (hasEducation ? 25 : 0) +
        (hasProjects ? 25 : 0) +
        (safe(resume.skills) ? 10 : 0) +
        (safe(resume.summary) ? 10 : 0)
    );

    const textForReadability = [resume.summary, resume.project1, resume.project2, resume.experience].map(safe).join(" ");
    const words = textForReadability.match(/\b[\w'-]+\b/g) || [];
    const sentences = textForReadability.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    const averageSentenceLength = sentences.length ? words.length / sentences.length : 0;
    const readability = textForReadability.length === 0
        ? 0
        : Math.max(35, Math.min(100, Math.round(100 - Math.max(0, averageSentenceLength - 22) * 2 - (averageSentenceLength > 0 && averageSentenceLength < 6 ? 15 : 0))));

    const overallScore = Math.round(
        completeness * 0.35 + keywordMatch * 0.30 + formatting * 0.20 + readability * 0.15
    );

    const suggestions = [];
    if (!safe(resume.summary)) suggestions.push("Add a concise professional summary tailored to your target role.");
    if (!safe(resume.skills)) suggestions.push("Add a focused skills section using skills relevant to the role.");
    if (!hasProjects) suggestions.push("Add at least one project with your contribution, tools, and outcome.");
    if (!safe(resume.achievements)) suggestions.push("Include measurable achievements where possible.");
    if (!safe(resume.certifications)) suggestions.push("Add relevant certifications or coursework if you have them.");
    if (foundKeywords.length < 8) suggestions.push("Include more truthful role-relevant keywords from the job description; never add skills you do not have.");
    if (!safe(resume.linkedin) && !safe(resume.github)) suggestions.push("Add a professional portfolio, GitHub, or LinkedIn link if available.");
    if (!suggestions.length) suggestions.push("Good coverage. Tailor the resume keywords and project achievements to each job description.");

    const set = (id, value) => { if ($(id)) $(id).textContent = value; };
    set("overallATSScore", `${overallScore}%`);
    set("keywordMatch", `${keywordMatch}%`);
    set("formatting", `${formatting}%`);
    set("readability", `${readability}%`);
    set("completeness", `${completeness}%`);

    const skillsList = $("suggestedSkillsList");
    if (skillsList) {
        skillsList.innerHTML = "";
        const missing = keywords.filter(k => !foundKeywords.includes(k)).slice(0, 6);
        (missing.length ? missing : ["Keep role-specific skills aligned with the job description"]).forEach(skill => {
            const li = document.createElement("li");
            li.textContent = skill;
            skillsList.appendChild(li);
        });
    }
    const suggestionsList = $("atsSuggestionsList");
    if (suggestionsList) {
        suggestionsList.innerHTML = "";
        suggestions.forEach(suggestion => {
            const li = document.createElement("li");
            li.textContent = suggestion;
            suggestionsList.appendChild(li);
        });
    }

    const atsData = {
        userId: currentUser.id,
        overallScore, keywordMatch, formatting, readability, completeness,
        matchedKeywords: foundKeywords,
        suggestedSkills: keywords.filter(k => !foundKeywords.includes(k)).slice(0, 6),
        suggestions,
        method: "Local resume-content heuristic; not a guarantee of a particular employer's ATS result.",
        createdAt: new Date().toISOString()
    };
    try {
        const response = await fetch(`${API_BASE}/api/ats-score`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(atsData)
        });
        const data = await response.json();
        if (!response.ok || !data.success) console.error("ATS score save failed:", data.message);
    } catch (error) {
        console.error("Could not save ATS score:", error);
    }

    const dashboard = $("dashboard");
    if (dashboard) dashboard.addEventListener("click", () => { window.location.href = "dashboard.html"; });

    const download = $("downloadResume");
    if (download) download.addEventListener("click", () => {
        const section = (title, content) => content ? `<h2>${title}</h2><p>${escapeHtml(content).replace(/\n/g, "<br>")}</p>` : "";
        const skills = safe(resume.skills).split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(resume.name || "Resume")}</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;line-height:1.5;color:#222}h1{margin-bottom:4px}h2{border-bottom:1px solid #aaa;padding-bottom:4px;font-size:17px}p{white-space:normal}.contact{color:#555}</style></head><body><h1>${escapeHtml(resume.name)}</h1><p class="contact">${[resume.email,resume.phone,resume.location,resume.linkedin,resume.github].filter(Boolean).map(escapeHtml).join(" | ")}</p>${section("Professional Summary",resume.summary)}${section("Education",[resume.degree,resume.college,resume.graduation,resume.cgpa].filter(Boolean).join(" | "))}<h2>Skills</h2><p>${skills.map(escapeHtml).join(" • ")}</p>${section(resume.project1Title || "Project 1",resume.project1)}${section(resume.project2Title || "Project 2",resume.project2)}${section("Experience",[resume.role,resume.company,resume.duration,resume.experience].filter(Boolean).join(" | "))}${section("Certifications",resume.certifications)}${section("Achievements",resume.achievements)}<hr><p><small>ATS compatibility estimate: ${overallScore}%. This is a heuristic, not a guarantee of employer ATS outcomes.</small></p></body></html>`;
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${(safe(resume.name) || "resume").replace(/[^a-z0-9_-]/gi, "_")}-resume.html`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    console.log("ATS score calculated from saved resume content:", atsData);
});
