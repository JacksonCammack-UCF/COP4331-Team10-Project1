const isTestPath = location.pathname.startsWith("/test/");
const urlBase = `${location.origin}${isTestPath ? "/test/LAMPAPI" : "/LAMPAPI"}`;
const extension = "php";

let userId = 0;
let firstName = "";
let lastName  = "";
const NEXT_PAGE = "contacts.html";

const $ = (id) => document.getElementById(id);
const setText = (id, txt) => { const el = $(id); if (el) el.textContent = txt ?? ""; };
function setAlert(id, type, msg) {
  const el = $(id);
  if (!el) return;
  el.className = type === "success" ? "text-success"
             : type === "danger"  ? "text-danger"
             : "text-muted";
  el.textContent = msg || "";
}
function escapeHTML(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function postJSON(path, body = {}) {
  return fetch(`${urlBase}/${path}.${extension}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body)
  }).then(async (res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const txt = await res.text();
    if (!txt) return {};
    try { return JSON.parse(txt); } catch { return {}; }
  });
}

function doLogin() {
  userId = 0; firstName = ""; lastName = "";
  const login = $("loginName")?.value?.trim() || "";
  const password = $("loginPassword")?.value || "";
  setAlert("loginResult", "", "");
  if (!login || !password) { setAlert("loginResult", "danger", "Enter username and password."); return; }

  postJSON("Login", { login, password })
    .then((json) => {
      const id = Number(json.id || 0);
      if (id < 1) { setAlert("loginResult", "danger", "User/Password combination incorrect"); return; }
      userId = id;
      firstName = json.firstName || "";
      lastName  = json.lastName  || "";
      saveCookie();
      window.location.href = NEXT_PAGE;
    })
    .catch((e) => setAlert("loginResult", "danger", e.message || "Login failed"));
}

function saveCookie() {
  const minutes = 20;
  const d = new Date();
  d.setTime(d.getTime() + minutes * 60 * 1000);
  document.cookie =
    "firstName=" + encodeURIComponent(firstName) +
    ",lastName=" + encodeURIComponent(lastName) +
    ",userId=" + encodeURIComponent(userId) +
    ";expires=" + d.toGMTString() + ";path=/";
}

function readCookie() {
  userId = -1;
  const parts = (document.cookie || "").split(",");
  for (let i = 0; i < parts.length; i++) {
    const [k, ...rest] = parts[i].trim().split("=");
    const v = decodeURIComponent(rest.join("="));
    if (k === "firstName") firstName = v;
    else if (k === "lastName") lastName = v;
    else if (k === "userId") userId = parseInt(v) || -1;
  }
  if (userId < 0) { window.location.href = "index.html"; return; }
  const u = $("userName"); if (u) u.textContent = `Logged in as ${firstName} ${lastName}`;
}

function doLogout() {
  userId = 0; firstName = ""; lastName = "";
  document.cookie = "firstName=; expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
  window.location.href = "index.html";
}

const validEmail = (s) => !s || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
const validPhone = (s) => !s || /^[0-9+\-() ]{7,20}$/.test(s);

function addContact() {
  setAlert("contactAddResult", "", "");
  const f = $("firstName")?.value?.trim() || "";
  const l = $("lastName") ?.value?.trim() || "";
  const e = $("email")    ?.value?.trim() || "";
  const p = $("phone")    ?.value?.trim() || "";

  if (!f || !l)       { setAlert("contactAddResult", "danger", "First and Last are required."); return; }
  if (!validEmail(e)) { setAlert("contactAddResult", "danger", "Invalid email."); return; }
  if (!validPhone(p)) { setAlert("contactAddResult", "danger", "Invalid phone."); return; }
  if (userId < 1)     { setAlert("contactAddResult", "danger", "Not authenticated."); return; }

  const body = { firstName: f, lastName: l, email: e, phone: p, userID: userId };

  postJSON("AddContact", body)
    .then((json) => {
      if (json && json.error) { setAlert("contactAddResult", "danger", json.error); return; }
      setAlert("contactAddResult", "success", "Contact has been added");
      ["firstName","lastName","email","phone"].forEach(id => { const el = $(id); if (el) el.value = ""; });
      searchContacts(); 
    })
    .catch((e) => setAlert("contactAddResult", "danger", e.message || "Add failed"));
}

let searchTimer = null;
function debouncedSearch(ms = 250) { clearTimeout(searchTimer); searchTimer = setTimeout(searchContacts, ms); }

function searchContacts() {
  const q = $("search")?.value?.trim() ?? "";
  const limit  = parseInt($("limitSelect")?.value || "10", 10) || 10;
  const offset = 0;

  if (userId < 1) { setAlert("contactSearchResult", "danger", "Not authenticated."); return; }
  setAlert("contactSearchResult", "muted", "Searching...");

  postJSON("SearchContacts", { search: q, userID: userId, limit, offset })
    .then((json) => {
      let rows = [];
      if (Array.isArray(json.results)) rows = json.results;
      else if (Array.isArray(json.Contacts)) rows = json.Contacts;
      else if (Array.isArray(json.contacts)) rows = json.contacts;
      else if (json && typeof json === "object") {
        if (json.error && (!json.id || Number(json.id) === 0)) rows = [];
        else if ("id" in json || "ID" in json || "Id" in json) rows = [json];
      }

      renderResults(rows);

      const total = $("totalCount");
      if (total) total.textContent = String(json.total ?? (Array.isArray(rows) ? rows.length : 0));

      if (rows.length) setAlert("contactSearchResult", "muted", "Contact(s) have been retrieved");
      else setAlert("contactSearchResult", "danger", json.error || "No contacts found");
    })
    .catch((e) => setAlert("contactSearchResult", "danger", e.message || "Search failed"));
}

function renderResults(rows) {
  const tbody = $("resultsBody");
  if (!tbody) return;
  if (!Array.isArray(rows) || rows.length === 0) { tbody.innerHTML = ""; return; }

  tbody.innerHTML = rows.map((r) => {
    if (typeof r === "string")
      return `<tr><td colspan="4">${escapeHTML(r)}</td><td class="text-end"></td></tr>`;

    const id = Number(r.id ?? r.ID ?? r.Id) || 0;
    const fn = r.firstName ?? r.FirstName ?? "";
    const ln = r.lastName  ?? r.LastName  ?? "";
    const em = r.email     ?? r.Email     ?? "";
    const ph = r.phone     ?? r.Phone     ?? "";

    return `
      <tr>
        <td>${escapeHTML(fn)}</td>
        <td>${escapeHTML(ln)}</td>
        <td>${escapeHTML(em)}</td>
        <td>${escapeHTML(ph)}</td>
        <td class="text-end">
          ${id ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteContact(${id})">Delete</button>` : ""}
        </td>
      </tr>
    `;
  }).join("");
}

function deleteContact(id) {
  if (!id) return;
  if (!confirm("Delete this contact?")) return;
  if (userId < 1) { alert("Not authenticated."); return; }

  postJSON("DeleteContact", { ID: id, userID: userId })
    .then((json) => {
      if (json && json.error) { alert(json.error); return; }
      searchContacts();
    })
    .catch((e) => alert(e.message || "Delete failed"));
}

function updateContact(id, updates) {
  if (!id) return;
  if (userId < 1) { alert("Not authenticated."); return; }
  const u = updates || {};
  const body = {
    ID: id,
    userID: userId,
    ...(u.firstName != null ? { firstName: String(u.firstName).trim() } : {}),
    ...(u.lastName  != null ? { lastName:  String(u.lastName).trim()  } : {}),
    ...(u.email     != null ? { email:     String(u.email).trim()     } : {}),
    ...(u.phone     != null ? { phone:     String(u.phone).trim()     } : {})
  };
  postJSON("UpdateContact", body)
    .then((json) => {
      if (json && json.error) { alert(json.error); return; }
      searchContacts();
    })
    .catch((e) => console.error(e));
}

function doRegister() {
  const f = $("regFirstName")?.value?.trim() || "";
  const l = $("regLastName") ?.value?.trim() || "";
  const login = $("regUsername") ?.value?.trim() || "";
  const password = $("regPassword") ?.value || "";

  if (!f || !l || !login || !password) { setAlert("registerResult", "danger", "Please fill in all fields."); return; }

  postJSON("Register", { firstName: f, LastName: l, login: login, password: password })
    .then((json) => {
      if (json && json.error) { setAlert("registerResult", "danger", json.error); return; }
      setAlert("registerResult", "success", "Account created! You can now log in.");
      setTimeout(() => { window.location.href = "index.html"; }, 900);
    })
    .catch((e) => setAlert("registerResult", "danger", e.message || "Registration failed"));
}

window.doLogin = doLogin;
window.readCookie = readCookie;
window.doLogout = doLogout;
window.addContact = addContact;
window.searchContacts = searchContacts;
window.deleteContact = deleteContact;
window.updateContact = updateContact;
window.doRegister = doRegister;
window.debouncedSearch = debouncedSearch;
