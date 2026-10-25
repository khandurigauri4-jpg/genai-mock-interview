# GenAI Mock Interview — Final Integration Build

This project is a plain HTML/CSS/JavaScript frontend and an Express/MongoDB backend. It includes account signup/login, profile, resume builder/preview, an interview flow, speech recognition/synthesis, MediaPipe face/pose analysis, OpenCV frame-quality analysis, feedback history, dashboard, and resume-content ATS estimate.

## Important honesty about the metrics
- Gemini is used for question generation and answer evaluation when a valid API key and free quota are available.
- If Gemini is unavailable or the free quota is exhausted, the interview still runs using a built-in question set and a **clearly labelled basic local evaluation**. That fallback is not a semantic LLM evaluation.
- Browser speech recognition and synthesis depend on browser support and microphone permission. Chrome/Edge generally work best.
- MediaPipe and OpenCV browser libraries are loaded from CDNs, so the first run needs internet access.
- The ATS score is a transparent local content heuristic, not a guarantee of how a specific employer's ATS will score a resume.
- Facial-expression, eye-contact, and posture scores are approximate computer-vision indicators, not medical or definitive personality assessments.

## 1. Install prerequisites
1. Install Node.js 20 or newer.
2. Install/start MongoDB Community locally, or use a MongoDB Atlas connection string.
3. Use Chrome or Edge and allow camera/microphone permissions.
4. Open this folder in VS Code.

## 2. Configure the backend
In the project root (same level as `package.json`), create `.env` by copying `.env.example`.

Mac/Linux:
```bash
cp .env.example .env
```

Windows PowerShell:
```powershell
Copy-Item .env.example .env
```

Edit `.env`:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/interviewAI
GEMINI_API_KEY=your_actual_google_ai_studio_key
GEMINI_MODEL=gemini-3.6-flash
```
A Gemini key is optional for the fallback workflow, but required for actual Gemini-generated questions and semantic evaluation. Do not commit `.env` or share it.

If you use Atlas instead of local MongoDB, replace only `MONGODB_URI` with your own Atlas connection string and ensure your IP/network access and database user are configured.

## 3. Install dependencies and run the backend
Run in VS Code Terminal from the project root:
```bash
npm install
npm test
npm start
```
Expected startup messages include MongoDB connected and backend running at `http://localhost:5050`.

Keep this terminal running.

## 4. Start the frontend
Open the project root in VS Code. Install the **Live Server** extension if needed, right-click `index.html`, and select **Open with Live Server**. It should open at a URL like `http://127.0.0.1:5500/index.html`.

Do not double-click HTML files as `file://` URLs; use Live Server.

## 5. Quick backend checks (new terminal)
```bash
curl -i http://localhost:5050/api/test
curl -i http://localhost:5050/api/health
```
`/api/health` reports backend/database readiness and whether a Gemini key is configured; it never returns the key.

Test a question (requires backend; works with Gemini or local fallback):
```bash
curl -s -X POST http://localhost:5050/api/generate-question \
  -H 'Content-Type: application/json' \
  -d '{"type":"Technical","difficulty":"Beginner","previousQuestions":[]}'
```

Test fallback/AI evaluation (sample request):
```bash
curl -s -X POST http://localhost:5050/api/evaluate-interview \
  -H 'Content-Type: application/json' \
  -d '{"type":"HR","difficulty":"Beginner","questions":["Tell me about yourself"],"answers":["I am a computer science student who enjoys building web applications. I recently worked on a project with JavaScript and MongoDB."]}'
```
The response should contain `success: true` and an `evaluation` object. Check `evaluationSource` to see whether Gemini or the local fallback was used.

## 6. Full application test checklist
1. **Signup:** create a new account with a unique email. Confirm it returns to login or the intended next page.
2. **Login:** log in with that account; dashboard should show the account name.
3. **Profile:** update college/degree/year/location, save, refresh, and confirm values persist.
4. **Resume:** fill at least contact details, education, skills, one project, and achievements. Save; preview should show those fields.
5. **ATS score:** from resume preview, open ATS analysis. Scores should be calculated from the saved resume and should not always be fixed. Suggested skills and recommendations should change with the content. Test the resume download button.
6. **Interview configuration:** choose HR or Technical, then Beginner/Intermediate/Advanced.
7. **Interview:** start. Verify question type/level is appropriate. Allow camera access; allow microphone access when starting recording. Confirm speech-to-text inserts transcript and replay question speaks.
8. **CV:** keep the camera on for at least 20–30 seconds in good light. Check the interview-page console for MediaPipe/OpenCV initialization and frame processing. Do not expect measurements if the camera is blocked, the face/body is out of frame, or CDNs fail.
9. **Complete interview:** answer several questions, click End Interview, wait for saving/evaluation, then confirm the feedback page loads.
10. **Feedback:** verify overall score, dimension scores, strengths, improvements, question-level evaluations, and available video/voice measurements. If Gemini quota is exhausted, the report must explicitly say it used local fallback.
11. **Persistence:** refresh feedback, return to dashboard, and confirm the interview/score is saved. Sign out and log in again to verify the report remains available.
12. **Isolation:** create a second account and ensure it does not see the first account's records.

## 7. Troubleshooting
- `MongoDB connection failed`: start MongoDB or correct `MONGODB_URI`.
- `GEMINI_API_KEY is missing` in logs: set the key in root `.env`; restart `npm start`.
- Gemini `429` / quota error: the app avoids repeated quota retries and uses its labelled local fallback. Wait for free quota reset before retrying Gemini.
- Camera unavailable: use Live Server on localhost, grant browser camera permission, close other camera apps, and reload.
- `OpenCV runtime did not initialize`: verify internet/CDN access, reload, and check Console. MediaPipe/OpenCV require CDN access.
- If old report data is displayed, complete a new interview; the feedback page now selects the newest MongoDB report first.
- If port 5050 is occupied, stop the other process or update `PORT` in `server/server.js` and the API base URLs in frontend JS files consistently.

## 8. Useful commands
```bash
npm test
npm start
```
To inspect stored collections, use MongoDB Compass and database `interviewAI`, collections `users`, `resumes`, `interviews`, `feedback`, and `atsScores`.
