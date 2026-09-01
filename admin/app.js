// Status App — Admin Dashboard (vanilla JS, no build step needed)

const state = {
  apiUrl: localStorage.getItem("admin_api_url") || "http://localhost:4000",
  token: localStorage.getItem("admin_token") || null,
  me: null,
  usersPage: 1,
  contentPage: 1,
  reportsPage: 1,
};

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  let res;
  try {
    res = await fetch(`${state.apiUrl}${path}`, { ...options, headers });
  } catch (e) {
    throw new Error("Can't reach the API. Check the API URL and that the backend is running.");
  }

  if (res.status === 204) return null;

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message || `Request failed (${res.status})`);
  }
  return body;
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

let toastTimeout;
function toast(message, type = "") {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.className = `toast ${type}`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.add("hidden"), 3200);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function showLogin() {
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("dashboard").classList.add("hidden");
}

function showDashboard() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
}

async function login(identifier, password) {
  const data = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
  if (data.user.role !== "ADMIN") {
    throw new Error("This account doesn't have admin access.");
  }
  state.token = data.accessToken;
  state.me = data.user;
  localStorage.setItem("admin_token", state.token);
  return data;
}

function logout() {
  state.token = null;
  state.me = null;
  localStorage.removeItem("admin_token");
  showLogin();
}

document.getElementById("login-api-url").value = state.apiUrl;

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const identifier = document.getElementById("login-identifier").value.trim();
  const password = document.getElementById("login-password").value;
  const apiUrl = document.getElementById("login-api-url").value.trim() || "http://localhost:4000";
  state.apiUrl = apiUrl.replace(/\/$/, "");
  localStorage.setItem("admin_api_url", state.apiUrl);

  const submitBtn = document.getElementById("login-submit");
  const errorEl = document.getElementById("login-error");
  errorEl.textContent = "";
  submitBtn.disabled = true;
  submitBtn.textContent = "Signing in…";

  try {
    await login(identifier, password);
    document.getElementById("admin-whoami").textContent = `${state.me.fullName} · @${state.me.username}`;
    showDashboard();
    loadOverview();
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign In";
  }
});

document.getElementById("logout-btn").addEventListener("click", logout);

// ---------------------------------------------------------------------------
// Tab switching
// ---------------------------------------------------------------------------

const loaders = {
  overview: loadOverview,
  users: () => loadUsers(1),
  content: () => loadContent(1),
  reports: () => loadReports(1),
  categories: loadCategories,
};

document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    document.getElementById(`tab-${tab}`).classList.add("active");
    loaders[tab]?.();
  });
});

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

async function loadOverview() {
  try {
    const { analytics } = await api("/api/admin/analytics");
    const cards = [
      ["Total Users", analytics.totalUsers],
      ["Active Users (30d)", analytics.activeUsers],
      ["Published Statuses", analytics.totalStatuses],
      ["Total Downloads", analytics.totalDownloads],
      ["Total Favorites", analytics.totalFavorites],
      ["Open Reports", analytics.openReports],
    ];
    document.getElementById("stat-cards").innerHTML = cards
      .map(([label, value]) => `<div class="stat-card"><div class="value">${value}</div><div class="label">${label}</div></div>`)
      .join("");

    const tbody = document.querySelector("#trending-table tbody");
    tbody.innerHTML = analytics.trendingContent.length
      ? analytics.trendingContent
          .map(
            (t) =>
              `<tr><td><strong>${escapeHtml(t.title)}</strong></td><td>@${escapeHtml(t.creatorUsername)}</td><td>${t.downloadCount}</td><td>${t.viewCount}</td></tr>`
          )
          .join("")
      : `<tr class="empty-row"><td colspan="4">No published content yet.</td></tr>`;

    const eventsTbody = document.querySelector("#events-table tbody");
    eventsTbody.innerHTML = analytics.eventSummary7d.length
      ? analytics.eventSummary7d
          .map((e) => `<tr><td>${escapeHtml(e.eventType)}</td><td>${e.count}</td></tr>`)
          .join("")
      : `<tr class="empty-row"><td colspan="2">No tracked events in the last 7 days.</td></tr>`;
  } catch (err) {
    toast(err.message, "error");
  }
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

let usersSearchTimeout;
document.getElementById("users-search").addEventListener("input", () => {
  clearTimeout(usersSearchTimeout);
  usersSearchTimeout = setTimeout(() => loadUsers(1), 350);
});

async function loadUsers(page) {
  state.usersPage = page;
  const search = document.getElementById("users-search").value.trim();
  const qs = new URLSearchParams({ page, limit: 20 });
  if (search) qs.set("search", search);

  try {
    const data = await api(`/api/admin/users?${qs}`);
    const tbody = document.getElementById("users-tbody");
    tbody.innerHTML = data.items.length
      ? data.items
          .map(
            (u) => `
        <tr>
          <td><strong>${escapeHtml(u.fullName)}</strong><br/><span style="color:var(--text-muted)">@${escapeHtml(u.username)}</span></td>
          <td>${escapeHtml(u.email)}</td>
          <td>${u.role === "ADMIN" ? '<span class="badge badge-admin">Admin</span>' : "User"}</td>
          <td>${u.totalUploads}</td>
          <td>${u.totalDownloads}</td>
          <td>${u.followerCount}</td>
          <td>${formatDate(u.joinedAt)}</td>
          <td>${u.isBanned ? '<span class="badge badge-banned">Banned</span>' : '<span class="badge badge-active">Active</span>'}</td>
          <td>
            <div class="row-actions">
              <button class="action-btn ${u.isBanned ? "success" : "danger"}" data-ban-user="${u.id}" data-banned="${u.isBanned}">
                ${u.isBanned ? "Unban" : "Ban"}
              </button>
            </div>
          </td>
        </tr>`
          )
          .join("")
      : `<tr class="empty-row"><td colspan="9">No users found.</td></tr>`;

    renderPagination("users-pagination", data, loadUsers);
  } catch (err) {
    toast(err.message, "error");
  }
}

document.getElementById("users-tbody").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-ban-user]");
  if (!btn) return;
  const userId = btn.dataset.banUser;
  const currentlyBanned = btn.dataset.banned === "true";
  try {
    await api(`/api/admin/users/${userId}/ban`, {
      method: "PATCH",
      body: JSON.stringify({ banned: !currentlyBanned }),
    });
    toast(currentlyBanned ? "User unbanned" : "User banned", "success");
    loadUsers(state.usersPage);
  } catch (err) {
    toast(err.message, "error");
  }
});

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

