"use client";

import { FormEvent, useMemo, useState } from "react";
import { CalendarClock, Pencil, Trash2, X } from "lucide-react";
import {
  formatDateRange,
  toDateTimeLocalValue
} from "@/lib/date";
import type { CalendarItem, CalendarList, EventFormValues } from "@/lib/types";

type EventModalProps = {
  mode: "create" | "edit" | "view";
  event: CalendarItem | null;
  lists: CalendarList[];
  selectedStart?: Date | null;
  selectedEnd?: Date | null;
  selectedAllDay?: boolean;
  error?: string;
  submitting: boolean;
  onClose: () => void;
  onDelete: (eventId: string) => void;
  onEdit: () => void;
  onSubmit: (values: EventFormValues) => void;
};

const timeOptions = createTimeOptions();
const meetingDurations = [
  { label: "30분", minutes: 30 },
  { label: "1시간", minutes: 60 },
  { label: "1시간 30분", minutes: 90 },
  { label: "2시간", minutes: 120 }
];

export function EventModal({
  mode,
  event,
  lists,
  selectedStart,
  selectedEnd,
  selectedAllDay = false,
  error,
  submitting,
  onClose,
  onDelete,
  onEdit,
  onSubmit
}: EventModalProps) {
  const activeLists = useMemo(
    () => lists.filter((list) => list.active),
    [lists]
  );
  const selectedList = lists.find((list) => list.id === event?.listId) ?? null;
  const isReadOnly = mode === "view";
  const initialValues = useMemo<EventFormValues>(() => {
    return {
      listId: event?.listId ?? activeLists[0]?.id ?? "",
      author: event?.author ?? "",
      title: event?.title ?? "",
      content: event?.content ?? "",
      allDay: event?.allDay ?? selectedAllDay,
      start: toDateTimeLocalValue(
        event?.start ?? selectedStart ?? new Date()
      ),
      end: toDateTimeLocalValue(
        event?.end ??
          selectedEnd ??
          new Date((selectedStart ?? new Date()).getTime() + 60 * 60 * 1000)
      )
    };
  }, [activeLists, event, selectedAllDay, selectedEnd, selectedStart]);

  const [values, setValues] = useState(initialValues);
  const selectedDuration = getDurationMinutes(values.start, values.end);

  function updateValue<K extends keyof EventFormValues>(
    key: K,
    value: EventFormValues[K]
  ) {
    setValues((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();

    if (!isReadOnly) {
      onSubmit(values);
    }
  }

  function updateAllDay(checked: boolean) {
    setValues((current) => {
      const startDate = getDatePart(current.start);

      if (checked) {
        return {
          ...current,
          allDay: true,
          start: combineDateAndTime(startDate, "00:00"),
          end: combineAllDayEnd(startDate)
        };
      }

      return {
        ...current,
        allDay: false,
        start: combineDateAndTime(startDate, "08:00"),
        end: combineDateAndTime(startDate, "09:00")
      };
    });
  }

  function updateStart(value: string) {
    setValues((current) => {
      const nextStart = new Date(value);

      if (Number.isNaN(nextStart.getTime())) {
        return {
          ...current,
          start: value
        };
      }

      if (current.allDay) {
        const currentStart = new Date(current.start);
        const currentEnd = new Date(current.end);
        const currentDuration = currentEnd.getTime() - currentStart.getTime();
        const duration =
          Number.isFinite(currentDuration) && currentDuration > 0
            ? currentDuration
            : 24 * 60 * 60 * 1000;

        return {
          ...current,
          start: value,
          end: toDateTimeLocalValue(new Date(nextStart.getTime() + duration))
        };
      }

      const currentDuration = getDurationMinutes(current.start, current.end);
      const duration = currentDuration > 0 ? currentDuration : 60;
      const closingTime = new Date(nextStart);
      closingTime.setHours(18, 0, 0, 0);

      let nextEnd = new Date(nextStart.getTime() + duration * 60_000);

      if (nextEnd > closingTime) {
        nextEnd = closingTime;
      }

      return {
        ...current,
        start: value,
        end: toDateTimeLocalValue(nextEnd)
      };
    });
  }

  function updateDuration(minutes: number) {
    setValues((current) => {
      const start = new Date(current.start);

      return {
        ...current,
        end: toDateTimeLocalValue(
          new Date(start.getTime() + minutes * 60_000)
        )
      };
    });
  }

  function handleDelete() {
    if (!event) {
      return;
    }

    const confirmed = window.confirm("이 일정을 삭제하시겠습니까?");

    if (confirmed) {
      onDelete(event.id);
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 sm:items-center sm:px-4 sm:py-8"
      role="dialog"
    >
      <section className="max-h-[calc(100dvh-1rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-lg border border-line bg-white pb-[env(safe-area-inset-bottom)] shadow-soft sm:max-h-[92vh] sm:rounded-lg sm:pb-0">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-white px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent">
              <CalendarClock aria-hidden className="size-4" />
              팀 캘린더
            </div>
            <h2 className="mt-1 text-lg font-bold text-ink">
              {mode === "create"
                ? (
                    <>
                      <span className="sm:hidden">회의 예약</span>
                      <span className="hidden sm:inline">새 일정</span>
                    </>
                  )
                : mode === "edit"
                  ? "일정 수정"
                  : "일정 상세"}
            </h2>
          </div>
          <button
            aria-label="닫기"
            className="inline-flex size-9 items-center justify-center rounded-md border border-line text-ink transition hover:bg-panel"
            type="button"
            onClick={onClose}
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        {isReadOnly && event ? (
          <div className="space-y-5 px-5 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                aria-hidden
                className="size-3 rounded-full"
                style={{ backgroundColor: selectedList?.color ?? "#0e4e96" }}
              />
              <span className="text-sm font-semibold text-ink">
                {selectedList?.name ?? "삭제된 목록"}
              </span>
            </div>

            <div>
              <h3 className="break-words text-2xl font-bold text-ink">
                {event.title}
              </h3>
              <p className="mt-2 text-sm text-muted">
                {event.allDay
                  ? formatAllDayRange(event.start, event.end)
                  : formatDateRange(event.start, event.end)}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <DetailBlock label="작성자" value={event.author} />
              <DetailBlock label="내용" value={event.content || "없음"} />
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <button
                className="inline-flex items-center gap-2 rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={submitting}
                type="button"
                onClick={handleDelete}
              >
                <Trash2 aria-hidden className="size-4" />
                삭제
              </button>
              <div className="flex gap-2">
                <button
                  className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-panel"
                  type="button"
                  onClick={onClose}
                >
                  닫기
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-900"
                  type="button"
                  onClick={onEdit}
                >
                  <Pencil aria-hidden className="size-4" />
                  수정
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form className="space-y-4 px-4 py-4 sm:px-5 sm:py-5" onSubmit={handleSubmit}>
            <fieldset>
              <legend className="text-sm font-medium text-ink">목록</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {activeLists.map((list) => {
                  const selected = values.listId === list.id;

                  return (
                    <button
                      key={list.id}
                      aria-pressed={selected}
                      className={`min-h-14 rounded-md border px-3 py-2 text-left text-sm transition ${
                        selected
                          ? "border-accent bg-blue-50 text-ink ring-2 ring-accent/20"
                          : "border-line bg-white text-ink hover:bg-panel"
                      }`}
                      type="button"
                      onClick={() => updateValue("listId", list.id)}
                    >
                      <span className="flex items-center gap-2 font-semibold">
                        <span
                          aria-hidden
                          className="size-3 rounded-full"
                          style={{ backgroundColor: list.color }}
                        />
                        {list.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-sm font-semibold text-ink">
              <input
                checked={values.allDay}
                className="size-4 accent-[#0e4e96]"
                type="checkbox"
                onChange={(inputEvent) => updateAllDay(inputEvent.target.checked)}
              />
              종일 일정
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <DateTimeField
                allDay={values.allDay}
                label="시작"
                value={values.start}
                onChange={updateStart}
              />
              <DateTimeField
                allDay={values.allDay}
                label="종료"
                value={values.end}
                onChange={(value) => updateValue("end", value)}
              />
            </div>

            {!values.allDay && (
              <fieldset className="sm:hidden">
                <legend className="text-sm font-medium text-ink">
                  회의 시간
                </legend>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {meetingDurations.map((duration) => {
                    const selected = selectedDuration === duration.minutes;
                    const disabled = !canApplyDuration(
                      values.start,
                      duration.minutes
                    );

                    return (
                      <button
                        key={duration.minutes}
                        aria-pressed={selected}
                        className={`min-h-11 rounded-md border px-1 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${
                          selected
                            ? "border-accent bg-blue-50 text-accent ring-2 ring-accent/20"
                            : "border-line bg-white text-ink active:bg-panel"
                        }`}
                        disabled={disabled}
                        type="button"
                        onClick={() => updateDuration(duration.minutes)}
                      >
                        {duration.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <label className="block">
              <span className="text-sm font-medium text-ink">작성자</span>
              <input
                autoComplete="name"
                className="mt-1 w-full rounded-md border border-line px-3 py-2 text-base outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm"
                enterKeyHint="next"
                maxLength={80}
                placeholder="이름 또는 팀명"
                required
                value={values.author}
                onChange={(inputEvent) =>
                  updateValue("author", inputEvent.target.value)
                }
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">제목</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2 text-base outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm"
                enterKeyHint="next"
                maxLength={120}
                required
                value={values.title}
                onChange={(inputEvent) =>
                  updateValue("title", inputEvent.target.value)
                }
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-ink">내용</span>
              <textarea
                className="mt-1 min-h-24 w-full rounded-md border border-line px-3 py-2 text-base outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 sm:min-h-28 sm:text-sm"
                placeholder="없음"
                value={values.content}
                onChange={(inputEvent) =>
                  updateValue("content", inputEvent.target.value)
                }
              />
            </label>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="sticky bottom-0 z-10 -mx-4 -mb-4 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white px-4 py-3 sm:static sm:mx-0 sm:mb-0 sm:px-0 sm:pb-0 sm:pt-4">
              <div>
                {mode === "edit" && event && (
                  <button
                    className="inline-flex items-center gap-2 rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={submitting}
                    type="button"
                    onClick={handleDelete}
                  >
                    <Trash2 aria-hidden className="size-4" />
                    삭제
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-panel"
                  type="button"
                  onClick={onClose}
                >
                  취소
                </button>
                <button
                  className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={submitting}
                  type="submit"
                >
                  {submitting ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-panel px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
        {value}
      </p>
    </div>
  );
}

function DateTimeField({
  allDay,
  label,
  value,
  onChange
}: {
  allDay: boolean;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const date = getDatePart(value);
  const time = getTimePart(value);
  const allDayEndDate = getAllDayEndDatePart(value);

  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink">
        {allDay ? `${label}일` : label}
      </legend>
      <div
        className={`mt-1 grid gap-2 ${
          allDay ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_7rem]"
        }`}
      >
        <input
          className="w-full min-w-0 rounded-md border border-line px-2 py-2 text-base outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 sm:px-3 sm:text-sm"
          required
          type="date"
          value={allDay && label === "종료" ? allDayEndDate : date}
          onChange={(inputEvent) =>
            onChange(
              allDay
                ? label === "종료"
                  ? combineAllDayEnd(inputEvent.target.value)
                  : combineDateAndTime(inputEvent.target.value, "00:00")
                : combineDateAndTime(inputEvent.target.value, time)
            )
          }
        />
        {!allDay && (
          <select
            className="w-full rounded-md border border-line bg-white px-2 py-2 text-base text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 sm:px-3 sm:text-sm"
            required
            value={time}
            onChange={(inputEvent) =>
              onChange(combineDateAndTime(date, inputEvent.target.value))
            }
          >
            {getTimeOptions(label).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}
      </div>
    </fieldset>
  );
}

function createTimeOptions() {
  const options: string[] = [];

  for (let hour = 8; hour <= 18; hour += 1) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 18 && minute > 0) {
        break;
      }

      options.push(
        `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
      );
    }
  }

  return options;
}

function getTimeOptions(label: string) {
  if (label === "시작") {
    return timeOptions.slice(0, -1);
  }

  if (label === "종료") {
    return timeOptions.slice(1);
  }

  return timeOptions;
}

function getDurationMinutes(start: string, end: string) {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return 0;
  }

  return Math.round((endTime - startTime) / 60_000);
}

function canApplyDuration(start: string, duration: number) {
  const startTime = new Date(start);

  if (Number.isNaN(startTime.getTime())) {
    return false;
  }

  const endTime = new Date(startTime.getTime() + duration * 60_000);
  const closingTime = new Date(startTime);
  closingTime.setHours(18, 0, 0, 0);

  return endTime <= closingTime;
}

function getDatePart(value: string) {
  return value.split("T")[0] ?? "";
}

function getTimePart(value: string) {
  const time = value.split("T")[1]?.slice(0, 5) ?? "08:00";
  return timeOptions.includes(time) ? time : "08:00";
}

function combineDateAndTime(date: string, time: string) {
  return `${date}T${time}`;
}

function combineAllDayEnd(date: string) {
  const end = new Date(`${date}T00:00`);
  end.setDate(end.getDate() + 1);
  return toDateTimeLocalValue(end);
}

function getAllDayEndDatePart(value: string) {
  const end = new Date(`${getDatePart(value)}T00:00`);
  end.setDate(end.getDate() - 1);
  return toDateInputValue(end);
}

function toDateInputValue(value: Date) {
  return toDateTimeLocalValue(value).slice(0, 10);
}

function formatAllDayRange(start: string, end: string) {
  const startText = formatDateOnly(start);
  const inclusiveEnd = new Date(end);
  inclusiveEnd.setDate(inclusiveEnd.getDate() - 1);
  const endText = formatDateOnly(inclusiveEnd);

  return startText === endText
    ? `${startText} 종일`
    : `${startText} - ${endText} 종일`;
}

function formatDateOnly(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium"
  }).format(date);
}
