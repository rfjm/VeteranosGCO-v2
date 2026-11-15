import { useState } from "react";
import { useAuth } from "../useAuth";
import Icon from "../ui/Icon";
import { Spinner } from "../ui/primitives";

export default function AdminLogin({ onSuccess }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const { error: signInError } = await signIn(email.trim(), password);
    setSubmitting(false);

    if (signInError) {
      setError("Email ou palavra-passe inválidos.");
      return;
    }

    setPassword("");
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-ink-300">Email</span>
        <input
          type="email"
          autoComplete="username"
          placeholder="nome@exemplo.pt"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoFocus
          className="input"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-ink-300">Palavra-passe</span>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="input pr-20"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-1 my-1 rounded-lg px-3 text-xs font-semibold text-ink-400 hover:text-ink-100"
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </label>

      {error && (
        <p className="flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
          <Icon name="alert" size={16} /> {error}
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn btn-primary w-full">
        {submitting ? <Spinner /> : <Icon name="login" size={18} />}
        {submitting ? "A entrar…" : "Entrar"}
      </button>
    </form>
  );
}
