import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { calculateTeamRanking } from "../utils/teamRanking";
import { useAuth } from "../useAuth";
import {
  clampGameDuration,
  getGameEndAction,
  getNextTeamPair,
  getRecentGameResults,
  getStoredDurationMinutes,
  getWinnerTeamNumber,
} from "../utils/gameLogic";
import { dateFromKey } from "../utils/calendar";
import { useFeedback } from "../ui/feedbackContext";
import { teamColor, teamLabel } from "../ui/teams";
import Icon from "../ui/Icon";
import { capitalizeFirst } from "../ui/format";
import { Banner, EmptyState, PageHeader, Spinner, TeamDot } from "../ui/primitives";

const PRESETS = [3, 5, 7, 10];

export default function Games() {
  const { isAdmin } = useAuth();
  const { toast, confirm } = useFeedback();
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [loadingTraining, setLoadingTraining] = useState(true);
  const [teams, setTeams] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [timer, setTimer] = useState(300); // default 5 minutes
  const [durationChoice, setDurationChoice] = useState(300);
  const [running, setRunning] = useState(false);
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [showPlayers, setShowPlayers] = useState({});
  const [allPlayers, setAllPlayers] = useState([]);
  const [teamStandings, setTeamStandings] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [gameNotice, setGameNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState("warning");
  const [savingGame, setSavingGame] = useState(false);
  const [endingTraining, setEndingTraining] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hornRef = useRef(null);
  const scoreboardRef = useRef(null);

  useEffect(() => {
    const updateFullscreenState = () => {
      const fullscreenElement =
        document.fullscreenElement || document.webkitFullscreenElement;
      setIsFullscreen(fullscreenElement === scoreboardRef.current);
    };

    document.addEventListener("fullscreenchange", updateFullscreenState);
    document.addEventListener("webkitfullscreenchange", updateFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreenState);
      document.removeEventListener("webkitfullscreenchange", updateFullscreenState);
    };
  }, []);

  // Load trainings and players
  useEffect(() => {
    const fetchTrainings = async () => {
      const { data, error } = await supabase
        .from("trainings")
        .select("*")
        .order("date", { ascending: false });
      if (!error && data.length > 0) {
        setSelectedTraining(
          data.find((training) => !training.completed_at) || data[0],
        );
      }
      setLoadingTraining(false);
    };
    fetchTrainings();
    fetchAllPlayers();
  }, []);

  const fetchTeams = useCallback(async (trainingId) => {
    const { data, error } = await supabase
      .from("training_teams")
      .select("*")
      .eq("training_id", trainingId)
      .order("team_number");

    if (!error) {
      setTeams(data || []);
      return data || [];
    }
    return [];
  }, []);

  const fetchAllPlayers = async () => {
    const { data, error } = await supabase.from("players").select("id, name");
    if (!error) setAllPlayers(data);
  };

  const getPlayerName = (id) => {
    const player = allPlayers.find((p) => p.id === id);
    return player ? player.name : id;
  };

  const fetchGameSummary = useCallback(async (trainingId, currentTeams) => {
    const { data, error } = await supabase
      .from("games")
      .select("id, team1, team2, team1_score, team2_score, winner, created_at")
      .eq("training_id", trainingId)
      .order("created_at", { ascending: true });
    if (error) return;

    setTeamStandings(calculateTeamRanking(currentTeams, data || []));

    if (!data?.length) {
      setRecentGames([]);
      return;
    }

    setRecentGames(getRecentGameResults(data, currentTeams));
  }, []);

  // Load teams, standings and the previous result
  useEffect(() => {
    if (selectedTraining) {
      const loadTrainingGames = async () => {
        const loadedTeams = await fetchTeams(selectedTraining.id);
        await fetchGameSummary(selectedTraining.id, loadedTeams);
      };

      setSelectedTeams([]);
      setGameNotice("");
      loadTrainingGames();
    }
  }, [selectedTraining, fetchTeams, fetchGameSummary]);

  // Timer logic
  useEffect(() => {
    let interval;
    if (running && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    } else if (timer === 0 && running) {
      setRunning(false);
      if (hornRef.current) {
        hornRef.current.currentTime = 0;
        hornRef.current.play().catch(() => {
          console.warn("⚠️ Horn blocked until user interaction.");
        });
      }

      const action = getGameEndAction({
        timer,
        running,
        selectedTeamCount: selectedTeams.length,
        team1Score,
        team2Score,
      });

      if (action === "free-throws") {
        setNoticeTone("warning");
        setGameNotice("Empate: decide o jogo nos lances livres, atualiza o resultado final e guarda manualmente.");
      } else if (action === "missing-teams") {
        setNoticeTone("warning");
        setGameNotice("O tempo terminou, mas não foi possível guardar sem duas equipas selecionadas.");
      } else if (action === "manual-save") {
        setNoticeTone("warning");
        setGameNotice("Tempo terminado: confirma ou ajusta o resultado e carrega em Guardar.");
      }
    }
    return () => clearInterval(interval);
  }, [running, timer, selectedTeams.length, team1Score, team2Score]);

  // Space bar starts/pauses the clock while the scoreboard is open.
  useEffect(() => {
    if (selectedTeams.length !== 2) return undefined;
    const onKey = (event) => {
      if (event.code !== "Space") return;
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;
      event.preventDefault();
      if (running) setRunning(false);
      else if (timer > 0) setRunning(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedTeams.length, running, timer]);

  const toggleTeamSelection = (team) => {
    if (selectedTeams.some((t) => t.id === team.id)) {
      setSelectedTeams((prev) => prev.filter((t) => t.id !== team.id));
    } else if (selectedTeams.length < 2) {
      setSelectedTeams((prev) => [...prev, team]);
    } else {
      toast("Só podes escolher 2 equipas. Desmarca uma primeiro.", "warning");
    }
  };

  const resetGame = () => {
    setTimer(durationChoice);
    setTeam1Score(0);
    setTeam2Score(0);
    setRunning(false);
    setGameNotice("");
  };

  const confirmReset = async () => {
    if (team1Score === 0 && team2Score === 0 && timer === durationChoice) {
      resetGame();
      return;
    }
    const ok = await confirm({
      title: "Recomeçar o jogo?",
      message: "O resultado volta a 0–0 e o relógio volta ao início.",
      confirmLabel: "Recomeçar",
      icon: "reset",
    });
    if (ok) resetGame();
  };

  const updateDuration = (minutes, seconds) => {
    const newDuration = clampGameDuration(minutes, seconds);
    setDurationChoice(newDuration);
    setTimer(newDuration);
    setGameNotice("");
  };

  const toggleScoreboardFullscreen = async () => {
    const fullscreenElement =
      document.fullscreenElement || document.webkitFullscreenElement;

    try {
      if (fullscreenElement) {
        const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
        await exitFullscreen?.call(document);
      } else {
        scoreboardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        const requestFullscreen =
          scoreboardRef.current?.requestFullscreen ||
          scoreboardRef.current?.webkitRequestFullscreen;
        await requestFullscreen?.call(scoreboardRef.current);
      }
    } catch {
      // Scrolling still provides the large scoreboard when fullscreen is unavailable.
    }
  };

  const saveGame = async () => {
    if (selectedTeams.length !== 2 || !selectedTraining) return;
    if (savingGame) return;

    const winner = getWinnerTeamNumber(selectedTeams, team1Score, team2Score);
    if (winner == null) {
      setNoticeTone("warning");
      setGameNotice("O jogo está empatado. Introduz o resultado final dos lances livres antes de guardar.");
      return;
    }

    setSavingGame(true);
    const { error } = await supabase.from("games").insert([
      {
        training_id: selectedTraining.id,
        team1: selectedTeams[0].players,
        team2: selectedTeams[1].players,
        team1_score: team1Score,
        team2_score: team2Score,
        winner,
        date: selectedTraining.date,
        // Supabase stores this legacy field as an integer. The timer itself
        // still supports exact seconds from 0:00 through 30:00.
        duration_minutes: getStoredDurationMinutes(durationChoice),
      },
    ]);

    if (error) {
      setNoticeTone("warning");
      setGameNotice("Erro ao guardar jogo: " + error.message);
    } else {
      const nextTeams = getNextTeamPair(selectedTeams, teams);
      await fetchGameSummary(selectedTraining.id, teams);
      resetGame();
      setSelectedTeams(nextTeams);
      // Shown inside the scoreboard so it is visible in fullscreen too.
      setNoticeTone("success");
      setGameNotice(
        `Jogo guardado! Próximo jogo: Equipa ${nextTeams[0].team_number} vs Equipa ${nextTeams[1].team_number}`,
      );
    }
    setSavingGame(false);
  };

  const endTraining = async () => {
    if (!selectedTraining || endingTraining) return;
    if (selectedTraining.completed_at) {
      toast("Este treino já foi finalizado.", "info");
      return;
    }

    const ok = await confirm({
      title: "Finalizar treino?",
      message:
        "Os pontos são atribuídos aos jogadores (3 / 2 / 1 por classificação) e o treino fica fechado. Não é possível desfazer.",
      confirmLabel: "Finalizar e atribuir pontos",
      icon: "flag",
    });
    if (!ok) return;

    setEndingTraining(true);

    const { data: trainingStatus, error: statusError } = await supabase
      .from("trainings")
      .select("completed_at")
      .eq("id", selectedTraining.id)
      .single();

    if (statusError) {
      toast("Erro ao verificar o treino: " + statusError.message, "error");
      setEndingTraining(false);
      return;
    }
    if (trainingStatus.completed_at) {
      setSelectedTraining((current) => ({
        ...current,
        completed_at: trainingStatus.completed_at,
      }));
      toast("Este treino já foi finalizado.", "info");
      setEndingTraining(false);
      return;
    }

    const { data: allTeams, error: teamsErr } = await supabase
      .from("training_teams")
      .select("id, team_number, players")
      .eq("training_id", selectedTraining.id)
      .order("team_number");

    if (teamsErr) {
      toast("Erro ao buscar equipas: " + teamsErr.message, "error");
      setEndingTraining(false);
      return;
    }
    if (!allTeams || allTeams.length < 2) {
      toast("São necessárias pelo menos 2 equipas.", "warning");
      setEndingTraining(false);
      return;
    }

    const { data: games, error: gamesErr } = await supabase
      .from("games")
      .select("team1, team2, team1_score, team2_score, winner")
      .eq("training_id", selectedTraining.id);

    if (gamesErr) {
      toast("Erro ao buscar jogos: " + gamesErr.message, "error");
      setEndingTraining(false);
      return;
    }

    const ranking = calculateTeamRanking(allTeams, games);

    const places = Math.min(ranking.length, 3);
    const pointsByPlace = places === 2 ? [3, 2] : [3, 2, 1];

    for (let i = 0; i < places; i++) {
      const team = ranking[i];
      const add = pointsByPlace[i];

      for (const playerId of team.players) {
        const { data: current, error: curErr } = await supabase
          .from("players")
          .select("total_points")
          .eq("id", playerId)
          .single();

        if (curErr) continue;

        const newTotal = (current?.total_points || 0) + add;

        await supabase
          .from("players")
          .update({ total_points: newTotal })
          .eq("id", playerId);
      }
    }

    const completedAt = new Date().toISOString();
    const { error: completionError } = await supabase
      .from("trainings")
      .update({ completed_at: completedAt })
      .eq("id", selectedTraining.id)
      .is("completed_at", null);

    if (completionError) {
      toast("Os pontos foram atribuídos, mas ocorreu um erro ao finalizar o treino: " + completionError.message, "error", 10000);
      setEndingTraining(false);
      return;
    }

    setSelectedTraining((current) => ({ ...current, completed_at: completedAt }));
    setSelectedTeams([]);
    setGameNotice("");
    setEndingTraining(false);
    toast("Pontos atribuídos e treino guardado no histórico!");
  };

  const trainingCompleted = Boolean(selectedTraining?.completed_at);
  const scoreboardOpen = !trainingCompleted && selectedTeams.length === 2;
  const minutes = Math.floor(timer / 60);
  const seconds = String(timer % 60).padStart(2, "0");
  const lowTime = running && timer <= 10;

  return (
    <div>
      <PageHeader
        eyebrow={
          selectedTraining
            ? `Treino · ${capitalizeFirst(
                dateFromKey(String(selectedTraining.date).slice(0, 10)).toLocaleDateString("pt-PT", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                }),
              )}`
            : "Marcador"
        }
        title="Jogos"
        description="Escolhe duas equipas, controla o relógio e guarda o resultado de cada jogo."
      />

      {loadingTraining ? (
        <div className="flex items-center gap-2 text-sm text-ink-400">
          <Spinner /> A carregar o treino…
        </div>
      ) : !selectedTraining ? (
        <EmptyState icon="calendar" title="Ainda não há treinos" action={<Link to="/training" className="btn btn-primary">Ir para Treinos</Link>} />
      ) : (
        <>
          {trainingCompleted && (
            <Banner tone="success" title="Este treino já foi finalizado." className="mb-6">
              Consulta o resultado completo na{" "}
              <Link to="/training" state={{ trainingId: selectedTraining.id }} className="font-semibold underline underline-offset-2">
                página Treinos
              </Link>
              .
            </Banner>
          )}

          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <section className="card card-pad">
              <h2 className="section-title mb-3">Classificação</h2>
              {teamStandings.length ? (
                <ol className="space-y-1.5">
                  {teamStandings.map((team, index) => (
                    <li key={team.team_number} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5">
                      <span className="w-6 font-display text-lg font-bold text-ink-400">{index + 1}.º</span>
                      <TeamDot teamNumber={team.team_number} size={14} />
                      <span className="flex-1 font-medium">{teamLabel(team.team_number)}</span>
                      <span className="text-sm tabular-nums">
                        <strong className="text-brand-300">{team.wins}</strong>
                        <span className="text-ink-500"> V · </span>
                        <strong className="text-red-300">{team.losses}</strong>
                        <span className="text-ink-500"> D</span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-ink-400">Ainda não existem equipas.</p>
              )}
            </section>

            <section className="card card-pad">
              <h2 className="section-title mb-3">Últimos 3 jogos</h2>
              {recentGames.length ? (
                <ol className="space-y-1.5">
                  {recentGames.map((game, index) => (
                    <li
                      key={game.id}
                      className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${
                        index === 0 ? "bg-white/[0.06] ring-1 ring-inset ring-white/[0.08]" : "bg-white/[0.02]"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <TeamDot teamNumber={game.team1} /> Eq. {game.team1}
                      </span>
                      <strong className="stat-num text-2xl">
                        {game.team1Score}
                        <span className="mx-1.5 text-ink-500">–</span>
                        {game.team2Score}
                      </strong>
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        Eq. {game.team2} <TeamDot teamNumber={game.team2} />
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-ink-400">Ainda não existem jogos guardados.</p>
              )}
            </section>
          </div>

          {/* Team picker */}
          {teams.length === 0 ? (
            <EmptyState
              icon="shuffle"
              title="Sem equipas para este treino"
              action={<Link to="/training" state={{ trainingId: selectedTraining.id }} className="btn btn-secondary">Gerar equipas em Treinos</Link>}
            >
              Gera as equipas na página Treinos para começar a jogar.
            </EmptyState>
          ) : (
            <>
              {!trainingCompleted && (
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="section-title">Escolhe 2 equipas</h2>
                  <span className="text-xs text-ink-400">{selectedTeams.length}/2 selecionadas</span>
                </div>
              )}
              <div className={`mb-8 grid gap-3 ${teams.length === 3 ? "md:grid-cols-3" : "sm:grid-cols-2"}`}>
                {teams.map((team) => {
                  const color = teamColor(team.team_number);
                  const selectionIndex = selectedTeams.findIndex((selected) => selected.id === team.id);
                  const isSelected = selectionIndex !== -1;

                  return (
                    <div
                      key={team.id}
                      className={`relative rounded-2xl p-4 transition ${trainingCompleted ? "" : "cursor-pointer hover:-translate-y-0.5"}`}
                      style={{
                        backgroundColor: color.bg,
                        color: color.fg,
                        boxShadow: isSelected ? `0 0 0 3px #0a0f0c, 0 0 0 6px #33cf7f, ${color.glow}` : color.glow,
                        border: `1px solid ${color.border}`,
                      }}
                      onClick={() => !trainingCompleted && toggleTeamSelection(team)}
                      role={trainingCompleted ? undefined : "button"}
                      tabIndex={trainingCompleted ? undefined : 0}
                      aria-pressed={trainingCompleted ? undefined : isSelected}
                      onKeyDown={(event) => {
                        if (trainingCompleted) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          toggleTeamSelection(team);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display text-2xl font-extrabold uppercase leading-none">{teamLabel(team.team_number)}</h3>
                          <p className="mt-1 text-xs font-semibold" style={{ color: color.muted }}>
                            {(team.players || []).length} jogadores
                          </p>
                        </div>
                        {isSelected && (
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-500 text-xs font-bold text-white">
                            {selectionIndex === 0 ? "A" : "B"}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPlayers((prev) => ({ ...prev, [team.id]: !prev[team.id] }));
                        }}
                        className="mt-3 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold"
                        style={{ backgroundColor: color.chip }}
                        aria-expanded={Boolean(showPlayers[team.id])}
                      >
                        {showPlayers[team.id] ? "Esconder jogadores" : "Ver jogadores"}
                        <Icon name="chevronDown" size={14} className={`transition ${showPlayers[team.id] ? "rotate-180" : ""}`} />
                      </button>
                      {showPlayers[team.id] && (
                        <ul className="mt-2 grid grid-cols-2 gap-1">
                          {team.players.map((pid, i) => (
                            <li key={i} className="truncate rounded-md px-2 py-1 text-sm" style={{ backgroundColor: color.chip }}>
                              {getPlayerName(pid)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Timer + Scoreboard */}
          {scoreboardOpen && (
            <section
              ref={scoreboardRef}
              className={`flex min-h-[100svh] scroll-mt-2 flex-col gap-3 overflow-hidden bg-black p-3 text-center sm:p-5 ${
                isFullscreen ? "" : "rounded-3xl ring-1 ring-white/10"
              }`}
              aria-label="Marcador"
            >
              {/* Top bar: duration + fullscreen */}
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
                <div className="flex items-center gap-1 rounded-xl bg-white/[0.06] p-1">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={running}
                      onClick={() => updateDuration(preset, 0)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
                        durationChoice === preset * 60 ? "bg-white text-black" : "text-ink-300 hover:text-white"
                      }`}
                    >
                      {preset}′
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 rounded-xl bg-white/[0.06] px-2 py-1">
                  <input
                    aria-label="Minutos"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="30"
                    value={Math.floor(durationChoice / 60)}
                    disabled={running}
                    onChange={(e) => updateDuration(e.target.value, durationChoice % 60)}
                    className="w-10 rounded-md bg-transparent py-1 text-center font-semibold tabular-nums text-white focus:bg-white/10 focus:outline-none disabled:opacity-40"
                  />
                  <span className="text-ink-400">min</span>
                  <input
                    aria-label="Segundos"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="59"
                    value={durationChoice % 60}
                    disabled={running || durationChoice >= 30 * 60}
                    onChange={(e) => updateDuration(Math.floor(durationChoice / 60), e.target.value)}
                    className="w-10 rounded-md bg-transparent py-1 text-center font-semibold tabular-nums text-white focus:bg-white/10 focus:outline-none disabled:opacity-40"
                  />
                  <span className="text-ink-400">s</span>
                </div>
                <button
                  type="button"
                  onClick={toggleScoreboardFullscreen}
                  className="btn btn-secondary btn-sm"
                >
                  <Icon name={isFullscreen ? "minimize" : "maximize"} size={15} />
                  {isFullscreen ? "Sair do ecrã inteiro" : "Ecrã inteiro"}
                </button>
              </div>

              {/* Clock */}
              <div
                className={`font-display text-[clamp(5.5rem,22vh,13rem)] font-extrabold leading-none tabular-nums tracking-tight transition-colors ${
                  lowTime ? "text-red-500" : timer === 0 ? "text-amber-400" : running ? "text-white" : "text-ink-200"
                }`}
                aria-live="off"
              >
                {minutes}:{seconds}
              </div>

              {gameNotice && (
                <p
                  className={`mx-auto flex max-w-3xl items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm font-semibold sm:text-base ${
                    noticeTone === "success" ? "bg-brand-500 text-white" : "bg-amber-500 text-ink-950"
                  }`}
                  role="status"
                >
                  <Icon name={noticeTone === "success" ? "checkCircle" : "alert"} size={18} /> {gameNotice}
                </p>
              )}

              {/* Controls */}
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                {!running && timer > 0 ? (
                  <button onClick={() => setRunning(true)} className="btn btn-lg min-w-[140px] bg-brand-500 text-white hover:bg-brand-400">
                    <Icon name="play" size={20} /> Iniciar
                  </button>
                ) : running ? (
                  <button onClick={() => setRunning(false)} className="btn btn-lg min-w-[140px] bg-amber-400 text-black hover:bg-amber-300">
                    <Icon name="pause" size={20} /> Pausa
                  </button>
                ) : null}
                <button onClick={confirmReset} className="btn btn-lg btn-secondary">
                  <Icon name="reset" size={20} /> Recomeçar
                </button>
                <button
                  onClick={() => saveGame()}
                  disabled={savingGame || !isAdmin}
                  title={!isAdmin ? "Inicia sessão como administrador para guardar o jogo." : undefined}
                  className="btn btn-lg bg-sky-600 text-white hover:bg-sky-500"
                >
                  {savingGame ? <Spinner /> : <Icon name={isAdmin ? "save" : "lock"} size={20} />}
                  {savingGame ? "A guardar…" : "Guardar"}
                </button>
              </div>

              {/* Scores */}
              <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 sm:gap-4">
                {selectedTeams.map((team, idx) => {
                  const color = teamColor(team.team_number);
                  const score = idx === 0 ? team1Score : team2Score;
                  const setScore = idx === 0 ? setTeam1Score : setTeam2Score;

                  return (
                    <div
                      key={team.id}
                      className="flex min-h-0 flex-col justify-between rounded-3xl p-3 sm:p-5"
                      style={{ backgroundColor: color.bg, color: color.fg, boxShadow: color.glow, border: `1px solid ${color.border}` }}
                    >
                      <h2 className="font-display text-[clamp(1.4rem,4vw,3.5rem)] font-extrabold uppercase leading-none">
                        Equipa {team.team_number}
                      </h2>
                      <button
                        type="button"
                        onClick={() => setScore((s) => s + 1)}
                        aria-label={`Mais 1 ponto para a Equipa ${team.team_number}`}
                        className="flex flex-1 items-center justify-center font-display text-[clamp(8rem,32vh,22rem)] font-extrabold leading-none tabular-nums tracking-tighter active:scale-[0.98]"
                      >
                        {score}
                      </button>
                      <div className="grid grid-cols-[1fr_2fr] gap-2 sm:gap-3">
                        <button
                          onClick={() => setScore((s) => Math.max(0, s - 1))}
                          aria-label={`Menos 1 ponto para a Equipa ${team.team_number}`}
                          className="flex min-h-[56px] items-center justify-center rounded-2xl bg-red-600 text-2xl font-bold text-white active:scale-95"
                        >
                          <Icon name="minus" size={26} strokeWidth={3} />
                        </button>
                        <button
                          onClick={() => setScore((s) => s + 1)}
                          aria-label={`Mais 1 ponto para a Equipa ${team.team_number}`}
                          className="flex min-h-[56px] items-center justify-center gap-1 rounded-2xl bg-brand-500 text-2xl font-bold text-white active:scale-95"
                        >
                          <Icon name="plus" size={26} strokeWidth={3} /> 1
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="hidden text-xs text-ink-500 md:block">Atalho: barra de espaço inicia/pausa o relógio · toca no número para somar 1</p>
            </section>
          )}

          {/* Always keep the final action at the bottom of the page. */}
          {!trainingCompleted && (
            <div className="mt-10 flex flex-col items-center gap-2 border-t border-white/[0.06] pt-8 text-center">
              <button
                onClick={endTraining}
                disabled={!isAdmin || !selectedTraining || teams.length < 2 || trainingCompleted || endingTraining}
                title={!isAdmin ? "Inicia sessão como administrador para finalizar o treino." : undefined}
                className="btn btn-lg btn-gold"
              >
                {endingTraining ? <Spinner /> : <Icon name={isAdmin ? "flag" : "lock"} size={20} />}
                {endingTraining ? "A finalizar…" : "Finalizar treino"}
              </button>
              <p className="max-w-sm text-xs text-ink-400">
                Atribui 3 / 2 / 1 pontos aos jogadores das equipas classificadas e fecha o treino.
              </p>
            </div>
          )}
        </>
      )}
      <audio ref={hornRef} src={`${import.meta.env.BASE_URL}horn.mp3`} preload="auto" />
    </div>
  );
}
