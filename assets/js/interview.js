document.addEventListener("DOMContentLoaded", function () {

    // =====================================================
    // CAMERA ELEMENTS
    // =====================================================

    const cameraVideo =
        document.getElementById("cameraVideo");

    const cameraCanvas =
        document.getElementById("cameraCanvas");


    // =====================================================
    // USER + INTERVIEW DATA
    // =====================================================

    const currentUser =
        JSON.parse(localStorage.getItem("currentUser"));

    const interviewId =
        localStorage.getItem("currentInterviewId");

    const type =
        localStorage.getItem("interviewType") || "HR";

    const difficulty =
        localStorage.getItem("interviewDifficulty") || "Beginner";


    // =====================================================
    // HTML ELEMENTS
    // =====================================================

    const questionText =
        document.getElementById("questionText");

    const questionNumber =
        document.getElementById("questionNumber");

    const answerText =
        document.getElementById("answerText");

    const replayQuestionBtn =
        document.getElementById("replayQuestionBtn");


    // =====================================================
    // BASIC CHECKS
    // =====================================================

    if (!currentUser) {

        window.location.href = "login.html";
        return;

    }

    if (!interviewId) {

        console.error("❌ No interview ID found.");
        return;

    }

    if (!questionText) {

        console.error("❌ questionText element not found.");
        return;

    }

    if (!answerText) {

        console.error("❌ answerText element not found.");
        return;

    }


    // =====================================================
    // INTERVIEW DATA
    // =====================================================

    let questions = [];
    let answers = [];

    let currentQuestion = 1;

    const MAX_QUESTIONS = 10;

    let interviewStartTime = Date.now();
    const timerElement = document.getElementById("timer");
    const QUESTION_TIME_SECONDS = 5 * 60;
    let questionTimeRemaining = QUESTION_TIME_SECONDS;
    let questionTimerInterval = null;

    function stopQuestionTimer() {
        if (questionTimerInterval) {
            clearInterval(questionTimerInterval);
            questionTimerInterval = null;
        }
    }

    function startQuestionTimer() {
        stopQuestionTimer();
        questionTimeRemaining = QUESTION_TIME_SECONDS;
        const updateTimerText = function () {
            if (timerElement) {
                const minutes = Math.floor(questionTimeRemaining / 60);
                const seconds = questionTimeRemaining % 60;
                timerElement.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
            }
        };
        updateTimerText();
        questionTimerInterval = setInterval(function () {
            questionTimeRemaining -= 1;
            updateTimerText();
            if (questionTimeRemaining <= 0) {
                stopQuestionTimer();
                alert("Time for this question has ended. Your current answer will be saved.");
                if (currentQuestion >= MAX_QUESTIONS) {
                    const endButton = document.getElementById("endBtn");
                    if (endButton) endButton.click();
                } else {
                    const nextButton = document.getElementById("nextBtn");
                    if (nextButton) nextButton.click();
                }
            }
        }, 1000);
    }


    // =====================================================
    // CAMERA
    // =====================================================

    async function startCamera() {

        if (!cameraVideo) {

            console.error(
                "❌ Camera video element not found."
            );

            return;

        }


        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            console.error(
                "❌ Camera access is not supported."
            );

            alert(
                "Your browser does not support camera access."
            );

            return;

        }


        try {

            const stream =
                await navigator.mediaDevices.getUserMedia({

                    video: {

                        width: {
                            ideal: 1280
                        },

                        height: {
                            ideal: 720
                        }

                    },

                    audio: false

                });


            cameraVideo.srcObject = stream;

            await cameraVideo.play();


            console.log(
                "📷 Camera started successfully."
            );


            if (mediaPipeReady || poseReady) {

                startVisualDetection();

            }


        } catch (error) {

            console.error(
                "❌ Camera access error:",
                error
            );

            alert(
                "Camera access is required for the interview."
            );

        }

    }


    // =====================================================
    // MEDIAPIPE VARIABLES
    // =====================================================

    let faceMesh = null;

    let pose = null;

    let mediaPipeReady = false;

    let poseReady = false;

    let visualDetectionRunning = false;

    let processingFrame = false;

    let lastDetectionTime = 0;


    // =====================================================
    // MEDIAPIPE FACE VARIABLES
    // =====================================================

    let eyeContactFrames = 0;

    let totalEyeFrames = 0;

    let eyeContactScore = 0;

    let currentGazeStatus = "Not detected";


    // =====================================================
    // BLINK VARIABLES
    // =====================================================

    let blinkCount = 0;

    let eyeClosed = false;

    let blinkStartTime = 0;

    let closedEyeFrames = 0;


    // =====================================================
    // HEAD POSTURE
    // =====================================================

    let goodHeadPostureFrames = 0;

    let totalHeadPostureFrames = 0;

    let headPostureScore = 0;

    let currentHeadPosture = "Not detected";


    // =====================================================
    // BODY POSTURE
    // =====================================================

    let totalPoseFrames = 0;

    let goodBodyPostureFrames = 0;

    let bodyPostureScore = 0;

    let currentBodyPosture = "Not detected";


    // =====================================================
    // FACIAL EXPRESSION
    // =====================================================

    let expressionCounts = {

        neutral: 0,

        smiling: 0,

        speaking: 0

    };


    let currentExpression = "Neutral";


    // =====================================================
    // OPENCV VARIABLES
    // =====================================================

    let openCVReady = false;

    let openCVAnalyzedFrames = 0;

    let brightnessTotal = 0;

    let sharpnessTotal = 0;

    let frameQualityTotal = 0;

    let lastOpenCVTime = 0;


    // Off-screen canvas for OpenCV

    const cvCanvas =
        document.createElement("canvas");

    const cvContext =
        cvCanvas.getContext("2d");


    // =====================================================
    // LOAD MEDIAPIPE FACE MESH
    // =====================================================

    function loadMediaPipe() {

        return new Promise(function (resolve, reject) {

            console.log(
                "🤖 Loading MediaPipe Face Mesh..."
            );


            if (
                typeof FaceMesh !== "undefined"
            ) {

                console.log(
                    "✅ MediaPipe Face Mesh already loaded."
                );

                resolve();
                return;

            }


            const script =
                document.createElement("script");


            script.src =
                "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js";


            script.crossOrigin =
                "anonymous";


            script.onload =
                function () {

                    console.log(
                        "✅ MediaPipe Face Mesh library loaded."
                    );

                    resolve();

                };


            script.onerror =
                function (error) {

                    console.error(
                        "❌ Failed to load MediaPipe Face Mesh.",
                        error
                    );

                    reject(error);

                };


            document.head.appendChild(script);

        });

    }


    // =====================================================
    // LOAD MEDIAPIPE POSE
    // =====================================================

    function loadMediaPipePose() {

        return new Promise(function (resolve, reject) {

            console.log(
                "🤖 Loading MediaPipe Pose..."
            );


            if (
                typeof Pose !== "undefined"
            ) {

                console.log(
                    "✅ MediaPipe Pose already loaded."
                );

                resolve();
                return;

            }


            const script =
                document.createElement("script");


            script.src =
                "https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js";


            script.crossOrigin =
                "anonymous";


            script.onload =
                function () {

                    console.log(
                        "✅ MediaPipe Pose library loaded."
                    );

                    resolve();

                };


            script.onerror =
                function (error) {

                    console.error(
                        "❌ Failed to load MediaPipe Pose.",
                        error
                    );

                    reject(error);

                };


            document.head.appendChild(script);

        });

    }


    // =====================================================
    // LOAD OPENCV.JS
    // =====================================================

    function loadOpenCV() {
        return new Promise(function (resolve, reject) {
            console.log("🤖 Loading OpenCV.js...");

            function waitUntilReady(startTime) {
                if (typeof cv !== "undefined" && cv.Mat && cv.imread) {
                    openCVReady = true;
                    console.log("✅ OpenCV runtime initialized.");
                    resolve();
                    return;
                }
                if (Date.now() - startTime > 25000) {
                    reject(new Error("OpenCV runtime did not initialize within 25 seconds."));
                    return;
                }
                setTimeout(function () { waitUntilReady(startTime); }, 150);
            }

            if (typeof cv !== "undefined" && cv.Mat && cv.imread) {
                openCVReady = true;
                resolve();
                return;
            }

            const existing = document.querySelector('script[data-opencv-loader="true"]');
            if (existing) {
                waitUntilReady(Date.now());
                return;
            }

            const script = document.createElement("script");
            script.src = "https://docs.opencv.org/4.x/opencv.js";
            script.async = true;
            script.dataset.opencvLoader = "true";
            script.onload = function () {
                // OpenCV's wasm runtime may initialise after the script load event.
                waitUntilReady(Date.now());
            };
            script.onerror = function () {
                reject(new Error("Could not load OpenCV.js. Check internet access or CDN availability."));
            };
            document.head.appendChild(script);
        });
    }

    // =====================================================
    // SETUP FACE MESH
    // =====================================================

    async function setupFaceMesh() {

        try {

            await loadMediaPipe();


            faceMesh =
                new FaceMesh({

                    locateFile:
                        function (file) {

                            return (
                                "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/" +
                                file
                            );

                        }

                });


            faceMesh.setOptions({

                maxNumFaces: 1,

                refineLandmarks: true,

                minDetectionConfidence: 0.5,

                minTrackingConfidence: 0.5

            });


            faceMesh.onResults(
                onFaceResults
            );


            mediaPipeReady = true;


            console.log(
                "✅ MediaPipe Face Mesh initialized successfully!"
            );


            startVisualDetection();


        } catch (error) {

            console.error(
                "❌ MEDIAPIPE FACE ERROR:",
                error
            );

        }

    }


    // =====================================================
    // SETUP POSE
    // =====================================================

    async function setupPose() {

        try {

            await loadMediaPipePose();


            pose =
                new Pose({

                    locateFile:
                        function (file) {

                            return (
                                "https://cdn.jsdelivr.net/npm/@mediapipe/pose/" +
                                file
                            );

                        }

                });


            pose.setOptions({

                modelComplexity: 1,

                smoothLandmarks: true,

                enableSegmentation: false,

                minDetectionConfidence: 0.5,

                minTrackingConfidence: 0.5

            });


            pose.onResults(
                onPoseResults
            );


            poseReady = true;


            console.log(
                "✅ MediaPipe Pose initialized successfully!"
            );


            startVisualDetection();


        } catch (error) {

            console.error(
                "❌ MEDIAPIPE POSE ERROR:",
                error
            );

        }

    }


    // =====================================================
    // DISTANCE FUNCTION
    // =====================================================

    function distance(point1, point2) {

        const dx =
            point1.x - point2.x;

        const dy =
            point1.y - point2.y;

        return Math.sqrt(
            dx * dx + dy * dy
        );

    }


    // =====================================================
    // EYE CONTACT
    // =====================================================

    function analyzeEyeContact(landmarks) {

        if (
            !landmarks ||
            landmarks.length < 478
        ) {

            currentGazeStatus =
                "Eyes not detected";

            return;

        }


        const leftEyeOuter =
            landmarks[33];

        const leftEyeInner =
            landmarks[133];

        const leftEyeTop =
            landmarks[159];

        const leftEyeBottom =
            landmarks[145];

        const leftIris =
            landmarks[468];


        const rightEyeOuter =
            landmarks[362];

        const rightEyeInner =
            landmarks[263];

        const rightEyeTop =
            landmarks[386];

        const rightEyeBottom =
            landmarks[374];

        const rightIris =
            landmarks[473];


        const leftEyeWidth =
            Math.abs(
                leftEyeInner.x -
                leftEyeOuter.x
            );


        const leftEyeHeight =
            Math.abs(
                leftEyeBottom.y -
                leftEyeTop.y
            );


        const rightEyeWidth =
            Math.abs(
                rightEyeInner.x -
                rightEyeOuter.x
            );


        const rightEyeHeight =
            Math.abs(
                rightEyeBottom.y -
                rightEyeTop.y
            );


        if (
            leftEyeWidth === 0 ||
            rightEyeWidth === 0 ||
            leftEyeHeight === 0 ||
            rightEyeHeight === 0
        ) {

            return;

        }


        const leftIrisX =
            (
                leftIris.x -
                Math.min(
                    leftEyeOuter.x,
                    leftEyeInner.x
                )
            ) /
            leftEyeWidth;


        const leftIrisY =
            (
                leftIris.y -
                Math.min(
                    leftEyeTop.y,
                    leftEyeBottom.y
                )
            ) /
            leftEyeHeight;


        const rightIrisX =
            (
                rightIris.x -
                Math.min(
                    rightEyeOuter.x,
                    rightEyeInner.x
                )
            ) /
            rightEyeWidth;


        const rightIrisY =
            (
                rightIris.y -
                Math.min(
                    rightEyeTop.y,
                    rightEyeBottom.y
                )
            ) /
            rightEyeHeight;


        const averageX =
            (
                leftIrisX +
                rightIrisX
            ) / 2;


        const averageY =
            (
                leftIrisY +
                rightIrisY
            ) / 2;


        const lookingAtCamera =
            averageX > 0.30 &&
            averageX < 0.70 &&
            averageY > 0.20 &&
            averageY < 0.80;


        totalEyeFrames++;


        if (lookingAtCamera) {

            eyeContactFrames++;

            currentGazeStatus =
                "Looking at camera";

        } else {

            currentGazeStatus =
                "Looking away";

        }


        eyeContactScore =
            Math.round(
                (
                    eyeContactFrames /
                    totalEyeFrames
                ) * 100
            );

    }


    // =====================================================
    // BLINK DETECTION
    // =====================================================

    function analyzeBlink(landmarks) {

        if (!landmarks) {
            return;
        }


        const leftVertical =
            distance(
                landmarks[159],
                landmarks[145]
            );


        const leftHorizontal =
            distance(
                landmarks[33],
                landmarks[133]
            );


        const rightVertical =
            distance(
                landmarks[386],
                landmarks[374]
            );


        const rightHorizontal =
            distance(
                landmarks[362],
                landmarks[263]
            );


        if (
            leftHorizontal === 0 ||
            rightHorizontal === 0
        ) {

            return;

        }


        const leftEAR =
            leftVertical /
            leftHorizontal;


        const rightEAR =
            rightVertical /
            rightHorizontal;


        const averageEAR =
            (
                leftEAR +
                rightEAR
            ) / 2;


        const eyesClosed =
            averageEAR < 0.20;


        if (eyesClosed) {

            closedEyeFrames++;

        }


        // Require a few consecutive closed frames
        // to avoid false blink detection.

        if (
            eyesClosed &&
            !eyeClosed &&
            closedEyeFrames >= 2
        ) {

            eyeClosed = true;

            blinkStartTime =
                Date.now();

        }


        if (
            !eyesClosed &&
            eyeClosed
        ) {

            const blinkDuration =
                Date.now() -
                blinkStartTime;


            if (
                blinkDuration >= 50 &&
                blinkDuration <= 800
            ) {

                blinkCount++;

            }


            eyeClosed = false;

            closedEyeFrames = 0;

        }


        if (!eyesClosed) {

            closedEyeFrames = 0;

        }

    }


    // =====================================================
    // HEAD POSTURE
    // =====================================================

    function analyzeHeadPosture(landmarks) {

        if (!landmarks) {
            return;
        }


        const nose =
            landmarks[1];

        const leftFace =
            landmarks[234];

        const rightFace =
            landmarks[454];

        const forehead =
            landmarks[10];

        const chin =
            landmarks[152];


        const faceWidth =
            Math.abs(
                rightFace.x -
                leftFace.x
            );


        const faceHeight =
            Math.abs(
                chin.y -
                forehead.y
            );


        if (
            faceWidth === 0 ||
            faceHeight === 0
        ) {

            return;

        }


        const faceCenterX =
            (
                leftFace.x +
                rightFace.x
            ) / 2;


        const faceCenterY =
            (
                forehead.y +
                chin.y
            ) / 2;


        const horizontalDifference =
            (
                nose.x -
                faceCenterX
            ) /
            faceWidth;


        const verticalDifference =
            (
                nose.y -
                faceCenterY
            ) /
            faceHeight;


        const goodHorizontal =
            Math.abs(
                horizontalDifference
            ) < 0.12;


        const goodVertical =
            Math.abs(
                verticalDifference
            ) < 0.12;


        totalHeadPostureFrames++;


        if (
            goodHorizontal &&
            goodVertical
        ) {

            goodHeadPostureFrames++;

            currentHeadPosture =
                "Good posture";

        }

        else if (
            horizontalDifference < -0.12
        ) {

            currentHeadPosture =
                "Head turned right";

        }

        else if (
            horizontalDifference > 0.12
        ) {

            currentHeadPosture =
                "Head turned left";

        }

        else if (
            verticalDifference < -0.12
        ) {

            currentHeadPosture =
                "Looking up";

        }

        else {

            currentHeadPosture =
                "Looking down";

        }


        headPostureScore =
            Math.round(
                (
                    goodHeadPostureFrames /
                    totalHeadPostureFrames
                ) * 100
            );

    }


    // =====================================================
    // FACIAL EXPRESSION
    // =====================================================

    function analyzeExpression(landmarks) {

        if (!landmarks) {
            return;
        }


        const upperLip =
            landmarks[13];

        const lowerLip =
            landmarks[14];

        const mouthLeft =
            landmarks[61];

        const mouthRight =
            landmarks[291];

        const leftCheek =
            landmarks[234];

        const rightCheek =
            landmarks[454];


        const mouthOpening =
            distance(
                upperLip,
                lowerLip
            );


        const mouthWidth =
            distance(
                mouthLeft,
                mouthRight
            );


        const faceWidth =
            distance(
                leftCheek,
                rightCheek
            );


        if (
            faceWidth === 0 ||
            mouthWidth === 0
        ) {

            return;

        }


        const mouthOpenRatio =
            mouthOpening /
            mouthWidth;


        const smileWidthRatio =
            mouthWidth /
            faceWidth;


        if (
            mouthOpenRatio > 0.32
        ) {

            currentExpression =
                "Speaking";

            expressionCounts.speaking++;

        }

        else if (
            smileWidthRatio > 0.34
        ) {

            currentExpression =
                "Smiling";

            expressionCounts.smiling++;

        }

        else {

            currentExpression =
                "Neutral";

            expressionCounts.neutral++;

        }

    }


    // =====================================================
    // BODY POSTURE
    // =====================================================

    function analyzeBodyPosture(landmarks) {

        if (
            !landmarks ||
            landmarks.length < 33
        ) {

            currentBodyPosture =
                "Body not detected";

            return;

        }


        const leftShoulder =
            landmarks[11];

        const rightShoulder =
            landmarks[12];

        const leftHip =
            landmarks[23];

        const rightHip =
            landmarks[24];

        const nose =
            landmarks[0];


        if (
            leftShoulder.visibility < 0.5 ||
            rightShoulder.visibility < 0.5
        ) {

            currentBodyPosture =
                "Shoulders not clearly visible";

            return;

        }


        const shoulderDifference =
            Math.abs(
                leftShoulder.y -
                rightShoulder.y
            );


        let hipDifference = 0;


        if (
            leftHip.visibility >= 0.5 &&
            rightHip.visibility >= 0.5
        ) {

            hipDifference =
                Math.abs(
                    leftHip.y -
                    rightHip.y
                );

        }


        const shoulderCenterX =
            (
                leftShoulder.x +
                rightShoulder.x
            ) / 2;


        const noseDifference =
            Math.abs(
                nose.x -
                shoulderCenterX
            );


        const shouldersLevel =
            shoulderDifference < 0.08;


        const hipsLevel =
            hipDifference < 0.10;


        const headCentered =
            noseDifference < 0.12;


        totalPoseFrames++;


        if (
            shouldersLevel &&
            hipsLevel &&
            headCentered
        ) {

            goodBodyPostureFrames++;

            currentBodyPosture =
                "Good body posture";

        }

        else if (!shouldersLevel) {

            currentBodyPosture =
                "Shoulders uneven";

        }

        else if (!headCentered) {

            currentBodyPosture =
                "Body/head not centered";

        }

        else {

            currentBodyPosture =
                "Adjust posture";

        }


        bodyPostureScore =
            Math.round(
                (
                    goodBodyPostureFrames /
                    totalPoseFrames
                ) * 100
            );

    }


    // =====================================================
    // POSE RESULTS
    // =====================================================

    function onPoseResults(results) {

        if (
            !results ||
            !results.poseLandmarks
        ) {

            return;

        }


        analyzeBodyPosture(
            results.poseLandmarks
        );

    }


    // =====================================================
    // OPENCV ANALYSIS
    // =====================================================

    function analyzeOpenCV() {

        if (
            !openCVReady ||
            typeof cv === "undefined" ||
            !cameraVideo ||
            cameraVideo.videoWidth === 0
        ) {

            return;

        }


        const now =
            performance.now();


        // Process OpenCV approximately
        // 5-10 times per second.

        if (
            now -
            lastOpenCVTime <
            120
        ) {

            return;

        }


        lastOpenCVTime =
            now;


        try {

            const width =
                cameraVideo.videoWidth;

            const height =
                cameraVideo.videoHeight;


            if (
                cvCanvas.width !== width ||
                cvCanvas.height !== height
            ) {

                cvCanvas.width = width;
                cvCanvas.height = height;

            }


            cvContext.drawImage(
                cameraVideo,
                0,
                0,
                width,
                height
            );


            const src =
                cv.imread(cvCanvas);


            const gray =
                new cv.Mat();


            cv.cvtColor(
                src,
                gray,
                cv.COLOR_RGBA2GRAY
            );


            // ==========================================
            // BRIGHTNESS
            // ==========================================

            const meanValue =
                cv.mean(gray)[0];


            // ==========================================
            // SHARPNESS
            // ==========================================

            const laplacian =
                new cv.Mat();


            cv.Laplacian(
                gray,
                laplacian,
                cv.CV_64F
            );


            const mean =
                cv.mean(laplacian)[0];


            const meanMat =
                new cv.Mat(
                    laplacian.rows,
                    laplacian.cols,
                    cv.CV_64F
                );


            meanMat.setTo(
                new cv.Scalar(mean)
            );


            const difference =
                new cv.Mat();


            cv.subtract(
                laplacian,
                meanMat,
                difference
            );


            const squared =
                new cv.Mat();


            cv.multiply(
                difference,
                difference,
                squared
            );


            const variance =
                cv.mean(squared)[0];


            // ==========================================
            // FRAME QUALITY
            // ==========================================

            let brightnessScore = 100;


            if (
                meanValue < 50
            ) {

                brightnessScore =
                    Math.max(
                        0,
                        Math.round(
                            meanValue * 2
                        )
                    );

            }

            else if (
                meanValue > 210
            ) {

                brightnessScore =
                    Math.max(
                        0,
                        Math.round(
                            100 -
                            (
                                meanValue -
                                210
                            ) * 2
                        )
                    );

            }


            let sharpnessScore =
                Math.min(
                    100,
                    Math.round(
                        (
                            variance /
                            500
                        ) * 100
                    )
                );


            let frameQuality =
                Math.round(
                    (
                        brightnessScore +
                        sharpnessScore
                    ) / 2
                );


            brightnessTotal +=
                meanValue;


            sharpnessTotal +=
                variance;


            frameQualityTotal +=
                frameQuality;


            openCVAnalyzedFrames++;


            // Clean memory

            src.delete();

            gray.delete();

            laplacian.delete();

            meanMat.delete();

            difference.delete();

            squared.delete();


        } catch (error) {

            console.error(
                "❌ OpenCV frame analysis error:",
                error
            );

        }

    }


    // =====================================================
    // OPENCV SUMMARY
    // =====================================================

    function getOpenCVAnalysis() {

        if (
            openCVAnalyzedFrames === 0
        ) {

            return {

                analyzedFrames: 0,
                openCVFrameCount: 0,
                averageBrightness: null,
                averageSharpness: null,
                frameQuality: null,
                frameQualityScore: null,
                frameQualityStatus: "Not analyzed",
                status: "Not analyzed"

            };

        }


        const averageBrightness =
            Math.round(
                brightnessTotal /
                openCVAnalyzedFrames
            );


        const averageSharpness =
            Math.round(
                sharpnessTotal /
                openCVAnalyzedFrames
            );


        const frameQuality =
            Math.round(
                frameQualityTotal /
                openCVAnalyzedFrames
            );


        return {

            analyzedFrames:
                openCVAnalyzedFrames,

            openCVFrameCount:
                openCVAnalyzedFrames,

            framesAnalyzed:
                openCVAnalyzedFrames,

            averageBrightness:
                averageBrightness,

            brightness:
                averageBrightness,

            averageSharpness:
                averageSharpness,

            sharpness:
                averageSharpness,

            frameQuality:
                frameQuality,

            frameQualityScore:
                frameQuality,

            frameQualityStatus:
                frameQuality >= 75 ? "Good" : frameQuality >= 50 ? "Fair" : "Needs better lighting or focus",

            status:
                "Analyzed successfully"

        };

    }


    // =====================================================
    // START VISUAL DETECTION
    // =====================================================

    function startVisualDetection() {

        if (
            visualDetectionRunning
        ) {

            return;

        }


        if (
            !cameraVideo
        ) {

            return;

        }


        visualDetectionRunning =
            true;


        console.log(
            "🎥 Visual analysis loop started."
        );


        requestAnimationFrame(
            visualDetectionLoop
        );

    }


    // =====================================================
    // VISUAL DETECTION LOOP
    // =====================================================

    async function visualDetectionLoop() {

        if (
            !visualDetectionRunning
        ) {

            return;

        }


        if (
            !cameraVideo ||
            cameraVideo.readyState < 2
        ) {

            requestAnimationFrame(
                visualDetectionLoop
            );

            return;

        }


        const now =
            performance.now();


        if (
            now -
            lastDetectionTime >
            40 &&
            !processingFrame
        ) {

            lastDetectionTime =
                now;

            processingFrame =
                true;


            try {

                // ==========================================
                // MEDIAPIPE FACE
                // ==========================================

                if (
                    faceMesh &&
                    mediaPipeReady
                ) {

                    await faceMesh.send({

                        image:
                            cameraVideo

                    });

                }


                // ==========================================
                // MEDIAPIPE BODY
                // ==========================================

                if (
                    pose &&
                    poseReady
                ) {

                    await pose.send({

                        image:
                            cameraVideo

                    });

                }


                // ==========================================
                // OPENCV
                // ==========================================

                analyzeOpenCV();


            } catch (error) {

                console.error(
                    "❌ Visual processing error:",
                    error
                );

            }


            processingFrame =
                false;

        }


        requestAnimationFrame(
            visualDetectionLoop
        );

    }


    // =====================================================
    // FACE RESULTS
    // =====================================================

    function onFaceResults(results) {

        if (!cameraCanvas) {
            return;
        }


        const ctx =
            cameraCanvas.getContext("2d");


        if (
            cameraVideo.videoWidth > 0 &&
            cameraVideo.videoHeight > 0
        ) {

            if (
                cameraCanvas.width !==
                cameraVideo.videoWidth ||
                cameraCanvas.height !==
                cameraVideo.videoHeight
            ) {

                cameraCanvas.width =
                    cameraVideo.videoWidth;

                cameraCanvas.height =
                    cameraVideo.videoHeight;

            }

        }


        ctx.clearRect(
            0,
            0,
            cameraCanvas.width,
            cameraCanvas.height
        );


        if (
            !results.multiFaceLandmarks ||
            results.multiFaceLandmarks.length === 0
        ) {

            return;

        }


        const landmarks =
            results.multiFaceLandmarks[0];


        // ==========================================
        // RUN ALL FACE ANALYSIS
        // ==========================================

        analyzeEyeContact(
            landmarks
        );


        analyzeBlink(
            landmarks
        );


        analyzeHeadPosture(
            landmarks
        );


        analyzeExpression(
            landmarks
        );


        // ==========================================
        // DRAW FACE LANDMARKS
        // ==========================================

        for (
            let i = 0;
            i < landmarks.length;
            i++
        ) {

            const landmark =
                landmarks[i];


            const x =
                landmark.x *
                cameraCanvas.width;


            const y =
                landmark.y *
                cameraCanvas.height;


            ctx.beginPath();


            ctx.arc(
                x,
                y,
                2,
                0,
                2 * Math.PI
            );


            ctx.fillStyle =
                "#ff69b4";


            ctx.fill();

        }

    }


    // =====================================================
    // VISUAL ANALYSIS SUMMARY
    // =====================================================

    function getVisualAnalysis() {
        const durationSeconds = Math.max(1, Math.round((Date.now() - interviewStartTime) / 1000));
        const durationMinutes = durationSeconds / 60;
        const hasFaceData = totalEyeFrames > 0;
        const hasPoseData = totalPoseFrames > 0;
        const blinkRate = durationMinutes > 0 && hasFaceData
            ? Math.round(blinkCount / durationMinutes)
            : null;

        let blinkBehaviorScore = null;
        if (hasFaceData) {
            if (blinkRate >= 8 && blinkRate <= 30) blinkBehaviorScore = 100;
            else if (blinkRate >= 5 && blinkRate <= 35) blinkBehaviorScore = 85;
            else blinkBehaviorScore = 70;
        }

        const faceScores = [];
        if (hasFaceData) faceScores.push(eyeContactScore);
        if (hasFaceData) faceScores.push(headPostureScore);
        if (hasPoseData) faceScores.push(bodyPostureScore);
        if (blinkBehaviorScore !== null) faceScores.push(blinkBehaviorScore);
        const nonVerbalScore = faceScores.length
            ? Math.round(faceScores.reduce((sum, score) => sum + score, 0) / faceScores.length)
            : null;

        let dominantExpression = "Not evaluated";
        const expressionTotal = expressionCounts.smiling + expressionCounts.neutral + expressionCounts.speaking;
        if (expressionTotal > 0) {
            dominantExpression = "Neutral";
            if (expressionCounts.smiling > expressionCounts.neutral &&
                expressionCounts.smiling > expressionCounts.speaking) {
                dominantExpression = "Smiling";
            } else if (expressionCounts.speaking > expressionCounts.neutral) {
                dominantExpression = "Speaking";
            }
        }

        const confidenceParts = [];
        if (hasFaceData) {
            confidenceParts.push(eyeContactScore);
            confidenceParts.push(headPostureScore);
        }
        if (hasPoseData) confidenceParts.push(bodyPostureScore);
        if (blinkBehaviorScore !== null) confidenceParts.push(blinkBehaviorScore);
        const visualConfidence = confidenceParts.length
            ? Math.round(confidenceParts.reduce((sum, score) => sum + score, 0) / confidenceParts.length)
            : null;

        return {
            eyeContact: hasFaceData ? eyeContactScore : null,
            eyeContactScore: hasFaceData ? eyeContactScore : null,
            eyeContactStatus: hasFaceData ? currentGazeStatus : "Not evaluated — no face frames detected",
            blinkCount: hasFaceData ? blinkCount : null,
            blinkRate,
            blinkBehaviorScore,
            headPosture: hasFaceData ? currentHeadPosture : "Not evaluated",
            headPostureStatus: hasFaceData ? currentHeadPosture : "Not evaluated — no face frames detected",
            headPostureScore: hasFaceData ? headPostureScore : null,
            bodyLanguage: hasPoseData ? bodyPostureScore : null,
            bodyPosture: hasPoseData ? currentBodyPosture : "Not evaluated",
            bodyPostureStatus: hasPoseData ? currentBodyPosture : "Not evaluated — no pose frames detected",
            bodyPostureScore: hasPoseData ? bodyPostureScore : null,
            facialExpression: dominantExpression,
            facialExpressionScore: expressionTotal > 0
                ? Math.round(((expressionCounts.smiling + expressionCounts.neutral) / expressionTotal) * 100)
                : null,
            expressionCounts,
            visualConfidence,
            nonVerbalScore,
            analyzedFrames: totalEyeFrames,
            faceDetectedFrames: totalEyeFrames,
            poseFrames: totalPoseFrames,
            durationSeconds
        };
    }

    // =====================================================
    // VOICE ANALYSIS
    // =====================================================

    function analyzeVoice() {

        const completeText =
            answers
                .filter(function (answer) {
                    return answer;
                })
                .join(" ")
                .trim();


        if (!completeText) {

            return {

                wordsPerMinute: 0,

                speakingPace: 0,

                fillerWords: 0,

                fillerWordPercentage: 0,

                voiceClarity: 0,

                status: "No speech detected"

            };

        }


        const words =
            completeText
                .split(/\s+/)
                .filter(function (word) {
                    return word.length > 0;
                });


        const wordCount =
            words.length;


        const durationMinutes =
            Math.max(
                1 / 60,
                (
                    Date.now() -
                    interviewStartTime
                ) / 60000
            );


        const wordsPerMinute =
            Math.round(
                wordCount /
                durationMinutes
            );


        // ==========================================
        // FILLER WORDS
        // ==========================================

        const fillerList = [

            "um",

            "umm",

            "uh",

            "uhh",

            "like",

            "basically",

            "actually",

            "you know",

            "sort of",

            "kind of"

        ];


        let fillerWords = 0;


        fillerList.forEach(
            function (filler) {

                const regex =
                    new RegExp(
                        "\\b" +
                        filler.replace(
                            / /g,
                            "\\s+"
                        ) +
                        "\\b",
                        "gi"
                    );


                const matches =
                    completeText.match(
                        regex
                    );


                if (matches) {

                    fillerWords +=
                        matches.length;

                }

            }
        );


        const fillerWordPercentage =
            Math.round(
                (
                    fillerWords /
                    Math.max(
                        1,
                        wordCount
                    )
                ) * 100
            );


        // ==========================================
        // SPEAKING PACE SCORE
        // ==========================================

        let speakingPace = 100;


        if (
            wordsPerMinute < 90
        ) {

            speakingPace =
                75;

        }

        else if (
            wordsPerMinute > 180
        ) {

            speakingPace =
                70;

        }

        else if (
            wordsPerMinute >= 120 &&
            wordsPerMinute <= 160
        ) {

            speakingPace =
                100;

        }

        else {

            speakingPace =
                85;

        }


        // ==========================================
        // VOICE CLARITY SCORE
        // ==========================================

        let voiceClarity =
            100;


        voiceClarity -=
            fillerWordPercentage * 2;


        if (
            wordCount < 20
        ) {

            voiceClarity -= 10;

        }


        voiceClarity =
            Math.max(
                0,
                Math.min(
                    100,
                    Math.round(
                        voiceClarity
                    )
                )
            );


        return {

            wordsPerMinute:
                wordsPerMinute,

            wpm:
                wordsPerMinute,

            speakingPace:
                speakingPace,

            pace:
                speakingPace,

            fillerWords:
                fillerWords,

            fillerWordCount:
                fillerWords,

            fillerWordPercentage:
                fillerWordPercentage,

            voiceClarity:
                voiceClarity,

            status:
                "Analyzed from speech transcript"

        };

    }


    // =====================================================
    // TEXT TO SPEECH
    // =====================================================

    function speakQuestion(question) {

        if (
            !("speechSynthesis" in window)
        ) {

            console.error(
                "❌ Text-to-Speech is not supported."
            );

            return;

        }


        window.speechSynthesis.cancel();


        const speech =
            new SpeechSynthesisUtterance(
                question
            );


        speech.lang =
            "en-IN";


        speech.rate =
            0.9;


        speech.pitch =
            1;


        speech.volume =
            1;


        speech.onstart =
            function () {

                console.log(
                    "🔊 AI interviewer started speaking."
                );

            };


        speech.onend =
            function () {

                console.log(
                    "🔊 AI interviewer finished speaking."
                );

            };


        speech.onerror =
            function (error) {

                console.error(
                    "❌ TTS error:",
                    error
                );

            };


        window.speechSynthesis.speak(
            speech
        );

    }


    // =====================================================
    // REPLAY QUESTION
    // =====================================================

    if (replayQuestionBtn) {

        replayQuestionBtn.addEventListener(
            "click",
            function () {

                const currentQuestionText =
                    questions[
                        currentQuestion - 1
                    ];


                if (currentQuestionText) {

                    speakQuestion(
                        currentQuestionText
                    );

                }

            }
        );

    }


    // =====================================================
    // SPEECH TO TEXT
    // =====================================================

    let recognition = null;

    let recognitionRunning = false;


    const startRecordingBtn =
        Array.from(
            document.querySelectorAll("button")
        ).find(
            function (button) {

                return button.textContent
                    .trim()
                    .toLowerCase()
                    .includes(
                        "start recording"
                    );

            }
        );


    const stopRecordingBtn =
        Array.from(
            document.querySelectorAll("button")
        ).find(
            function (button) {

                return button.textContent
                    .trim()
                    .toLowerCase()
                    .includes(
                        "stop recording"
                    );

            }
        );


    const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {

        recognition =
            new SpeechRecognitionAPI();


        recognition.continuous =
            true;


        recognition.interimResults =
            true;


        recognition.lang =
            "en-IN";


        recognition.onstart =
            function () {

                recognitionRunning =
                    true;


                console.log(
                    "🎤 Speech recognition started."
                );

            };


        recognition.onresult =
            function (event) {

                let finalTranscript =
                    "";


                for (
                    let i =
                        event.resultIndex;

                    i <
                    event.results.length;

                    i++
                ) {

                    const transcript =
                        event.results[i][0]
                            .transcript;


                    if (
                        event.results[i]
                            .isFinal
                    ) {

                        finalTranscript +=
                            transcript +
                            " ";

                    }

                }


                if (
                    finalTranscript
                ) {

                    answerText.value +=
                        finalTranscript;


                    answers[
                        currentQuestion - 1
                    ] =
                        answerText.value;


                    console.log(
                        "📝 Answer:",
                        answerText.value
                    );

                }

            };


        recognition.onerror =
            function (event) {

                console.error(
                    "❌ Speech recognition error:",
                    event.error
                );

            };


        recognition.onend =
            function () {

                recognitionRunning =
                    false;


                console.log(
                    "🎤 Speech recognition ended."
                );

            };


        if (startRecordingBtn) {

            startRecordingBtn.addEventListener(
                "click",
                function () {

                    if (
                        recognitionRunning
                    ) {

                        console.log(
                            "🎤 STT already running."
                        );

                        return;

                    }


                    try {

                        recognition.start();

                    } catch (error) {

                        console.log(
                            "STT could not start:",
                            error
                        );

                    }

                }
            );

        }


        if (stopRecordingBtn) {

            stopRecordingBtn.addEventListener(
                "click",
                function () {

                    if (
                        recognition &&
                        recognitionRunning
                    ) {

                        recognition.stop();

                    }

                }
            );

        }

    }

    else {

        console.error(
            "❌ Speech Recognition is not supported."
        );

    }


    // =====================================================
    // GENERATE GEMINI QUESTION
    // =====================================================

    async function generateQuestion() {
        stopQuestionTimer();

        questionText.textContent =
            "Generating question...";


        try {

            console.log(
                "🤖 Generating Question",
                currentQuestion
            );


            const response =
                await fetch(
                    "http://localhost:5050/api/generate-question",
                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                type:
                                    type,

                                difficulty:
                                    difficulty,

                                previousQuestions:
                                    questions

                            })

                    }
                );


            const data =
                await response.json();


            console.log(
                "🤖 Gemini Response:",
                data
            );


            if (!data.success) {

                questionText.textContent =
                    "Unable to generate question.";

                return;

            }


            questionText.textContent =
                data.question;

            startQuestionTimer();

            questions[
                currentQuestion - 1
            ] =
                data.question;


            answers[
                currentQuestion - 1
            ] =
                "";


            answerText.value =
                "";


            if (questionNumber) {

                questionNumber.textContent =
                    `Question ${currentQuestion} of ${MAX_QUESTIONS}`;

            }


            speakQuestion(
                data.question
            );


            localStorage.setItem(
                "interviewQuestions",
                JSON.stringify(
                    questions
                )
            );


        } catch (error) {

            console.error(
                "❌ GEMINI QUESTION ERROR:",
                error
            );


            questionText.textContent =
                "Unable to connect to Gemini.";

        }

    }


    // =====================================================
    // NEXT + END BUTTONS
    // =====================================================

    const buttons =
        document.querySelectorAll(
            "button"
        );


    buttons.forEach(
        function (button) {

            const text =
                button.textContent
                    .trim()
                    .toLowerCase();


            // =================================================
            // NEXT QUESTION
            // =================================================

            if (
                text.includes(
                    "next question"
                )
            ) {

                button.addEventListener(
                    "click",
                    async function () {

                        answers[
                            currentQuestion - 1
                        ] =
                            answerText.value;


                        console.log(
                            "💾 Saved Answer:",
                            answers[
                                currentQuestion - 1
                            ]
                        );


                        if (
                            currentQuestion >=
                            MAX_QUESTIONS
                        ) {

                            alert(
                                "This is the last question. Please end the interview."
                            );

                            return;

                        }


                        currentQuestion++;


                        await generateQuestion();

                    }
                );

            }


            // =================================================
            // END INTERVIEW
            // =================================================

            if (
                text.includes(
                    "end interview"
                )
            ) {

                button.addEventListener(
                    "click",
                    async function () {
                        stopQuestionTimer();

                        // =========================================
                        // SAVE FINAL ANSWER
                        // =========================================

                        answers[
                            currentQuestion - 1
                        ] =
                            answerText.value;


                        console.log(
                            "📤 Ending interview..."
                        );


                        // =========================================
                        // STOP STT
                        // =========================================

                        if (
                            recognition &&
                            recognitionRunning
                        ) {

                            try {

                                recognition.stop();

                            } catch (error) {

                                console.log(
                                    "STT already stopped."
                                );

                            }

                        }


                        // =========================================
                        // FINAL VISUAL ANALYSIS
                        // =========================================

                        const visualAnalysis =
                            getVisualAnalysis();


                        // =========================================
                        // FINAL OPENCV ANALYSIS
                        // =========================================

                        const openCVAnalysis =
                            getOpenCVAnalysis();


                        // =========================================
                        // FINAL VOICE ANALYSIS
                        // =========================================

                        const voiceAnalysis =
                            analyzeVoice();


                        console.log(
                            "📊 FINAL VISUAL ANALYSIS:",
                            visualAnalysis
                        );


                        console.log(
                            "📊 FINAL OPENCV ANALYSIS:",
                            openCVAnalysis
                        );


                        console.log(
                            "🎤 FINAL VOICE ANALYSIS:",
                            voiceAnalysis
                        );


                        // =========================================
                        // SAVE LOCALLY
                        // =========================================

                        localStorage.setItem(
                            "visualAnalysis",
                            JSON.stringify(
                                visualAnalysis
                            )
                        );


                        localStorage.setItem(
                            "openCVAnalysis",
                            JSON.stringify(
                                openCVAnalysis
                            )
                        );


                        localStorage.setItem(
                            "voiceAnalysis",
                            JSON.stringify(
                                voiceAnalysis
                            )
                        );


                        // =========================================
                        // STOP VISUAL ANALYSIS
                        // =========================================

                        visualDetectionRunning =
                            false;


                        // =========================================
                        // STOP CAMERA
                        // =========================================

                        if (
                            cameraVideo &&
                            cameraVideo.srcObject
                        ) {

                            const tracks =
                                cameraVideo
                                    .srcObject
                                    .getTracks();


                            tracks.forEach(
                                function (track) {

                                    track.stop();

                                }
                            );

                        }


                        try {

                            // =========================================
                            // STEP 1
                            // SAVE COMPLETE INTERVIEW
                            // =========================================

                            console.log(
                                "💾 Saving interview + CV data..."
                            );


                            const saveResponse =
                                await fetch(
                                    `http://localhost:5050/api/interviews/${interviewId}`,
                                    {

                                        method:
                                            "PUT",

                                        headers: {

                                            "Content-Type":
                                                "application/json"

                                        },

                                        body:
                                            JSON.stringify({

                                                questions:
                                                    questions,

                                                answers:
                                                    answers,

                                                visualAnalysis:
                                                    visualAnalysis,

                                                openCVAnalysis:
                                                    openCVAnalysis,

                                                opencvAnalysis:
                                                    openCVAnalysis,

                                                voiceAnalysis:
                                                    voiceAnalysis

                                            })

                                    }
                                );


                            const saveData =
                                await saveResponse.json();


                            console.log(
                                "📥 Interview saved:",
                                saveData
                            );


                            if (
                                !saveData.success
                            ) {

                                alert(
                                    saveData.message ||
                                    "Could not save interview."
                                );

                                return;

                            }


                            // =========================================
                            // STEP 2
                            // GEMINI EVALUATION
                            // =========================================

                            console.log(
                                "🤖 Sending interview to Gemini..."
                            );


                            const evaluationResponse =
                                await fetch(
                                    "http://localhost:5050/api/evaluate-interview",
                                    {

                                        method:
                                            "POST",

                                        headers: {

                                            "Content-Type":
                                                "application/json"

                                        },

                                        body:
                                            JSON.stringify({

                                                questions:
                                                    questions,

                                                answers:
                                                    answers,

                                                type:
                                                    type,

                                                difficulty:
                                                    difficulty

                                            })

                                    }
                                );


                            const evaluationData =
                                await evaluationResponse.json();


                            console.log(
                                "🤖 Gemini Evaluation:",
                                evaluationData
                            );


                            if (
                                !evaluationData.success
                            ) {

                                alert(
                                    evaluationData.message ||
                                    "Could not evaluate interview."
                                );

                                return;

                            }


                            // =========================================
                            // STEP 3
                            // SAVE COMPLETE EVALUATION
                            // =========================================

                            console.log(
                                "💾 Saving complete evaluation..."
                            );


                            const saveEvaluationResponse =
                                await fetch(
                                    "http://localhost:5050/api/save-evaluation",
                                    {

                                        method:
                                            "POST",

                                        headers: {

                                            "Content-Type":
                                                "application/json"

                                        },

                                        body:
                                            JSON.stringify({

                                                userId:
                                                    currentUser.id,

                                                interviewId:
                                                    interviewId,

                                                type:
                                                    type,

                                                difficulty:
                                                    difficulty,

                                                evaluation:
                                                    evaluationData.evaluation,

                                                visualAnalysis:
                                                    visualAnalysis,

                                                voiceAnalysis:
                                                    voiceAnalysis,

                                                opencvAnalysis:
                                                    openCVAnalysis

                                            })

                                    }
                                );


                            const saveEvaluationData =
                                await saveEvaluationResponse.json();


                            console.log(
                                "💾 Complete evaluation save response:",
                                saveEvaluationData
                            );


                            if (
                                !saveEvaluationData.success
                            ) {

                                alert(
                                    saveEvaluationData.message ||
                                    "Could not save evaluation."
                                );

                                return;

                            }


                            // =========================================
                            // STEP 4
                            // SAVE GEMINI EVALUATION LOCALLY
                            // =========================================

                            localStorage.setItem(
                                "interviewEvaluation",
                                JSON.stringify(
                                    evaluationData.evaluation
                                )
                            );


                            // =========================================
                            // STEP 5
                            // SAVE COMPLETE FEEDBACK LOCALLY
                            // =========================================

                            const completeFeedback = {

                                evaluation:
                                    evaluationData.evaluation,

                                visualAnalysis:
                                    visualAnalysis,

                                voiceAnalysis:
                                    voiceAnalysis,

                                openCVAnalysis:
                                    openCVAnalysis

                            };


                            localStorage.setItem(
                                "completeInterviewFeedback",
                                JSON.stringify(
                                    completeFeedback
                                )
                            );


                            // =========================================
                            // STEP 6
                            // GO TO FEEDBACK
                            // =========================================

                            console.log(
                                "✅ Interview completed successfully."
                            );


                            window.location.href =
                                "feedback.html";


                        } catch (error) {

                            console.error(
                                "❌ END INTERVIEW ERROR:",
                                error
                            );


                            alert(
                                "Something went wrong while ending the interview."
                            );

                        }

                    }
                );

            }

        }
    );


    // =====================================================
    // START EVERYTHING
    // =====================================================

    console.log(
        "🚀 Starting InterviewAI interview system..."
    );


    startCamera();


    // MediaPipe Face Mesh

    setupFaceMesh();


    // MediaPipe Pose

    setupPose();


    // OpenCV

    loadOpenCV()
        .then(function () {
            if (cameraVideo && cameraVideo.readyState >= 2) {
                startVisualDetection();
            }
        })
        .catch(function (error) {
            console.error("❌ OpenCV initialization failed:", error);
        });


    // First Gemini question

    generateQuestion();


});