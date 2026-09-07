"""Export COURSE_PLAN.md as flat task rows for ClickUp's JSON importer.

The Markdown course plan remains the curriculum source. This adapter adds
instructor work steps and writes one import file, without contacting ClickUp.
"""

import hashlib
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "COURSE_PLAN.md"
OUTPUT = ROOT / "INSTRUCTOR_CLICKUP_PLAN.json"
GUIDE = ROOT / "CLICKUP_IMPORT.md"
OVERVIEW = ROOT / "INSTRUCTOR_TASK_OVERVIEW.md"
source = SOURCE.read_text(encoding="utf-8")
rows = []
by_id = {}
prerequisites = {}
session_agendas = {}
DELIMITER = "|"


def section(title, level=2):
    pattern = (
        rf"^{'#' * level} {re.escape(title)}\n"
        rf"(.*?)(?=^#{{1,{level}}} |\Z)"
    )
    match = re.search(pattern, source, re.MULTILINE | re.DOTALL)
    if not match:
        raise ValueError(f"Missing source section: {title}")
    return match.group(1).strip()


def plain(text):
    """Keep descriptions readable when ClickUp imports them as plain text."""
    result = []
    headers = None
    for line in text.splitlines():
        if line.startswith("|"):
            cells = [cell.strip() for cell in line.strip("|").split("|")]
            if all(re.fullmatch(r":?-+:?", cell) for cell in cells):
                continue
            if headers is None:
                headers = cells
            else:
                result.append("; ".join(f"{h}: {v}" for h, v in zip(headers, cells) if v))
        else:
            headers = None
            result.append(re.sub(r"^#{1,6} ", "", line))
    return "\n".join(result).replace("**", "").replace("`", "").strip()


def agenda(title):
    body = section(title, 3)
    blocks = []
    for line in body.splitlines():
        if not line.startswith("|"):
            continue
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        if len(cells) < 2 or not cells[1].isdigit():
            continue
        if cells[0].startswith("**") or cells[0] == "Contingency buffer":
            continue
        blocks.append((cells[0], int(cells[1])))
    if sum(minutes for _, minutes in blocks) != 40:
        raise ValueError(f"Agenda does not contain 40 planned minutes: {title}")
    return blocks


def format_agenda(blocks):
    # The source budgets transitions as one aggregate row. Put them between
    # the actual rounds in the instructor's chronological run sheet.
    expanded = []
    index = 0
    while index < len(blocks):
        label, minutes = blocks[index]
        if label == "Three six-minute role-play rounds":
            if blocks[index + 1] != ("Two role transitions, 30 seconds each", 1):
                raise ValueError("Review the Session 8 round/transition budget")
            for round_number in range(1, 4):
                expanded.append((f"Role-play round {round_number}", 6))
                if round_number < 3:
                    expanded.append(("Rotate employee, customer, and observer roles", 0.5))
            index += 2
        else:
            expanded.append((label, minutes))
            index += 1
    if sum(minutes for _, minutes in expanded) != 40:
        raise ValueError("Chronological agenda does not total 40 minutes")

    def clock(minutes):
        seconds = round(minutes * 60)
        return f"{seconds // 60:02d}:{seconds % 60:02d}"

    elapsed = 0
    output = ["Activity clock: minutes:seconds from the start, excluding interruptions."]
    for label, minutes in expanded:
        output.append(f"{clock(elapsed)}-{clock(elapsed + minutes)}: {label}")
        elapsed += minutes
    output.append(
        "Reserve: 5 minutes of contingency within the 45-minute slot. "
        "Activity offsets above exclude interruptions; use the reserve when needed. "
        "Do not fill unused reserve with additional required content."
    )
    return "\n".join(output)


def add(task_id, name, purpose, done, *, parent=None, checklist=(), needs=(), tags=(), estimate="", notes=""):
    if task_id in by_id:
        raise ValueError(f"Duplicate task ID: {task_id}")
    if any(DELIMITER in value for value in checklist):
        raise ValueError(f"Checklist delimiter in item: {task_id}")
    description = purpose.strip()
    if needs:
        description += "\n\nPREREQUISITES\n" + "\n".join(f"- {key}" for key in needs)
    if notes:
        description += "\n\nINSTRUCTOR NOTES\n" + notes.strip()
    description += "\n\nDONE WHEN\n" + done.strip()
    description += "\n\nSOURCE\nCOURSE_PLAN.md. Local import IDs identify plan rows; they are not existing ClickUp task IDs."
    row = {
        "Task ID": task_id,
        "Task Name": name,
        "Description content": description,
        "Status": "to do",
        "Subtask IDs": "",
        "Checklist": DELIMITER.join(checklist),
        "Tags": DELIMITER.join(("ai-course", "instructor", *tags)),
        "Time Estimate": estimate,
    }
    rows.append(row)
    by_id[task_id] = row
    prerequisites[task_id] = list(needs)
    if parent:
        p = by_id[parent]
        p["Subtask IDs"] = DELIMITER.join(filter(None, [p["Subtask IDs"], task_id]))
    return row


