import { expect, test } from "bun:test";
import { gradeQuiz } from "./grade";
import { QuizSchema } from "./schema";

const quiz = QuizSchema.parse({
  title: "Sample",
  passingScore: 2,
  questions: [
    {
      id: "q1",
      type: "single",
      prompt: "One",
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
      correct: ["a"],
      explanation: "A",
      safetyCritical: true,
    },
    {
      id: "q2",
      type: "multiple",
      prompt: "Two",
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
        { id: "c", text: "C" },
      ],
      correct: ["a", "c"],
      explanation: "A and C",
      safetyCritical: false,
    },
  ],
});

test("scores an exact multiple match and a single match", () => {
  const result = gradeQuiz(quiz, { q1: ["a"], q2: ["c", "a"] });
  expect(result.score).toBe(2);
  expect(result.passed).toBe(true);
  expect(result.safetyCriticalPassed).toBe(true);
});

test("does not score a partial multiple answer", () => {
  const result = gradeQuiz(quiz, { q1: ["a"], q2: ["a"] });
  expect(result.score).toBe(1);
  expect(result.passed).toBe(false);
});

test("can pass the score bar while missing a safety-critical item", () => {
  const result = gradeQuiz(quiz, { q1: ["b"], q2: ["a", "c"] });
  expect(result.score).toBe(1);
  expect(result.passed).toBe(false);
  expect(result.safetyCriticalPassed).toBe(false);
});
