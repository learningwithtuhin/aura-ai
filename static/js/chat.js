/**
 * chat.js — Aura AI v2
 * Premium chat with dark/light mode, chat modes, scroll-to-bottom,
 * message actions, markdown renderer, Groq API via Flask.
 */

"use strict";

// ── Storage Keys ───────────────────────────────────────────
const KEY_CHATS    = "aura_chats";
const KEY_CHAT_PFX = "aura_chat_";
const KEY_ACTIVE   = "aura_active_chat";
const KEY_SESSION  = "aura_session";
const KEY_THEME    = "aura_theme";
const KEY_MODE     = "aura_mode";

// ── DOM refs ───────────────────────────────────────────────
const appShell      = document.getElementById("appShell");
const sidebarEl     = document.getElementById("sidebar");
const sidebarOverlay= document.getElementById("sidebarOverlay");
const sidebarToggle = document.getElementById("sidebarToggle");
const chatListEl    = document.getElementById("chatList");
const newChatBtnEl  = document.getElementById("newChatBtn");
const chatModesEl   = document.getElementById("chatModes");
const topbarTitleEl = document.getElementById("topbarTitle");
const topbarModeEl  = document.getElementById("topbarMode");
const modelSelectEl = document.getElementById("modelSelect");
const themeToggleEl = document.getElementById("themeToggle");
const userAviBtnEl  = document.getElementById("userAviBtn");
const userDropdown  = document.getElementById("userDropdown");
const logoutBtnEl   = document.getElementById("logoutBtn");
const menuToggleEl  = document.getElementById("menuToggle");
const chatBodyEl    = document.getElementById("chatBody");
const welcomeEl     = document.getElementById("welcome");
const messagesAreaEl= document.getElementById("messagesArea");
const msgInputEl    = document.getElementById("msgInput");
const sendBtnEl     = document.getElementById("sendBtn");
const scrollBtnEl   = document.getElementById("scrollBtn");
const userAviEl     = document.getElementById("userAvi");
const sidebarUserNameEl  = document.getElementById("sidebarUserName");
const sidebarUserEmailEl = document.getElementById("sidebarUserEmail");
const dropdownNameEl  = document.getElementById("dropdownName");
const dropdownEmailEl = document.getElementById("dropdownEmail");

// ── App State ──────────────────────────────────────────────
let currentChatId   = null;
let currentSession  = null;
let isLoading       = false;
let conversationCtx = [];
let currentMode     = localStorage.getItem(KEY_MODE) || "chat";

// ── Init ───────────────────────────────────────────────────
(function init() {
  // Auth guard
  const session = JSON.parse(localStorage.getItem(KEY_SESSION) || "null");
  if (!session) { window.location.href = "/login"; return; }
  currentSession = session;

  // Populate user info
  const initials = session.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
  userAviEl.textContent     = initials;
  userAviBtnEl.textContent  = initials;
  sidebarUserNameEl.textContent  = session.name;
  sidebarUserEmailEl.textContent = session.email;
  dropdownNameEl.textContent     = session.name;
  dropdownEmailEl.textContent    = session.email;

  // Restore theme
  const savedTheme = localStorage.getItem(KEY_THEME) || "light";
  applyTheme(savedTheme);

  // Restore mode
  setMode(currentMode, false);

  // Load chats
  renderSidebar();
  const lastId = localStorage.getItem(KEY_ACTIVE);
  const chats  = getChats();
  if (lastId && chats.find(c => c.id === lastId)) {
    loadChat(lastId);
  } else if (chats.length > 0) {
    loadChat(chats[0].id);
  } else {
    startNewChat();
  }

  msgInputEl.focus();
})();

// ── Theme ──────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(KEY_THEME, theme);
  themeToggleEl.textContent = theme === "dark" ? "☀️" : "🌙";
}

themeToggleEl.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});

// ── Sidebar collapse ───────────────────────────────────────
sidebarToggle.addEventListener("click", () => {
  const collapsed = appShell.classList.toggle("sidebar-collapsed");
  sidebarToggle.textContent = collapsed ? "›" : "‹";
});

