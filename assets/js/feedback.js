document.addEventListener("DOMContentLoaded", async function () {
    const API_BASE = "http://localhost:5050";

    const currentUser =
        JSON.parse(localStorage.getItem("currentUser"));

    if (!currentUser) {
        window.location.href = "login.html";
        return;
    }

    // =========================================================
    // HELPERS
    // =========================================================
    function firstNumber(...values) {
        for (const value of values) {
            const number = Number(value);
            if (Number.isFinite(number)) return number;
        }
        return 0;
    }

    function clamp(value) {
        const number = Number(value) || 0;
        return Math.max(0, Math.min(100, Math.round(number)));
    }

    function safeText(value, fallback = "Not available") {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return fallback;
        }

        return String(value);
    }

    function setText(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    }

    function setScore(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = `${clamp(value)}%`;
        }
    }

    function setBar(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.style.width = `${clamp(value)}%`;
        }
    }

    function renderList(id, items) {
        const element = document.getElementById(id);

        if (!element) return;

        element.innerHTML = "";

        const list =
            Array.isArray(items) && items.length
                ? items
                : ["No information available."];

        list.forEach(function (item) {
            const li = document.createElement("li");
            li.textContent = safeText(item);
            element.appendChild(li);
        });
    }

    // =========================================================
    // DYNAMIC VISUAL ANALYSIS SECTION
    // This means you do NOT need to redesign feedback.html.
    // =========================================================
    function createVisualSection() {
        let section =
            document.getElementById(
                "visualAnalysisSection"
            );

        if (section) return section;

        section = document.createElement("section");
        section.id = "visualAnalysisSection";

        section.style.marginTop = "30px";
        section.style.padding = "24px";
        section.style.borderRadius = "18px";
        section.style.background = "#f8f9ff";
        section.style.boxShadow =
            "0 8px 24px rgba(0,0,0,0.08)";

        section.innerHTML = `
            <h2 style="margin-bottom:20px;">
                Video & Visual Analysis
            </h2>

            <div id="visualCards"
                 style="
                    display:grid;
                    grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
                    gap:15px;
                 ">
            </div>

            <div style="margin-top:25px;">
                <h3>OpenCV Frame Quality</h3>
                <p id="opencvSummary">
                    Not available
                </p>
            </div>
        `;

        const main =
            document.querySelector("main") ||
            document.querySelector(".container") ||
            document.body;

        main.appendChild(section);

        return section;
    }

    function addVisualCard(
        container,
        title,
        value,
        subtitle
    ) {
        const card =
            document.createElement("div");

        card.style.padding = "18px";
        card.style.borderRadius = "14px";
        card.style.background = "#ffffff";
        card.style.border = "1px solid #ececff";

        card.innerHTML = `
            <div style="
                font-size:14px;
                opacity:0.7;
                margin-bottom:8px;
            ">
                ${title}
            </div>

            <div style="
                font-size:26px;
                font-weight:700;
            ">
                ${value}
            </div>

            <div style="
                font-size:13px;
                margin-top:6px;
                opacity:0.65;
            ">
                ${subtitle}
            </div>
        `;

        container.appendChild(card);
    }

    // =========================================================
    // LOAD FEEDBACK
    // =========================================================
    let feedback = null;

    try {
        console.log("📥 Fetching feedback from MongoDB...");

        const response =
            await fetch(
                `${API_BASE}/api/feedback/user/${currentUser.id}`
            );

        const data = await response.json();

        console.log(
            "📥 Feedback response:",
            data
        );

        if (
            data &&
            data.success &&
            Array.isArray(data.feedback) &&
            data.feedback.length > 0
        ) {
            feedback =
                data.feedback[
                    data.feedback.length - 1
                ];
        } else if (
            data &&
            data.success &&
            data.feedback
        ) {
            feedback = data.feedback;
        }

    } catch (error) {
        console.error(
            "❌ Feedback fetch error:",
            error
        );
    }

    // =========================================================
    // FALLBACK TO LOCAL STORAGE
    // =========================================================
    if (!feedback) {
        feedback =
            JSON.parse(
                localStorage.getItem(
                    "interviewEvaluation"
                )
            );
    }

    const visualAnalysis =
        feedback?.visualAnalysis ||
        JSON.parse(
            localStorage.getItem(
                "visualAnalysis"
            ) || "{}"
        );

    const voiceAnalysis =
        feedback?.voiceAnalysis ||
        JSON.parse(
            localStorage.getItem(
                "voiceAnalysis"
            ) || "{}"
        );

    if (!feedback) {
        console.error(
            "❌ No feedback found."
        );

        return;
    }

    console.log(
        "✅ Latest feedback:",
        feedback
    );

    // =========================================================
    // NORMALIZE FIELD NAMES
    // This fixes your old 0% problem.
    // =========================================================
    const overallScore =
        clamp(
            firstNumber(
                feedback.overallScore,
                feedback.overall,
                feedback.score
            )
        );

    const communicationScore =
        clamp(
            firstNumber(
                feedback.communicationScore,
                feedback.communication,
                feedback.communicationSkills
            )
        );

    const confidenceScore =
        clamp(
            firstNumber(
                feedback.confidenceScore,
                feedback.confidence,
                feedback.visualConfidence
            )
        );

    const technicalScore =
        clamp(
            firstNumber(
                feedback.technicalScore,
                feedback.technicalKnowledge,
                feedback.technical
            )
        );

    const voiceClarity =
        clamp(
            firstNumber(
                feedback.voiceClarity,
                voiceAnalysis.voiceClarityScore
            )
        );

    const eyeContact =
        clamp(
            firstNumber(
                feedback.eyeContact,
                visualAnalysis.eyeContactScore
            )
        );

    const bodyLanguage =
        clamp(
            firstNumber(
                feedback.bodyLanguage,
                feedback.bodyPosture,
                visualAnalysis.bodyPostureScore
            )
        );

    const nonVerbal =
        clamp(
            firstNumber(
                feedback.nonVerbalScore,
                visualAnalysis.nonVerbalScore,
                (
                    eyeContact +
                    bodyLanguage
                ) / 2
            )
        );

    const headPosture =
        clamp(
            firstNumber(
                feedback.headPosture,
                feedback.headPostureScore,
                visualAnalysis.headPostureScore
            )
        );

    const blinkCount =
        firstNumber(
            feedback.blinkCount,
            visualAnalysis.blinkCount
        );

    const blinkRate =
        firstNumber(
            feedback.blinkRate,
            visualAnalysis.blinkRate
        );

    const visualConfidence =
        clamp(
            firstNumber(
                feedback.visualConfidence,
                visualAnalysis.visualConfidence
            )
        );

    const facialExpression =
        safeText(
            feedback.facialExpression ||
            visualAnalysis.facialExpression,
            "Not detected"
        );

    const bodyPostureStatus =
        safeText(
            feedback.bodyPostureStatus ||
            visualAnalysis.bodyPostureStatus,
            "Not detected"
        );

    const eyeContactStatus =
        safeText(
            feedback.eyeContactStatus ||
            visualAnalysis.eyeContactStatus,
            "Not detected"
        );

    const frameQualityScore =
        clamp(
            firstNumber(
                feedback.openCVFrameQuality,
                visualAnalysis.frameQualityScore
            )
        );

    const averageBrightness =
        firstNumber(
            feedback.averageBrightness,
            visualAnalysis.averageBrightness
        );

    const averageSharpness =
        firstNumber(
            feedback.averageSharpness,
            visualAnalysis.averageSharpness
        );

    const frameQualityStatus =
        safeText(
            feedback.frameQualityStatus ||
            visualAnalysis.frameQualityStatus,
            "Not analyzed"
        );

    const wordsPerMinute =
        firstNumber(
            feedback.wordsPerMinute,
            voiceAnalysis.wordsPerMinute
        );

    const paceStatus =
        safeText(
            feedback.paceStatus ||
            voiceAnalysis.paceStatus,
            "Not available"
        );

    const fillerWordCount =
        firstNumber(
            feedback.fillerWordCount,
            voiceAnalysis.fillerWordCount
        );

    const fillerRate =
        firstNumber(
            feedback.fillerRate,
            voiceAnalysis.fillerRate
        );

    // =========================================================
    // MAIN SCORE UI
    // =========================================================
    setScore("overallScore", overallScore);

    // Existing page may use different IDs.
    setScore(
        "communicationScore",
        communicationScore
    );

    setScore(
        "confidenceScore",
        confidenceScore
    );

    setScore(
        "technicalScore",
        technicalScore
    );

    setScore(
        "voiceClarityScore",
        voiceClarity
    );

    setBar(
        "communicationBar",
        communicationScore
    );

    setBar(
        "confidenceBar",
        confidenceScore
    );

    setBar(
        "technicalBar",
        technicalScore
    );

    setBar(
        "voiceClarityBar",
        voiceClarity
    );

    // Existing text labels from your page.
    setText(
        "eyeContact",
        `${eyeContact}%`
    );

    setText(
        "bodyLanguage",
        `${bodyLanguage}%`
    );

    setText(
        "voiceClarity",
        `${voiceClarity}%`
    );

    // =========================================================
    // STRENGTHS / IMPROVEMENTS
    // =========================================================
    renderList(
        "strengthsList",
        feedback.strengths
    );

    renderList(
        "improvementsList",
        feedback.improvements
    );

    setText(
        "finalFeedback",
        safeText(
            feedback.finalFeedback,
            "No final feedback available."
        )
    );

    // =========================================================
    // QUESTION EVALUATIONS
    // =========================================================
    const questionContainer =
        document.getElementById(
            "questionEvaluations"
        ) ||
        document.getElementById(
            "questionEvaluationList"
        );

    if (questionContainer) {
        questionContainer.innerHTML = "";

        const evaluations =
            Array.isArray(
                feedback.questionEvaluations
            )
                ? feedback.questionEvaluations
                : [];

        evaluations.forEach(
            function (item, index) {
                const wrapper =
                    document.createElement("div");

                wrapper.style.marginBottom =
                    "20px";
                wrapper.style.padding =
                    "18px";
                wrapper.style.borderRadius =
                    "14px";
                wrapper.style.background =
                    "#f8f9ff";

                const heading =
                    document.createElement("h3");

                heading.textContent =
                    `Question ${index + 1}`;

                const q =
                    document.createElement("p");

                q.textContent =
                    `Question: ${safeText(
                        item.question
                    )}`;

                const a =
                    document.createElement("p");

                a.textContent =
                    `Answer: ${safeText(
                        item.answer
                    )}`;

                const score =
                    document.createElement("p");

                score.textContent =
                    `Score: ${firstNumber(
                        item.score
                    )}/10`;

                const strengths =
                    document.createElement("p");

                strengths.textContent =
                    `Strengths: ${Array.isArray(
                        item.strengths
                    )
                        ? item.strengths.join(", ")
                        : safeText(
                              item.strengths
                          )}`;

                const weaknesses =
                    document.createElement("p");

                weaknesses.textContent =
                    `Weaknesses: ${Array.isArray(
                        item.weaknesses
                    )
                        ? item.weaknesses.join(", ")
                        : safeText(
                              item.weaknesses
                          )}`;

                const suggestion =
                    document.createElement("p");

                suggestion.textContent =
                    `Suggestion: ${safeText(
                        item.suggestion
                    )}`;

                wrapper.append(
                    heading,
                    q,
                    a,
                    score,
                    strengths,
                    weaknesses,
                    suggestion
                );

                questionContainer.appendChild(
                    wrapper
                );
            }
        );
    }

    // =========================================================
    // VISUAL ANALYSIS CARDS
    // =========================================================
    const section =
        createVisualSection();

    const cards =
        document.getElementById(
            "visualCards"
        );

    if (cards) {
        cards.innerHTML = "";

        addVisualCard(
            cards,
            "Eye Contact",
            `${eyeContact}%`,
            eyeContactStatus
        );

        addVisualCard(
            cards,
            "Blink Count",
            `${blinkCount}`,
            `${blinkRate} blinks/min`
        );

        addVisualCard(
            cards,
            "Head Posture",
            `${headPosture}%`,
            safeText(
                feedback.headPostureStatus ||
                visualAnalysis.headPostureStatus,
                "Posture score"
            )
        );

        addVisualCard(
            cards,
            "Body Language",
            `${bodyLanguage}%`,
            bodyPostureStatus
        );

        addVisualCard(
            cards,
            "Facial Expression",
            facialExpression,
            "Landmark-based analysis"
        );

        addVisualCard(
            cards,
            "Visual Confidence",
            `${visualConfidence}%`,
            "Eye + head + body + blink indicators"
        );

        addVisualCard(
            cards,
            "Frame Quality",
            `${frameQualityScore}%`,
            frameQualityStatus
        );

        addVisualCard(
            cards,
            "Speech Pace",
            wordsPerMinute
                ? `${wordsPerMinute} WPM`
                : "N/A",
            paceStatus
        );

        addVisualCard(
            cards,
            "Filler Words",
            `${fillerWordCount}`,
            `${fillerRate}% of spoken words`
        );
    }

    const opencvSummary =
        document.getElementById(
            "opencvSummary"
        );

    if (opencvSummary) {
        opencvSummary.textContent =
            `OpenCV analyzed ${
                visualAnalysis.openCVFrameCount || 0
            } frames. Average brightness: ${
                averageBrightness || 0
            }. Average sharpness: ${
                averageSharpness || 0
            }. Frame quality: ${
                frameQualityStatus
            }.`;
    }

    // =========================================================
    // DOWNLOAD REPORT
    // =========================================================
    const downloadBtn =
        document.getElementById(
            "downloadBtn"
        );

    if (downloadBtn) {
        downloadBtn.addEventListener(
            "click",
            function () {
                const report = {
                    overallScore,
                    communicationScore,
                    confidenceScore,
                    technicalScore,
                    voiceClarity,
                    eyeContact,
                    blinkCount,
                    blinkRate,
                    headPosture,
                    bodyLanguage,
                    facialExpression,
                    visualConfidence,
                    frameQualityScore,
                    averageBrightness,
                    averageSharpness,
                    wordsPerMinute,
                    paceStatus,
                    fillerWordCount,
                    fillerRate,
                    strengths:
                        feedback.strengths || [],
                    improvements:
                        feedback.improvements || [],
                    finalFeedback:
                        feedback.finalFeedback || ""
                };

                const blob =
                    new Blob(
                        [
                            JSON.stringify(
                                report,
                                null,
                                2
                            )
                        ],
                        {
                            type:
                                "application/json"
                        }
                    );

                const url =
                    URL.createObjectURL(
                        blob
                    );

                const link =
                    document.createElement(
                        "a"
                    );

                link.href = url;
                link.download =
                    "interview-feedback-report.json";

                link.click();

                URL.revokeObjectURL(url);
            }
        );
    }

    // =========================================================
    // DASHBOARD
    // =========================================================
    const dashboardBtn =
        document.getElementById(
            "dashboardBtn"
        );

    if (dashboardBtn) {
        dashboardBtn.addEventListener(
            "click",
            function () {
                window.location.href =
                    "dashboard.html";
            }
        );
    }

    console.log(
        "✅ Complete feedback page loaded successfully."
    );
    console.log(
        "📊 Scores:",
        {
            overallScore,
            communicationScore,
            confidenceScore,
            technicalScore,
            voiceClarity,
            eyeContact,
            bodyLanguage,
            headPosture,
            visualConfidence
        }
    );
});