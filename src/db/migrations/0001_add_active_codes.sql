CREATE TABLE "active_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"course_code" text NOT NULL,
	"course_name" text NOT NULL,
	"group_letter" text NOT NULL,
	"teacher_username" text NOT NULL,
	"expires_at" timestamp NOT NULL
);
