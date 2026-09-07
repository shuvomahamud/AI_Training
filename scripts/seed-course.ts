import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { courses, quizzes, quizVersions, sessions } from "../lib/db/schema";
import type { QuizPayload } from "../lib/quiz/schema";
import { QuizSchema } from "../lib/quiz/schema";

const COURSE_SLUG = "ai-customer-conversation";

const sessionDefs = [
  {
    position: 1,
    moduleTitle: "Unit 1 — AI Foundations",
    title: "What AI is and where its capabilities fit",
    summary:
      "Working document: Topic 02. Topic 01 is the read-after reference. Output: a 60-second explanation and scenario choices.",
  },
  {
    position: 2,
    moduleTitle: "Unit 2 — Model behaviour",
    title: "How language models work and why they can be wrong",
    summary: "Working document: Topic 03. Output: a plain-language explanation of LLM behaviour.",
  },
  {
    position: 3,
    moduleTitle: "Unit 2 — Model behaviour",
    title: "Prompting for useful results",
    summary: "Working document: Topic 04. Output: a structured prompt, reviewed output, and revision.",
  },
  {
    position: 4,
    moduleTitle: "Unit 3 — Checks and responsible use",
    title: "Checking AI accuracy",
    summary: "Working document: Topic 06. Output: a claim-verification log.",
  },
  {
    position: 5,
    moduleTitle: "Unit 3 — Checks and responsible use",
    title: "Protecting data and using AI responsibly",
    summary: "Working document: Topic 07. Output: data-use decisions and an incident-response answer.",
  },
  {
    position: 6,
    moduleTitle: "Unit 4 — Opportunities",
    title: "Turning use cases into workflow opportunities",
    summary:
      "Working document: Topic 08. Topic 05 is the read-after reference. Output: a one-page pilot proposal.",
  },
  {
    position: 7,
    moduleTitle: "Unit 5 — Customer conversations",
    title: "Discovering the customer's actual problem",
    summary: "Working document: Topic 09. Output: discovery notes and a confirmed problem statement.",
  },
  {
    position: 8,
    moduleTitle: "Unit 5 — Customer conversations",
    title: "Explaining AI and Talent Genie to different audiences",
    summary: "Working document: Topic 10. Output: three short talk tracks and a customer role-play.",
  },
];

function q(
  id: string,
  type: QuizPayload["questions"][number]["type"],
  prompt: string,
  options: Array<[string, string]>,
  correct: string[],
  explanation: string,
  safetyCritical = false,
): QuizPayload["questions"][number] {
  return {
    id,
    type,
    prompt,
    options: options.map(([optionId, text]) => ({ id: optionId, text })),
    correct,
    explanation,
    safetyCritical,
  };
}