add(
    "AI-SETUP", "00.1 - Set up the course website, Google Meet, and required references",
    "Prepare the instructor to deliver eight beginner Google Meet sessions for customer-facing employees. "
    "Each slot is 45 minutes: 40 planned minutes plus five minutes of contingency. "
    "A small learning website will provide ten independently shareable topic documents and one quiz per topic. "
    "Dates and actual assignees remain unset.",
    "The course website works as the learner hub, Google Meet delivery is configured, and cohort logistics, "
    "training-tool rules, product references, quiz behavior, and assessment expectations are recorded.",
    tags=("course-setup",),
)
setup = [
    ("COHORT", "Confirm the learners and facilitator coverage",
     "Confirm learner roles, starting knowledge, cohort size, accessibility needs, and instructor or coach coverage for Google Meet.",
     ["Record learner roles and cohort size", "Record accessibility needs", "Plan pairs and final role-play groups"],
     "The instructor has a roster and a workable grouping plan."),
    ("POLICY", "Collect approved tools and company policy references",
     "Obtain the allowed training tools and data categories, access/retention rules, output-storage locations, "
     "incident-reporting route, and ownership/licensing guidance. Confirm the exact training use, not only the tool name.",
     ["Confirm the approved training tool and permitted data", "Record actual incident-reporting route", "Link reviewed policy references", "Identify the policy reviewer"],
     "Document 07 can use actual reviewed rules and the instructor can explain permitted training use. Do not invent missing rules."),
    ("PRODUCT", "Obtain the approved Talent Genie product brief",
     "Collect supported capabilities, intended users, limitations, data/integration needs, implementation expectations, "
     "and approved customer examples. The source course document does not establish any product feature.",
     ["Record the product owner and review date", "Confirm supported capabilities and limitations", "Collect recruiter and operations and executive examples"],
     "An approved brief supports Document 10. Generic Documents 01-09 can be drafted while this remains open."),
    ("WEBSITE-SCOPE", "Define the course website and quiz behavior",
     "Define a compact learner hub with a course home page, eight session pages, ten topic-document sections, "
     "and one three-to-five-question quiz per topic. Decide whether quizzes give private self-check feedback or "
     "store named completion results. Confirm access, privacy, storage, retention, and reporting before collecting learner data.",
     ["Confirm the page and navigation structure", "Choose self-check or named quiz tracking", "Define website access and content ownership", "Record accessibility and mobile requirements"],
     "The site builder has an approved scope and no learner data will be collected without an approved tracking model."),
    ("WEBSITE-BUILD", "Build the small course website",
     "Build the course home page, eight session pages, document and quiz components, answer-feedback states, and an instructor-controlled content workflow. "
     "Each session page must show the outcome, the correct topic documents, the working document, preparation guidance, and the Google Meet event route.",
     ["Build the course and session navigation", "Add reusable document and quiz components", "Add clear working-document labels", "Make pages responsive and keyboard accessible"],
     "A learner can navigate from the course page to every session, document, and quiz on desktop and mobile."),
    ("WEBSITE-PUBLISH", "Test and publish the course website",
     "Test access, navigation, document downloads, quiz scoring and feedback, keyboard use, mobile layout, and error or offline fallbacks. "
     "Publish the reviewed site through the approved hosting location and record who can update content.",
     ["Test a complete session path", "Test all document and quiz links", "Verify quiz feedback and any approved result storage", "Publish and record the update process"],
     "The website is available to the intended learners, a sample topic path works end to end, and the fallback is documented."),
    ("MEET", "Configure Google Meet for the eight live sessions",
     "Create eight calendar events with Google Meet links, the correct instructors and learners, and the relevant session-page link. "
     "Confirm captions, screen sharing, recording policy, group-work approach, and backup facilitation.",
     ["Create eight Google Meet calendar events", "Add session-page links and correct participants", "Test screen sharing and captions", "Confirm recording policy and group-work fallback"],
     "The eight live-session events are ready and the instructor can run the planned activities through Google Meet."),
    ("ASSESSMENT", "Confirm the learning checks and completion criteria",
     plain(section("Feedback and completion")),
     ["Confirm formative checkpoints", "Confirm safety-critical questions", "Distinguish peer feedback from certification", "Plan targeted retries"],
     "Assessment criteria and reviewer responsibilities are clear. Any formal certification has separate staffing or assessment time."),
    ("SCHEDULE", "Finalize the eight-session calendar and release schedule",
     "Choose dates for Sessions 1-8 in course order and align them with the Google Meet events and website releases. "
     "Reserve 45 minutes per session and allow preparation outside the learner slots. Confirm enough facilitators or coaches "
     "for final role-play groups; do not put four learner turns into three rounds.",
     ["Set eight session dates", "Confirm instructor and coach availability", "Schedule website document and quiz releases"],
     "The course calendar and coverage are workable. No dates or assignments have been assumed by this import."),
]
for index, (key, title, purpose, checks, done) in enumerate(setup, 1):
    setup_needs = {
        "WEBSITE-BUILD": ("AI-SETUP-WEBSITE-SCOPE",),
        "WEBSITE-PUBLISH": ("AI-SETUP-WEBSITE-BUILD",),
        "MEET": ("AI-SETUP-COHORT",),
        "SCHEDULE": ("AI-SETUP-COHORT", "AI-SETUP-MEET", "AI-SETUP-WEBSITE-PUBLISH"),
    }
    needs = setup_needs.get(key, ())
    add(f"AI-SETUP-{key}", f"{index:02d} - {title}", purpose, done,
        parent="AI-SETUP", checklist=checks, needs=needs, tags=("course-setup",))

