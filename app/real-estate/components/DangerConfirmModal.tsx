import React, { useState } from "react";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";

interface DangerConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: React.ReactNode;
  /** Bullet list of things that will be permanently removed. */
  bullets?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  /**
   * If provided, the user must type this exact string (case-insensitive) into
   * the confirmation input before the destructive action is enabled. Use the
   * tenant email or a keyword like "DELETE".
   */
  requireText?: string;
  requireTextLabel?: React.ReactNode;
}

/**
 * Reusable confirmation popup for irreversible / destructive actions.
 * Matches the app's LogoutModal styling but with a red "danger zone" theme.
 */
export function DangerConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  bullets,
  confirmLabel = "Delete permanently",
  cancelLabel = "Cancel",
  loading = false,
  requireText,
  requireTextLabel,
}: DangerConfirmModalProps) {
  const [typed, setTyped] = useState("");

  // Clear the typed confirmation while the modal is closed so each reopen starts
  // blank. Done during render (not an effect) to avoid a cascading re-render; the
  // reset is bounded because `typed` is already "" after it runs.
  if (!isOpen) {
    if (typed !== "") setTyped("");
    return null;
  }

  const textMatches =
    !requireText ||
    typed.trim().toLowerCase() === requireText.trim().toLowerCase();
  const confirmDisabled = loading || !textMatches;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-[500px] rounded-xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-card p-6 shadow-xl animate-in zoom-in-95 duration-200">
        {/* Close */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 p-1 rounded-md text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <div className="flex flex-col text-left mt-1 mb-6">
          <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/60">
            <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />
          </div>

          <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
            {title}
          </h2>

          {description && (
            <div className="text-[15px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {description}
            </div>
          )}

          {bullets && bullets.length > 0 && (
            <ul className="mt-3 space-y-1 rounded-lg border border-red-100 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-red-500" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          {requireText && (
            <label className="mt-4 block text-sm">
              <span className="text-neutral-600 dark:text-neutral-300">
                {requireTextLabel ?? (
                  <>
                    Type{" "}
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {requireText}
                    </span>{" "}
                    to confirm
                  </>
                )}
              </span>
              <input
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                disabled={loading}
                className="mt-1.5 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-white outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/50 disabled:opacity-50"
                placeholder={requireText}
              />
            </label>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 w-full">
          <button
            onClick={onClose}
            disabled={loading}
            className="py-2 px-6 rounded-lg text-sm font-medium text-neutral-800 dark:text-neutral-200 bg-white dark:bg-transparent border-2 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="flex items-center gap-2 py-2 px-5 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {loading ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
