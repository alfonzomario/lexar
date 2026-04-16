-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`tier` text DEFAULT 'free',
	`total_views` integer DEFAULT 0,
	`profile_role` text DEFAULT 'Estudiante',
	`total_votes_received` integer DEFAULT 0,
	`doc_views_used` integer DEFAULT 0,
	`doc_views_period` text,
	`password` text
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`description` text,
	`icon` text
);
--> statement-breakpoint
CREATE TABLE `case_briefs` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`title` text NOT NULL,
	`court` text,
	`year` integer,
	`parties` text,
	`facts` text,
	`issue` text,
	`rule` text,
	`reasoning` text,
	`holding` text,
	`relevance` text,
	`keywords` text,
	`timeline` text,
	`citations` text,
	`is_demo` numeric DEFAULT 1,
	`subject_id` integer
);
--> statement-breakpoint
CREATE TABLE `case_brief_subjects` (
	`case_brief_id` integer,
	`subject_id` integer,
	PRIMARY KEY(`case_brief_id`, `subject_id`),
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`case_brief_id`) REFERENCES `case_briefs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `outlines` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`subject_id` integer,
	`title` text NOT NULL,
	`content` text,
	`is_demo` numeric DEFAULT 1,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`subject_id` integer,
	`title` text NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quiz_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`quiz_id` integer,
	`question` text NOT NULL,
	`option_a` text NOT NULL,
	`option_b` text NOT NULL,
	`option_c` text NOT NULL,
	`option_d` text NOT NULL,
	`correct_option` text NOT NULL,
	`explanation` text,
	FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `flashcards` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`subject_id` integer,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`source` text DEFAULT 'manual',
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `exams` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`subject_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`file_url` text,
	`uploaded_by` integer NOT NULL,
	`status` text DEFAULT 'pending',
	`approved_by` integer,
	`created_at` text NOT NULL,
	`views` integer DEFAULT 0,
	`year` integer,
	`university_id` integer,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`university_id`) REFERENCES `universities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `latinisms` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`term` text NOT NULL,
	`translation` text NOT NULL,
	`meaning` text,
	`example` text
);
--> statement-breakpoint
CREATE TABLE `bibliographies` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`subject_id` integer,
	`title` text NOT NULL,
	`author` text NOT NULL,
	`type` text,
	`link` text,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `news` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`title` text NOT NULL,
	`summary` text,
	`source` text,
	`link` text,
	`date` text
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`title` text NOT NULL,
	`firm` text NOT NULL,
	`location` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`date` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `universities` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`description` text,
	`city` text,
	`province` text,
	`type` text DEFAULT 'Pública',
	`program_url` text
);
--> statement-breakpoint
CREATE TABLE `study_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`university_id` integer,
	`subject_id` integer,
	`year` integer,
	`semester` integer,
	`category` text,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`university_id`) REFERENCES `universities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chairs` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`university_id` integer,
	`subject_id` integer,
	`name` text NOT NULL,
	`professor` text,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`university_id`) REFERENCES `universities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `student_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`title` text NOT NULL,
	`author_id` integer,
	`subject_id` integer,
	`university_id` integer,
	`chair_id` integer,
	`content` text,
	`views` integer DEFAULT 0,
	`status` text DEFAULT 'published',
	`date` text NOT NULL,
	`file_url` text,
	`year` integer,
	FOREIGN KEY (`chair_id`) REFERENCES `chairs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`university_id`) REFERENCES `universities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`sender_id` integer,
	`receiver_id` integer,
	`content` text NOT NULL,
	`timestamp` text NOT NULL,
	FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chat_rooms` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `room_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`room_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`content` text NOT NULL,
	`timestamp` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`room_id`) REFERENCES `chat_rooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `procedural_acts` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`jurisdiction` text NOT NULL,
	`fuero` text NOT NULL,
	`name` text NOT NULL,
	`days` integer NOT NULL,
	`type` text NOT NULL,
	`normative_base` text
);
--> statement-breakpoint
CREATE TABLE `holiday_calendar` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`date` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`author_id` integer,
	`status` text DEFAULT 'pending',
	`date` text NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `legal_movies` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`title` text NOT NULL,
	`year` integer,
	`country` text,
	`synopsis` text,
	`legal_themes` text,
	`link` text
);
--> statement-breakpoint
CREATE TABLE `private_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`user_id` integer NOT NULL,
	`url` text NOT NULL,
	`page_title` text NOT NULL,
	`content` text NOT NULL,
	`date` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `text_annotations` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`user_id` integer NOT NULL,
	`brief_id` integer NOT NULL,
	`selected_text` text NOT NULL,
	`note` text,
	`color` text DEFAULT 'bg-yellow-200',
	`created_at` text NOT NULL,
	FOREIGN KEY (`brief_id`) REFERENCES `case_briefs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `resource_votes` (
	`user_id` integer NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` integer NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `resource_type`, `resource_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `resource_views` (
	`user_id` integer NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` integer NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `resource_type`, `resource_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `saved_for_later` (
	`user_id` integer NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` integer NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `resource_type`, `resource_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_resource_notes` (
	`user_id` integer NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` integer NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `resource_type`, `resource_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `normas` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`tipo` text,
	`numero` text,
	`anio` integer,
	`titulo` text,
	`texto` text,
	`organismo` text,
	`fecha_publicacion` text,
	`estado` text DEFAULT 'Vigente',
	`fuente_url` text
);
--> statement-breakpoint
CREATE TABLE `relaciones_normativas` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`origen_id` integer,
	`destino_id` integer,
	`tipo_relacion` text,
	FOREIGN KEY (`destino_id`) REFERENCES `normas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`origen_id`) REFERENCES `normas`(`id`) ON UPDATE no action ON DELETE no action
);

*/