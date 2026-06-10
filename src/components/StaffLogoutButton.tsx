"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function StaffLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      router.replace("/staff-login");
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-1.5 rounded border border-luxury-gold/20 bg-luxury-charcoal/50 px-3 py-1.5 text-[10px] font-semibold tracking-wider text-gray-400 uppercase transition-all duration-300 hover:border-rose-500/40 hover:text-rose-400 hover:bg-rose-500/5 disabled:opacity-50"
      title="Logout"
    >
      {loading ? (
        <div className="h-3.5 w-3.5 animate-spin rounded-full border-t border-rose-500" />
      ) : (
        <LogOut className="h-3.5 w-3.5" />
      )}
      <span>Logout</span>
    </button>
  );
}
