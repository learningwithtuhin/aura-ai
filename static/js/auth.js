/**
 * auth.js — Aura AI
 * Handles signup / login / session management via localStorage.
 * NO backend calls — purely client-side.
 */

"use strict";

// ── Storage keys ───────────────────────────────────────────
const KEY_USERS   = "aura_users";        // array of user objects
const KEY_SESSION = "aura_session";      // current logged-in user email

// ── Utility: toast notification ────────────────────────────
function showToast(message, type = "info") {
  // Remove existing toast
  document.querySelectorAll(".toast").forEach(t => t.remove());

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Auto-remove after 3.5 seconds with fade
  setTimeout(() => {
    toast.style.transition = "opacity .4s, transform .4s";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// ── User helpers ───────────────────────────────────────────

/** Return all registered users from localStorage */
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(KEY_USERS)) || [];
  } catch {
    return [];
  }
}

/** Save users array back to localStorage */
function saveUsers(users) {
  localStorage.setItem(KEY_USERS, JSON.stringify(users));
}

/** Find a user by email (case-insensitive) */
function findUser(email) {
  return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
}

// ── Session helpers ────────────────────────────────────────

/** Return the currently logged-in user object, or null */
function getSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY_SESSION)) || null;
  } catch {
    return null;
  }
}

/** Store a user object as the active session */
function setSession(user) {
  localStorage.setItem(KEY_SESSION, JSON.stringify(user));
}

/** Remove active session (logout) */
function clearSession() {
  localStorage.removeItem(KEY_SESSION);
}

/** Guard: redirect to /login if not authenticated */
function requireAuth() {
  if (!getSession()) {
    window.location.href = "/login";
  }
}

/** Guard: redirect to /chat if already logged in */
function requireGuest() {
  if (getSession()) {
    window.location.href = "/chat";
  }
}

// ── Validation ─────────────────────────────────────────────

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(pw) {
  return pw.length >= 6;
}

/** Show an error under a field */
function fieldError(fieldId, msg) {
  const el = document.getElementById(fieldId + "Error");
  if (el) {
    el.textContent = msg;
    el.classList.add("show");
  }
}

/** Clear all field errors */
function clearErrors() {
  document.querySelectorAll(".field-error").forEach(el => {
    el.classList.remove("show");
    el.textContent = "";
  });
}

// ── SIGNUP ─────────────────────────────────────────────────

function initSignup() {
  requireGuest();

  const form = document.getElementById("signupForm");
  if (!form) return;

  form.addEventListener("submit", e => {
    e.preventDefault();
    clearErrors();

    const name  = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const pw    = document.getElementById("password").value;
    const pw2   = document.getElementById("confirm").value;

    let valid = true;

    if (!name) {
      fieldError("name", "Name is required."); valid = false;
    } else if (name.length < 2) {
      fieldError("name", "Name must be at least 2 characters."); valid = false;
    }

    if (!email) {
      fieldError("email", "Email is required."); valid = false;
    } else if (!validateEmail(email)) {
      fieldError("email", "Enter a valid email address."); valid = false;
    } else if (findUser(email)) {
      fieldError("email", "An account with this email already exists."); valid = false;
    }

    if (!pw) {
      fieldError("password", "Password is required."); valid = false;
    } else if (!validatePassword(pw)) {
      fieldError("password", "Password must be at least 6 characters."); valid = false;
    }

    if (!pw2) {
      fieldError("confirm", "Please confirm your password."); valid = false;
    } else if (pw !== pw2) {
      fieldError("confirm", "Passwords do not match."); valid = false;
    }

    if (!valid) return;

    // Save new user
    const users = getUsers();
    const newUser = {
      name,
      email: email.toLowerCase(),
      password: pw,   // plain text — acceptable for localStorage-only demo
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    saveUsers(users);

    // Auto-login
    setSession({ name: newUser.name, email: newUser.email });

    showToast("Account created! Welcome to Aura 🌟", "success");
    setTimeout(() => { window.location.href = "/chat"; }, 800);
  });
}

// ── LOGIN ──────────────────────────────────────────────────

function initLogin() {
  requireGuest();

  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", e => {
    e.preventDefault();
    clearErrors();

    const email = document.getElementById("email").value.trim();
    const pw    = document.getElementById("password").value;

    let valid = true;

    if (!email) {
      fieldError("email", "Email is required."); valid = false;
    } else if (!validateEmail(email)) {
      fieldError("email", "Enter a valid email address."); valid = false;
    }

    if (!pw) {
      fieldError("password", "Password is required."); valid = false;
    }

    if (!valid) return;

    const user = findUser(email);

    if (!user || user.password !== pw) {
      // Generic message to not reveal which field is wrong
      fieldError("password", "Incorrect email or password.");
      return;
    }

    // Start session
    setSession({ name: user.name, email: user.email });

    showToast(`Welcome back, ${user.name}! ✨`, "success");
    setTimeout(() => { window.location.href = "/chat"; }, 700);
  });
}

// ── LOGOUT ─────────────────────────────────────────────────

function logout() {
  clearSession();
  window.location.href = "/login";
}
