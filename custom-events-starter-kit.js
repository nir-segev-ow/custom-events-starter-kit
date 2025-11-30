const ANALYTICS_LOG_EVENT = "custom-events:analytics-log";

const sendAnalytic = async (name, extra = {}, path = "https://analyticsnew.overwolf.com/analytics/Counter") => {
    try {
        const params = new URLSearchParams();
        params.append("Name", name);
        params.append("Value", "0");
        params.append("Extra", encodeURIComponent(JSON.stringify(extra)));
        const url = `${path}?${params.toString()}`;
        const logPayload = { eventName: name, params, url, extra };
        console.log(logPayload);
        if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" && typeof CustomEvent !== "undefined") {
            window.dispatchEvent(new CustomEvent(ANALYTICS_LOG_EVENT, { detail: logPayload }));
        }
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.send();
    } catch { }
};

const getUtmParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
        campaign: params.get("utm_campaign") || "",
        medium: params.get("utm_medium") || "",
        source: params.get("utm_source") || "",
    };
}

const getReferrer = () => {
    try {
        if (typeof document === 'undefined') return '';
        return document.referrer || '';
    } catch (err) {
        return '';
    }
};

const CTA_POSITIONS = Object.freeze({
    ["HEADER"]: "Primary hero CTA located in the page header",
    ["TOP"]: "Section-level CTA near the top fold of the content",
    ["MIDDLE"]: "Interactive CTA positioned alongside the sandbox controls",
    ["DOWNLOAD-BUTTON"]: "Inline download CTA used across experiences",
    ["DOWNLOAD-BUTTON-MODAL"]: "Modal-based download CTA for gated flows",
});

const POSITION_ATTRIBUTE = "data-position";
const PAGE_VIEW_EVENT = "page_view_event";
const CTA_CLICK_EVENT = "cta_click_event";
const CTA_ATTRIBUTE = "data-cta";
const INSTALLER_ATTRIBUTE = "data-installer";
const LAUNCHER_ATTRIBUTE = "data-launcher";
const DEFAULT_INSTALLER_BASE_URL = "https://download.overwolf.com/install/Download";
const SHARED_EXTENSION_ID = "cghphpbjeabdkomiphingnegihoigeggcfphdofo";
const DEFAULT_LAUNCHER_BASE_URL = "outplayed-app://promotions-window";
const DEFAULT_LAUNCHER_SOURCE = "landing-page";

const runtimeConfig = {
    pageViewEvent: PAGE_VIEW_EVENT,
    ctaClickEvent: CTA_CLICK_EVENT,
    ctaAttribute: CTA_ATTRIBUTE,
    positionAttribute: POSITION_ATTRIBUTE,
    positions: CTA_POSITIONS,
    analyticsPath: "",
    installerBaseUrl: DEFAULT_INSTALLER_BASE_URL,
    installerPartnerId: "",
    installerExtensionId: SHARED_EXTENSION_ID,
    installerUtmTerm: "",
    installerUtmContent: "",
    launcherBaseUrl: DEFAULT_LAUNCHER_BASE_URL,
    launcherSourceFallback: DEFAULT_LAUNCHER_SOURCE,
};

let delegatedListenerBound = false;
let delegatedHandler = null;
const actionClickHandlers = new WeakMap();

const normalizePosition = (element) => {
    if (typeof document === "undefined" || !element) return "";
    const attribute = runtimeConfig.positionAttribute || POSITION_ATTRIBUTE;
    const host = element.closest(`[${attribute}]`);
    const value = host?.getAttribute(attribute) || "";
    const key = value?.toUpperCase();
    const positionsMap = runtimeConfig.positions || CTA_POSITIONS;
    if (key && positionsMap[key]) {
        return value;
    }
    return "";
};

const handleCtaClick = (element) => {
    if (!element) return;
    const position = normalizePosition(element);
    const payload = {
        ...getUtmParams(),
        referral: getReferrer(),
        "button-position": position,
    };
    const eventName = runtimeConfig.ctaClickEvent || CTA_CLICK_EVENT;
    const path = runtimeConfig.analyticsPath;
    if (path) {
        sendAnalytic(eventName, payload, path);
    } else {
        sendAnalytic(eventName, payload);
    }
};

const bindCtaElements = () => {
    if (typeof document === "undefined") return;
    if (delegatedListenerBound && delegatedHandler) {
        document.removeEventListener("click", delegatedHandler);
        delegatedListenerBound = false;
    }
    const selector = `[${runtimeConfig.ctaAttribute || CTA_ATTRIBUTE}]`;
    delegatedHandler = (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const ctaElement = target.closest(selector);
        if (ctaElement instanceof HTMLElement) {
            handleCtaClick(ctaElement);
        }
    };
    document.addEventListener("click", delegatedHandler);
    delegatedListenerBound = true;
};

const assignActionUrl = (element, url) => {
    if (!element || !url) return;
    if (element instanceof HTMLAnchorElement || element instanceof HTMLAreaElement) {
        element.setAttribute("href", url);
        return;
    }
    const existingHandler = actionClickHandlers.get(element);
    if (existingHandler) {
        element.removeEventListener("click", existingHandler);
    }
    const handler = (event) => {
        event.preventDefault();
        if (typeof window !== "undefined") {
            window.location.assign(url);
        }
    };
    element.addEventListener("click", handler);
    actionClickHandlers.set(element, handler);
    element.setAttribute("data-action-url", url);
};

