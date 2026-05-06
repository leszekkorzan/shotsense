import { useEffect } from "react";
import type { BROWSER_EVENTS } from "@/constants/browser-events";

export function useBrowserEvent(
  eventName: (typeof BROWSER_EVENTS)[keyof typeof BROWSER_EVENTS],
  callback: () => void
) {
  useEffect(() => {
    window.addEventListener(eventName, callback);

    return () => {
      window.removeEventListener(eventName, callback);
    };
  }, [eventName, callback]);
}

export function sendBrowserEvent(
  eventName: (typeof BROWSER_EVENTS)[keyof typeof BROWSER_EVENTS]
) {
  window.dispatchEvent(new CustomEvent(eventName));
}
