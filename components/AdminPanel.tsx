"use client";

import { ChangeEvent, useRef, useState } from "react";
import {
  Download,
  Eraser,
  Plus,
  RotateCcw,
  Save,
  Settings,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { formatRelativeSaveTime } from "@/lib/date";
import type { CalendarList } from "@/lib/types";

type AdminPanelProps = {
  lists: CalendarList[];
  lastCleanedAt: string | null;
  updatedAt: string;
  cleanupCount: number;
  onAddList: (name: string, color: string) => void | Promise<void>;
  onUpdateList: (
    id: string,
    patch: Partial<Pick<CalendarList, "name" | "color" | "active">>
  ) => void | Promise<void>;
  onDeleteList: (id: string) => void | Promise<void>;
  onCleanup: () => void | Promise<void>;
  onExport: () => void;
  onImport: (file: File) => void | Promise<void>;
  onReset: () => void | Promise<void>;
  onClose: () => void;
};

const colorPresets = [
  "#0e4e96",
  "#187f64",
  "#c76a14",
  "#9b2f5b",
  "#7c3aed",
  "#d13f32",
  "#4f5d75",
  "#0f766e"
];

export function AdminPanel({
  lists,
  lastCleanedAt,
  updatedAt,
  cleanupCount,
  onAddList,
  onUpdateList,
  onDeleteList,
  onCleanup,
  onExport,
  onImport,
  onReset,
  onClose
}: AdminPanelProps) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(colorPresets[0]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleAddList() {
    const trimmedName = newName.trim();

    if (!trimmedName) {
      return;
    }

    onAddList(trimmedName, newColor);
    setNewName("");
  }

  function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      onImport(file);
    }

    event.target.value = "";
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8"
      role="dialog"
    >
      <section className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-line bg-white shadow-soft">
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent">
              <Settings aria-hidden className="size-4" />
              관리자 모드
            </div>
            <h2 className="mt-1 text-lg font-bold text-ink">
              목록, 저장, 클린업 관리
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

        <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <section className="space-y-4">
            <div className="rounded-lg border border-line bg-panel px-4 py-4">
              <h3 className="text-sm font-bold text-ink">목록 추가</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto]">
                <input
                  className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  maxLength={40}
                  placeholder="예: 프로젝트 E"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                />
                <input
                  aria-label="목록 색상"
                  className="h-10 w-full cursor-pointer rounded-md border border-line bg-white p-1"
                  type="color"
                  value={newColor}
                  onChange={(event) => setNewColor(event.target.value)}
                />
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-900"
                  type="button"
                  onClick={handleAddList}
                >
                  <Plus aria-hidden className="size-4" />
                  추가
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    aria-label={`${color} 색상 선택`}
                    className={`size-7 rounded-full border ${
                      newColor === color ? "border-ink ring-2 ring-ink/20" : "border-white"
                    }`}
                    style={{ backgroundColor: color }}
                    type="button"
                    onClick={() => setNewColor(color)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {lists.map((list) => (
                <div
                  key={list.id}
                  className="grid gap-2 rounded-lg border border-line bg-white px-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)_8rem_auto_auto]"
                >
                  <label className="flex items-center gap-2 text-sm font-medium text-ink">
                    <input
                      checked={list.active}
                      className="size-4 accent-[#0e4e96]"
                      type="checkbox"
                      onChange={(event) =>
                        onUpdateList(list.id, { active: event.target.checked })
                      }
                    />
                    사용
                  </label>
                  <input
                    className="min-w-0 rounded-md border border-line px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                    maxLength={40}
                    value={list.name}
                    onChange={(event) =>
                      onUpdateList(list.id, { name: event.target.value })
                    }
                  />
                  <input
                    aria-label={`${list.name} 색상`}
                    className="h-10 w-full cursor-pointer rounded-md border border-line bg-white p-1"
                    type="color"
                    value={list.color}
                    onChange={(event) =>
                      onUpdateList(list.id, { color: event.target.value })
                    }
                  />
                  <span
                    className="h-10 rounded-md border border-line"
                    style={{ backgroundColor: list.color }}
                  />
                  <button
                    aria-label={`${list.name} 삭제`}
                    className="inline-flex size-10 items-center justify-center rounded-md border border-red-200 text-red-700 transition hover:bg-red-50"
                    type="button"
                    onClick={() => onDeleteList(list.id)}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-3">
            <div className="rounded-lg border border-line bg-white px-4 py-4">
              <h3 className="text-sm font-bold text-ink">저장 상태</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">자동 저장</dt>
                  <dd className="text-right font-medium text-ink">
                    {formatRelativeSaveTime(updatedAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">마지막 클린업</dt>
                  <dd className="text-right font-medium text-ink">
                    {formatRelativeSaveTime(lastCleanedAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">정리 대상</dt>
                  <dd className="text-right font-medium text-ink">
                    {cleanupCount.toLocaleString("ko-KR")}건
                  </dd>
                </div>
              </dl>
            </div>

            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900"
              type="button"
              onClick={onExport}
            >
              <Download aria-hidden className="size-4" />
              백업 파일 저장
            </button>

            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-panel"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload aria-hidden className="size-4" />
              백업 불러오기
            </button>

            <input
              ref={fileInputRef}
              accept="application/json,.json"
              className="hidden"
              type="file"
              onChange={handleImport}
            />

            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-50"
              type="button"
              onClick={onCleanup}
            >
              <Eraser aria-hidden className="size-4" />
              6개월 이전 일정 정리
            </button>

            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-panel"
              type="button"
              onClick={onReset}
            >
              <RotateCcw aria-hidden className="size-4" />
              초기화
            </button>

            <div className="rounded-lg border border-line bg-panel px-4 py-3 text-sm leading-6 text-muted">
              <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
                <Save aria-hidden className="size-4" />
                저장 방식
              </div>
              일정과 목록은 Supabase에 저장되어 로그인한 사용자가 같은 데이터를
              봅니다. 큰 변경 전에는 백업 파일 저장을 눌러 JSON 파일로 보관해
              주세요.
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
