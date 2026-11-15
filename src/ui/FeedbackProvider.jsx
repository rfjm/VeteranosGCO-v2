import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FeedbackContext } from "./feedbackContext";
import Icon from "./Icon";

const TONES = {
  success: { icon: "checkCircle", className: "border-brand-500/40 bg-brand-950/95 text-brand-50", iconClass: "text-brand-300" },
  error: { icon: "alert", className: "border-red-500/40 bg-red-950/95 text-red-50", iconClass: "text-red-300" },
  warning: { icon: "alert", className: "border-amber-500/40 bg-amber-950/95 text-amber-50", iconClass: "text-amber-300" },
  info: { icon: "info", className: "border-sky-500/40 bg-ink-850/95 text-ink-50", iconClass: "text-sky-300" },
};

let nextId = 1;

function ConfirmDialog({ request, onClose }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") onClose(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const danger = request.tone === "danger";

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => onClose(false)}
      />
      <div className="card relative w-full max-w-md animate-scale-in p-5 sm:p-6">
        <div className="flex gap-4">
          <div
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
              danger ? "bg-red-500/15 text-red-300" : "bg-brand-500/15 text-brand-300"
            }`}
          >
            <Icon name={request.icon || (danger ? "alert" : "info")} size={22} />
          </div>
          <div className="min-w-0">
            <h2 id="confirm-title" className="text-2xl font-bold">
              {request.title}
            </h2>
            {request.message && <p className="mt-1 text-sm leading-relaxed text-ink-300">{request.message}</p>}
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-secondary" onClick={() => onClose(false)}>
            {request.cancelLabel || "Cancelar"}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={() => onClose(true)}
          >
            {request.confirmLabel || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmRequest, setConfirmRequest] = useState(null);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (message, tone = "success", duration) => {
      const id = nextId++;
      setToasts((current) => [...current.slice(-3), { id, message, tone }]);
      const ms = duration ?? (tone === "error" ? 7000 : 4500);
      window.setTimeout(() => dismiss(id), ms);
    },
    [dismiss],
  );

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        setConfirmRequest({ ...options, resolve });
      }),
    [],
  );

  const closeConfirm = useCallback(
    (result) => {
      setConfirmRequest((current) => {
        current?.resolve(result);
        return null;
      });
    },
    [],
  );

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6"
      >
        {toasts.map((item) => {
          const tone = TONES[item.tone] || TONES.info;
          return (
            <div
              key={item.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur ${tone.className}`}
            >
              <Icon name={tone.icon} size={18} className={`mt-0.5 ${tone.iconClass}`} />
              <p className="flex-1 leading-snug">{item.message}</p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Fechar notificação"
                className="-mr-1 rounded-md p-0.5 opacity-60 hover:opacity-100"
              >
                <Icon name="x" size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {confirmRequest && <ConfirmDialog request={confirmRequest} onClose={closeConfirm} />}
    </FeedbackContext.Provider>
  );
}
