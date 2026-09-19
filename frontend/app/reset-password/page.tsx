"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button, PasswordField } from "@/components/ui";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword });
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo restablecer la contraseña");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50/60 to-slate-50 px-4">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-gray-100 bg-white p-8 shadow-lg shadow-gray-200/50">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Restablecer contraseña</h1>
          <p className="mt-1 text-sm text-gray-500">Escribe tu nueva contraseña.</p>
        </div>

        {!token && (
          <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            El enlace no es válido. Solicita uno nuevo.
          </p>
        )}

        {done ? (
          <p className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            Contraseña actualizada. Redirigiendo a inicio de sesión...
          </p>
        ) : (
          token && (
            <form onSubmit={onSubmit} className="space-y-5">
              {error && (
                <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              )}
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
              <Button type="submit" busy={busy} className="w-full">
                {busy ? "Guardando..." : "Restablecer contraseña"}
              </Button>
            </form>
          )
        )}

        <p className="text-center text-sm">
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
