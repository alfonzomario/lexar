import { sqliteTable, AnySQLiteColumn, integer, text, numeric, foreignKey, primaryKey } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const users = sqliteTable("users", {
	id: integer().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	email: text().notNull(),
	tier: text().default("free"),
	totalViews: integer("total_views").default(0),
	profileRole: text("profile_role").default("Estudiante"),
	totalVotesReceived: integer("total_votes_received").default(0),
	docViewsUsed: integer("doc_views_used").default(0),
	docViewsPeriod: text("doc_views_period"),
	password: text(),
	university: text(),
	lawFirm: text("law_firm"),
	courtSpecialty: text("court_specialty"),
	dni: text(),
	telefono: text(),
});

export const subjects = sqliteTable("subjects", {
	id: integer().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	description: text(),
	icon: text(),
});

export const caseBriefs = sqliteTable("case_briefs", {
	id: integer().primaryKey({ autoIncrement: true }),
	title: text().notNull(),
	court: text(),
	year: integer(),
	parties: text(),
	facts: text(),
	issue: text(),
	rule: text(),
	reasoning: text(),
	holding: text(),
	dissents: text(),
	relevance: text(),
	keywords: text(),
	timeline: text(),
	citations: text(),
	fullText: text("full_text"),
	isDemo: numeric("is_demo").default("1"),
	subjectId: integer("subject_id"),
});

export const caseBriefSubjects = sqliteTable("case_brief_subjects", {
	caseBriefId: integer("case_brief_id").references(() => caseBriefs.id),
	subjectId: integer("subject_id").references(() => subjects.id),
},
(table) => [
	primaryKey({ columns: [table.caseBriefId, table.subjectId], name: "case_brief_subjects_case_brief_id_subject_id_pk"})
]);

export const outlines = sqliteTable("outlines", {
	id: integer().primaryKey({ autoIncrement: true }),
	subjectId: integer("subject_id").references(() => subjects.id),
	title: text().notNull(),
	content: text(),
	isDemo: numeric("is_demo").default("1"),
});

export const quizzes = sqliteTable("quizzes", {
	id: integer().primaryKey({ autoIncrement: true }),
	subjectId: integer("subject_id").references(() => subjects.id),
	title: text().notNull(),
});

export const quizQuestions = sqliteTable("quiz_questions", {
	id: integer().primaryKey({ autoIncrement: true }),
	quizId: integer("quiz_id").references(() => quizzes.id),
	question: text().notNull(),
	optionA: text("option_a").notNull(),
	optionB: text("option_b").notNull(),
	optionC: text("option_c").notNull(),
	optionD: text("option_d").notNull(),
	correctOption: text("correct_option").notNull(),
	explanation: text(),
});

export const flashcards = sqliteTable("flashcards", {
	id: integer().primaryKey({ autoIncrement: true }),
	subjectId: integer("subject_id").references(() => subjects.id),
	front: text().notNull(),
	back: text().notNull(),
	source: text().default("manual"),
});

export const exams = sqliteTable("exams", {
	id: integer().primaryKey({ autoIncrement: true }),
	subjectId: integer("subject_id").notNull().references(() => subjects.id),
	title: text().notNull(),
	description: text(),
	fileUrl: text("file_url"),
	uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
	status: text().default("pending"),
	approvedBy: integer("approved_by").references(() => users.id),
	createdAt: text("created_at").notNull(),
	views: integer().default(0),
	year: integer(),
	universityId: integer("university_id").references(() => universities.id),
});

export const latinisms = sqliteTable("latinisms", {
	id: integer().primaryKey({ autoIncrement: true }),
	term: text().notNull(),
	translation: text().notNull(),
	meaning: text(),
	example: text(),
});

export const bibliographies = sqliteTable("bibliographies", {
	id: integer().primaryKey({ autoIncrement: true }),
	subjectId: integer("subject_id").references(() => subjects.id),
	title: text().notNull(),
	author: text().notNull(),
	type: text(),
	link: text(),
});

export const news = sqliteTable("news", {
	id: integer().primaryKey({ autoIncrement: true }),
	title: text().notNull(),
	summary: text(),
	source: text(),
	link: text(),
	date: text(),
});

export const jobs = sqliteTable("jobs", {
	id: integer().primaryKey({ autoIncrement: true }),
	title: text().notNull(),
	firm: text().notNull(),
	location: text().notNull(),
	type: text().notNull(),
	description: text(),
	date: text().notNull(),
	assistance: text().default("Presencial"),
	authorId: integer("author_id").references(() => users.id),
});

