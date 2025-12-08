# Custom Events Starter Kit

This repo shows how to wire a lightweight analytics helper into static landing pages while keeping CTA logic flexible and UTM-aware.

## Project Layout
- `example-1/` – Full Outplayed campaign page showcasing the integration in a production-like layout.
- `example-2/` – Minimal “action hub” surface that highlights every CTA permutation (launcher, installer, generic buttons).
- `example-2/style.css` – Color-blocked layout styles for the second example.
- `multi-instance-custom-events.js` – The reusable `EventsService` class that powers load + click tracking and launcher/installer URL generation.

## Usage
1. **Install deps** – `npm install`
2. **Run demos**
   - `npm run example-1` – opens the main experience.
   - `npm run example-1-utm` – same page preloaded with sample UTM params.
   - `npm run example-2` / `example-2-utm` – minimal surface for quick testing.
3. **Include the service**
   ```html
   <script src="../multi-instance-custom-events.js"></script>
   <script>
     const events = new window.EventsService({
       baseUrl: "https://analytics.overwolf.com/analytics/Counter",
       sections: ["header", "top", "middle", "download-button", "download-button-modal"],
       loadEventName: "custom_load_event",
       ctaClickName: "custom_cta_event",
       launcherPath: "outplayed-app://promotions-window?source=landing-page",
       installerPath: "https://download.overwolf.com/install/Download",
       extensionId: "cghphpbjeabdkomiphingnegihoigeggcfphdofo",
       partnerId: "4523",
     });
     events.init();
   </script>
   ```
   **Config hints**
   - `baseUrl` *(default: analytics counter endpoint)* – override per environment if needed.
   - `sections` *(default list of common slots)* – defines the allowed `data-position` values; each `[data-cta]` click walks up the DOM to find the closest ancestor whose `data-position` appears in this list. Defaults cover typical hero/footer placements but you can configure per campaign.
   - `loadEventName`, `ctaClickName`, `ctaSelector` *(defaults provided)* – update to match your BI taxonomy.
   - `launcherPath` *(default `outplayed-app://promotions-window?source=landing-page`)* – include your preferred fallback `source`.
   - `installerPath` *(default OW download URL)* – point to the correct installer if you host elsewhere.
   - `extensionId`, `partnerId` *(required for tracking)* – defaults are placeholders; marketing should set real values per campaign.

   Every `[data-cta]` element uses event delegation: when clicked, the script finds its closest ancestor with a `data-position` attribute that matches one of the `sections` values. That match becomes both the reported section and the `event-position` value, ensuring consistent attribution even when CTAs are injected dynamically.

### Marking CTAs and Sections
To leverage the service:
- Add `data-cta` to every clickable element you want to track (`a`, `button`, etc.). Non-marked clicks are ignored.
- Wrap CTAs in containers that include `data-position="section-id"`; choose ids from the `sections` array you pass to the constructor. Example:
  ```html
  <section class="hero" data-position="top">
    <a class="btn" data-cta role="button" data-launcher>Launch Now</a>
  </section>
  ```
- Keep using `data-launcher` or `data-installer` to trigger dynamic href generation with current UTM parameters.
- CTAs without a matching ancestor fall back to the default section, so ensure every intentional placement defines `data-position`.

## Key Features
- **Simplified tracking** – one class handles the load event plus delegated CTA clicks without sprinkling handlers across the DOM.
- **CTA analytics** – only elements with `data-cta` trigger clicks, and the service auto-detects the closest `data-position` section for accurate attribution.
- **Customizable events** – override event names, section lists, selectors, base URLs, launcher/installer paths, partner IDs, and extension IDs per instance.
- **Event delegation & UTM capture** – delegated listeners allow dynamic DOM updates while always reading the latest `utm_*` params before firing analytics or building launcher/installer URLs.
- **Launcher & installer helpers** – `[data-launcher]` elements get smart `outplayed-app://…?source=` links, while `[data-installer]` buttons embed UTM, partner, and extension values automatically.

Use these examples as a reference for plugging `EventsService` into new landing pages or campaigns that need consistent BI coverage with minimal code changes.
