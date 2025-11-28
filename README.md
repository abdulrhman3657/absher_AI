# Absher AI Agent – Proactive Assistant

This project is a full-stack demo of an intelligent Absher-like assistant.  
It provides conversational guidance, proactive SMS reminders, and renewal workflows using LLMs (OpenAI + LangChain) with a FastAPI backend and a Vite/React frontend.

---

## 🚀 Features

### 🤖 **AI Chat Assistant**
- Built using LangChain `AgentType.OPENAI_FUNCTIONS`.
- Understands user service status (Iqama, passport, license, vehicle registration).
- Searches Absher knowledge via semantic RAG (FAISS).
- Ensures correct multi-step renewal workflow:
  - Detects expiry
  - Asks for missing info
  - Explains steps
  - Requests confirmation
  - Triggers backend "proposed actions"

### 📲 **Proactive Notifications**
- Automatic SMS alerts for expiring services (≤ 3 days).
- LLM-generated Arabic/English-friendly messages.
- Manual trigger available in the frontend UI.

### 🔐 **Mock User Login**
- Credentials loaded from a backend `users.json` file.
- AI-generated “login summary” notification after successful login.

### 🧠 **RAG Knowledge Base**
- FAISS vector search over `absher_knowledge.json`.
- Used by the assistant to explain Absher procedures without hallucination.

### 🎤 **Voice Support**
- Speech-to-text (`gpt-4o-mini-transcribe`).
- Text-to-speech (`gpt-4o-mini-tts`).
- Voice playback in the chat UI.

### 🧾 **Renewal Simulation**
- After agent proposes a renewal, user confirms through modal popup.
- Backend simulates renewal and extends expiry dates in `users.json`.

---

## 🛠️ Backend: Setup & Run

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

## 🖥️ Frontend: Setup & Run

```bash
cd frontend
pip install
npm run dev
```