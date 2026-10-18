// Browsers don't let a page open their settings, so the "Open settings"
// action on the location-blocked messages shows these steps instead,
// matched to the visitor's browser where we can tell which it is.
// Client-only: reads navigator, so call it from a tap, not during SSR.
export function locationSettingsSteps(): string {
  const ua = navigator.userAgent;
  // iPadOS reports a Mac user agent; touch support gives it away.
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  // Installed to the home screen: no address bar to tap.
  const standalone = window.matchMedia("(display-mode: standalone)").matches;

  if (ios) {
    if (standalone) {
      return "Open your device’s Settings → Privacy & Security → Location Services → Safari Websites, and choose While Using the App.";
    }
    if (/CriOS|FxiOS|EdgiOS/.test(ua)) {
      return "Open your device’s Settings, find this browser’s app, tap Location, and choose While Using the App.";
    }
    return "Tap the aA icon in the address bar, then Website Settings → Location → Allow.";
  }
  if (standalone) {
    return "Open your browser’s site settings for this site and set Location to Allow.";
  }
  if (/Android/.test(ua)) {
    return "Tap the icon to the left of the address bar, then Permissions, and turn Location on.";
  }
  if (/Firefox\//.test(ua)) {
    return "Click the crossed-out location icon in the address bar and clear the Blocked permission.";
  }
  if (/Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)) {
    return "In the menu bar, choose Safari → Settings for This Website, then set Location to Allow.";
  }
  return "Click the icon to the left of the address bar and turn Location on.";
}
