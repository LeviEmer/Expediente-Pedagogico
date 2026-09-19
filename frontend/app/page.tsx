"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.mustChangePassword) router.replace("/change-password");
    else if (user.role === "ADMIN") router.replace("/admin");
    else if (user.role === "SUPERVISOR" || user.role === "GENERAL_SUPERVISOR") router.replace("/supervisor");
    else router.replace("/dashboard");
  }, [user, loading, router]);

  return null;
}
