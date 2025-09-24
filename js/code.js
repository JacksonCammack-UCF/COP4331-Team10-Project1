// written with spacing for readability. code.min.js is on the server
const isTestPath = location.pathname.startsWith("/test/");
const urlBase = `${location.origin}${isTestPath ? "/test/LAMPAPI" : "/LAMPAPI"}`;
const extension = "php";

let userId = 0;
let firstName = "";
let lastName = "";
let editingId = null;

const NEXT_PAGE = "contacts.html";

const $ = (elementId) => document.getElementById(elementId);

const setText = (elementId, text) => {
  const element = $(elementId);
  if (element) {
    element.textContent = text ?? "";
  }
};

function setAlert(elementId, status, message) {
  const element = $(elementId);
  if (!element) return;

  element.className =
    status === "success"
      ? "text-success"
      : status === "danger"
      ? "text-danger"
      : "text-muted";

  element.textContent = message || "";
}

function escapeHTML(str) {
  return String(str ?? "")
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
    body: JSON.stringify(body),
  }).then(async (response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await response.text();
    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  });
}

function doLogin() {
  userId = 0;
  firstName = "";
  lastName = "";

  const loginName = $("loginName")?.value?.trim() || "";
  const password = $("loginPassword")?.value || "";

  setAlert("loginResult", "", "");

  if (!loginName || !password) {
    setAlert("loginResult", "danger", "Enter username and password.");
    return;
  }

  postJSON("Login", { login: loginName, password })
    .then((json) => {
      const id = Number(json.id || 0);
      if (id < 1) {
        setAlert("loginResult", "danger", "User/Password combination incorrect");
        return;
      }

      userId = id;
      firstName = json.firstName || "";
      lastName = json.lastName || "";

      saveCookie();
      window.location.href = NEXT_PAGE;
    })
    .catch((event) => setAlert("loginResult", "danger", event.message || "Login failed"));
}

function saveCookie() {
  const TTL_MIN = 20;
  const payload = {
    userId,
    firstName,
    lastName,
    expires: Date.now() + TTL_MIN * 60 * 1000
  };
  try {
    localStorage.setItem("user", JSON.stringify(payload));
  } catch (_) {
  }
}

function readCookie() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) { userId = 0; firstName = ""; lastName = ""; return; }
    const data = JSON.parse(raw) || {};
    if (data.expires && Date.now() > data.expires) {
      localStorage.removeItem("user");
      userId = 0; firstName = ""; lastName = "";
      return;
    }
    userId   = Number(data.userId) || 0;
    firstName = data.firstName || "";
    lastName  = data.lastName  || "";
  } catch (_) {
    userId = 0; firstName = ""; lastName = "";
  }
}

function doLogout() {
  userId = 0; firstName = ""; lastName = "";
  try { localStorage.removeItem("user"); } catch (_) {}
  window.location.href = "index.html";
}


const validEmail = (value) => !value || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
const validPhone = (value) => !value || /^[0-9]{7,20}$/.test(value);

function addContact() {
  setAlert("addResult", "", "");

  const first = $("firstName")?.value?.trim() || "";
  const last = $("lastName")?.value?.trim() || "";
  const email = $("email")?.value?.trim() || "";
  const phone = $("phone")?.value?.trim() || "";

  if (!first || !last) {
    setAlert("addResult", "danger", "First and Last are required.");
    return;
  }
  if (!validEmail(email)) {
    setAlert("addResult", "danger", "Invalid email.");
    return;
  }
  if (!validPhone(phone)) {
    setAlert("addResult", "danger", "Invalid phone.");
    return;
  }
  if (userId < 1) {
    setAlert("addResult", "danger", "Not authenticated.");
    return;
  }

  const body = { firstName: first, lastName: last, email: email, phone: phone, userID: userId };

  postJSON("AddContact", body)
    .then((json) => {
      if (json && json.error) {
        setAlert("addResult", "danger", json.error);
        return;
      }
      setAlert("addResult", "success", "Contact has been added");
      ["firstName", "lastName", "email", "phone"].forEach((id) => {
        const element = $(id);
        if (element) element.value = "";
      });
      searchContacts();
    })
    .catch((event) => setAlert("addResult", "danger", event.message || "Add failed"));
}

