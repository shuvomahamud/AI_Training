# Import the instructor plan into ClickUp

Import **INSTRUCTOR_CLICKUP_PLAN.json**. It contains 11 top-level tasks and 78 subtasks (89 records): website and Google Meet setup, shared materials, eight session plans, and course follow-up. There is one handout-preparation task and one website-quiz task for each of the ten topics. Each session contains its own rehearsal task.

The file is a flat JSON array of task rows for ClickUp's Spreadsheet Importer. Each parent row identifies its children in Subtask IDs. It is not an API request body and has no project metadata wrapper. Names are prefixed for sorting; dates and assignees are intentionally absent.

## Import steps

1. Open Workspace settings → Imports / Exports → Import items → Spreadsheet, or use the Spreadsheet import option from a Space or Folder.
2. Choose the destination for this AI-course instructor plan. No ClickUp workspace or List ID is embedded in the file.
3. Set the multi-value delimiter to **pipe: |**. The Subtask IDs, Checklist, and Tags columns all use it.
4. Upload INSTRUCTOR_CLICKUP_PLAN.json and review the field mappings below.
5. Map the incoming status “to do” to your destination's existing starting status. Map time estimates as minutes and confirm each delivery task displays **45 minutes**, not 45 hours.
6. Review the preview, then import. Confirm 11 top-level tasks, 78 subtasks, ten handout tasks, ten quiz tasks, eight rehearsal tasks, and eight delivery tasks. Review the import report for rejected rows or fields.

## Field mapping

| JSON field | ClickUp field |
|---|---|
| Task ID | Task ID |
| Task Name | Task Name |
| Description content | Description content |
| Status | Status |
| Subtask IDs | Subtask IDs — not the names-only Subtasks field |
| Checklist | Checklist |
| Tags | Tags |
| Time Estimate | Time Estimate |

## What the instructor receives

- Setup tasks for the course website, quiz behavior, Google Meet, cohort logistics, approved tools/policies, the Talent Genie brief, assessment, and scheduling.
- Shared-material tasks for the fictional case, handout structure, instructor notes, assessment templates, and demonstration fallbacks.
- Eight session parents, each with handout and quiz creation, instructor preparation, a Google Meet rehearsal, website publishing, live delivery, and learner-work review. The merged sessions each have two handouts and two quizzes.
- Full 40-minute agendas in delivery descriptions, with a five-minute contingency reserve. Setup and transitions are explicitly budgeted.
- Task-specific checklists, outcomes, completion criteria, and prerequisite references.

## Limits and dependencies

Task IDs are local import references, not existing ClickUp task IDs or an update/deduplication map. Treat this file as a new-plan import; do not assume that uploading it again will update the first import.

Prerequisites appear in task descriptions. This file does not create native ClickUp dependency links; add those after import if you want automated blocking. All tasks start as “to do,” and none imply the work is already complete. Owner roles and actual dates must be assigned in ClickUp.

Document 10 and its quiz require the approved Talent Genie brief. Document 07 and its quiz require approved company policy references. Document 05 can remain generic. The JSON creates instructor work items; it does not build or publish the website, create finished learner handouts, attach local files, schedule Google Meet events, or share materials with learners.

Only the eight live-delivery subtasks have time estimates: 8 × 45 minutes = six hours. Preparation, review, retries, and any formal certification require separate instructor scheduling. Parent tasks have no estimates to avoid double-counting.

## Source and regeneration

Curriculum source: COURSE_PLAN.md.

Export adapter: scripts/build-instructor-plan.py. This adds the instructor task structure and extracts the topic briefs and agendas from the course plan; it is not a second curriculum source. After changing the course plan, run:

    python3 scripts/build-instructor-plan.py

The adapter validates unique IDs, hierarchy, prerequisite references/cycles, ten document tasks, ten quiz tasks, eight in-session rehearsal tasks, eight delivery tasks, agenda totals, and JSON syntax. It overwrites the generated JSON, this guide, and INSTRUCTOR_TASK_OVERVIEW.md. The overview shows the same task hierarchy in a readable form. Local checks passed; an actual ClickUp import has not been performed.

Source SHA-256 at generation: 38743b23ba4b7d93c801d9b8803923a2c929af9cc60cc977bcbb49ba880b413c

## Official ClickUp references

- [Supported import formats and subtask-ID structure](https://help.clickup.com/hc/en-us/articles/6310821748759-Prepare-a-spreadsheet-for-import)
- [Supported task fields](https://help.clickup.com/hc/en-us/articles/6310876671255-Fields-supported-by-the-Spreadsheets-importer)
- [Spreadsheet Importer workflow](https://help.clickup.com/hc/en-us/articles/6310834724247-Use-the-Spreadsheets-Importer)
