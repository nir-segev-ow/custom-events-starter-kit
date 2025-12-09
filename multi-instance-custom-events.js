class EventsService {
  constructor(config = {}) {
    const defaultBase = "https://analyticsnew.overwolf.com/analytics/Counter";
    const defaultSections = ["header", "top", "middle", "download-button", "download-button-modal"];
    const {
      baseUrl = defaultBase,
      sections = defaultSections,
      loadEventName = "default_load_event",
      ctaClickName = "default_cta_click_event",
      ctaSelector = "[data-cta]",
      launcherPath = "outplayed-app://promotions-window?source=landing-page",
      installerPath = "https://download.overwolf.com/install/Download",
      extensionId = "cghphpbjeabdkomiphingnegihoigeggcfphdofo",
      partnerId = "4523",
      launcherSelector = "[data-launcher]",
      installerSelector = "[data-installer]",
      trackLoadEvent = true,
      ...rest
    } = config;

    this.baseUrl = baseUrl;
    const resolvedSections =
      Array.isArray(sections) && sections.length ? sections : defaultSections;
    this.sections = resolvedSections;
    this.sectionSet = new Set(resolvedSections);
    this.loadEventName = loadEventName;
    this.ctaClickName = ctaClickName;
    this.ctaSelector = ctaSelector;
    this.launcherPath = launcherPath;
    this.launcherDefaultSource = this.#extractParamFromUrl(launcherPath, "source") || "landing-page";
    this.installerPath = installerPath;
    this.extensionId = extensionId;
    this.partnerId = partnerId;
    this.launcherSelector = launcherSelector;
    this.installerSelector = installerSelector;
    this.trackLoadEvent = trackLoadEvent !== false;
    this.extraConfig = rest;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    if (this.trackLoadEvent) {
      this.#setupLoadHandler();
    }
    this.#setupClickHandlers();
    this.#setupLauncherHandlers();
  }

  registerLoadEvent(extra = this.getUtmParams()) {
    return this.#sendAnalytic(this.loadEventName, extra);
  }

  registerClickEvent(extra = this.getUtmParams()) {
    return this.#sendAnalytic(this.ctaClickName, extra);
  }

  getUtmParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      campaign: params.get("utm_campaign") || "",
      medium: params.get("utm_medium") || "",
      source: params.get("utm_source") || "",
      term: params.get("utm_term") || "",
      content: params.get("utm_content") || "",
    };
  }

  #setupLoadHandler() {
    const handler = () => this.registerLoadEvent();

    if (document.readyState === "complete") {
      handler();
      return;
    }

    const onReadyStateChange = () => {
      if (document.readyState !== "complete") return;
      document.removeEventListener("readystatechange", onReadyStateChange);
      handler();
    };

    document.addEventListener("readystatechange", onReadyStateChange);
  }

  #setupClickHandlers() {
    document.addEventListener("click", (event) => {
      const target = event.target?.closest(this.ctaSelector);
      if (!target) return;

      const section = this.#resolveSection(target);
      if (!section) return;

      const payload = {
        section,
        cta_text: (target.textContent || "").trim(),
        "event-position": section,
      };

      this.registerClickEvent(payload);
    });
  }

  #setupLauncherHandlers() {
    document.addEventListener("click", (event) => {
      const launcherSelector = this.launcherSelector || "[data-launcher]";
      const installerSelector = this.installerSelector || "[data-installer]";

      if (launcherSelector) {
        const launcherTarget = event.target?.closest(launcherSelector);
        if (launcherTarget) {
          const href = this.#buildLauncherHref();
          if (href) launcherTarget.setAttribute("href", href);
          return;
        }
      }

      if (installerSelector) {
        const installerTarget = event.target?.closest(installerSelector);
        if (installerTarget) {
          const href = this.#buildInstallerHref();
          if (href) installerTarget.setAttribute("href", href);
        }
      }
    });
  }

  #buildLauncherHref() {
    if (!this.launcherPath) return null;
    const { source } = this.getUtmParams();
    const launcherSource = source || this.launcherDefaultSource || "landing-page";
    return this.#applyParamsToUrl(this.launcherPath, { source: launcherSource });
  }

  #buildInstallerHref() {
    if (!this.installerPath) return null;
    const utm = this.getUtmParams();
    const params = {
      PartnerId: this.partnerId,
      ExtensionId: this.extensionId,
      utm_source: utm.source,
      utm_medium: utm.medium,
      utm_campaign: utm.campaign,
      utm_term: utm.term,
      utm_content: utm.content,
    };

    return this.#applyParamsToUrl(this.installerPath, params);
  }

  #applyParamsToUrl(basePath, params = {}) {
    if (!basePath) return null;
    const normalized = Object.entries(params).reduce((acc, [key, value]) => {
      acc[key] = this.#normalizeParamValue(value);
      return acc;
    }, {});

    try {
      const url = new URL(basePath, window.location.origin);
      Object.entries(normalized).forEach(([key, value]) => url.searchParams.set(key, value));
      return url.toString();
    } catch (err) {
      const [pathWithQuery, hashPart = ""] = basePath.split("#");
      const [path, query = ""] = pathWithQuery.split("?");
      const searchParams = new URLSearchParams(query);
      Object.entries(normalized).forEach(([key, value]) => searchParams.set(key, value));
      const queryString = searchParams.toString();
      const hash = hashPart ? `#${hashPart}` : "";
      return queryString ? `${path}?${queryString}${hash}` : `${path}${hash}`;
    }
  }

  #extractParamFromUrl(basePath, key) {
    if (!basePath || !key) return "";
    try {
      const url = new URL(basePath, window.location.origin);
      return url.searchParams.get(key) || "";
    } catch (err) {
      const [, query = ""] = basePath.split("?");
      if (!query) return "";
      return new URLSearchParams(query).get(key) || "";
    }
  }

  #normalizeParamValue(value) {
    if (value === undefined || value === null) return "";
    return value ? `${value}` : "";
  }

  #resolveSection(node) {
    if (!node || !this.sectionSet?.size) return null;

    let current = node;
    while (current && current !== document) {
      if (typeof current.getAttribute === "function") {
        const position = current.getAttribute("data-position");
        if (position && this.sectionSet.has(position)) {
          return position;
        }
      }

      current = current.parentElement || current.parentNode;
    }

    return null;
  }

  async #sendAnalytic(name, extra = {}, baseUrl = this.baseUrl) {
    try {
      const params = new URLSearchParams();
      const combinedExtra = {
        ...this.getUtmParams(),
        ...extra,
      };
      params.append("Name", name);
      params.append("Value", "0");
      params.append("Extra", JSON.stringify(combinedExtra));
      const url = `${baseUrl}?${params.toString()}`;
      console.log("BI event:", name, combinedExtra);
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.send();
    } catch (e) {
      console.warn("BI send failed:", e);
    }
  }
}

if (typeof window !== "undefined") {
  window.EventsService = EventsService;
} else if (typeof globalThis !== "undefined") {
  globalThis.EventsService = EventsService;
}