add("AI-MATERIALS", "00.2 - Prepare shared instructor and learner materials",
    plain(section("Shared case study and facilitator materials")),
    "Shared examples, document conventions, rubrics, prepared outputs, and facilitator records are usable.",
    tags=("shared-materials",))
materials = [
    ("CASE", "Build the fictional customer case pack",
     "Create synthetic recruiting-account messages, a customer-call handover, a process description, customer priorities, "
     "and clearly labeled sample timing data. Include a new constraint to reveal in Session 7. Add non-recruiting examples "
     "where useful. This is training data, not a claim about Talent Genie.",
     ["Label all fictional details", "Prepare short self-contained context cards", "Keep human responsibility for hiring decisions explicit"],
     "The examples can support Sessions 1-8 without real customer information or assumed product features."),
    ("TEMPLATE", "Set the common topic-document structure",
     plain(section("Standard for the ten topic documents")),
     ["Keep teaching text at approximately 600-900 words", "Put full exercise assets and answers in labeled appendices", "Make the working page easy to locate", "Include three self-check questions per topic"],
     "All ten documents can follow one practical structure while remaining independently shareable."),
    ("FACILITATOR", "Create the instructor notes and feedback-record template",
     "Prepare a template for session outcome, agenda, materials, exact working page, demonstration, exercise instructions, "
     "misconceptions, answer key, attendance, unresolved questions, and corrective feedback. Include explicit setup and transition time.",
     ["Include the 40-minute activity budget and five-minute buffer", "Add fields for learner outputs and follow-up", "Separate instructor answer keys from learner working pages"],
     "Each instructor can record preparation, delivery, and follow-up using the same structure."),
    ("ASSESSMENT", "Prepare shared answer-key and assessment templates",
     plain(section("Feedback and completion")),
     ["Prepare prompt and pilot-brief checkpoint criteria", "Prepare the five-dimension role-play rubric", "Prepare four short final questions", "Write answer rationales and retry guidance"],
     "The instructor can distinguish factual accuracy, responsible use, and communication quality when reviewing work."),
    ("FALLBACK", "Prepare demonstration and tool-access fallbacks",
     "Prepare fixed AI outputs for demonstrations and exercises so lessons do not depend on a live model producing "
     "a specific answer or error. Keep the input and output side by side. Use only fictional or explicitly approved training data.",
     ["Prepare useful and flawed sample outputs", "Provide an offline worksheet alternative", "Test display and learner access"],
     "The lesson can continue if the approved AI tool or a screen share fails."),
]
for index, (key, title, purpose, checks, done) in enumerate(materials, 1):
    needs = ("AI-SETUP-ASSESSMENT",) if key == "ASSESSMENT" else ()
    add(f"AI-MAT-{key}", f"{index:02d} - {title}", purpose, done,
        parent="AI-MATERIALS", checklist=checks, needs=needs, tags=("shared-materials",))

topic_matches = list(re.finditer(r"^### (\d{2}) — (.+)$", source, re.MULTILINE))
topics = {int(m.group(1)): (m.group(2), section(f"{m.group(1)} — {m.group(2)}", 3)) for m in topic_matches}
if set(topics) != set(range(1, 11)):
    raise ValueError("Expected all ten topic briefs in COURSE_PLAN.md")

session_specs = [
    (1, "AI foundations and useful capabilities", [1, 2], 2,
     "A plain-language 60-second explanation and defensible scenario choices.",
     "Session 1: Combined foundations"),
    (2, "How language models work and why answers can be wrong", [3], 3,
     "A two-minute explanation of learned language patterns, context, and why fluent output can still be incorrect.",
     "Standard agenda: Sessions 2–4 and 7"),
    (3, "Write and improve useful prompts", [4], 4,
     "An original prompt, a structured improvement, a reviewed response, and one justified revision.",
     "Standard agenda: Sessions 2–4 and 7"),
    (4, "Choose verification effort and check AI output", [6], 6,
     "A claim log that finds three material errors and explains the appropriate verification level.",
     "Standard agenda: Sessions 2–4 and 7"),
    (5, "Protect data and keep AI use responsible", [7], 7,
     "Four policy-grounded data decisions, an incident-response answer, and recognition of a biased assumption.",
     "Session 5: Data protection and responsible use"),
    (6, "Select a use case and propose a workflow pilot", [5, 8], 8,
     "A one-page pilot brief identifying a useful task, allowed input, human review, and a measurable outcome.",
     "Session 6: Combined use cases and workflows"),
    (7, "Discover the customer's actual problem", [9], 9,
     "Discovery notes, a confirmed problem statement, and a desired outcome before a solution is proposed.",
     "Standard agenda: Sessions 2–4 and 7"),
    (8, "Explain Talent Genie and agree on a next step", [10], 10,
     "Three adapted audience-specific talk tracks, one performed customer role-play, and a short knowledge check.",
     "Session 8: Customer conversations and final practice"),
]

