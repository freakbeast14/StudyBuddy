import { relations } from "drizzle-orm";
import { integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { vector } from "pgvector/drizzle-orm";

export const documentStatus = pgEnum("document_status", ["pending", "processing", "ready", "failed"]);
export const jobStatus = pgEnum("job_status", ["queued", "running", "completed", "failed"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  originalFilename: text("original_filename"),
  storagePath: text("storage_path").notNull(),
  status: documentStatus("status").default("pending").notNull(),
  errorMessage: text("error_message"),
  pageCount: integer("page_count"),
  chunkCount: integer("chunk_count"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const chunks = pgTable("chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "cascade" }).notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  pageNumber: integer("page_number").notNull(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
  tokenCount: integer("token_count"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const concepts = pgTable("concepts", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "cascade" }).notNull(),
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "set null" }),
  moduleTitle: text("module_title"),
  lessonTitle: text("lesson_title"),
  title: text("title").notNull(),
  summary: text("summary"),
  citationIds: jsonb("citation_ids"),
  pageRange: text("page_range"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const cards = pgTable("cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  conceptId: uuid("concept_id").references(() => concepts.id, { onDelete: "cascade" }).notNull(),
  prompt: text("prompt").notNull(),
  answer: text("answer").notNull(),
  citations: jsonb("citations"),
  isScaffold: integer("is_scaffold").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const conceptExplanations = pgTable(
  "concept_explanations",
  {
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    conceptId: uuid("concept_id").references(() => concepts.id, { onDelete: "cascade" }).notNull(),
    explanation: jsonb("explanation"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.conceptId] }),
  })
);

export const quizzes = pgTable("quizzes", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "cascade" }).notNull(),
  moduleTitle: text("module_title"),
  lessonTitle: text("lesson_title").notNull(),
  questions: jsonb("questions"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const courseShares = pgTable("course_shares", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const srsState = pgTable(
  "srs_state",
  {
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    cardId: uuid("card_id").references(() => cards.id, { onDelete: "cascade" }).notNull(),
    easeFactor: integer("ease_factor").default(2500).notNull(),
    intervalDays: integer("interval_days").default(0).notNull(),
    repetitions: integer("repetitions").default(0).notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).defaultNow().notNull(),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.cardId] }),
  })
);

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  cardId: uuid("card_id").references(() => cards.id, { onDelete: "cascade" }).notNull(),
  rating: text("rating").notNull(),
  scheduledIntervalDays: integer("scheduled_interval_days"),
  actualIntervalDays: integer("actual_interval_days"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  payload: jsonb("payload"),
  status: jobStatus("status").default("queued").notNull(),
  runAt: timestamp("run_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  failedReason: text("failed_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const courseRelations = relations(courses, ({ many, one }) => ({
  owner: one(users, {
    fields: [courses.ownerId],
    references: [users.id],
  }),
  documents: many(documents),
  concepts: many(concepts),
}));

export const documentRelations = relations(documents, ({ many, one }) => ({
  course: one(courses, {
    fields: [documents.courseId],
    references: [courses.id],
  }),
  chunks: many(chunks),
  concepts: many(concepts),
}));

export const chunkRelations = relations(chunks, ({ one }) => ({
  document: one(documents, {
    fields: [chunks.documentId],
    references: [documents.id],
  }),
}));

export const conceptRelations = relations(concepts, ({ one, many }) => ({
  course: one(courses, {
    fields: [concepts.courseId],
    references: [courses.id],
  }),
  document: one(documents, {
    fields: [concepts.documentId],
    references: [documents.id],
  }),
  cards: many(cards),
}));

export const conceptExplanationRelations = relations(conceptExplanations, ({ one }) => ({
  user: one(users, {
    fields: [conceptExplanations.userId],
    references: [users.id],
  }),
  concept: one(concepts, {
    fields: [conceptExplanations.conceptId],
    references: [concepts.id],
  }),
}));

export const quizRelations = relations(quizzes, ({ one }) => ({
  course: one(courses, {
    fields: [quizzes.courseId],
    references: [courses.id],
  }),
}));

export const courseShareRelations = relations(courseShares, ({ one }) => ({
  course: one(courses, {
    fields: [courseShares.courseId],
    references: [courses.id],
  }),
}));

export const cardRelations = relations(cards, ({ one, many }) => ({
  concept: one(concepts, {
    fields: [cards.conceptId],
    references: [concepts.id],
  }),
  reviews: many(reviews),
  srsState: many(srsState),
}));

export const reviewRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  card: one(cards, {
    fields: [reviews.cardId],
    references: [cards.id],
  }),
}));

export const srsRelations = relations(srsState, ({ one }) => ({
  user: one(users, {
    fields: [srsState.userId],
    references: [users.id],
  }),
  card: one(cards, {
    fields: [srsState.cardId],
    references: [cards.id],
  }),
}));