document.getElementById("content-visibility-filter").addEventListener("change", () => loadContent(1));

async function loadContent(page) {
  state.contentPage = page;
  const visibility = document.getElementById("content-visibility-filter").value;
  const qs = new URLSearchParams({ page, limit: 20 });
  if (visibility) qs.set("visibility", visibility);

  try {
    const data = await api(`/api/admin/statuses?${qs}`);
    const tbody = document.getElementById("content-tbody");
    tbody.innerHTML = data.items.length
      ? data.items
          .map(
            (s) => `
        <tr>
          <td><strong>${escapeHtml(s.title)}</strong></td>
          <td>${s.type}</td>
          <td>${escapeHtml(s.category)}</td>
          <td>@${escapeHtml(s.creatorUsername)}</td>
          <td>${visibilityBadge(s.visibility)}</td>
          <td>${s.isFeatured ? "⭐" : "—"}</td>
          <td>${s.downloadCount}</td>
          <td>${s.viewCount}</td>
          <td>
            <div class="row-actions">
              ${s.visibility !== "PUBLISHED" ? `<button class="action-btn success" data-moderate="${s.id}" data-visibility="PUBLISHED">Approve</button>` : ""}
              ${s.visibility !== "REJECTED" ? `<button class="action-btn danger" data-moderate="${s.id}" data-visibility="REJECTED">Reject</button>` : ""}
              ${s.visibility !== "REMOVED" ? `<button class="action-btn danger" data-moderate="${s.id}" data-visibility="REMOVED">Remove</button>` : ""}
              <button class="action-btn" data-feature="${s.id}" data-featured="${s.isFeatured}">${s.isFeatured ? "Unfeature" : "Feature"}</button>
              <button class="action-btn danger" data-delete="${s.id}">Delete</button>
            </div>
          </td>
        </tr>`
          )
          .join("")
      : `<tr class="empty-row"><td colspan="9">No content matches this filter.</td></tr>`;

    renderPagination("content-pagination", data, loadContent);
  } catch (err) {
    toast(err.message, "error");
  }
}

document.getElementById("content-tbody").addEventListener("click", async (e) => {
  const moderateBtn = e.target.closest("[data-moderate]");
  const featureBtn = e.target.closest("[data-feature]");
  const deleteBtn = e.target.closest("[data-delete]");

  try {
    if (moderateBtn) {
      await api(`/api/admin/statuses/${moderateBtn.dataset.moderate}`, {
        method: "PATCH",
        body: JSON.stringify({ visibility: moderateBtn.dataset.visibility }),
      });
      toast(`Status set to ${moderateBtn.dataset.visibility}`, "success");
      loadContent(state.contentPage);
    } else if (featureBtn) {
      const currentlyFeatured = featureBtn.dataset.featured === "true";
      await api(`/api/admin/statuses/${featureBtn.dataset.feature}`, {
        method: "PATCH",
        body: JSON.stringify({ isFeatured: !currentlyFeatured }),
      });
      toast(currentlyFeatured ? "Unfeatured" : "Featured", "success");
      loadContent(state.contentPage);
    } else if (deleteBtn) {
      if (!confirm("Permanently delete this status? This can't be undone.")) return;
      await api(`/api/admin/statuses/${deleteBtn.dataset.delete}`, { method: "DELETE" });
      toast("Status deleted", "success");
      loadContent(state.contentPage);
    }
  } catch (err) {
    toast(err.message, "error");
  }
});