// ── Chat Modes ─────────────────────────────────────────────
const MODE_PROMPTS = {
  chat:    "You are Aura, a helpful AI assistant. Be conversational, accurate, and friendly.",
  code:    "You are Aura, an expert software engineer. Focus on writing clean, efficient, well-commented code. Always use code blocks.",
  debug:   "You are Aura, a debugging expert. Analyze code carefully, identify bugs, explain root causes, and provide fixes.",
  explain: "You are Aura, a patient teacher. Explain concepts clearly using simple language, analogies, and examples.",
};

function setMode(mode, persist = true) {
  currentMode = mode;
  if (persist) localStorage.setItem(KEY_MODE, mode);

  // Sync sidebar pills
  chatModesEl.querySelectorAll(".mode-pill").forEach(p => {
    p.classList.toggle("active", p.dataset.mode === mode);
  });
  // Sync topbar buttons
  topbarModeEl.querySelectorAll(".topbar-mode-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.mode === mode);
  });
}

chatModesEl.addEventListener("click", e => {
  const pill = e.target.closest(".mode-pill");
  if (pill) setMode(pill.dataset.mode);
});

topbarModeEl.addEventListener("click", e => {
  const btn = e.target.closest(".topbar-mode-btn");
  if (btn) setMode(btn.dataset.mode);
});

// ── Storage helpers ────────────────────────────────────────
function getChats() {
  try { return JSON.parse(localStorage.getItem(KEY_CHATS)) || []; }
  catch { return []; }
}
function saveChats(c) { localStorage.setItem(KEY_CHATS, JSON.stringify(c)); }
function getChatData(id) {
  try { return JSON.parse(localStorage.getItem(KEY_CHAT_PFX + id)) || null; }
  catch { return null; }
}
function saveChatData(id, d) { localStorage.setItem(KEY_CHAT_PFX + id, JSON.stringify(d)); }
function deleteChatData(id)  { localStorage.removeItem(KEY_CHAT_PFX + id); }
function genId() { return "chat_" + Date.now() + "_" + Math.random().toString(36).slice(2,7); }

function relDate(iso) {
  const d = new Date(iso), now = new Date();
  const s = Math.floor((now - d) / 1000);
  if (s < 60)   return "Just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400)return `${Math.floor(s/3600)}h ago`;
  return d.toLocaleDateString([], { month:"short", day:"numeric" });
}

// ── Sidebar render ─────────────────────────────────────────
function renderSidebar() {
  const chats = getChats();
  chatListEl.innerHTML = "";

  if (chats.length === 0) {
    chatListEl.innerHTML = `
      <div class="sidebar-empty">
        <div class="sidebar-empty-icon">💬</div>
        <p>No chats yet.<br/>Start a new conversation!</p>
      </div>`;
    return;
  }

  chats.forEach(chat => {
    const el = document.createElement("div");
    el.className = "chat-list-item" + (chat.id === currentChatId ? " active" : "");
    el.dataset.id = chat.id;

    const modeIcons = { chat:"💬", code:"💻", debug:"🐛", explain:"📖" };
    const icon = modeIcons[chat.mode] || "💬";

    el.innerHTML = `
      <div class="chat-list-icon">${icon}</div>
      <div class="chat-list-info">
        <div class="chat-list-title">${escHtml(chat.title)}</div>
        <div class="chat-list-date">${relDate(chat.updatedAt)}</div>
      </div>
      <button class="chat-list-del" title="Delete">✕</button>`;

    el.addEventListener("click", e => {
      if (e.target.closest(".chat-list-del")) return;
      loadChat(chat.id); closeSidebar();
    });
    el.querySelector(".chat-list-del").addEventListener("click", e => {
      e.stopPropagation(); deleteChat(chat.id);
    });
    chatListEl.appendChild(el);
  });
}

