"use client";

import { useState } from "react";
import KioskScreen from "@/components/KioskScreen";
import TeacherPanel from "@/components/TeacherPanel";

interface Teacher {
  code: string;
  name: string;
}

export default function Home() {
  const [view, setView] = useState<"KIOSK" | "TEACHER">("KIOSK");
  const [teacherData, setTeacherData] = useState<Teacher | null>(null);

  const handleTeacherLogin = (data: Teacher) => {
    setTeacherData(data);
    setView("TEACHER");
  };

  const handleLogout = () => {
    setTeacherData(null);
    setView("KIOSK");
  };

  return (
    <main className="min-h-screen">
      {view === "KIOSK" ? (
        <KioskScreen onTeacherLogin={handleTeacherLogin} />
      ) : (
        <TeacherPanel teacherData={teacherData} onLogout={handleLogout} />
      )}
    </main>
  );
}
