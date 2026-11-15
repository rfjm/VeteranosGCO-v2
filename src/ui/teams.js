// Bib colours used in practice: team 1 yellow, team 2 black, team 3 white.
export const TEAM_COLORS = {
  1: {
    name: "Amarela",
    bg: "#f5ff00",
    fg: "#0a0a0a",
    muted: "rgba(10,10,10,0.62)",
    chip: "rgba(10,10,10,0.08)",
    border: "#f5ff00",
    glow: "0 0 32px -6px rgba(245,255,0,0.55)",
  },
  2: {
    name: "Preta",
    bg: "#050505",
    fg: "#ffffff",
    muted: "rgba(255,255,255,0.6)",
    chip: "rgba(255,255,255,0.08)",
    border: "#3f4a44",
    glow: "0 0 0 1px rgba(255,255,255,0.08)",
  },
  3: {
    name: "Branca",
    bg: "#ffffff",
    fg: "#0a0a0a",
    muted: "rgba(10,10,10,0.55)",
    chip: "rgba(10,10,10,0.06)",
    border: "#ffffff",
    glow: "0 0 32px -10px rgba(255,255,255,0.5)",
  },
};

export const teamColor = (teamNumber) =>
  TEAM_COLORS[Number(teamNumber)] || TEAM_COLORS[2];

export const teamLabel = (teamNumber) =>
  `Equipa ${teamNumber} · ${teamColor(teamNumber).name}`;