const quizzesBySession: Record<number, QuizPayload[]> = {
  1: [
    QuizSchema.parse({
      title: "Topic 01 — Explaining AI in plain language",
      passingScore: 3,
      questions: [
        q(
          "q1",
          "single",
          "A customer says AI will just know the right answer. What is accurate?",
          [
            ["a", "It predicts likely language; important claims still need checking."],
            ["b", "It looks up verified facts in a database."],
            ["c", "It is always correct when the wording sounds confident."],
          ],
          ["a"],
          "An LLM generates likely text rather than retrieving guaranteed truth.",
          true,
        ),
        q(
          "q2",
          "single",
          "Which 60-second explanation order is most useful for a customer?",
          [
            ["a", "Vendor list → pricing → legal disclaimer."],
            ["b", "What AI does → a customer example → a limitation → review needed."],
            ["c", "Model architecture → training data volumes → benchmarks."],
          ],
          ["b"],
          "The course framework is what it does, a relevant example, a limitation, and the need for review.",
        ),
        q(
          "q3",
          "truefalse",
          "Drafting, summarising, and classification can all be useful AI tasks even when a human still reviews the result.",
          [
            ["true", "True"],
            ["false", "False"],
          ],
          ["true"],
          "Those tasks are useful assistance. Human judgment stays in the loop.",
        ),
        q(
          "q4",
          "single",
          "A fluent customer-conversation summary is useful. What limitation should you still mention?",
          [
            ["a", "It may omit or invent a detail that matters to the customer."],
            ["b", "It cannot be written in plain language."],
            ["c", "It only works if the customer used a chatbot first."],
          ],
          ["a"],
          "Usefulness and limitation belong together in a plain-language explanation.",
        ),
      ],
    }),
    QuizSchema.parse({
      title: "Topic 02 — Matching AI capabilities to business needs",
      passingScore: 3,
      questions: [
        q(
          "q1",
          "single",
          "A team wants tomorrow's shift roster built from a fixed rule: seniority, then availability. What fits best?",
          [
            ["a", "A generative chatbot that invents a roster."],
            ["b", "Ordinary automation or the existing process, not an AI model."],
            ["c", "A forecasting model trained on social media."],
          ],
          ["b"],
          "If a simple rule already decides the outcome, AI is not required.",
        ),
        q(
          "q2",
          "multiple",
          "Which of these are the three practical uses taught live in Session 1?",
          [
            ["a", "Find patterns"],
            ["b", "Generate content"],
            ["c", "Automate steps"],
            ["d", "Replace hiring decisions"],
          ],
          ["a", "b", "c"],
          "Find patterns, generate content, and automate steps are overlapping ways of helping with work.",
        ),
        q(
          "q3",
          "single",
          "A customer asks for a chatbot. What should you check first?",
          [
            ["a", "Which vendor has the largest model."],
            ["b", "What task they actually need done, and whether conversation is the right approach."],
            ["c", "Whether they can skip human review after launch."],
          ],
          ["b"],
          "Match the approach to the business task, not to a product category name.",
        ),
        q(
          "q4",
          "truefalse",
          "Automation can be useful even when it does not use AI.",
          [
            ["true", "True"],
            ["false", "False"],
          ],
          ["true"],
          "The comparison table notes that automation can work without AI.",
        ),
      ],
    }),
  ],
  2: [
    QuizSchema.parse({
      title: "Topic 03 — Understanding AI answers and their limitations",
      passingScore: 3,
      questions: [
        q(
          "q1",
          "single",
          "Why can a polished answer still be wrong?",
          [
            ["a", "The model generates likely wording; it does not verify the claim."],
            ["b", "Polished answers are stored as facts after the first use."],
            ["c", "The model only answers when it has a citation."],
          ],
          ["a"],
          "Generating an answer is different from checking it.",
          true,
        ),
        q(
          "q2",
          "single",
          "A prompt is missing key context. What is the likely result?",
          [
            ["a", "The model refuses to answer."],
            ["b", "The model fills gaps with plausible text that may not match the real situation."],
            ["c", "The model emails the customer for clarification automatically."],
          ],
          ["b"],
          "Missing context is a common source of fluent, incorrect answers.",
        ),
        q(
          "q3",
          "truefalse",
          "You should use words like algorithm, neural network, and probability model in a two-minute customer explanation.",
          [
            ["true", "True"],
            ["false", "False"],
          ],
          ["false"],
          "Session 2 practice is a plain-language explanation without those terms.",
        ),
        q(
          "q4",
          "single",
          "What does Topic 03 prepare learners to do, rather than Topic 06?",
          [
            ["a", "Run the full verification log against evidence extracts."],
            ["b", "Explain why review is necessary when an answer sounds finished."],
            ["c", "Approve a product capability as a measured result."],
          ],
          ["b"],
          "This topic explains why review is needed; Document 06 supplies the checking process.",
        ),
      ],
    }),
  ],
  3: [
    QuizSchema.parse({
      title: "Topic 04 — Writing prompts for useful business results",
      passingScore: 3,
      questions: [
        q(
          "q1",
          "multiple",
          "Which elements belong in a useful business prompt?",
          [
            ["a", "Goal"],
            ["b", "Context"],
            ["c", "Constraints and format"],
            ["d", "A request to skip review of facts"],
          ],
          ["a", "b", "c"],
          "Goal, context, constraints, and format are the success check for Session 3.",
        ),
        q(
          "q2",
          "single",
          "You inspect a draft follow-up email and see an unsupported delivery date. What should the revision do?",
          [
            ["a", "Make the date sound more confident."],
            ["b", "Flag missing information and avoid inventing the date."],
            ["c", "Delete the whole prompt and start with one word: email."],
          ],
          ["b"],
          "The template requires missing information to be flagged and unsupported claims avoided.",
          true,
        ),
        q(
          "q3",
          "truefalse",
          "A vague request such as “make this better” is usually enough for a reliable customer-facing draft.",
          [
            ["true", "True"],
            ["false", "False"],
          ],
          ["false"],
          "Turn a vague request into a structured prompt before relying on the output.",
        ),
        q(
          "q4",
          "single",
          "If the live tool is unavailable during practice, what should you use?",
          [
            ["a", "A personal unapproved chatbot on a phone."],
            ["b", "The prepared responses supplied for the exercise."],
            ["c", "A real customer mailbox."],
          ],
          ["b"],
          "The session design includes prepared outputs so practice does not depend on a live model.",
        ),
      ],
    }),
  ],
  4: [
    QuizSchema.parse({
      title: "Topic 06 — Checking AI output before using it",
      passingScore: 3,
      questions: [
        q(
          "q1",
          "single",
          "What should you decide first when checking AI output?",
          [
            ["a", "How confident the model sounded."],
            ["b", "The intended use and the consequence of error."],
            ["c", "Which vendor produced the text."],
          ],
          ["b"],
          "Classify by intended use and consequence, not by confidence or tool brand.",
          true,
        ),
        q(
          "q2",
          "single",
          "Asking the same model the same question again is:",
          [
            ["a", "Independent verification."],
            ["b", "Not independent verification."],
            ["c", "Required before every internal draft."],
          ],
          ["b"],
          "Repeating the same model is not treated as independent verification.",
          true,
        ),
        q(
          "q3",
          "single",
          "A brief will be used for a hiring decision rather than an internal discussion. What changes?",
          [
            ["a", "Nothing; the same light read-through is enough."],
            ["b", "The review level rises; get appropriate human review and stop if evidence is insufficient."],
            ["c", "You should share it faster because hiring is time-sensitive."],
          ],
          ["b"],
          "A draft can move into a higher tier when audience or use changes.",
        ),
        q(
          "q4",
          "truefalse",
          "Names, dates, figures, quotations, and citations are typical claims to check against trusted current records.",
          [
            ["true", "True"],
            ["false", "False"],
          ],
          ["true"],
          "Those are high-value items in the verification checklist.",
        ),
      ],
    }),
  ],
  5: [
    QuizSchema.parse({
      title: "Topic 07 — Deciding what information can go into AI",
      passingScore: 3,
      questions: [
        q(
          "q1",
          "single",
          "Removing a person's name from a customer record makes it safe to upload to any approved tool.",
          [
            ["a", "Yes, anonymisation is automatic once the name is gone."],
            ["b", "No. Other details can still identify someone, and tools differ in what they allow."],
            ["c", "Yes, if the output will not be published."],
          ],
          ["b"],
          "Removing names does not automatically make information safe. Unclear permission requires a check.",
          true,
        ),
        q(
          "q2",
          "single",
          "You are unsure whether a data type is allowed in the tool. What should you do?",
          [
            ["a", "Upload a small sample to test."],
            ["b", "Stop and check the responsible policy or contact."],
            ["c", "Ask the model whether the upload is legal."],
          ],
          ["b"],
          "Unclear permission requires checking the responsible policy or contact.",
          true,
        ),
        q(
          "q3",
          "single",
          "Who remains accountable for a consequential decision that used AI assistance?",
          [
            ["a", "The model vendor."],
            ["b", "The named human owner of the decision."],
            ["c", "Nobody, if the prompt was well written."],
          ],
          ["b"],
          "Human responsibility for consequential decisions is a live essential in Session 5.",
        ),
        q(
          "q4",
          "truefalse",
          "Every approved tool permits every data type.",
          [
            ["true", "True"],
            ["false", "False"],
          ],
          ["false"],
          "Do not assume every approved tool permits every data type.",
        ),
      ],
    }),
  ],
  6: [
    QuizSchema.parse({
      title: "Topic 05 — Choosing useful AI applications at work",
      passingScore: 3,
      questions: [
        q(
          "q1",
          "single",
          "A useful use-case card should name:",
          [
            ["a", "Problem, AI task, proposed benefit, and review point."],
            ["b", "Only the software vendor and licence cost."],
            ["c", "A guarantee of hours saved."],
          ],
          ["a"],
          "Cards are problem → AI task → proposed benefit → review point. Proposed benefits are not measured results.",
        ),
        q(
          "q2",
          "single",
          "Assistance, recommendations, and automated actions differ mainly in:",
          [
            ["a", "How long the prompt is."],
            ["b", "How much the system is allowed to do without a person."],
            ["c", "Whether the customer is in recruiting or operations."],
          ],
          ["b"],
          "Name the input, potential value, limitation, and human owner for each example.",
        ),
        q(
          "q3",
          "truefalse",
          "Generic business examples in Document 05 can be useful without Talent Genie product claims.",
          [
            ["true", "True"],
            ["false", "False"],
          ],
          ["true"],
          "Document 05 can be completed with generic examples; product-specific claims wait for the approved brief.",
        ),
        q(
          "q4",
          "single",
          "This document helps learners:",
          [
            ["a", "Map an unfamiliar workflow from scratch."],
            ["b", "Choose a task worth taking into a pilot template."],
            ["c", "Certify a production integration."],
          ],
          ["b"],
          "Document 05 helps choose a task; Document 08 explains how to test it in a supplied workflow.",
        ),
      ],
    }),
    QuizSchema.parse({
      title: "Topic 08 — Planning one useful AI workflow pilot",
      passingScore: 3,
      questions: [
        q(
          "q1",
          "multiple",
          "A one-page pilot brief should include:",
          [
            ["a", "The selected step and proposed assistance"],
            ["b", "Allowed input and a reviewer"],
            ["c", "A baseline, proposed target, owner, and stop condition"],
            ["d", "A promise that hiring decisions will be fully automated"],
          ],
          ["a", "b", "c"],
          "Keep hiring decisions with accountable people. Name a specific task, controls, and a measurable outcome.",
          true,
        ),
        q(
          "q2",
          "single",
          "This course assesses whether learners can:",
          [
            ["a", "Independently discover and map an unfamiliar workflow from scratch."],
            ["b", "Evaluate and improve a supplied workflow."],
            ["c", "Deploy an integration to production during the live hour."],
          ],
          ["b"],
          "Independent workflow mapping is outside the six-hour course.",
        ),
        q(
          "q3",
          "truefalse",
          "Fictional baseline figures and proposed targets must be clearly labelled.",
          [
            ["true", "True"],
            ["false", "False"],
          ],
          ["true"],
          "Do not present fictional numbers as measured results.",
        ),
        q(
          "q4",
          "single",
          "Before locking a pilot step, apply:",
          [
            ["a", "Accuracy and data-use guides from earlier sessions."],
            ["b", "Only the vendor's marketing deck."],
            ["c", "A vote among people who have not seen the workflow."],
          ],
          ["a"],
          "Session 6 sits after accuracy and data protection so those checks apply to proposals.",
        ),
      ],
    }),
  ],
  7: [
    QuizSchema.parse({
      title: "Topic 09 — Running a useful customer discovery conversation",
      passingScore: 3,
      questions: [
        q(
          "q1",
          "single",
          "What should you confirm before discussing a solution?",
          [
            ["a", "The problem and the desired outcome."],
            ["b", "The model name you prefer."],
            ["c", "A discounted multi-year contract."],
          ],
          ["a"],
          "Confirm the problem and desired outcome before discussing a solution.",
        ),
        q(
          "q2",
          "multiple",
          "Useful discovery covers:",
          [
            ["a", "Current process, pain, frequency, and impact"],
            ["b", "Data readiness, decision-makers, timing, and constraints"],
            ["c", "A full technical architecture for the first meeting"],
          ],
          ["a", "b"],
          "Explore process and impact, acknowledge constraints, and check understanding.",
        ),
        q(
          "q3",
          "truefalse",
          "A one-sentence problem-statement template is part of the reusable aid for this topic.",
          [
            ["true", "True"],
            ["false", "False"],
          ],
          ["true"],
          "The aid is a question guide plus a one-sentence problem-statement template.",
        ),
        q(
          "q4",
          "single",
          "If the customer reveals a new constraint, you should:",
          [
            ["a", "Ignore it so the earlier proposal still fits."],
            ["b", "Update your understanding and the problem statement."],
            ["c", "End the conversation immediately."],
          ],
          ["b"],
          "The shared case study reveals an extra constraint in Session 7 so learners update assumptions.",
        ),
      ],
    }),
  ],
  8: [
    QuizSchema.parse({
      title: "Topic 10 — Explaining Talent Genie and agreeing on the next step",
      passingScore: 3,
      questions: [
        q(
          "q1",
          "single",
          "A customer asks you to guarantee a hiring outcome from Talent Genie. What should you do?",
          [
            ["a", "Give the guarantee to close the meeting."],
            ["b", "Use verified facts, avoid guarantees, and end with a concrete next step."],
            ["c", "Change the subject to model parameter counts."],
          ],
          ["b"],
          "Success check: fits the audience, uses verified facts, avoids guarantees, and ends with an action.",
          true,
        ),
        q(
          "q2",
          "single",
          "The talk-track pattern is:",
          [
            ["a", "Feature list → price → signature."],
            ["b", "Customer problem → supported capability → relevant outcome → limitation or review need → next step."],
            ["c", "Competitor critique → demo video → optional follow-up."],
          ],
          ["b"],
          "That pattern is the reusable aid for recruiter, operations, and executive tracks.",
        ),
        q(
          "q3",
          "truefalse",
          "Generic AI examples are enough to establish Talent Genie product knowledge.",
          [
            ["true", "True"],
            ["false", "False"],
          ],
          ["false"],
          "Product facts need the approved Talent Genie brief. Generic AI examples cannot establish product knowledge.",
          true,
        ),
        q(
          "q4",
          "single",
          "Peer feedback in the role-play:",
          [
            ["a", "Is formal individual certification."],
            ["b", "Is coaching practice, not by itself a certification decision."],
            ["c", "Replaces the need for verified product facts."],
          ],
          ["b"],
          "Peer feedback alone does not establish readiness for customer work.",
        ),
      ],
    }),
  ],
};

