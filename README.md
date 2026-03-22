# Aura AI — Flask + Gemini Chatbot

A full-stack SaaS-style AI chatbot with:
- **Teal/emerald design** (unique, not ChatGPT)
- **localStorage authentication** (no database)
- **Flask + Google Gemini** backend
- **Persistent chat history** per user in browser

---

## 📁 Project Structure

```
aura-ai/
├── app.py                      ← Flask server + /api/chat endpoint
├── requirements.txt
├── templates/
│   ├── login.html              ← Login page
│   ├── signup.html             ← Signup page
│   └── chat.html               ← Main chat UI
└── static/
    ├── css/
    │   ├── shared.css          ← Tokens, auth layout, form styles
    │   └── chat.css            ← Chat UI: sidebar, topbar, messages
    └── js/
        ├── auth.js             ← Signup/login/session logic
        └── chat.js             ← Chat rendering, API calls, localStorage
```

---

## 🚀 Setup (5 minutes)

### 1. Get a free Gemini API key
→ https://aistudio.google.com/app/apikey

### 2. Install dependencies

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Set your API key

```bash
# Mac/Linux
export GEMINI_API_KEY="your_key_here"

# Windows CMD
set GEMINI_API_KEY=your_key_here

# Windows PowerShell
$env:GEMINI_API_KEY="your_key_here"
```

Or edit `app.py` line ~14:
```python
GEMINI_API_KEY = "your_key_here"
```

### 4. Run

```bash
python app.py
```

Open **http://127.0.0.1:5000** — you'll be redirected to the login page.

---

## 🔐 Authentication Flow

1. **Sign up** at `/signup` → data saved to `localStorage`
2. **Log in** at `/login` → session saved to `localStorage`
3. **Chat page** checks session on load → redirects to `/login` if missing
4. **Logout** clears session → redirects to `/login`
5. **Demo account** — click "Try demo account" on the login page

All user data lives in the browser. No database, no server-side sessions.

---

## 💬 Chat Features

| Feature | Details |
|---|---|
| Multiple chats | Create unlimited conversations |
| Persistent history | Chats survive page reload (localStorage) |
| Gemini context | Last 40 turns sent for memory |
| Model selector | Switch between Flash/Pro in the topbar |
| Markdown rendering | Code blocks, lists, bold, tables |
| Copy button | One-click copy on every bot message |
| Typing indicator | Animated dots while waiting |
| Mobile responsive | Sidebar becomes a slide-in drawer |

---

## 🎨 Design System

- **Font**: Outfit (Google Fonts)
- **Primary**: Teal `#0d9488` + Emerald `#059669`
- **Background**: Warm sage `#f0f4f2`
- **Sidebar**: Deep teal-black `#0a1f1c`
- **Unique**: NOT ChatGPT/Claude purple — distinctive SaaS teal

---

## ⚙️ Customisation

- **System prompt** — edit the `system_instruction` in `app.py`
- **Models** — add/remove entries in `ALLOWED_MODELS` + `chat.html` `<select>`
- **Theme** — all colors in `shared.css` `:root` block
- **Welcome prompts** — edit `.prompt-card` elements in `chat.html`
