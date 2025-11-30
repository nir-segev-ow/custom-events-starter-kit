const logList = document.querySelector("#eventLog");
const CTA_SELECTOR = "[data-cta]";
const POSITION_ATTRIBUTE = "data-position";
const ANALYTICS_LOG_EVENT = "custom-events:analytics-log";
const btn = document.querySelector("#dispatchEventBtn");
const paramsContainer = document.querySelector("#paramsContainer");
const addParamBtn = document.querySelector("#addParamRow");
const downloadModal = document.querySelector("#downloadModal");
const openDownloadModalBtn = document.querySelector("#openDownloadModal");
const closeDownloadModalBtn = document.querySelector("#closeDownloadModal");

const EVENT_NAME = "custom:payload";
const MIN_INITIAL_ROWS = 3;

const formatLogData = (data) => {
  if (!data && data !== 0) return "";
  if (typeof data === "string") return data;
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};

function logEvent({ label, meta = "", data = null, level = "default" } = {}) {
  if (!logList || !label) return;
  const item = document.createElement("li");
  item.className = `log-entry log-entry--${level}`;

  const header = document.createElement("div");
  header.className = "log-entry__header";

  const labelEl = document.createElement("strong");
  labelEl.className = "log-entry__label";
  labelEl.textContent = label;

  const metaEl = document.createElement("span");
  metaEl.className = "log-entry__meta";
  const time = new Date().toLocaleTimeString();
  metaEl.textContent = meta ? `${meta} • ${time}` : time;

  header.append(labelEl, metaEl);
  item.append(header);

  const formatted = formatLogData(data);
  if (formatted) {
    const pre = document.createElement("pre");
    pre.className = "log-entry__data";
    pre.textContent = formatted;
    item.append(pre);
  }

  logList.prepend(item);
}

function currentUrlParams() {
  return new URLSearchParams(window.location.search);
}

function syncRowsToUrl() {
  if (!paramsContainer) return;
  const params = new URLSearchParams();
  paramsContainer.querySelectorAll(".param-row").forEach((row) => {
    const key = row.querySelector(".param-key")?.value.trim();
    const value = row.querySelector(".param-value")?.value.trim() ?? "";
    if (key) {
      params.append(key, value);
    }
  });
  const query = params.toString();
  const next = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", next);
}

function createParamRow(key = "", value = "") {
  if (!paramsContainer) return null;
  const row = document.createElement("div");
  row.className = "param-row";

  const keyInput = document.createElement("input");
  keyInput.type = "text";
  keyInput.placeholder = "Key";
  keyInput.className = "param-key";
  keyInput.value = key;

  const valueInput = document.createElement("input");
  valueInput.type = "text";
  valueInput.placeholder = "Value";
  valueInput.className = "param-value";
  valueInput.value = value;

  keyInput.addEventListener("input", syncRowsToUrl);
  valueInput.addEventListener("input", syncRowsToUrl);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "icon-btn";
  removeBtn.setAttribute("aria-label", "Remove parameter");
  removeBtn.textContent = "X";

  removeBtn.addEventListener("click", () => {
    row.remove();
    syncRowsToUrl();
  });

  row.append(keyInput, valueInput, removeBtn);
  paramsContainer.append(row);
  syncRowsToUrl();
  return keyInput;
}

function initParamEditor() {
  if (!paramsContainer) return;
  const existingEntries = Array.from(currentUrlParams().entries());
  if (existingEntries.length) {
    existingEntries.forEach(([key, value]) => {
      createParamRow(key, value);
    });
  }

  const rowsNeeded = Math.max(MIN_INITIAL_ROWS - paramsContainer.childElementCount, 0);
  for (let i = 0; i < rowsNeeded; i += 1) {
    createParamRow();
  }

  addParamBtn?.addEventListener("click", () => {
    const keyInput = createParamRow();
    keyInput?.focus();
  });
}

function paramsObject() {
  if (!paramsContainer) return {};
  const params = {};
  paramsContainer.querySelectorAll(".param-row").forEach((row) => {
    const key = row.querySelector(".param-key")?.value.trim();
    const value = row.querySelector(".param-value")?.value.trim() ?? "";
    if (key) {
      params[key] = value;
    }
  });
  return params;
}

const buildCtaDetails = (element) => {
  if (!element) {
    return {
      text: "",
      id: "",
      tagName: "",
      position: "",
      attributes: {}
    };
  }
  const text = (element.textContent || "").trim() || element.getAttribute("aria-label") || element.id || element.tagName.toLowerCase();
  const positionHost = element.closest(`[${POSITION_ATTRIBUTE}]`);
  const position = positionHost?.getAttribute(POSITION_ATTRIBUTE) || "";
  const attributes = Array.from(element.attributes).reduce((acc, attr) => {
    if (attr.name.startsWith("data-")) {
      acc[attr.name] = attr.value || true;
    }
    return acc;
  }, {});
  return {
    text,
    id: element.id || "",
    tagName: element.tagName.toLowerCase(),
    position,
    attributes
  };
};

const handleCtaStreamLog = (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const cta = target.closest(CTA_SELECTOR);
  if (!cta) return;
  const details = buildCtaDetails(cta);
  const metaParts = [details.text, details.position].filter(Boolean);
  logEvent({
    label: "CTA clicked",
    meta: metaParts.join(" • "),
    data: details,
    level: "cta"
  });
};

const initCtaActivityLogging = () => {
  if (typeof document === "undefined") return;
  document.addEventListener("click", handleCtaStreamLog);
};

const normalizeParamsData = (params) => {
  if (typeof URLSearchParams !== "undefined" && params instanceof URLSearchParams) {
    return Object.fromEntries(params.entries());
  }
  return params;
};

window.addEventListener(ANALYTICS_LOG_EVENT, (event) => {
  const payload = event.detail || {};
  const logData = {
    ...payload,
    params: normalizeParamsData(payload.params),
  };
  logEvent({
    label: "Analytics request",
    meta: payload.eventName || "sendAnalytic",
    data: logData,
    level: "analytics",
  });
});

window.addEventListener(EVENT_NAME, (event) => {
  logEvent({
    label: "Custom event received",
    meta: EVENT_NAME,
    data: event.detail,
    level: "received"
  });
  console.info(`[${EVENT_NAME}] received`, event.detail);
});

btn?.addEventListener("click", () => {
  const payload = {
    message: "Dispatched via custom events starter kit",
    params: paramsObject(),
    timestamp: Date.now()
  };

  const customEvent = new CustomEvent(EVENT_NAME, { detail: payload });
  window.dispatchEvent(customEvent);
  logEvent({
    label: "Custom event dispatched",
    meta: EVENT_NAME,
    data: payload,
    level: "dispatched"
  });
  console.info(`[${EVENT_NAME}] dispatched`, payload);
});

initParamEditor();
initCtaActivityLogging();

function setModalVisibility(shouldShow) {
  if (!downloadModal) return;
  const nextState = typeof shouldShow === "boolean" ? shouldShow : !downloadModal.classList.contains("is-visible");
  downloadModal.classList.toggle("is-visible", nextState);
  downloadModal.setAttribute("aria-hidden", nextState ? "false" : "true");
}

openDownloadModalBtn?.addEventListener("click", () => setModalVisibility());
closeDownloadModalBtn?.addEventListener("click", () => setModalVisibility(false));
downloadModal?.addEventListener("click", (event) => {
  if (event.target === downloadModal) {
    setModalVisibility(false);
  }
});
