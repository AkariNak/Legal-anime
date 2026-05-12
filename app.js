const STORAGE_KEY = "legalAnimeSubmissions.v4";
const ADMIN_SESSION_KEY = "legalAnimeAdminUnlocked.v1";

// SHA-256 hash for: IdontLiketomatoes007!
// Prototype-only. This is not real production security.
const ADMIN_PASSWORD_HASH = "7e7db77c830c5c1b694dbe7a7e2567a36105475d7bf45c9fa4f1b3c132f98b3c";

const DB_NAME = "LegalAnimeAppFiles";
const DB_VERSION = 1;
const FILE_STORE = "files";

const ALLOWED_TAGS = [
  "action",
  "adventure",
  "romance",
  "comedy",
  "drama",
  "fantasy",
  "sci-fi",
  "horror",
  "mystery",
  "thriller",
  "slice-of-life",
  "supernatural",
  "mecha",
  "sports",
  "music",
  "psychological",
  "experimental",
  "short-film",
  "pilot",
  "student-film"
];

const views = document.querySelectorAll(".view");
const navButtons = document.querySelectorAll(".nav-btn");
const viewButtons = document.querySelectorAll("[data-view-button]");

const approvedGrid = document.getElementById("approvedGrid");
const pendingList = document.getElementById("pendingList");
const approvedAdminList = document.getElementById("approvedAdminList");
const rejectedAdminList = document.getElementById("rejectedAdminList");

const submitForm = document.getElementById("submitForm");
const submitStatus = document.getElementById("submitStatus");
const searchInput = document.getElementById("searchInput");
const tagFilter = document.getElementById("tagFilter");

const clearAllButton = document.getElementById("clearAllButton");
const adminLogin = document.getElementById("adminLogin");
const adminPanel = document.getElementById("adminPanel");
const adminPasswordInput = document.getElementById("adminPasswordInput");
const adminLoginButton = document.getElementById("adminLoginButton");
const adminLogoutButton = document.getElementById("adminLogoutButton");
const adminStatus = document.getElementById("adminStatus");

const playerDialog = document.getElementById("playerDialog");
const playerTitle = document.getElementById("playerTitle");
const playerVideo = document.getElementById("playerVideo");
const closePlayerButton = document.getElementById("closePlayerButton");

let submissions = loadSubmissions();
let activeObjectUrls = [];

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return [...new Uint8Array(hashBuffer)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function openFileDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(FILE_STORE)) {
        db.createObjectStore(FILE_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveBlob(blob) {
  const id = crypto.randomUUID();
  const db = await openFileDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, "readwrite");

    tx.objectStore(FILE_STORE).put(blob, id);

    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

async function getBlob(id) {
  if (!id) return null;

  const db = await openFileDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, "readonly");
    const request = tx.objectStore(FILE_STORE).get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function deleteBlob(id) {
  if (!id) return;

  const db = await openFileDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, "readwrite");

    tx.objectStore(FILE_STORE).delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function revokeObjectUrls() {
  activeObjectUrls.forEach(url => URL.revokeObjectURL(url));
  activeObjectUrls = [];
}

async function blobUrlFromId(id) {
  const blob = await getBlob(id);

  if (!blob) return "";

  const url = URL.createObjectURL(blob);
  activeObjectUrls.push(url);

  return url;
}

function loadSubmissions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : seedData();
  } catch {
    return seedData();
  }
}

function saveSubmissions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions, null, 2));
}

function seedData() {
  return [
    {
      id: crypto.randomUUID(),
      status: "approved",
      title: "Sample Indie Animation",
      creator: "Example Creator",
      creatorBio: "Independent animator exploring short-form anime storytelling.",
      creatorWebsite: "",
      socialLink: "",
      supportLink: "",
      collection: "Pilot Collection",
      episode: "1",
      projectStatus: "Pilot",
      releaseYear: "2026",
      runtime: "2 min",
      category: "Original Anime",
      license: "Original work by uploader",
      tags: ["pilot", "short-film"].filter(tag => ALLOWED_TAGS.includes(tag)),
      videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      videoBlobId: "",
      coverUrl: "",
      coverBlobId: "",
      description: "A sample approved video so the archive is not empty.",
      createdAt: new Date().toISOString()
    }
  ];
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value || "";
  return div.innerHTML;
}

function getSelectedTags() {
  return [...document.querySelectorAll('input[name="tag"]:checked')]
    .map(input => input.value)
    .filter(tag => ALLOWED_TAGS.includes(tag));
}

function formatTag(tag) {
  return String(tag)
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function isAdminUnlocked() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
}

function setAdminUnlocked(value) {
  if (value) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
  } else {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }
}

