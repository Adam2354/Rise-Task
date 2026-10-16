document.addEventListener("DOMContentLoaded", () => {
  // =========================================
  // 1. SELECTOR ELEMENT HTML
  // =========================================

  const taskForm = document.getElementById("taskForm");
  const taskInput = document.getElementById("taskInput");
  const priorityInput = document.getElementById("priorityInput");
  const deadlineInput = document.getElementById("deadlineInput");

  const todoList = document.getElementById("todoList");
  const doneList = document.getElementById("doneList");
  const latePanel = document.getElementById("latePanel");
  const lateList = document.getElementById("lateList");
  const lateCount = document.getElementById("lateCount");

  const toast = document.getElementById("toast");
  const deleteAllBtn = document.getElementById("deleteAllBtn");

  const editProfileBtn = document.getElementById("editProfileBtn");
  const closeProfileBtn = document.getElementById("closeProfileBtn");
  const cancelProfileBtn = document.getElementById("cancelProfileBtn");

  const profileDialog = document.getElementById("profileDialog");
  const profileForm = document.getElementById("profileForm");

  // =========================================
  // 2. LOCAL STORAGE
  // =========================================

  const TASK_STORAGE_KEY = "rise-task-app-v1";
  const PROFILE_STORAGE_KEY = "rise-task-profile-v1";

  function loadTasks() {
    try {
      const savedTasks = JSON.parse(
        localStorage.getItem(TASK_STORAGE_KEY)
      );

      if (!Array.isArray(savedTasks)) return [];

      return savedTasks.map((task) => ({
        ...task,
        deadline: task.deadline || "",
        done: Boolean(task.done),
      }));
    } catch (error) {
      console.error("Gagal membaca data tugas:", error);
      return [];
    }
  }

  function saveTasks() {
    localStorage.setItem(
      TASK_STORAGE_KEY,
      JSON.stringify(tasks)
    );
  }

  function loadProfile() {
    try {
      return JSON.parse(
        localStorage.getItem(PROFILE_STORAGE_KEY)
      ) || {};
    } catch (error) {
      return {};
    }
  }

  function saveProfile(profile) {
    localStorage.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify(profile)
    );
  }

  let tasks = loadTasks();
  let profile = loadProfile();
  let toastTimer;
  const notifiedOverdueIds = new Set();

  // =========================================
  // 3. UTILITAS
  // =========================================

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      };

      return entities[character];
    });
  }

  function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }

  function formatDate(dateValue) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatDateTime(dateValue) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Deadline tidak valid";
    }

    return date.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function generateId() {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`;
  }

  // =========================================
  // 4. STATUS DEADLINE
  // =========================================

  function isOverdue(task) {
    if (task.done || !task.deadline) return false;

    const deadline = new Date(task.deadline).getTime();

    return !Number.isNaN(deadline) && deadline < Date.now();
  }

  function isDeadlineSoon(task) {
    if (task.done || !task.deadline || isOverdue(task)) {
      return false;
    }

    const deadline = new Date(task.deadline).getTime();
    const remainingTime = deadline - Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    return (
      !Number.isNaN(deadline) &&
      remainingTime <= twentyFourHours
    );
  }

  function getDeadlineHTML(task) {
    if (!task.deadline) {
      return `
        <div class="task-deadline">
          <span class="deadline-text no-deadline">
            Belum ada deadline
          </span>
        </div>
      `;
    }

    let statusBadge = "";

    if (isOverdue(task)) {
      statusBadge = `
        <span class="overdue-badge">OVERDUE</span>
      `;
    } else if (isDeadlineSoon(task)) {
      statusBadge = `
        <span class="deadline-soon-badge">SEGERA</span>
      `;
    }

    return `
      <div class="task-deadline">
        <span class="deadline-text">
          Deadline: ${escapeHTML(formatDateTime(task.deadline))}
        </span>
        ${statusBadge}
      </div>
    `;
  }

  // =========================================
  // 5. RENDER KARTU TUGAS
  // =========================================

  function createTaskCard(task) {
    const overdue = isOverdue(task);
    const card = document.createElement("article");

    card.className = "task-card";

    if (task.done) card.classList.add("is-done");
    if (overdue) card.classList.add("is-overdue");

    const priorityLabels = {
      low: "Rendah",
      medium: "Sedang",
      high: "Tinggi",
    };

    const priorityLabel =
      priorityLabels[task.priority] || "Sedang";

    const safeTitle = escapeHTML(task.title);
    const createdDate = formatDate(task.createdAt);

    card.innerHTML = `
      <div class="task-card-main">
        <label class="task-checkbox">
          <input
            type="checkbox"
            class="task-done-checkbox"
            ${task.done ? "checked" : ""}
            aria-label="Tandai ${safeTitle} sebagai selesai"
          >
          <span class="checkmark"></span>
        </label>

        <div class="task-content">
          <div class="task-heading">
            <h3 class="task-title">${safeTitle}</h3>

            <span class="priority-badge priority-${escapeHTML(
              task.priority || "medium"
            )}">
              ${priorityLabel}
            </span>
          </div>

          <p class="task-created">
            Dibuat: ${escapeHTML(createdDate)}
          </p>
        </div>

        <button
          type="button"
          class="delete-task-btn"
          aria-label="Hapus tugas ${safeTitle}"
          title="Hapus tugas"
        >
          &times;
        </button>
      </div>

      ${getDeadlineHTML(task)}
    `;

    const checkbox = card.querySelector(".task-done-checkbox");

    checkbox.addEventListener("change", () => {
      task.done = checkbox.checked;

      saveTasks();
      renderTasks();

      showToast(
        task.done
          ? "Tugas berhasil diselesaikan."
          : "Tugas dipindahkan ke daftar aktif."
      );
    });

    const deleteButton = card.querySelector(".delete-task-btn");

    deleteButton.addEventListener("click", () => {
      tasks = tasks.filter((item) => item.id !== task.id);

      saveTasks();
      renderTasks();

      showToast("Tugas berhasil dihapus.");
    });

    return card;
  }

  // =========================================
  // 6. RENDER SEMUA TUGAS
  // =========================================

  function renderTasks() {
    if (!todoList || !doneList) return;

    todoList.innerHTML = "";
    doneList.innerHTML = "";

    const activeTasks = tasks.filter((task) => !task.done);
    const completedTasks = tasks.filter((task) => task.done);

    activeTasks.sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;

      return (
        new Date(a.deadline).getTime() -
        new Date(b.deadline).getTime()
      );
    });

    activeTasks.forEach((task) => {
      todoList.appendChild(createTaskCard(task));
    });

    completedTasks.forEach((task) => {
      doneList.appendChild(createTaskCard(task));
    });

    renderLateTasks();
    updateTaskCounters();
  }

  
function renderLateTasks() {
  if (!latePanel || !lateList || !lateCount) return;

  const overdueTasks = tasks
    .filter((task) => isOverdue(task))
    .sort((a, b) => {
      return new Date(a.deadline) - new Date(b.deadline);
    });

  lateList.innerHTML = "";

  lateCount.textContent = `${overdueTasks.length} tugas`;
  latePanel.hidden = overdueTasks.length === 0;

  overdueTasks.forEach((task) => {
    const item = document.createElement("article");
    item.className = "late-item";

    const priorityLabels = {
      low: "Rendah",
      medium: "Sedang",
      high: "Tinggi",
    };

    const priority =
      priorityLabels[task.priority] || "Sedang";

    item.innerHTML = `
      <div class="late-item-info">
        <h3 class="late-item-title">
          ${escapeHTML(task.title)}
        </h3>

        <p class="late-item-meta">
          Deadline: ${escapeHTML(formatDateTime(task.deadline))}
          <br>
          Prioritas: ${priority}
        </p>

        <span class="late-item-badge">TERLAMBAT</span>
      </div>

      <button type="button" class="late-complete-btn">
        Selesaikan
      </button>
    `;

    item
      .querySelector(".late-complete-btn")
      .addEventListener("click", () => {
        task.done = true;

        saveTasks();
        renderTasks();
        showToast("Tugas terlambat ditandai selesai.");
      });

    lateList.appendChild(item);
  });
}


  function updateTaskCounters() {
    const activeCount = tasks.filter(
      (task) => !task.done
    ).length;

    const completedCount = tasks.filter(
      (task) => task.done
    ).length;

    const overdueCount = tasks.filter(
      (task) => isOverdue(task)
    ).length;

    const totalCounter = document.getElementById("totalCount");
    const todoCounter = document.getElementById("todoCount");
    const doneCounter = document.getElementById("doneCount");
    const todoPill = document.getElementById("todoPill");
    const donePill = document.getElementById("donePill");

    if (totalCounter) totalCounter.textContent = tasks.length;
    if (todoCounter) todoCounter.textContent = activeCount;
    if (doneCounter) doneCounter.textContent = completedCount;
    if (todoPill) todoPill.textContent = activeCount;
    if (donePill) donePill.textContent = completedCount;

    // Elemen ini opsional jika nanti ditambahkan ke HTML.
    const overdueCounter = document.getElementById("overdueCount");
    if (overdueCounter) overdueCounter.textContent = overdueCount;
  }

  // =========================================
  // 7. TAMBAH TUGAS
  // =========================================

  if (taskForm) {
    taskForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const title = taskInput ? taskInput.value.trim() : "";
      const priority = priorityInput
        ? priorityInput.value
        : "medium";

      const deadlineValue = deadlineInput
        ? deadlineInput.value
        : "";

      if (!title) {
        showToast("Nama tugas tidak boleh kosong.");
        taskInput?.focus();
        return;
      }

      let deadline = "";

      if (deadlineValue) {
        const deadlineDate = new Date(deadlineValue);

        if (Number.isNaN(deadlineDate.getTime())) {
          showToast("Format deadline tidak valid.");
          return;
        }

        if (deadlineDate.getTime() <= Date.now()) {
          showToast("Pilih deadline pada waktu yang akan datang.");
          deadlineInput?.focus();
          return;
        }

        deadline = deadlineDate.toISOString();
      }

      const newTask = {
        id: generateId(),
        title,
        priority,
        createdAt: new Date().toISOString(),
        deadline,
        done: false,
      };

      tasks.unshift(newTask);

      saveTasks();
      renderTasks();
      taskForm.reset();

      if (priorityInput) priorityInput.value = "medium";

      taskInput?.focus();
      showToast("Tugas berhasil ditambahkan.");
    });
  }

  // =========================================
  // 8. HAPUS SEMUA TUGAS
  // =========================================

  if (deleteAllBtn) {
    deleteAllBtn.addEventListener("click", () => {
      if (tasks.length === 0) {
        showToast("Belum ada tugas untuk dihapus.");
        return;
      }

      const confirmed = window.confirm(
        "Apakah kamu yakin ingin menghapus semua tugas?"
      );

      if (!confirmed) return;

      tasks = [];

      saveTasks();
      renderTasks();

      showToast("Semua tugas berhasil dihapus.");
    });
  }

  // =========================================
  // 9. PROFIL PENGGUNA
  // =========================================

  function updateProfileDisplay() {
    const nameElement = document.getElementById("profileName");
    const roleElement = document.getElementById("profileRole");
    const avatarElements = document.querySelectorAll(
      ".profile-avatar, .avatar"
    );

    const name = profile.name || "Raka Nugraha";
    const role = profile.role || "Project Manager";

    if (nameElement) nameElement.textContent = name;
    if (roleElement) roleElement.textContent = role;

    const initials = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "RN";

    avatarElements.forEach((element) => {
      element.textContent = initials;
    });

    const nameInput = document.getElementById("nameInput");
    const roleInput = document.getElementById("roleInput");

    if (nameInput) nameInput.value = name;
    if (roleInput) roleInput.value = role;
  }

  function openProfileDialog() {
    if (!profileDialog) return;

    updateProfileDisplay();

    if (typeof profileDialog.showModal === "function") {
      if (!profileDialog.open) profileDialog.showModal();
    } else {
      profileDialog.setAttribute("open", "");
    }
  }

  function closeProfileDialog() {
    if (!profileDialog) return;

    if (typeof profileDialog.close === "function") {
      if (profileDialog.open) profileDialog.close();
    } else {
      profileDialog.removeAttribute("open");
    }
  }

  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", openProfileDialog);
  }

  if (closeProfileBtn) {
    closeProfileBtn.addEventListener("click", closeProfileDialog);
  }

  if (cancelProfileBtn) {
    cancelProfileBtn.addEventListener("click", closeProfileDialog);
  }

  if (profileForm) {
    profileForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const nameInput = document.getElementById("nameInput");
      const roleInput = document.getElementById("roleInput");

      const name = nameInput ? nameInput.value.trim() : "";
      const role = roleInput ? roleInput.value.trim() : "";

      if (!name || !role) {
        showToast("Nama dan jabatan wajib diisi.");
        return;
      }

      profile = { name, role };

      saveProfile(profile);
      updateProfileDisplay();
      closeProfileDialog();

      showToast("Profil berhasil diperbarui.");
    });
  }

  // =========================================
  // 10. TANGGAL DAN JAM
  // =========================================

  function updateDateTime() {
    const now = new Date();

    // ID ini harus sama dengan yang ada di index.html.
    const dayElement = document.getElementById("dayName");
    const dateElement = document.getElementById("todayDate");
    const clockElement = document.getElementById("clock");

    if (dayElement) {
      dayElement.textContent = now.toLocaleDateString("id-ID", {
        weekday: "long",
      });
    }

    if (dateElement) {
      dateElement.textContent = now.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }

    if (clockElement) {
      clockElement.textContent = now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    }
  }
  
  // =========================================
  // 11. INISIALISASI APLIKASI
  // =========================================
  updateProfileDisplay();
  updateDateTime();
  renderTasks();

  // Perbarui jam setiap detik.
  setInterval(updateDateTime, 1000);

  // Perbarui status deadline setiap menit.
  setInterval(renderTasks, 60 * 1000);
});
