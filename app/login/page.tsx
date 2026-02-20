"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to home page (landing page with login)
    router.push("/");
  }, [router]);

  return null;
}
