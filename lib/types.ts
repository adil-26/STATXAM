export type QuestionSource =
  | 'google_drive_pdf_extracted'
  | 'groq_board_trend_synthesizer'
  | 'gemini_board_trend_synthesizer';

export type ReviewStatus = 'pending' | 'accepted' | 'rejected';

export type LanguageMedium =
  | 'punjabi'
  | 'english'
  | 'hindi'
  | 'tamil'
  | 'bengali'
  | 'telugu'
  | 'marathi'
  | 'gujarati';

export interface QuestionOption {
  id: string; // 'A', 'B', 'C', 'D'
  text: string;
}

export interface Question {
  id: string;
  chapterId?: string;
  subject: 'physics' | 'chemistry' | 'mathematics' | 'biology' | 'punjabi' | 'science' | 'social_science' | 'hindi' | 'english' | string;
  topic: string;
  language?: LanguageMedium;
  stem: string;
  diagramUrl?: string;
  options: QuestionOption[];
  correctOption?: string; // Stored server-side, revealed after grading
  solution?: string;
  source: QuestionSource;
  reviewStatus: ReviewStatus;
  examCode: string; // e.g. "PSEB-X-MTH-2024", "CBSE-XII-PHY-2023"
  year: number;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  negativeMarks: number;
}

export interface Chapter {
  id: string;
  board: string;
  subjectCode: string;
  subjectName: string;
  unitNumber: number;
  nameEn: string;
  namePa: string;
  nameHi: string;
  weightageMarks: number;
  totalQuestionsBank?: number;
}

export interface ExamPaper {
  id: string;
  title: string;
  year: number;
  exam: string;
  subject: string;
  subjectCode?: string;
  totalQuestions: number;
  durationMinutes: number;
  source: QuestionSource;
  description: string;
  drivePdfUrl?: string;
  driveRubricUrl?: string;
  offlineCached?: boolean;
}

export interface PdfIngestJob {
  id: string;
  driveUrl: string;
  documentTitle: string;
  board: string;
  subject: string;
  year: number;
  language: LanguageMedium;
  chapterId?: string;
  ocrStatus: 'pending' | 'processing' | 'completed' | 'failed';
  groqStatus: 'pending' | 'processing' | 'completed' | 'failed';
  generatedCount: number;
  errorMessage?: string;
  createdAt: string;
}

export interface SubmissionAnswer {
  questionId: string;
  selectedOption: string; // 'A' | 'B' | 'C' | 'D'
  timeSpentSeconds: number;
}

export interface GradedScorecard {
  testId: string;
  testTitle: string;
  score: number;
  totalMarks: number;
  accuracy: number;
  percentile: number;
  rankEstimate?: string;
  timeSpentMinutes: number;
  submittedAt: string;
  answers: {
    questionId: string;
    selected: string;
    correct: string;
    isCorrect: boolean;
  }[];
}

export interface PilotProfile {
  id: string;
  fullName: string;
  mobile: string;
  email?: string;
  language?: LanguageMedium;
  targetExam: string;
  targetInstitution: string;
  estimatedRank: number;
  accuracy: number;
  streakDays: number;
  questionsSolved: number;
  coins?: number;
  telegramLinked: boolean;
  telegramHandle?: string;
  accepted_terms_at?: string;
  created_at?: string;
}

export interface TopicProficiency {
  name: string;
  proficiency: number; // 0 - 100
  questionsCount: number;
  status: 'Mastered' | 'Proficient' | 'Target Review' | 'Critical Gap';
  callout?: string;
}