for n, title, doc_numbers, working, outcome, agenda_title in session_specs:
    session_id = f"AI-S{n:02d}"
    doc_labels = ", ".join(f"Document {d:02d}" for d in doc_numbers)
    blocks = agenda(agenda_title)
    session_agendas[n] = blocks
    specific_notes = "\n\n".join(plain(topics[d][1]) for d in doc_numbers)
    if agenda_title.startswith("Session"):
        agenda_text = section(agenda_title, 3)
        first_table = re.search(r"(?m)^\|.*(?:\n\|.*)*", agenda_text)
        if first_table:
            specific_notes += "\n\n" + plain(agenda_text[first_table.end():])
    parent_notes = (
        f"LIVE SLOT: 45 minutes; 40 minutes of planned activity plus five minutes of contingency.\n"
        f"SHARE: {doc_labels}.\nWORKING DOCUMENT: Document {working:02d}.\n"
        "DELIVERY: Google Meet. MATERIALS: course website, with one quiz for each topic.\n"
        "Advance reading is optional. Preparation, topic quizzes, and instructor follow-up are outside the learner's live slot.\n"
        "Complete preparation subtasks before teaching. Instructor tasks can be prepared ahead of the delivery sequence."
    )
    add(session_id, f"{n:02d} - Session {n}: {title}",
        f"LEARNER OUTCOME\n{outcome}\n\n{parent_notes}",
        "The handouts and instructor notes are ready, the session has been delivered, and learner work has been reviewed with follow-up recorded.",
        tags=("live-session", f"session-{n:02d}"))

    doc_ids = []
    quiz_ids = []
    position = 1
    for d in doc_numbers:
        doc_id = f"{session_id}-DOC{d:02d}"
        doc_ids.append(doc_id)
        needs = ["AI-MAT-CASE", "AI-MAT-TEMPLATE"]
        if d == 7:
            needs.append("AI-SETUP-POLICY")
        if d == 10:
            needs.append("AI-SETUP-PRODUCT")
        add(doc_id, f"{position:02d} - Prepare Document {d:02d}: {topics[d][0]}",
            plain(topics[d][1]),
            "The separately shareable handout contains an observable outcome, relevant teaching text, worked example, "
            "reusable aid, core exercise, three self-checks, and answer rationales. The teaching text targets 600-900 words; "
            "exercise assets and reference appendices are outside that count. References are checked and the final release copy has no unresolved placeholders.",
            parent=session_id, needs=needs,
            checklist=("Write the plain-language explanation and customer example", "Build the reusable working aid", "Add complete exercise assets in appendices", "Write three self-checks and answer rationales", "Check facts and applicable approved references", "Label topic and session and working page"),
            tags=("handout", f"topic-{d:02d}", f"session-{n:02d}"),
            notes="Prepare one independent file for this topic. The instructor may delegate drafting, but must review it before teaching. "
                  "This task creates the handout; the JSON import itself does not contain a finished learner document.")
        position += 1

        quiz_id = f"{session_id}-QUIZ{d:02d}"
        quiz_ids.append(quiz_id)
        add(quiz_id, f"{position:02d} - Create website quiz for Topic {d:02d}",
            f"Create a three-to-five-question website quiz for Document {d:02d}: {topics[d][0]}. "
            "Test the topic's observable outcome with realistic customer or work decisions. Provide immediate answer feedback "
            "that explains why the answer is correct. Mark safety-critical questions where applicable. Use only the approved "
            "quiz-result model; do not collect learner identity or results unless tracking has been approved.",
            "The quiz is published on the correct topic section, works on desktop and mobile, gives clear answer feedback, "
            "and every answer matches the reviewed handout and applicable product or policy reference.",
            parent=session_id, needs=(doc_id, "AI-SETUP-WEBSITE-BUILD", "AI-SETUP-WEBSITE-SCOPE"),
            checklist=("Write three to five relevant questions", "Write clear feedback for every answer", "Mark safety-critical questions where applicable", "Check answers against the reviewed document", "Test quiz behavior and accessibility"),
            tags=("website-quiz", f"topic-{d:02d}", f"session-{n:02d}"))
        position += 1

    add(f"{session_id}-PREP", f"{position:02d} - Prepare the demonstration and instructor run sheet",
        f"Prepare the timed teaching sequence for Session {n}.\n\nAGENDA\n{format_agenda(blocks)}",
        "The run sheet identifies the exact working page, demo, setup, practice instructions, expected answers, "
        "misconceptions, and exit check. All core activity fits the planned budget; prepared-output fallbacks are available.",
        parent=session_id, needs=(*doc_ids, "AI-MAT-FACILITATOR", "AI-MAT-FALLBACK", "AI-MAT-ASSESSMENT"),
        checklist=("Select the relevant demo and context card", "Prepare instructions and expected answers", "Budget setup and role changes explicitly", "Keep five minutes unallocated", "Check the fallback materials"),
        tags=("preparation", f"session-{n:02d}"), notes=specific_notes)
    position += 1

    add(f"{session_id}-REHEARSE", f"{position:02d} - Rehearse Session {n} in Google Meet",
        "Run a timed rehearsal through the actual Google Meet setup and the draft session page. Check website access, document links, "
        "quiz behavior, screen sharing, instructions, pairing or roles, transitions, practice, and submission. Simplify inputs or "
        "reduce whole-group reporting if planned activity exceeds 40 minutes; preserve practice and safety-critical feedback.",
        "Actual activity duration, issues, and fixes are recorded. The session fits 40 planned minutes, the five-minute reserve "
        "remains unallocated, and the website and Google Meet path work end to end.",
        parent=session_id,
        needs=(f"{session_id}-PREP", *quiz_ids, "AI-SETUP-WEBSITE-PUBLISH", "AI-SETUP-MEET"),
        checklist=("Join through the scheduled Google Meet event", "Open the correct website session and working document", "Test topic quizzes and fallbacks", "Time all activities and transitions", "Resolve overruns and unclear instructions", "Record actual duration and fixes"),
        tags=("rehearsal", f"session-{n:02d}"))
    position += 1

    release_needs = [f"{session_id}-REHEARSE", "AI-SETUP-POLICY", "AI-SETUP-SCHEDULE"]
    add(f"{session_id}-RELEASE", f"{position:02d} - Publish the session materials and quizzes",
        f"Review and publish {doc_labels} and their topic quizzes on the course website before Session {n}. "
        f"Direct learners to Document {working:02d} as the working document. Test the Google Meet event route and explain that advance reading is optional.",
        "The reviewed handouts and quizzes are accessible on the correct session page, the working document is identified, "
        "group arrangements are ready, and no unsupported company or product claims remain.",
        parent=session_id, needs=release_needs,
        checklist=("Review the final handout and quiz versions", "Publish them on the correct website session page", "Identify the single working document", "Test the Meet event route and fallback", "Confirm group arrangements"),
        tags=("release", f"session-{n:02d}"))
    position += 1

    delivery_needs = [f"{session_id}-RELEASE"]
    if n > 1:
        delivery_needs.append(f"AI-S{n-1:02d}-DELIVER")
    add(f"{session_id}-DELIVER", f"{position:02d} - Deliver the 45-minute Google Meet session",
        f"LEARNER OUTCOME\n{outcome}\n\nOpen the course website's Session {n} page and use Document {working:02d} as the working document.\n\nAGENDA\n{format_agenda(blocks)}",
        "The live activity is complete within the slot, each learner has an opportunity to practice, "
        "the exit check is collected, and any unresolved questions are recorded.",
        parent=session_id, needs=delivery_needs, estimate="45 min",
        checklist=("Open the designated working page", "Use the relevant customer context", "Run the demonstration and learner practice", "Correct material misconceptions", "Collect the output and exit check", "Record actual timing and unresolved questions"),
        tags=("delivery", f"session-{n:02d}"), notes=specific_notes)
    position += 1

    add(f"{session_id}-REVIEW", f"{position:02d} - Review learner work and quiz follow-up",
        f"Review Session {n}'s output: {outcome} Use the handout answer key and the course feedback criteria. "
        "Review quiz results only if named tracking was approved; otherwise use anonymous questions and discussion patterns. "
        "Record attendance, missing work, common misconceptions, and targeted retries. Instructor review occurs outside the live learner slot.",
        "Outputs have been reviewed; material accuracy or responsible-use errors receive corrective feedback; "
        "any retry, unanswered question, or material revision has an owner and next action.",
        parent=session_id, needs=(f"{session_id}-DELIVER",),
        checklist=("Review the learner output against the criteria", "Resolve or assign safety-critical corrections", "Record missing work and targeted retries", "Record improvements for the next delivery"),
        tags=("learner-review", f"session-{n:02d}"))

