(() => {
  const root = document.getElementById("zahavi-os");
  const desktop = root.querySelector(".zos-desktop");
  const time = root.querySelector(".zos-time");
  const date = root.querySelector(".zos-date");
  const hours = root.querySelector(".zos-hours");
  const minutes = root.querySelector(".zos-minutes");
  const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  const dateFormat = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });

  function updateClock() {
    if (!root.isConnected) return;
    const now = new Date();
    const parts = timeFormat.formatToParts(now);
    const divider = parts.findIndex(part => part.type === "minute");
    const hour = parts.find(part => part.type === "hour").value;
    hours.textContent = hour;
    minutes.textContent = parts.slice(divider).map(part => part.value).join("");
    time.dateTime = [now.getHours(), now.getMinutes()].map(value => String(value).padStart(2, "0")).join(":");
    time.setAttribute("aria-label", timeFormat.format(now));
    date.dateTime = [now.getFullYear(), now.getMonth() + 1, now.getDate()].map(value => String(value).padStart(2, "0")).join("-");
    date.textContent = dateFormat.format(now);
    setTimeout(updateClock, 1000 - now.getMilliseconds());
  }
  updateClock();
  const icons = [...root.querySelectorAll("[data-app]")];
  const taskbar = root.querySelector(".zos-bar nav");
  const windows = new Map();
  const apps = {
    about: ["About", "Zahavi", "A home for my work and the things I want to share."],
    resume: ["Résumé", "Experience", "A place for past roles, education, and skills."],
    projects: ["Projects", "Selected work", "A place for projects, links, and the stories behind them."],
    archive: ["Archive", "Public files", "A place for notes, experiments, writing, and downloads."]
  };
  let layer = 1;

  function activate(entry) {
    for (const [key, item] of windows) {
      const active = entry === item;
      item.panel.toggleAttribute("data-active", active);
      item.tab.setAttribute("aria-pressed", String(active));
      icons.find(icon => icon.dataset.app === key).setAttribute("aria-pressed", String(active));
    }
    if (entry) {
      entry.panel.hidden = false;
      entry.panel.style.zIndex = ++layer;
    }
  }

  function revealTop() {
    const visible = [...windows.values()].filter(item => !item.panel.hidden);
    visible.sort((a, b) => Number(b.panel.style.zIndex) - Number(a.panel.style.zIndex));
    activate(visible[0]);
  }

  function openApp(key) {
    const existing = windows.get(key);
    if (existing) {
      activate(existing);
      return;
    }

    const [name, heading, description] = apps[key];
    const panel = root.querySelector("template").content.firstElementChild.cloneNode(true);
    const title = panel.querySelector("h2");
    title.id = "zahavi-window-" + key;
    title.textContent = name;
    panel.querySelector(".zos-location").textContent = name;
    panel.setAttribute("aria-labelledby", title.id);
    const content = panel.querySelector(".zos-content");
    const h3 = document.createElement("h3");
    const p = document.createElement("p");
    h3.textContent = heading;
    p.textContent = description;
    content.append(h3, p);
    if (key === "about") {
      const badge = document.createElement("div");
      badge.className = "zos-construction";
      const mark = document.createElement("span");
      mark.className = "zos-construction-mark";
      mark.setAttribute("aria-hidden", "true");
      badge.append(mark, "Under construction");
      content.append(badge);
    }

    const offset = 15 * Object.keys(apps).indexOf(key);
    const compact = desktop.clientWidth <= 560;
    panel.style.setProperty("--left", (compact ? 10 : 112 + offset) + "px");
    panel.style.setProperty("--top", (compact ? 85 : 35) + offset + "px");
    panel.style.setProperty("--offset", offset + "px");

    const tab = document.createElement("button");
    tab.type = "button";
    const icon = icons.find(item => item.dataset.app === key);
    const taskIcon = icon.querySelector("img").cloneNode();
    taskIcon.className = "zos-task-icon";
    taskIcon.width = 16;
    taskIcon.height = 16;
    tab.append(taskIcon, name);
    const entry = { panel, tab };
    windows.set(key, entry);
    root.querySelector(".zos-windows").append(panel);
    taskbar.append(tab);
    if (key === "about") {
      if (!compact) panel.style.setProperty("--left", Math.max(112, (desktop.clientWidth - panel.offsetWidth) / 2) + "px");
      panel.style.setProperty("--top", Math.max(compact ? 84 : 8, (desktop.clientHeight - panel.offsetHeight) / 2) + "px");
    }

    const minimize = panel.querySelector('[data-action="minimize"]');
    const maximize = panel.querySelector('[data-action="maximize"]');
    maximize.setAttribute("aria-label", "Maximize " + name);
    function toggleMaximize() {
      activate(entry);
      const expanded = panel.toggleAttribute("data-maximized");
      maximize.setAttribute("aria-label", (expanded ? "Restore " : "Maximize ") + name);
    }
    maximize.addEventListener("click", toggleMaximize);
    const close = panel.querySelector('[data-action="close"]');
    minimize.setAttribute("aria-label", "Minimize " + name);
    close.setAttribute("aria-label", "Close " + name);
    const hide = () => {
      panel.hidden = true;
      revealTop();
      tab.focus();
    };
    tab.addEventListener("click", () => {
      if (panel.hasAttribute("data-active")) hide();
      else activate(entry);
    });
    minimize.addEventListener("click", hide);
    close.addEventListener("click", () => {
      panel.remove();
      tab.remove();
      windows.delete(key);
      icon.setAttribute("aria-pressed", "false");
      revealTop();
      icon.focus();
    });
    panel.addEventListener("pointerdown", event => {
      if (!event.target.closest("button")) activate(entry);
    });

    const bar = panel.querySelector("header");
    bar.addEventListener("dblclick", event => {
      if (!event.target.closest("button")) toggleMaximize();
    });
    let drag;
    bar.addEventListener("pointerdown", event => {
      if (event.button !== 0 || event.target.closest("button") || panel.hasAttribute("data-maximized") || desktop.clientWidth <= 560) return;
      drag = { x: event.clientX, y: event.clientY, left: panel.offsetLeft, top: panel.offsetTop };
      bar.setPointerCapture(event.pointerId);
    });
    bar.addEventListener("pointermove", event => {
      if (!drag) return;
      const left = Math.max(0, Math.min(desktop.clientWidth - panel.offsetWidth, drag.left + event.clientX - drag.x));
      const top = Math.max(0, Math.min(desktop.clientHeight - panel.offsetHeight, drag.top + event.clientY - drag.y));
      panel.style.setProperty("--left", left + "px");
      panel.style.setProperty("--top", top + "px");
    });
    bar.addEventListener("lostpointercapture", () => { drag = undefined; });

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    for (const edge of ["n", "ne", "e", "se", "s", "sw", "w", "nw"]) {
      const handle = document.createElement("span");
      handle.className = "zos-resize";
      handle.dataset.edge = edge;
      handle.toggleAttribute("data-corner", edge.length === 2);
      handle.setAttribute("aria-hidden", "true");
      panel.append(handle);
      let start;
      handle.addEventListener("pointerdown", event => {
        if (event.button !== 0 || start) return;
        event.preventDefault();
        event.stopPropagation();
        activate(entry);
        const left = panel.offsetLeft;
        const top = panel.offsetTop;
        start = {
          id: event.pointerId, x: event.clientX, y: event.clientY,
          left, top, right: left + panel.offsetWidth, bottom: top + panel.offsetHeight
        };
        handle.setPointerCapture(event.pointerId);
      });
      handle.addEventListener("pointermove", event => {
        if (start?.id !== event.pointerId) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        const maxRight = desktop.clientWidth - 5;
        const maxBottom = desktop.clientHeight - 5;
        const minWidth = Math.min(208, start.right - start.left);
        const minHeight = Math.min(132, start.bottom - start.top);
        let { left, right, top, bottom } = start;
        if (edge.includes("w")) left = clamp(left + dx, 0, right - minWidth);
        if (edge.includes("e")) right = clamp(right + dx, left + minWidth, maxRight);
        if (edge.includes("n")) top = clamp(top + dy, 0, bottom - minHeight);
        if (edge.includes("s")) bottom = clamp(bottom + dy, top + minHeight, maxBottom);
        panel.style.setProperty("--left", left + "px");
        panel.style.setProperty("--top", top + "px");
        panel.style.width = right - left + "px";
        panel.style.height = bottom - top + "px";
      });
      handle.addEventListener("lostpointercapture", () => { start = undefined; });
    }
    activate(entry);
  }

  for (const icon of icons) {
    icon.type = "button";
    icon.setAttribute("aria-pressed", "false");
    icon.addEventListener("click", () => openApp(icon.dataset.app));
  }
  openApp("about");
})();
