"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import koLocale from "@fullcalendar/core/locales/ko";
import type { DateSelectArg, EventClickArg, EventInput } from "@fullcalendar/core";
import {
  CalendarDays,
  Check,
  Download,
  ListFilter,
  LogOut,
  Plus,
  Settings,
  Sparkles
} from "lucide-react";
import { AdminPanel } from "@/components/AdminPanel";
import { EventModal } from "@/components/EventModal";
import {
  addMinutes,
  dateTimeLocalToIso,
  formatRelativeSaveTime,
  getSixMonthCleanupCutoff,
  isTenMinuteBoundary
} from "@/lib/date";
import {
  buildDownloadPayload,
  createDefaultData,
  normalizeData
} from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import type {
  CalendarData,
  CalendarEventRow,
  CalendarItem,
  CalendarList,
  CalendarListRow,
  CalendarSettingsRow,
  EventFormValues
} from "@/lib/types";

type TeamCalendarProps = {
  userEmail: string;
  userId: string;
  isAdmin: boolean;
  onSignOut: () => void;
};

type ModalState =
  | {
      kind: "create";
      event: null;
      start: Date;
      end: Date;
    }
  | {
      kind: "edit" | "view";
      event: CalendarItem;
      start: null;
      end: null;
    }
  | null;

export function TeamCalendar({
  userEmail,
  userId,
  isAdmin,
  onSignOut
}: TeamCalendarProps) {
  const [lists, setLists] = useState<CalendarList[]>([]);
  const [events, setEvents] = useState<CalendarItem[]>([]);
  const [lastCleanedAt, setLastCleanedAt] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(new Date().toISOString());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visibleListIds, setVisibleListIds] = useState<string[]>([]);
  const [adminOpen, setAdminOpen] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [modalError, setModalError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const normalizedUserEmail = userEmail.toLowerCase();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [listsResult, eventsResult, settingsResult] = await Promise.all([
      supabase
        .from("calendar_lists")
        .select("id, name, color, active, created_at, updated_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("calendar_events")
        .select("id, list_id, author, title, content, start_time, end_time, created_at, updated_at")
        .order("start_time", { ascending: true }),
      supabase
        .from("calendar_settings")
        .select("id, last_cleaned_at, updated_at")
        .eq("id", true)
        .maybeSingle()
    ]);

    if (listsResult.error) {
      setError(listsResult.error.message);
      setLoading(false);
      return;
    }

    if (eventsResult.error) {
      setError(eventsResult.error.message);
      setLoading(false);
      return;
    }

    if (settingsResult.error) {
      setError(settingsResult.error.message);
      setLoading(false);
      return;
    }

    const nextLists = ((listsResult.data ?? []) as CalendarListRow[]).map(
      mapListRow
    );
    const nextEvents = ((eventsResult.data ?? []) as CalendarEventRow[]).map(
      mapEventRow
    );
    const settings = settingsResult.data as CalendarSettingsRow | null;

    setLists(nextLists);
    setEvents(nextEvents);
    setLastCleanedAt(settings?.last_cleaned_at ?? null);
    setLastSyncedAt(new Date().toISOString());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setVisibleListIds((current) => {
      const activeIds = lists
        .filter((list) => list.active)
        .map((list) => list.id);
      const retainedIds = current.filter((id) => activeIds.includes(id));
      const appendedIds = activeIds.filter((id) => !retainedIds.includes(id));

      return [...retainedIds, ...appendedIds];
    });
  }, [lists]);

  const calendarData = useMemo<CalendarData>(() => {
    return {
      version: 1,
      lists,
      events,
      lastCleanedAt,
      updatedAt: lastSyncedAt
    };
  }, [events, lastCleanedAt, lastSyncedAt, lists]);

  const listMap = useMemo(() => {
    return new Map(lists.map((list) => [list.id, list]));
  }, [lists]);

  const activeLists = useMemo(() => {
    return lists.filter((list) => list.active);
  }, [lists]);

  const calendarEvents = useMemo<EventInput[]>(() => {
    return events
      .filter((event) => {
        const list = listMap.get(event.listId);
        return list?.active && visibleListIds.includes(event.listId);
      })
      .map((event) => {
        const list = listMap.get(event.listId);
        const color = list?.color ?? "#657080";

        return {
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          backgroundColor: color,
          borderColor: color,
          extendedProps: {
            event
          }
        };
      });
  }, [events, listMap, visibleListIds]);

  const cleanupCutoff = useMemo(() => getSixMonthCleanupCutoff(), []);
  const cleanupCount = useMemo(() => {
    return events.filter((event) => new Date(event.end) < cleanupCutoff).length;
  }, [cleanupCutoff, events]);
  const cleanupDue =
    !lastCleanedAt || new Date(lastCleanedAt) < cleanupCutoff;

  function openCreateModal(selection?: DateSelectArg) {
    setModalError("");

    if (activeLists.length === 0) {
      setNotice("일정을 만들려면 관리자 모드에서 사용할 목록이 하나 이상 필요합니다.");
      return;
    }

    const start = selection?.allDay
      ? normalizeAllDayStart(selection.start)
      : selection?.start ?? getNextHour();
    const end = selection?.allDay
      ? addMinutes(start, 60)
      : selection?.end ?? addMinutes(start, 60);

    setModal({
      kind: "create",
      event: null,
      start,
      end
    });
  }

  function openEventModal(clickInfo: EventClickArg) {
    const event = clickInfo.event.extendedProps.event as CalendarItem;
    setModalError("");
    setModal({
      kind: "view",
      event,
      start: null,
      end: null
    });
  }

  async function saveEvent(values: EventFormValues) {
    setSubmitting(true);
    setModalError("");

    const startIso = dateTimeLocalToIso(values.start);
    const endIso = dateTimeLocalToIso(values.end);
    const list = listMap.get(values.listId);

    if (!list?.active) {
      setModalError("사용 중인 목록을 선택해 주세요.");
      setSubmitting(false);
      return;
    }

    if (new Date(endIso) <= new Date(startIso)) {
      setModalError("종료 시간은 시작 시간보다 늦어야 합니다.");
      setSubmitting(false);
      return;
    }

    if (!isTenMinuteBoundary(startIso) || !isTenMinuteBoundary(endIso)) {
      setModalError("일정 시간은 10분 단위로 선택해 주세요.");
      setSubmitting(false);
      return;
    }

    const trimmedAuthor = values.author.trim();
    const trimmedTitle = values.title.trim();

    if (!trimmedAuthor || !trimmedTitle) {
      setModalError("작성자와 제목을 입력해 주세요.");
      setSubmitting(false);
      return;
    }

    const payload = {
      list_id: values.listId,
      author: trimmedAuthor,
      title: trimmedTitle,
      content: values.content.trim(),
      start_time: startIso,
      end_time: endIso
    };

    const result =
      modal?.kind === "edit"
        ? await supabase
            .from("calendar_events")
            .update(payload)
            .eq("id", modal.event.id)
        : await supabase.from("calendar_events").insert({
            ...payload,
            created_by_user_id: userId,
            created_by_email: normalizedUserEmail
          });

    if (result.error) {
      setModalError(result.error.message);
      setSubmitting(false);
      return;
    }

    await loadData();
    setSubmitting(false);
    setModal(null);
    setNotice("일정이 저장되었습니다.");
  }

  async function deleteEvent(eventId: string) {
    setSubmitting(true);
    setModalError("");

    const { error: deleteError } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", eventId);

    if (deleteError) {
      setModalError(deleteError.message);
      setSubmitting(false);
      return;
    }

    await loadData();
    setSubmitting(false);
    setModal(null);
    setNotice("일정이 삭제되었습니다.");
  }

  async function addList(name: string, color: string) {
    if (!isAdmin) {
      setNotice("관리자만 목록을 추가할 수 있습니다.");
      return;
    }

    const { error: insertError } = await supabase.from("calendar_lists").insert({
      name,
      color,
      active: true
    });

    if (insertError) {
      setNotice(insertError.message);
      return;
    }

    await loadData();
  }

  async function updateList(
    id: string,
    patch: Partial<Pick<CalendarList, "name" | "color" | "active">>
  ) {
    if (!isAdmin) {
      setNotice("관리자만 목록을 수정할 수 있습니다.");
      return;
    }

    if (typeof patch.name === "string" && patch.name.trim().length === 0) {
      return;
    }

    const payload: {
      active?: boolean;
      color?: string;
      name?: string;
    } = {};

    if (typeof patch.active === "boolean") {
      payload.active = patch.active;
    }

    if (typeof patch.color === "string") {
      payload.color = patch.color;
    }

    if (typeof patch.name === "string") {
      payload.name = patch.name.trim();
    }

    const { error: updateError } = await supabase
      .from("calendar_lists")
      .update(payload)
      .eq("id", id);

    if (updateError) {
      setNotice(updateError.message);
      return;
    }

    await loadData();
  }

  async function deleteList(id: string) {
    if (!isAdmin) {
      setNotice("관리자만 목록을 삭제할 수 있습니다.");
      return;
    }

    if (lists.length <= 1) {
      window.alert("목록은 최소 1개가 필요합니다.");
      return;
    }

    const eventCount = events.filter((event) => event.listId === id).length;
    const confirmed = window.confirm(
      eventCount > 0
        ? `이 목록과 연결된 일정 ${eventCount.toLocaleString("ko-KR")}건도 함께 삭제됩니다. 계속할까요?`
        : "이 목록을 삭제하시겠습니까?"
    );

    if (!confirmed) {
      return;
    }

    const { error: deleteError } = await supabase
      .from("calendar_lists")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setNotice(deleteError.message);
      return;
    }

    await loadData();
  }

  async function cleanupOldEvents() {
    if (!isAdmin) {
      setNotice("관리자만 클린업을 실행할 수 있습니다.");
      return;
    }

    if (cleanupCount === 0) {
      await updateLastCleanedAt();
      setNotice("정리할 6개월 이전 일정이 없습니다.");
      return;
    }

    const confirmed = window.confirm(
      `6개월 이전 일정 ${cleanupCount.toLocaleString("ko-KR")}건을 삭제합니다. 삭제 전 백업이 필요하면 먼저 저장해 주세요.`
    );

    if (!confirmed) {
      return;
    }

    const { error: deleteError } = await supabase
      .from("calendar_events")
      .delete()
      .lt("end_time", cleanupCutoff.toISOString());

    if (deleteError) {
      setNotice(deleteError.message);
      return;
    }

    await updateLastCleanedAt();
    setNotice("6개월 이전 일정이 정리되었습니다.");
  }

  function exportBackup() {
    const blob = new Blob([buildDownloadPayload(calendarData)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `team-calendar-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("백업 파일을 저장했습니다.");
  }

  async function importBackup(file: File) {
    if (!isAdmin) {
      setNotice("관리자만 백업을 불러올 수 있습니다.");
      return;
    }

    try {
      const text = await file.text();
      const parsedData = normalizeData(JSON.parse(text));
      const confirmed = window.confirm(
        "현재 Supabase 데이터를 백업 파일 내용으로 교체합니다. 계속할까요?"
      );

      if (!confirmed) {
        return;
      }

      await replaceAllData(parsedData);
      setNotice("백업 파일을 불러왔습니다.");
    } catch (backupError) {
      setNotice(getErrorMessage(backupError, "백업 파일을 불러오지 못했습니다."));
    }
  }

  async function resetData() {
    if (!isAdmin) {
      setNotice("관리자만 초기화할 수 있습니다.");
      return;
    }

    const confirmed = window.confirm(
      "모든 일정과 목록을 초기 상태로 되돌립니다. 계속할까요?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await replaceAllData(createDefaultData());
      setNotice("초기 데이터로 되돌렸습니다.");
    } catch (resetError) {
      setNotice(getErrorMessage(resetError, "초기화하지 못했습니다."));
    }
  }

  async function replaceAllData(nextData: CalendarData) {
    const deleteEventsResult = await supabase
      .from("calendar_events")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteEventsResult.error) {
      throw deleteEventsResult.error;
    }

    const deleteListsResult = await supabase
      .from("calendar_lists")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteListsResult.error) {
      throw deleteListsResult.error;
    }

    const insertedListsResult = await supabase
      .from("calendar_lists")
      .insert(
        nextData.lists.map((list) => ({
          name: list.name,
          color: list.color,
          active: list.active
        }))
      )
      .select("id");

    if (insertedListsResult.error) {
      throw insertedListsResult.error;
    }

    const listIdMap = new Map<string, string>();
    (insertedListsResult.data ?? []).forEach((row, index) => {
      const sourceList = nextData.lists[index];
      if (sourceList) {
        listIdMap.set(sourceList.id, row.id);
      }
    });

    const eventPayload = nextData.events
      .map((event) => {
        const nextListId = listIdMap.get(event.listId);

        if (!nextListId) {
          return null;
        }

        return {
          list_id: nextListId,
          author: event.author,
          title: event.title,
          content: event.content,
          start_time: event.start,
          end_time: event.end,
          created_by_user_id: userId,
          created_by_email: normalizedUserEmail
        };
      })
      .filter(isEventInsertPayload);

    if (eventPayload.length > 0) {
      const insertEventsResult = await supabase
        .from("calendar_events")
        .insert(eventPayload);

      if (insertEventsResult.error) {
        throw insertEventsResult.error;
      }
    }

    const settingsResult = await supabase
      .from("calendar_settings")
      .upsert({
        id: true,
        last_cleaned_at: nextData.lastCleanedAt
      });

    if (settingsResult.error) {
      throw settingsResult.error;
    }

    await loadData();
  }

  async function updateLastCleanedAt() {
    const cleanedAt = new Date().toISOString();
    const { error: settingsError } = await supabase
      .from("calendar_settings")
      .upsert({
        id: true,
        last_cleaned_at: cleanedAt
      });

    if (settingsError) {
      setNotice(settingsError.message);
      return;
    }

    setLastCleanedAt(cleanedAt);
    await loadData();
  }

  function openAdminPanel() {
    if (!isAdmin) {
      setNotice("관리자 권한이 있는 계정만 관리자 모드를 사용할 수 있습니다.");
      return;
    }

    setAdminOpen(true);
  }

  function toggleListVisibility(id: string) {
    setVisibleListIds((current) =>
      current.includes(id)
        ? current.filter((visibleId) => visibleId !== id)
        : [...current, id]
    );
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <section className="mx-auto grid max-w-[1480px] gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4">
          <section className="rounded-lg border border-line bg-white px-4 py-4 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent">
              <Sparkles aria-hidden className="size-4" />
              Team Calendar
            </div>
            <h1 className="mt-1 text-2xl font-bold text-ink">팀 캘린더</h1>
            <p className="mt-2 break-all text-sm leading-6 text-muted">
              {userEmail}
            </p>
            <button
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900"
              type="button"
              onClick={() => openCreateModal()}
            >
              <Plus aria-hidden className="size-4" />
              새 일정
            </button>
            <button
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-panel"
              type="button"
              onClick={onSignOut}
            >
              <LogOut aria-hidden className="size-4" />
              로그아웃
            </button>
          </section>

          <section className="rounded-lg border border-line bg-white px-4 py-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                <ListFilter aria-hidden className="size-4" />
                목록
              </h2>
              <span className="text-xs font-medium text-muted">
                {activeLists.length.toLocaleString("ko-KR")}개
              </span>
            </div>
            <div className="space-y-2">
              {activeLists.map((list) => (
                <label
                  key={list.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-ink transition hover:bg-panel"
                >
                  <input
                    checked={visibleListIds.includes(list.id)}
                    className="size-4 accent-[#0e4e96]"
                    type="checkbox"
                    onChange={() => toggleListVisibility(list.id)}
                  />
                  <span
                    aria-hidden
                    className="size-3 rounded-full"
                    style={{ backgroundColor: list.color }}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {list.name}
                  </span>
                </label>
              ))}
              {activeLists.length === 0 && (
                <p className="rounded-md border border-dashed border-line px-3 py-3 text-sm leading-6 text-muted">
                  관리자 계정으로 목록을 추가하거나 사용 상태로 바꾸면 여기에
                  표시됩니다.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white px-4 py-4 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                <Download aria-hidden className="size-4" />
                저장
              </h2>
              <Check aria-hidden className="size-4 text-leaf" />
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">
              DB 동기화: {formatRelativeSaveTime(lastSyncedAt)}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              클린업 대상: {cleanupCount.toLocaleString("ko-KR")}건
            </p>
            {cleanupDue && (
              <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                6개월 클린업을 확인할 시점입니다.
              </p>
            )}
            <button
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-panel disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!isAdmin}
              type="button"
              onClick={openAdminPanel}
            >
              <Settings aria-hidden className="size-4" />
              관리자 모드
            </button>
          </section>
        </aside>

        <section className="min-w-0 rounded-lg border border-line bg-white p-3 shadow-soft sm:p-4">
          <header className="mb-4 flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent">
                <CalendarDays aria-hidden className="size-4" />
                Supabase Shared Calendar
              </p>
              <h2 className="mt-1 text-xl font-bold text-ink">일정 보드</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:bg-panel"
                type="button"
                onClick={exportBackup}
              >
                <Download aria-hidden className="size-4" />
                저장
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:bg-panel disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!isAdmin}
                type="button"
                onClick={openAdminPanel}
              >
                <Settings aria-hidden className="size-4" />
                관리자
              </button>
            </div>
          </header>

          {notice && (
            <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
              <span>{notice}</span>
              <button
                className="font-semibold text-emerald-950"
                type="button"
                onClick={() => setNotice("")}
              >
                닫기
              </button>
            </div>
          )}

          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-lg border border-line bg-panel px-4 py-10 text-center text-sm font-medium text-muted">
              캘린더를 불러오는 중...
            </div>
          ) : (
            <FullCalendar
              allDaySlot={false}
              buttonText={{
                day: "일",
                month: "월",
                today: "오늘",
                week: "주"
              }}
              editable={false}
              eventClick={openEventModal}
              events={calendarEvents}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay"
              }}
              height="auto"
              initialView="timeGridWeek"
              locale={koLocale}
              nowIndicator
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              selectable
              selectMirror
              select={openCreateModal}
              slotDuration="00:10:00"
              slotLabelFormat={{
                hour: "2-digit",
                hour12: false,
                minute: "2-digit"
              }}
              slotMaxTime="22:00:00"
              slotMinTime="07:00:00"
              snapDuration="00:10:00"
              weekends
            />
          )}
        </section>
      </section>

      {modal && (
        <EventModal
          error={modalError}
          event={modal.event}
          lists={lists}
          mode={modal.kind}
          selectedEnd={modal.end}
          selectedStart={modal.start}
          submitting={submitting}
          onClose={() => setModal(null)}
          onDelete={deleteEvent}
          onEdit={() =>
            setModal((current) =>
              current?.kind === "view"
                ? {
                    ...current,
                    kind: "edit"
                  }
                : current
            )
          }
          onSubmit={saveEvent}
        />
      )}

      {adminOpen && isAdmin && (
        <AdminPanel
          cleanupCount={cleanupCount}
          lastCleanedAt={lastCleanedAt}
          lists={lists}
          updatedAt={lastSyncedAt}
          onAddList={addList}
          onCleanup={cleanupOldEvents}
          onClose={() => setAdminOpen(false)}
          onDeleteList={deleteList}
          onExport={exportBackup}
          onImport={importBackup}
          onReset={resetData}
          onUpdateList={updateList}
        />
      )}
    </main>
  );
}

function mapListRow(row: CalendarListRow): CalendarList {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapEventRow(row: CalendarEventRow): CalendarItem {
  return {
    id: row.id,
    listId: row.list_id,
    author: row.author,
    title: row.title,
    content: row.content,
    start: row.start_time,
    end: row.end_time,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeAllDayStart(value: Date) {
  const start = new Date(value);
  start.setHours(9, 0, 0, 0);
  return start;
}

function getNextHour() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);

  if (start.getHours() < 7) {
    start.setHours(9, 0, 0, 0);
  }

  if (start.getHours() >= 22) {
    start.setDate(start.getDate() + 1);
    start.setHours(9, 0, 0, 0);
  }

  return start;
}

type EventInsertPayload = {
  list_id: string;
  author: string;
  title: string;
  content: string;
  start_time: string;
  end_time: string;
  created_by_user_id: string;
  created_by_email: string;
};

function isEventInsertPayload(
  value: EventInsertPayload | null
): value is EventInsertPayload {
  return value !== null;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