add("AI-CLOSE", "09 - Close the course and prepare instructor follow-up",
    "Consolidate learning evidence and course improvements after Session 8. Course completion is distinct from formal individual certification.",
    "Completion records, targeted coaching actions, final reference versions, and instructor improvements are recorded.",
    tags=("course-follow-up",))
closing = [
    ("RESULTS", "Consolidate participation and assessment results",
     "Combine session outputs, the prompt and pilot checkpoints, final role-play feedback, and four-question knowledge-check results. "
     "Use the agreed completion criteria and distinguish peer observations from formal assessor decisions.",
     ["Check all session records", "Record the agreed completion result", "Identify unresolved accuracy or responsible-use issues"],
     "Each learner has a supported completion record or an explicit outstanding action.",
     tuple(f"AI-S{n:02d}-REVIEW" for n in range(1, 9))),
    ("COACHING", "Arrange targeted coaching and retries where needed",
     "Use the recorded gaps to plan focused feedback and reassessment. Preserve essential accuracy and responsible-use standards. "
     "Additional coaching is outside the eight standard live slots and is only needed for unresolved gaps.",
     ["Identify the specific skill gap", "Assign the appropriate reviewer", "Record the retry result or next action"],
     "Each unresolved gap has a completed retry or an owner and follow-up action; do not claim unobserved readiness.",
     ("AI-CLOSE-RESULTS",)),
    ("REFERENCES", "Retain the reviewed website, documents, and quizzes",
     "Keep the reviewed website, ten handouts, and ten quizzes in the approved location with clear versions, source references, and content owners. "
     "Confirm that all documents remain separately shareable and the working aids are easy to find.",
     ["Check all ten final document and quiz links", "Record product and policy review ownership", "Remove superseded learner-facing copies from the active website"],
     "Learners and instructors have an unambiguous current website and reference set.",
     ("AI-S08-RELEASE",)),
    ("IMPROVE", "Record delivery improvements for the next cohort",
     "Review timing notes, learner questions, exercise quality, and misconceptions. Propose specific changes to COURSE_PLAN.md "
     "and the affected teaching assets. Keep a 40-minute activity budget and five-minute buffer in future revisions.",
     ["Compare actual timing with each agenda", "Identify unclear examples and instructions", "Record changes and responsible owners"],
     "The next instructor has a prioritized improvement list based on observed delivery.",
     ("AI-CLOSE-RESULTS",)),
]
for index, (key, title, purpose, checks, done, needs) in enumerate(closing, 1):
    add(f"AI-CLOSE-{key}", f"{index:02d} - {title}", purpose, done,
        parent="AI-CLOSE", checklist=checks, needs=needs, tags=("course-follow-up",))


