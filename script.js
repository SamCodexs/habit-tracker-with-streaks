const STORAGE_KEY = "littleStepsHabits";

const form = document.getElementById("habit-form");
const input = document.getElementById("habit-input");
const habitList = document.getElementById("habit-list");
const emptyState = document.getElementById("empty-state");
const weekGrid = document.getElementById("week-grid");
const toast = document.getElementById("toast");

let habits = loadHabits();
let selectedDate = dateKey(new Date());
let toastTimer;

function loadHabits() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved)
      ? saved.filter(
          h =>
            h &&
            typeof h.id === "string" &&
            typeof h.name === "string" &&
            Array.isArray(h.completedDates)
        )
      : [];
  } catch {
    return [];
  }
}

function saveHabits() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  } catch {
    showToast("Could not save data. Check browser storage.");
  }
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function shiftDate(key, amount) {
  const date = parseDate(key);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

function formatDate(key, options = {}) {
  return parseDate(key).toLocaleDateString("en-IN", options);
}

function isCompleted(habit, key) {
  return habit.completedDates.includes(key);
}

function currentStreak(habit) {
  const today = dateKey(new Date());

  // If today is not completed yet, yesterday can
  // still be the start of the current streak.
  let cursor = isCompleted(habit, today) ? today : shiftDate(today, -1);

  let streak = 0;

  while (isCompleted(habit, cursor)) {
    streak++;
    cursor = shiftDate(cursor, -1);
  }

  return streak;
}

function bestStreak(habit) {
  const dates = [...new Set(habit.completedDates)].sort();

  let best = 0;
  let run = 0;
  let previous = null;

  for (const key of dates) {
    if (previous && shiftDate(previous, 1) === key) {
      run++;
    } else {
      run = 1;
    }

    best = Math.max(best, run);
    previous = key;
  }

  return best;
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2300);
}

function renderWeek() {
  weekGrid.replaceChildren(); // Clears previous renders to avoid grid duplication

  const today = dateKey(new Date());
  const todayDate = parseDate(today);

  // Find Monday of the current week.
  const monday = new Date(todayDate);
  const offset = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - offset);

  const mondayKey = dateKey(monday);
  const sundayKey = shiftDate(mondayKey, 6);

  document.getElementById("week-label").textContent = `${formatDate(mondayKey, {
    day: "numeric",
    month: "short"
  })}–${formatDate(sundayKey, { day: "numeric", month: "short" })}`;

  for (let i = 0; i < 7; i++) {
    const key = shiftDate(mondayKey, i);
    const date = parseDate(key);
    const button = document.createElement("button");

    button.type = "button";
    button.className = "day-cell";

    if (key === today) button.classList.add("today");
    if (key === selectedDate) button.classList.add("selected");

    const dayName = document.createElement("span");
    dayName.className = "day-name";
    dayName.textContent = date.toLocaleDateString("en-IN", {
      weekday: "short"
    });

    const dayNumber = document.createElement("span");
    dayNumber.className = "day-number";
    dayNumber.textContent = date.getDate();

    const mark = document.createElement("span");
    mark.className = "day-mark";

    const completed = habits.filter(h => isCompleted(h, key)).length;
    mark.textContent =
      habits.length > 0 && completed === habits.length
        ? "✓ Done"
        : completed > 0
        ? `${completed}/${habits.length}`
        : "·";

    button.append(dayName, dayNumber, mark);

    button.addEventListener("click", () => {
      selectedDate = key;
      render();
    });

    weekGrid.appendChild(button);
  }
}

