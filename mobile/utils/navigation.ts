/**
 * SILAGEGUARD AI — Resilient Navigation Guards & Debouncer
 * Prevents multiple navigations when already on the target screen
 * and blocks rapid multi-tap screen stacking.
 */

let lastNavigationTimestamp = 0;
const NAVIGATION_DEBOUNCE_MS = 400;

export function safeNavigate(
  router: any,
  targetRoute: string,
  currentPathname?: string,
  useReplace: boolean = false
): boolean {
  const now = Date.now();

  // 1. Eliminate navigation if already on the same page
  if (currentPathname) {
    const cleanCurrent = currentPathname.replace(/\/$/, "");
    const cleanTarget = targetRoute.replace(/\/$/, "");
    if (cleanCurrent === cleanTarget) {
      return false;
    }
  }

  // 2. Eliminate rapid multi-tap double pushes
  if (now - lastNavigationTimestamp < NAVIGATION_DEBOUNCE_MS) {
    return false;
  }

  lastNavigationTimestamp = now;

  try {
    if (useReplace) {
      router.replace(targetRoute as any);
    } else {
      router.push(targetRoute as any);
    }
    return true;
  } catch (err) {
    console.warn("Navigation guard caught error:", err);
    return false;
  }
}

export function safeGoBack(
  router: any,
  fallbackRoute: string = "/home"
): void {
  const now = Date.now();
  if (now - lastNavigationTimestamp < NAVIGATION_DEBOUNCE_MS) {
    return;
  }
  lastNavigationTimestamp = now;

  try {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute as any);
    }
  } catch (err) {
    console.warn("Safe back navigation caught error:", err);
    try {
      router.replace(fallbackRoute as any);
    } catch {
      // noop
    }
  }
}
