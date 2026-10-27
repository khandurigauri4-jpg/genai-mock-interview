PHASE 2 SELECTION FIX
=====================
Root cause:
The HR/Technical and difficulty pages have buttons whose visible text is only "Select". Their JavaScript attempted to detect "hr", "technical", "beginner", etc. from the button text, so no selection was stored. Inline onclick navigated anyway. interview.js then reused stale localStorage values (often HR), causing HR questions in technical interviews and difficulty not changing.

This ZIP updates:
- interview-type.html and assets/js/interview-type.js
- difficulty.html and assets/js/difficulty.js
- server/server.js question responses echo the received type/difficulty and source for debugging
- server/gemini.js retains strict type/difficulty prompts and validation from the supplied Phase 2 package.

Integrate the project files while preserving your existing root .env.
After integration, restart the backend with npm start and hard-refresh Live Server (Cmd+Shift+R).
Select Technical Interview -> Select, then Beginner -> Select. The browser console should show selected type/difficulty.
The POST /api/generate-question response includes type, difficulty, source.
Do not commit or upload .env.
