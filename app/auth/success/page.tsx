"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LoadingScreen } from "../../components/LoadingScreen";
import { Suspense } from "react";

function AuthSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app";

  return (
    <LoadingScreen 
      message="เข้าสู่ระบบสำเร็จ กำลังเตรียมข้อมูล..." 
      onComplete={() => router.replace(next)} 
    />
  );
}

export default function AuthSuccessPage() {
  return (
    <Suspense fallback={null}>
      <AuthSuccessContent />
    </Suspense>
  );
}