function switchView(viewId) {
  views.forEach(view => {
    view.classList.toggle("active", view.id === viewId);
  });

  navButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });

  if (viewId === "reviewView") {
    renderAdminState();
  }
}

navButtons.forEach(button => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

viewButtons.forEach(button => {
  button.addEventListener("click", () => switchView(button.dataset.viewButton));
});

function updateTagFilter() {
  const usedTags = new Set();

  submissions
    .filter(item => item.status === "approved")
    .forEach(item => {
      (item.tags || [])
        .filter(tag => ALLOWED_TAGS.includes(tag))
        .forEach(tag => usedTags.add(tag));
    });

  const currentValue = tagFilter.value;

  tagFilter.innerHTML = `<option value="">All tags</option>`;

  [...usedTags].sort().forEach(tag => {
    const option = document.createElement("option");
    option.value = tag;
    option.textContent = formatTag(tag);
    tagFilter.appendChild(option);
  });

  if ([...usedTags].includes(currentValue)) {
    tagFilter.value = currentValue;
  }
}

async function renderApproved() {
  revokeObjectUrls();
  updateTagFilter();

  const query = searchInput.value.trim().toLowerCase();
  const selectedTag = tagFilter.value;

  const approved = submissions
    .filter(item => item.status === "approved")
    .filter(item => {
      const cleanTags = (item.tags || []).filter(tag => ALLOWED_TAGS.includes(tag));

      const matchesTag = !selectedTag || cleanTags.includes(selectedTag);

      if (!matchesTag) return false;

      if (!query) return true;

      const haystack = [
        item.title,
        item.creator,
        item.creatorBio,
        item.collection,
        item.category,
        item.projectStatus,
        item.releaseYear,
        item.runtime,
        item.description,
        ...cleanTags.map(formatTag)
      ].join(" ").toLowerCase();

      return haystack.includes(query);
    });

  if (approved.length === 0) {
    approvedGrid.innerHTML = `<div class="empty">No matching curated works.</div>`;
    return;
  }

  const cards = [];

  for (const item of approved) {
    const coverSrc = item.coverBlobId
      ? await blobUrlFromId(item.coverBlobId)
      : item.coverUrl;

    const cover = coverSrc
      ? `<img src="${escapeHtml(coverSrc)}" alt="${escapeHtml(item.title)}">`
      : `<span>No cover</span>`;

    const tags = (item.tags || [])
      .filter(tag => ALLOWED_TAGS.includes(tag))
      .map(tag => `<span class="tag">${escapeHtml(formatTag(tag))}</span>`)
      .join("");

    const projectSpecs = [
      item.projectStatus,
      item.releaseYear,
      item.runtime
    ]
      .filter(Boolean)
      .map(value => `<span>${escapeHtml(value)}</span>`)
      .join("");

    const creatorLinks = [
      item.creatorWebsite ? `<a href="${escapeHtml(item.creatorWebsite)}" target="_blank" rel="noopener">Website</a>` : "",
      item.socialLink ? `<a href="${escapeHtml(item.socialLink)}" target="_blank" rel="noopener">Social</a>` : "",
      item.supportLink ? `<a href="${escapeHtml(item.supportLink)}" target="_blank" rel="noopener">Support</a>` : ""
    ].join("");

    const adminRemove = isAdminUnlocked()
      ? `<button class="remove" data-remove="${escapeHtml(item.id)}">Remove</button>`
      : "";

    cards.push(`
      <article class="card">
        <div class="cover">${cover}</div>

        <div class="badge">${escapeHtml(item.category)}</div>

        <h3>${escapeHtml(item.title)}</h3>

        <div class="meta">
          ${escapeHtml(item.creator)}
          ${item.collection ? ` · ${escapeHtml(item.collection)}` : ""}
          ${item.episode ? ` · Episode ${escapeHtml(item.episode)}` : ""}
        </div>

        ${item.creatorBio ? `<p class="meta">${escapeHtml(item.creatorBio)}</p>` : ""}

        <div class="project-specs">${projectSpecs}</div>

        <div class="tags">${tags}</div>

        <p class="desc">${escapeHtml(item.description)}</p>

        <div class="creator-links">${creatorLinks}</div>

        <div class="actions">
          <button data-play="${escapeHtml(item.id)}">Watch</button>
          <a href="#" data-open="${escapeHtml(item.id)}">Open</a>
          ${adminRemove}
        </div>
      </article>
    `);
  }

  approvedGrid.innerHTML = cards.join("");

  approvedGrid.querySelectorAll("[data-play]").forEach(button => {
    button.addEventListener("click", () => {
      const item = submissions.find(video => video.id === button.dataset.play);
      openPlayer(item);
    });
  });

  approvedGrid.querySelectorAll("[data-open]").forEach(link => {
    link.addEventListener("click", async event => {
      event.preventDefault();

      const item = submissions.find(video => video.id === link.dataset.open);
      const url = await getVideoSource(item);

      if (url) {
        window.open(url, "_blank", "noopener");
      }
    });
  });

  approvedGrid.querySelectorAll("[data-remove]").forEach(button => {
    button.addEventListener("click", () => removeSubmission(button.dataset.remove));
  });
}

async function getVideoSource(item) {
  if (!item) return "";

  if (item.videoBlobId) {
    return blobUrlFromId(item.videoBlobId);
  }

  return item.videoUrl || "";
}

async function renderList(container, items, type) {
  if (items.length === 0) {
    container.innerHTML = `<div class="empty">Nothing here.</div>`;
    return;
  }

  container.innerHTML = items.map(item => {
    const cleanTags = (item.tags || []).filter(tag => ALLOWED_TAGS.includes(tag));

    return `
      <div class="review-item">
        <div>
          <h3>${escapeHtml(item.title)}</h3>

          <div class="meta">
            ${escapeHtml(item.creator)}
            · ${escapeHtml(item.category)}
            · ${escapeHtml(item.license)}
            ${item.projectStatus ? ` · ${escapeHtml(item.projectStatus)}` : ""}
            ${item.releaseYear ? ` · ${escapeHtml(item.releaseYear)}` : ""}
            ${item.runtime ? ` · ${escapeHtml(item.runtime)}` : ""}
          </div>

          ${item.creatorBio ? `<p class="meta">${escapeHtml(item.creatorBio)}</p>` : ""}

          <div class="creator-links">
            ${item.creatorWebsite ? `<a href="${escapeHtml(item.creatorWebsite)}" target="_blank" rel="noopener">Website</a>` : ""}
            ${item.socialLink ? `<a href="${escapeHtml(item.socialLink)}" target="_blank" rel="noopener">Social</a>` : ""}
            ${item.supportLink ? `<a href="${escapeHtml(item.supportLink)}" target="_blank" rel="noopener">Support</a>` : ""}
          </div>

          <div class="tags">
            ${cleanTags.map(tag => `<span class="tag">${escapeHtml(formatTag(tag))}</span>`).join("")}
          </div>

          <p class="desc">${escapeHtml(item.description)}</p>

          <p class="meta">
            Source: ${item.videoBlobId ? "Uploaded file stored in this browser" : escapeHtml(item.videoUrl)}
          </p>
        </div>

        <div class="review-actions">
          ${type === "pending" ? `<button class="approve" data-approve="${escapeHtml(item.id)}">Approve</button>` : ""}
          ${type === "pending" ? `<button class="reject" data-reject="${escapeHtml(item.id)}">Reject</button>` : ""}
          ${type === "rejected" ? `<button class="approve" data-approve="${escapeHtml(item.id)}">Restore</button>` : ""}
          <button data-preview="${escapeHtml(item.id)}">Preview</button>
          <button class="remove" data-remove="${escapeHtml(item.id)}">Remove</button>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll("[data-approve]").forEach(button => {
    button.addEventListener("click", () => updateStatus(button.dataset.approve, "approved"));
  });

  container.querySelectorAll("[data-reject]").forEach(button => {
    button.addEventListener("click", () => updateStatus(button.dataset.reject, "rejected"));
  });

  container.querySelectorAll("[data-preview]").forEach(button => {
    button.addEventListener("click", () => {
      const item = submissions.find(video => video.id === button.dataset.preview);
      openPlayer(item);
    });
  });

  container.querySelectorAll("[data-remove]").forEach(button => {
    button.addEventListener("click", () => removeSubmission(button.dataset.remove));
  });
}

function renderAdminState() {
  const unlocked = isAdminUnlocked();

  adminLogin.classList.toggle("hidden", unlocked);
  adminPanel.classList.toggle("hidden", !unlocked);

  if (unlocked) {
    renderAdminLists();
  }
}

async function renderAdminLists() {
  await renderList(pendingList, submissions.filter(item => item.status === "pending"), "pending");
  await renderList(approvedAdminList, submissions.filter(item => item.status === "approved"), "approved");
  await renderList(rejectedAdminList, submissions.filter(item => item.status === "rejected"), "rejected");
}

function updateStatus(id, status) {
  submissions = submissions.map(item => {
    if (item.id !== id) return item;

    return {
      ...item,
      status,
      reviewedAt: new Date().toISOString()
    };
  });

  saveSubmissions();
  renderAll();
}

async function removeSubmission(id) {
  if (!isAdminUnlocked()) {
    alert("Admin access required.");
    return;
  }

  const item = submissions.find(video => video.id === id);

  if (!item) return;

  if (!confirm(`Remove "${item.title}" permanently from this local prototype?`)) {
    return;
  }

  await deleteBlob(item.videoBlobId);
  await deleteBlob(item.coverBlobId);

  submissions = submissions.filter(video => video.id !== id);

  saveSubmissions();
  renderAll();
}

async function openPlayer(item) {
  if (!item) return;

  const source = await getVideoSource(item);

  if (!source) {
    alert("No playable video source found.");
    return;
  }

  playerTitle.textContent = item.title;
  playerVideo.src = source;
  playerDialog.showModal();
}

function closePlayer() {
  playerVideo.pause();
  playerVideo.removeAttribute("src");
  playerVideo.load();
  playerDialog.close();
}

closePlayerButton.addEventListener("click", closePlayer);

playerDialog.addEventListener("click", event => {
  if (event.target === playerDialog) {
    closePlayer();
  }
});

submitForm.addEventListener("submit", async event => {
  event.preventDefault();

  const videoFile = document.getElementById("videoFileInput").files[0];
  const coverFile = document.getElementById("coverFileInput").files[0];
  const videoUrl = document.getElementById("videoUrlInput").value.trim();
  const coverUrl = document.getElementById("coverUrlInput").value.trim();
  const license = document.getElementById("licenseInput").value;
  const selectedTags = getSelectedTags();

  if (!license) {
    submitStatus.textContent = "Choose a license / rights claim.";
    return;
  }

  if (!videoFile && !videoUrl) {
    submitStatus.textContent = "Upload a video file or paste a hosted video URL.";
    return;
  }

  if (selectedTags.length === 0) {
    submitStatus.textContent = "Choose at least one tag.";
    return;
  }

  try {
    submitStatus.textContent = "Saving submission locally...";

    const videoBlobId = videoFile ? await saveBlob(videoFile) : "";
    const coverBlobId = coverFile ? await saveBlob(coverFile) : "";

    const item = {
      id: crypto.randomUUID(),
      status: "pending",
      title: document.getElementById("titleInput").value.trim(),
      creator: document.getElementById("creatorInput").value.trim(),
      creatorBio: document.getElementById("creatorBioInput").value.trim(),
      creatorWebsite: document.getElementById("creatorWebsiteInput").value.trim(),
      socialLink: document.getElementById("socialLinkInput").value.trim(),
      supportLink: document.getElementById("supportLinkInput").value.trim(),
      collection: document.getElementById("collectionInput").value.trim(),
      episode: document.getElementById("episodeInput").value.trim(),
      projectStatus: document.getElementById("projectStatusInput").value,
      releaseYear: document.getElementById("releaseYearInput").value.trim(),
      runtime: document.getElementById("runtimeInput").value.trim(),
      category: document.getElementById("categoryInput").value,
      license,
      tags: selectedTags,
      videoUrl,
      videoBlobId,
      coverUrl,
      coverBlobId,
      description: document.getElementById("descriptionInput").value.trim(),
      createdAt: new Date().toISOString()
    };

    submissions.unshift(item);
    saveSubmissions();

    submitForm.reset();
    submitStatus.textContent = "Submitted. It is now waiting for review.";

    renderAll();
    switchView("reviewView");
  } catch (error) {
    console.error(error);
    submitStatus.textContent = "Could not save this file locally. It may be too large for browser storage.";
  }
});

adminLoginButton.addEventListener("click", async () => {
  const enteredHash = await sha256(adminPasswordInput.value);

  if (enteredHash === ADMIN_PASSWORD_HASH) {
    setAdminUnlocked(true);
    adminPasswordInput.value = "";
    adminStatus.textContent = "";
    renderAdminState();
    renderApproved();
  } else {
    adminStatus.textContent = "Wrong password.";
  }
});

adminLogoutButton.addEventListener("click", () => {
  setAdminUnlocked(false);
  renderAdminState();
  renderApproved();
});

searchInput.addEventListener("input", renderApproved);
tagFilter.addEventListener("change", renderApproved);

clearAllButton.addEventListener("click", async () => {
  if (!isAdminUnlocked()) return;

  if (!confirm("Clear all local app data?")) return;

  for (const item of submissions) {
    await deleteBlob(item.videoBlobId);
    await deleteBlob(item.coverBlobId);
  }

  localStorage.removeItem(STORAGE_KEY);

  submissions = seedData();
  saveSubmissions();
  renderAll();
});

function renderAll() {
  renderApproved();
  renderAdminState();
}

renderAll();
