// =====================================================
// IMPORTS
// =====================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");

const { connectDB, getDB } = require("./db");

const {
    generateInterviewQuestion,
    evaluateInterview
} = require("./gemini");


// =====================================================
// CREATE EXPRESS APP
// =====================================================

const app = express();

const PORT = 5050;


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());

app.use(express.json({ limit: "10mb" }));

// -----------------------------------------------------
// Resilient local fallbacks for free-tier quota/network
// failures. The UI remains usable, and the report labels
// fallback evaluations transparently instead of pretending
// that Gemini produced them.
// -----------------------------------------------------
function fallbackQuestion(type, difficulty, previousQuestions = []) {
    const hr = {
        Beginner: [
            "Tell me about yourself and your current goals.",
            "Why are you interested in this role?",
            "What are your main strengths, and how have you used one?",
            "Describe a time you worked successfully with a team.",
            "How do you organise your time when you have several tasks?",
            "Tell me about a challenge you faced and how you handled it.",
            "What is one skill you are currently trying to improve?",
            "How do you respond to constructive feedback?",
            "What motivates you to do your best work?",
            "Where would you like to grow professionally over the next few years?"
        ],
        Intermediate: [
            "Describe a disagreement in a team and how you helped resolve it.",
            "Tell me about a time you took ownership without being asked.",
            "How do you prioritise when two important deadlines conflict?",
            "Describe a failure or setback and what you changed afterwards.",
            "Give an example of explaining a complex idea to someone unfamiliar with it.",
            "How would you handle unclear expectations from a manager?",
            "Tell me about a decision you made with incomplete information.",
            "Describe a time you helped a teammate who was struggling.",
            "How do you measure whether your work has been successful?",
            "What would you do if you disagreed with a decision made by your team lead?"
        ],
        Advanced: [
            "Describe a high-stakes decision where stakeholder priorities conflicted. How did you decide?",
            "Tell me about a time you changed a team's direction despite initial resistance.",
            "How would you rebuild trust after a project you led missed a critical commitment?",
            "Describe a situation where your values conflicted with a team objective.",
            "How do you balance short-term delivery pressure against long-term quality?",
            "Tell me about a time you used data to challenge a widely held assumption.",
            "How would you address repeated underperformance from a capable teammate?",
            "Describe how you handled ambiguity when no option was clearly correct.",
            "How would you communicate a major risk to senior stakeholders?",
            "What evidence would convince you to change a strongly held professional opinion?"
        ]
    };
    const technical = {
        Beginner: [
            "Explain the difference between an array and a linked list.",
            "What is object-oriented programming? Give a simple example.",
            "Explain the difference between a stack and a queue.",
            "What is the purpose of a database primary key?",
            "What is the difference between GET and POST in an HTTP API?",
            "Explain the basic idea of time complexity using an example.",
            "What is the difference between a process and a thread?",
            "What is a hash map, and when would you use one?",
            "Explain what Git is used for in software development.",
            "What happens when a user enters a URL in a browser?"
        ],
        Intermediate: [
            "How would you detect a cycle in a linked list, and what is the complexity?",
            "How would you design pagination for an API backed by a database?",
            "Explain how a hash table handles collisions and its complexity trade-offs.",
            "How would you debug an API endpoint that is intermittently slow?",
            "Compare SQL joins and explain when an index may help a query.",
            "How would you implement an LRU cache?",
            "Explain race conditions and one way to prevent them.",
            "How would you validate and safely handle user input in a web application?",
            "Compare breadth-first search and depth-first search with use cases.",
            "How would you design error handling for a service calling an external API?"
        ],
        Advanced: [
            "Design a rate limiter for a distributed API and explain its consistency trade-offs.",
            "How would you investigate and mitigate a production memory leak?",
            "Design a scalable notification system that supports retries and deduplication.",
            "Explain how you would maintain data consistency across services without a distributed transaction.",
            "How would you diagnose a database query that becomes slow as data grows?",
            "Design a resilient service that depends on an unreliable third-party API.",
            "Compare optimistic and pessimistic concurrency control for a high-write workload.",
            "How would you partition a large dataset and handle a hot partition?",
            "Design an authentication flow for a web application and discuss common security risks.",
            "How would you test a concurrent system where failures are difficult to reproduce?"
        ]
    };
    const typeKey = String(type || "HR").toLowerCase().includes("technical") ? "technical" : "hr";
    const level = ["Beginner", "Intermediate", "Advanced"].includes(difficulty) ? difficulty : "Beginner";
    const candidates = (typeKey === "technical" ? technical : hr)[level];
    const previous = new Set((Array.isArray(previousQuestions) ? previousQuestions : []).map(q => String(q).trim().toLowerCase()));
    return candidates.find(q => !previous.has(q.toLowerCase())) ||
        `For a ${level.toLowerCase()} ${typeKey} interview, explain a new example or scenario relevant to ${typeKey === "technical" ? "software engineering and problem solving" : "teamwork and professional judgement"}.`;
}

