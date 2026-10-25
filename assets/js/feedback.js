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
            if (value === null || value === undefined || value === "") continue;
            const number = Number(value);
            if (Number.isFinite(number)) return number;
        }
        return 0;
    }

    function firstMeasuredNumber(...values) {
        for (const value of values) {
            if (value === null || value === undefined || value === "") continue;
            const number = Number(value);
            if (Number.isFinite(number) && number >= 0) return number;
        }
        return null;
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
            // API sorts newest first; use the first item.
            feedback = data.feedback[0];
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

    const openCVAnalysis =
        feedback?.opencvAnalysis ||
        feedback?.openCVAnalysis ||
        JSON.parse(
            localStorage.getItem("openCVAnalysis") || "{}"
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

    const faceFrames = firstNumber(
        visualAnalysis.faceDetectedFrames,
        visualAnalysis.analyzedFrames
    );
    const poseFrames = firstNumber(visualAnalysis.poseFrames);
    const cvFrames = firstNumber(
        openCVAnalysis.openCVFrameCount,
        openCVAnalysis.framesAnalyzed,
        openCVAnalysis.analyzedFrames,
        feedback.framesAnalyzed
    );

    const voiceClarityRaw = firstMeasuredNumber(
        voiceAnalysis.voiceClarity,
        voiceAnalysis.voiceClarityScore,
        feedback.voiceClarity
    );
    const voiceHasTranscript = Math.max(
        Number(voiceAnalysis.wordsPerMinute) || 0,
        Number(feedback.wordsPerMinute) || 0
    ) > 0 || /transcript/i.test(String(voiceAnalysis.status || ""));
    const voiceClarity = (voiceClarityRaw === null || (voiceClarityRaw === 0 && !voiceHasTranscript))
        ? null : clamp(voiceClarityRaw);

    const eyeContactRaw = firstMeasuredNumber(
        visualAnalysis.eyeContactScore,
        visualAnalysis.eyeContact,
        feedback.eyeContactScore,
        feedback.eyeContact
    );
    const eyeContact = (faceFrames > 0 || (eyeContactRaw !== null && eyeContactRaw > 0))
        ? clamp(eyeContactRaw ?? 0) : null;

    const bodyLanguageRaw = firstMeasuredNumber(
        visualAnalysis.bodyPostureScore,
        visualAnalysis.bodyLanguage,
        feedback.bodyPostureScore,
        feedback.bodyLanguage
    );
    const bodyLanguage = (poseFrames > 0 || (bodyLanguageRaw !== null && bodyLanguageRaw > 0))
        ? clamp(bodyLanguageRaw ?? 0) : null;

    const headPostureRaw = firstMeasuredNumber(
        visualAnalysis.headPostureScore,
        feedback.headPostureScore
    );
    const headPosture = (faceFrames > 0 || (headPostureRaw !== null && headPostureRaw > 0))
        ? clamp(headPostureRaw ?? 0) : null;

    const blinkCountRaw = firstMeasuredNumber(
        visualAnalysis.blinkCount,
        feedback.blinkCount
    );
    const blinkCount = faceFrames > 0 ? (blinkCountRaw ?? 0) : null;

    const blinkRateRaw = firstMeasuredNumber(
        visualAnalysis.blinkRate,
        feedback.blinkRate
    );
    const blinkRate = faceFrames > 0 ? (blinkRateRaw ?? 0) : null;

    const visualConfidenceRaw = firstMeasuredNumber(
        visualAnalysis.visualConfidence,
        feedback.visualConfidence
    );
    const visualConfidence = (faceFrames > 0 || poseFrames > 0)
        ? clamp(visualConfidenceRaw ?? 0)
        : (visualConfidenceRaw !== null && visualConfidenceRaw > 0 ? clamp(visualConfidenceRaw) : null);

    const facialExpression = safeText(
        visualAnalysis.facialExpression || feedback.facialExpression,
        "Not evaluated"
    );

    let bodyPostureStatus = safeText(
        visualAnalysis.bodyPostureStatus ||
        visualAnalysis.bodyPosture ||
        feedback.bodyPosture ||
        feedback.bodyPostureStatus,
        "Not evaluated"
    );
    if (bodyLanguage !== null && /not evaluated|not detected/i.test(bodyPostureStatus)) {
        bodyPostureStatus = "Measured score in saved report";
    }

    let eyeContactStatus = safeText(
        visualAnalysis.eyeContactStatus ||
        feedback.eyeContactStatus,
        eyeContact !== null ? "Measured during interview" : "Not evaluated"
    );
    if (eyeContact !== null && /not evaluated|not detected/i.test(eyeContactStatus)) {
        eyeContactStatus = "Measured score in saved report";
    }

    const frameQualityRaw = firstMeasuredNumber(
        openCVAnalysis.frameQualityScore,
        openCVAnalysis.frameQuality,
        feedback.frameQuality,
        visualAnalysis.frameQualityScore
    );
    const frameQualityScore = cvFrames > 0
        ? clamp(frameQualityRaw ?? 0)
        : (frameQualityRaw !== null && frameQualityRaw > 0 ? clamp(frameQualityRaw) : null);

    const averageBrightnessRaw = firstMeasuredNumber(
        openCVAnalysis.averageBrightness,
        openCVAnalysis.brightness,
        feedback.averageBrightness,
        feedback.brightness,
        visualAnalysis.averageBrightness
    );
    const averageBrightness = cvFrames > 0 ? averageBrightnessRaw : null;

    const averageSharpnessRaw = firstMeasuredNumber(
        openCVAnalysis.averageSharpness,
        openCVAnalysis.sharpness,
        feedback.averageSharpness,
        feedback.sharpness,
        visualAnalysis.averageSharpness
    );
    const averageSharpness = cvFrames > 0 ? averageSharpnessRaw : null;

    const frameQualityStatus = safeText(
        openCVAnalysis.frameQualityStatus ||
        openCVAnalysis.status ||
        feedback.frameQualityStatus,
        cvFrames > 0 ? "Analyzed" : "Not analyzed"
    );

    const wordsPerMinute = Math.max(
        Number(voiceAnalysis.wordsPerMinute) || 0,
        Number(feedback.wordsPerMinute) || 0
    );

    const paceStatus =
        safeText(
            feedback.paceStatus ||
            voiceAnalysis.paceStatus ||
            voiceAnalysis.status,
            "Not available"
        );

    const fillerWordCount =
        firstNumber(
            voiceAnalysis.fillerWordCount,
            voiceAnalysis.fillerWords,
            feedback.fillerWordCount,
            feedback.fillerWords
        );

    const fillerRate =
        firstNumber(
            voiceAnalysis.fillerRate,
            voiceAnalysis.fillerWordPercentage,
            feedback.fillerRate,
            feedback.fillerWordPercentage
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

    if (voiceClarity !== null) {
        setScore("voiceClarityScore", voiceClarity);
    } else {
        setText("voiceClarityScore", "Not evaluated");
    }

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
    setText("eyeContactScore", eyeContact === null ? "Not evaluated" : `${eyeContact}%`);
    setText("bodyLanguageScore", bodyLanguage === null ? "Not evaluated" : `${bodyLanguage}%`);
    setText("voiceClarityScore", voiceClarity === null ? "Not evaluated" : `${voiceClarity}%`);
    setBar("eyeContactBar", eyeContact ?? 0);
    setBar("bodyLanguageBar", bodyLanguage ?? 0);

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

        if (evaluations.length === 0) {
            const empty = document.createElement("p");
            empty.textContent = "No question-level analysis was saved for this report. Complete a new interview to generate per-question feedback.";
            questionContainer.appendChild(empty);
        }

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
            eyeContact === null ? "Not evaluated" : `${eyeContact}%`,
            eyeContactStatus
        );

        addVisualCard(
            cards,
            "Blink Count",
            blinkCount === null ? "Not evaluated" : `${blinkCount}`,
            blinkRate === null ? "Blink rate not evaluated" : `${blinkRate} blinks/min`
        );

        addVisualCard(
            cards,
            "Head Posture",
            headPosture === null ? "Not evaluated" : `${headPosture}%`,
            safeText(visualAnalysis.headPostureStatus || feedback.headPostureStatus || feedback.headPosture, "Not evaluated")
        );

        addVisualCard(
            cards,
            "Body Language",
            bodyLanguage === null ? "Not evaluated" : `${bodyLanguage}%`,
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
            visualConfidence === null ? "Not evaluated" : `${visualConfidence}%`,
            "Based on detected face and pose frames"
        );

        addVisualCard(
            cards,
            "Frame Quality",
            frameQualityScore === null ? "Not evaluated" : `${frameQualityScore}%`,
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
            cvFrames > 0
                ? `OpenCV analyzed ${cvFrames} frames. Average brightness: ${averageBrightness ?? "N/A"}. Average sharpness: ${averageSharpness ?? "N/A"}. Frame quality: ${frameQualityStatus}.`
                : "OpenCV did not successfully analyze any frames during this interview. Check the browser console and camera/OpenCV initialization before the next attempt.";
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
                    evaluationSource: feedback.evaluationSource || "Gemini",
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

    const sourceLabel = feedback.evaluationSource || feedback.evaluation?.evaluationSource;
    const subtitle = document.getElementById("feedbackSubtitle");
    if (subtitle && sourceLabel && String(sourceLabel).toLowerCase().includes("fallback")) {
        subtitle.textContent = "Basic local evaluation shown because Gemini was unavailable. Connect a valid Gemini API key and retry for AI-generated evaluation.";
    } else if (subtitle) {
        subtitle.textContent = "Your interview report combines answer evaluation with the voice and video metrics that were successfully measured.";
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