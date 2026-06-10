"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

export interface ToastMessage {
  id: number;
  type: "success" | "error";
  message: string;
}

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  // Auto dismiss after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgClass = type === "success" ? "bg-emerald-600" : "bg-rose-600";
  const borderClass = type === "success" ? "border-emerald-400" : "border-rose-400";
  const textClass = "text-white";

  return (
    <div className={`flex items-center gap-2 rounded border ${borderClass} ${bgClass} px-4 py-2 shadow-lg`}> 
      <span className={textClass}>{message}</span>
      <button onClick={onClose} className="ml-auto text-white hover:opacity-80">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