function localFallbackEvaluation(questions = [], answers = [], type = "HR", difficulty = "Beginner") {
    const qs = Array.isArray(questions) ? questions : [];
    const as = Array.isArray(answers) ? answers : [];
    const questionEvaluations = qs.map((question, index) => {
        const answer = String(as[index] || "").trim();
        const words = answer.match(/\b[\w'-]+\b/g) || [];
        const score = answer.length === 0 ? 0 : Math.max(1, Math.min(10,
            Math.round(Math.min(1, words.length / 55) * 6 + (words.length >= 12 ? 2 : 0) + (/[.!?]/.test(answer) ? 1 : 0) + (words.length >= 25 ? 1 : 0))
        ));
        return {
            question: String(question || ""),
            answer,
            score,
            strengths: answer ? (words.length >= 20 ? ["Provided a substantive response."] : ["Attempted the question."]) : [],
            weaknesses: answer ? (words.length < 12 ? ["Answer is brief; add detail and an example."] : []) : ["No answer was provided."],
            suggestion: answer ? "Use a clear structure, explain your reasoning, and include a specific example where relevant." : "Provide an answer before ending the interview."
        };
    });
    const avg = questionEvaluations.length ? questionEvaluations.reduce((sum, q) => sum + q.score * 10, 0) / questionEvaluations.length : 0;
    const answered = questionEvaluations.filter(q => q.answer).length;
    const communicationScore = answered ? Math.min(100, Math.round(questionEvaluations.filter(q => q.answer.split(/\s+/).length >= 12).length / answered * 100)) : 0;
    const technicalScore = String(type).toLowerCase().includes("technical") ? Math.round(avg) : Math.round(avg * 0.8);
    const confidenceScore = answered ? Math.min(100, Math.round(avg * 0.85)) : 0;
    const overallScore = answered ? Math.round(avg * 0.4 + communicationScore * 0.2 + technicalScore * 0.2 + confidenceScore * 0.2) : 0;
    const strengths = answered ? ["Responses were submitted for " + answered + " question(s)."] : [];
    const improvements = answered ? ["Add specific examples and explain the reasoning behind each answer.", "Keep answers structured and directly relevant to the question."] : ["Answer the interview questions to receive a meaningful assessment."];
    return {
        overallScore, communicationScore, technicalScore, confidenceScore,
        questionEvaluations, strengths, improvements,
        finalFeedback: answered
            ? `Local fallback evaluation was used because Gemini was unavailable. ${answered} of ${qs.length} questions received answers. Treat these scores as a basic practice estimate, not an AI semantic evaluation.`
            : "No answers were submitted. Complete the interview and provide answers to receive a meaningful evaluation.",
        evaluationSource: "Local fallback (Gemini unavailable)",
        type, difficulty
    };
}



// =====================================================
// TEST ROUTE
// =====================================================

app.get("/api/health", (req, res) => {
    try {
        getDB();
        res.json({
            success: true,
            backend: "ready",
            database: "connected",
            geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY")
        });
    } catch (error) {
        res.status(503).json({ success: false, backend: "ready", database: "disconnected", message: error.message });
    }
});

app.get("/api/test", (req, res) => {

    res.json({
        success: true,
        message: "InterviewAI backend is working!"
    });

});


// =====================================================
// SIGNUP
// =====================================================

app.post("/api/signup", async (req, res) => {

    try {

        const db = getDB();

        const {
            name,
            email,
            password
        } = req.body || {};

        const cleanName = String(name || "").trim();
        const cleanEmail = String(email || "").trim().toLowerCase();

        if (!cleanName || !cleanEmail || !password) {

            return res.status(400).json({
                success: false,
                message: "Please fill all fields."
            });

        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return res.status(400).json({ success: false, message: "Enter a valid email address." });
        }
        if (String(password).length < 8) {
            return res.status(400).json({ success: false, message: "Password must contain at least 8 characters." });
        }

        const existingUser =
            await db.collection("users").findOne({
                email: cleanEmail
            });

        if (existingUser) {

            return res.status(400).json({
                success: false,
                message: "User already exists."
            });

        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const newUser = {

            name: cleanName,

            email: cleanEmail,

            password: hashedPassword,

            createdAt: new Date()

        };

        const result =
            await db.collection("users").insertOne(newUser);

        res.json({

            success: true,

            message: "Signup successful.",

            userId: result.insertedId.toString()

        });

    } catch (error) {

        console.error(
            "❌ SIGNUP ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Signup failed."

        });

    }

});


// =====================================================
// LOGIN
// =====================================================

app.post("/api/login", async (req, res) => {

    try {

        const db = getDB();

        const { email, password } = req.body || {};
        const cleanEmail = String(email || "").trim().toLowerCase();

        if (!cleanEmail || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }

        const user =
            await db.collection("users").findOne({
                email: cleanEmail
            });

        if (!user) {

            return res.status(401).json({

                success: false,

                message: "Invalid email or password."

            });

        }

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatch) {

            return res.status(401).json({

                success: false,

                message: "Invalid email or password."

            });

        }

        res.json({

            success: true,

            message: "Login successful.",

            user: {

                id: user._id.toString(),

                name: user.name,

                email: user.email

            }

        });

    } catch (error) {

        console.error(
            "❌ LOGIN ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Login failed."

        });

    }

});


