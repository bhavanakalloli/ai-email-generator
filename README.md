# MailCraft AI — AI Email Generator

A full-stack AI-powered email generation app built with **React + FastAPI + OpenAI**.  
Users enter a prompt, select a tone, and instantly get a professional email with subject line.

---

## Screenshots

> Add screenshots or a demo GIF here after running the app.

---

## Features

### Mandatory
- ✅ AI-generated email content (subject + body) via OpenAI
- ✅ Tone selector: Professional, Friendly, Formal, Casual
- ✅ Responsive UI (mobile + desktop)
- ✅ Backend API with FastAPI
- ✅ Loading state & skeleton loaders
- ✅ Full error handling (API errors, auth errors, rate limits)
- ✅ Clean project structure

### Bonus
- ✅ Copy-to-clipboard (subject + body)
- ✅ Email subject line generation
- ✅ Prompt history (stored on backend, clickable to reuse)
- ✅ Multiple AI model support (GPT-4o-mini, GPT-4o, GPT-3.5 Turbo)
- ✅ Example prompt chips for quick start
- ✅ Keyboard shortcut (Cmd/Ctrl + Enter to generate)

---

## Tech Stack

| Layer    | Technology                     |
|----------|-------------------------------|
| Frontend | React 18, Vite, CSS Modules   |
| Backend  | FastAPI, Python 3.11+         |
| AI       | OpenAI API (GPT-4o-mini)      |
| Styling  | CSS Modules, DM Sans font     |

---

## Project Structure

```
ai-email-generator/
├── backend/
│   ├── main.py              # FastAPI app (routes, OpenAI integration)
│   ├── requirements.txt
│   ├── .env.example
│   └── .env                 # ← you create this
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── ToneSelector.jsx
│   │   │   ├── EmailOutput.jsx
│   │   │   └── PromptHistory.jsx
│   │   ├── hooks/
│   │   │   └── useEmailGenerator.js
│   │   ├── utils/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── App.module.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
│
└── README.md
```

---

## Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys)

---

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/ai-email-generator.git
cd ai-email-generator
```

---

### 2. Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

Edit `backend/.env` and add your OpenAI API key:
```
OPENAI_API_KEY=sk-your-key-here
```

Start the backend:
```bash
uvicorn main:app --reload --port 8000
```

Backend will be available at: **http://localhost:8000**  
API docs (Swagger UI): **http://localhost:8000/docs**

---

### 3. Frontend setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

The default `.env` is already configured for local development:
```
VITE_API_URL=http://localhost:8000
```

Start the frontend:
```bash
npm run dev
```

Frontend will be available at: **http://localhost:5173**

---

## API Reference

### `POST /api/generate`
Generate an email from a prompt.

**Request body:**
```json
{
  "prompt": "Write a follow-up email after a job interview",
  "tone": "professional",
  "model": "gpt-4o-mini"
}
```

**Response:**
```json
{
  "id": "uuid",
  "subject": "Following Up on Our Interview",
  "body": "Dear [Name],\n\nThank you for...",
  "tone": "professional",
  "prompt": "Write a follow-up email after a job interview",
  "created_at": "2024-01-01T12:00:00"
}
```

### `GET /api/history`
Returns the last 50 generated email prompts.

### `DELETE /api/history`
Clears all prompt history.

### `GET /api/models`
Returns available AI models.

---

## Environment Variables

### Backend (`backend/.env`)
| Variable         | Required | Description              |
|-----------------|----------|--------------------------|
| `OPENAI_API_KEY` | ✅       | Your OpenAI API key      |

### Frontend (`frontend/.env`)
| Variable        | Default                    | Description        |
|----------------|----------------------------|--------------------|
| `VITE_API_URL`  | `http://localhost:8000`    | Backend URL        |

---

## Deployment

### Deploy backend (Railway / Render)
1. Push code to GitHub
2. Connect repo to [Railway](https://railway.app) or [Render](https://render.com)
3. Set `OPENAI_API_KEY` as an environment variable
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Deploy frontend (Vercel)
1. Connect repo to [Vercel](https://vercel.com)
2. Set root directory to `frontend`
3. Add environment variable: `VITE_API_URL=https://your-backend-url.railway.app`

---

## Author

Built for Rokkun Systems Private Limited — Full Stack AI Developer Assignment.
