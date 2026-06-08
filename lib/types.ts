export type CalendarList = {
  id: string;
  name: string;
  color: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CalendarItem = {
  id: string;
  listId: string;
  author: string;
  title: string;
  content: string;
  allDay: boolean;
  start: string;
  end: string;
  createdAt: string;
  updatedAt: string;
};

export type CalendarData = {
  version: 1;
  lists: CalendarList[];
  events: CalendarItem[];
  lastCleanedAt: string | null;
  updatedAt: string;
};

export type EventFormValues = {
  listId: string;
  author: string;
  title: string;
  content: string;
  allDay: boolean;
  start: string;
  end: string;
};

export type CalendarListRow = {
  id: string;
  name: string;
  color: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type CalendarEventRow = {
  id: string;
  list_id: string;
  author: string;
  title: string;
  content: string;
  all_day: boolean;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
};

export type CalendarSettingsRow = {
  id: boolean;
  last_cleaned_at: string | null;
  updated_at: string;
};
