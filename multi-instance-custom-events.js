class EventsService {
  constructor(config = {}) {
    const defaultBase = "https://analyticsnew.overwolf.com/analytics/Counter";
    const defaultSections = ["header", "top", "middle", "download-button", "download-button-modal"];
    const {
      baseUrl = defaultBase,
      sections = defaultSections,
      loadEventName = "default_load_event",
      ctaClickName = "default_cta_click_event",
      ctaSelector = "[data-cta='true']",
      ...rest
    } = config;

    this.baseUrl = baseUrl;
    this.sections = sections || defaultSections;
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

      const payload = {
        section: this.#resolveSection(target),
        cta_text: (target.textContent || "").trim(),
      };

      this.registerClickEvent(payload);
    });
  }

  #resolveSection(node) {
    if (!node) return this.sections?.[0] || "";

    const explicit = node.dataset?.position || node.getAttribute("data-position");
    if (explicit) return explicit;

    const container = node.closest("[data-position]");
    if (container) {
      return container.dataset?.position || container.getAttribute("data-position") || "";
    }

    return this.sections?.[0] || "";
  }

  async #sendAnalytic(name, extra = {}, baseUrl = this.baseUrl) {
    try {
      const params = new URLSearchParams();
      params.append("Name", name);
      params.append("Value", "0");
      params.append("Extra", JSON.stringify(extra));
      const url = `${baseUrl}?${params.toString()}`;
      console.log("BI event:", name, extra);
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
  sections: ["asd", "sdf"],
  loadEventName: "custom_load_event A1",
  ctaClickName: "custom_cta_event A1",
});

eventsService.init();