const STORAGE_KEY = "legalAnimeSubmissions.v1";

const views = document.querySelectorAll(".view");
const navButtons = document.querySelectorAll(".nav-btn");

const approvedGrid = document.getElementById("approvedGrid");
const pendingList = document.getElementById("pendingList");
const submitForm = document.getElementById("submitForm");
const submitStatus = document.getElementById("submitStatus");
const searchInput = document.getElementById("searchInput");
const clearAllButton = document.getElementById("clearAllButton");

const playerDialog = document.getElementById("playerDialog");
const playerTitle = document.getElementById("playerTitle");
const playerVideo = document.getElementById("playerVideo");
const closePlayerButton = document.getElementById("closePlayerButton");

let submissions = loadSubmissions();

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
      collection: "Pilot Collection",
      episode: "1",
      category: "Original Anime",
      license: "Original work by uploader",
      videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      coverUrl: "",
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

function switchView(viewId) {
  views.forEach(view => {
    view.classList.toggle("active", view.id === viewId);
  });

  navButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });
}

navButtons.forEach(button => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

function renderApproved() {
  const query = searchInput.value.trim().toLowerCase();

  const approved = submissions
    .filter(item => item.status === "approved")
    .filter(item => {
      if (!query) return true;

      const haystack = [
        item.title,
        item.creator,
        item.collection,
        item.category,
        item.description
      ].join(" ").toLowerCase();

      return haystack.includes(query);
    });

  if (approved.length === 0) {
    approvedGrid.innerHTML = `<div class="empty">No approved works yet.</div>`;
    return;
  }

  approvedGrid.innerHTML = approved.map(item => {
    const cover = item.coverUrl
      ? `<img src="${escapeHtml(item.coverUrl)}" alt="${escapeHtml(item.title)}">`
      : `<span>No cover</span>`;

    return `
      <article class="card">
        <div class="cover">${cover}</div>
        <div class="badge">${escapeHtml(item.category)}</div>
        <h3>${escapeHtml(item.title)}</h3>
        <div class="meta">
          ${escapeHtml(item.creator)}
          ${item.collection ? ` · ${escapeHtml(item.collection)}` : ""}
          ${item.episode ? ` · Episode ${escapeHtml(item.episode)}` : ""}
        </div>
        <p class="desc">${escapeHtml(item.description)}</p>
        <div class="actions">
          <button data-play="${escapeHtml(item.id)}">Watch</button>
          <a href="${escapeHtml(item.videoUrl)}" target="_blank" rel="noopener">Open</a>
        </div>
      </article>
    `;
  }).join("");

  approvedGrid.querySelectorAll("[data-play]").forEach(button => {
    button.addEventListener("click", () => {
      const item = submissions.find(video => video.id === button.dataset.play);
      openPlayer(item);
    });
  });
}

function renderPending() {
  const pending = submissions.filter(item => item.status === "pending");

  if (pending.length === 0) {
    pendingList.innerHTML = `<div class="empty">No pending submissions.</div>`;
    return;
  }

  pendingList.innerHTML = pending.map(item => `
    <div class="review-item">
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <div class="meta">
          ${escapeHtml(item.creator)}
          · ${escapeHtml(item.category)}
          · ${escapeHtml(item.license)}
        </div>
        <p class="desc">${escapeHtml(item.description)}</p>
        <p class="meta">Video URL: ${escapeHtml(item.videoUrl)}</p>
      </div>

      <div class="review-actions">
        <button class="approve" data-approve="${escapeHtml(item.id)}">Approve</button>
        <button class="reject" data-reject="${escapeHtml(item.id)}">Reject</button>
        <button data-preview="${escapeHtml(item.id)}">Preview</button>
      </div>
    </div>
  `).join("");

  pendingList.querySelectorAll("[data-approve]").forEach(button => {
    button.addEventListener("click", () => updateStatus(button.dataset.approve, "approved"));
  });

  pendingList.querySelectorAll("[data-reject]").forEach(button => {
    button.addEventListener("click", () => updateStatus(button.dataset.reject, "rejected"));
  });

  pendingList.querySelectorAll("[data-preview]").forEach(button => {
    button.addEventListener("click", () => {
      const item = submissions.find(video => video.id === button.dataset.preview);
      openPlayer(item);
    });
  });
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

function openPlayer(item) {
  if (!item) return;

  playerTitle.textContent = item.title;
  playerVideo.src = item.videoUrl;
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
  if (event.target === playerDialog) closePlayer();
});

submitForm.addEventListener("submit", event => {
  event.preventDefault();

  const license = document.getElementById("licenseInput").value;

  if (!license) {
    submitStatus.textContent = "Choose a license / rights claim.";
    return;
  }

  const item = {
    id: crypto.randomUUID(),
    status: "pending",
    title: document.getElementById("titleInput").value.trim(),
    creator: document.getElementById("creatorInput").value.trim(),
    collection: document.getElementById("collectionInput").value.trim(),
    episode: document.getElementById("episodeInput").value.trim(),
    category: document.getElementById("categoryInput").value,
    license,
    videoUrl: document.getElementById("videoUrlInput").value.trim(),
    coverUrl: document.getElementById("coverUrlInput").value.trim(),
    description: document.getElementById("descriptionInput").value.trim(),
    createdAt: new Date().toISOString()
  };

  submissions.unshift(item);
  saveSubmissions();

  submitForm.reset();
  submitStatus.textContent = "Submitted. It is now waiting for review.";

  renderAll();
  switchView("reviewView");
});

searchInput.addEventListener("input", renderApproved);

clearAllButton.addEventListener("click", () => {
  if (!confirm("Clear all local app data?")) return;

  localStorage.removeItem(STORAGE_KEY);
  submissions = seedData();
  saveSubmissions();
  renderAll();
});

function renderAll() {
  renderApproved();
  renderPending();
}

renderAll();