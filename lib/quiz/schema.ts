import { z } from "zod";

const Question = z.object({
  id: z.string().min(1),
  type: z.enum(["single", "multiple", "truefalse"]),
  prompt: z.string().min(1),
  options: z
    .array(z.object({ id: z.string().min(1), text: z.string().min(1) }))
    .min(2),
  correct: z.array(z.string()).min(1),
  explanation: z.string().min(1),
  safetyCritical: z.boolean().default(false),
});

export const QuizSchema = z
  .object({
    title: z.string().min(1),
    passingScore: z.number().int().min(0),
    questions: z.array(Question).min(1),
  })
  .superRefine((quiz, ctx) => {
    const questionIds = quiz.questions.map((q) => q.id);
    if (new Set(questionIds).size !== questionIds.length) {
      ctx.addIssue({
        code: "custom",
        message: "Question ids must be unique within a quiz",
        path: ["questions"],
      });
    }

    if (quiz.passingScore > quiz.questions.length) {
      ctx.addIssue({
        code: "custom",
        message: "passingScore cannot be greater than the number of questions",
        path: ["passingScore"],
      });
    }

    quiz.questions.forEach((question, index) => {
      const optionIds = question.options.map((option) => option.id);
      if (new Set(optionIds).size !== optionIds.length) {
        ctx.addIssue({
          code: "custom",
          message: "Option ids must be unique within a question",
          path: ["questions", index, "options"],
        });
      }

      for (const correctId of question.correct) {
        if (!optionIds.includes(correctId)) {
          ctx.addIssue({
            code: "custom",
            message: `correct id "${correctId}" does not match an option`,
            path: ["questions", index, "correct"],
          });
        }
      }

      if (
        (question.type === "single" || question.type === "truefalse") &&
        question.correct.length !== 1
      ) {
        ctx.addIssue({
          code: "custom",
          message: `${question.type} questions require exactly one correct answer`,
          path: ["questions", index, "correct"],
        });
      }
    });
  });

export type QuizPayload = z.infer<typeof QuizSchema>;
export type QuizQuestion = QuizPayload["questions"][number];

export function formatQuizIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join(".") : "json";
    return `${path}: ${issue.message}`;
  });
}