const buildInstallerUrl = () => {
    const partnerId = (runtimeConfig.installerPartnerId || "").trim();
    if (!partnerId) return "";
    const extensionId = runtimeConfig.installerExtensionId || SHARED_EXTENSION_ID;
    if (!extensionId) return "";
    const baseUrl = runtimeConfig.installerBaseUrl || DEFAULT_INSTALLER_BASE_URL;
    const params = new URLSearchParams({
        PartnerId: partnerId,
        ExtensionId: extensionId,
    });
    if (runtimeConfig.installerUtmTerm) {
        params.append("utm_term", runtimeConfig.installerUtmTerm);
    }
    if (runtimeConfig.installerUtmContent) {
        params.append("utm_content", runtimeConfig.installerUtmContent);
    }
    return `${baseUrl}?${params.toString()}`;
};

const applyInstallerAttributes = () => {
    if (typeof document === "undefined") return;
    const installerUrl = buildInstallerUrl();
    if (!installerUrl) return;
    document.querySelectorAll(`[${INSTALLER_ATTRIBUTE}]`).forEach((element) => {
        if (element instanceof HTMLElement) {
            assignActionUrl(element, installerUrl);
        }
    });
};

const buildLauncherUrl = () => {
    const baseUrl = (runtimeConfig.launcherBaseUrl || DEFAULT_LAUNCHER_BASE_URL).trim();
    if (!baseUrl) return "";
    const sourceValue = getUtmParams().source || runtimeConfig.launcherSourceFallback || DEFAULT_LAUNCHER_SOURCE;
    const hasQuery = baseUrl.includes("?");
    const needsSeparator = hasQuery && !baseUrl.endsWith("?") && !baseUrl.endsWith("&");
    const separator = hasQuery ? (needsSeparator ? "&" : "") : "?";
    return `${baseUrl}${separator}source=${encodeURIComponent(sourceValue)}`;
};

const applyLauncherAttributes = () => {
    if (typeof document === "undefined") return;
    const launcherUrl = buildLauncherUrl();
    if (!launcherUrl) return;
    document.querySelectorAll(`[${LAUNCHER_ATTRIBUTE}]`).forEach((element) => {
        if (element instanceof HTMLElement) {
            assignActionUrl(element, launcherUrl);
        }
    });
};

const applyActionAttributes = () => {
    if (typeof document === "undefined") return;
    const updateElements = () => {
        applyInstallerAttributes();
        applyLauncherAttributes();
    };
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", updateElements, { once: true });
    } else {
        updateElements();
    }
};

const initCustomEventsStarterKit = (config = {}) => {
    runtimeConfig.pageViewEvent = config.pageViewEvent || runtimeConfig.pageViewEvent;
    runtimeConfig.ctaClickEvent = config.ctaClickEvent || runtimeConfig.ctaClickEvent;
    runtimeConfig.ctaAttribute = config.ctaAttribute || runtimeConfig.ctaAttribute;
    runtimeConfig.positionAttribute = config.positionAttribute || runtimeConfig.positionAttribute;
    runtimeConfig.positions = config.positions || runtimeConfig.positions;
    runtimeConfig.analyticsPath = typeof config.analyticsPath === "string" ? config.analyticsPath : runtimeConfig.analyticsPath;
    runtimeConfig.installerBaseUrl = config.installerBaseUrl || runtimeConfig.installerBaseUrl;
    runtimeConfig.installerPartnerId = config.installerPartnerId || runtimeConfig.installerPartnerId;
    runtimeConfig.installerExtensionId = config.installerExtensionId || runtimeConfig.installerExtensionId;
    runtimeConfig.installerUtmTerm = config.installerUtmTerm || runtimeConfig.installerUtmTerm;
    runtimeConfig.installerUtmContent = config.installerUtmContent || runtimeConfig.installerUtmContent;
    runtimeConfig.launcherBaseUrl = config.launcherBaseUrl || runtimeConfig.launcherBaseUrl;
    runtimeConfig.launcherSourceFallback = config.launcherSourceFallback || runtimeConfig.launcherSourceFallback;
    bindCtaElements();
    applyActionAttributes();
};

if (typeof window !== "undefined") {
    window.customEventsStarterKit = Object.assign(window.customEventsStarterKit || {}, {
        init: initCustomEventsStarterKit,
        positions: CTA_POSITIONS,
    });

    const autoConfig = window.customEventsStarterKitConfig || window.customEventsConfig || {};
    initCustomEventsStarterKit(autoConfig);

    window.addEventListener("load", () => {
        const utm = getUtmParams();
        const referral = getReferrer();
        const eventName = runtimeConfig.pageViewEvent || PAGE_VIEW_EVENT;
        const payload = { ...utm, referral };
        const path = runtimeConfig.analyticsPath;
        if (path) {
            sendAnalytic(eventName, payload, path);
        } else {
            sendAnalytic(eventName, payload);
        }
    });
}
