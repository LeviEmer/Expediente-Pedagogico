"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Button, PasswordField } from "@/components/ui";

export default function ChangePasswordPage() {
  const { user, markPasswordChanged, logout } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas nuevas no coinciden");
      return;
    }
    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }
    setBusy(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      markPasswordChanged();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50/60 to-slate-50 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-2xl border border-gray-100 bg-white p-8 shadow-lg shadow-gray-200/50">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Cambia tu contraseña</h1>
          <p className="mt-1 text-sm text-gray-500">
            {user?.mustChangePassword
              ? "Por seguridad, debes poner tu propia contraseña antes de continuar."
              : "Escribe tu contraseña actual y la nueva."}
          </p>
        </div>

        {error && (
          <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <PasswordField
          label="Contraseña actual"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <PasswordField
          label="Nueva contraseña"
          required
          minLength={6}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <PasswordField
          label="Confirmar nueva contraseña"
          required
          minLength={6}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <Button type="submit" busy={busy} className="w-full" icon={CheckCircle2}>
          {busy ? "Guardando..." : "Guardar contraseña"}
        </Button>

        {user?.mustChangePassword && (
          <button type="button" onClick={logout} className="w-full text-center text-sm text-gray-400 hover:text-gray-600">
            Cerrar sesión
          </button>
        )}
      </form>
    </div>
  );
}