// ── Chat lifecycle ─────────────────────────────────────────
function startNewChat() {
  const id = genId();
  const chats = getChats();
  chats.unshift({
    id, title: "New Conversation", model: modelSelectEl.value,
    mode: currentMode,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });
  saveChats(chats);
  saveChatData(id, { messages: [], history: [] });

  currentChatId   = id;
  conversationCtx = [];
  localStorage.setItem(KEY_ACTIVE, id);
  messagesAreaEl.innerHTML = "";
  welcomeEl.classList.remove("hidden");
  topbarTitleEl.textContent = "New Conversation";
  renderSidebar();
  msgInputEl.focus();
}

function loadChat(id) {
  const chat = getChats().find(c => c.id === id);
  if (!chat) { startNewChat(); return; }

  currentChatId = id;
  localStorage.setItem(KEY_ACTIVE, id);
  if (chat.model) modelSelectEl.value = chat.model;
  if (chat.mode)  setMode(chat.mode, false);

  const data = getChatData(id) || { messages: [], history: [] };
  conversationCtx = data.history || [];
  messagesAreaEl.innerHTML = "";

  if (data.messages.length === 0) {
    welcomeEl.classList.remove("hidden");
    topbarTitleEl.textContent = "New Conversation";
  } else {
    welcomeEl.classList.add("hidden");
    topbarTitleEl.textContent = chat.title;
    data.messages.forEach(m => renderMessage(m.role, m.content, m.time, false));
  }

  renderSidebar();
  scrollToBottom("instant");
}

function deleteChat(id) {
  let chats = getChats().filter(c => c.id !== id);
  saveChats(chats); deleteChatData(id);
  if (currentChatId === id) {
    if (chats.length > 0) loadChat(chats[0].id);
    else startNewChat();
  } else {
    renderSidebar();
  }
}

function persistMsg(role, content) {
  const data = getChatData(currentChatId) || { messages: [], history: [] };
  data.messages.push({ role, content, time: new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) });
  data.history = conversationCtx;
  saveChatData(currentChatId, data);
}

function updateChatMeta(title) {
  const chats = getChats();
  const idx = chats.findIndex(c => c.id === currentChatId);
  if (idx === -1) return;
  if (title) chats[idx].title = title;
  chats[idx].model = modelSelectEl.value;
  chats[idx].mode  = currentMode;
  chats[idx].updatedAt = new Date().toISOString();
  saveChats(chats);
}

// ── Markdown renderer ──────────────────────────────────────
function escHtml(s) {
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function renderMarkdown(text) {
  const blocks = [];
  // Code blocks with header bar
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const i = blocks.length;
    const l = lang || "code";
    blocks.push(`
      <div class="code-header-bar">
        <span class="code-lang-label">${escHtml(l)}</span>
        <button class="copy-code-btn" onclick="copyCodeBlock(this)">Copy</button>
      </div>
      <code>${escHtml(code.trim())}</code>`);
    return `\x01B${i}\x01`;
  });

  text = text.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  text = text.replace(/^### (.+)$/gm,"<h3>$1</h3>");
  text = text.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  text = text.replace(/^# (.+)$/gm,  "<h1>$1</h1>");
  text = text.replace(/\*\*\*(.+?)\*\*\*/g,"<strong><em>$1</em></strong>");
  text = text.replace(/\*\*(.+?)\*\*/g,    "<strong>$1</strong>");
  text = text.replace(/\*(.+?)\*/g,         "<em>$1</em>");
  text = text.replace(/__(.+?)__/g,         "<strong>$1</strong>");
  text = text.replace(/_(.+?)_/g,           "<em>$1</em>");
  text = text.replace(/~~(.+?)~~/g,         "<del>$1</del>");
  text = text.replace(/^---+$/gm,           "<hr/>");
  text = text.replace(/^> (.+)$/gm,         "<blockquote>$1</blockquote>");
  text = text.replace(/((?:^[ \t]*[-*+] .+\n?)+)/gm, bl => {
    const items = bl.trim().split("\n").map(l =>
      `<li>${l.replace(/^[ \t]*[-*+] /,"").trim()}</li>`).join("");
    return `<ul>${items}</ul>`;
  });
  text = text.replace(/((?:^[ \t]*\d+\. .+\n?)+)/gm, bl => {
    const items = bl.trim().split("\n").map(l =>
      `<li>${l.replace(/^[ \t]*\d+\. /,"").trim()}</li>`).join("");
    return `<ol>${items}</ol>`;
  });
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Paragraphs
  const blockRe = /^<(h[1-6]|ul|ol|blockquote|hr|pre)/;
  text = text.split(/\n{2,}/).map(chunk => {
    chunk = chunk.trim();
    if (!chunk) return "";
    if (blockRe.test(chunk) || chunk.startsWith("\x01B")) return chunk;
    return `<p>${chunk.replace(/\n/g,"<br/>")}</p>`;
  }).join("\n");

  // Restore code blocks wrapped in <pre>
  text = text.replace(/\x01B(\d+)\x01/g, (_, i) =>
    `<pre>${blocks[+i]}</pre>`);

  return text;
}

window.copyCodeBlock = function(btn) {
  const code = btn.closest("pre").querySelector("code");
  if (!code) return;
  navigator.clipboard.writeText(code.innerText).then(() => {
    btn.textContent = "Copied!";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("copied"); }, 2000);
  });
};

