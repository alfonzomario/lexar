import { relations } from "drizzle-orm/relations";
import { subjects, caseBriefSubjects, caseBriefs, outlines, quizzes, quizQuestions, flashcards, users, exams, universities, bibliographies, studyPlans, chairs, studentNotes, messages, roomMessages, chatRooms, articles, privateNotes, textAnnotations, resourceVotes, resourceViews, savedForLater, userResourceNotes, normas, relacionesNormativas } from "./schema";

export const caseBriefSubjectsRelations = relations(caseBriefSubjects, ({one}) => ({
	subject: one(subjects, {
		fields: [caseBriefSubjects.subjectId],
		references: [subjects.id]
	}),
	caseBrief: one(caseBriefs, {
		fields: [caseBriefSubjects.caseBriefId],
		references: [caseBriefs.id]
	}),
}));

export const subjectsRelations = relations(subjects, ({many}) => ({
	caseBriefSubjects: many(caseBriefSubjects),
	outlines: many(outlines),
	quizzes: many(quizzes),
	flashcards: many(flashcards),
	exams: many(exams),
	bibliographies: many(bibliographies),
	studyPlans: many(studyPlans),
	chairs: many(chairs),
	studentNotes: many(studentNotes),
}));

export const caseBriefsRelations = relations(caseBriefs, ({many}) => ({
	caseBriefSubjects: many(caseBriefSubjects),
	textAnnotations: many(textAnnotations),
}));

export const outlinesRelations = relations(outlines, ({one}) => ({
	subject: one(subjects, {
		fields: [outlines.subjectId],
		references: [subjects.id]
	}),
}));