let searchTimer = null;

function debouncedSearch(delayMs = 250) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(searchContacts, delayMs);
}

function searchContacts() {
  const searchQuery = $("search")?.value?.trim() ?? "";
  const limit = parseInt($("limitSelect")?.value || "10", 10) || 10;
  const offset = 0;

  if (userId < 1) {
    setAlert("contactSearchResult", "danger", "Not authenticated.");
    return;
  }

  setAlert("contactSearchResult", "muted", "Searching...");

  postJSON("SearchContacts", { search: searchQuery, userID: userId, limit, offset })
    .then((json) => {
      let rows = [];

      if (Array.isArray(json.results)) rows = json.results;
      else if (Array.isArray(json.Contacts)) rows = json.Contacts;
      else if (Array.isArray(json.contacts)) rows = json.contacts;
      else if (json && typeof json === "object") {
        if (json.error && (!json.id || Number(json.id) === 0)) {
          rows = [];
        } else if ("id" in json || "ID" in json || "Id" in json) {
          rows = [json];
        }
      }

      renderResults(rows);

      const total = $("totalCount");
      if (total) {
        total.textContent = String(json.total ?? (Array.isArray(rows) ? rows.length : 0));
      }

      if (rows.length) {
        setAlert("contactSearchResult", "muted", "Contact(s) have been retrieved");
      } else {
        setAlert("contactSearchResult", "danger", json.error || "No contacts found");
      }
    })
    .catch((event) => setAlert("contactSearchResult", "danger", event.message || "Search failed"));
}

function renderResults(rows) {
  const tbody = $("resultsBody");
  if (!tbody) return;

  if (!Array.isArray(rows) || rows.length === 0) {
    tbody.innerHTML = "";
    return;
  }

  tbody.innerHTML = rows
    .map((row) => {
      if (typeof row === "string") {
        return `<tr>
          <td colspan="3">${escapeHTML(row)}</td>
          <td class="text-end"></td>
        </tr>`;
      }

      const id = Number(row.id ?? row.ID ?? row.Id) || 0;
      const first = row.firstName ?? row.FirstName ?? "";
      const last = row.lastName ?? row.LastName ?? "";
      const email = row.email ?? row.Email ?? "";
      const phone = row.phone ?? row.Phone ?? "";
      const name = `${first} ${last}`.trim();

      const isEditing = id && editingId === id;

      // Name column
      const nameCell = isEditing
        ? `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
             <input id="fn-${id}" value="${escapeHTML(first)}" placeholder="First name" />
             <input id="ln-${id}" value="${escapeHTML(last)}"  placeholder="Last name" />
           </div>`
        : escapeHTML(name);

      // Email column
      const emailCell = isEditing
        ? `<input id="em-${id}" value="${escapeHTML(email)}" placeholder="Email" />`
        : escapeHTML(email);

      // Phone column
      const phoneCell = isEditing
        ? `<input id="ph-${id}" value="${escapeHTML(phone)}" placeholder="Phone" inputmode="numeric" pattern="[0-9]*"
                  oninput="this.value=this.value.replace(/[^0-9]/g,'');" />`
        : escapeHTML(phone);

      // Actions column
      let actions = "";
      if (id) {
        actions = isEditing
          ? `<button class="action-btn" onclick="saveRowEdit(${id})">Save</button>
             <button class="action-btn secondary" onclick="cancelRowEdit()">Cancel</button>`
          : `<button class="action-btn secondary" data-first="${escapeHTML(first)}" data-last="${escapeHTML(last)}" data-email="${escapeHTML(email)}" data-phone="${escapeHTML(phone)}" onclick="enterRowEdit(${id})">Edit</button>
             <span class="danger-text" onclick="deleteContact(${id})">Delete</span>`;
      }

      return `
        <tr>
          <td>${nameCell}</td>
          <td>${emailCell}</td>
          <td>${phoneCell}</td>
          <td class="text-end">${actions}</td>
        </tr>
      `;
    })
    .join("");
}

function enterRowEdit(id) {
  editingId = id;
  searchContacts();
}

function cancelRowEdit() {
  editingId = null;
  searchContacts();
}

