"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AlertCircle, Fingerprint } from "lucide-react";
import Link from "next/link";
import { startAuthentication, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import type { PublicKeyCredentialRequestOptionsJSON, AuthenticationResponseJSON } from "@simplewebauthn/browser";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Button, TextField, PasswordField } from "@/components/ui";

export default function LoginPage() {
  const { login, applySession } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [webAuthnBusy, setWebAuthnBusy] = useState(false);
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);

  useEffect(() => {
    setWebAuthnSupported(browserSupportsWebAuthn());
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await login(email, password);
      router.push(user.mustChangePassword ? "/change-password" : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setBusy(false);
    }
  }

  async function onWebAuthnLogin() {
    if (!email) {
      setError("Escribe tu correo primero");
      return;
    }
    setError(null);
    setWebAuthnBusy(true);
    try {
      const options = await api.post<PublicKeyCredentialRequestOptionsJSON>("/auth/webauthn/login-options", { email });
      const authResponse: AuthenticationResponseJSON = await startAuthentication({ optionsJSON: options });
      const res = await api.post<{ accessToken: string; user: Parameters<typeof applySession>[1] }>(
        "/auth/webauthn/login-verify",
        { email, response: authResponse },
      );
      const user = applySession(res.accessToken, res.user);
      router.push(user.mustChangePassword ? "/change-password" : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar con Face ID/huella");
    } finally {
      setWebAuthnBusy(false);
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
        <PasswordField label="Contraseña" required value={password} onChange={(e) => setPassword(e.target.value)} />

        <Button type="submit" busy={busy} className="w-full">
          {busy ? "Ingresando..." : "Ingresar"}
        </Button>

        {webAuthnSupported && (
          <Button
            type="button"
            variant="secondary"
            busy={webAuthnBusy}
            onClick={onWebAuthnLogin}
            icon={Fingerprint}
            className="w-full"
          >
            {webAuthnBusy ? "Verificando..." : "Usar Face ID / huella"}
          </Button>
        )}

        <p className="text-center text-sm">
          <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-700">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      </form>
    </div>
  );
}
