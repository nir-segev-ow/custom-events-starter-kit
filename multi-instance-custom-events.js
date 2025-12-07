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
    this.extraConfig = rest;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    this.#setupLoadHandler();
    this.#setupClickHandlers();
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
    };
  }

  logStuff() {
    console.log(this.baseUrl);
    console.log(this.sections);
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

const eventsService = new EventsService({
  baseUrl: "base2",
  // sections: ["asd", "sdf"],
  loadEventName: "custom_load_event A1",
  ctaClickName: "custom_cta_event A1",
});

eventsService.init();
