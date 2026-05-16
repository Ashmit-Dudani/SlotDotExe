# SlotDotExe — smart campus resource booking

SlotDotExe is a small campus resource management webapp (React + Vite frontend, Node/Express + MongoDB backend) that demonstrates how generative AI (Google Gemini via `@google/genai`) can help with smarter resource allocation and user assistance.

Key ideas:
- Use AI to interpret free-text requests and map them to structured bookings (seats, buses, project matchings).
- Use AI-based matchmaking and ranking to prioritize scarce resources and suggest alternatives when demand is high.
- Provide an interactive Chatbot powered by Google Gemini for natural language help, summaries, and recommendations.

Live features (what the website provides):
- Home — quick access and onboarding
- Library — seat booking grid, issue/return books, manage reservations
- Bus — shuttle booking with pickup/drop slots
- Lecture Halls — schedule/booking overview for lecture rooms
- Projects — student ideas and professor project listings with interest matching
- Profile — user settings and booking history
- Chatbot — floating assistant (integrates with backend Gemini endpoint)

How SlotDotExe uses Google AI
- Backend integration: the backend may use the `@google/genai` package (see `backend/`), calling Google Gemini when a valid `GEMINI_API_KEY` is provided in the environment.
- Chat & recommendations: the Chatbot sends user messages to the backend; the server augments those messages with contextual data (availability, recent bookings, user profile) and forwards prompts to Gemini to generate conversational replies, suggestions, or prioritized recommendations.
- Smart allocation examples:
	- Demand forecasting: analyze recent bookings to surface high-demand slots and suggest redistribution or time-shifting.
	- Slot ranking: when multiple users request the same slot, use a scoring function (availability, user role, past usage) possibly aided by AI suggestions to select the best candidate.
	- Alternative recommendations: if a requested seat or bus is full, the AI suggests nearest available times/locations and explains trade-offs in natural language.
	- Matching projects: use AI to surface likely professors or students for collaboration based on short, free-text project descriptions.

Important implementation notes
- Gemini usage is optional — the repo contains a backend route that will only call Google GenAI if `GEMINI_API_KEY` is set. See `backend/routes/chat.js` and `backend/test-gemini.js` for examples.
- `@google/genai` requires Node 20+ in many setups. If you plan to run Gemini locally, ensure your Node version meets the package requirements.

Quick start (frontend)
1. Move into the frontend folder and install:

```bash
cd SlotDotExe
npm install
npm run dev
```

Quick start (backend)
1. Move into the backend folder and install:

```bash
cd backend
npm install
```
2. Create a `.env` with your credentials (optional):

```
MONGODB_URI=your_mongo_uri
GEMINI_API_KEY=your_gemini_api_key   # optional — only needed to enable Gemini calls
```
3. Start the server:

```bash
node server.js
```


---

