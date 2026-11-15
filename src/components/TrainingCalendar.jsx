import { useEffect, useMemo, useState } from "react";
import { dateFromKey, dateKey, getMonthGrid } from "../utils/calendar";
import Icon from "../ui/Icon";
import { capitalizeFirst } from "../ui/format";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const trainingDateKey = (training) => String(training.date).slice(0, 10);

export default function TrainingCalendar({ trainings, selectedTraining, onSelect }) {
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  useEffect(() => {
    if (!selectedTraining) return;
    const selectedDate = dateFromKey(trainingDateKey(selectedTraining));
    setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [selectedTraining]);

  const trainingsByDate = useMemo(() => {
    const result = new Map();
    for (const training of trainings) {
      const key = trainingDateKey(training);
      if (!result.has(key)) result.set(key, training);
    }
    return result;
  }, [trainings]);

  const days = getMonthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth());
  const today = dateKey(new Date());
  const now = new Date();
  const isCurrentMonth =
    visibleMonth.getFullYear() === now.getFullYear() && visibleMonth.getMonth() === now.getMonth();
  const monthTrainingCount = days.filter((day) => day.isCurrentMonth && trainingsByDate.has(day.key)).length;

  const changeMonth = (offset) => {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  return (
    <section className="card card-pad">
      <div className="mb-4 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-none">
            {capitalizeFirst(visibleMonth.toLocaleDateString("pt-PT", { month: "long", year: "numeric" }))}
          </h2>
          <p className="mt-1 text-xs text-ink-400">
            {monthTrainingCount === 0
              ? "Sem treinos neste mês"
              : `${monthTrainingCount} ${monthTrainingCount === 1 ? "treino" : "treinos"}`}
          </p>
        </div>
        {!isCurrentMonth && (
          <button
            type="button"
            onClick={() => setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1))}
            className="btn btn-ghost btn-sm"
          >
            Hoje
          </button>
        )}
        <button type="button" onClick={() => changeMonth(-1)} aria-label="Mês anterior" className="btn btn-secondary btn-sm px-2.5">
          <Icon name="chevronLeft" size={18} />
        </button>
        <button type="button" onClick={() => changeMonth(1)} aria-label="Mês seguinte" className="btn btn-secondary btn-sm px-2.5">
          <Icon name="chevronRight" size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-sm sm:gap-1.5">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            {weekday}
          </div>
        ))}

        {days.map((day) => {
          const training = trainingsByDate.get(day.key);
          const isSelected = training && training.id === selectedTraining?.id;
          const isToday = day.key === today;
          const completed = Boolean(training?.completed_at);

          let tone = "text-ink-500";
          if (day.isCurrentMonth) tone = "text-ink-300";
          if (training) {
            tone = completed
              ? "bg-brand-600/25 text-brand-100 ring-1 ring-inset ring-brand-400/30 hover:bg-brand-600/40"
              : "bg-amber-500/20 text-amber-100 ring-1 ring-inset ring-amber-400/40 hover:bg-amber-500/30";
            if (!day.isCurrentMonth) tone += " opacity-50";
          }
          if (isSelected) {
            tone = completed
              ? "bg-brand-500 text-white shadow-glow"
              : "bg-amber-400 text-ink-950 shadow-[0_8px_24px_-8px_rgba(251,191,36,0.7)]";
          }

          return (
            <button
              type="button"
              key={day.key}
              disabled={!training}
              onClick={() => training && onSelect(training)}
              aria-label={
                training
                  ? `Treino de ${dateFromKey(day.key).toLocaleDateString("pt-PT")} (${completed ? "concluído" : "por finalizar"})`
                  : dateFromKey(day.key).toLocaleDateString("pt-PT")
              }
              aria-pressed={training ? Boolean(isSelected) : undefined}
              className={`relative flex aspect-square max-h-16 w-full items-center justify-center rounded-xl text-sm font-semibold tabular-nums transition sm:aspect-auto sm:h-14 ${
                training ? "cursor-pointer" : "cursor-default font-normal"
              } ${tone}`}
            >
              {day.day}
              {isToday && (
                <span
                  className={`absolute bottom-1.5 h-1 w-1 rounded-full ${isSelected ? "bg-current" : "bg-brand-400"}`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-400">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-brand-600/40 ring-1 ring-brand-400/40" /> Concluído
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-amber-500/30 ring-1 ring-amber-400/50" /> Por finalizar
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-brand-400" /> Hoje
        </span>
      </div>
    </section>
  );
}