export const universities = sqliteTable("universities", {
	id: integer().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	description: text(),
	city: text(),
	province: text(),
	type: text().default("Pública"),
	programUrl: text("program_url"),
});

export const studyPlans = sqliteTable("study_plans", {
	id: integer().primaryKey({ autoIncrement: true }),
	universityId: integer("university_id").references(() => universities.id),
	subjectId: integer("subject_id").references(() => subjects.id),
	year: integer(),
	semester: integer(),
	category: text(),
});

export const chairs = sqliteTable("chairs", {
	id: integer().primaryKey({ autoIncrement: true }),
	universityId: integer("university_id").references(() => universities.id),
	subjectId: integer("subject_id").references(() => subjects.id),
	name: text().notNull(),
	professor: text(),
});

export const studentNotes = sqliteTable("student_notes", {
	id: integer().primaryKey({ autoIncrement: true }),
	title: text().notNull(),
	authorId: integer("author_id").references(() => users.id),
	subjectId: integer("subject_id").references(() => subjects.id),
	universityId: integer("university_id").references(() => universities.id),
	chairId: integer("chair_id").references(() => chairs.id),
	content: text(),
	views: integer().default(0),
	status: text().default("published"),
	date: text().notNull(),
	fileUrl: text("file_url"),
	year: text(),
	chairName: text("chair_name"),
	professor: text(),
});

export const messages = sqliteTable("messages", {
	id: integer().primaryKey({ autoIncrement: true }),
	senderId: integer("sender_id").references(() => users.id),
	receiverId: integer("receiver_id").references(() => users.id),
	content: text().notNull(),
	timestamp: text().notNull(),
	isRead: integer("is_read").default(0),
});

export const chatRooms = sqliteTable("chat_rooms", {
	id: integer().primaryKey({ autoIncrement: true }),
	slug: text().notNull(),
	name: text().notNull(),
	category: text().notNull(),
});

export const roomMessages = sqliteTable("room_messages", {
	id: integer().primaryKey({ autoIncrement: true }),
	roomId: integer("room_id").notNull().references(() => chatRooms.id),
	userId: integer("user_id").notNull().references(() => users.id),
	content: text().notNull(),
	timestamp: text().notNull(),
});

export const proceduralActs = sqliteTable("procedural_acts", {
	id: integer().primaryKey({ autoIncrement: true }),
	jurisdiction: text().notNull(),
	fuero: text().notNull(),
	name: text().notNull(),
	days: integer().notNull(),
	type: text().notNull(),
	normativeBase: text("normative_base"),
});

export const holidayCalendar = sqliteTable("holiday_calendar", {
	id: integer().primaryKey({ autoIncrement: true }),
	date: text().notNull(),
	description: text(),
});

export const articles = sqliteTable("articles", {
	id: integer().primaryKey({ autoIncrement: true }),
	title: text().notNull(),
	content: text().notNull(),
	authorId: integer("author_id").references(() => users.id),
	status: text().default("pending"),
	date: text().notNull(),
});

export const legalMovies = sqliteTable("legal_movies", {
	id: integer().primaryKey({ autoIncrement: true }),
	title: text().notNull(),
	year: integer(),
	country: text(),
	synopsis: text(),
	legalThemes: text("legal_themes"),
	link: text(),
	posterUrl: text("poster_url"),
	director: text(),
	trailerLink: text("trailer_link"),
});

export const privateNotes = sqliteTable("private_notes", {
	id: integer().primaryKey({ autoIncrement: true }),
	userId: integer("user_id").notNull().references(() => users.id),
	url: text().notNull(),
	pageTitle: text("page_title").notNull(),
	content: text().notNull(),
	date: text().notNull(),
});

export const textAnnotations = sqliteTable("text_annotations", {
	id: integer().primaryKey({ autoIncrement: true }),
	userId: integer("user_id").notNull().references(() => users.id),
	briefId: integer("brief_id").references(() => caseBriefs.id),
	normaId: integer("norma_id").references(() => normas.id),
	selectedText: text("selected_text").notNull(),
	note: text(),
	color: text().default("bg-yellow-200"),
	type: text("annotation_type").default("highlight"),
	startIndex: integer("start_index"),
	endIndex: integer("end_index"),
	createdAt: text("created_at").notNull(),
});

