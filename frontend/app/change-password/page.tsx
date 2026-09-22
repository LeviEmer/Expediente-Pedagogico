"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Fingerprint, Trash2 } from "lucide-react";
import { startRegistration, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON, RegistrationResponseJSON } from "@simplewebauthn/browser";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Button, Card, PasswordField } from "@/components/ui";

type WebAuthnCredentialSummary = { id: string; deviceLabel: string | null; createdAt: string };

function guessDeviceLabel() {
  if (typeof navigator === "undefined") return undefined;
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "Dispositivo";
}

export default function ChangePasswordPage() {
  const { user, markPasswordChanged, logout } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [webAuthnSupported, setWebAuthnSupported] = useState(false);
  const [credentials, setCredentials] = useState<WebAuthnCredentialSummary[]>([]);
  const [webAuthnBusy, setWebAuthnBusy] = useState(false);
  const [webAuthnStatus, setWebAuthnStatus] = useState<string | null>(null);

  const showWebAuthnSection = !user?.mustChangePassword;

  function reloadCredentials() {
    api.get<WebAuthnCredentialSummary[]>("/auth/webauthn/credentials").then(setCredentials);
  }

  useEffect(() => {
    if (!showWebAuthnSection) return;
    setWebAuthnSupported(browserSupportsWebAuthn());
    reloadCredentials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWebAuthnSection]);

  async function registerDevice() {
    setWebAuthnStatus(null);
    setWebAuthnBusy(true);
    try {
      const options = await api.post<PublicKeyCredentialCreationOptionsJSON>("/auth/webauthn/register-options");
      const attResponse: RegistrationResponseJSON = await startRegistration({ optionsJSON: options });
      await api.post("/auth/webauthn/register-verify", { response: attResponse, deviceLabel: guessDeviceLabel() });
      setWebAuthnStatus("Face ID/huella activada en este dispositivo.");
      reloadCredentials();
    } catch (err) {
      setWebAuthnStatus(err instanceof Error ? err.message : "No se pudo activar Face ID/huella");
    } finally {
      setWebAuthnBusy(false);
    }
  }

  async function removeDevice(id: string) {
    setWebAuthnStatus(null);
    try {
      await api.delete(`/auth/webauthn/credentials/${id}`);
      reloadCredentials();
    } catch (err) {
      setWebAuthnStatus(err instanceof Error ? err.message : "No se pudo quitar el dispositivo");
    }
  }

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
    <div className="flex min-h-screen flex-col items-center gap-5 bg-gradient-to-b from-blue-50/60 to-slate-50 px-4 py-10">
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

      {showWebAuthnSection && webAuthnSupported && (
        <Card className="w-full max-w-sm space-y-4">
          <div>
            <h2 className="flex items-center gap-1.5 font-medium text-gray-800">
              <Fingerprint className="h-4 w-4 text-blue-600" aria-hidden="true" />
              Face ID / huella
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Actívalo en este dispositivo para entrar sin escribir la contraseña la próxima vez. La contraseña
              sigue funcionando igual.
            </p>
          </div>

          {webAuthnStatus && (
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">{webAuthnStatus}</p>
          )}

          {credentials.length > 0 && (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100 text-sm">
              {credentials.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-gray-700">{c.deviceLabel ?? "Dispositivo"}</span>
                  <button
                    onClick={() => removeDevice(c.id)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Button type="button" variant="secondary" busy={webAuthnBusy} onClick={registerDevice} icon={Fingerprint} className="w-full">
            {webAuthnBusy ? "Activando..." : "Activar en este dispositivo"}
          </Button>
        </Card>
      )}
    </div>
  );
}
