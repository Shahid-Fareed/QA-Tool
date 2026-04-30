export type Priority = 'High' | 'Medium' | 'Low';
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface TestCase {
  id: string;
  title: string;
  description: string;
  preconditions: string[];
  steps: string[];
  expectedResult: string;
  priority: Priority;
  category: string;
}

export interface UseCase {
  id: string;
  title: string;
  actors: string[];
  description: string;
  mainFlow: string[];
  alternativeFlows?: {
    condition: string;
    flow: string[];
  }[];
  postconditions: string[];
}

export interface BugReport {
  id: string;
  severity: Severity;
  description: string;
  potentialImpact: string;
}

export interface QAResult {
  testCases: TestCase[];
  useCases: UseCase[];
  bugReports: BugReport[];
  summary: string;
  coverage: {
    functional: number;
    security: number;
    performance: number;
    edgeCases: number;
  };
}

export interface ChunkMetadata {
  index: number;
  total: number;
  fileName: string;
}
export interface ChatAttachment {
  name: string;
  type: string;
  url: string; // base64 or URL
}

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "ai";
  content: string;
  attachments?: ChatAttachment[];
  customRules?: string;
}

export interface CodeAuditSession {
  _id?: string;
  projectId?: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string | Date;
  updatedAt: string | Date;
}
