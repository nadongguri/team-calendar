export function toDateTimeLocalValue(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function dateTimeLocalToIso(value: string) {
  return new Date(value).toISOString();
}

export function formatDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function formatDateRange(start: string | Date, end: string | Date) {
  return `${formatDateTime(start)} - ${formatDateTime(end)}`;
}

export function formatRelativeSaveTime(value: string | null) {
  if (!value) {
    return "아직 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function isTenMinuteBoundary(value: string) {
  const date = new Date(value);
  return (
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0 &&
    date.getMinutes() % 10 === 0
  );
}

export function getSixMonthCleanupCutoff(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - 6);
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
}

export function getDefaultCreateRange(start: Date, allDay?: boolean) {
  if (!allDay) {
    return {
      start,
      end: addMinutes(start, 60)
    };
  }

  const normalizedStart = new Date(start);
  normalizedStart.setHours(8, 0, 0, 0);

  return {
    start: normalizedStart,
    end: addMinutes(normalizedStart, 60)
  };
}
