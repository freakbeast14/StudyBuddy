export const JOBS = {
  PROCESS_DOCUMENT: "PROCESS_DOCUMENT",
} as const;

export type JobName = (typeof JOBS)[keyof typeof JOBS];

export interface ProcessDocumentPayload {
  documentId: string;
  courseId?: string;
  path?: string;
}
