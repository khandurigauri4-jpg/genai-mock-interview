require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});


async function generateInterviewQuestion(
    type,
    difficulty,
    previousQuestions = []
) {

    const previousQuestionsText =
        previousQuestions.length > 0
            ? previousQuestions
                .map((q, index) => `${index + 1}. ${q}`)
                .join("\n")
            : "None";


    const prompt = `
You are an expert interviewer conducting a realistic mock interview.

Interview Type: ${type}
Difficulty Level: ${difficulty}

Generate ONE completely new interview question.

IMPORTANT RULES:
1. The question MUST be different from all previously asked questions.
2. Do NOT repeat or rephrase any previous question.
3. Ask about a different topic or aspect of the candidate.
4. Make the question realistic and suitable for a real interview.
5. Return ONLY the question.
6. Do not provide an answer.
7. Do not number the question.

Previously asked questions:
${previousQuestionsText}

Generate the next NEW interview question now.
`;


    // Try up to 3 times
    for (let attempt = 1; attempt <= 3; attempt++) {

        try {

            console.log(
                `🤖 Gemini attempt ${attempt}/3`
            );

            const response = await ai.models.generateContent({
                model: "gemini-3.6-flash",
                contents: prompt
            });

            return response.text.trim();

        } catch (error) {

            console.error(
                `❌ Gemini attempt ${attempt} failed:`,
                error.message
            );

            if (attempt === 3) {
                throw error;
            }

            const waitTime = attempt * 2000;

            console.log(
                `⏳ Retrying in ${waitTime / 1000} seconds...`
            );

            await new Promise(resolve =>
                setTimeout(resolve, waitTime)
            );
        }
    }
}


module.exports = {
    generateInterviewQuestion,
    evaluateInterview
};
// ===================================
// EVALUATE COMPLETE INTERVIEW
// ===================================

async function evaluateInterview(questions, answers, type, difficulty) {

    const interviewData = questions.map((question, index) => {

        return {
            question: question,
            answer: answers[index] || ""
        };

    });


    const prompt = `
You are an expert professional interviewer.

Evaluate the candidate's complete mock interview.

Interview Type: ${type}
Difficulty: ${difficulty}

Here are the interview questions and candidate answers:

${JSON.stringify(interviewData, null, 2)}

Evaluate the interview carefully.

For EACH question, provide:
1. score out of 10
2. strengths
3. weaknesses
4. improvement suggestion

Then provide an OVERALL evaluation.

The overall evaluation must contain:
- overallScore out of 100
- communicationScore out of 100
- technicalScore out of 100
- confidenceScore out of 100
- strengths: array of important strengths
- improvements: array of important areas for improvement
- finalFeedback: short professional summary

IMPORTANT:
- Evaluate only what the candidate actually answered.
- Do not invent information.
- Be realistic but constructive.
- Return ONLY valid JSON.
- Do not use markdown.
- Do not add explanations outside the JSON.

Use exactly this JSON structure:

{
    "overallScore": 0,
    "communicationScore": 0,
    "technicalScore": 0,
    "confidenceScore": 0,
    "questionEvaluations": [
        {
            "question": "",
            "answer": "",
            "score": 0,
            "strengths": [],
            "weaknesses": [],
            "suggestion": ""
        }
    ],
    "strengths": [],
    "improvements": [],
    "finalFeedback": ""
}
`;


    try {

        console.log("🤖 Evaluating complete interview...");

        const response = await ai.models.generateContent({

            model: "gemini-3.6-flash",

            contents: prompt

        });


        let result = response.text.trim();


        // Remove markdown code fences if Gemini adds them
        result = result
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();


        const evaluation = JSON.parse(result);


        console.log("✅ Interview evaluation generated.");

        return evaluation;


    } catch (error) {

        console.error(
            "❌ Interview evaluation error:",
            error.message
        );

        throw error;

    }

}