export const resourceVotes = sqliteTable("resource_votes", {
	userId: integer("user_id").notNull().references(() => users.id),
	resourceType: text("resource_type").notNull(),
	resourceId: integer("resource_id").notNull(),
	vote: integer().default(1),
	createdAt: text("created_at").notNull(),
},
(table) => [
	primaryKey({ columns: [table.userId, table.resourceType, table.resourceId], name: "resource_votes_user_id_resource_type_resource_id_pk"})
]);

export const resourceViews = sqliteTable("resource_views", {
	userId: integer("user_id").notNull().references(() => users.id),
	resourceType: text("resource_type").notNull(),
	resourceId: integer("resource_id").notNull(),
	createdAt: text("created_at").notNull(),
},
(table) => [
	primaryKey({ columns: [table.userId, table.resourceType, table.resourceId], name: "resource_views_user_id_resource_type_resource_id_pk"})
]);

export const savedForLater = sqliteTable("saved_for_later", {
	userId: integer("user_id").notNull().references(() => users.id),
	resourceType: text("resource_type").notNull(),
	resourceId: integer("resource_id").notNull(),
	createdAt: text("created_at").notNull(),
},
(table) => [
	primaryKey({ columns: [table.userId, table.resourceType, table.resourceId], name: "saved_for_later_user_id_resource_type_resource_id_pk"})
]);

export const userResourceNotes = sqliteTable("user_resource_notes", {
	userId: integer("user_id").notNull().references(() => users.id),
	resourceType: text("resource_type").notNull(),
	resourceId: integer("resource_id").notNull(),
	content: text().notNull(),
	createdAt: text("created_at").notNull(),
},
(table) => [
	primaryKey({ columns: [table.userId, table.resourceType, table.resourceId], name: "user_resource_notes_user_id_resource_type_resource_id_pk"})
]);

export const normas = sqliteTable("normas", {
	id: integer().primaryKey({ autoIncrement: true }),
	tipo: text(),
	numero: text(),
	anio: integer(),
	titulo: text(),
	texto: text(),
	organismo: text(),
	fechaPublicacion: text("fecha_publicacion"),
	estado: text().default("Vigente"),
	fuenteUrl: text("fuente_url"),
	keywords: text(),
	infolegLink: text("infoleg_link"),
});

export const relacionesNormativas = sqliteTable("relaciones_normativas", {
	id: integer().primaryKey({ autoIncrement: true }),
	origenId: integer("origen_id").references(() => normas.id),
	destinoId: integer("destino_id").references(() => normas.id),
	tipoRelacion: text("tipo_relacion"),
});

export const jobApplications = sqliteTable("job_applications", {
	id: integer().primaryKey({ autoIncrement: true }),
	jobId: integer("job_id").notNull().references(() => jobs.id),
	userId: integer("user_id").notNull().references(() => users.id),
	coverLetter: text("cover_letter").notNull(),
	cvType: text("cv_type"),
	cvLink: text("cv_link"),
	cvFileName: text("cv_file_name"),
	cvFileData: text("cv_file_data"),
	createdAt: text("created_at").notNull(),
});

export const forumTopics = sqliteTable("forum_topics", {
	id: integer().primaryKey({ autoIncrement: true }),
	title: text().notNull(),
	content: text(),
	authorId: integer("author_id").notNull().references(() => users.id),
	subjectId: integer("subject_id").references(() => subjects.id),
	category: text().default("general"),
	createdAt: text("created_at").notNull(),
	updatedAt: text("updated_at").notNull(),
	views: integer().default(0),
	pinned: integer().default(0),
});

export const forumReplies = sqliteTable("forum_replies", {
	id: integer().primaryKey({ autoIncrement: true }),
	topicId: integer("topic_id").notNull().references(() => forumTopics.id),
	authorId: integer("author_id").notNull().references(() => users.id),
	content: text().notNull(),
	createdAt: text("created_at").notNull(),
});

export const comments = sqliteTable("comments", {
	id: integer().primaryKey({ autoIncrement: true }),
	userId: integer("user_id").notNull().references(() => users.id),
	resourceType: text("resource_type").notNull(),
	resourceId: integer("resource_id").notNull(),
	content: text().notNull(),
	createdAt: text("created_at").notNull(),
});

export const savedLatinisms = sqliteTable("saved_latinisms", {
	userId: integer("user_id").notNull().references(() => users.id),
	latinismId: integer("latinism_id").notNull().references(() => latinisms.id),
	createdAt: text("created_at").notNull(),
},
(table) => [
	primaryKey({ columns: [table.userId, table.latinismId], name: "saved_latinisms_user_id_latinism_id_pk"})
]);


