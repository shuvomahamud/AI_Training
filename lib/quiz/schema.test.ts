import { expect, test } from "bun:test";
import { formatQuizIssues, QuizSchema } from "./schema";

const valid = {
  title: "Sample",
  passingScore: 1,
  questions: [
    {
      id: "q1",
      type: "single" as const,
      prompt: "Pick one",
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
      correct: ["a"],
      explanation: "Because A",
      safetyCritical: true,
    },
  ],
};

test("accepts a valid quiz", () => {
  expect(QuizSchema.parse(valid).title).toBe("Sample");
});

test("rejects duplicate question ids", () => {
  const result = QuizSchema.safeParse({
    ...valid,
    questions: [valid.questions[0], { ...valid.questions[0] }],
  });
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(formatQuizIssues(result.error).join(" ")).toContain("Question ids");
  }
});

test("rejects a correct id that is not an option", () => {
  const result = QuizSchema.safeParse({
    ...valid,
    questions: [{ ...valid.questions[0], correct: ["z"] }],
  });
  expect(result.success).toBe(false);
});

test("rejects single questions with two correct answers", () => {
  const result = QuizSchema.safeParse({
    ...valid,
    questions: [{ ...valid.questions[0], correct: ["a", "b"] }],
  });
  expect(result.success).toBe(false);
});

test("rejects a passing score above the question count", () => {
  const result = QuizSchema.safeParse({ ...valid, passingScore: 9 });
  expect(result.success).toBe(false);
});