// =====================================================
// GET PROFILE
// =====================================================

app.get("/api/profile/:id", async (req, res) => {

    try {

        const db = getDB();

        const userId =
            new ObjectId(req.params.id);

        const user =
            await db.collection("users").findOne(

                {
                    _id: userId
                },

                {
                    projection: {
                        password: 0
                    }
                }

            );

        if (!user) {

            return res.status(404).json({

                success: false,

                message: "User not found."

            });

        }

        res.json({

            success: true,

            user: {

                id: user._id.toString(),

                name: user.name,

                email: user.email,

                college: user.college || "",

                degree: user.degree || "",

                year: user.year || "",

                location: user.location || ""

            }

        });

    } catch (error) {

        console.error(
            "❌ GET PROFILE ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Could not load profile."

        });

    }

});


// =====================================================
// UPDATE PROFILE
// =====================================================

app.put("/api/profile/:id", async (req, res) => {

    try {

        const db = getDB();

        const userId =
            new ObjectId(req.params.id);

        const {
            name,
            college,
            degree,
            year,
            location
        } = req.body;

        await db.collection("users").updateOne(

            {
                _id: userId
            },

            {
                $set: {

                    name: name,

                    college: college,

                    degree: degree,

                    year: year,

                    location: location,

                    updatedAt: new Date()

                }

            }

        );

        res.json({

            success: true,

            message: "Profile updated successfully."

        });

    } catch (error) {

        console.error(
            "❌ UPDATE PROFILE ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Could not update profile."

        });

    }

});


// =====================================================
// SAVE / UPDATE RESUME
// =====================================================

app.put("/api/resume/:id", async (req, res) => {

    try {

        const db = getDB();

        const userId =
            req.params.id;

        const resumeData = {

            ...req.body,

            userId: userId,

            updatedAt: new Date()

        };

        const existingResume =
            await db.collection("resumes").findOne({

                userId: userId

            });

        if (existingResume) {

            await db.collection("resumes").updateOne(

                {
                    userId: userId
                },

                {
                    $set: resumeData
                }

            );

        } else {

            resumeData.createdAt =
                new Date();

            await db.collection("resumes").insertOne(
                resumeData
            );

        }

        res.json({

            success: true,

            message: "Resume saved successfully."

        });

    } catch (error) {

        console.error(
            "❌ RESUME SAVE ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Could not save resume."

        });

    }

});


// =====================================================
// GET RESUME
// =====================================================

app.get("/api/resume/:id", async (req, res) => {

    try {

        const db = getDB();

        const resume =
            await db.collection("resumes").findOne({

                userId: req.params.id

            });

        res.json({

            success: true,

            resume: resume

        });

    } catch (error) {

        console.error(
            "❌ GET RESUME ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Could not load resume."

        });

    }

});


// =====================================================
// CREATE INTERVIEW
// =====================================================

app.post("/api/interviews", async (req, res) => {

    try {

        const db = getDB();

        const {
            userId,
            type,
            difficulty
        } = req.body;

        if (!userId) {

            return res.status(400).json({

                success: false,

                message: "User ID is required."

            });

        }

        const interview = {

            userId: userId,

            type: type || "HR",

            difficulty:
                difficulty || "Beginner",

            status: "In Progress",

            questions: [],

            answers: [],

            visualAnalysis: null,

            voiceAnalysis: null,

            opencvAnalysis: null,

            startedAt: new Date(),

            completedAt: null

        };

        const result =
            await db.collection("interviews")
            .insertOne(interview);

        res.json({

            success: true,

            message: "Interview created successfully.",

            interviewId:
                result.insertedId.toString()

        });

    } catch (error) {

        console.error(
            "❌ CREATE INTERVIEW ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Could not create interview."

        });

    }

});


