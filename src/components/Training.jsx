import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { createBalancedTeams, getTeamAverage } from "../utils/teamGenerator";
import { useAuth } from "../useAuth";
import TrainingCalendar from "./TrainingCalendar";
import PracticeResults from "./PracticeResults";
import { dateFromKey, dateKey } from "../utils/calendar";
import {
  getPlayerTeamRating,
  prioritizeAvailablePlayers,
} from "../utils/attendancePriority";
import { useFeedback } from "../ui/feedbackContext";
import { teamColor, teamLabel } from "../ui/teams";
import Icon from "../ui/Icon";
import { capitalizeFirst } from "../ui/format";
import { Banner, EmptyState, PageHeader, Skeleton, Spinner, TeamDot } from "../ui/primitives";

const MAX_PLAYERS = 18;

const longDate = (date) =>
  capitalizeFirst(
    dateFromKey(String(date).slice(0, 10)).toLocaleDateString("pt-PT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  );

export default function Training() {
  const [players, setPlayers] = useState([]);
  const [present, setPresent] = useState([]); // array of player IDs
  const [trainings, setTrainings] = useState([]);
  const [trainingsLoaded, setTrainingsLoaded] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");

  const { isAdmin } = useAuth();
  const { toast, confirm } = useFeedback();
  const location = useLocation();

  // Teams held as arrays of FULL player objects [{id,name,total_points,...}]
  const [teams, setTeams] = useState([]);
  const [teamRecords, setTeamRecords] = useState([]);
  const [trainingGames, setTrainingGames] = useState([]);
  const [loadingTrainingDetails, setLoadingTrainingDetails] = useState(false);
  const [choice12, setChoice12] = useState(""); // "2" or "3" for 12–14 players
  const [editMode, setEditMode] = useState(false);

  const loadTeams = useCallback(async (trainingId) => {
    const { data, error } = await supabase.from("training_teams").select("*").eq("training_id", trainingId).order("team_number");
    if (error) {
      setError(error.message);
      return;
    }
    const toObj = (id) => players.find((p) => p.id === id);
    setTeamRecords(data || []);
    const hydrated = (data || []).map((row) => (row.players || []).map(toObj).filter(Boolean)) || [];
    setTeams(hydrated);
  }, [players]);

  const fetchTrainingGames = useCallback(async (trainingId) => {
    const { data, error } = await supabase
      .from("games")
      .select("id, team1, team2, team1_score, team2_score, winner, created_at")
      .eq("training_id", trainingId)
      .order("created_at", { ascending: true });
    if (error) {
      setError(error.message);
      return;
    }
    setTrainingGames(data || []);
  }, []);

  useEffect(() => {
    fetchPlayers();
    fetchTrainings();
  }, []);

  // Open the training passed from another page, or today's training if there is one.
  useEffect(() => {
    if (!trainingsLoaded || selectedTraining) return;
    const requestedId = location.state?.trainingId;
    const today = dateKey(new Date());
    const initial =
      trainings.find((training) => training.id === requestedId) ||
      trainings.find((training) => String(training.date).slice(0, 10) === today);
    if (initial) setSelectedTraining(initial);
    // Only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingsLoaded]);

  useEffect(() => {
    if (selectedTraining && players.length) {
      setLoadingTrainingDetails(true);
      setTeams([]);
      setTeamRecords([]);
      setTrainingGames([]);
      setEditMode(false);
      Promise.all([
        loadTeams(selectedTraining.id),
        fetchAttendance(selectedTraining.id),
        fetchTrainingGames(selectedTraining.id),
      ]).finally(() => setLoadingTrainingDetails(false));
    }
  }, [selectedTraining, players, loadTeams, fetchTrainingGames]);

  const fetchPlayers = async () => {
    const { data, error } = await supabase.from("players").select("*").order("name");
    if (error) setError(error.message);
    else setPlayers(data || []);
  };

  const fetchTrainings = async () => {
    const { data, error } = await supabase.from("trainings").select("*").order("date", { ascending: false });
    if (error) setError(error.message);
    else setTrainings(data || []);
    setTrainingsLoaded(true);
  };

  const createTraining = async () => {
    const today = dateKey(new Date());
    const existingTraining = trainings.find(
      (training) => String(training.date).slice(0, 10) === today,
    );

    if (existingTraining) {
      setSelectedTraining(existingTraining);
      toast("O treino de hoje já existe e foi selecionado.", "info");
      return;
    }

    setBusy("create");
    const { data, error } = await supabase
      .from("trainings")
      .insert([{ date: today }])
      .select()
      .single();
    setBusy("");
    if (error) setError(error.message);
    else {
      setSelectedTraining(data);
      setTrainings((current) =>
        [data, ...current].sort((a, b) => String(b.date).localeCompare(String(a.date))),
      );
      toast("Treino de hoje criado.");
    }
  };

  const deleteTraining = async (id) => {
    const training = trainings.find((item) => item.id === id);
    if (training?.completed_at) {
      setError("Um treino finalizado não pode ser apagado porque já atribuiu pontos.");
      return;
    }

    const ok = await confirm({
      title: "Apagar treino?",
      message: `O treino de ${longDate(training?.date).toLocaleLowerCase("pt-PT")} e as respetivas presenças e equipas serão removidos. Esta ação não pode ser anulada.`,
      confirmLabel: "Apagar treino",
      tone: "danger",
      icon: "trash",
    });
    if (!ok) return;

    const { error } = await supabase.from("trainings").delete().eq("id", id);
    if (error) setError(error.message);
    else {
      setTrainings((prev) => prev.filter((t) => t.id !== id));
      if (selectedTraining?.id === id) {
        setSelectedTraining(null);
        setPresent([]);
        setTeams([]);
        setTeamRecords([]);
        setTrainingGames([]);
        setEditMode(false);
      }
      await fetchPlayers();
      toast("Treino apagado.", "info");
    }
  };

  const togglePresence = (id) => {
    setPresent((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const fetchAttendance = async (trainingId) => {
    const { data, error } = await supabase.from("training_attendance").select("player_id").eq("training_id", trainingId);
    if (error) setError(error.message);
    else setPresent(data.map((a) => a.player_id));
  };

  const availablePlayers = players.filter((player) => present.includes(player.id));
  const attendancePriority = prioritizeAvailablePlayers(availablePlayers);
  const selectedPlayerIds = attendancePriority.selected.map((player) => player.id);
  const waitlistedIds = new Set(attendancePriority.waitlisted.map((player) => player.id));
  const isCompleted = Boolean(selectedTraining?.completed_at) || (
    trainingGames.length > 0 && teamRecords.length === 0
  );

  const saveAttendance = async () => {
    if (!selectedTraining) {
      toast("Nenhum treino selecionado.", "warning");
      return;
    }

    setBusy("attendance");

    // wipe old attendance for this training
    const { error: delError } = await supabase
      .from("training_attendance")
      .delete()
      .eq("training_id", selectedTraining.id);

    if (delError) {
      setBusy("");
      toast("Erro ao apagar presenças: " + delError.message, "error");
      return;
    }

    // insert new attendance
    const rows = selectedPlayerIds.map((pid) => ({
      training_id: selectedTraining.id,
      player_id: pid,
    }));

    const { error: insError } = await supabase
      .from("training_attendance")
      .insert(rows);

    if (insError) {
      setBusy("");
      toast("Erro ao guardar presenças: " + insError.message, "error");
      return;
    }

    await fetchPlayers();
    setBusy("");

    if (attendancePriority.waitlisted.length) {
      toast(
        `${MAX_PLAYERS} presenças guardadas. Lista de espera: ${attendancePriority.waitlisted
          .map((player) => player.name)
          .join(", ")}`,
        "warning",
        8000,
      );
    } else {
      toast(`${rows.length} presenças guardadas.`);
    }
  };

  const generateTeams = async () => {
    if (!selectedTraining) {
      toast("Cria primeiro um treino.", "warning");
      return;
    }

    const selectedPlayers = attendancePriority.selected;
    if (selectedPlayers.length < 6) {
      toast("São precisos pelo menos 6 jogadores.", "warning");
      return;
    }

    if (selectedPlayers.length >= 12 && selectedPlayers.length <= 14 && !choice12) {
      toast("Escolhe 2 ou 3 equipas antes de gerar.", "warning");
      return;
    }

    if (teams.length > 0) {
      const ok = await confirm({
        title: "Gerar novas equipas?",
        message: "As equipas atuais deste treino serão substituídas.",
        confirmLabel: "Gerar novas",
        icon: "shuffle",
      });
      if (!ok) return;
    }

    const numberOfTeams =
      selectedPlayers.length <= 11
        ? 2
        : selectedPlayers.length <= 14
          ? parseInt(choice12, 10)
          : 3;
    const playersForBalancing = selectedPlayers.map((player) => ({
      ...player,
      average_points: getPlayerTeamRating(player, selectedTraining.date),
    }));
    const newTeams = createBalancedTeams(playersForBalancing, numberOfTeams);
    if (!newTeams || newTeams.length === 0) return;

    setTeams(newTeams);
    setEditMode(true);
    setBusy("teams");

    // overwrite in DB
    await supabase.from("training_teams").delete().eq("training_id", selectedTraining.id);

    const rows = newTeams.map((team, idx) => ({
      training_id: selectedTraining.id,
      team_number: idx + 1,
      players: team.map((p) => p.id),
    }));

    const { error } = await supabase.from("training_teams").insert(rows);
    setBusy("");
    if (error) setError(error.message);
    else {
      toast("Novas equipas geradas e guardadas.");
      document.getElementById("teams")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // ====== EDIT MODE helpers ======
  const assignedIds = new Set(teams.flat().map((p) => p.id));
  const benchPlayers = selectedPlayerIds
    .filter((pid) => !assignedIds.has(pid))
    .map((pid) => players.find((p) => p.id === pid))
    .filter(Boolean);

  const addPlayerToTeam = (playerId, teamIdx) => {
    const player = players.find((p) => p.id === playerId);
    if (!player) return;
    setTeams((prev) => {
      if (prev[teamIdx].some((x) => x.id === playerId)) return prev;
      return prev.map((team, i) => (i === teamIdx ? [...team, player] : team));
    });
  };

  const removePlayerFromTeam = (teamIdx, playerId) => {
    setTeams((prev) => prev.map((team, i) => (i === teamIdx ? team.filter((p) => p.id !== playerId) : team)));
  };

  const movePlayerBetweenTeams = (fromIdx, playerId, toIdx) => {
    setTeams((prev) => {
      const copy = prev.map((t) => [...t]);
      const fromTeam = copy[fromIdx];
      const player = fromTeam.find((p) => p.id === playerId);
      if (!player) return prev;
      copy[fromIdx] = fromTeam.filter((p) => p.id !== playerId);
      if (!copy[toIdx].some((p) => p.id === playerId)) {
        copy[toIdx] = [...copy[toIdx], player];
      }
      return copy;
    });
  };

  const persistEditedTeams = async () => {
    setBusy("persist");
    await supabase.from("training_teams").delete().eq("training_id", selectedTraining.id);

    const rows = teams.map((team, idx) => ({
      training_id: selectedTraining.id,
      team_number: idx + 1,
      players: team.map((p) => p.id),
    }));

    await supabase.from("training_teams").insert(rows);
    setBusy("");
    setEditMode(false);
    toast("Alterações às equipas guardadas.");
  };

  const cancelEdit = async () => {
    setEditMode(false);
    if (selectedTraining) await loadTeams(selectedTraining.id);
  };

  const filteredPlayers = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt");
    if (!term) return players;
    return players.filter((player) => String(player.name).toLocaleLowerCase("pt").includes(term));
  }, [players, query]);

  const presentCount = present.length;
  const selectedCount = attendancePriority.selected.length;
  const needsFormatChoice = presentCount >= 12 && presentCount <= 14;
  const teamCountHint =
    selectedCount < 6
      ? `Faltam ${6 - selectedCount} para gerar equipas`
      : selectedCount <= 11
        ? "2 equipas"
        : selectedCount <= 14
          ? choice12
            ? `${choice12} equipas`
            : "Escolhe 2 ou 3 equipas"
          : "3 equipas";

  return (
    <div>
      <PageHeader
        eyebrow="Calendário"
        title="Treinos"
        description="Escolhe um dia no calendário para ver presenças, equipas e resultados."
        actions={
          isAdmin && (
            <button onClick={createTraining} disabled={busy === "create"} className="btn btn-primary">
              {busy === "create" ? <Spinner /> : <Icon name="plus" size={18} />}
              Criar treino de hoje
            </button>
          )
        }
      />

      {error && (
        <Banner tone="error" title="Ocorreu um erro" className="mb-4">
          {error}
        </Banner>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <TrainingCalendar
            trainings={trainings}
            selectedTraining={selectedTraining}
            onSelect={setSelectedTraining}
          />
        </div>

        <div className="min-w-0 space-y-4">
          {!selectedTraining ? (
            <div className="card card-pad">
              <EmptyState icon="calendar" title="Nenhum treino selecionado">
                Toca num dia destacado no calendário para abrir esse treino.
                {isAdmin ? " Ou cria o treino de hoje." : ""}
              </EmptyState>
            </div>
          ) : (
            <>
              {/* Selected training header */}
              <div className="card card-pad flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="eyebrow">Treino selecionado</p>
                  <p className="mt-0.5 font-display text-2xl font-bold leading-tight">
                    {longDate(selectedTraining.date)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isCompleted ? (
                    <span className="chip bg-brand-500/15 text-brand-300">
                      <Icon name="checkCircle" size={13} /> Concluído
                    </span>
                  ) : (
                    <span className="chip bg-amber-500/15 text-amber-300">Por finalizar</span>
                  )}
                  {isAdmin && !selectedTraining.completed_at && (
                    <button
                      onClick={() => deleteTraining(selectedTraining.id)}
                      className="btn btn-danger-ghost btn-sm"
                    >
                      <Icon name="trash" size={15} /> Apagar
                    </button>
                  )}
                </div>
              </div>

              {loadingTrainingDetails && (
                <div className="space-y-3" aria-busy="true">
                  <Skeleton className="h-24" />
                  <Skeleton className="h-64" />
                </div>
              )}

              {!loadingTrainingDetails && isCompleted && (
                <PracticeResults games={trainingGames} savedTeams={teamRecords} players={players} />
              )}

              {!loadingTrainingDetails && !isCompleted && (
                <section className="card card-pad">
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2 className="section-title">Presenças</h2>
                      <p className="mt-0.5 text-sm text-ink-400">
                        <span className="font-semibold text-ink-100">{presentCount}</span>{" "}
                        {presentCount === 1 ? "jogador presente" : "jogadores presentes"}
                        {isAdmin && <> · máx. {MAX_PLAYERS} · {teamCountHint}</>}
                      </p>
                    </div>
                    {isAdmin && presentCount > 0 && (
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06] sm:w-40">
                        <div
                          className={`h-full rounded-full transition-all ${presentCount > MAX_PLAYERS ? "bg-amber-400" : "bg-brand-400"}`}
                          style={{ width: `${Math.min(100, (presentCount / MAX_PLAYERS) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {isAdmin ? (
                    <>
                      <div className="relative mb-3">
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

                      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                        {filteredPlayers.map((p) => {
                          const checked = present.includes(p.id);
                          const waitlisted = waitlistedIds.has(p.id);
                          return (
                            <li key={p.id}>
                              <label
                                className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl px-3 py-2 ring-1 ring-inset transition ${
                                  checked
                                    ? waitlisted
                                      ? "bg-amber-500/10 ring-amber-400/40"
                                      : "bg-brand-500/15 ring-brand-400/40"
                                    : "bg-white/[0.02] ring-white/[0.06] hover:bg-white/[0.05]"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={checked}
                                  onChange={() => togglePresence(p.id)}
                                />
                                <span
                                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md transition ${
                                    checked
                                      ? waitlisted
                                        ? "bg-amber-400 text-ink-950"
                                        : "bg-brand-500 text-white"
                                      : "ring-1 ring-inset ring-white/25"
                                  }`}
                                >
                                  {checked && <Icon name="check" size={14} strokeWidth={3} />}
                                </span>
                                <span className={`flex-1 truncate text-sm ${checked ? "font-semibold text-ink-50" : "text-ink-300"}`}>
                                  {p.name}
                                </span>
                                {waitlisted && <span className="chip bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300">Espera</span>}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                      {filteredPlayers.length === 0 && (
                        <p className="py-6 text-center text-sm text-ink-400">Sem resultados para “{query}”.</p>
                      )}

                      {attendancePriority.waitlisted.length > 0 && (
                        <Banner tone="warning" title={`Limite de ${MAX_PLAYERS} jogadores — lista de espera por assiduidade`} className="mt-4">
                          {attendancePriority.waitlisted.map((player) => player.name).join(", ")}
                        </Banner>
                      )}

                      {needsFormatChoice && (
                        <div className="mt-4 flex flex-col gap-2 rounded-xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/[0.06] sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-medium">Formato para {presentCount} jogadores</p>
                          <div className="flex rounded-xl bg-ink-950/60 p-1" role="radiogroup" aria-label="Formato">
                            {["2", "3"].map((value) => (
                              <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={choice12 === value}
                                onClick={() => setChoice12(value)}
                                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                                  choice12 === value ? "bg-brand-600 text-white" : "text-ink-300 hover:text-ink-50"
                                }`}
                              >
                                {value} equipas
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-10 -mx-4 mt-4 border-t border-white/[0.06] bg-ink-900/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5 md:bottom-0 md:rounded-b-2xl">
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button onClick={saveAttendance} disabled={busy === "attendance"} className="btn btn-secondary flex-1 sm:flex-none">
                            {busy === "attendance" ? <Spinner /> : <Icon name="save" size={18} />}
                            Guardar presenças
                          </button>
                          <button
                            onClick={generateTeams}
                            disabled={busy === "teams" || selectedCount < 6 || (needsFormatChoice && !choice12)}
                            className="btn btn-primary flex-1 sm:flex-none"
                          >
                            {busy === "teams" ? <Spinner /> : <Icon name="shuffle" size={18} />}
                            {teams.length ? "Gerar novas equipas" : "Gerar equipas"}
                          </button>
                        </div>
                        <p className="mt-2 text-xs text-ink-400">
                          A presença só entra nas estatísticas quando o treino for finalizado.
                        </p>
                      </div>
                    </>
                  ) : availablePlayers.length ? (
                    <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {availablePlayers.map((p) => (
                        <li key={p.id} className="flex items-center gap-2 rounded-xl bg-brand-500/10 px-3 py-2.5 text-sm font-medium ring-1 ring-inset ring-brand-400/20">
                          <Icon name="check" size={14} className="text-brand-300" />
                          <span className="truncate">{p.name}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState icon="users" title="Ainda sem presenças registadas" />
                  )}
                </section>
              )}

              {/* Teams + Bench */}
              {!loadingTrainingDetails && !isCompleted && teams.length > 0 && (
                <section id="teams" className="scroll-mt-24 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="section-title">Equipas</h2>
                    {isAdmin && (
                      editMode ? (
                        <div className="flex gap-2">
                          <button onClick={cancelEdit} className="btn btn-secondary btn-sm">
                            Cancelar
                          </button>
                          <button onClick={persistEditedTeams} disabled={busy === "persist"} className="btn btn-primary btn-sm">
                            {busy === "persist" ? <Spinner /> : <Icon name="save" size={15} />}
                            Guardar alterações
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setEditMode(true)} className="btn btn-secondary btn-sm">
                          <Icon name="pencil" size={14} /> Editar equipas
                        </button>
                      )
                    )}
                  </div>

                  {editMode && (
                    <p className="text-xs text-ink-400">
                      Usa os círculos coloridos para mover um jogador para outra equipa.
                    </p>
                  )}

                  <div className={`grid grid-cols-1 gap-3 ${teams.length === 3 ? "xl:grid-cols-3" : "md:grid-cols-2"}`}>
                    {teams.map((team, idx) => {
                      const color = teamColor(idx + 1);

                      return (
                        <div
                          key={idx}
                          className="rounded-2xl p-4"
                          style={{ backgroundColor: color.bg, color: color.fg, boxShadow: color.glow, border: `1px solid ${color.border}` }}
                        >
                          <div className="mb-3 flex items-baseline justify-between gap-2">
                            <h3 className="font-display text-xl font-extrabold uppercase">{teamLabel(idx + 1)}</h3>
                            <span className="text-xs font-semibold tabular-nums" style={{ color: color.muted }}>
                              {team.length} jog. · média {getTeamAverage(team).toFixed(2)}
                            </span>
                          </div>
                          <ul className="space-y-1.5">
                            {team.map((p) => (
                              <li
                                key={p.id}
                                className="flex min-h-[40px] items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm font-medium"
                                style={{ backgroundColor: color.chip }}
                              >
                                <span className="truncate">{p.name}</span>
                                {editMode && (
                                  <div className="flex shrink-0 items-center gap-1">
                                    {teams.map((_, tIdx) =>
                                      tIdx !== idx ? (
                                        <button
                                          key={tIdx}
                                          onClick={() => movePlayerBetweenTeams(idx, p.id, tIdx)}
                                          title={`Mover para ${teamLabel(tIdx + 1)}`}
                                          aria-label={`Mover ${p.name} para ${teamLabel(tIdx + 1)}`}
                                          className="grid h-8 w-8 place-items-center rounded-full transition hover:scale-110"
                                          style={{ backgroundColor: teamColor(tIdx + 1).bg, color: teamColor(tIdx + 1).fg, boxShadow: "0 0 0 1px rgba(128,128,128,0.5)" }}
                                        >
                                          <Icon name="arrowRight" size={14} />
                                        </button>
                                      ) : null
                                    )}
                                    <button
                                      onClick={() => removePlayerFromTeam(idx, p.id)}
                                      title="Tirar da equipa"
                                      aria-label={`Tirar ${p.name} da equipa`}
                                      className="grid h-8 w-8 place-items-center rounded-full bg-red-600 text-white transition hover:scale-110"
                                    >
                                      <Icon name="x" size={14} />
                                    </button>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>

                  {editMode && (
                    <div className="card card-pad">
                      <h3 className="mb-2 font-display text-lg font-bold uppercase text-amber-300">Sem equipa (presentes)</h3>
                      {benchPlayers.length === 0 ? (
                        <p className="text-sm text-ink-400">Sem jogadores por atribuir.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {benchPlayers.map((p) => (
                            <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-3 py-1.5">
                              <span className="truncate text-sm">{p.name}</span>
                              <div className="flex gap-1">
                                {teams.map((_, tIdx) => (
                                  <button
                                    key={tIdx}
                                    onClick={() => addPlayerToTeam(p.id, tIdx)}
                                    title={`Adicionar a ${teamLabel(tIdx + 1)}`}
                                    aria-label={`Adicionar ${p.name} a ${teamLabel(tIdx + 1)}`}
                                    className="grid h-8 w-8 place-items-center rounded-full transition hover:scale-110"
                                    style={{ backgroundColor: teamColor(tIdx + 1).bg, color: teamColor(tIdx + 1).fg, boxShadow: "0 0 0 1px rgba(128,128,128,0.5)" }}
                                  >
                                    <Icon name="plus" size={14} />
                                  </button>
                                ))}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {!editMode && (
                    <p className="flex items-center gap-2 text-xs text-ink-400">
                      <TeamDot teamNumber={1} /> <TeamDot teamNumber={2} /> <TeamDot teamNumber={3} />
                      Equipas prontas — segue para a página Jogos para o marcador.
                    </p>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
