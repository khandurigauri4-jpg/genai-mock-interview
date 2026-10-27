require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

function getAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
        throw new Error("GEMINI_API_KEY is missing. Add a free Google AI Studio API key to server/.env or the project-root .env file.");
    }
    return new GoogleGenAI({ apiKey });
}

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

function cleanJson(text) {
    let result = String(text || "").trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
    const first = result.indexOf("{");
    const last = result.lastIndexOf("}");
    if (first >= 0 && last > first) result = result.slice(first, last + 1);
    return JSON.parse(result);
}


function normalizeInterviewType(type) {
    return String(type || "HR").toLowerCase().includes("technical") ? "Technical" : "HR";
}

function normalizeDifficulty(difficulty) {
    const levels = ["Beginner", "Intermediate", "Advanced"];
    return levels.find(level => level.toLowerCase() === String(difficulty || "Beginner").toLowerCase()) || "Beginner";
}

function questionTokens(question) {
    const stop = new Set(["what","when","where","which","who","why","how","would","could","should","you","your","the","and","for","with","from","that","this","are","is","was","were","can","will","have","has","had","into","about","explain","describe","tell","me","give","example","use","using","does","did","their","them","they","then","than","between","under","over","each","some","any","one","two","time","case","system","question"]);
    return new Set((String(question).toLowerCase().match(/[a-z][a-z0-9+#.-]{1,}/g) || []).filter(t => !stop.has(t)));
}

function isNearDuplicate(question, previousQuestions) {
    const current = questionTokens(question);
    if (!current.size) return false;
    return previousQuestions.some(previous => {
        const oldText = String(previous || "").trim().toLowerCase();
        if (!oldText) return false;
        if (oldText === question.trim().toLowerCase()) return true;
        const old = questionTokens(oldText);
        const intersection = [...current].filter(token => old.has(token)).length;
        const union = new Set([...current, ...old]).size;
        // Catch close paraphrases without rejecting two questions that merely share a CS topic.
        return union > 0 && intersection / union >= 0.78;
    });
}

function hasTechnicalEvidence(question) {
    const q = question.toLowerCase();
    const patterns = [
        /\b(array|linked list|stack|queue|hash ?map|hash table|tree|binary search|graph|heap|trie|recursion|sorting|searching|dynamic programming|greedy|two pointer|sliding window|big[- ]?o|time complexity|space complexity|algorithm|data structure|dsa)\b/,
        /\b(c|c\+\+|java|python|javascript|typescript|pointer|memory allocation|garbage collection|compiler|runtime|exception|oop|object[- ]oriented|inheritance|polymorphism|interface|class|function|variable|code|programming|debug|unit test|test case)\b/,
        /\b(operating system|process|thread|deadlock|semaphore|mutex|paging|virtual memory|cpu scheduling|context switch|race condition|synchroni[sz]ation|file system)\b/,
        /\b(database|dbms|sql|query|join|index|normalization|transaction|acid|primary key|foreign key|nosql|replication|sharding|schema)\b/,
        /\b(network|tcp|udp|dns|http|https|api|rest|latency|load balanc|cache|microservice|distributed|scalab|concurren|security|authentication|authorization|system design|architecture|git|version control|http status|endpoint|request|response|memory leak|performance|complexity|data integrity)\b/
    ];
    return patterns.some(pattern => pattern.test(q));
}

function hasClearlyHrSignal(question) {
    return /\b(tell me about yourself|career goal|professional goal|strengths and weaknesses|why (do you want|are you interested)|what motivates you|teamwork|conflict with a colleague|leadership style|where do you see yourself|describe a time you (worked|helped|led|disagreed)|handle constructive feedback|salary expectation|why should we hire you)\b/i.test(question);
}

async function generateInterviewQuestion(type, difficulty, previousQuestions = []) {
    const normalizedType = normalizeInterviewType(type);
    const normalizedLevel = normalizeDifficulty(difficulty);
    const previous = (Array.isArray(previousQuestions) ? previousQuestions : [])
        .map(q => String(q || "").trim()).filter(Boolean);
    const previousText = previous.length
        ? previous.map((q, i) => `${i + 1}. ${q}`).join("\n")
        : "None yet.";

    const topicRotation = normalizedType === "Technical" ? `
TECHNICAL DOMAIN ROTATION:
Choose one primary domain that has not already been the main focus of the previous questions, when possible:
- DSA and algorithms (arrays, linked lists, stacks/queues, trees/graphs, recursion, sorting/searching, complexity)
- Programming fundamentals (variables/types, pointers/references, memory, functions, exceptions, OOP, code tracing)
- Operating systems (processes/threads, scheduling, synchronization, deadlocks, memory/virtual memory)
- DBMS and SQL (keys, joins, normalization, indexes, transactions/ACID, query reasoning)
- Computer networks and web protocols (TCP/UDP, DNS, HTTP, REST APIs, status codes)
- Software engineering (testing, debugging, Git, design principles, code review, reliability)
- Problem solving / critical thinking (algorithm choice, edge cases, constraints, correctness and trade-offs)
Do not keep choosing the same domain just because it is easy.` : `
HR THEME ROTATION:
Rotate between motivation, collaboration, conflict resolution, ownership, prioritisation, learning from failure, communication, leadership, ethics, adaptability, and judgement. Avoid repeating the same theme or asking the same introductory question more than once.`;

    const typeRequirements = normalizedType === "Technical" ? `
STRICT TECHNICAL MODE — NON-NEGOTIABLE:
- This is a Computer Science / Software Engineering interview, not a general job interview.
- The question MUST be about a concrete CS/engineering concept, coding problem, debugging situation, data model, algorithm, operating-system behaviour, database/query, network/API behaviour, testing approach, or software design decision.
- At least one technical concept/domain must be explicit in the question.
- Prefer a task/scenario: ask the candidate to trace, implement, compare, debug, choose an algorithm, reason about an edge case, or justify a design.
- NEVER ask personal introduction, career goals, strengths/weaknesses, motivation, teamwork, leadership, conflict, communication, or generic behavioural questions.
- Do not ask a generic "What is your experience with technology?" question.
- A question like "Tell me about yourself" is invalid regardless of the difficulty selected.` : `
STRICT HR MODE — NON-NEGOTIABLE:
- Ask a professional behavioural, motivation, collaboration, ownership, communication, conflict-resolution, leadership, adaptability, or judgement question.
- Do not ask programming, DSA, algorithms, complexity, code tracing, DBMS/SQL, operating systems, networking, API, or system-design questions.
- The question should be answerable without specialist CS knowledge and should invite a real example or thoughtful professional judgement.`;

    const levelRequirements = {
        Beginner: normalizedType === "Technical"
            ? "BEGINNER: assess one foundational CS/programming concept or one straightforward, bounded problem. Examples: trace a simple loop, choose a data structure for a basic task, explain process vs thread, identify a primary key, or reason about a simple O(n) scan. No advanced architecture or multiple constraints."
            : "BEGINNER: ask one clear, accessible question about motivation, learning, collaboration, time management, feedback, or a simple past experience.",
        Intermediate: normalizedType === "Technical"
            ? "INTERMEDIATE: require applied reasoning in multiple steps. Include a realistic constraint or example; ask about an approach and why, complexity, debugging, SQL/index choices, OS synchronization, API behaviour, testing, or edge cases. A bare definition is NOT sufficient."
            : "INTERMEDIATE: ask for a specific example involving competing priorities, a disagreement, ownership, failure, ambiguity, or communicating a difficult decision. Expect the candidate to explain actions and outcome.",
        Advanced: normalizedType === "Technical"
            ? "ADVANCED: require deep technical reasoning with constraints, edge cases, complexity/correctness, performance, concurrency, security, scalability, architecture, or explicit trade-offs. Ask the candidate to justify choices and discuss failure modes. A simple definition is NOT sufficient."
            : "ADVANCED: ask a nuanced professional judgement scenario with competing stakeholder needs, ambiguity, ethical implications, risk, or long-term trade-offs. Require a reasoned decision, not a generic opinion."
    };

    const prompt = `You are the question setter for a rigorous university-to-industry mock interview.
The application selection is authoritative:
INTERVIEW_TYPE = ${normalizedType}
DIFFICULTY = ${normalizedLevel}

${typeRequirements}
${topicRotation}

DIFFICULTY RULES:
${levelRequirements[normalizedLevel]}

NON-REPETITION:
- Do not repeat, paraphrase, or ask the same underlying problem as any previous question below.
- Prefer a different subtopic/domain and a different task shape from earlier questions.
- Questions already asked in this interview:
${previousText}

Return exactly one JSON object and no markdown:
{"type":"${normalizedType}","difficulty":"${normalizedLevel}","domain":"short domain label","question":"one complete interview question"}

The type and difficulty fields must exactly match the application selection. The question must genuinely satisfy the rules above. Do not include an answer, hint, introduction, or multiple questions.`;

    const ai = getAI();
    const response = await ai.models.generateContent({ model: MODEL, contents: prompt });
    const raw = String(response.text || "").trim();
    if (!raw) throw new Error("Gemini returned an empty question.");
    let parsed;
    try {
        parsed = cleanJson(raw);
    } catch {
        // Plain text is accepted only if it passes the same strict content checks below.
        parsed = { type: normalizedType, difficulty: normalizedLevel, domain: "", question: raw };
    }
    let question = String(parsed.question || "").trim().replace(/^["'`]+|["'`]+$/g, "");
    question = question.replace(/^(question|technical question|hr question)\s*:\s*/i, "").trim();
    if (!question) throw new Error("Gemini returned an empty question.");
    if (String(parsed.type || "").toLowerCase() !== normalizedType.toLowerCase()) {
        throw new Error("Gemini returned mismatched interview type metadata.");
    }
    if (String(parsed.difficulty || "").toLowerCase() !== normalizedLevel.toLowerCase()) {
        throw new Error("Gemini returned mismatched difficulty metadata.");
    }
    if (isNearDuplicate(question, previous)) {
        throw new Error("Gemini returned a repeated or near-duplicate question.");
    }
    if (normalizedType === "Technical") {
        if (hasClearlyHrSignal(question) || !hasTechnicalEvidence(question)) {
            throw new Error("Gemini returned a non-technical or generic HR-style question for Technical mode.");
        }
    } else if (hasTechnicalEvidence(question) && !hasClearlyHrSignal(question)) {
        throw new Error("Gemini returned a technical question for HR mode.");
    }
    // Require applied reasoning for higher levels, rather than accepting definition-only prompts.
    if (normalizedLevel === "Intermediate" && normalizedType === "Technical" &&
        !/\b(how would|how can|compare|design|debug|implement|choose|which approach|what happens if|given|suppose|why would|analy[sz]e|trace|optimi[sz]e|complexity|trade[- ]off|scenario|constraint|edge case)\b/i.test(question)) {
        throw new Error("Gemini's technical question did not meet Intermediate application requirements.");
    }
    if (normalizedLevel === "Advanced" && normalizedType === "Technical" &&
        !/\b(design|scalab|trade[- ]off|concurren|race condition|edge case|constraint|complexity|correctness|performance|security|failure mode|distributed|architecture|optimi[sz]e|justify|bottleneck|consisten|throughput|latency)\b/i.test(question)) {
        throw new Error("Gemini's technical question did not meet Advanced reasoning requirements.");
    }
    return question;
}

async function evaluateInterview(questions = [], answers = [], type = "HR", difficulty = "Beginner") {
    const safeQuestions = Array.isArray(questions) ? questions : [];
    const safeAnswers = Array.isArray(answers) ? answers : [];
    const interviewData = safeQuestions.map((question, index) => ({
        question: String(question || ""),
        answer: String(safeAnswers[index] || "").trim()
    }));
    const allBlank = interviewData.every(item => !item.answer);
    const prompt = `
You are a fair, evidence-based professional interview evaluator.
Interview type: ${type}. Difficulty: ${difficulty}.
Evaluate only the supplied questions and answers. Never reward an unanswered question.
If an answer is empty, give that question score 0/10 and explain that it was unanswered.
Scores must reflect the actual answer quality, relevance, correctness, reasoning and clarity; do not reuse a default score.
Return valid JSON only with this exact structure:
{
 "overallScore": 0,
 "communicationScore": 0,
 "technicalScore": 0,
 "confidenceScore": 0,
 "questionEvaluations": [{"question":"","answer":"","score":0,"strengths":[],"weaknesses":[],"suggestion":""}],
 "strengths": [],
 "improvements": [],
 "finalFeedback": ""
}
Questions and answers:
${JSON.stringify(interviewData, null, 2)}
`;
    const ai = getAI();
    const response = await ai.models.generateContent({ model: MODEL, contents: prompt });
    const evaluation = cleanJson(response.text);
    if (!Array.isArray(evaluation.questionEvaluations)) evaluation.questionEvaluations = [];
    // Keep one evaluation per asked question, even if the model omits one.
    evaluation.questionEvaluations = interviewData.map((item, index) => {
        const found = evaluation.questionEvaluations.find(q =>
            String(q.question || "").trim().toLowerCase() === item.question.trim().toLowerCase()
        ) || evaluation.questionEvaluations[index] || {};
        const answer = item.answer;
        return {
            question: item.question,
            answer,
            score: answer ? Math.max(0, Math.min(10, Number(found.score) || 0)) : 0,
            strengths: Array.isArray(found.strengths) ? found.strengths : [],
            weaknesses: Array.isArray(found.weaknesses) ? found.weaknesses : (answer ? [] : ["No answer was provided."]),
            suggestion: String(found.suggestion || (answer ? "Add a specific example and explain your reasoning." : "Attempt the question before ending the interview."))
        };
    });
    const avgQuestion = evaluation.questionEvaluations.length
        ? evaluation.questionEvaluations.reduce((sum, q) => sum + q.score * 10, 0) / evaluation.questionEvaluations.length
        : 0;
    const communication = Math.max(0, Math.min(100, Number(evaluation.communicationScore) || 0));
    const technical = Math.max(0, Math.min(100, Number(evaluation.technicalScore) || 0));
    const confidence = Math.max(0, Math.min(100, Number(evaluation.confidenceScore) || 0));
    // Derive overall from this interview's actual per-question and dimension scores,
    // rather than accepting a repeated/default overall score from the model.
    evaluation.overallScore = allBlank ? 0 : Math.round(
        avgQuestion * 0.4 + communication * 0.2 + technical * 0.2 + confidence * 0.2
    );
    evaluation.communicationScore = allBlank ? 0 : communication;
    evaluation.technicalScore = allBlank ? 0 : technical;
    evaluation.confidenceScore = allBlank ? 0 : confidence;
    evaluation.strengths = allBlank ? [] : (Array.isArray(evaluation.strengths) ? evaluation.strengths : []);
    evaluation.improvements = allBlank
        ? ["Answer each question to receive meaningful feedback."]
        : (Array.isArray(evaluation.improvements) ? evaluation.improvements : []);
    evaluation.finalFeedback = allBlank
        ? "No answers were submitted. Complete the interview and provide answers to receive a meaningful evaluation."
        : String(evaluation.finalFeedback || "Review the question-level feedback and practise the suggested improvements.");
    evaluation.evaluationSource = "Gemini";
    return evaluation;
}

async function testGeminiConnection() {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: MODEL,
        contents: "Reply with exactly: Gemini connection successful."
    });
    const message = String(response.text || "").trim();
    if (!message) throw new Error("Gemini responded with empty text.");
    return { model: MODEL, message };
}

module.exports = {
    generateInterviewQuestion,
    evaluateInterview,
    testGeminiConnection,
    getGeminiModel: () => MODEL
};