// =====================================================
// COMPLETE INTERVIEW
// =====================================================
// Saves:
// Questions
// Answers
// MediaPipe visual analysis
// Voice analysis
// OpenCV analysis
// =====================================================

app.put("/api/interviews/:id", async (req, res) => {

    try {

        const db = getDB();

        const interviewId =
            new ObjectId(req.params.id);

        const {
            questions,
            answers,
            visualAnalysis,
            voiceAnalysis,
            openCVAnalysis,
            opencvAnalysis
        } = req.body;


        // -------------------------------------------------
        // SUPPORT BOTH OpenCV FIELD NAMES
        // -------------------------------------------------

        const finalOpenCVAnalysis =
            openCVAnalysis ||
            opencvAnalysis ||
            null;


        await db.collection("interviews").updateOne(

            {
                _id: interviewId
            },

            {
                $set: {

                    questions:
                        questions || [],

                    answers:
                        answers || [],

                    visualAnalysis:
                        visualAnalysis || null,

                    voiceAnalysis:
                        voiceAnalysis || null,

                    opencvAnalysis:
                        finalOpenCVAnalysis,

                    // Backward-compatible version
                    openCVAnalysis:
                        finalOpenCVAnalysis,

                    status:
                        "Completed",

                    completedAt:
                        new Date()

                }

            }

        );


        console.log(
            "✅ Interview completed and analysis saved:",
            interviewId.toString()
        );


        res.json({

            success: true,

            message:
                "Interview completed successfully."

        });

    } catch (error) {

        console.error(
            "❌ COMPLETE INTERVIEW ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Could not complete interview."

        });

    }

});


// =====================================================
// GET USER INTERVIEWS
// =====================================================

app.get(
    "/api/interviews/user/:userId",
    async (req, res) => {

        try {

            const db = getDB();

            const interviews =
                await db
                .collection("interviews")
                .find({

                    userId:
                        req.params.userId

                })
                .sort({

                    startedAt: -1

                })
                .toArray();


            const formattedInterviews =
                interviews.map(
                    function (interview) {

                        const cvData =
                            interview.opencvAnalysis ||
                            interview.openCVAnalysis ||
                            null;


                        return {

                            id:
                                interview._id.toString(),

                            userId:
                                interview.userId,

                            type:
                                interview.type,

                            difficulty:
                                interview.difficulty,

                            status:
                                interview.status,

                            questions:
                                interview.questions || [],

                            answers:
                                interview.answers || [],

                            visualAnalysis:
                                interview.visualAnalysis || null,

                            voiceAnalysis:
                                interview.voiceAnalysis || null,

                            // Consistent OpenCV name
                            opencvAnalysis:
                                cvData,

                            // Backward-compatible name
                            openCVAnalysis:
                                cvData,

                            startedAt:
                                interview.startedAt,

                            completedAt:
                                interview.completedAt

                        };

                    }
                );


            res.json({

                success: true,

                interviews:
                    formattedInterviews

            });

        } catch (error) {

            console.error(
                "❌ GET INTERVIEWS ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Could not load interviews."

            });

        }

    }
);


// =====================================================
// SAVE GENERIC FEEDBACK
// =====================================================

app.post("/api/feedback", async (req, res) => {

    try {

        const db = getDB();

        const feedback = {

            ...req.body,

            createdAt: new Date()

        };

        const result =
            await db
            .collection("feedback")
            .insertOne(feedback);

        console.log(
            "✅ Feedback saved:",
            result.insertedId
        );

        res.json({

            success: true,

            message:
                "Feedback saved successfully.",

            feedbackId:
                result.insertedId.toString()

        });

    } catch (error) {

        console.error(
            "❌ FEEDBACK SAVE ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Could not save feedback."

        });

    }

});


// =====================================================
// GET USER FEEDBACK
// =====================================================

