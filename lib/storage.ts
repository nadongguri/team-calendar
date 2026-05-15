import type { CalendarData, CalendarItem, CalendarList } from "@/lib/types";

const defaultLists: Array<Pick<CalendarList, "id" | "name" | "color">> = [
  { id: "personal", name: "개인 일정", color: "#0e4e96" },
  { id: "project-a", name: "프로젝트 A", color: "#187f64" },
  { id: "project-b", name: "프로젝트 B", color: "#c76a14" },
  { id: "project-c", name: "프로젝트 C", color: "#7c3aed" },
  { id: "project-d", name: "프로젝트 D", color: "#9b2f5b" }
];

export function createId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}-${random}`;
}

export function createDefaultData(now = new Date()): CalendarData {
  const timestamp = now.toISOString();

  return {
    version: 1,
    lists: defaultLists.map((list) => ({
      ...list,
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp
    })),
    events: [],
    lastCleanedAt: null,
    updatedAt: timestamp
  };
}

export function normalizeData(value: unknown): CalendarData {
  if (!isObject(value)) {
    return createDefaultData();
  }

  const fallback = createDefaultData();
  const timestamp = new Date().toISOString();
  const lists = Array.isArray(value.lists)
    ? value.lists.map(normalizeList).filter(isCalendarList)
    : fallback.lists;
  const events = Array.isArray(value.events)
    ? value.events.map(normalizeEvent).filter(isCalendarEvent)
    : [];

  return {
    version: 1,
    lists: lists.length > 0 ? lists : fallback.lists,
    events,
    lastCleanedAt:
      typeof value.lastCleanedAt === "string" || value.lastCleanedAt === null
        ? value.lastCleanedAt
        : null,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : timestamp
  };
}

export function buildDownloadPayload(data: CalendarData) {
  return JSON.stringify(
    {
      ...data,
      exportedAt: new Date().toISOString()
    },
    null,
    2
  );
}

function normalizeList(value: unknown): CalendarList | null {
  if (!isObject(value)) {
    return null;
  }

  const now = new Date().toISOString();
  const id = typeof value.id === "string" ? value.id : createId("list");
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const color = isColor(value.color) ? value.color : "#0e4e96";

  if (!name) {
    return null;
  }

  return {
    id,
    name,
    color,
    active: typeof value.active === "boolean" ? value.active : true,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : now
  };
}

function normalizeEvent(value: unknown): CalendarItem | null {
  if (!isObject(value)) {
    return null;
  }

  const now = new Date().toISOString();
  const id = typeof value.id === "string" ? value.id : createId("event");
  const listId = typeof value.listId === "string" ? value.listId : "";
  const author = typeof value.author === "string" ? value.author.trim() : "";
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const content = typeof value.content === "string" ? value.content : "";
  const start = typeof value.start === "string" ? value.start : "";
  const end = typeof value.end === "string" ? value.end : "";

  if (!listId || !author || !title || Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) {
    return null;
  }

  return {
    id,
    listId,
    author,
    title,
    content,
    start,
    end,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : now
  };
}

function isColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCalendarList(value: CalendarList | null): value is CalendarList {
  return value !== null;
}

function isCalendarEvent(value: CalendarItem | null): value is CalendarItem {
  return value !== null;
}