def validate():
    ids = set(by_id)
    children = []
    for row in rows:
        child_ids = row["Subtask IDs"].split(DELIMITER) if row["Subtask IDs"] else []
        for child in child_ids:
            if child not in ids or child == row["Task ID"]:
                raise ValueError(f"Invalid subtask link: {row['Task ID']} -> {child}")
        children.extend(child_ids)
        if not row["Task Name"] or not row["Description content"]:
            raise ValueError("Missing required task content")
        if any(not isinstance(value, str) for value in row.values()):
            raise ValueError("Import values must be flat scalar strings")
    if any(count != 1 for count in Counter(children).values()):
        raise ValueError("A subtask has multiple parents")
    for key, needs in prerequisites.items():
        if any(need not in ids or need == key for need in needs):
            raise ValueError(f"Invalid prerequisite on {key}")
    # Prerequisites are prose instructions, but still verify they form a valid DAG.
    visited, active = set(), set()
    def visit(key):
        if key in active:
            raise ValueError(f"Prerequisite cycle at {key}")
        if key in visited:
            return
        active.add(key)
        for need in prerequisites[key]:
            visit(need)
        active.remove(key)
        visited.add(key)
    for key in ids:
        visit(key)
    parents = ids - set(children)
    if len(parents) != 11 or len(children) != 78:
        raise ValueError(f"Unexpected hierarchy: {len(parents)} parents / {len(children)} subtasks")
    handout_ids = [key for key in ids if re.fullmatch(r"AI-S\d{2}-DOC\d{2}", key)]
    if sorted(int(key[-2:]) for key in handout_ids) != list(range(1, 11)):
        raise ValueError("Expected exactly one preparation task for each topic document")
    quiz_ids = [key for key in ids if re.fullmatch(r"AI-S\d{2}-QUIZ\d{2}", key)]
    if sorted(int(key[-2:]) for key in quiz_ids) != list(range(1, 11)):
        raise ValueError("Expected exactly one website quiz task for each topic")
    rehearsal_ids = [key for key in ids if re.fullmatch(r"AI-S\d{2}-REHEARSE", key)]
    if len(rehearsal_ids) != 8:
        raise ValueError("Expected one rehearsal task inside each live session")
    if "AI-PILOT" in ids or any(key.startswith("AI-PILOT-") for key in ids):
        raise ValueError("Rehearsals must remain inside their session tasks")
    deliver_ids = [key for key in ids if re.fullmatch(r"AI-S\d{2}-DELIVER", key)]
    if len(deliver_ids) != 8 or any(by_id[key]["Time Estimate"] != "45 min" for key in deliver_ids):
        raise ValueError("Expected eight delivery tasks of 45 minutes")
    if any(row["Time Estimate"] for row in rows if row["Task ID"] not in deliver_ids):
        raise ValueError("Do not invent preparation estimates or double-count parent duration")
    return len(parents), len(children)


parent_count, child_count = validate()
encoded = json.dumps(rows, ensure_ascii=False, indent=2) + "\n"
if json.loads(encoded) != rows:
    raise ValueError("JSON round-trip failed")
OUTPUT.write_text(encoded, encoding="utf-8")

digest = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
guide = f"""# Import the instructor plan into ClickUp

Import **INSTRUCTOR_CLICKUP_PLAN.json**. It contains {parent_count} top-level tasks and {child_count} subtasks ({len(rows)} records): website and Google Meet setup, shared materials, eight session plans, and course follow-up. There is one handout-preparation task and one website-quiz task for each of the ten topics. Each session contains its own rehearsal task.

The file is a flat JSON array of task rows for ClickUp's Spreadsheet Importer. Each parent row identifies its children in Subtask IDs. It is not an API request body and has no project metadata wrapper. Names are prefixed for sorting; dates and assignees are intentionally absent.

## Import steps

1. Open Workspace settings → Imports / Exports → Import items → Spreadsheet, or use the Spreadsheet import option from a Space or Folder.
2. Choose the destination for this AI-course instructor plan. No ClickUp workspace or List ID is embedded in the file.
3. Set the multi-value delimiter to **pipe: |**. The Subtask IDs, Checklist, and Tags columns all use it.
4. Upload INSTRUCTOR_CLICKUP_PLAN.json and review the field mappings below.
5. Map the incoming status “to do” to your destination's existing starting status. Map time estimates as minutes and confirm each delivery task displays **45 minutes**, not 45 hours.
6. Review the preview, then import. Confirm {parent_count} top-level tasks, {child_count} subtasks, ten handout tasks, ten quiz tasks, eight rehearsal tasks, and eight delivery tasks. Review the import report for rejected rows or fields.

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

Source SHA-256 at generation: {digest}

## Official ClickUp references

- [Supported import formats and subtask-ID structure](https://help.clickup.com/hc/en-us/articles/6310821748759-Prepare-a-spreadsheet-for-import)
- [Supported task fields](https://help.clickup.com/hc/en-us/articles/6310876671255-Fields-supported-by-the-Spreadsheets-importer)
- [Spreadsheet Importer workflow](https://help.clickup.com/hc/en-us/articles/6310834724247-Use-the-Spreadsheets-Importer)
"""
GUIDE.write_text(guide, encoding="utf-8")