app.get(
    "/api/feedback/user/:userId",
    async (req, res) => {

        try {

            const db = getDB();

            const feedback =
                await db
                .collection("feedback")
                .find({

                    userId:
                        req.params.userId

                })
                .sort({

                    createdAt: -1

                })
                .toArray();


            const formattedFeedback =
                feedback.map(
                    function (item) {


                        // =============================================
                        // OPEN CV DATA
                        // =============================================

                        const cvData =
                            item.opencvAnalysis ||
                            item.openCVAnalysis ||
                            null;


                        // =============================================
                        // VISUAL DATA
                        // =============================================

                        const visualData =
                            item.visualAnalysis ||
                            null;


                        return {

                            id:
                                item._id.toString(),

                            userId:
                                item.userId,

                            interviewId:
                                item.interviewId,

                            type:
                                item.type,

                            difficulty:
                                item.difficulty,


                            // =============================================
                            // GEMINI SCORES
                            // =============================================

                            overallScore:
                                Number(
                                    item.overallScore || 0
                                ),

                            communication:
                                Number(
                                    item.communication ??
                                    item.communicationScore ??
                                    0
                                ),

                            communicationScore:
                                Number(
                                    item.communicationScore ??
                                    item.communication ??
                                    0
                                ),

                            confidence:
                                Number(
                                    item.confidence ??
                                    item.confidenceScore ??
                                    0
                                ),

                            confidenceScore:
                                Number(
                                    item.confidenceScore ??
                                    item.confidence ??
                                    0
                                ),

                            technicalKnowledge:
                                Number(
                                    item.technicalKnowledge ??
                                    item.technicalScore ??
                                    0
                                ),

                            technicalScore:
                                Number(
                                    item.technicalScore ??
                                    item.technicalKnowledge ??
                                    0
                                ),


                            // =============================================
                            // VOICE ANALYSIS
                            // =============================================

                            voiceClarity:
                                Number(
                                    item.voiceClarity || 0
                                ),

                            speakingPace:
                                Number(
                                    item.speakingPace || 0
                                ),

                            wordsPerMinute:
                                Number(
                                    item.wordsPerMinute || 0
                                ),

                            fillerWords:
                                Number(
                                    item.fillerWords || 0
                                ),

                            fillerWordPercentage:
                                Number(
                                    item.fillerWordPercentage ?? item.fillerRate ?? 0
                                ),

                            fillerRate:
                                Number(
                                    item.fillerRate ?? item.fillerWordPercentage ?? 0
                                ),

                            paceStatus:
                                item.paceStatus || item.voiceAnalysis?.paceStatus || "Not available",

                            voiceAnalysis:
                                item.voiceAnalysis ||
                                null,


                            // =============================================
                            // MEDIAPIPE
                            // =============================================

                            eyeContact:
                                Number(
                                    item.eyeContactScore ??
                                    item.eyeContact ??
                                    visualData?.eyeContactScore ??
                                    0
                                ),

                            eyeContactScore:
                                Number(
                                    item.eyeContactScore ??
                                    item.eyeContact ??
                                    visualData?.eyeContactScore ??
                                    0
                                ),

                            eyeContactStatus:
                                item.eyeContactStatus ||
                                visualData?.eyeContactStatus ||
                                visualData?.gazeStatus ||
                                "Not evaluated",


                            blinkCount:
                                Number(
                                    item.blinkCount ??
                                    visualData?.blinkCount ??
                                    0
                                ),

                            blinkRate:
                                Number(
                                    item.blinkRate ??
                                    visualData?.blinkRate ??
                                    0
                                ),


                            headPosture:
                                item.headPosture ||
                                visualData?.headPosture ||
                                visualData?.headPostureStatus ||
                                "Not evaluated",

                            headPostureStatus:
                                item.headPostureStatus ||
                                visualData?.headPostureStatus ||
                                visualData?.headPosture ||
                                "Not evaluated",

                            headPostureScore:
                                Number(
                                    item.headPostureScore ??
                                    visualData?.headPostureScore ??
                                    0
                                ),


                            bodyLanguage:
                                Number(
                                    item.bodyLanguage ??
                                    item.bodyPostureScore ??
                                    visualData?.bodyLanguage ??
                                    visualData?.bodyPostureScore ??
                                    0
                                ),

                            bodyPosture:
                                item.bodyPosture ||
                                visualData?.bodyPosture ||
                                visualData?.bodyPostureStatus ||
                                "Not evaluated",

                            bodyPostureScore:
                                Number(
                                    item.bodyPostureScore ??
                                    visualData?.bodyPostureScore ??
                                    0
                                ),


                            facialExpression:
                                item.facialExpression ||
                                visualData?.facialExpression ||
                                "Not evaluated",

                            facialExpressionScore:
                                Number(
                                    item.facialExpressionScore ??
                                    visualData?.facialExpressionScore ??
                                    0
                                ),


                            visualConfidence:
                                Number(
                                    item.visualConfidence ??
                                    visualData?.visualConfidence ??
                                    0
                                ),

                            visualAnalysis:
                                visualData,


                            // =============================================
                            // OPENCV
                            // =============================================

                            opencvAnalysis:
                                cvData,

                            openCVAnalysis:
                                cvData,

                            frameQuality:
                                item.frameQuality ?? cvData?.frameQuality ?? cvData?.frameQualityScore ?? null,

                            openCVFrameQuality:
                                item.openCVFrameQuality ?? cvData?.frameQualityScore ?? cvData?.frameQuality ?? null,

                            brightness:
                                item.brightness ?? cvData?.averageBrightness ?? cvData?.brightness ?? null,

                            averageBrightness:
                                item.averageBrightness ?? cvData?.averageBrightness ?? cvData?.brightness ?? null,

                            sharpness:
                                item.sharpness ?? cvData?.averageSharpness ?? cvData?.sharpness ?? null,

                            averageSharpness:
                                item.averageSharpness ?? cvData?.averageSharpness ?? cvData?.sharpness ?? null,

                            framesAnalyzed:
                                item.framesAnalyzed ?? cvData?.framesAnalyzed ?? cvData?.openCVFrameCount ?? cvData?.analyzedFrames ?? 0,

                            frameQualityStatus:
                                item.frameQualityStatus ?? cvData?.frameQualityStatus ?? cvData?.status ?? "Not analyzed",


                            // =============================================
                            // GEMINI TEXT FEEDBACK
                            // =============================================

                            strengths:
                                item.strengths || [],

                            improvements:
                                item.improvements || [],

                            finalFeedback:
                                item.finalFeedback || "",

                            questionEvaluations:
                                item.questionEvaluations || [],

                            evaluationSource:
                                item.evaluationSource || "Gemini",

                            createdAt:
                                item.createdAt

                        };

                    }
                );


            res.json({

                success: true,

                feedback:
                    formattedFeedback

            });

        } catch (error) {

            console.error(
                "❌ GET FEEDBACK ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Could not load feedback."

            });

        }

    }
);


