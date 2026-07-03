"use strict";

const TYPE_META = {
  prova: { label: "Prova", color: "#ef4444" },
  trabalho: { label: "Trabalho", color: "#f97316" },
  estudo: { label: "Estudo", color: "#3b82f6" },
  aula: { label: "Aula", color: "#22c55e" },
  reuniao: { label: "Reunião", color: "#f59e0b" },
  pessoal: { label: "Pessoal", color: "#8b5cf6" },
  outro: { label: "Outro", color: "#9ca3af" }
};

const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const DATA_URL = "data/agenda.json";
const STORAGE_KEY = "academico_agenda_tasks_v1";

const state = {
  tasks: [],
  currentDate: stripTime(new Date()),
  selectedDate: stripTime(new Date()),
  currentView: "month",
  theme: "light",
  filters: {
    type: "all",
    priority: "all",
    status: "all",
    discipline: "all",
    search: ""
  },
  editingTaskId: null,
  pendingDeleteTaskId: null,
  draggedTaskId: null,
  dayPanelExpanded: false,
  timelinePan: {
    active: false,
    pointerId: null,
    startX: 0,
    startScroll: 0,
    moved: false
  }
};

const responsiveQuery = window.matchMedia("(max-width: 980px)");

const els = {
  sidebar: document.getElementById("sidebar"),
  sidebarOverlay: document.getElementById("sidebarOverlay"),
  hamburgerBtn: document.getElementById("hamburgerBtn"),
  sidebarCloseBtn: document.getElementById("sidebarCloseBtn"),
  btnNewTaskSidebar: document.getElementById("btnNewTaskSidebar"),
  btnNewTaskTop: document.getElementById("btnNewTaskTop"),
  fabBtn: document.getElementById("fabBtn"),
  btnPrev: document.getElementById("btnPrev"),
  btnToday: document.getElementById("btnToday"),
  btnNext: document.getElementById("btnNext"),
  topbarTitle: document.getElementById("topbarTitle"),
  searchInput: document.getElementById("searchInput"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  filterPriority: document.getElementById("filterPriority"),
  filterStatus: document.getElementById("filterStatus"),
  filterType: document.getElementById("filterType"),
  filterClearBtn: document.getElementById("filterClearBtn"),
  typeFilterList: document.getElementById("typeFilterList"),
  miniPrev: document.getElementById("miniPrev"),
  miniNext: document.getElementById("miniNext"),
  miniCalTitle: document.getElementById("miniCalTitle"),
  miniCalGrid: document.getElementById("miniCalGrid"),
  upcomingList: document.getElementById("upcomingList"),
  calendarMonth: document.getElementById("calendarMonth"),
  monthWeekdays: document.getElementById("monthWeekdays"),
  monthGrid: document.getElementById("monthGrid"),
  calendarWeek: document.getElementById("calendarWeek"),
  weekHeader: document.getElementById("weekHeader"),
  weekBody: document.getElementById("weekBody"),
  calendarAgenda: document.getElementById("calendarAgenda"),
  agendaList: document.getElementById("agendaList"),
  calendarTimeline: document.getElementById("calendarTimeline"),
  timelineTrack: document.getElementById("timelineTrack"),
  dayPanel: document.getElementById("dayPanel"),
  dayPanelHeader: document.querySelector(".day-panel-header"),
  dayPanelDate: document.getElementById("dayPanelDate"),
  dayPanelAdd: document.getElementById("dayPanelAdd"),
  daySummary: document.getElementById("daySummary"),
  dayTasksList: document.getElementById("dayTasksList"),
  dayEmptyState: document.getElementById("dayEmptyState"),
  btnEmptyAdd: document.getElementById("btnEmptyAdd"),
  modalOverlay: document.getElementById("modalOverlay"),
  modalTitle: document.getElementById("modalTitle"),
  modalClose: document.getElementById("modalClose"),
  taskForm: document.getElementById("taskForm"),
  taskId: document.getElementById("taskId"),
  taskTitle: document.getElementById("taskTitle"),
  taskDescription: document.getElementById("taskDescription"),
  taskDate: document.getElementById("taskDate"),
  taskTime: document.getElementById("taskTime"),
  taskType: document.getElementById("taskType"),
  taskPriority: document.getElementById("taskPriority"),
  disciplineList: document.getElementById("disciplineList"),
  titleError: document.getElementById("titleError"),
  dateError: document.getElementById("dateError"),
  btnDeleteTask: document.getElementById("btnDeleteTask"),
  btnDuplicateTask: document.getElementById("btnDuplicateTask"),
  confirmOverlay: document.getElementById("confirmOverlay"),
  confirmText: document.getElementById("confirmText"),
  confirmCancel: document.getElementById("confirmCancel"),
  confirmDelete: document.getElementById("confirmDelete"),
  btnCancel: document.getElementById("btnCancel"),
  btnExportJson: document.getElementById("btnExportJson"),
  btnImportJson: document.getElementById("btnImportJson"),
  importJsonInput: document.getElementById("importJsonInput"),
  toastContainer: document.getElementById("toastContainer")
};

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function fromISO(iso) {
  return new Date(`${iso}T12:00:00`);
}

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return stripTime(next);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function weekStart(date) {
  const d = stripTime(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

function monthDays(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = (first.getDay() + 6) % 7;
  const days = [];

  for (let i = startOffset; i > 0; i -= 1) {
    days.push(new Date(year, month, 1 - i));
  }

  for (let d = 1; d <= last.getDate(); d += 1) {
    days.push(new Date(year, month, d));
  }

  let next = 1;
  while (days.length < 42) {
    days.push(new Date(year, month + 1, next));
    next += 1;
  }

  return days.map(stripTime);
}

function formatMonthYear(date) {
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function formatFullDate(date) {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

function formatShortDate(date) {
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeTask(task) {
  const clean = {
    id: String(task.id || uid()),
    title: String(task.title || task.titulo || "").trim(),
    description: String(task.description || task.descricao || "").trim(),
    date: String(task.date || task.data || toISO(new Date())),
    time: String(task.time || task.hora || "").slice(0, 5),
    type: String(task.type || task.tipo || "outro"),
    priority: String(task.priority || task.prioridade || "media"),
    status: String(task.status || "pendente"),
    discipline: String(task.discipline || task.disciplina || "").trim()
  };

  if (!TYPE_META[clean.type]) clean.type = "outro";
  if (!["alta", "media", "baixa"].includes(clean.priority)) clean.priority = "media";
  if (!["pendente", "concluida"].includes(clean.status)) clean.status = "pendente";
  return clean.title ? clean : null;
}

function sortTasks(a, b) {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  if (a.time !== b.time) return (a.time || "99:99").localeCompare(b.time || "99:99");
  return a.title.localeCompare(b.title, "pt-BR");
}

async function loadData() {
  const persisted = loadPersistedTasks();
  if (persisted) {
    state.tasks = persisted;
    return;
  }

  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const source = Array.isArray(payload) ? payload : payload.tasks;
    state.tasks = Array.isArray(source) ? source.map(normalizeTask).filter(Boolean) : [];
    if (state.tasks.length) persistTasks();
  } catch (error) {
    console.info("Nenhuma agenda inicial encontrada. Iniciando agenda local vazia.", error);
    state.tasks = [];
  }
}

function loadPersistedTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    const source = Array.isArray(payload) ? payload : payload.tasks;
    if (!Array.isArray(source)) return null;
    return source.map(normalizeTask).filter(Boolean);
  } catch (error) {
    console.warn("Falha ao carregar tarefas salvas no navegador:", error);
    return null;
  }
}

function persistTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      updatedAt: new Date().toISOString(),
      tasks: state.tasks
    }));
  } catch (error) {
    console.warn("Falha ao salvar tarefas no navegador:", error);
    showToast("Não foi possível persistir no navegador.", "error");
  }
}

