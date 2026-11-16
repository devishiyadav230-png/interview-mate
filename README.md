# Interview Mate – AI-Powered Mock Interview and Feedback System

Frontend: HTML/CSS/JS. Backend: FastAPI + MediaPipe + OpenCV + NumPy (run with Uvicorn).

```
interview-mate/
├── backend/    main.py (API), analyzer.py (MediaPipe/OpenCV logic), requirements.txt
└── frontend/   index.html, style.css, app.js, config.js
```

## Run in VS Code (Python 3.10 – 3.12 recommended)

Open the `interview-mate` folder in VS Code, open the terminal, then:

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Mac / Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```

Open **http://127.0.0.1:8000** (the backend also serves the frontend).
Tick "Analyse my body language with the camera" and allow camera access.
API docs: http://127.0.0.1:8000/docs

Running the frontend separately (e.g. VS Code Live Server)? Keep the backend running on port 8000;
`frontend/config.js` already points to it.

## How the body-language analysis works
Every 0.7 s the browser sends one camera frame to `/api/analyze-frame`.
MediaPipe Pose finds shoulders, ears, nose and wrists. Metrics: shoulder tilt, head tilt, slouch,
looking away, face touching, centring and distance. OpenCV + NumPy measure movement (fidgeting) and lighting.
After each answer, `/api/summarize` returns the posture score, calmness score and tips.
These are estimates, not a professional assessment. Video stays on your machine.

## Put it on GitHub
```bash
cd interview-mate
git init
git add .
git commit -m "Interview Mate"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```
(`.gitignore` already excludes `venv/`.)

## Make it live
GitHub Pages only hosts static files, so it can serve the **frontend** but not the Python backend.
1. Deploy `backend/` on a Python host (Render, Railway etc.).
   Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
2. Put the backend's https URL in `frontend/config.js` (`window.API_BASE = 'https://...'`).
3. Host `frontend/` on GitHub Pages / Netlify / Vercel. The camera needs https.

## Notes
- The scoring of the written answers (STAR, keywords, resume questions) runs in the browser (`app.js`).
- `mediapipe==0.10.14` is pinned because it bundles the pose model (no extra download).

## 🎙️ AI Interviewer (new feature)
Open the **AI Interviewer** tab at the top. The classic mock interview is unchanged.

- **Categories:** HR, Technical (Python, Java, Web, DBMS & SQL, DSA, OS & Networks, Data Analytics), Placement, Coding (explain approach + code editor).
- **Conversation:** the interviewer speaks the question (browser text-to-speech), you answer by voice (live transcript) or by typing, and it asks adaptive follow-up questions.
- **Voice analysis (in the browser, Chrome/Edge recommended):**
  speaking pace (words/min), unnecessary pauses (> 1.2 s) and start delay, voice intensity (loudness, flat/monotone voice, energy drop at the end), filler words (um, uh, like, basically, you know...) and repeated words.
- **AI performance report:** overall score, answer-quality vs voice-delivery scores, score breakdown, charts, per-question review, strengths, improvements, a 7-day action plan, progress history, and **Print / Save as PDF**.

New files: `frontend/ai-core.js`, `frontend/ai-ui.js`, `frontend/ai.css`, `backend/ai_routes.py`.

### Optional: real LLM evaluation
Works without any key (built-in evaluator). To use an LLM for answer evaluation, follow-ups and the report summary:
```bash
# Windows (PowerShell)
$env:ANTHROPIC_API_KEY="sk-ant-..."
# Mac / Linux
export ANTHROPIC_API_KEY="sk-ant-..."
uvicorn main:app --reload
```
Optional: `AI_MODEL` (default `claude-sonnet-5-5`). The key stays on the server and is never sent to the browser.
If you deploy publicly, add authentication / rate limiting to `/api/ai/*` so nobody can use up your key.

### Notes
- Speech-to-text uses the browser's SpeechRecognition (Chrome/Edge, needs internet, needs https or localhost). Firefox/Safari: type answers; pauses and loudness still work.
- Browser speech-to-text often removes "um/uh", so filler counts can be lower than reality.
- Loudness depends on your mic; use it to compare your own attempts rather than as an absolute value.
