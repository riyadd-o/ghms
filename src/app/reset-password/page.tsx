"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Toast, { ToastMessage } from "@/components/Toast";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const role = searchParams.get("role");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (msg: ToastMessage) => setToasts((prev) => [...prev, msg]);
  const removeToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || !role) {
      addToast({ id: Date.now(), type: "error", message: "Invalid link parameters." });
      return;
    }

    if (password !== confirmPassword) {
      addToast({ id: Date.now(), type: "error", message: "Passwords do not match." });
      return;
    }

    if (password.length < 4) {
      addToast({ id: Date.now(), type: "error", message: "Password must be at least 4 characters." });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, role }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.replace("/staff-login");
        }, 2000);
      } else {
        addToast({ id: Date.now(), type: "error", message: "This reset link is invalid or has expired." });
      }
    } catch {
      addToast({ id: Date.now(), type: "error", message: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  if (!token || !role) {
    return (
      <div className="min-h-screen bg-luxury-green flex flex-col items-center justify-center p-4">
        <p className="text-rose-500">Invalid reset link.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-luxury-green flex flex-col items-center justify-center p-4">
      <div className="fixed top-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
        ))}
      </div>

      <div className="w-full max-w-sm rounded-xl border border-luxury-gold/20 bg-luxury-green-secondary/40 p-8 shadow-2xl backdrop-blur-sm">
        <h1 className="font-serif text-2xl font-bold tracking-widest text-white uppercase text-center mb-2">
          Reset Password
        </h1>
        <p className="text-xs text-gray-400 text-center mb-6">
          Setting new password for <strong className="text-luxury-gold uppercase">{role}</strong>
        </p>

        {success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-4 text-center">
            <p className="text-sm font-semibold text-emerald-400 mb-2">Password updated successfully!</p>
            <p className="text-xs text-gray-400">Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full rounded border border-luxury-gold/20 bg-luxury-green/50 py-3 pl-4 pr-10 text-sm text-white placeholder-gray-600 focus:border-luxury-gold focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-luxury-gold transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full rounded border border-luxury-gold/20 bg-luxury-green/50 py-3 pl-4 pr-10 text-sm text-white placeholder-gray-600 focus:border-luxury-gold focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-luxury-gold transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded bg-luxury-gold py-3 text-xs font-semibold tracking-widest text-luxury-green uppercase hover:bg-luxury-gold-hover transition-all hover:shadow-[0_0_15px_rgba(201,168,76,0.25)] disabled:opacity-50"
            >
              {loading ? <div className="h-4 w-4 animate-spin rounded-full border-t-2 border-luxury-green" /> : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-luxury-green" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
