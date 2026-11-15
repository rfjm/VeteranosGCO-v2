import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  formatAttendanceRecord,
  getCombinedAttendance,
  getCurrentSeasonAverage,
  getCurrentSeasonAttendance,
  getPreviousSeasonAttendance,
  getPreviousSeasonPoints,
  PREVIOUS_SEASON_TOTAL_TRAININGS,
  rankPlayersByPointsAndAttendance,
} from "../utils/attendancePriority";
import { useCurrentSeasonTrainingTotal } from "../useCurrentSeasonTrainingTotal";
import Icon from "../ui/Icon";
import { Banner, EmptyState, Initials, PageHeader, Skeleton, SkeletonList } from "../ui/primitives";

const PODIUM = [
  { place: 2, height: "h-24 sm:h-28", ring: "ring-ink-200/40", badge: "bg-ink-200 text-ink-950", glow: "from-ink-200/15" },
  { place: 1, height: "h-32 sm:h-36", ring: "ring-amber-400/60", badge: "bg-amber-400 text-ink-950", glow: "from-amber-400/25" },
  { place: 3, height: "h-20 sm:h-24", ring: "ring-orange-400/40", badge: "bg-orange-400 text-ink-950", glow: "from-orange-400/15" },
];

const positionClass = (index) =>
  index === 0
    ? "bg-amber-400 text-ink-950"
    : index === 1
      ? "bg-ink-200 text-ink-950"
      : index === 2
        ? "bg-orange-400 text-ink-950"
        : "bg-white/[0.06] text-ink-300";

export default function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [mvp, setMvp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentSeasonTotal = useCurrentSeasonTrainingTotal();

  useEffect(() => {
    const fetchData = async () => {
      const { data: ranking, error: rankingError } = await supabase
        .from("players")
        .select("*")
        .order("total_points", { ascending: false });

      if (rankingError) {
        setError(rankingError.message);
        setLoading(false);
        return;
      }

      const { data: mvpMes } = await supabase
        .from("mvp_mes")
        .select("*")
        .limit(1)
        .maybeSingle();

      setPlayers(rankPlayersByPointsAndAttendance(ranking || []));
      setMvp(mvpMes || null);
      setLoading(false);
    };

    fetchData();
  }, []);

  const header = (
    <PageHeader
      eyebrow="Época 2026/27"
      title="Ranking"
      description="Ordenado por pontos da época atual; em caso de empate, por total de presenças."
    />
  );

  if (loading) {
    return (
      <div>
        {header}
        <Skeleton className="mb-6 h-56" />
        <SkeletonList rows={8} className="h-14" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {header}
        <Banner tone="error" title="Não foi possível carregar o ranking">
          {error}
        </Banner>
      </div>
    );
  }

  const podium = PODIUM.map((slot) => ({ ...slot, player: players[slot.place - 1] })).filter(
    (slot) => slot.player,
  );

  return (
    <div>
      {header}

      {players.length === 0 ? (
        <EmptyState icon="trophy" title="Ainda não há jogadores no ranking" />
      ) : (
        <>
          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            {/* Podium */}
            <section className="card relative overflow-hidden px-3 pb-0 pt-6 lg:col-span-2" aria-label="Pódio">
              <div className="flex items-end justify-center gap-2 sm:gap-4">
                {podium.map(({ place, height, ring, badge, glow, player }) => (
                  <div key={place} className="flex w-1/3 max-w-[180px] flex-col items-center">
                    <div className="relative mb-2">
                      <Initials
                        name={player.name}
                        className={`ring-2 ${ring} ${place === 1 ? "h-16 w-16 text-2xl" : "h-12 w-12 text-lg"}`}
                      />
                      {place === 1 && (
                        <Icon name="trophy" size={22} className="absolute -top-5 left-1/2 -translate-x-1/2 text-amber-300" />
                      )}
                    </div>
                    <p className="w-full truncate text-center text-sm font-semibold">{player.name}</p>
                    <p className="stat-num text-2xl text-brand-300">
                      {player.total_points}
                      <span className="ml-1 font-sans text-[10px] font-semibold uppercase text-ink-500">pts</span>
                    </p>
                    <div
                      className={`mt-2 flex w-full ${height} items-start justify-center rounded-t-xl bg-gradient-to-b ${glow} to-white/[0.02] pt-3 ring-1 ring-inset ring-white/[0.06]`}
                    >
                      <span className={`grid h-8 w-8 place-items-center rounded-full font-display text-lg font-extrabold ${badge}`}>
                        {place}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* MVP */}
            {mvp ? (
              <section className="relative flex flex-col justify-center overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/20 via-amber-600/5 to-transparent p-6">
                <Icon name="star" size={140} className="absolute -right-8 -top-8 text-amber-300/10" strokeWidth={1} />
                <p className="eyebrow flex items-center gap-1.5 text-amber-300">
                  <Icon name="star" size={13} /> MVP do mês
                </p>
                <p className="mt-2 font-display text-4xl font-extrabold uppercase leading-none">{mvp.name}</p>
                <p className="mt-2 text-sm text-amber-100/80">
                  <span className="stat-num text-2xl text-amber-200">{mvp.total_points}</span> pontos
                </p>
              </section>
            ) : (
              <section className="card hidden items-center justify-center p-6 text-center text-sm text-ink-400 lg:flex">
                MVP do mês ainda por definir.
              </section>
            )}
          </div>

          {/* Mobile list */}
          <ol className="space-y-2 md:hidden">
            {players.map((p, i) => (
              <li key={p.id} className="card flex items-center gap-3 p-3">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-base font-bold ${positionClass(i)}`}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-ink-400">
                    <span>Média {getCurrentSeasonAverage(p).toFixed(2)}</span>
                    <span>Atual {formatAttendanceRecord(getCurrentSeasonAttendance(p), currentSeasonTotal)}</span>
                    <span>25/26: {getPreviousSeasonPoints(p)} pts</span>
                  </p>
                </div>
                <p className="stat-num text-3xl leading-none text-brand-300">{p.total_points}</p>
              </li>
            ))}
          </ol>

          {/* Desktop table */}
          <div className="card hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="border-b border-white/[0.06] bg-white/[0.02]">
                  <tr>
                    <th className="table-head w-14 text-center">#</th>
                    <th className="table-head">Nome</th>
                    <th className="table-head text-center">Época anterior</th>
                    <th className="table-head text-center">Época atual</th>
                    <th className="table-head text-center">Treinos</th>
                    <th className="table-head text-center">Pontos 25/26</th>
                    <th className="table-head text-center">Média</th>
                    <th className="table-head pr-5 text-right">Pontos 26/27</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, i) => (
                    <tr key={p.id} className="border-b border-white/[0.04] transition last:border-0 hover:bg-white/[0.03]">
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-grid h-7 w-7 place-items-center rounded-full font-display text-sm font-bold ${positionClass(i)}`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-3 font-medium">
                          <Initials name={p.name} className="h-8 w-8 text-xs" />
                          {p.name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-ink-300">
                        {formatAttendanceRecord(getPreviousSeasonAttendance(p), PREVIOUS_SEASON_TOTAL_TRAININGS)}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-ink-300">
                        {formatAttendanceRecord(getCurrentSeasonAttendance(p), currentSeasonTotal)}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-ink-300">{getCombinedAttendance(p)}</td>
                      <td className="px-3 py-2.5 text-center font-semibold tabular-nums text-amber-300">
                        {getPreviousSeasonPoints(p)}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-ink-200">
                        {getCurrentSeasonAverage(p).toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 pr-5 text-right">
                        <span className="stat-num text-2xl text-brand-300">{p.total_points}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
