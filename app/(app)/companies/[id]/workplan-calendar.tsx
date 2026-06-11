"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ActionItem } from "@/lib/supabase/types";
import {
  deriveDisplayStatus,
  statusClassName,
} from "@/lib/action-item-helpers";

type Props = {
  items: ActionItem[];
  initialMonth: Date; // typically `now` so first render shows current month
  onItemClick: (itemId: string) => void;
};

const DAY_HEADS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WorkplanCalendar({ items, initialMonth, onItemClick }: Props) {
  const [displayedMonth, setDisplayedMonth] = useState<Date>(
    new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1),
  );
  const today = startOfDay(new Date());

  const monthLabel = displayedMonth.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const monthFirst = new Date(
    displayedMonth.getFullYear(),
    displayedMonth.getMonth(),
    1,
  );
  const gridStart = startOfWeek(monthFirst);
  const todayWeekStart = startOfWeek(today);

  const cells: Array<{
    date: Date;
    inDisplayed: boolean;
    isCurrentWeek: boolean;
    isToday: boolean;
    items: ActionItem[];
  }> = [];
  for (let i = 0; i < 35; i++) {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    const dayItems = items.filter((it) => {
      if (!it.due_date) return false;
      const due = new Date(it.due_date + "T00:00:00");
      return sameDay(due, d);
    });
    cells.push({
      date: d,
      inDisplayed: d.getMonth() === displayedMonth.getMonth(),
      isCurrentWeek: sameDay(startOfWeek(d), todayWeekStart),
      isToday: sameDay(d, today),
      items: dayItems,
    });
  }

  function shiftMonth(delta: number) {
    setDisplayedMonth(
      new Date(
        displayedMonth.getFullYear(),
        displayedMonth.getMonth() + delta,
        1,
      ),
    );
  }
  function goToday() {
    setDisplayedMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  return (
    <div className="apollo-panel p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-base" style={{ fontWeight: 600 }}>
            Workplan
          </div>
          <div className="mt-1 text-xs text-apollo-mute">
            Click any item to view its activity. Current week highlighted.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="apollo-btn-ghost"
            title="Previous month"
            style={{ padding: "6px 10px" }}
          >
            <ChevronLeft size={14} />
          </button>
          <div
            className="mx-2 text-base"
            style={{ fontWeight: 600, minWidth: 130, textAlign: "center" }}
          >
            {monthLabel}
          </div>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="apollo-btn-ghost"
            title="Next month"
            style={{ padding: "6px 10px" }}
          >
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="apollo-btn-ghost ml-2 text-xs"
          >
            Today
          </button>
        </div>
      </div>

      <div
        className="apollo-cal-grid grid grid-cols-7 overflow-hidden rounded"
        style={{
          gap: 1,
          background: "var(--apollo-line)",
          border: "1px solid var(--apollo-line)",
        }}
      >
        {DAY_HEADS.map((d) => (
          <div key={d} className="apollo-cal-day-head">
            {d}
          </div>
        ))}
        {cells.map((cell, idx) => (
          <div
            key={idx}
            className={[
              "apollo-cal-cell",
              cell.inDisplayed ? "" : "apollo-cal-cell-faded",
              cell.isCurrentWeek ? "apollo-cal-cell-current-week" : "",
              cell.isToday ? "apollo-cal-cell-today" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="apollo-cal-day-num">{cell.date.getDate()}</span>
            {cell.items.map((it) => {
              const status = deriveDisplayStatus(it);
              const title =
                it.title.length > 28 ? it.title.slice(0, 27) + "…" : it.title;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => onItemClick(it.id)}
                  className={`apollo-cal-item ${statusClassName(status)}`}
                  title={it.title}
                >
                  {title}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-apollo-mute">
        <LegendDot color="#f9e3e1" label="Overdue" />
        <LegendDot color="#e7eef5" label="In progress" />
        <LegendDot color="#f3efe6" label="Not started" />
        <LegendDot color="#fbf0df" label="Blocked" />
        <LegendDot color="#eaf2ed" label="Done" />
        <div className="flex-1" />
        <span className="font-label">
          Today: {today.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="font-label inline-flex items-center gap-1">
      <span
        style={{
          display: "inline-block",
          width: 10,
          height: 10,
          borderRadius: 2,
          background: color,
        }}
      />
      {label}
    </span>
  );
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day; // shift Sunday→Monday-start
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
