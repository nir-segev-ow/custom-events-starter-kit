# Custom Events Starter Kit - Integration Notes

These notes are intended for developers embedding the evolving `custom-events-starter-kit.js` helper on lightweight minisites. The script handles analytics dispatching, so your main tasks are adding the script tag, wiring optional configuration, and annotating markup with the expected data attributes.

> NOTE: The kit is still under active development. Refresh this document whenever you pull new updates.

## 1. Add the shared script

```html
<script>
  window.customEventsStarterKitConfig = {
    pageViewEvent: "page_view_event",
    ctaClickEvent: "cta_click_event",
    ctaAttribute: "data-cta",
    positionAttribute: "data-position",
    positions: [
      "HEADER",
      "TOP",
      "MIDDLE",
      "DOWNLOAD-BUTTON",
      "DOWNLOAD-BUTTON-MODAL",
    ],
    analyticsPath: "https://analyticsnew.overwolf.com/analytics/Counter",
    installerPartnerId: "4523",
    installerBaseUrl: "https://download.overwolf.com/install/Download",
    installerUtmTerm: "",
    installerUtmContent: "",
    launcherBaseUrl: "outplayed-app://promotions-window",
    launcherSourceFallback: "landing-page",
  };
</script>
<script type="module" src="/custom-events-starter-kit.js"></script>
```

Define `window.customEventsStarterKitConfig` before the script so the automatic page-load event uses your overrides. Changing the values afterward would be too late because the kit dispatches the page view on `window.load`.
You can omit any fields you do not need; defaults kick in automatically.
Set `positions` to an array of uppercase strings that represent the allowed placement names (legacy object syntax is still accepted, but only the keys are used).

## 2. Annotate CTA elements

Every clickable call-to-action you want tracked must carry the `data-cta` attribute (or the custom attribute you set via `ctaAttribute`).

```html
<button class="primary" data-cta>Download</button>
<a href="#pricing" data-cta>See Pricing</a>
```

Because the listener uses event delegation, new CTAs added later will be tracked automatically as long as they include `data-cta`.

## 3. Provide a `data-position`

Each CTA needs to be associated with one of the approved positions so analytics payloads include the placement context. Add a `data-position="<value>"` to the nearest ancestor that represents the CTA's location. Current allowed values (configurable via `customEventsStarterKitConfig.positions`; keep each entry uppercase):

- `HEADER`
- `TOP`
- `MIDDLE`
- `DOWNLOAD-BUTTON`
- `DOWNLOAD-BUTTON-MODAL`

Example:

```html
<section class="hero" data-position="HEADER">
  <button data-cta>Hero CTA</button>
</section>
```

If a CTA has no ancestor with a valid `data-position`, the analytics event will omit `button-position`, so make sure every placement is annotated.

## 4. Installer CTAs (`data-installer`)

Add `data-installer` to any link or button that should open the Overwolf installer. The helper script builds the final URL automatically:

```
https://download.overwolf.com/install/Download?PartnerId=<yourId>&ExtensionId=cghphpbjeabdkomiphingnegihoigeggcfphdofo&...
```

Guidelines:

- Set `installerPartnerId` in the config. This value is required for URL generation.
- `ExtensionId` is the shared constant above. Override it with `installerExtensionId` only if you have a special case.
- The script always appends `utm_term` and `utm_content`; the values come from `installerUtmTerm` and `installerUtmContent` (defaulting to empty strings when not provided).
- Non-anchor elements receive a click handler that navigates to the installer URL, so buttons work out of the box.

Example:

```html
<a class="primary" data-cta data-installer>Install Outplayed</a>
```

## 5. Launcher CTAs (`data-launcher`)

Add `data-launcher` to deeplink into the Outplayed launcher. By default the base URL is `outplayed-app://promotions-window`, but you can override it with `launcherBaseUrl`.

- The helper appends a `source` query parameter. If your base URL already has query parameters, it uses `&source=...`; otherwise it uses `?source=...`.
- The `source` value comes from `utm_source`. When that is missing, the script falls back to `launcherSourceFallback` (`landing-page` by default).

Example:

```html
<button class="secondary" data-cta data-launcher>Open Launcher</button>
```

## 6. Confirm UTM passthrough (optional)

The kit automatically reads `utm_campaign`, `utm_medium`, and `utm_source` from the page URL, so no work is needed unless you manipulate the address bar elsewhere. Ensure you do not strip these parameters before the shared script initializes.

## 7. Download/modal scenario

For flows involving download buttons or modal CTAs, keep using the same `data-cta` and `data-position` rules. For modals, set `data-position="DOWNLOAD-BUTTON-MODAL"` on the modal container so clicks on enclosed buttons inherit the correct placement.

---

That is it for now. As the starter kit evolves, expect additional attributes or helper hooks. Save your work so you can reapply updates easily when new guidance arrives.
