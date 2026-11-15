import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import AdminLogin from "./components/AdminLogin";
import { useAuth } from "./useAuth";
import { useFeedback } from "./ui/feedbackContext";
import Icon from "./ui/Icon";

const NAV_ITEMS = [
  { to: "/", label: "Início", icon: "home", end: true },
  { to: "/training", label: "Treinos", icon: "calendar" },
  { to: "/games", label: "Jogos", icon: "timer" },
  { to: "/leaderboard", label: "Ranking", icon: "trophy" },
  { to: "/players", label: "Jogadores", icon: "users" },
];

const crestUrl = `${import.meta.env.BASE_URL}gco.png`;

function LoginModal({ onClose, onSuccess }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="login-title">
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="card relative w-full max-w-sm animate-scale-in p-6">
        <button type="button" onClick={onClose} aria-label="Fechar" className="btn btn-ghost btn-sm absolute right-3 top-3 px-2">
          <Icon name="x" size={18} />
        </button>
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/15 text-brand-300">
            <Icon name="shield" size={22} />
          </div>
          <div>
            <h2 id="login-title" className="text-2xl font-bold uppercase leading-none">Área de admin</h2>
            <p className="mt-1 text-xs text-ink-400">Para gerir treinos, equipas e jogos.</p>
          </div>
        </div>
        <AdminLogin onSuccess={onSuccess} />
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  const [showLogin, setShowLogin] = useState(false);
  const { session, signOut, loading } = useAuth();
  const { toast, confirm } = useFeedback();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  const handleSignOut = async () => {
    const ok = await confirm({
      title: "Terminar sessão?",
      message: "Deixas de poder editar treinos, equipas e jogos neste dispositivo.",
      confirmLabel: "Sair",
      icon: "logout",
    });
    if (!ok) return;
    await signOut();
    setShowLogin(false);
    toast("Sessão terminada.", "info");
  };

  const handleLoginSuccess = () => {
    setShowLogin(false);
    toast("Sessão de admin iniciada.");
  };

  const adminControl = !loading && (
    session ? (
      <div className="flex items-center gap-1">
        <span className="chip hidden bg-brand-500/15 text-brand-200 ring-1 ring-inset ring-brand-400/25 sm:inline-flex">
          <Icon name="shield" size={13} /> Admin
        </span>
        <button type="button" onClick={handleSignOut} className="btn btn-ghost btn-sm" aria-label="Terminar sessão">
          <Icon name="logout" size={16} />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    ) : (
      <button type="button" onClick={() => setShowLogin(true)} className="btn btn-secondary btn-sm">
        <Icon name="lock" size={15} />
        Admin
      </button>
    )
  );

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-lg focus:bg-brand-600 focus:px-3 focus:py-2">
        Saltar para o conteúdo
      </a>

      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <NavLink to="/" className="flex min-w-0 items-center gap-3" aria-label="Veteranos GCO — Início">
            <img src={crestUrl} alt="" className="h-9 w-9 shrink-0 rounded-full bg-white p-0.5 sm:h-10 sm:w-10" />
            <div className="min-w-0 leading-none">
              <p className="whitespace-nowrap font-display text-lg font-extrabold uppercase tracking-wide sm:text-xl">Veteranos GCO</p>
              <p className="mt-0.5 truncate text-[11px] text-ink-400">Ginásio Clube Olhanense</p>
            </div>
          </NavLink>

          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Principal">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium transition lg:px-3 ${
                    isActive
                      ? "bg-brand-500/15 text-brand-200"
                      : "text-ink-300 hover:bg-white/[0.05] hover:text-ink-50"
                  }`
                }
              >
                <Icon name={item.icon} size={16} className="hidden lg:block" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto md:ml-2">{adminControl}</div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-6 sm:pt-8 md:pb-16">
        <div key={location.pathname} className="animate-fade-up">
          {children}
        </div>
      </main>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-ink-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
                    isActive ? "text-brand-300" : "text-ink-400 active:text-ink-100"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-400" />}
                    <Icon name={item.icon} size={22} strokeWidth={isActive ? 2.25 : 1.75} />
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {showLogin && !session && (
        <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}
