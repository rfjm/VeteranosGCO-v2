import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../useAuth";
import {
  formatAttendanceRecord,
  getCombinedAttendance,
  getCurrentSeasonAttendance,
  getPreviousSeasonAttendance,
  getPreviousSeasonPoints,
  PREVIOUS_SEASON_TOTAL_TRAININGS,
} from "../utils/attendancePriority";
import { useCurrentSeasonTrainingTotal } from "../useCurrentSeasonTrainingTotal";
import { useFeedback } from "../ui/feedbackContext";
import Icon from "../ui/Icon";
import { Banner, EmptyState, Initials, PageHeader, SkeletonList, Spinner } from "../ui/primitives";

const SORTS = {
  name: { label: "Nome", compare: (a, b) => String(a.name).trim().localeCompare(String(b.name).trim(), "pt") },
  points: {
    label: "Pontos",
    compare: (a, b) => (Number(b.total_points) || 0) - (Number(a.total_points) || 0),
  },
  attendance: {
    label: "Presenças",
    compare: (a, b) => getCombinedAttendance(b) - getCombinedAttendance(a),
  },
};

const percentage = (value, total) => (total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0);

function AttendanceBar({ label, value, total, tone }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-ink-400">{label}</span>
        <span className="font-semibold tabular-nums text-ink-200">{formatAttendanceRecord(value, total)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${percentage(value, total)}%` }} />
      </div>
    </div>
  );
}

export default function Players() {
  const [players, setPlayers] = useState([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const { isAdmin } = useAuth();
  const { toast } = useFeedback();
  const currentSeasonTotal = useCurrentSeasonTrainingTotal();

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("name", { ascending: true });

    if (error) setError(error.message);
    else setPlayers(data || []);
    setLoading(false);
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setAdding(true);
    const { error } = await supabase.from("players").insert([
      { name: newName, total_points: 0 },
    ]);
    setAdding(false);

    if (error) {
      setError(error.message);
      toast("Não foi possível adicionar o jogador.", "error");
    } else {
      toast(`${newName.trim()} adicionado.`);
      setNewName("");
      fetchPlayers();
    }
  };

  const visiblePlayers = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt");
    const filtered = term
      ? players.filter((player) => String(player.name).toLocaleLowerCase("pt").includes(term))
      : players;
    return [...filtered].sort(SORTS[sort].compare);
  }, [players, query, sort]);

  return (
    <div>
      <PageHeader
        eyebrow="Plantel"
        title="Jogadores"
        description={`${players.length} jogadores inscritos. Presenças e pontos das duas épocas.`}
      />

      {error && (
        <Banner tone="error" title="Ocorreu um erro" className="mb-4">
          {error}
        </Banner>
      )}

      {isAdmin && (
        <form onSubmit={handleAddPlayer} className="card card-pad mb-6">
          <label htmlFor="new-player" className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Icon name="userPlus" size={18} className="text-brand-400" /> Adicionar jogador
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="new-player"
              type="text"
              placeholder="Nome do jogador"
              className="input flex-1"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button type="submit" disabled={adding || !newName.trim()} className="btn btn-primary">
              {adding ? <Spinner /> : <Icon name="plus" size={18} />}
              Adicionar
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar jogador…"
            className="input pl-10"
            aria-label="Procurar jogador"
          />
        </div>
        <div className="flex rounded-xl bg-white/[0.04] p-1 ring-1 ring-inset ring-white/[0.06]" role="group" aria-label="Ordenar">
          {Object.entries(SORTS).map(([key, option]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              aria-pressed={sort === key}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition sm:flex-none ${
                sort === key ? "bg-ink-700 text-ink-50 shadow" : "text-ink-400 hover:text-ink-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SkeletonList rows={8} className="h-36" />
      ) : visiblePlayers.length === 0 ? (
        <EmptyState icon="search" title={query ? "Nenhum jogador encontrado" : "Ainda não há jogadores"}>
          {query ? `Sem resultados para “${query}”.` : null}
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {visiblePlayers.map((p) => (
            <li key={p.id} className="card p-4 transition hover:border-white/[0.12]">
              <div className="flex items-center gap-3">
                <Initials name={p.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="text-xs text-ink-400">
                    {getCombinedAttendance(p)} {getCombinedAttendance(p) === 1 ? "treino" : "treinos"} no total
                  </p>
                </div>
                <div className="text-right">
                  <p className="stat-num text-3xl leading-none text-brand-300">{p.total_points}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">pts 26/27</p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                <AttendanceBar
                  label="Época atual"
                  value={getCurrentSeasonAttendance(p)}
                  total={currentSeasonTotal}
                  tone="bg-brand-400"
                />
                <AttendanceBar
                  label="Época anterior"
                  value={getPreviousSeasonAttendance(p)}
                  total={PREVIOUS_SEASON_TOTAL_TRAININGS}
                  tone="bg-ink-400"
                />
              </div>

              <p className="mt-3 border-t border-white/[0.05] pt-3 text-xs text-ink-400">
                Pontos 25/26:{" "}
                <span className="font-semibold tabular-nums text-amber-300">{getPreviousSeasonPoints(p)}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
