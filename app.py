"""
app.py — Aura AI  |  Flask backend
Now powered by Groq API (free tier) instead of Gemini.
Groq is faster and has 14,400 free requests/day.
"""

import os
import json
import requests
from flask import Flask, request, jsonify, render_template, redirect, url_for

app = Flask(__name__)

# ─── GROQ API KEY ──────────────────────────────────────────────────────────────
# Get your FREE key at: https://console.groq.com
# Sign up → API Keys → Create API Key → paste it below
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "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")

# Groq API endpoint
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# Available models on Groq (all free)
ALLOWED_MODELS = {
    "llama-3.3-70b-versatile",   # Best quality
    "llama-3.1-8b-instant",      # Fastest
    "mixtral-8x7b-32768",        # Great for long context
    "gemma2-9b-it",              # Google Gemma (fast)
}

# ─── PAGE ROUTES ──────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return redirect(url_for("login"))

@app.route("/login")
def login():
    return render_template("login.html")

@app.route("/signup")
def signup():
    return render_template("signup.html")

@app.route("/chat")
def chat():
    return render_template("chat.html")

# ─── AI API ROUTE ─────────────────────────────────────────────────────────────

@app.route("/api/chat", methods=["POST"])
def api_chat():
    data = request.get_json(silent=True)

    if not data:
        return jsonify(error="Invalid JSON body."), 400

    user_msg = (data.get("message") or "").strip()
    if not user_msg:
        return jsonify(error="Message cannot be empty."), 400
    if len(user_msg) > 8000:
        return jsonify(error="Message too long (max 8000 chars)."), 400

    model = data.get("model", "llama-3.3-70b-versatile")
    if model not in ALLOWED_MODELS:
        model = "llama-3.3-70b-versatile"

    history = data.get("history", [])
    if not isinstance(history, list):
        history = []

    messages = [
        {
            "role": "system",
            "content": (
                "You are Aura, a helpful, smart, and friendly AI assistant. "
                "Be concise, accurate, and conversational. "
                "Use markdown formatting when it improves readability "
                "(code blocks, bullet points, bold text, etc.)."
            )
        }
    ]

    for msg in history:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "model":
            role = "assistant"
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": user_msg})

    if len(messages) > 41:
        messages = [messages[0]] + messages[-40:]

    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.75,
        "max_tokens": 2048,
        "top_p": 0.95,
        "stream": False,
    }

    try:
        resp = requests.post(
            GROQ_URL,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {GROQ_API_KEY}",
            },
            data=json.dumps(payload),
            timeout=30,
        )
        resp.raise_for_status()

    except requests.exceptions.Timeout:
        return jsonify(error="Request timed out. Please try again."), 504
    except requests.exceptions.HTTPError as exc:
        try:
            err_msg = exc.response.json().get("error", {}).get("message", str(exc))
        except Exception:
            err_msg = str(exc)
        return jsonify(error=f"Groq API error: {err_msg}"), 502
    except requests.exceptions.RequestException as exc:
        return jsonify(error=f"Network error: {str(exc)}"), 502

    try:
        result = resp.json()
        choices = result.get("choices", [])
        if not choices:
            return jsonify(error="No response from Groq. Check your API key."), 500

        reply = choices[0].get("message", {}).get("content", "").strip()
        if not reply:
            return jsonify(error="Empty response from Groq."), 500

    except Exception as exc:
        return jsonify(error=f"Failed to parse response: {str(exc)}"), 500

    return jsonify(reply=reply, error=None)


# if __name__ == "__main__":
#     print("\n🌟  Aura AI (Groq) running → http://127.0.0.1:5000\n")
#     app.run(debug=True, port=5000)
if __name__ == "__main__":
    print("\n🌟  Aura AI (Groq) running → http://127.0.0.1:5000\n")
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)