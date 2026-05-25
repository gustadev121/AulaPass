'use client';

import { useState } from 'react';
import KioskScreen from '@/components/KioskScreen';
import TeacherPanel from '@/components/TeacherPanel';

export default function Home() {
  const [view, setView] = useState<'KIOSK' | 'TEACHER'>('KIOSK');
  const [teacherData, setTeacherData] = useState<any>(null);

  const handleTeacherLogin = (data: any) => {
    setTeacherData(data);
    setView('TEACHER');
  };

  const handleLogout = () => {
    setTeacherData(null);
    setView('KIOSK');
  };

  return (
    <main className="min-h-screen">
      {view === 'KIOSK' ? (
        <KioskScreen onTeacherLogin={handleTeacherLogin} />
      ) : (
        <TeacherPanel teacherData={teacherData} onLogout={handleLogout} />
      )}
    </main>
  );
}
