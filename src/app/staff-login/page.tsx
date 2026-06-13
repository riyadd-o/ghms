"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import Toast, { ToastMessage } from "@/components/Toast";

function StaffLoginContent() {

  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect");

  const [role, setRole] = useState<"admin" | "chef">("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addToast = (msg: ToastMessage) => setToasts((prev) => [...prev, msg]);
  const removeToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Default hardcoded email for this prototype/demo per instructions
  const email = "nexoraforpro@gmail.com";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      if (res.ok) {
        addToast({ id: Date.now(), type: "success", message: "Welcome back! Redirecting..." });
        setTimeout(() => {
          const defaultPath = role === "admin" ? "/admin" : "/kitchen";
          window.location.href = redirectPath || defaultPath;
        }, 1500);
      } else {
        setError("Invalid password. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
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

      <div className="mb-8 text-center flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#D4AF37] bg-[#0B1F1A] shadow-[0_0_15px_rgba(201,168,76,0.3)] mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 8.5C15 7 13.5 6 12 6C8.5 6 6 8.5 6 12C6 15.5 8.5 18 12 18C14 18 15.5 16.8 16.2 15H12" stroke="#D4AF37" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="7" y1="21" x2="17" y2="21" stroke="#D4AF37" strokeWidth="0.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 className="font-serif text-2xl font-bold tracking-widest text-white uppercase">
          Golden Hotel
        </h1>
        <p className="text-[10px] font-sans tracking-[0.2em] text-luxury-gold uppercase mt-1">
          Staff Portal
        </p>
      </div>

      <div className="w-full max-w-sm rounded-xl border border-luxury-gold/20 bg-luxury-green-secondary/40 p-8 shadow-2xl backdrop-blur-sm">
        
        {/* Role Toggle */}
        <div className="flex bg-luxury-green/60 rounded-lg p-1 border border-luxury-gold/10 mb-6">
          <button
            type="button"
            onClick={() => { setRole("admin"); setError(null); }}
            className={`flex-1 rounded-md py-2 text-xs font-semibold tracking-widest uppercase transition-all ${
              role === "admin" ? "bg-luxury-gold text-luxury-green shadow-sm" : "text-gray-400 hover:text-white"
            }`}
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => { setRole("chef"); setError(null); }}
            className={`flex-1 rounded-md py-2 text-xs font-semibold tracking-widest uppercase transition-all ${
              role === "chef" ? "bg-luxury-gold text-luxury-green shadow-sm" : "text-gray-400 hover:text-white"
            }`}
          >
            Kitchen
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email is hardcoded and hidden from user per instructions */}
          <input type="hidden" value={email} readOnly />

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="Enter your password"
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
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded bg-luxury-gold py-3 text-xs font-semibold tracking-widest text-luxury-green uppercase hover:bg-luxury-gold-hover transition-all hover:shadow-[0_0_15px_rgba(201,168,76,0.25)] disabled:opacity-50"
          >
            {loading ? <div className="h-4 w-4 animate-spin rounded-full border-t-2 border-luxury-green" /> : "Login"}
          </button>
          
          <div className="text-center mt-4">
            <Link href={`/forgot-password?role=${role}`} className="text-[11px] text-gray-400 hover:text-luxury-gold transition-colors">
              Forgot Password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StaffLogin() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-luxury-green" />}>
      <StaffLoginContent />
    </Suspense>
  );
}