// =====================================================
// SAVE ATS SCORE
// =====================================================

app.post("/api/ats-score", async (req, res) => {

    try {

        const db = getDB();

        const atsData = {

            ...req.body,

            createdAt:
                new Date()

        };

        const result =
            await db
            .collection("atsScores")
            .insertOne(atsData);

        console.log(
            "✅ ATS score saved:",
            result.insertedId
        );

        res.json({

            success: true,

            message:
                "ATS score saved successfully.",

            atsScoreId:
                result.insertedId.toString()

        });

    } catch (error) {

        console.error(
            "❌ ATS SCORE SAVE ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Could not save ATS score."

        });

    }

});


// =====================================================
// GET LATEST ATS SCORE FOR USER
// =====================================================

app.get(
    "/api/ats-score/user/:userId",
    async (req, res) => {

        try {

            const db = getDB();

            const atsScore =
                await db.collection("atsScores").findOne(

                    {
                        userId:
                            req.params.userId
                    },

                    {
                        sort: {
                            createdAt: -1
                        }
                    }

                );

            res.json({

                success: true,

                atsScore:
                    atsScore

            });

        } catch (error) {

            console.error(
                "❌ GET ATS SCORE ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Could not load ATS score."

            });

        }

    }
);


// =====================================================
// GEMINI — GENERATE INTERVIEW QUESTION
// =====================================================

app.post("/api/generate-question", async (req, res) => {

    try {

        const {
            type,
            difficulty,
            previousQuestions
        } = req.body;

        if (!type || !difficulty) {

            return res.status(400).json({

                success: false,

                message:
                    "Interview type and difficulty are required."

            });

        }

        const question =
            await generateInterviewQuestion(

                type,

                difficulty,

                previousQuestions || []

            );

        res.json({
            success: true,
            question,
            type: String(type).toLowerCase().includes("technical") ? "Technical" : "HR",
            difficulty: ["Beginner", "Intermediate", "Advanced"].find(
                level => level.toLowerCase() === String(difficulty).toLowerCase()
            ) || "Beginner",
            source: "Gemini"
        });

    } catch (error) {
        console.error("❌ GEMINI QUESTION ERROR; using local fallback:", error.message);
        const question = fallbackQuestion(
            req.body?.type,
            req.body?.difficulty,
            req.body?.previousQuestions || []
        );
        res.json({
            success: true,
            question,
            type: String(req.body?.type || "").toLowerCase().includes("technical") ? "Technical" : "HR",
            difficulty: ["Beginner", "Intermediate", "Advanced"].find(
                level => level.toLowerCase() === String(req.body?.difficulty || "").toLowerCase()
            ) || "Beginner",
            source: "Local fallback (Gemini unavailable or question rejected)",
            warning: "Gemini question failed validation or was unavailable; a matching built-in question was used."
        });
    }

});


// =====================================================
// GEMINI — EVALUATE COMPLETE INTERVIEW
// =====================================================

