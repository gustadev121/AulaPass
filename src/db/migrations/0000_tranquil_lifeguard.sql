CREATE TABLE "attendance_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"course_code" text,
	"course_name" text,
	"group_letter" text,
	"student_cui" text,
	"student_name" text
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"abbreviation" text NOT NULL,
	"groups" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"cui" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"username" text PRIMARY KEY NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"course_code" text
);
--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_course_code_courses_code_fk" FOREIGN KEY ("course_code") REFERENCES "public"."courses"("code") ON DELETE set null ON UPDATE no action;