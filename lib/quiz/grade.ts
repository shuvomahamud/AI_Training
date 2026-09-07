import type { QuizPayload } from "./schema";

export type AnswerMap = Record<string, string[]>;

export type QuestionResult = {
  questionId: string;
  correct: boolean;
  explanation: string;
  safetyCritical: boolean;
};

export type GradeResult = {
  score: number;
  maxScore: number;
  passed: boolean;
  safetyCriticalPassed: boolean;
  perQuestion: QuestionResult[];
};

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((value, index) => value === right[index]);
}

export function gradeQuiz(quiz: QuizPayload, answers: AnswerMap): GradeResult {
  const perQuestion: QuestionResult[] = quiz.questions.map((question) => {
    const given = answers[question.id] ?? [];
    const isCorrect = sameSet(given, question.correct);
    return {
      questionId: question.id,
      correct: isCorrect,
      explanation: question.explanation,
      safetyCritical: question.safetyCritical,
    };
  });

  const score = perQuestion.filter((result) => result.correct).length;
  const safetyCritical = perQuestion.filter((result) => result.safetyCritical);

  return {
    score,
    maxScore: quiz.questions.length,
    passed: score >= quiz.passingScore,
    safetyCriticalPassed:
      safetyCritical.length === 0 || safetyCritical.every((result) => result.correct),
    perQuestion,
  };
}
