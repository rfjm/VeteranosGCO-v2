import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../useAuth";
import { useCurrentSeasonTrainingTotal } from "../useCurrentSeasonTrainingTotal";
import { rankPlayersByPointsAndAttendance, getCurrentSeasonAverage } from "../utils/attendancePriority";
import { dateFromKey } from "../utils/calendar";
import Icon from "../ui/Icon";
import { capitalizeFirst } from "../ui/format";
import { Initials, Skeleton, EmptyState } from "../ui/primitives";

const crestUrl = `${import.meta.env.BASE_URL}gco.png`;

const formatTrainingDate = (date) =>
  capitalizeFirst(
    dateFromKey(String(date).slice(0, 10)).toLocaleDateString("pt-PT", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }),
  );

const MEDALS = ["bg-amber-400 text-ink-950", "bg-ink-200 text-ink-950", "bg-orange-400 text-ink-950"];

export default function Home() {
  const { isAdmin } = useAuth();
  const currentSeasonTotal = useCurrentSeasonTrainingTotal();
  const [players, setPlayers] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [mvp, setMvp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: playerRows }, { data: trainingRows }, { data: mvpRow }] = await Promise.all([
        supabase.from("players").select("*"),
        supabase.from("trainings").select("*").order("date", { ascending: false }).limit(5),
        supabase.from("mvp_mes").select("*").limit(1).maybeSingle(),
      ]);
      setPlayers(rankPlayersByPointsAndAttendance(playerRows || []));
      setTrainings(trainingRows || []);
      setMvp(mvpRow || null);
      setLoading(false);
    };
    load();
  }, []);

  const openTraining = trainings.find((training) => !training.completed_at);
  const topPlayers = players.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, #12b465 0 10px, transparent 10px 22px)",
          }}
        />
        <img
          src={crestUrl}
          alt=""
          className="pointer-events-none absolute -right-10 -top-6 h-56 w-56 rotate-6 opacity-[0.08] sm:h-72 sm:w-72"
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <img src={crestUrl} alt="Emblema do Ginásio Clube Olhanense" className="h-20 w-20 rounded-full bg-white p-1 shadow-glow sm:h-24 sm:w-24" />
          <div className="flex-1">
            <p className="eyebrow text-brand-400">Época 2026/27</p>
            <h1 className="mt-1 text-5xl font-extrabold uppercase leading-[0.9] sm:text-6xl">
              Veteranos <span className="text-brand-400">GCO</span>
            </h1>
            <p className="mt-2 max-w-md text-sm text-ink-300">
              Presenças, equipas equilibradas, marcador ao vivo e ranking da época — tudo num só sítio.
            </p>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Link to="/training" className="btn btn-primary">
            <Icon name="calendar" size={18} /> Treinos
          </Link>
          <Link to="/games" className="btn btn-secondary">
            <Icon name="timer" size={18} /> Marcador
          </Link>
        </div>
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-3 gap-3">
        {[
          { label: "Jogadores", value: loading ? "–" : players.length, icon: "users" },
          { label: "Treinos 26/27", value: currentSeasonTotal, icon: "checkCircle" },
          {
            label: openTraining ? "Treino aberto" : "Último treino",
            value: loading ? "–" : trainings[0] ? formatTrainingDate((openTraining || trainings[0]).date) : "—",
            icon: "calendar",
            small: true,
          },
        ].map((stat) => (
          <div key={stat.label} className="card p-3 sm:p-4">
            <div className="flex items-center gap-1.5 text-ink-400">
              <Icon name={stat.icon} size={14} />
              <p className="eyebrow truncate">{stat.label}</p>
            </div>
            <p className={`stat-num mt-2 leading-none ${stat.small ? "text-lg sm:text-2xl" : "text-3xl sm:text-4xl"}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Ranking preview */}
        <section className="card card-pad lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">Top 5 da época</h2>
            <Link to="/leaderboard" className="btn btn-ghost btn-sm">
              Ver ranking <Icon name="arrowRight" size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-14" />
              ))}
            </div>
          ) : topPlayers.length ? (
            <ol className="space-y-1.5">
              {topPlayers.map((player, index) => (
                <li key={player.id} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.03]">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-display text-sm font-bold ${
                      MEDALS[index] || "bg-white/[0.06] text-ink-300"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <Initials name={player.name} className="h-9 w-9 text-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{player.name}</p>
                    <p className="text-xs text-ink-400">Média {getCurrentSeasonAverage(player).toFixed(2)}</p>
                  </div>
                  <p className="stat-num text-2xl text-brand-300">
                    {player.total_points}
                    <span className="ml-1 font-sans text-[10px] font-semibold uppercase text-ink-500">pts</span>
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState icon="trophy" title="Ainda sem jogadores" />
          )}
        </section>

        <div className="space-y-6 lg:col-span-2">
          {mvp && (
            <section className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/20 via-amber-600/5 to-transparent p-5">
              <Icon name="star" size={120} className="absolute -right-6 -top-6 text-amber-300/10" strokeWidth={1} />
              <p className="eyebrow text-amber-300">MVP do mês</p>
              <p className="mt-1 font-display text-3xl font-extrabold uppercase leading-tight">{mvp.name}</p>
              <p className="mt-1 text-sm text-amber-100/80">
                <span className="stat-num text-xl text-amber-200">{mvp.total_points}</span> pontos
              </p>
            </section>
          )}

          <section className="card card-pad">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="section-title">Treinos recentes</h2>
              <Link to="/training" className="btn btn-ghost btn-sm">
                Calendário <Icon name="arrowRight" size={14} />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} className="h-12" />
                ))}
              </div>
            ) : trainings.length ? (
              <ul className="space-y-1.5">
                {trainings.slice(0, 4).map((training) => (
                  <li key={training.id}>
                    <Link
                      to="/training"
                      state={{ trainingId: training.id }}
                      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/[0.04]"
                    >
                      <span className="flex items-center gap-3">
                        <Icon name="calendar" size={16} className="text-ink-500" />
                        {capitalizeFirst(
                          dateFromKey(String(training.date).slice(0, 10)).toLocaleDateString("pt-PT", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          }),
                        )}
                      </span>
                      {training.completed_at ? (
                        <span className="chip bg-brand-500/15 text-brand-300">Concluído</span>
                      ) : (
                        <span className="chip bg-amber-500/15 text-amber-300">Por finalizar</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="calendar" title="Ainda não há treinos">
                {isAdmin ? "Cria o primeiro treino na página Treinos." : null}
              </EmptyState>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
