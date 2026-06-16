"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Toast, { ToastMessage } from "@/components/Toast";

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "admin";

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (msg: ToastMessage) => setToasts((prev) => [...prev, msg]);
  const removeToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "No account found with this email. Please try again.");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-luxury-green flex flex-col items-center justify-center p-4">
      <div className="fixed top-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        ))}
      </div>

      <div className="w-full max-w-sm rounded-xl border border-luxury-gold/20 bg-luxury-green-secondary/40 p-8 shadow-2xl backdrop-blur-sm text-center">
        <h1 className="font-serif text-2xl font-bold tracking-widest text-white uppercase mb-2">
          Forgot Password
        </h1>
        <p className="text-xs text-gray-400 mb-6">
          Resetting password for <strong className="text-luxury-gold uppercase">{role}</strong>
        </p>

          <form onSubmit={handleSendResetLink} className="space-y-6 text-left">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-2">Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); setSuccess(false); }}
                placeholder="Insert email."
                className="w-full rounded border border-luxury-gold/20 bg-luxury-green/50 py-3 px-4 text-sm text-white outline-none focus:border-luxury-gold transition-colors"
                required
              />
              {errorMsg && <p className="text-red-500 text-sm mt-1">{errorMsg}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded bg-luxury-gold py-3 text-xs font-semibold tracking-widest text-luxury-green uppercase hover:bg-luxury-gold-hover transition-all hover:shadow-[0_0_15px_rgba(201,168,76,0.25)] disabled:opacity-50"
            >
              {loading ? <div className="h-4 w-4 animate-spin rounded-full border-t-2 border-luxury-green" /> : "Send Reset Link"}
            </button>
            {success && (
              <p className="text-sm text-emerald-400 mt-2 text-center">A password reset link has been sent to the admin email.</p>
            )}
          </form>

        <div className="mt-8">
          <Link href="/staff-login" className="inline-flex items-center gap-2 text-[11px] text-gray-400 hover:text-luxury-gold transition-colors uppercase tracking-wider">
            <ArrowLeft className="h-3 w-3" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPassword() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-luxury-green" />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
