"use client";

import type React from "react";
import { createContext, useContext, useState } from "react";

interface AuthContextType {
  adminAuthenticated: boolean;
  setAdminAuthenticated: (val: boolean) => void;
  studentCui: string | null;
  studentName: string | null;
  setStudent: (cui: string | null, name: string | null) => void;
  teacherUsername: string | null;
  teacherName: string | null;
  teacherCourseCode: string | null;
  setTeacher: (
    username: string | null,
    name: string | null,
    courseCode: string | null,
  ) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [studentCui, setStudentCui] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [teacherUsername, setTeacherUsername] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [teacherCourseCode, setTeacherCourseCode] = useState<string | null>(
    null,
  );

  const setStudent = (cui: string | null, name: string | null) => {
    setStudentCui(cui);
    setStudentName(name);
  };

  const setTeacher = (
    username: string | null,
    name: string | null,
    courseCode: string | null,
  ) => {
    setTeacherUsername(username);
    setTeacherName(name);
    setTeacherCourseCode(courseCode);
  };

  const logout = () => {
    setAdminAuthenticated(false);
    setStudent(null, null);
    setTeacher(null, null, null);
  };

  return (
    <AuthContext.Provider
      value={{
        adminAuthenticated,
        setAdminAuthenticated,
        studentCui,
        studentName,
        setStudent,
        teacherUsername,
        teacherName,
        teacherCourseCode,
        setTeacher,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