const existing = await db.query.courses.findFirst({
  where: eq(courses.slug, COURSE_SLUG),
});

const [course] =
  existing
    ? [existing]
    : await db
        .insert(courses)
        .values({
          slug: COURSE_SLUG,
          title: "AI Customer-Conversation Training",
          summary:
            "Eight 45-minute live sessions for customer-facing employees: explain AI, choose useful applications, and discuss approved capabilities accurately. Ten topic documents and one quiz per topic.",
          status: "published",
        })
        .returning();

if (existing) {
  await db
    .update(courses)
    .set({
      title: course.title,
      summary:
        "Eight 45-minute live sessions for customer-facing employees: explain AI, choose useful applications, and discuss approved capabilities accurately. Ten topic documents and one quiz per topic.",
      status: "published",
    })
    .where(eq(courses.id, course.id));
}

for (const def of sessionDefs) {
  const found = await db.query.sessions.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.courseId, course.id), eq(table.position, def.position)),
  });

  const [session] = found
    ? await db
        .update(sessions)
        .set({
          title: def.title,
          summary: def.summary,
          moduleTitle: def.moduleTitle,
        })
        .where(eq(sessions.id, found.id))
        .returning()
    : await db
        .insert(sessions)
        .values({
          courseId: course.id,
          position: def.position,
          title: def.title,
          summary: def.summary,
          moduleTitle: def.moduleTitle,
        })
        .returning();

  const payloads = quizzesBySession[def.position] ?? [];
  for (const [index, payload] of payloads.entries()) {
    const existingQuiz = await db.query.quizzes.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.sessionId, session.id), eq(table.position, index + 1)),
    });
    if (existingQuiz) continue;

    const [quiz] = await db
      .insert(quizzes)
      .values({
        sessionId: session.id,
        position: index + 1,
        title: payload.title,
      })
      .returning();

    const [version] = await db
      .insert(quizVersions)
      .values({
        quizId: quiz.id,
        versionNumber: 1,
        json: payload,
      })
      .returning();

    await db
      .update(quizzes)
      .set({ currentVersionId: version.id })
      .where(eq(quizzes.id, quiz.id));
  }
}

console.log(`Seeded course ${COURSE_SLUG} with eight sessions and topic quizzes.`);
process.exit(0);
