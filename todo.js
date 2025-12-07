(function () {
  "use strict";

  // --- Constants (required for OW download) ---
  const EXTENSION_ID = "cghphpbjeabdkomiphingnegihoigeggcfphdofo"; // Outplayed ID
  const PARTNER_ID = "4523"; // Your OW Partner ID

  // --- URL helpers / UTM / RAF ---
  const qs = new URLSearchParams(location.search);

  // Collect UTM params (keep only non-empty)
  const UTM = {};
  qs.forEach((v, k) => {
    if (k.toLowerCase().startsWith("utm_") && typeof v === "string" && v.trim() !== "") {
      UTM[k] = v.trim();
    }
  });

  // OPTIONAL: pass RAF into deep-link & download (for referral flows)
  const raf = qs.get("rafToken") || qs.get("raf_token") || qs.get("raf");
  if (raf) UTM.raf_token = raf;

  // --- Mixpanel guard (prevent old cached UTM from reappearing) ---
  (function enforceEmptyUtmWhenMissing() {
    if (!window.mixpanel) return;

    const defs = [
      { key: "utm_medium",   alt: "medium"   },
      { key: "utm_source",   alt: "source"   },
      { key: "utm_campaign", alt: "campaign" },
    ];

    let cleared = false;

    defs.forEach(({ key, alt }) => {
      const has = qs.has(key) || qs.has(alt);
      const raw = qs.get(key) ?? qs.get(alt);
      const empty = !has || (typeof raw === "string" && raw.trim() === "");
      if (empty) {
        try { mixpanel.unregister(key); } catch {}
        try { mixpanel.register({ [key]: "" }); } catch {}
        cleared = true;
      }
    });

    if (cleared) console.log("🧹 Mixpanel: cleared missing/empty utm_*");
  })();

  // --- Helpers ---
  const toHttps = (url) => {
    if (!url) return "";
    if (url.startsWith("//")) return "https:" + url;
    if (url.startsWith("http:")) return "https:" + url.slice(5);
    return url;
  };

  const upsertParams = (url, obj) => {
    const u = new URL(url, location.origin);
    Object.entries(obj || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, String(v));
    });
    return u.toString();
  };

  // Clean UTM extraction for BI (no defaults; missing/empty -> "")
  const getBIBaseExtra = () => {
    const tidy = (val) => (typeof val === "string" && val.trim() !== "" ? val.trim() : "");
    const campaign = tidy(qs.get("utm_campaign"));
    const medium   = tidy(qs.get("utm_medium"));
    const source   = tidy(qs.get("utm_source"));
    return { campaign, medium, source };
  };

  const buildExtra = (ctx = {}) => {
    const base = {
      lp: (document.body?.dataset?.lp || "outplayed").toLowerCase(),
      page_url: location.href,
      referral: document.referrer || "direct",
    };
    return Object.fromEntries(
      Object.entries({ ...base, ...UTM, ...ctx }).filter(
        ([, v]) => v !== undefined && v !== null && v !== ""
      )
    );
  };

  // --- Send analytic event to Overwolf BI ---
  const sendAnalytic = async (name, extra = {}) => {
    try {
      const params = new URLSearchParams();
      params.append("Name", name);
      params.append("Value", "0");
      params.append("Extra", JSON.stringify(extra)); // no double-encoding
      const url = `https://analyticsnew.overwolf.com/analytics/Counter?${params.toString()}`;
      console.log("📊 BI event:", name, extra);
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.send();
    } catch (e) {
      console.warn("BI send failed:", e);
    }
  };

  // --- Page view BI + Mixpanel ---
  window.addEventListener("load", () => {
    const utm = getBIBaseExtra();

    // BI view
    sendAnalytic("outplayed_v2_lp_special_offering_view", utm);

    // GTM mirror (optional)
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: "page_view_lp", extra: buildExtra({}) });
    } catch {}

    // Mixpanel mirror (explicit utm_* to override any auto-enrichment)
    try {
      if (window.mixpanel?.track) {
        mixpanel.track("page_view_lp", {
          utm_campaign: utm.campaign,
          utm_medium:   utm.medium,
          utm_source:   utm.source,
          extra: buildExtra({}),
        });
      }
    } catch {}
  });

  // --- Hover preview (real href) ---
  document.querySelectorAll(".launch-outplayed").forEach((btn) => {
    btn.addEventListener("mouseenter", () => {
      if (btn.getAttribute("href")) return;
      const deeplink = upsertParams("outplayed-app://seasonal-tab", UTM);
      btn.setAttribute("href", deeplink);
    });
  });

  document.querySelectorAll(".btn-partner-id").forEach((btn) => {
    btn.addEventListener("mouseenter", () => {
      if (btn.getAttribute("href")) return;
      let baseUrl = `https://download.overwolf.com/install/Download?PartnerId=${encodeURIComponent(
        PARTNER_ID
      )}&ExtensionId=${encodeURIComponent(EXTENSION_ID)}`;
      btn.setAttribute("href", upsertParams(toHttps(baseUrl), UTM));
    });
  });

  // --- CTA: Launch Outplayed (deep-link) ---
  document.querySelectorAll(".launch-outplayed").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey || e.button === 1) return;
      const deeplink = upsertParams("outplayed-app://seasonal-tab", UTM);

      const { campaign, medium, source } = getBIBaseExtra();
      const button_location = btn.dataset.position || btn.getAttribute("data-position") || "";

      // BI click
      sendAnalytic("outplayed_v2_lp_special_offering_click_cta", {
        button_location,
        campaign,
        medium,
        source,
      });

      // GTM + Mixpanel mirrors
      const extra = buildExtra({
        cta_text: (btn.textContent || "").trim() || null,
        cta_position: button_location || null,
        cta_type: "deep_link",
      });

      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "click_launch_outplayed_lp", extra });
      } catch {}

      try {
        if (window.mixpanel?.track) {
          mixpanel.track("click_launch_outplayed_lp", {
            utm_campaign: campaign,
            utm_medium:   medium,
            utm_source:   source,
            extra,
          });
        }
      } catch {}

      e.preventDefault();
      location.href = deeplink;
    });
  });

  // --- CTA: Download Outplayed via OW ---
  document.querySelectorAll(".btn-partner-id").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey || e.button === 1) return;

      let baseUrl = `https://download.overwolf.com/install/Download?PartnerId=${encodeURIComponent(
        PARTNER_ID
      )}&ExtensionId=${encodeURIComponent(EXTENSION_ID)}`;
      let mode = "fallback";
      try {
        const dct = window.OW?.downloadCampaignTracking?.getDownloadUrlForCampaign;
        if (dct) {
          const url = dct({
            PartnerId: PARTNER_ID,
            ExtensionId: EXTENSION_ID,
            rafToken: raf || null,
          });
          if (url) {
            baseUrl = url;
            mode = "dynamic";
          }
        }
      } catch {}

      baseUrl = toHttps(baseUrl);
      const finalUrl = upsertParams(baseUrl, UTM);

      const { campaign, medium, source } = getBIBaseExtra();
      const button_location = btn.dataset.position || btn.getAttribute("data-position") || "download_link";

      // BI click (same name per spec)
      sendAnalytic("outplayed_v2_lp_special_offering_click_cta", {
        button_location,
        campaign,
        medium,
        source,
      });

      // GTM + Mixpanel mirrors
      const extra = buildExtra({
        app_name: "Outplayed",
        app_id: EXTENSION_ID,
        app_os: "Windows",
        cta_text: (btn.textContent || "").trim() || null,
        cta_position: button_location || null,
        cta_type: "ow_download_outplayed",
        download_mode: mode,
        partner_id: PARTNER_ID,
        extension_id: EXTENSION_ID,
      });

      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "click_download_outplayed_lp", extra });
      } catch {}

      try {
        if (window.mixpanel?.track) {
          mixpanel.track("click_download_outplayed_lp", {
            utm_campaign: campaign,
            utm_medium:   medium,
            utm_source:   source,
            extra,
          });
        }
      } catch {}

      e.preventDefault();
      location.href = finalUrl;
    });
  });
})();