function saveRowEdit(id) {
  if (userId < 1) {
    alert("Not authenticated.");
    return;
  }
  if (!id) {
    alert("Missing contact id.");
    return;
  }

  const first = document.getElementById(`fn-${id}`)?.value.trim() || "";
  const last = document.getElementById(`ln-${id}`)?.value.trim() || "";
  const email = document.getElementById(`em-${id}`)?.value.trim() || "";
  const phone = document.getElementById(`ph-${id}`)?.value.trim() || "";

  if (!first || !last) {
    alert("First and Last are required.");
    return;
  }
  if (!validEmail(email)) {
    alert("Invalid email.");
    return;
  }
  if (!validPhone(phone)) {
    alert("Invalid phone.");
    return;
  }

  const body = { id, userID: userId, firstName: first, lastName: last, email, phone };

  postJSON("UpdateContact", body)
    .then((json) => {
      if (json && json.error) {
        alert(json.error);
        return;
      }
      editingId = null;
      searchContacts();
    })
    .catch((event) => alert(event.message || "Update failed"));
}

function deleteContact(id) {
  if (!id) return;
  if (!confirm("Delete this contact?")) return;

  if (userId < 1) {
    alert("Not authenticated.");
    return;
  }

  const body = {
    id: id,
    ID: id,
    userID: userId,
    UserID: userId,
  };

  postJSON("DeleteContact", body)
    .then((json) => {
      if (json && json.error) {
        alert(json.error);
        return;
      }
      searchContacts();
    })
    .catch((error) => alert(error.message || "Delete failed"));
}

function editContact(btn, id) {
  if (userId < 1) {
    alert("Not authenticated.");
    return;
  }
  if (!id) return;

  const curFirst = btn?.dataset?.first || "";
  const curLast = btn?.dataset?.last || "";
  const curEmail = btn?.dataset?.email || "";
  const curPhone = btn?.dataset?.phone || "";

  const first = (prompt("Enter first name:", curFirst) ?? "").trim();
  const last = (prompt("Enter last name:", curLast) ?? "").trim();
  const email = (prompt("Enter email:", curEmail) ?? "").trim();
  const phone = (prompt("Enter phone:", curPhone) ?? "").trim();

  if (!first || !last) {
    alert("First and Last are required.");
    return;
  }
  if (!validEmail(email)) {
    alert("Invalid email.");
    return;
  }
  if (!validPhone(phone)) {
    alert("Invalid phone.");
    return;
  }

  const body = { id, userID: userId, firstName: first, lastName: last, email, phone };

  postJSON("UpdateContact", body)
    .then((json) => {
      if (json && json.error) {
        alert(json.error);
        return;
      }
      searchContacts();
    })
    .catch((error) => console.error(error));
}

function doRegister() {
  const first = $("regFirstName")?.value?.trim() || "";
  const last = $("regLastName")?.value?.trim() || "";
  const login = $("regUsername")?.value?.trim() || "";
  const password = $("regPassword")?.value || "";

  setAlert("registerResult", "", "");

  if (!first || !last || !login || !password) {
    setAlert("registerResult", "danger", "Please fill in all fields.");
    return;
  }

  if (login.length < 2) {
    setAlert("registerResult", "danger", "Username must be at least 2 characters.");
    return;
  }

  if (password.length < 8) {
    setAlert("registerResult", "danger", "Password must be at least 8 characters.");
    return;
  }

  // why does this work
  const body = {
    firstName: first,
    lastName: last,
    login: login,
    password: password,
    FirstName: first,
    LastName: last,
    Login: login,
    Password: password,
  };

  postJSON("Register", body)
    .then((json) => {
      if (json && json.error) {
        setAlert("registerResult", "danger", json.error);
        return;
      }
      setAlert("registerResult", "success", "Account created! You can now log in.");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 900);
    })
    .catch((error) => setAlert("registerResult", "danger", error.message || "Registration failed"));
}

window.doLogin = doLogin;
window.readCookie = readCookie;
window.doLogout = doLogout;
window.addContact = addContact;
window.searchContacts = searchContacts;
window.deleteContact = deleteContact;
window.doRegister = doRegister;
window.debouncedSearch = debouncedSearch;
window.enterRowEdit = enterRowEdit;
window.cancelRowEdit = cancelRowEdit;
window.saveRowEdit = saveRowEdit;
