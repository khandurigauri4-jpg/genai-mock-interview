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


// =====================================================
// TEST ROUTE
// =====================================================

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
        } = req.body;

        if (!name || !email || !password) {

            return res.status(400).json({
                success: false,
                message: "Please fill all fields."
            });

        }

        const existingUser =
            await db.collection("users").findOne({
                email: email.toLowerCase()
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

            name: name,

            email: email.toLowerCase(),

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

        const {
            email,
            password
        } = req.body;

        const user =
            await db.collection("users").findOne({

                email: email.toLowerCase()

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
                                    item.fillerWordPercentage || 0
                                ),

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
                                Number(
                                    item.frameQuality ??
                                    cvData?.frameQuality ??
                                    cvData?.frameQualityScore ??
                                    0
                                ),

                            brightness:
                                Number(
                                    item.brightness ??
                                    cvData?.brightness ??
                                    0
                                ),

                            sharpness:
                                Number(
                                    item.sharpness ??
                                    cvData?.sharpness ??
                                    0
                                ),

                            framesAnalyzed:
                                Number(
                                    item.framesAnalyzed ??
                                    cvData?.framesAnalyzed ??
                                    0
                                ),


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

            question:
                question

        });

    } catch (error) {

        console.error(
            "❌ GEMINI QUESTION ERROR:",
            error.message
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to generate interview question."

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

            console.error(
                "❌ EVALUATION API ERROR:",
                error.message
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to evaluate interview."

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