export const quizzesRelations = relations(quizzes, ({one, many}) => ({
	subject: one(subjects, {
		fields: [quizzes.subjectId],
		references: [subjects.id]
	}),
	quizQuestions: many(quizQuestions),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({one}) => ({
	quiz: one(quizzes, {
		fields: [quizQuestions.quizId],
		references: [quizzes.id]
	}),
}));

export const flashcardsRelations = relations(flashcards, ({one}) => ({
	subject: one(subjects, {
		fields: [flashcards.subjectId],
		references: [subjects.id]
	}),
}));

export const examsRelations = relations(exams, ({one}) => ({
	user_approvedBy: one(users, {
		fields: [exams.approvedBy],
		references: [users.id],
		relationName: "exams_approvedBy_users_id"
	}),
	user_uploadedBy: one(users, {
		fields: [exams.uploadedBy],
		references: [users.id],
		relationName: "exams_uploadedBy_users_id"
	}),
	subject: one(subjects, {
		fields: [exams.subjectId],
		references: [subjects.id]
	}),
	university: one(universities, {
		fields: [exams.universityId],
		references: [universities.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	exams_approvedBy: many(exams, {
		relationName: "exams_approvedBy_users_id"
	}),
	exams_uploadedBy: many(exams, {
		relationName: "exams_uploadedBy_users_id"
	}),
	studentNotes: many(studentNotes),
	messages_receiverId: many(messages, {
		relationName: "messages_receiverId_users_id"
	}),
	messages_senderId: many(messages, {
		relationName: "messages_senderId_users_id"
	}),
	roomMessages: many(roomMessages),
	articles: many(articles),
	privateNotes: many(privateNotes),
	textAnnotations: many(textAnnotations),
	resourceVotes: many(resourceVotes),
	resourceViews: many(resourceViews),
	savedForLaters: many(savedForLater),
	userResourceNotes: many(userResourceNotes),
}));

export const universitiesRelations = relations(universities, ({many}) => ({
	exams: many(exams),
	studyPlans: many(studyPlans),
	chairs: many(chairs),
	studentNotes: many(studentNotes),
}));

export const bibliographiesRelations = relations(bibliographies, ({one}) => ({
	subject: one(subjects, {
		fields: [bibliographies.subjectId],
		references: [subjects.id]
	}),
}));

export const studyPlansRelations = relations(studyPlans, ({one}) => ({
	subject: one(subjects, {
		fields: [studyPlans.subjectId],
		references: [subjects.id]
	}),
	university: one(universities, {
		fields: [studyPlans.universityId],
		references: [universities.id]
	}),
}));

export const chairsRelations = relations(chairs, ({one, many}) => ({
	subject: one(subjects, {
		fields: [chairs.subjectId],
		references: [subjects.id]
	}),
	university: one(universities, {
		fields: [chairs.universityId],
		references: [universities.id]
	}),
	studentNotes: many(studentNotes),
}));

export const studentNotesRelations = relations(studentNotes, ({one}) => ({
	chair: one(chairs, {
		fields: [studentNotes.chairId],
		references: [chairs.id]
	}),
	university: one(universities, {
		fields: [studentNotes.universityId],
		references: [universities.id]
	}),
	subject: one(subjects, {
		fields: [studentNotes.subjectId],
		references: [subjects.id]
	}),
	user: one(users, {
		fields: [studentNotes.authorId],
		references: [users.id]
	}),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	user_receiverId: one(users, {
		fields: [messages.receiverId],
		references: [users.id],
		relationName: "messages_receiverId_users_id"
	}),
	user_senderId: one(users, {
		fields: [messages.senderId],
		references: [users.id],
		relationName: "messages_senderId_users_id"
	}),
}));

export const roomMessagesRelations = relations(roomMessages, ({one}) => ({
	user: one(users, {
		fields: [roomMessages.userId],
		references: [users.id]
	}),
	chatRoom: one(chatRooms, {
		fields: [roomMessages.roomId],
		references: [chatRooms.id]
	}),
}));

export const chatRoomsRelations = relations(chatRooms, ({many}) => ({
	roomMessages: many(roomMessages),
}));

export const articlesRelations = relations(articles, ({one}) => ({
	user: one(users, {
		fields: [articles.authorId],
		references: [users.id]
	}),
}));

export const privateNotesRelations = relations(privateNotes, ({one}) => ({
	user: one(users, {
		fields: [privateNotes.userId],
		references: [users.id]
	}),
}));

export const textAnnotationsRelations = relations(textAnnotations, ({one}) => ({
	caseBrief: one(caseBriefs, {
		fields: [textAnnotations.briefId],
		references: [caseBriefs.id]
	}),
	user: one(users, {
		fields: [textAnnotations.userId],
		references: [users.id]
	}),
}));

export const resourceVotesRelations = relations(resourceVotes, ({one}) => ({
	user: one(users, {
		fields: [resourceVotes.userId],
		references: [users.id]
	}),
}));

export const resourceViewsRelations = relations(resourceViews, ({one}) => ({
	user: one(users, {
		fields: [resourceViews.userId],
		references: [users.id]
	}),
}));

export const savedForLaterRelations = relations(savedForLater, ({one}) => ({
	user: one(users, {
		fields: [savedForLater.userId],
		references: [users.id]
	}),
}));

export const userResourceNotesRelations = relations(userResourceNotes, ({one}) => ({
	user: one(users, {
		fields: [userResourceNotes.userId],
		references: [users.id]
	}),
}));

export const relacionesNormativasRelations = relations(relacionesNormativas, ({one}) => ({
	norma_destinoId: one(normas, {
		fields: [relacionesNormativas.destinoId],
		references: [normas.id],
		relationName: "relacionesNormativas_destinoId_normas_id"
	}),
	norma_origenId: one(normas, {
		fields: [relacionesNormativas.origenId],
		references: [normas.id],
		relationName: "relacionesNormativas_origenId_normas_id"
	}),
}));

export const normasRelations = relations(normas, ({many}) => ({
	relacionesNormativas_destinoId: many(relacionesNormativas, {
		relationName: "relacionesNormativas_destinoId_normas_id"
	}),
	relacionesNormativas_origenId: many(relacionesNormativas, {
		relationName: "relacionesNormativas_origenId_normas_id"
	}),
}));