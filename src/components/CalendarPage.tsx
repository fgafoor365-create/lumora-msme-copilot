
import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import type { DailyRecord } from "../types";
import { fmtINR } from "../lib/utils";
import { useI18n } from "../lib/i18n";

type Props = {
  records: DailyRecord[];
};

type View = "calendar" | "months" | "years";

export default function CalendarPage({ records }: Props) {
  const { language, t } = useI18n();
  const today = new Date();

  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [view, setView] = useState<View>("calendar");
  const [selectedDate, setSelectedDate] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
  );

  const locale = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : language === 'ur' ? 'ur-PK' : 'en-IN';
  const monthNames = Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2025, index, 1)),
  );

  const recordByDate = useMemo(
    () => new Map(records.map((record) => [record.date, record])),
    [records],
  );

  const monthRecords = useMemo(
    () =>
      records.filter((record) => {
        const [y, m] = record.date.split("-").map(Number);
        return y === year && m === month + 1;
      }),
    [records, month, year],
  );

  const selectedRecord = recordByDate.get(selectedDate);

  const monthSales = monthRecords.reduce((sum, r) => sum + r.sales, 0);
  const monthExpenses = monthRecords.reduce((sum, r) => sum + r.expenses, 0);

  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function makeDateKey(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function changeMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
    setSelectedDate(makeDateKey(next.getFullYear(), next.getMonth(), 1));
  }

  function chooseMonth(m: number) {
    setMonth(m);
    setView("calendar");
    setSelectedDate(makeDateKey(year, m, 1));
  }

  function chooseYear(y: number) {
    setYear(y);
    setView("months");
  }

  const years = Array.from(
    { length: 21 },
    (_, index) => today.getFullYear() - 10 + index,
  );

  return (
    <div className="lm-stack">
      <section className="lm-card">
        <div className="flex items-center gap-3">
          <CalendarDays size={28} aria-hidden="true" />
          <div>
            <span className="lm-label">{t('yourBusiness')}</span>
            <h2 className="text-2xl font-semibold">{t('calendar')}</h2>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border p-3">
            <span className="lm-label">{t('sales')}</span>
            <p className="text-xl font-semibold">{fmtINR(monthSales)}</p>
          </div>
          <div className="rounded-xl border p-3">
            <span className="lm-label">{t('expenses')}</span>
            <p className="text-xl font-semibold">{fmtINR(monthExpenses)}</p>
          </div>
          <div className="rounded-xl border p-3">
            <span className="lm-label">{t('estimatedProfit')}</span>
            <p className="text-xl font-semibold">
              {fmtINR(monthSales - monthExpenses)}
            </p>
            <span className="text-xs opacity-70">
              Based on saved records
            </span>
          </div>
        </div>
      </section>

      <section className="lm-card">
        {view === "calendar" && (
          <>
            <div className="mb-5 flex items-center justify-between gap-2">
              <button
                type="button"
                className="lm-btn"
                onClick={() => changeMonth(-1)}
                aria-label={t('previousMonth')}
              >
                <ChevronLeft size={20} />
              </button>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  className="rounded-lg px-2 py-2 text-lg font-semibold hover:bg-black/5"
                  onClick={() => setView("months")}
                  aria-label={t('month')}
                >
                  {monthNames[month]}
                </button>
                <button
                  type="button"
                  className="rounded-lg px-2 py-2 text-lg font-semibold hover:bg-black/5"
                  onClick={() => setView("years")}
                  aria-label={t('year')}
                >
                  {year}
                </button>
              </div>

              <button
                type="button"
                className="lm-btn"
                onClick={() => changeMonth(1)}
                aria-label={t('nextMonth')}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs opacity-70">
              {Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2025, 0, index + 6))).map((d) => (
                <div key={d} className="py-2">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`blank-${i}`} aria-hidden="true" />
              ))}

              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const key = makeDateKey(year, month, day);
                const record = recordByDate.get(key);
                const profit = record
                  ? record.sales - record.expenses
                  : 0;
                const selected = selectedDate === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(key)}
                    aria-pressed={selected}
                    className={`min-h-16 rounded-xl border p-1 text-center transition hover:bg-black/5 ${
                      selected ? "border-current ring-2 ring-current" : ""
                    }`}
                  >
                    <span className="block text-sm font-medium">{day}</span>
                    {record ? (
                      <span
                        className={`mt-1 block truncate text-[10px] ${
                          profit < 0 ? "text-red-600" : "text-green-700"
                        }`}
                      >
                        {profit < 0 ? t('expenses') : t('estimatedProfit')}
                      </span>
                    ) : (
                      <span className="mt-1 block text-[10px] opacity-40">
                        —
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-xs opacity-70">
              {t('basedOnRecords')}
            </p>
          </>
        )}

        {view === "months" && (
          <>
            <div className="mb-5 flex items-center gap-3">
              <button
                type="button"
                className="lm-btn"
                onClick={() => setView("calendar")}
                aria-label={t('back')}
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <span className="lm-label">{t('month')}</span>
                <button
                  type="button"
                  className="block text-xl font-semibold"
                  onClick={() => setView("years")}
                >
                  {year} <span className="text-sm opacity-60">{t('year')}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {monthNames.map((name, index) => {
                const count = records.filter((r) => {
                  const [y, m] = r.date.split("-").map(Number);
                  return y === year && m === index + 1;
                }).length;

                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => chooseMonth(index)}
                    className={`min-h-20 rounded-xl border p-3 text-sm font-medium transition hover:bg-black/5 ${
                      month === index ? "border-current ring-1 ring-current" : ""
                    }`}
                  >
                    {name}
                    <span className="mt-1 block text-xs opacity-60">{count} · {t('basedOnRecords')}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {view === "years" && (
          <>
            <div className="mb-5 flex items-center gap-3">
              <button
                type="button"
                className="lm-btn"
                onClick={() => setView("calendar")}
                aria-label="Back to calendar"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <span className="lm-label">{t('year')}</span>
                <h3 className="text-xl font-semibold">{t('year')}</h3>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {years.map((y) => {
                const count = records.filter(
                  (r) => Number(r.date.slice(0, 4)) === y,
                ).length;

                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => chooseYear(y)}
                    className={`rounded-xl border p-4 text-base font-semibold transition hover:bg-black/5 ${
                      year === y ? "border-current ring-1 ring-current" : ""
                    }`}
                  >
                    {y}
                    <span className="mt-1 block text-xs font-normal opacity-60">
                      {count} · {t('basedOnRecords')}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-xs opacity-70">
              {t('month')} · {t('year')}
            </p>
          </>
        )}
      </section>

      <section className="lm-card">
        <span className="lm-label">{t('date')}</span>
        <h3 className="mb-4 text-lg font-semibold">
          {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(locale, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </h3>

        {selectedRecord ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                [t('sales'), selectedRecord.sales],
                [t('expenses'), selectedRecord.expenses],
                [t('estimatedProfit'), selectedRecord.sales - selectedRecord.expenses],
                [t('received'), selectedRecord.paymentsReceived],
                [t('creditGiven'), selectedRecord.creditGiven],
              ].map(([label, amount]) => (
                <div key={String(label)} className="rounded-xl border p-3">
                  <span className="lm-label">{label}</span>
                  <p className="mt-1 font-semibold">{fmtINR(Number(amount))}</p>
                </div>
              ))}
            </div>

            {selectedRecord.note && (
              <div className="mt-4 rounded-xl border p-3">
                <span className="lm-label">{t('optional')}</span>
                <p>{selectedRecord.note}</p>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm opacity-70">
            {t('noRecord')}
          </p>
        )}
      </section>
    </div>
  );
}

