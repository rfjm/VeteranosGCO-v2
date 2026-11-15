import { buildPracticeSummary } from "../utils/practiceResults";
import { teamColor, teamLabel } from "../ui/teams";
import Icon from "../ui/Icon";
import { EmptyState, TeamDot } from "../ui/primitives";

function RankingTable({ ranking }) {
  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-inset ring-white/[0.06]">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead className="bg-white/[0.03]">
          <tr>
            <th className="table-head w-14 text-center">Pos.</th>
            <th className="table-head">Equipa</th>
            <th className="table-head text-center">V</th>
            <th className="table-head text-center">D</th>
            <th className="table-head text-center">Marcados</th>
            <th className="table-head text-center">Sofridos</th>
            <th className="table-head text-center">Dif.</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((team, index) => (
            <tr key={team.team_number} className="border-t border-white/[0.04]">
              <td className="px-3 py-2.5 text-center font-display text-base font-bold">{index + 1}.º</td>
              <td className="px-3 py-2.5">
                <span className="flex items-center gap-2 font-semibold">
                  <TeamDot teamNumber={team.team_number} />
                  {teamLabel(team.team_number)}
                </span>
              </td>
              <td className="px-3 py-2.5 text-center tabular-nums text-brand-300">{team.wins}</td>
              <td className="px-3 py-2.5 text-center tabular-nums text-red-300">{team.losses}</td>
              <td className="px-3 py-2.5 text-center tabular-nums">{team.pointsScored}</td>
              <td className="px-3 py-2.5 text-center tabular-nums">{team.pointsAgainst}</td>
              <td
                className={`px-3 py-2.5 text-center font-bold tabular-nums ${
                  team.pointDifference > 0 ? "text-brand-300" : team.pointDifference < 0 ? "text-red-300" : ""
                }`}
              >
                {team.pointDifference > 0 ? "+" : ""}
                {team.pointDifference}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PracticeResults({ games, savedTeams, players }) {
  const summary = buildPracticeSummary(games, savedTeams);
  const playerById = new Map(players.map((player) => [String(player.id), player]));
  const winner = summary.ranking[0];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-600/20 to-transparent p-5 sm:flex-row sm:items-center">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-500/20 text-brand-200">
          <Icon name="flag" size={24} />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold uppercase leading-none">Treino concluído</h2>
          <p className="mt-1 text-sm text-ink-300">
            {games.length} {games.length === 1 ? "jogo guardado" : "jogos guardados"}
          </p>
        </div>
        {winner && (
          <div className="flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2 text-sm">
            <Icon name="trophy" size={18} className="text-amber-300" />
            <span className="text-ink-300">Vencedora:</span>
            <TeamDot teamNumber={winner.team_number} />
            <strong>{teamColor(winner.team_number).name}</strong>
          </div>
        )}
      </div>

      <div>
        <h3 className="section-title mb-3">Jogadores por equipa</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {summary.teams.map((team) => {
            const color = teamColor(team.team_number);
            return (
              <article
                key={team.team_number}
                className="rounded-2xl p-4"
                style={{ backgroundColor: color.bg, color: color.fg, boxShadow: color.glow, border: `1px solid ${color.border}` }}
              >
                <div className="mb-3 flex items-baseline justify-between">
                  <h4 className="font-display text-xl font-extrabold uppercase">{teamLabel(team.team_number)}</h4>
                  <span className="text-xs font-semibold" style={{ color: color.muted }}>
                    {(team.players || []).length} jog.
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {(team.players || []).map((playerId) => (
                    <li key={playerId} className="rounded-lg px-3 py-2 text-sm font-medium" style={{ backgroundColor: color.chip }}>
                      {playerById.get(String(playerId))?.name || playerId}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="section-title mb-3">Resultados por ronda</h3>
        {summary.rounds.length ? (
          <div className="space-y-4">
            {summary.rounds.map((round) => (
              <article key={round.number} className="card card-pad">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="font-display text-xl font-bold uppercase">Ronda {round.number}</h4>
                  {!round.complete && (
                    <span className="chip bg-amber-500/15 text-amber-300">Ronda incompleta</span>
                  )}
                </div>
                <ul className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {round.games.map((game) => (
                    <li key={game.id} className="flex items-center justify-between gap-2 rounded-xl bg-ink-950/60 px-3 py-2.5 ring-1 ring-inset ring-white/[0.05]">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <TeamDot teamNumber={game.team1Number} /> Eq. {game.team1Number}
                      </span>
                      <strong className="stat-num text-2xl">
                        {game.team1_score}
                        <span className="mx-1.5 text-ink-500">–</span>
                        {game.team2_score}
                      </strong>
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        Eq. {game.team2Number} <TeamDot teamNumber={game.team2Number} />
                      </span>
                    </li>
                  ))}
                </ul>
                <RankingTable ranking={round.ranking} />
              </article>
            ))}
          </div>
        ) : (
          <EmptyState icon="ball" title="Não existem jogos guardados para este treino." />
        )}
      </div>

      {summary.ranking.length > 0 && (
        <div className="rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-500/10 to-transparent p-4 sm:p-5">
          <h3 className="section-title mb-3 flex items-center gap-2">
            <Icon name="trophy" size={20} className="text-amber-300" /> Total final
          </h3>
          <RankingTable ranking={summary.ranking} />
        </div>
      )}
    </section>
  );
}
