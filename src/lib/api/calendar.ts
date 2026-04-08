// ── Client-side calendar event creation ──────────────────
// Generates Google Calendar deep links and .ics files so
// providers can add booked consultations to any calendar
// without requiring OAuth or API keys.

export interface CalendarEventParams {
  title: string;
  startIso: string;
  durationMinutes?: number;
  description?: string;
  location?: string;
}

/**
 * Format a Date to Google Calendar's UTC format: YYYYMMDDTHHmmSSZ
 */
function toGCalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Generate a Google Calendar "create event" URL.
 * Opens pre-filled in a new tab — no OAuth needed.
 */
export function buildGoogleCalendarUrl(params: CalendarEventParams): string {
  const start = new Date(params.startIso);
  const end = new Date(start.getTime() + (params.durationMinutes ?? 30) * 60_000);

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", params.title);
  url.searchParams.set("dates", `${toGCalDate(start)}/${toGCalDate(end)}`);
  if (params.description) url.searchParams.set("details", params.description);
  if (params.location) url.searchParams.set("location", params.location);

  return url.toString();
}

/**
 * Build an .ics (iCalendar) file content string.
 * Works with Apple Calendar, Outlook, and any standards-compliant client.
 */
export function buildIcsContent(params: CalendarEventParams): string {
  const start = new Date(params.startIso);
  const end = new Date(start.getTime() + (params.durationMinutes ?? 30) * 60_000);
  const now = new Date();
  const uid = `${crypto.randomUUID()}@vanitypalms.com`;

  const escapeIcs = (text: string) =>
    text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vanity Palms//Consultation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toGCalDate(now)}`,
    `DTSTART:${toGCalDate(start)}`,
    `DTEND:${toGCalDate(end)}`,
    `SUMMARY:${escapeIcs(params.title)}`,
    ...(params.description ? [`DESCRIPTION:${escapeIcs(params.description)}`] : []),
    ...(params.location ? [`LOCATION:${escapeIcs(params.location)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

/**
 * Trigger a browser download of an .ics file.
 */
export function downloadIcsFile(params: CalendarEventParams): void {
  const content = buildIcsContent(params);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "consultation.ics";
  document.body.appendChild(anchor);
  anchor.click();

  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
