/* =======================
   op-to-outplayed (Lunar-style, final clean version)
   ======================= */
(function () {
  "use strict";

  const EXTENSION_ID = "cghphpbjeabdkomiphingnegihoigeggcfphdofo";
  const PARTNER_ID = "4523";
  const UTM_STORAGE_KEY = "outplayed_lp_utm";

  const qs = new URLSearchParams(location.search);

  // UTM from URL (non-empty only)
  const urlUTM = {};
  qs.forEach((v, k) => {
    if (k.toLowerCase().startsWith("utm_") && v.trim() !== "") {
      urlUTM[k] = v.trim();
    }
  });

  // RAF from URL
  const rafFromUrl = qs.get("rafToken") || qs.get("raf_token") || qs.get("raf");
  if (rafFromUrl) urlUTM.raf_token = rafFromUrl;

  // Load stored UTM
  let storedUTM = {};
  try {
    const raw = localStorage.getItem(UTM_STORAGE_KEY);
    if (raw) storedUTM = JSON.parse(raw) || {};
  } catch (_) { }

  // Final UTM = stored + URL
  const UTM = Object.assign({}, storedUTM, urlUTM);

  // Save into localStorage
  try {
    if (Object.keys(UTM).length > 0) {
      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(UTM));
    }
  } catch (_) { }

  // Helpers
  const toHttps = (url) => {
    if (!url) return "";
    if (url.startsWith("//")) return "https:" + url;
    if (url.startsWith("http:")) return "https:" + url.slice(5);
    return url;
  };

  const upsertParams = (url, obj) => {
    const u = new URL(url, location.origin);
    Object.entries(obj || {}).forEach(([k, v]) => {
      if (v) u.searchParams.set(k, String(v));
    });
    return u.toString();
  };

  // ===== Choose launch source from utm_source =====
  function getLaunchSource() {
    const src = (qs.get("utm_source") || "").trim();

    if (src === "landingpage_email") return "landingpage_email";
    if (src === "landingpage_cpc") return "landingpage_cpc";

    // default
    return "landing-page";
  }

  function getLaunchDeepLink() {
    return `outplayed-app://promotions-window?source=${getLaunchSource()}`;
  }
  // ================================================

  // Extract clean UTM for BI
  const getBIBaseExtra = () => {
    const tidy = (val) =>
      typeof val === "string" && val.trim() !== "" ? val.trim() : "";
    return {
      campaign: tidy(UTM.utm_campaign) || tidy(qs.get("utm_campaign")),
      medium: tidy(UTM.utm_medium) || tidy(qs.get("utm_medium")),
      source: tidy(UTM.utm_source) || tidy(qs.get("utm_source")),
    };
  };

  const buildExtra = (ctx = {}) => {
    const base = {
      lp: (document.body?.dataset?.lp || "outplayed").toLowerCase(),
      page_url: location.href,
      referral: document.referrer || "direct",
    };
    return Object.fromEntries(
      Object.entries({ ...base, ...UTM, ...ctx }).filter(([, v]) => v)
    );
  };

  // Sync UTM to Mixpanel (explicit, to avoid stale values)
  (function syncUtmToMixpanel() {
    if (!window.mixpanel) return;
    ["utm_medium", "utm_source", "utm_campaign"].forEach((key) => {
      try { mixpanel.register({ [key]: UTM[key] || "" }); } catch (_) { }
    });
  })();

  // BI event sender
  const sendAnalytic = (name, extra = {}) => {
    try {
      const params = new URLSearchParams();
      params.append("Name", name);
      params.append("Value", "0");
      params.append("Extra", JSON.stringify(extra));
      const xhr = new XMLHttpRequest();
      xhr.open(
        "GET",
        `https://analyticsnew.overwolf.com/analytics/Counter?${params.toString()}`,
        true
      );
      xhr.send();
    } catch (_) { }
  };

  // Page load analytics
  window.addEventListener("load", () => {
    const utm = getBIBaseExtra();

    sendAnalytic("outplayed_v2_lp_special_offering_view", utm);

    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "page_view_lp", extra: buildExtra({}) });
    } catch (_) { }

    try {
      if (window.mixpanel?.track) {
        mixpanel.track("page_view_lp", {
          utm_campaign: utm.campaign,
          utm_medium: utm.medium,
          utm_source: utm.source,
          extra: buildExtra({}),
        });
      }
    } catch (_) { }

    // Append UTM to T&C links
    try {
      const tosLinks = document.querySelectorAll(
        'a[href*="outplayed-blackfriday-sale/terms-and-conditions"]'
      );
      tosLinks.forEach((a) => (a.href = upsertParams(a.href, UTM)));
    } catch (_) { }
  });

  // --- Hover (Launch App) – use dynamic deep-link (no UTM)
  document.querySelectorAll(".launch-outplayed").forEach((btn) => {
    btn.addEventListener("mouseenter", () => {
      if (btn.getAttribute("href")) return;
      btn.setAttribute("href", getLaunchDeepLink());
    });
  });

  // --- Hover (Download)
  document.querySelectorAll(".btn-partner-id").forEach((btn) => {
    btn.addEventListener("mouseenter", () => {
      if (btn.getAttribute("href")) return;
      const base = `https://download.overwolf.com/install/Download?PartnerId=${PARTNER_ID}&ExtensionId=${EXTENSION_ID}`;
      btn.setAttribute("href", upsertParams(toHttps(base), UTM));
    });
  });

  // --- CTA: Launch Outplayed (deep-link chosen by utm_source)
  document.querySelectorAll(".launch-outplayed").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey || e.button === 1) return;

      const deeplink = getLaunchDeepLink(); // <- key change

      const { campaign, medium, source } = getBIBaseExtra();
      const button_location =
        btn.dataset.position || btn.getAttribute("data-position") || "";

      sendAnalytic("outplayed_v2_lp_special_offering_click_cta", {
        button_location,
        campaign,
        medium,
        source,
      });

      const extra = buildExtra({
        cta_text: (btn.textContent || "").trim() || null,
        cta_position: button_location,
        cta_type: "deep_link",
      });

      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "click_launch_outplayed_lp", extra });
      } catch (_) { }

      try {
        if (window.mixpanel?.track) {
          mixpanel.track("click_launch_outplayed_lp", {
            utm_campaign: campaign,
            utm_medium: medium,
            utm_source: source,
            extra,
          });
        }
      } catch (_) { }

      e.preventDefault();
      location.href = deeplink;
    });
  });

  // --- CTA: Download Outplayed
  document.querySelectorAll(".btn-partner-id").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey || e.button === 1) return;

      let baseUrl = `https://download.overwolf.com/install/Download?PartnerId=${PARTNER_ID}&ExtensionId=${EXTENSION_ID}`;
      let mode = "fallback";
      try {
        const dct = window.OW?.downloadCampaignTracking?.getDownloadUrlForCampaign;
        if (dct) {
          const url = dct({
            PartnerId: PARTNER_ID,
            ExtensionId: EXTENSION_ID,
            rafToken: UTM.raf_token || null,
          });
          if (url) {
            baseUrl = url;
            mode = "dynamic";
          }
        }
      } catch (_) { }

      const finalUrl = upsertParams(toHttps(baseUrl), UTM);

      const { campaign, medium, source } = getBIBaseExtra();
      const button_location =
        btn.dataset.position ||
        btn.getAttribute("data-position") ||
        "download_link";

      sendAnalytic("outplayed_v2_lp_special_offering_click_cta", {
        button_location,
        campaign,
        medium,
        source,
      });

      const extra = buildExtra({
        app_name: "Outplayed",
        app_id: EXTENSION_ID,
        app_os: "Windows",
        cta_text: (btn.textContent || "").trim() || null,
        cta_position: button_location,
        cta_type: "ow_download_outplayed",
        download_mode: mode,
        partner_id: PARTNER_ID,
        extension_id: EXTENSION_ID,
      });

      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "click_download_outplayed_lp", extra });
      } catch (_) { }

      try {
        if (window.mixpanel?.track) {
          mixpanel.track("click_download_outplayed_lp", {
            utm_campaign: campaign,
            utm_medium: medium,
            utm_source: source,
            extra,
          });
        }
      } catch (_) { }

      e.preventDefault();
      location.href = finalUrl;
    });
  });

  // --- CTA: Download from Modal (.btn-modal)
  document.querySelectorAll(".btn-modal").forEach((btn) => {
    btn.addEventListener("click", () => {
      const { campaign, medium, source } = getBIBaseExtra();

      sendAnalytic("outplayed_v2_lp_special_offering_click_cta", {
        button_location: "download_link_modal",
        campaign,
        medium,
        source
      });

      const extra = buildExtra({
        app_name: "Outplayed",
        app_id: EXTENSION_ID,
        app_os: "Windows",
        cta_text: (btn.textContent || "").trim() || null,
        cta_position: "download_link_modal",
        cta_type: "ow_download_outplayed",
        partner_id: PARTNER_ID,
        extension_id: EXTENSION_ID
      });

      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "click_download_outplayed_lp", extra });
      } catch (_) { }

      try {
        if (window.mixpanel?.track) {
          mixpanel.track("click_download_outplayed_lp", {
            utm_campaign: campaign,
            utm_medium: medium,
            utm_source: source,
            extra
          });
        }
      } catch (_) { }
    });
  });

})();