function renderHabits() {
  habitList.replaceChildren();
  emptyState.hidden = habits.length > 0;

  for (const habit of habits) {
    const completed = isCompleted(habit, selectedDate);

    const item = document.createElement("article");
    item.className = "habit-item";
    if (completed) item.classList.add("completed");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "habit-check";
    checkbox.checked = completed;
    checkbox.setAttribute("aria-label", `Complete ${habit.name}`);

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        if (!isCompleted(habit, selectedDate)) {
          habit.completedDates.push(selectedDate);
        }

        showToast(
          selectedDate === dateKey(new Date())
            ? "Lovely! One little win 🌱"
            : "Habit completion updated 🌱"
        );
      } else {
        habit.completedDates = habit.completedDates.filter(
          key => key !== selectedDate
        );
        showToast("Completion unchecked");
      }

      saveHabits();
      render();
    });

    const info = document.createElement("div");
    info.className = "habit-info";

    const name = document.createElement("div");
    name.className = "habit-name";
    name.textContent = habit.name;

    const meta = document.createElement("div");
    meta.className = "habit-meta";

    const streak = currentStreak(habit);
    meta.textContent = `🔥 ${streak} day${streak === 1 ? "" : "s"} current streak`;

    info.append(name, meta);

    const actions = document.createElement("div");
    actions.className = "habit-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "icon-button";
    editButton.textContent = "✎";
    editButton.title = "Edit habit";
    editButton.setAttribute("aria-label", `Edit ${habit.name}`);

    editButton.addEventListener("click", () => {
      const updated = prompt("Edit your habit:", habit.name);

      if (updated === null) return;

      const cleanName = updated.trim();

      if (!cleanName) {
        showToast("Habit name cannot be empty");
        return;
      }

      habit.name = cleanName.slice(0, 60);
      saveHabits();
      render();
      showToast("Habit updated ✨");
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "icon-button delete";
    deleteButton.textContent = "×";
    deleteButton.title = "Delete habit";
    deleteButton.setAttribute("aria-label", `Delete ${habit.name}`);

    deleteButton.addEventListener("click", () => {
      if (!confirm(`Delete "${habit.name}" and its history?`)) return;

      habits = habits.filter(h => h.id !== habit.id);
      saveHabits();
      render();
      showToast("Habit removed");
    });

    actions.append(editButton, deleteButton);
    item.append(checkbox, info, actions);
    habitList.appendChild(item);
  }
}

function renderStats() {
  const today = dateKey(new Date());
  const doneToday = habits.filter(h => isCompleted(h, today)).length;

  document.getElementById("habit-count").textContent = habits.length;
  document.getElementById("done-count").textContent = `${doneToday}/${habits.length}`;

  const best = habits.reduce(
    (max, habit) => Math.max(max, bestStreak(habit)),
    0
  );

  document.getElementById("best-streak").textContent = `${best} day${
    best === 1 ? "" : "s"
  }`;

  const selectedDone = habits.filter(h => isCompleted(h, selectedDate)).length;

  document.getElementById("today-progress").textContent = `${selectedDone} of ${habits.length}`;

  const weekStart = (() => {
    const d = parseDate(today);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return dateKey(d);
  })();

  let completedSlots = 0;

  for (const habit of habits) {
    for (let i = 0; i < 7; i++) {
      if (isCompleted(habit, shiftDate(weekStart, i))) {
        completedSlots++;
      }
    }
  }

  const totalSlots = habits.length * 7;
  const percent = totalSlots
    ? Math.round((completedSlots / totalSlots) * 100)
    : 0;

  document.getElementById("progress-percent").textContent = `${percent}%`;
  document.getElementById("progress-fill").style.width = `${percent}%`;

  let message = "Every journey begins with one step 🌱";

  if (percent === 100 && totalSlots > 0) {
    message = "A perfect week of progress. Amazing! 🌟";
  } else if (percent >= 70) {
    message = "Look at you growing! Keep it up 🌷";
  } else if (percent >= 30) {
    message = "You're building something lovely 🌿";
  } else if (percent > 0) {
    message = "Every little win counts. Keep going 💚";
  }

  document.getElementById("progress-message").textContent = message;

  const longestStreak = best;

  setBadge("badge-first", habits.some(h => h.completedDates.length > 0));
  setBadge("badge-three", longestStreak >= 3);
  setBadge("badge-seven", longestStreak >= 7);

  document.getElementById("today-label").textContent =
    selectedDate === today
      ? formatDate(today, {
          weekday: "short",
          day: "numeric",
          month: "short"
        })
      : formatDate(selectedDate, {
          weekday: "short",
          day: "numeric",
          month: "short"
        });
}

function setBadge(id, unlocked) {
  const badge = document.getElementById(id);
  if (!badge) return;
  badge.textContent = unlocked ? "Unlocked ✓" : "Locked";
  badge.classList.toggle("unlocked", unlocked);
}

function render() {
  renderWeek();
  renderHabits();
  renderStats();
}

form.addEventListener("submit", event => {
  event.preventDefault();

  const name = input.value.trim();
  if (!name) return;

  habits.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.slice(0, 60),
    completedDates: []
  });

  saveHabits();
  input.value = "";
  render();
  input.focus();
  showToast("A new little habit planted 🌱");
});

render();