// ── Message rendering ──────────────────────────────────────
function renderMessage(role, content, time, animate = true) {
  const isUser = role === "user";
  const t = time || new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  const initials = currentSession
    ? currentSession.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()
    : "U";

  const bodyHtml = isUser
    ? escHtml(content).replace(/\n/g,"<br/>")
    : renderMarkdown(content);

  const row = document.createElement("div");
  row.className = `msg-row ${role}`;
  if (!animate) row.style.animation = "none";

  row.innerHTML = `
    <div class="msg-avi">${isUser ? initials : "✦"}</div>
    <div class="msg-col">
      <div class="msg-bubble">${bodyHtml}</div>
      <div class="msg-actions">
        <button class="msg-action-btn" onclick="copyMsg(this)" title="Copy">📋 Copy</button>
        ${!isUser ? `
          <button class="msg-action-btn" onclick="likeMsg(this)" title="Like">👍</button>
          <button class="msg-action-btn" onclick="dislikeMsg(this)" title="Dislike">👎</button>
        ` : ""}
        <span class="msg-time">${t}</span>
      </div>
    </div>`;

  messagesAreaEl.appendChild(row);
  scrollToBottom();
  return row;
}

window.copyMsg = function(btn) {
  const bubble = btn.closest(".msg-col").querySelector(".msg-bubble");
  navigator.clipboard.writeText(bubble?.innerText || "").then(() => {
    btn.textContent = "✅ Copied";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = "📋 Copy"; btn.classList.remove("copied"); }, 2000);
  });
};
window.likeMsg    = btn => { btn.classList.toggle("liked");    btn.textContent = btn.classList.contains("liked") ? "👍✓" : "👍"; };
window.dislikeMsg = btn => { btn.classList.toggle("disliked"); btn.textContent = btn.classList.contains("disliked") ? "👎✓" : "👎"; };

// ── Typing indicator ───────────────────────────────────────
function showTyping() {
  const row = document.createElement("div");
  row.className = "typing-row"; row.id = "typing";
  row.innerHTML = `
    <div class="msg-avi" style="background:var(--grad-primary);color:#fff;font-size:16px;box-shadow:0 3px 12px rgba(14,165,233,.30);">✦</div>
    <div class="typing-bubble">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>`;
  messagesAreaEl.appendChild(row);
  scrollToBottom();
  return row;
}

// ── Scroll helpers ─────────────────────────────────────────
function scrollToBottom(behavior = "smooth") {
  chatBodyEl.scrollTo({ top: chatBodyEl.scrollHeight, behavior });
}

chatBodyEl.addEventListener("scroll", () => {
  const fromBottom = chatBodyEl.scrollHeight - chatBodyEl.scrollTop - chatBodyEl.clientHeight;
  scrollBtnEl.classList.toggle("show", fromBottom > 200);
});
scrollBtnEl.addEventListener("click", scrollToBottom);

