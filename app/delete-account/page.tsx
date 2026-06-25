"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { customerAuthApi, normalizeMobileNumber } from "@/src/api/api";
import { ApiError } from "@/src/api/apiClient";
import { SpinnerIcon, TrashIcon } from "@/src/components/icons";

const LOGO_URL =
  "https://imgproxy.royodispatch.com/insecure/fit/300/100/sm/0/plain/https://restocare-asset.s3.ap-south-1.amazonaws.com/assets/Clientlogo/FE4tX1iKGv1yJIk1JijoEtq11jm1yGTIdMPIUjpa.png";

const RESEND_TIMEOUT = 30;

type Step = "mobile" | "otp" | "done";

export default function DeleteAccountPage() {
  const [step, setStep] = useState<Step>("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_TIMEOUT);

  const normalizedMobile = normalizeMobileNumber(mobile);
  const isMobileValid = normalizedMobile.length === 10;
  const isOtpValid = otp.replace(/\D/g, "").length >= 4;

  // Resend countdown while on the OTP step.
  useEffect(() => {
    if (step !== "otp" || countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, countdown]);

  const toMessage = (e: unknown, fallback: string) =>
    e instanceof ApiError ? e.message : e instanceof Error ? e.message : fallback;

  // Step 1 → opens the "are you sure?" confirmation dialog.
  const handleRequestDelete = (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!isMobileValid) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setConfirmOpen(true);
  };

  // Confirmed in the dialog → send the OTP and move to the OTP step.
  const handleConfirmAndSendOtp = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await customerAuthApi.generateOtp(normalizedMobile);
      setConfirmOpen(false);
      setStep("otp");
      setCountdown(RESEND_TIMEOUT);
    } catch (err) {
      setConfirmOpen(false);
      setError(toMessage(err, "Failed to send OTP. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError(null);
    setIsLoading(true);
    try {
      await customerAuthApi.resendOtp(normalizedMobile);
      setCountdown(RESEND_TIMEOUT);
    } catch (err) {
      setError(toMessage(err, "Unable to resend the OTP."));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 → verify OTP + permanently delete the account.
  const handleDelete = async (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!isOtpValid) {
      setError("Please enter the OTP sent to your mobile.");
      return;
    }
    setIsLoading(true);
    try {
      await customerAuthApi.deleteAccountWithOtp(normalizedMobile, otp.replace(/\D/g, ""));
      setStep("done");
    } catch (err) {
      setError(toMessage(err, "Unable to delete the account. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      data-theme="light"
      className="flex min-h-dvh flex-col items-center justify-center bg-gray-50 px-4 py-10"
    >
      <Link href="/" className="mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element -- external CDN logo */}
        <img src={LOGO_URL} alt="RestoCare" className="h-10 w-auto object-contain" />
      </Link>

      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        {step === "mobile" && (
          <form onSubmit={handleRequestDelete} className="space-y-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <TrashIcon className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
                  Delete your account
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Enter your registered mobile number to permanently delete your
                  RestoCare account.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
              This will permanently erase your profile, bookings, addresses and all
              associated data. This action cannot be undone.
            </div>

            <div className="space-y-2">
              <label htmlFor="mobile" className="text-sm font-medium text-gray-700">
                Mobile number
              </label>
              <div className="flex items-center rounded-xl border border-gray-200 bg-white focus-within:border-gray-900 focus-within:ring-2 focus-within:ring-gray-900/10">
                <span className="select-none border-r border-gray-200 px-3 py-3 text-sm text-gray-500">
                  +91
                </span>
                <input
                  id="mobile"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Enter mobile number"
                  className="w-full bg-transparent px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={!isMobileValid}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              Delete my account
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleDelete} className="space-y-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
                Verify it&apos;s you
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Enter the OTP sent to +91 {normalizedMobile} to confirm deletion.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="otp" className="text-sm font-medium text-gray-700">
                OTP code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter OTP"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm tracking-[0.3em] text-gray-900 placeholder:tracking-normal placeholder:text-gray-400 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={!isOtpValid || isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {isLoading && <SpinnerIcon className="h-4 w-4" />}
              {isLoading ? "Deleting…" : "Confirm & delete account"}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep("mobile");
                  setOtp("");
                  setError(null);
                }}
                className="font-medium text-gray-500 hover:text-gray-900"
              >
                ← Change number
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0 || isLoading}
                className="font-medium text-red-600 hover:text-red-700 disabled:text-gray-400"
              >
                {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
              </button>
            </div>
          </form>
        )}

        {step === "done" && (
          <div className="space-y-4 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
              Account deleted
            </h1>
            <p className="text-sm text-gray-500">
              Your RestoCare account and all associated data have been permanently
              deleted. We&apos;re sorry to see you go.
            </p>
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Back to home
            </Link>
          </div>
        )}
      </div>

      <p className="mt-6 max-w-md text-center text-xs text-gray-400">
        Need help? Contact us at{" "}
        <a href="mailto:support@restocare.in" className="underline">
          support@restocare.in
        </a>
      </p>

      {/* "Are you sure?" confirmation dialog. */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <TrashIcon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Are you sure?
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  This will permanently delete your account and erase all your data.
                  We&apos;ll send an OTP to +91 {normalizedMobile} to confirm.
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={isLoading}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSendOtp}
                disabled={isLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {isLoading && <SpinnerIcon className="h-4 w-4" />}
                {isLoading ? "Sending…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
