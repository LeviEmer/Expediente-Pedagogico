"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { Button, TextField } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo procesar la solicitud");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50/60 to-slate-50 px-4">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-gray-100 bg-white p-8 shadow-lg shadow-gray-200/50">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">¿Olvidaste tu contraseña?</h1>
          <p className="mt-1 text-sm text-gray-500">Escribe tu correo y te enviaremos un enlace para restablecerla.</p>
        </div>

        {sent ? (
          <p className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
            Si el correo existe en el sistema, te enviamos un enlace para restablecer tu contraseña.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            {error && (
              <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}
            <TextField label="Correo" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" busy={busy} className="w-full">
              {busy ? "Enviando..." : "Enviar enlace"}
            </Button>
          </form>
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
