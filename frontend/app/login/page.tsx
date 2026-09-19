"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button, TextField } from "@/components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50/60 to-slate-50 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-2xl border border-gray-100 bg-white p-8 shadow-lg shadow-gray-200/50">
        <div className="flex flex-col items-center text-center">
          <span className="mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-gray-200">
            <Image src="/logo.jpg" alt="" width={64} height={64} className="h-full w-full object-cover" priority />
          </span>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Escuela de Manejo Orellana</p>
          <h1 className="text-xl font-semibold text-gray-900">Expediente Pedagógico</h1>
          <p className="text-sm text-gray-500">Bienvenido de nuevo — inicia sesión para continuar</p>
        </div>

        {error && (
          <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <TextField label="Correo" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Contraseña" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />

        <Button type="submit" busy={busy} className="w-full">
          {busy ? "Ingresando..." : "Ingresar"}
        </Button>
      </form>
    </div>
  );
}