app.post(
    "/api/evaluate-interview",
    async (req, res) => {

        try {

            const {
                questions,
                answers,
                type,
                difficulty
            } = req.body;

            if (!questions || !answers) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Questions and answers are required."

                });

            }

            console.log(
                "🤖 Starting interview evaluation..."
            );

            const evaluation =
                await evaluateInterview(

                    questions,

                    answers,

                    type,

                    difficulty

                );

            res.json({

                success: true,

                evaluation:
                    evaluation

            });

        } catch (error) {
            console.error("❌ GEMINI EVALUATION ERROR; using local fallback:", error.message);
            const evaluation = localFallbackEvaluation(
                req.body?.questions || [],
                req.body?.answers || [],
                req.body?.type || "HR",
                req.body?.difficulty || "Beginner"
            );
            res.json({
                success: true,
                evaluation,
                warning: "Gemini evaluation was unavailable. The report uses a basic local heuristic and is labelled accordingly."
            });
        }

    }
);


// =====================================================
// SAVE COMPLETE INTERVIEW EVALUATION
// =====================================================
// THIS IS THE MAIN ROUTE USED BY interview.js
// =====================================================

app.post(
    "/api/save-evaluation",
    async (req, res) => {

        try {

            const {

                userId,

                interviewId,

                type,

                difficulty,

                evaluation,

                visualAnalysis,

                voiceAnalysis,

                openCVAnalysis,

                opencvAnalysis

            } = req.body;


            // =================================================
            // BASIC VALIDATION
            // =================================================

            if (
                !userId ||
                !interviewId ||
                !evaluation
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "User ID, interview ID and evaluation are required."

                });

            }


            const db = getDB();


            // =================================================
            // NORMALIZE MEDIAPIPE DATA
            // =================================================

            const visual =
                visualAnalysis || {};


            const eyeContactScore =
                Number(
                    visual.eyeContactScore ??
                    visual.eyeContact ??
                    0
                );


            const blinkCount =
                Number(
                    visual.blinkCount ?? 0
                );


            const blinkRate =
                Number(
                    visual.blinkRate ?? 0
                );


            const headPostureScore =
                Number(
                    visual.headPostureScore ?? 0
                );


            const bodyPostureScore =
                Number(
                    visual.bodyPostureScore ??
                    visual.bodyLanguage ??
                    0
                );


            const facialExpressionScore =
                Number(
                    visual.facialExpressionScore ?? 0
                );


            const visualConfidence =
                Number(
                    visual.visualConfidence ?? 0
                );


            // =================================================
            // NORMALIZE VOICE DATA
            // =================================================

            const voice =
                voiceAnalysis || {};


            const voiceClarity =
                Number(
                    voice.voiceClarity ??
                    evaluation.voiceClarity ??
                    0
                );


            const speakingPace =
                Number(
                    voice.speakingPace ??
                    voice.pace ??
                    0
                );


            const wordsPerMinute =
                Number(
                    voice.wordsPerMinute ??
                    voice.wpm ??
                    0
                );


            const fillerWords =
                Number(
                    voice.fillerWords ??
                    voice.fillerWordCount ??
                    0
                );


            const fillerWordPercentage =
                Number(
                    voice.fillerWordPercentage ??
                    voice.fillerRate ??
                    0
                );


            // =================================================
            // NORMALIZE OPENCV DATA
            // =================================================

            const opencv =
                openCVAnalysis ||
                opencvAnalysis ||
                {};


            const frameQuality =
                Number(
                    opencv.frameQuality ??
                    opencv.frameQualityScore ??
                    0
                );


            const brightness =
                Number(
                    opencv.brightness ?? 0
                );


            const sharpness =
                Number(
                    opencv.sharpness ?? 0
                );


            const framesAnalyzed =
                Number(
                    opencv.framesAnalyzed ??
                    opencv.frameCount ??
                    0
                );


            // =================================================
            // GEMINI SCORES
            // =================================================

            const overallScore =
                Number(
                    evaluation.overallScore ?? 0
                );


            const communicationScore =
                Number(
                    evaluation.communicationScore ??
                    evaluation.communication ??
                    0
                );


            const technicalScore =
                Number(
                    evaluation.technicalScore ??
                    evaluation.technicalKnowledge ??
                    0
                );


            const confidenceScore =
                Number(
                    evaluation.confidenceScore ??
                    evaluation.confidence ??
                    0
                );


            // =================================================
            // FINAL FEEDBACK DOCUMENT
            // =================================================

            const feedbackDocument = {


                // =================================================
                // BASIC INFORMATION
                // =================================================

                userId:
                    userId,

                interviewId:
                    interviewId,

                type:
                    type || "HR",

                difficulty:
                    difficulty || "Beginner",


                // =================================================
                // GEMINI
                // =================================================

                overallScore:
                    overallScore,

                evaluationSource:
                    evaluation.evaluationSource || "Gemini",

                communicationScore:
                    communicationScore,

                technicalScore:
                    technicalScore,

                confidenceScore:
                    confidenceScore,


                // Backward-compatible names

                communication:
                    communicationScore,

                technicalKnowledge:
                    technicalScore,

                confidence:
                    confidenceScore,


                // =================================================
                // VOICE ANALYSIS
                // =================================================

                voiceClarity:
                    voiceClarity,

                speakingPace:
                    speakingPace,

                wordsPerMinute:
                    wordsPerMinute,

                fillerWords:
                    fillerWords,

                fillerWordPercentage:
                    fillerWordPercentage,

                fillerRate:
                    Number(voice.fillerRate ?? voice.fillerWordPercentage ?? fillerWordPercentage),

                paceStatus:
                    voice.paceStatus || voice.status || "Not available",

                voiceAnalysis:
                    voice,


                // =================================================
                // MEDIAPIPE — EYE CONTACT
                // =================================================

                eyeContact:
                    eyeContactScore,

                eyeContactScore:
                    eyeContactScore,

                eyeContactStatus:
                    visual.eyeContactStatus ||
                    visual.gazeStatus ||
                    "Not evaluated",


                // =================================================
                // MEDIAPIPE — BLINK
                // =================================================

                blinkCount:
                    blinkCount,

                blinkRate:
                    blinkRate,


                // =================================================
                // MEDIAPIPE — HEAD POSTURE
                // =================================================

                headPosture:
                    visual.headPosture ||
                    visual.headPostureStatus ||
                    "Not evaluated",

                headPostureStatus:
                    visual.headPostureStatus ||
                    visual.headPosture ||
                    "Not evaluated",

                headPostureScore:
                    headPostureScore,


                // =================================================
                // MEDIAPIPE — BODY POSTURE
                // =================================================

                bodyLanguage:
                    bodyPostureScore,

                bodyPosture:
                    visual.bodyPosture ||
                    visual.bodyPostureStatus ||
                    "Not evaluated",

                bodyPostureScore:
                    bodyPostureScore,


                // =================================================
                // MEDIAPIPE — FACIAL EXPRESSION
                // =================================================

                facialExpression:
                    visual.facialExpression ||
                    "Not evaluated",

                facialExpressionScore:
                    facialExpressionScore,


                // =================================================
                // MEDIAPIPE — VISUAL CONFIDENCE
                // =================================================

                visualConfidence:
                    visualConfidence,


                // Store complete MediaPipe object

                visualAnalysis:
                    visual,


                // =================================================
                // OPENCV
                // =================================================

                opencvAnalysis:
                    opencv,

                openCVAnalysis:
                    opencv,

                frameQuality:
                    frameQuality,

                brightness:
                    brightness,

                sharpness:
                    sharpness,

                framesAnalyzed:
                    framesAnalyzed,


                // =================================================
                // GEMINI QUESTION FEEDBACK
                // =================================================

                questionEvaluations:
                    evaluation.questionEvaluations || [],


                // =================================================
                // STRENGTHS
                // =================================================

                strengths:
                    evaluation.strengths || [],


                // =================================================
                // IMPROVEMENTS
                // =================================================

                improvements:
                    evaluation.improvements || [],


                // =================================================
                // FINAL FEEDBACK
                // =================================================

                finalFeedback:
                    evaluation.finalFeedback || "",


                // =================================================
                // TIMESTAMP
                // =================================================

                createdAt:
                    new Date()

            };


            // =================================================
            // SAVE TO MONGODB
            // =================================================

            const result =
                await db
                .collection("feedback")
                .insertOne(
                    feedbackDocument
                );


            console.log(
                "✅ COMPLETE EVALUATION SAVED TO MONGODB:",
                result.insertedId
            );


            // =================================================
            // RETURN RESULT
            // =================================================

            res.json({

                success: true,

                message:
                    "Complete interview evaluation saved successfully.",

                feedbackId:
                    result.insertedId.toString(),

                feedback:
                    feedbackDocument

            });

        } catch (error) {

            console.error(
                "❌ SAVE EVALUATION ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to save evaluation."

            });

        }

    }
);


// =====================================================
// 404 ROUTE
// =====================================================

app.use((req, res) => {

    res.status(404).json({

        success: false,

        message:
            "API route not found."

    });

});


// =====================================================
// START SERVER
// =====================================================

async function startServer() {

    try {

        await connectDB();

        app.listen(

            PORT,

            () => {

                console.log(
                    `🚀 Server running on http://localhost:${PORT}`
                );

            }

        );

    } catch (error) {

        console.error(
            "❌ Server could not start."
        );

        console.error(
            error.message
        );

    }

}


startServer();