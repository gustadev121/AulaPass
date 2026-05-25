import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UniversityService } from "@/lib/university-service";
import { identifierSchema } from "@/lib/validations";

const loginSchema = z.object({
  teacherCode: identifierSchema,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { teacherCode } = parsed.data;
    const teacher = await UniversityService.getTeacherByCode(teacherCode);

    if (!teacher) {
      return NextResponse.json(
        { success: false, message: "Código docente no válido." },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      role: "TEACHER",
      name: teacher.name,
      code: teacher.code,
      cui: teacher.cui,
      message: `Acceso concedido para ${teacher.name}.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: `Error al validar acceso docente: ${error instanceof Error ? error.message : "Desconocido"}`,
      },
      { status: 500 },
    );
  }
}