function exportPayload() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks: [...state.tasks].sort(sortTasks)
  };
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(exportPayload(), null, 2)], {
    type: "application/json;charset=utf-8"
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `agenda-${toISO(new Date())}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("JSON exportado.", "success");
}

async function importJSON(file) {
  const payload = JSON.parse(await file.text());
  const source = Array.isArray(payload) ? payload : payload.tasks;
  if (!Array.isArray(source)) throw new Error("Formato inválido.");
  const imported = source.map(normalizeTask).filter(Boolean);
  state.tasks = imported;
  persistTasks();
  updateDisciplineOptions();
  renderAll();
  showToast("JSON importado.", "success");
}

function taskMatchesFilters(task) {
  const { type, priority, status, discipline, search } = state.filters;
  if (type !== "all" && task.type !== type) return false;
  if (priority !== "all" && task.priority !== priority) return false;
  if (status !== "all" && task.status !== status) return false;
  if (discipline !== "all" && task.discipline !== discipline) return false;

  if (search) {
    const haystack = [
      task.title,
      task.description,
      task.discipline,
      TYPE_META[task.type]?.label
    ].join(" ").toLowerCase();
    return haystack.includes(search.toLowerCase());
  }

  return true;
}

function filteredTasks() {
  return state.tasks.filter(taskMatchesFilters).sort(sortTasks);
}

function tasksForDate(date, useFilters = true) {
  const iso = toISO(date);
  const source = useFilters ? filteredTasks() : state.tasks;
  return source.filter((task) => task.date === iso).sort(sortTasks);
}

function hasTasksOnDate(date) {
  const iso = toISO(date);
  return state.tasks.some((task) => task.date === iso);
}

function updateTitle() {
  if (state.currentView === "week") {
    const start = weekStart(state.currentDate);
    const end = addDays(start, 6);
    els.topbarTitle.textContent = `${formatShortDate(start)} - ${formatShortDate(end)}`;
    return;
  }

  if (state.currentView === "agenda") {
    els.topbarTitle.textContent = "Agenda";
    return;
  }

  if (state.currentView === "timeline") {
    els.topbarTitle.textContent = responsiveQuery.matches
      ? formatMonthYear(state.currentDate)
      : `Linha do tempo - ${formatMonthYear(state.currentDate)}`;
    return;
  }

  els.topbarTitle.textContent = formatMonthYear(state.currentDate);
}

function updateViewVisibility() {
  els.calendarMonth.classList.toggle("hidden", state.currentView !== "month");
  els.calendarWeek.classList.toggle("hidden", state.currentView !== "week");
  els.calendarAgenda.classList.toggle("hidden", state.currentView !== "agenda");
  els.calendarTimeline.classList.toggle("hidden", state.currentView !== "timeline");

  document.querySelectorAll(".view-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.currentView);
  });
}

function renderMiniCalendar() {
  const days = monthDays(state.currentDate.getFullYear(), state.currentDate.getMonth());
  const today = stripTime(new Date());
  els.miniCalTitle.textContent = formatMonthYear(state.currentDate);
  els.miniCalGrid.innerHTML = "";

  WEEK_DAYS.forEach((day) => {
    const node = document.createElement("div");
    node.className = "mini-cal-day-name";
    node.textContent = day[0];
    els.miniCalGrid.appendChild(node);
  });

  days.forEach((date) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mini-cal-day";
    button.textContent = date.getDate();
    button.dataset.date = toISO(date);
    button.classList.toggle("other-month", date.getMonth() !== state.currentDate.getMonth());
    button.classList.toggle("today", sameDay(date, today));
    button.classList.toggle("selected", sameDay(date, state.selectedDate));
    button.classList.toggle("has-tasks", hasTasksOnDate(date));
    els.miniCalGrid.appendChild(button);
  });
}

function updateDisciplineOptions() {
  state.filters.type = TYPE_META[state.filters.type] ? state.filters.type : "all";
  els.filterType.value = state.filters.type;
}

function renderMonth() {
  els.monthWeekdays.innerHTML = WEEK_DAYS
    .map((day) => `<div class="weekday-header" role="columnheader">${day}</div>`)
    .join("");

  const days = monthDays(state.currentDate.getFullYear(), state.currentDate.getMonth());
  const today = stripTime(new Date());
  els.monthGrid.innerHTML = "";

  days.forEach((date) => {
    const dayTasks = tasksForDate(date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "month-day";
    button.dataset.date = toISO(date);
    button.classList.toggle("other-month", date.getMonth() !== state.currentDate.getMonth());
    button.classList.toggle("today", sameDay(date, today));
    button.classList.toggle("selected", sameDay(date, state.selectedDate));
    button.innerHTML = `
      <span class="day-number">${date.getDate()}</span>
      <div class="month-task-list">
        ${dayTasks.slice(0, 3).map((task) => `
          <div class="month-task-pill type-${escapeHTML(task.type)} ${task.status === "concluida" ? "completed" : ""}">
            ${escapeHTML(task.title)}
          </div>
        `).join("")}
        ${dayTasks.length > 3 ? `<div class="tasks-more">+${dayTasks.length - 3} tarefas</div>` : ""}
      </div>
    `;
    els.monthGrid.appendChild(button);
  });
}

function renderWeek() {
  const start = weekStart(state.currentDate);
  const today = stripTime(new Date());
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));

  els.weekHeader.innerHTML = days.map((date, index) => `
    <button type="button" class="week-header-day ${sameDay(date, today) ? "today-header" : ""} ${sameDay(date, state.selectedDate) ? "selected-header" : ""}" data-date="${toISO(date)}">
      <div class="week-day-name">${WEEK_DAYS[index]}</div>
      <div class="week-day-num">${date.getDate()}</div>
    </button>
  `).join("");

  els.weekBody.innerHTML = days.map((date) => {
    const dayTasks = tasksForDate(date);
    return `
      <div class="week-day-col ${sameDay(date, today) ? "today-col" : ""} ${sameDay(date, state.selectedDate) ? "selected-col" : ""}" data-date="${toISO(date)}">
        ${dayTasks.length
          ? dayTasks.map(renderWeekTask).join("")
          : '<div class="week-day-empty">Livre</div>'}
      </div>
    `;
  }).join("");
}

function renderWeekTask(task) {
  return `
    <button class="week-task-pill type-${escapeHTML(task.type)} ${task.status === "concluida" ? "completed" : ""}" type="button" data-action="edit" data-id="${escapeHTML(task.id)}">
      <span class="week-task-title">${escapeHTML(task.title)}</span>
    </button>
  `;
}

function renderAgenda() {
  const tasks = filteredTasks();
  if (!tasks.length) {
    els.agendaList.innerHTML = '<div class="agenda-empty">Nenhuma tarefa encontrada.</div>';
    return;
  }

  const groups = new Map();
  tasks.forEach((task) => {
    if (!groups.has(task.date)) groups.set(task.date, []);
    groups.get(task.date).push(task);
  });

  els.agendaList.innerHTML = [...groups.entries()].map(([iso, items]) => {
    const date = fromISO(iso);
    return `
      <section class="agenda-day-group">
        <div class="agenda-day-header">
          <div class="agenda-day-label">${escapeHTML(formatFullDate(date))}</div>
          <div class="agenda-day-count">${items.length} ${items.length === 1 ? "tarefa" : "tarefas"}</div>
        </div>
        ${items.map((task) => `
          <article class="agenda-task-row ${task.status === "concluida" ? "completed" : ""}" data-task-id="${escapeHTML(task.id)}">
            <span class="type-dot" style="background:${TYPE_META[task.type].color}"></span>
            <button class="agenda-task-main" type="button" data-action="edit" data-id="${escapeHTML(task.id)}">
              <div class="agenda-task-title ${task.status === "concluida" ? "done-title" : ""}">${escapeHTML(task.title)}</div>
              <div class="agenda-task-meta">${escapeHTML([TYPE_META[task.type].label, task.discipline].filter(Boolean).join(" · "))}</div>
            </button>
            <div class="agenda-task-time">${escapeHTML(task.time || "")}</div>
          </article>
        `).join("")}
      </section>
    `;
  }).join("");
}

function renderAgendaView() {
  const tasks = filteredTasks();
  if (!tasks.length) {
    els.agendaList.innerHTML = '<div class="agenda-empty">Nenhuma tarefa encontrada.</div>';
    return;
  }

  const groups = new Map();
  tasks.forEach((task) => {
    if (!groups.has(task.date)) groups.set(task.date, []);
    groups.get(task.date).push(task);
  });

  els.agendaList.innerHTML = [...groups.entries()].map(([iso, items]) => {
    const date = fromISO(iso);
    return `
      <section class="agenda-day-group">
        <div class="agenda-day-header">
          <div class="agenda-day-label">${escapeHTML(formatFullDate(date))}</div>
          <div class="agenda-day-count">${items.length} ${items.length === 1 ? "tarefa" : "tarefas"}</div>
        </div>
        ${items.map((task) => `
          <article class="agenda-task-row ${task.status === "concluida" ? "completed" : ""}" data-task-id="${escapeHTML(task.id)}" style="--task-color:${TYPE_META[task.type].color}">
            <button class="agenda-task-check task-checkbox ${task.status === "concluida" ? "checked" : ""}" type="button" data-action="toggle-status" data-id="${escapeHTML(task.id)}" aria-label="Alterar status"></button>
            <button class="agenda-task-main" type="button" data-action="edit" data-id="${escapeHTML(task.id)}">
              <div class="agenda-task-title-wrap">
                ${task.status === "concluida" ? '<span class="agenda-task-done" aria-hidden="true">✓</span>' : ""}
                <div class="agenda-task-title ${task.status === "concluida" ? "done-title" : ""}">${escapeHTML(task.title)}</div>
              </div>
              <div class="agenda-task-meta">
                <span class="task-type-badge type-${escapeHTML(task.type)}">${escapeHTML(TYPE_META[task.type].label)}</span>
                <span class="task-priority ${escapeHTML(task.priority)}">${escapeHTML(priorityLabel(task.priority))}</span>
              </div>
            </button>
            ${task.time ? `<div class="agenda-task-time task-time-badge">${escapeHTML(task.time)}</div>` : ""}
          </article>
        `).join("")}
      </section>
    `;
  }).join("");
}

function renderTimeline() {
  const start = addDays(weekStart(new Date(state.currentDate.getFullYear(), state.currentDate.getMonth(), 1)), -7);
  const days = Array.from({ length: 56 }, (_, index) => addDays(start, index));
  const today = stripTime(new Date());

  els.timelineTrack.innerHTML = days.map((date) => {
    const dayTasks = tasksForDate(date);
    return `
      <section class="timeline-day ${sameDay(date, today) ? "today" : ""} ${sameDay(date, state.selectedDate) ? "selected" : ""}" data-date="${toISO(date)}">
        <header class="timeline-day-header">
          <div class="timeline-weekday">${escapeHTML(date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""))}</div>
          <div class="timeline-date">${escapeHTML(formatShortDate(date))}</div>
        </header>
        <div class="timeline-cards">
          ${dayTasks.length ? dayTasks.map((task) => renderTaskCard(task, true)).join("") : ""}
        </div>
      </section>
    `;
  }).join("");

  requestAnimationFrame(() => {
    const selected = els.timelineTrack.querySelector(`.timeline-day[data-date="${toISO(state.selectedDate)}"]`);
    if (selected) selected.scrollIntoView({ inline: "center", block: "nearest" });
  });
}

function renderTaskCard(task, draggable = false) {
  const meta = [
    `<span class="task-type-badge type-${escapeHTML(task.type)}">${escapeHTML(TYPE_META[task.type].label)}</span>`,
    `<span class="task-priority ${escapeHTML(task.priority)}">${escapeHTML(priorityLabel(task.priority))}</span>`,
    task.time ? `<span class="task-time-badge">${escapeHTML(task.time)}</span>` : ""
  ].filter(Boolean).join("");

  return `
    <article class="task-card ${task.status === "concluida" ? "completed" : ""}" data-task-id="${escapeHTML(task.id)}" style="--task-color:${TYPE_META[task.type].color}" ${draggable ? "draggable=\"true\"" : ""}>
      <div class="task-card-header">
        <button class="task-checkbox ${task.status === "concluida" ? "checked" : ""}" type="button" data-action="toggle-status" data-id="${escapeHTML(task.id)}" aria-label="Alterar status"></button>
        <button class="task-card-body" type="button" data-action="edit" data-id="${escapeHTML(task.id)}">
          <div class="task-card-title">${escapeHTML(task.title)}</div>
          <div class="task-card-meta">${meta}</div>
        </button>
        <button class="task-card-edit-btn" type="button" data-action="edit" data-id="${escapeHTML(task.id)}" aria-label="Editar tarefa">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path d="M8.8 2.7l3.5 3.5M2.5 12.5l3.4-.7 6.6-6.6a1.4 1.4 0 0 0-2-2L3.9 9.8l-.7 3.4z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        </button>
      </div>
    </article>
  `;
}

function renderDayPanel() {
  const tasks = tasksForDate(state.selectedDate);
  const done = tasks.filter((task) => task.status === "concluida").length;
  const pending = tasks.length - done;

  els.dayPanelDate.textContent = formatFullDate(state.selectedDate);
  els.dayPanel.classList.toggle("is-empty", tasks.length === 0);
  els.daySummary.innerHTML = tasks.length
    ? `
      <span class="summary-chip">${tasks.length} total</span>
      <span class="summary-chip chip-done">✓ ${done}</span>
      <span class="summary-chip chip-pending">↻ ${pending}</span>
    `
    : "";

  els.dayTasksList.innerHTML = tasks.map((task) => renderTaskCard(task)).join("");
  els.dayEmptyState.classList.toggle("hidden", tasks.length > 0);
}

function renderDayPanelView() {
  const tasks = tasksForDate(state.selectedDate);
  const done = tasks.filter((task) => task.status === "concluida").length;
  const pending = tasks.length - done;
  const mobile = responsiveQuery.matches;

  els.dayPanelDate.textContent = formatFullDate(state.selectedDate);
  els.dayPanel.classList.toggle("is-empty", tasks.length === 0);
  els.dayPanel.classList.toggle("mobile-collapsed", mobile && !state.dayPanelExpanded);
  els.dayPanel.classList.toggle("mobile-expanded", mobile && state.dayPanelExpanded);
  document.body.classList.toggle("mobile-day-panel-expanded", mobile && state.dayPanelExpanded);
  els.dayPanelAdd.setAttribute(
    "aria-label",
    mobile
      ? (state.dayPanelExpanded ? "Recolher painel do dia" : "Expandir painel do dia")
      : "Adicionar tarefa neste dia"
  );
  els.daySummary.innerHTML = tasks.length
    ? `
      <span class="summary-chip">${tasks.length} total</span>
      <span class="summary-chip chip-done">&#10003; ${done}</span>
      <span class="summary-chip chip-pending">&#8635; ${pending}</span>
    `
    : "";

  els.dayTasksList.innerHTML = tasks.map((task) => renderTaskCard(task)).join("");
  els.dayEmptyState.classList.toggle("hidden", tasks.length > 0);
}

function renderUpcoming() {
  const todayISO = toISO(new Date());
  const upcoming = state.tasks
    .filter((task) => task.status !== "concluida" && task.date >= todayISO)
    .sort(sortTasks)
    .slice(0, 5);

  if (!upcoming.length) {
    els.upcomingList.innerHTML = '<div class="upcoming-empty">Sem prazos próximos.</div>';
    return;
  }

  els.upcomingList.innerHTML = upcoming.map((task) => `
    <button class="upcoming-item" type="button" data-date="${escapeHTML(task.date)}">
      <span class="upcoming-color" style="background:${TYPE_META[task.type].color}"></span>
      <span>
        <span class="upcoming-item-title">${escapeHTML(task.title)}</span>
        <span class="upcoming-item-meta">${escapeHTML(formatShortDate(fromISO(task.date)))}${task.time ? ` · ${escapeHTML(task.time)}` : ""}</span>
      </span>
    </button>
  `).join("");
}

function renderUpcomingView() {
  const todayISO = toISO(new Date());
  const upcoming = state.tasks
    .filter((task) => task.status !== "concluida" && task.date >= todayISO)
    .sort(sortTasks)
    .slice(0, 5);

  if (!upcoming.length) {
    els.upcomingList.innerHTML = '<div class="upcoming-empty">Sem prazos próximos.</div>';
    return;
  }

  els.upcomingList.innerHTML = upcoming.map((task) => `
    <button class="upcoming-item" type="button" data-date="${escapeHTML(task.date)}">
      <span class="upcoming-color" style="background:${TYPE_META[task.type].color}"></span>
      <span class="upcoming-content">
        <span class="upcoming-item-title">${escapeHTML(task.title)}</span>
        <span class="upcoming-item-meta">${escapeHTML(formatShortDate(fromISO(task.date)))}${task.time ? ` &middot; ${escapeHTML(task.time)}` : ""}</span>
      </span>
    </button>
  `).join("");
}

function renderAll() {
  updateTitle();
  updateViewVisibility();
  renderMiniCalendar();
  renderMonth();
  renderWeek();
  renderAgendaView();
  renderTimeline();
  renderDayPanelView();
  renderUpcomingView();
  syncCustomControls();
}

function priorityLabel(priority) {
  return {
    alta: "Alta",
    media: "Média",
    baixa: "Baixa"
  }[priority] || "Média";
}

function setSelectedDate(date) {
  state.selectedDate = stripTime(date);
  if (state.currentView === "month" || state.currentView === "timeline") {
    state.currentDate = new Date(date.getFullYear(), date.getMonth(), 1);
  }
  if (state.currentView === "week") {
    state.currentDate = stripTime(date);
  }
  renderAll();
}

function setView(view) {
  if (view === "week" && responsiveQuery.matches) {
    view = "timeline";
  }
  state.currentView = view;
  renderAll();
}

function enforceResponsiveView() {
  let shouldRender = false;
  if (responsiveQuery.matches && state.currentView === "week") {
    state.currentView = "timeline";
    shouldRender = true;
  }
  if (!responsiveQuery.matches && state.dayPanelExpanded) {
    state.dayPanelExpanded = false;
    shouldRender = true;
  }
  if (shouldRender) {
    renderAll();
  } else {
    renderDayPanelView();
  }
}

function changePeriod(amount) {
  if (state.currentView === "week") {
    state.currentDate = addDays(state.currentDate, amount * 7);
    state.selectedDate = state.currentDate;
  } else if (state.currentView === "agenda") {
    state.currentDate = addMonths(state.currentDate, amount);
  } else {
    state.currentDate = addMonths(state.currentDate, amount);
  }
  renderAll();
}

function openModal(task = null, date = state.selectedDate) {
  state.editingTaskId = task?.id || null;
  els.taskForm.reset();
  els.titleError.textContent = "";
  els.dateError.textContent = "";
  els.modalTitle.textContent = task ? "Editar tarefa" : "Nova tarefa";
  els.taskId.value = task?.id || "";
  els.taskTitle.value = task?.title || "";
  els.taskDescription.value = task?.description || "";
  els.taskDate.value = task?.date || toISO(date);
  els.taskTime.value = task?.time || "";
  els.taskType.value = task?.type || "estudo";
  els.taskPriority.value = task?.priority || "media";
  syncCustomControls();
  els.btnDeleteTask.classList.toggle("hidden", !task);
  els.btnDuplicateTask.classList.toggle("hidden", !task);
  els.modalOverlay.classList.remove("hidden");
  requestAnimationFrame(() => els.taskTitle.focus());
}

function closeModal() {
  els.modalOverlay.classList.add("hidden");
  state.editingTaskId = null;
}

function validateForm() {
  let valid = true;
  els.titleError.textContent = "";
  els.dateError.textContent = "";

  if (!els.taskTitle.value.trim()) {
    els.titleError.textContent = "Informe um título.";
    valid = false;
  }

  if (!els.taskDate.value) {
    els.dateError.textContent = "Informe uma data.";
    valid = false;
  }

  return valid;
}

function formTaskData(id = null) {
  return {
    id: id || uid(),
    title: els.taskTitle.value.trim(),
    description: els.taskDescription.value.trim(),
    date: els.taskDate.value,
    time: els.taskTime.value,
    type: els.taskType.value,
    priority: els.taskPriority.value,
    status: state.tasks.find((task) => task.id === id)?.status || "pendente",
    discipline: state.tasks.find((task) => task.id === id)?.discipline || ""
  };
}

function saveTask(event) {
  event.preventDefault();
  if (!validateForm()) return;

  const id = els.taskId.value || null;
  const data = formTaskData(id);
  const index = state.tasks.findIndex((task) => task.id === id);

  if (index >= 0) {
    state.tasks[index] = data;
  } else {
    state.tasks.push(data);
  }

  state.selectedDate = fromISO(data.date);
  state.currentDate = new Date(state.selectedDate.getFullYear(), state.selectedDate.getMonth(), 1);
  persistTasks();
  updateDisciplineOptions();
  renderAll();
  closeModal();
  showToast("Tarefa salva.", "success");
}

function deleteTask(id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;
  state.pendingDeleteTaskId = id;
  els.confirmText.textContent = `Excluir "${task.title}" permanentemente?`;
  els.confirmOverlay.classList.remove("hidden");
}

function closeConfirmModal() {
  els.confirmOverlay.classList.add("hidden");
  state.pendingDeleteTaskId = null;
}

function confirmDeleteTask() {
  const id = state.pendingDeleteTaskId;
  const task = state.tasks.find((item) => item.id === id);
  if (!task) {
    closeConfirmModal();
    return;
  }
  state.tasks = state.tasks.filter((item) => item.id !== id);
  persistTasks();
  updateDisciplineOptions();
  renderAll();
  closeConfirmModal();
  closeModal();
  showToast("Tarefa excluída.", "success");
}

function duplicateTask(id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;
  const copy = {
    ...task,
    id: uid(),
    title: `${task.title} (cópia)`,
    status: "pendente"
  };
  state.tasks.push(copy);
  persistTasks();
  updateDisciplineOptions();
  renderAll();
  closeModal();
  showToast("Tarefa duplicada.", "success");
}

function toggleTaskStatus(id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;
  task.status = task.status === "concluida" ? "pendente" : "concluida";
  persistTasks();
  renderAll();
}

function moveTask(id, targetDate) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task || task.date === targetDate) return;
  task.date = targetDate;
  state.selectedDate = fromISO(targetDate);
  persistTasks();
  renderAll();
  showToast("Tarefa movida.", "success");
}

function handleTaskAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;
  if (action === "toggle-status") {
    toggleTaskStatus(id);
    return;
  }

  if (action === "edit") {
    const task = state.tasks.find((item) => item.id === id);
    if (task) openModal(task);
  }
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  els.toastContainer.appendChild(toast);
  window.setTimeout(() => {
    toast.remove();
  }, 2800);
}

function closeSidebar() {
  els.sidebar.classList.remove("open");
  els.sidebarOverlay.classList.remove("visible");
  els.hamburgerBtn.setAttribute("aria-expanded", "false");
}

function openSidebar() {
  els.sidebar.classList.add("open");
  els.sidebarOverlay.classList.add("visible");
  els.hamburgerBtn.setAttribute("aria-expanded", "true");
}

const MONTHS_FULL = [
  "Janeiro",
  "Fevereiro",
  "Mar\u00e7o",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];
const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const CAL_WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "S\u00c1B"];
const YEARS_PER_PAGE = 16;
const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));
const customControls = [];
let customPickerScrollbar = null;
let customPickerScrollbarTarget = null;
let customPickerScrollbarDrag = null;
const nativePickerScrollbarQuery = window.matchMedia("(max-width: 767px), (pointer: coarse)");

function formatDateInputValue(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function emitFieldChange(field) {
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

function closeCustomOverlays(except = null) {
  customControls.forEach((control) => {
    if (control !== except) control.close?.();
  });
}

function syncCustomControls() {
  customControls.forEach((control) => control.sync?.());
}

function positionCustomPopover(trigger, popover, fallbackWidth = 320) {
  popover.hidden = false;

  const viewportGap = 12;
  const triggerRect = trigger.getBoundingClientRect();
  const width = Math.min(
    Math.max(fallbackWidth, triggerRect.width),
    window.innerWidth - viewportGap * 2
  );

  popover.style.width = `${width}px`;
  popover.style.maxHeight = "";

  const availableBelow = Math.max(180, window.innerHeight - triggerRect.bottom - viewportGap);
  const left = Math.min(
    Math.max(viewportGap, triggerRect.left),
    Math.max(viewportGap, window.innerWidth - width - viewportGap)
  );

  popover.style.left = `${left}px`;
  popover.style.top = `${triggerRect.bottom + 8}px`;
  popover.style.maxHeight = `${availableBelow}px`;
  requestAnimationFrame(() => updateCustomPickerScrollbar(popover));
}

function getCustomPickerScrollbar() {
  if (customPickerScrollbar) return customPickerScrollbar;
  customPickerScrollbar = document.createElement("div");
  customPickerScrollbar.className = "custom-picker-scrollbar";
  customPickerScrollbar.hidden = true;
  customPickerScrollbar.addEventListener("pointerdown", (event) => {
    if (!customPickerScrollbarTarget) return;
    event.preventDefault();
    event.stopPropagation();

    const popover = customPickerScrollbarTarget;
    const rect = popover.getBoundingClientRect();
    const trackInset = 8;
    const trackHeight = Math.max(0, rect.height - trackInset * 2);
    const thumbHeight = customPickerScrollbar.getBoundingClientRect().height;
    const maxThumbTop = Math.max(1, trackHeight - thumbHeight);
    const scrollRange = Math.max(1, popover.scrollHeight - popover.clientHeight);

    customPickerScrollbarDrag = {
      pointerId: event.pointerId,
      popover,
      startY: event.clientY,
      startScrollTop: popover.scrollTop,
      maxThumbTop,
      scrollRange
    };
    customPickerScrollbar.setPointerCapture(event.pointerId);
  });
  customPickerScrollbar.addEventListener("pointermove", (event) => {
    if (!customPickerScrollbarDrag || customPickerScrollbarDrag.pointerId !== event.pointerId) return;
    event.preventDefault();

    const distance = event.clientY - customPickerScrollbarDrag.startY;
    customPickerScrollbarDrag.popover.scrollTop = customPickerScrollbarDrag.startScrollTop
      + (distance / customPickerScrollbarDrag.maxThumbTop) * customPickerScrollbarDrag.scrollRange;
    updateCustomPickerScrollbar(customPickerScrollbarDrag.popover);
  });
  customPickerScrollbar.addEventListener("pointerup", stopCustomPickerScrollbarDrag);
  customPickerScrollbar.addEventListener("pointercancel", stopCustomPickerScrollbarDrag);
  document.body.appendChild(customPickerScrollbar);
  return customPickerScrollbar;
}

function stopCustomPickerScrollbarDrag(event) {
  if (!customPickerScrollbarDrag || customPickerScrollbarDrag.pointerId !== event.pointerId) return;
  if (customPickerScrollbar?.hasPointerCapture(event.pointerId)) {
    customPickerScrollbar.releasePointerCapture(event.pointerId);
  }
  customPickerScrollbarDrag = null;
}

function updateCustomPickerScrollbar(popover) {
  const thumb = getCustomPickerScrollbar();
  if (
    nativePickerScrollbarQuery.matches
    || !popover
    || !popover.isConnected
    || popover.hidden
    || !popover.getClientRects().length
    || popover.scrollHeight <= popover.clientHeight + 1
  ) {
    thumb.hidden = true;
    customPickerScrollbarTarget = null;
    return;
  }

  const rect = popover.getBoundingClientRect();
  const trackInset = 8;
  const trackHeight = Math.max(0, rect.height - trackInset * 2);
  const thumbHeight = Math.max(28, trackHeight * (popover.clientHeight / popover.scrollHeight));
  const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
  const scrollRange = Math.max(1, popover.scrollHeight - popover.clientHeight);
  const thumbTop = rect.top + trackInset + (popover.scrollTop / scrollRange) * maxThumbTop;

  thumb.hidden = false;
  customPickerScrollbarTarget = popover;
  thumb.style.left = `${rect.right - 8}px`;
  thumb.style.top = `${thumbTop}px`;
  thumb.style.height = `${thumbHeight}px`;
}

function hideCustomPickerScrollbar() {
  if (customPickerScrollbar) customPickerScrollbar.hidden = true;
  customPickerScrollbarTarget = null;
  customPickerScrollbarDrag = null;
}

function initCustomControls() {
  initCustomSelects();
  initCustomDatePicker(els.taskDate);
  initCustomTimePicker(els.taskTime);

  document.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".custom-control, .custom-picker-scrollbar")) return;
    closeCustomOverlays();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCustomOverlays();
  });

  window.addEventListener("resize", closeCustomOverlays);
  syncCustomControls();
}

function initCustomSelects() {
  document.querySelectorAll("select.filter-select, select.form-select").forEach((select) => {
    const compact = select.classList.contains("filter-select");
    const wrap = document.createElement("div");
    const trigger = document.createElement("button");
    const valueNode = document.createElement("span");
    const caret = document.createElement("span");
    const list = document.createElement("div");
    const control = {};

    select.classList.add("native-control-proxy");
    wrap.className = `custom-control custom-select ${compact ? "custom-select-filter" : "custom-select-form"}`;
    trigger.type = "button";
    trigger.className = "custom-select-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    valueNode.className = "custom-select-value";
    caret.className = "custom-caret";
    list.className = "custom-select-list";
    list.setAttribute("role", "listbox");
    list.hidden = true;

    trigger.append(valueNode, caret);
    wrap.append(trigger, list);
    select.insertAdjacentElement("afterend", wrap);

    function buildOptions() {
      list.innerHTML = "";
      Array.from(select.options).forEach((option) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "custom-select-option";
        item.setAttribute("role", "option");
        item.dataset.value = option.value;
        item.textContent = option.textContent;
        item.addEventListener("click", () => {
          select.value = option.value;
          emitFieldChange(select);
          close();
          sync();
        });
        list.appendChild(item);
      });
    }

    function sync() {
      const selected = select.selectedOptions[0] || select.options[0];
      valueNode.textContent = selected ? selected.textContent : "";
      list.querySelectorAll(".custom-select-option").forEach((item) => {
        const selectedItem = item.dataset.value === select.value;
        item.classList.toggle("selected", selectedItem);
        item.setAttribute("aria-selected", String(selectedItem));
      });
    }

    function open() {
      closeCustomOverlays(control);
      buildOptions();
      sync();
      list.hidden = false;
      const rect = trigger.getBoundingClientRect();
      const gap = 6;
      const availableBelow = window.innerHeight - rect.bottom;
      const listHeight = Math.min(260, Math.max(120, list.scrollHeight || 180));
      const openAbove = availableBelow < listHeight + gap && rect.top > availableBelow;
      list.style.setProperty("--select-left", `${Math.max(8, rect.left)}px`);
      list.style.setProperty("--select-top", `${openAbove ? Math.max(8, rect.top - listHeight - gap) : rect.bottom + gap}px`);
      list.style.setProperty("--select-width", `${rect.width}px`);
      wrap.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
      requestAnimationFrame(() => updateCustomPickerScrollbar(list));
    }

    function close() {
      wrap.classList.remove("open");
      list.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      if (customPickerScrollbarTarget === list) hideCustomPickerScrollbar();
    }

    trigger.addEventListener("click", () => {
      if (wrap.classList.contains("open")) close();
      else open();
    });
    list.addEventListener("scroll", () => updateCustomPickerScrollbar(list));
    list.addEventListener("pointerenter", () => updateCustomPickerScrollbar(list));

    select.addEventListener("change", sync);
    control.close = close;
    control.sync = sync;
    customControls.push(control);
    buildOptions();
    sync();
  });
}

function initCustomDatePicker(input) {
  if (!input) return;
  const today = stripTime(new Date());
  const wrap = document.createElement("div");
  const trigger = document.createElement("button");
  const valueNode = document.createElement("span");
  const caret = document.createElement("span");
  const popover = document.createElement("div");
  const control = {};
  let view = "days";
  let referenceDate = input.value ? fromISO(input.value) : today;
  let yearPageStart = Math.floor(referenceDate.getFullYear() / YEARS_PER_PAGE) * YEARS_PER_PAGE;

  input.classList.add("native-control-proxy");
  wrap.className = "custom-control custom-date";
  trigger.type = "button";
  trigger.className = "custom-date-trigger";
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.setAttribute("aria-expanded", "false");
  valueNode.className = "custom-date-value";
  caret.className = "custom-caret";
  popover.className = "custom-picker-popover custom-date-popover";
  popover.hidden = true;
  trigger.append(valueNode, caret);
  wrap.append(trigger, popover);
  input.insertAdjacentElement("afterend", wrap);

  function selectedDate() {
    return input.value ? fromISO(input.value) : null;
  }

  function setInputValue(value) {
    input.value = value;
    emitFieldChange(input);
    sync();
  }

  function daysForMonth(year, month) {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const cells = [];

    for (let index = first.getDay() - 1; index >= 0; index -= 1) {
      cells.push({ date: new Date(year, month, -index), current: false });
    }

    for (let day = 1; day <= last.getDate(); day += 1) {
      cells.push({ date: new Date(year, month, day), current: true });
    }

    let nextDay = 1;
    while (cells.length % 7 !== 0) {
      cells.push({ date: new Date(year, month + 1, nextDay), current: false });
      nextDay += 1;
    }

    return cells;
  }

  function changePage(amount) {
    if (view === "days") {
      referenceDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + amount, 1);
    } else if (view === "months") {
      referenceDate = new Date(referenceDate.getFullYear() + amount, referenceDate.getMonth(), 1);
    } else {
      yearPageStart += amount * YEARS_PER_PAGE;
    }
    render();
  }

  function renderHeader() {
    const header = document.createElement("div");
    const prev = document.createElement("button");
    const next = document.createElement("button");
    const title = document.createElement("div");

    header.className = "custom-picker-header";
    prev.type = "button";
    prev.className = "custom-picker-nav custom-picker-prev";
    prev.setAttribute("aria-label", "Anterior");
    next.type = "button";
    next.className = "custom-picker-nav custom-picker-next";
    next.setAttribute("aria-label", "Proximo");
    title.className = "custom-picker-title";
    prev.addEventListener("click", () => changePage(-1));
    next.addEventListener("click", () => changePage(1));

    if (view === "days") {
      const monthButton = document.createElement("button");
      const yearButton = document.createElement("button");
      monthButton.type = "button";
      yearButton.type = "button";
      monthButton.className = "custom-picker-label";
      yearButton.className = "custom-picker-label";
      monthButton.textContent = MONTHS_FULL[referenceDate.getMonth()];
      yearButton.textContent = referenceDate.getFullYear();
      monthButton.addEventListener("click", () => {
        view = "months";
        render();
      });
      yearButton.addEventListener("click", () => {
        view = "years";
        yearPageStart = Math.floor(referenceDate.getFullYear() / YEARS_PER_PAGE) * YEARS_PER_PAGE;
        render();
      });
      title.append(monthButton, yearButton);
    } else if (view === "months") {
      const yearButton = document.createElement("button");
      yearButton.type = "button";
      yearButton.className = "custom-picker-label";
      yearButton.textContent = referenceDate.getFullYear();
      yearButton.addEventListener("click", () => {
        view = "years";
        yearPageStart = Math.floor(referenceDate.getFullYear() / YEARS_PER_PAGE) * YEARS_PER_PAGE;
        render();
      });
      title.appendChild(yearButton);
    } else {
      const range = document.createElement("span");
      range.className = "custom-picker-range";
      range.textContent = `${yearPageStart} - ${yearPageStart + YEARS_PER_PAGE - 1}`;
      title.appendChild(range);
    }

    header.append(prev, title, next);
    return header;
  }

  function renderDays() {
    const fragment = document.createDocumentFragment();
    const weekdays = document.createElement("div");
    const grid = document.createElement("div");
    const selected = selectedDate();

    weekdays.className = "custom-date-weekdays";
    CAL_WEEKDAYS.forEach((day) => {
      const node = document.createElement("span");
      node.textContent = day;
      weekdays.appendChild(node);
    });

    grid.className = "custom-date-grid";
    daysForMonth(referenceDate.getFullYear(), referenceDate.getMonth()).forEach((cell) => {
      const button = document.createElement("button");
      const cellISO = toISO(cell.date);
      button.type = "button";
      button.className = "custom-date-day";
      button.textContent = cell.date.getDate();
      button.classList.toggle("muted", !cell.current);
      button.classList.toggle("today", sameDay(cell.date, today));
      button.classList.toggle("selected", selected ? sameDay(cell.date, selected) : false);
      button.addEventListener("click", () => {
        referenceDate = new Date(cell.date.getFullYear(), cell.date.getMonth(), 1);
        setInputValue(cellISO);
        close();
      });
      grid.appendChild(button);
    });

    fragment.append(weekdays, grid);
    return fragment;
  }

  function renderMonths() {
    const grid = document.createElement("div");
    const selected = selectedDate();
    grid.className = "custom-month-grid";
    MONTHS_SHORT.forEach((month, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "custom-month-cell";
      button.textContent = month;
      button.classList.toggle("selected", selected?.getFullYear() === referenceDate.getFullYear() && selected?.getMonth() === index);
      button.classList.toggle("current", referenceDate.getMonth() === index);
      button.addEventListener("click", () => {
        referenceDate = new Date(referenceDate.getFullYear(), index, 1);
        view = "days";
        render();
      });
      grid.appendChild(button);
    });
    return grid;
  }

  function renderYears() {
    const grid = document.createElement("div");
    const selected = selectedDate();
    grid.className = "custom-year-grid";
    for (let year = yearPageStart; year < yearPageStart + YEARS_PER_PAGE; year += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "custom-year-cell";
      button.textContent = year;
      button.classList.toggle("selected", selected?.getFullYear() === year);
      button.classList.toggle("current", referenceDate.getFullYear() === year);
      button.addEventListener("click", () => {
        referenceDate = new Date(year, referenceDate.getMonth(), 1);
        view = "months";
        render();
      });
      grid.appendChild(button);
    }
    return grid;
  }

  function renderFooter() {
    const footer = document.createElement("div");
    const clear = document.createElement("button");
    const todayButton = document.createElement("button");
    footer.className = "custom-picker-footer";
    clear.type = "button";
    todayButton.type = "button";
    clear.className = "custom-picker-footer-btn";
    todayButton.className = "custom-picker-footer-btn accent";
    clear.textContent = "Limpar";
    todayButton.textContent = "Hoje";
    clear.addEventListener("click", () => {
      setInputValue("");
      close();
    });
    todayButton.addEventListener("click", () => {
      referenceDate = new Date(today.getFullYear(), today.getMonth(), 1);
      setInputValue(toISO(today));
      close();
    });
    footer.append(clear, todayButton);
    return footer;
  }

  function render() {
    popover.innerHTML = "";
    popover.appendChild(renderHeader());
    if (view === "days") popover.appendChild(renderDays());
    if (view === "months") popover.appendChild(renderMonths());
    if (view === "years") popover.appendChild(renderYears());
    popover.appendChild(renderFooter());
  }

  function sync() {
    if (input.value) {
      const date = fromISO(input.value);
      referenceDate = new Date(date.getFullYear(), date.getMonth(), 1);
    }
    valueNode.textContent = input.value ? formatDateInputValue(input.value) : "Selecione uma data";
    wrap.classList.toggle("has-value", Boolean(input.value));
    render();
  }

  function open() {
    closeCustomOverlays(control);
    sync();
    wrap.classList.add("open");
    positionCustomPopover(trigger, popover, 320);
    trigger.setAttribute("aria-expanded", "true");
  }

  function close() {
    wrap.classList.remove("open");
    popover.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    view = "days";
    hideCustomPickerScrollbar();
  }

  trigger.addEventListener("click", () => {
    if (wrap.classList.contains("open")) close();
    else open();
  });
  popover.addEventListener("scroll", () => updateCustomPickerScrollbar(popover));

  input.addEventListener("change", sync);
  control.close = close;
  control.sync = sync;
  customControls.push(control);
  sync();
}

function formatTypingTime(rawValue) {
  const digits = rawValue.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function normalizeTime(rawValue) {
  const digits = rawValue.replace(/\D/g, "").slice(0, 4);
  if (!digits) return "";
  const hour = Math.min(23, Number(digits.length <= 2 ? digits : digits.slice(0, 2)));
  const minute = Math.min(59, Number(digits.length <= 2 ? "00" : digits.slice(2).padEnd(2, "0")));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function initCustomTimePicker(input) {
  if (!input) return;
  const wrap = document.createElement("div");
  const trigger = document.createElement("div");
  const visibleInput = document.createElement("input");
  const toggle = document.createElement("button");
  const caret = document.createElement("span");
  const popover = document.createElement("div");
  const control = {};

  input.classList.add("native-control-proxy");
  wrap.className = "custom-control custom-time";
  trigger.className = "custom-time-trigger";
  visibleInput.type = "text";
  visibleInput.inputMode = "numeric";
  visibleInput.className = "custom-time-input";
  visibleInput.placeholder = "--:--";
  visibleInput.setAttribute("aria-label", "Horario");
  toggle.type = "button";
  toggle.className = "custom-time-toggle";
  toggle.setAttribute("aria-label", "Abrir seletor de horario");
  caret.className = "custom-caret";
  popover.className = "custom-picker-popover custom-time-popover";
  popover.hidden = true;
  toggle.appendChild(caret);
  trigger.append(visibleInput, toggle);
  wrap.append(trigger, popover);
  input.insertAdjacentElement("afterend", wrap);

  function selectedHour() {
    return /^\d{2}:\d{2}$/.test(input.value) ? input.value.slice(0, 2) : "";
  }

  function selectedMinute() {
    return /^\d{2}:\d{2}$/.test(input.value) ? input.value.slice(3, 5) : "";
  }

  function setInputValue(value) {
    input.value = value;
    visibleInput.value = value;
    emitFieldChange(input);
    sync();
  }

  function renderColumn(title, values, selected, onSelect) {
    const column = document.createElement("div");
    const label = document.createElement("div");
    const list = document.createElement("div");
    column.className = "custom-time-column";
    label.className = "custom-time-title";
    label.textContent = title;
    list.className = "custom-time-list";
    values.forEach((value) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "custom-time-option";
      button.dataset.value = value;
      button.textContent = value;
      button.classList.toggle("selected", value === selected);
      button.addEventListener("click", () => onSelect(value));
      list.appendChild(button);
    });
    column.append(label, list);
    list.addEventListener("scroll", () => updateCustomPickerScrollbar(list));
    list.addEventListener("pointerenter", () => updateCustomPickerScrollbar(list));
    requestAnimationFrame(() => {
      const current = list.querySelector(".selected") || list.querySelector("[data-value='00']");
      if (current) list.scrollTop = Math.max(0, current.offsetTop - 58);
      updateCustomPickerScrollbar(list);
    });
    return column;
  }

  function renderFooter() {
    const footer = document.createElement("div");
    const clear = document.createElement("button");
    const now = document.createElement("button");
    footer.className = "custom-picker-footer";
    clear.type = "button";
    now.type = "button";
    clear.className = "custom-picker-footer-btn";
    now.className = "custom-picker-footer-btn accent";
    clear.textContent = "Limpar";
    now.textContent = "Agora";
    clear.addEventListener("click", () => {
      setInputValue("");
      close();
    });
    now.addEventListener("click", () => {
      const current = new Date();
      setInputValue(`${String(current.getHours()).padStart(2, "0")}:${String(current.getMinutes()).padStart(2, "0")}`);
      close();
    });
    footer.append(clear, now);
    return footer;
  }

  function render() {
    const columns = document.createElement("div");
    const separator = document.createElement("div");
    columns.className = "custom-time-columns";
    separator.className = "custom-time-separator";
    popover.innerHTML = "";
    popover.appendChild(columns);
    columns.append(
      renderColumn("Hora", HOURS, selectedHour(), (hour) => setInputValue(`${hour}:${selectedMinute() || "00"}`)),
      separator,
      renderColumn("Min", MINUTES, selectedMinute(), (minute) => setInputValue(`${selectedHour() || "00"}:${minute}`))
    );
    popover.appendChild(renderFooter());
  }

  function sync() {
    visibleInput.value = input.value || "";
    wrap.classList.toggle("has-value", Boolean(input.value));
    render();
  }

  function open() {
    closeCustomOverlays(control);
    sync();
    wrap.classList.add("open");
    positionCustomPopover(trigger, popover, 272);
  }

  function close() {
    wrap.classList.remove("open");
    popover.hidden = true;
    hideCustomPickerScrollbar();
  }

  visibleInput.addEventListener("focus", open);
  visibleInput.addEventListener("input", () => {
    visibleInput.value = formatTypingTime(visibleInput.value);
    if (!visibleInput.value) setInputValue("");
    if (visibleInput.value.replace(/\D/g, "").length === 4) setInputValue(normalizeTime(visibleInput.value));
  });
  visibleInput.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (!wrap.classList.contains("open")) return;
      if (!wrap.matches(":focus-within")) close();
    }, 120);
    if (visibleInput.value) setInputValue(normalizeTime(visibleInput.value));
  });
  toggle.addEventListener("click", () => {
    if (wrap.classList.contains("open")) close();
    else {
      open();
      visibleInput.focus();
    }
  });
  trigger.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".custom-time-toggle") || event.target === visibleInput) return;
    event.preventDefault();
    open();
    visibleInput.focus();
  });
  input.addEventListener("change", sync);
  popover.addEventListener("scroll", () => updateCustomPickerScrollbar(popover));

  control.close = close;
  control.sync = sync;
  customControls.push(control);
  sync();
}

function bindEvents() {
  els.hamburgerBtn.addEventListener("click", openSidebar);
  els.sidebarCloseBtn.addEventListener("click", closeSidebar);
  els.sidebarOverlay.addEventListener("click", closeSidebar);

  [els.btnNewTaskSidebar, els.btnNewTaskTop, els.fabBtn, els.btnEmptyAdd].forEach((button) => {
    button.addEventListener("click", () => openModal(null, state.selectedDate));
  });

  els.dayPanelAdd.addEventListener("click", () => {
    if (responsiveQuery.matches) {
      state.dayPanelExpanded = !state.dayPanelExpanded;
      renderDayPanelView();
      return;
    }
    openModal(null, state.selectedDate);
  });

  els.dayPanelHeader.addEventListener("click", (event) => {
    if (!responsiveQuery.matches || event.target.closest("#dayPanelAdd")) return;
    state.dayPanelExpanded = !state.dayPanelExpanded;
    renderDayPanelView();
  });

  els.btnPrev.addEventListener("click", () => changePeriod(-1));
  els.btnNext.addEventListener("click", () => changePeriod(1));
  els.btnToday.addEventListener("click", () => {
    const today = stripTime(new Date());
    state.currentDate = today;
    state.selectedDate = today;
    renderAll();
  });

  document.querySelectorAll(".view-btn").forEach((button) => {
    button.addEventListener("click", () => {
      setView(button.dataset.view);
      closeSidebar();
    });
  });

  responsiveQuery.addEventListener("change", enforceResponsiveView);

  els.themeToggleBtn.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    document.body.classList.toggle("dark-mode", state.theme === "dark");
  });

  els.searchInput.addEventListener("input", () => {
    state.filters.search = els.searchInput.value.trim();
    renderAll();
  });

  els.filterPriority.addEventListener("change", () => {
    state.filters.priority = els.filterPriority.value;
    renderAll();
  });

  els.filterStatus.addEventListener("change", () => {
    state.filters.status = els.filterStatus.value;
    renderAll();
  });

  els.filterType.addEventListener("change", () => {
    state.filters.type = els.filterType.value;
    els.typeFilterList.querySelectorAll(".type-filter-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.type === state.filters.type);
    });
    renderAll();
  });

  els.filterClearBtn.addEventListener("click", () => {
    state.filters = { type: "all", priority: "all", status: "all", discipline: "all", search: "" };
    els.searchInput.value = "";
    els.filterPriority.value = "all";
    els.filterStatus.value = "all";
    els.filterType.value = "all";
    document.querySelectorAll(".type-filter-item").forEach((button) => {
      button.classList.toggle("active", button.dataset.type === "all");
    });
    renderAll();
  });

  els.typeFilterList.addEventListener("click", (event) => {
    const button = event.target.closest(".type-filter-item");
    if (!button) return;
    state.filters.type = button.dataset.type;
    els.filterType.value = state.filters.type;
    els.typeFilterList.querySelectorAll(".type-filter-item").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    renderAll();
  });

  els.miniPrev.addEventListener("click", () => {
    state.currentDate = addMonths(state.currentDate, -1);
    renderAll();
  });

  els.miniNext.addEventListener("click", () => {
    state.currentDate = addMonths(state.currentDate, 1);
    renderAll();
  });

  els.miniCalGrid.addEventListener("click", (event) => {
    const button = event.target.closest(".mini-cal-day");
    if (!button) return;
    setSelectedDate(fromISO(button.dataset.date));
  });

  els.monthGrid.addEventListener("click", (event) => {
    const day = event.target.closest(".month-day");
    if (!day) return;
    setSelectedDate(fromISO(day.dataset.date));
  });

  els.weekHeader.addEventListener("click", (event) => {
    const day = event.target.closest("[data-date]");
    if (!day) return;
    setSelectedDate(fromISO(day.dataset.date));
  });

  els.weekBody.addEventListener("click", (event) => {
    const col = event.target.closest(".week-day-col");
    if (col && !event.target.closest("[data-action]")) setSelectedDate(fromISO(col.dataset.date));
    handleTaskAction(event);
  });

  els.dayTasksList.addEventListener("click", handleTaskAction);
  els.agendaList.addEventListener("click", handleTaskAction);

  els.upcomingList.addEventListener("click", (event) => {
    const item = event.target.closest("[data-date]");
    if (!item) return;
    setSelectedDate(fromISO(item.dataset.date));
    closeSidebar();
  });

  els.timelineTrack.addEventListener("click", (event) => {
    if (state.timelinePan.moved) {
      state.timelinePan.moved = false;
      return;
    }

    handleTaskAction(event);
    const day = event.target.closest(".timeline-day");
    if (day && !event.target.closest("[data-action]")) {
      setSelectedDate(fromISO(day.dataset.date));
    }
  });

  els.timelineTrack.addEventListener("dragstart", (event) => {
    const card = event.target.closest(".task-card");
    if (!card || event.target.closest("button")) {
      event.preventDefault();
      return;
    }
    state.draggedTaskId = card.dataset.taskId;
    card.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", state.draggedTaskId);
  });

  els.timelineTrack.addEventListener("dragover", (event) => {
    const day = event.target.closest(".timeline-day");
    if (!day || !state.draggedTaskId) return;
    event.preventDefault();
    els.timelineTrack.querySelectorAll(".drop-target").forEach((node) => node.classList.remove("drop-target"));
    day.classList.add("drop-target");
  });

  els.timelineTrack.addEventListener("drop", (event) => {
    const day = event.target.closest(".timeline-day");
    if (!day) return;
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || state.draggedTaskId;
    moveTask(id, day.dataset.date);
    state.draggedTaskId = null;
  });

  els.timelineTrack.addEventListener("dragend", () => {
    els.timelineTrack.querySelectorAll(".dragging, .drop-target").forEach((node) => {
      node.classList.remove("dragging", "drop-target");
    });
    state.draggedTaskId = null;
  });

  els.timelineTrack.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest(".task-card, button, input, select, textarea")) return;
    state.timelinePan.active = true;
    state.timelinePan.pointerId = event.pointerId;
    state.timelinePan.startX = event.clientX;
    state.timelinePan.startScroll = els.timelineTrack.scrollLeft;
    state.timelinePan.moved = false;
    els.timelineTrack.classList.add("is-panning");
    els.timelineTrack.setPointerCapture(event.pointerId);
  });

  els.timelineTrack.addEventListener("pointermove", (event) => {
    if (!state.timelinePan.active || event.pointerId !== state.timelinePan.pointerId) return;
    const distance = event.clientX - state.timelinePan.startX;
    if (Math.abs(distance) > 4) state.timelinePan.moved = true;
    els.timelineTrack.scrollLeft = state.timelinePan.startScroll - distance;
  });

  function stopTimelinePan(event) {
    if (!state.timelinePan.active || event.pointerId !== state.timelinePan.pointerId) return;
    state.timelinePan.active = false;
    state.timelinePan.pointerId = null;
    els.timelineTrack.classList.remove("is-panning");
    if (els.timelineTrack.hasPointerCapture(event.pointerId)) {
      els.timelineTrack.releasePointerCapture(event.pointerId);
    }
    window.setTimeout(() => {
      state.timelinePan.moved = false;
    }, 0);
  }

  els.timelineTrack.addEventListener("pointerup", stopTimelinePan);
  els.timelineTrack.addEventListener("pointercancel", stopTimelinePan);

  els.modalClose.addEventListener("click", closeModal);
  els.btnCancel.addEventListener("click", closeModal);
  els.modalOverlay.addEventListener("click", (event) => {
    if (event.target === els.modalOverlay) closeModal();
  });
  els.taskForm.addEventListener("submit", saveTask);
  els.btnDeleteTask.addEventListener("click", () => deleteTask(els.taskId.value));
  els.btnDuplicateTask.addEventListener("click", () => duplicateTask(els.taskId.value));
  els.confirmCancel.addEventListener("click", closeConfirmModal);
  els.confirmDelete.addEventListener("click", confirmDeleteTask);
  els.confirmOverlay.addEventListener("click", (event) => {
    if (event.target === els.confirmOverlay) closeConfirmModal();
  });

  els.btnExportJson.addEventListener("click", exportJSON);
  els.btnImportJson.addEventListener("click", () => els.importJsonInput.click());
  els.importJsonInput.addEventListener("change", async () => {
    const [file] = els.importJsonInput.files;
    els.importJsonInput.value = "";
    if (!file) return;
    try {
      await importJSON(file);
    } catch (error) {
      console.error(error);
      showToast("JSON inválido.", "error");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.confirmOverlay.classList.contains("hidden")) {
      closeConfirmModal();
      return;
    }
    if (event.key === "Escape" && !els.modalOverlay.classList.contains("hidden")) {
      closeModal();
    }
  });
}

async function init() {
  bindEvents();
  initCustomControls();
  await loadData();
  enforceResponsiveView();
  updateDisciplineOptions();
  renderAll();
}

init();