// ── Error bubble ───────────────────────────────────────────
function showError(msg) {
  const row = document.createElement("div");
  row.className = "msg-row bot";
  row.innerHTML = `
    <div class="msg-avi" style="background:var(--grad-primary);color:#fff;font-size:16px;">✦</div>
    <div class="msg-col">
      <div class="msg-bubble" style="background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.2);color:var(--c-danger);">
        ⚠️ ${escHtml(msg)}
      </div>
    </div>`;
  messagesAreaEl.appendChild(row);
  scrollToBottom();
}

// ── Send message ───────────────────────────────────────────
async function sendMessage() {
  const text = msgInputEl.value.trim();
  if (!text || isLoading) return;

  welcomeEl.classList.add("hidden");
  msgInputEl.value = "";
  autoResize(msgInputEl);
  setLoading(true);

  // Set title from first message
  const chats = getChats();
  const chat = chats.find(c => c.id === currentChatId);
  const isFirst = !chat || chat.title === "New Conversation";
  const title = isFirst ? text.slice(0, 44) + (text.length > 44 ? "…" : "") : null;
  if (title) { topbarTitleEl.textContent = title; updateChatMeta(title); renderSidebar(); }

  renderMessage("user", text);
  persistMsg("user", text);
  conversationCtx.push({ role: "user", content: text });

  const typing = showTyping();

  // Build system prompt based on current mode
  const systemPrompt = MODE_PROMPTS[currentMode] || MODE_PROMPTS.chat;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message:       text,
        history:       conversationCtx.slice(0, -1),
        model:         modelSelectEl.value,
        system_prompt: systemPrompt,
      }),
    });

    const data = await res.json();
    typing.remove();

    if (!res.ok || data.error) {
      showError(data.error || `Server error (${res.status})`);
      conversationCtx.pop();
    } else {
      renderMessage("bot", data.reply);
      persistMsg("bot", data.reply);
      conversationCtx.push({ role: "assistant", content: data.reply });
      if (conversationCtx.length > 40) conversationCtx = conversationCtx.slice(-40);

      // Persist history
      const d = getChatData(currentChatId);
      if (d) { d.history = conversationCtx; saveChatData(currentChatId, d); }
      updateChatMeta(null);
      renderSidebar();
    }

  } catch (err) {
    typing.remove();
    showError("Network error — is the Flask server running?");
    conversationCtx.pop();
    console.error(err);
  } finally {
    setLoading(false);
    msgInputEl.focus();
  }
}

function setLoading(state) {
  isLoading = state;
  sendBtnEl.disabled = state;
  msgInputEl.disabled = state;
  if (!state) sendBtnEl.disabled = msgInputEl.value.trim() === "";
}

function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 180) + "px";
}

// ── Event listeners ────────────────────────────────────────
msgInputEl.addEventListener("input", () => {
  autoResize(msgInputEl);
  sendBtnEl.disabled = msgInputEl.value.trim() === "" || isLoading;
});
msgInputEl.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
sendBtnEl.addEventListener("click", sendMessage);
newChatBtnEl.addEventListener("click", () => { startNewChat(); closeSidebar(); });
modelSelectEl.addEventListener("change", () => updateChatMeta(null));

// Prompt cards
document.querySelectorAll(".prompt-card").forEach(card => {
  card.addEventListener("click", () => {
    const p = card.dataset.prompt;
    if (p) { msgInputEl.value = p; autoResize(msgInputEl); sendBtnEl.disabled = false; sendMessage(); }
  });
});

// User dropdown
userAviBtnEl.addEventListener("click", e => {
  e.stopPropagation();
  userDropdown.classList.toggle("open");
});
document.addEventListener("click", () => userDropdown.classList.remove("open"));
userDropdown.addEventListener("click", e => e.stopPropagation());

// Logout
logoutBtnEl.addEventListener("click", () => {
  localStorage.removeItem(KEY_SESSION);
  localStorage.removeItem(KEY_ACTIVE);
  window.location.href = "/login";
});

// Mobile sidebar
menuToggleEl.addEventListener("click", () => {
  sidebarEl.classList.toggle("open");
  sidebarOverlay.classList.toggle("open");
});
sidebarOverlay.addEventListener("click", closeSidebar);

function closeSidebar() {
  sidebarEl.classList.remove("open");
  sidebarOverlay.classList.remove("open");
}