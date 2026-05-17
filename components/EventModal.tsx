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
  error?: string;
  submitting: boolean;
  onClose: () => void;
  onDelete: (eventId: string) => void;
  onEdit: () => void;
  onSubmit: (values: EventFormValues) => void;
};

const timeOptions = createTimeOptions();

export function EventModal({
  mode,
  event,
  lists,
  selectedStart,
  selectedEnd,
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
      start: toDateTimeLocalValue(
        event?.start ?? selectedStart ?? new Date()
      ),
      end: toDateTimeLocalValue(
        event?.end ??
          selectedEnd ??
          new Date((selectedStart ?? new Date()).getTime() + 60 * 60 * 1000)
      )
    };
  }, [activeLists, event, selectedEnd, selectedStart]);

  const [values, setValues] = useState(initialValues);

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8"
      role="dialog"
    >
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-line bg-white shadow-soft">
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent">
              <CalendarClock aria-hidden className="size-4" />
              팀 캘린더
            </div>
            <h2 className="mt-1 text-lg font-bold text-ink">
              {mode === "create"
                ? "새 일정"
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
                {formatDateRange(event.start, event.end)}
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
          <form className="space-y-4 px-5 py-5" onSubmit={handleSubmit}>
            <fieldset>
              <legend className="text-sm font-medium text-ink">목록</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
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

            <div className="grid gap-4 sm:grid-cols-2">
              <DateTimeField
                label="시작"
                value={values.start}
                onChange={(value) => updateValue("start", value)}
              />
              <DateTimeField
                label="종료"
                value={values.end}
                onChange={(value) => updateValue("end", value)}
              />
            </div>

            <label className="block">
              <span className="text-sm font-medium text-ink">작성자</span>
              <input
                className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
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
                className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
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
                className="mt-1 min-h-28 w-full rounded-md border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
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

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
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
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const date = getDatePart(value);
  const time = getTimePart(value);

  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink">{label}</legend>
      <div className="mt-1 grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
        <input
          className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          required
          type="date"
          value={date}
          onChange={(inputEvent) =>
            onChange(combineDateAndTime(inputEvent.target.value, time))
          }
        />
        <select
          className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          required
          value={time}
          onChange={(inputEvent) =>
            onChange(combineDateAndTime(date, inputEvent.target.value))
          }
        >
          {timeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
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