function visibilityBadge(v) {
  const map = { PUBLISHED: "published", PENDING: "pending", REJECTED: "rejected", REMOVED: "removed" };
  return `<span class="badge badge-${map[v] || "pending"}">${v}</span>`;
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

document.getElementById("reports-state-filter").addEventListener("change", () => loadReports(1));

async function loadReports(page) {
  state.reportsPage = page;
  const stateFilter = document.getElementById("reports-state-filter").value;
  const qs = new URLSearchParams({ page, limit: 20 });
  if (stateFilter) qs.set("state", stateFilter);

  try {
    const data = await api(`/api/admin/reports?${qs}`);
    const tbody = document.getElementById("reports-tbody");
    tbody.innerHTML = data.items.length
      ? data.items
          .map(
            (r) => `
        <tr>
          <td><strong>${escapeHtml(r.status.title)}</strong><br/><span style="color:var(--text-muted)">${r.status.visibility}</span></td>
          <td>${r.reason}</td>
          <td>${escapeHtml(r.details || "—")}</td>
          <td>@${escapeHtml(r.reporterUsername)}</td>
          <td>${reportBadge(r.state)}</td>
          <td>${formatDate(r.createdAt)}</td>
          <td>
            <div class="row-actions">
              ${r.state !== "REVIEWED" ? `<button class="action-btn success" data-report="${r.id}" data-state="REVIEWED">Mark Reviewed</button>` : ""}
              ${r.state !== "DISMISSED" ? `<button class="action-btn" data-report="${r.id}" data-state="DISMISSED">Dismiss</button>` : ""}
            </div>
          </td>
        </tr>`
          )
          .join("")
      : `<tr class="empty-row"><td colspan="7">No reports here.</td></tr>`;

    renderPagination("reports-pagination", data, loadReports);
  } catch (err) {
    toast(err.message, "error");
  }
}

document.getElementById("reports-tbody").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-report]");
  if (!btn) return;
  try {
    await api(`/api/admin/reports/${btn.dataset.report}`, {
      method: "PATCH",
      body: JSON.stringify({ state: btn.dataset.state }),
    });
    toast("Report updated", "success");
    loadReports(state.reportsPage);
  } catch (err) {
    toast(err.message, "error");
  }
});

function reportBadge(s) {
  const map = { OPEN: "open", REVIEWED: "reviewed", DISMISSED: "dismissed" };
  return `<span class="badge badge-${map[s] || "open"}">${s}</span>`;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

async function loadCategories() {
  try {
    const { categories } = await api("/api/admin/categories");
    const tbody = document.getElementById("categories-tbody");
    tbody.innerHTML = categories.length
      ? categories
          .map(
            (c) => `
        <tr>
          <td style="font-size:18px">${c.emoji || ""}</td>
          <td><strong>${escapeHtml(c.label)}</strong></td>
          <td>${escapeHtml(c.key)}</td>
          <td>${c.sortOrder}</td>
          <td>${c.statusCount}</td>
          <td></td>
        </tr>`
          )
          .join("")
      : `<tr class="empty-row"><td colspan="6">No categories yet.</td></tr>`;
  } catch (err) {
    toast(err.message, "error");
  }
}

document.getElementById("category-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const key = document.getElementById("category-key").value.trim();
  const label = document.getElementById("category-label").value.trim();
  const emoji = document.getElementById("category-emoji").value.trim();
  const sortOrder = Number(document.getElementById("category-sort").value) || 0;

  try {
    await api("/api/admin/categories", {
      method: "POST",
      body: JSON.stringify({ key, label, emoji: emoji || undefined, sortOrder }),
    });
    toast("Category added", "success");
    e.target.reset();
    document.getElementById("category-sort").value = "0";
    loadCategories();
  } catch (err) {
    toast(err.message, "error");
  }
});

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function renderPagination(elementId, data, loadFn) {
  const el = document.getElementById(elementId);
  if (data.totalPages <= 1) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = `
    <button ${data.page <= 1 ? "disabled" : ""} id="${elementId}-prev">← Prev</button>
    <span>Page ${data.page} of ${data.totalPages} (${data.total} total)</span>
    <button ${data.page >= data.totalPages ? "disabled" : ""} id="${elementId}-next">Next →</button>
  `;
  document.getElementById(`${elementId}-prev`)?.addEventListener("click", () => loadFn(data.page - 1));
  document.getElementById(`${elementId}-next`)?.addEventListener("click", () => loadFn(data.page + 1));
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// ---------------------------------------------------------------------------
// Boot: try to resume a session if a token is already stored
// ---------------------------------------------------------------------------

(async function boot() {
  if (!state.token) return showLogin();
  try {
    const { user } = await api("/api/users/me");
    if (user.role !== "ADMIN") throw new Error("Not an admin account");
    state.me = user;
    document.getElementById("admin-whoami").textContent = `${user.fullName} · @${user.username}`;
    showDashboard();
    loadOverview();
  } catch {
    logout();
  }
})();