def overview_markdown():
    child_ids = {
        child for row in rows
        for child in row["Subtask IDs"].split(DELIMITER) if child
    }
    parents = [row for row in rows if row["Task ID"] not in child_ids]

    def clean_name(row):
        return re.sub(r"^\d+(?:\.\d+)? - ", "", row["Task Name"])

    def children(row):
        return [by_id[key] for key in row["Subtask IDs"].split(DELIMITER) if key]

    def anchor(key):
        return key.lower()

    def text_section(row, label):
        match = re.search(
            rf"(?:^|\n\n){re.escape(label)}\n(.*?)(?=\n\n[A-Z][A-Z ]+\n|\Z)",
            row["Description content"], re.DOTALL,
        )
        return match.group(1).strip() if match else ""

    lines = [
        "# Instructor task overview",
        "",
        f"**{parent_count} main tasks · {child_count} subtasks · 10 topic documents · 10 quizzes · 8 live sessions**",
        "",
        "A readable view of [INSTRUCTOR_CLICKUP_PLAN.json](INSTRUCTOR_CLICKUP_PLAN.json). "
        "All items are currently **To do** in the export. These are planned instructor tasks; "
        "this page does not report live ClickUp status or completed handouts.",
        "",
        "## Course at a glance",
        "",
        "| Work area | Main tasks | Subtasks | Result |",
        "|---|---:|---:|---|",
        "| Website, Google Meet, and course setup | 1 | 9 | Learner hub and delivery environment ready |",
        "| Shared materials | 1 | 5 | Common case, templates, answer keys, and fallbacks ready |",
        "| Eight sessions | 8 | 60 | Ten handouts, ten quizzes, rehearsals, eight lessons, and reviewed learner work |",
        "| Course follow-up | 1 | 4 | Results, coaching, current references, and improvements |",
        f"| **Total** | **{parent_count}** | **{child_count}** | **{len(rows)} task records** |",
        "",
        "**Live time:** 8 × 45 minutes = **6 hours**. Each session reserves "
        "**40 minutes for planned activity + 5 minutes of contingency**. "
        "Instructor preparation and follow-up need separate time.",
        "",
        "```mermaid",
        "flowchart LR",
        '  A["Build website and configure Google Meet"] --> B["Prepare shared materials"]',
        '  B --> C["Create each topic document and quiz"]',
        '  C --> R["Rehearse its session in Google Meet"]',
        '  R --> D["Publish and deliver Sessions 1 to 8"]',
        '  D --> E["Review results and follow up"]',
        "```",
        "",
        "This is a course overview, not the complete dependency graph. "
        "Session preparation can overlap; delivery follows session order. "
        "Each session has its own rehearsal after its documents, quizzes, and run sheet are ready and before the materials are released.",
        "",
        "## Sessions and their documents",
        "",
        "| Session | Topic | Documents | Quizzes | Work from | Learner output |",
        "|---|---|---|---:|---|---|",
    ]
    short_titles = {
        1: "AI foundations and capabilities", 2: "Language models and limitations",
        3: "Effective prompting", 4: "Risk-based verification",
        5: "Data protection and responsible use", 6: "Use cases and workflow pilots",
        7: "Customer discovery", 8: "Talent Genie conversations",
    }
    short_outcomes = {
        1: "60-second explanation + scenario choices",
        2: "Plain-language explanation",
        3: "Improved prompt + justified revision",
        4: "Verification log + review level",
        5: "Data decisions + incident response",
        6: "One-page pilot proposal",
        7: "Discovery notes + problem statement",
        8: "Three talk tracks + one role-play",
    }
    for n, _, documents, working, _, _ in session_specs:
        docs = " + ".join(f"{d:02d}" for d in documents)
        lines.append(
            f"| [Session {n}](#ai-s{n:02d}) | {short_titles[n]} | {docs} | {len(documents)} | "
            f"Document {working:02d} | {short_outcomes[n]} |"
        )
    lines += [
        "",
        "In Session 1, Document 01 is the read-after reference and Document 02 is the working sheet. "
        "In Session 6, Document 05 is the read-after reference and Document 08 is the working sheet. "
        "Both documents in each pair remain separately shareable.",
        "",
        "## Main task map",
        "",
        "| Main task | Subtasks | Status |",
        "|---|---:|---|",
    ]
    for row in parents:
        lines.append(
            f"| [{clean_name(row)}](#{anchor(row['Task ID'])}) | "
            f"{len(children(row))} | To do |"
        )
    lines += [
        "",
        "## Full task checklist",
        "",
        f"Every parent task and all {child_count} subtasks from the JSON appear below. "
        "Codes identify the matching import rows. Completion checkboxes here are a reading aid; "
        "checking them does not update the JSON or ClickUp.",
        "",
    ]
    seen = set()
    for row in parents:
        task_id = row["Task ID"]
        kids = children(row)
        seen.add(task_id)
        lines += [
            f'<a id="{anchor(task_id)}"></a>',
            "",
            f"### {row['Task Name']}",
            "",
            f"**To do · {len(kids)} subtasks** · `{task_id}`",
            "",
        ]
        if re.fullmatch(r"AI-S\d{2}", task_id):
            n = int(task_id[-2:])
            _, _, documents, working, outcome, _ = session_specs[n - 1]
            docs = " + ".join(f"{d:02d}" for d in documents)
            lines += [
                f"**Website:** Documents {docs} and {len(documents)} topic quiz"
                f"{'zes' if len(documents) != 1 else ''}. **Working document:** {working:02d}. "
                "**Live delivery:** Google Meet, 45 minutes.",
                "",
                f"**Learner outcome:** {outcome}",
                "",
            ]
        for child in kids:
            seen.add(child["Task ID"])
            duration = f" — **{child['Time Estimate']}**" if child["Time Estimate"] else ""
            lines.append(
                f"- [ ] {clean_name(child)}{duration} · `{child['Task ID']}`"
            )
        lines += ["", f"**Complete when:** {text_section(row, 'DONE WHEN')}", ""]
        if task_id == "AI-SETUP":
            lines += [
                "> **Setup outcome:** a small course website with eight session pages, ten document sections, "
                "and ten quizzes; eight Google Meet events; approved tool/data rules; the company incident route; "
                "and Talent Genie product facts. Dates, actual assignees, website access, and quiz tracking still need confirmation.",
                "",
            ]
        elif task_id == "AI-S04":
            lines += [
                "> **Teaching emphasis:** choose checking effort according to consequences, "
                "then verify the claims. The exercise includes three planted material errors.",
                "",
            ]
        elif task_id == "AI-S05":
            lines += [
                "> **Live essentials:** data permission decisions, bias recognition, human accountability, "
                "incident response, and a brief content-reuse reminder. Company-specific guidance needs reviewed policy references.",
                "",
            ]
        elif task_id == "AI-S06":
            lines += [
                "> **Scope:** learners improve a supplied workflow. Independent workflow mapping "
                "requires an additional exercise outside this course. Document 05 can use generic business examples.",
                "",
            ]
        elif task_id == "AI-S08":
            lines += [
                "> **Dependency:** the approved Talent Genie brief is required for Document 10. "
                "Three six-minute rounds allow every learner in a group of three to practice; "
                "role changes are separately budgeted. Peer feedback is not formal certification.",
                "",
            ]
    if seen != set(by_id):
        raise ValueError("The Markdown overview must include every JSON task exactly once in its checklist")

    lines += [
        "## Document and quiz production map",
        "",
        "Each row represents one document task and one quiz task already included inside its session.",
        "",
        "| Topic | Document title | Session | Website quiz | Use in session |",
        "|---|---|---|---|---|",
    ]
    for d in range(1, 11):
        n, _, _, working, _, _ = next(spec for spec in session_specs if d in spec[2])
        role = "Working document" if d == working else "Read-after reference"
        lines.append(f"| {d:02d} | {topics[d][0]} | [Session {n}](#ai-s{n:02d}) | 3–5 questions with feedback | {role} |")
    lines += [
        "",
        "## Start here",
        "",
        "1. Define the website access and quiz-result model; configure the eight Google Meet events.",
        "2. Build and test the small course website, then prepare the fictional case pack and common document structure.",
        "3. Prepare Documents 01 and 02 and their quizzes, then rehearse Session 1 through Google Meet and the website.",
        "4. Prepare and rehearse later sessions in parallel where practical; use the prerequisite references "
        "in the JSON descriptions to identify release and delivery gates.",
        "",
        "Generic drafting can proceed while the Talent Genie brief is pending. "
        "Finish company-specific policy content before releasing the affected materials.",
        "",
        "**Files:** [Task import JSON](INSTRUCTOR_CLICKUP_PLAN.json) · "
        "[Import instructions](CLICKUP_IMPORT.md) · [Course design](COURSE_PLAN.md)",
        "",
        "This overview is generated from the same task records as the JSON. "
        "Regenerate both with `python3 scripts/build-instructor-plan.py` after updating the course or instructor task definitions.",
        "",
    ]
    result = "\n".join(lines)
    if result.count("- [ ] ") != child_count:
        raise ValueError("Markdown checkbox count does not match the subtask count")
    return result


OVERVIEW.write_text(overview_markdown(), encoding="utf-8")
print(f"Created {OUTPUT.name}: {parent_count} parent tasks, {child_count} subtasks, {len(rows)} rows.")
print("Validated 10 handouts, 10 topic quizzes, 8 in-session rehearsals, 8 delivery agendas, hierarchy, prerequisites, and JSON syntax.")
print(f"Import mapping guide: {GUIDE.name}")
print(f"Visual task overview: {OVERVIEW.name}")
