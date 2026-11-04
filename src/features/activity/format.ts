// Fixed to the village's time zone so the server and the browser print the same text.
const TIME_ZONE = "Asia/Jakarta";

const DATE_TIME = new Intl.DateTimeFormat("id-ID", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const DATE_ONLY = new Intl.DateTimeFormat("id-ID", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});
const TIME_ONLY = new Intl.DateTimeFormat("id-ID", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "3 Nov 2026, 14.20" */
export function formatDateTime(iso: string) {
  return DATE_TIME.format(new Date(iso));
}

/** Format a stored date for the Indonesian dashboard display. */
export function formatDate(iso: string) {
  return DATE_ONLY.format(new Date(iso));
}

/** "14.20 WIB" */
export function formatTime(iso: string) {
  return `${TIME_ONLY.format(new Date(iso))} WIB`;
}
