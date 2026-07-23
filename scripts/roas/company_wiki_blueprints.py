"""Human-authored executable SOP blueprints for the ROAS Company Wiki rebuild."""

from __future__ import annotations

from typing import TypedDict


class DecisionRule(TypedDict):
    condition: str
    action: str
    rationale: str


class TopicBlueprint(TypedDict):
    outcome: str
    steps: list[str]
    rules: list[DecisionRule]


def rule(condition: str, action: str, rationale: str) -> DecisionRule:
    return {"condition": condition, "action": action, "rationale": rationale}


BLUEPRINTS: dict[str, TopicBlueprint] = {
    "About ROAS and the Operating Model": {
        "outcome": "A teammate can explain how ROAS creates client outcomes, where work is managed, and how decisions move from evidence to execution.",
        "steps": [
            "Start every engagement by naming the client outcome, the measurable commercial goal, and the customer journey that must change; record all three in the campaign brief.",
            "Map the work into strategy, acquisition, conversion, delivery, and measurement streams, then assign one accountable functional owner to each stream.",
            "Choose one system of record for tasks, one for approved client communication, one for source assets, and one for reported performance; link them from the campaign brief.",
            "Translate the goal into weekly leading indicators and lagging outcomes so the team can distinguish activity from business progress.",
            "Create dependencies and quality gates before production begins; no downstream owner should have to infer whether an upstream input is approved.",
            "Run work through unit review and final review, attaching evidence for every pass rather than relying on verbal confirmation.",
            "Raise conflicts between client requests, evidence, and operating standards in the decision log with an owner and a required-by date.",
            "Close each cycle by comparing the observed result with the intended outcome, recording what changed, and updating the relevant SOP when the learning is reusable.",
        ],
        "rules": [
            rule("A request has no measurable outcome", "Return it for clarification before assigning production work.", "A deliverable cannot be evaluated without a success condition."),
            rule("Two systems show different task or approval states", "Treat the designated system of record as authoritative and reconcile the other system.", "Parallel truths create missed handoffs."),
            rule("A client preference conflicts with law, platform policy, or a verified technical constraint", "Pause the affected work and escalate with evidence and alternatives.", "Compliance and technical integrity are non-negotiable gates."),
            rule("A learning applies to more than one campaign", "Submit it for wiki and Cortex review after removing client-specific identifiers.", "Reusable operating knowledge belongs at company level."),
        ],
    },
    "Campaign Success Checklist": {
        "outcome": "A campaign enters production or launch only when the offer, assets, funnel, tracking, follow-up, ownership, and measurement path are provably ready.",
        "steps": [
            "Open a campaign readiness record and list the primary conversion, target audience, offer, traffic source, launch window, and accountable launch owner.",
            "Verify the offer is specific, fulfillable, supported by proof, and consistent across ads, pages, sales material, checkout, and delivery expectations.",
            "Confirm every required brand, copy, image, video, testimonial, legal, and technical asset exists in the linked source folder and has an approval state.",
            "Walk the full customer journey from first impression through conversion, confirmation, follow-up, sales handoff, purchase, and fulfillment; record every broken or unclear transition.",
            "Submit test records through forms, calendars, checkout, CRM, notifications, automations, and reporting; preserve screenshots or record IDs as evidence.",
            "Validate attribution parameters, conversion events, reporting definitions, budget, dates, geography, audience, and suppression rules against the approved brief.",
            "Run unit-owner review for each workstream, then a separate final review of the integrated journey; log every failure with owner and retest requirement.",
            "Hold a launch-go decision with all blocking items resolved, approved exceptions documented, monitoring owners assigned, and rollback actions prepared.",
            "After launch, inspect delivery, spend, conversion events, lead routing, and customer experience at the agreed checkpoints before scaling or declaring success.",
        ],
        "rules": [
            rule("Any critical path test fails", "Set launch status to blocked and assign a correction plus retest.", "A known broken journey should never receive live traffic."),
            rule("A noncritical cosmetic issue remains", "Launch only with written acceptance, owner, and due date.", "Minor debt may be bounded without hiding it."),
            rule("Tracking and platform totals disagree materially", "Pause optimization decisions and reconcile the measurement path first.", "Bad data produces bad campaign decisions."),
            rule("No single person owns launch monitoring", "Do not launch until one owner and one backup are named.", "Incidents require immediate accountable response."),
        ],
    },
    "Client Fit Qualification": {
        "outcome": "ROAS accepts, scopes, or declines opportunities using evidence about offer readiness, economics, access, delivery capacity, and working fit.",
        "steps": [
            "Capture the prospect's offer, market, price, fulfillment model, current acquisition channels, historical results, sales process, and desired outcome in the qualification record.",
            "Verify the problem ROAS is being asked to solve and separate acquisition, conversion, sales, fulfillment, cash-flow, and measurement constraints.",
            "Request source evidence for performance claims, including ad-platform views, CRM outcomes, payment data, call outcomes, and existing assets where applicable.",
            "Assess offer clarity, proof, delivery capacity, margin, customer value, sales capacity, and speed-to-lead before estimating a media or funnel solution.",
            "Identify required access, client responsibilities, decision-makers, approval speed, and any legal or platform constraints that affect delivery.",
            "Score readiness as ready, conditionally ready, discovery required, or not fit; attach the reasons and the evidence behind each gap.",
            "Build a scope that addresses the verified constraint, explicitly excluding work that would not change the expected outcome.",
            "Present the recommendation, dependencies, risks, client commitments, success measures, and first decision gate before contracting or kickoff.",
        ],
        "rules": [
            rule("The offer has no credible proof or validated demand", "Recommend validation work before scaled acquisition.", "Media cannot repair an unvalidated offer."),
            rule("The client cannot support lead response or fulfillment volume", "Reduce scope, add an operational dependency, or decline the launch.", "Growth that cannot be serviced creates loss and reputational risk."),
            rule("Performance evidence is unavailable or contradictory", "Use a discovery phase and label all forecasts as unverified.", "A confident plan requires trustworthy baselines."),
            rule("The primary request conflicts with policy or law", "Decline that tactic and document compliant alternatives.", "Commercial pressure does not override compliance."),
        ],
    },
    "Client Fulfillment Operating Principles": {
        "outcome": "Every client receives predictable ownership, visible progress, evidence-based recommendations, and controlled handoffs from kickoff through renewal or offboarding.",
        "steps": [
            "Convert the sold scope into a delivery map containing outcomes, deliverables, exclusions, dependencies, owners, review gates, and target dates.",
            "Create the client-facing communication cadence and state where requests, approvals, decisions, and urgent incidents must be sent.",
            "Maintain one current campaign brief and one current task system; link source assets and decisions instead of duplicating untracked copies.",
            "Require each work item to include its purpose, input, owner, acceptance condition, reviewer, due date, and destination before work begins.",
            "Surface risk as soon as evidence appears, describing the impact, the decision needed, the options, and the latest safe decision date.",
            "Use data and customer evidence to recommend changes; distinguish observations, interpretations, tests, and decisions in updates.",
            "Run every material deliverable through the appropriate quality gate and preserve the reviewed version plus correction history.",
            "Review outcomes and relationship health on a fixed cadence, then adjust scope, process, or expectations through an explicit decision.",
        ],
        "rules": [
            rule("A request is outside the agreed scope", "Acknowledge it, assess impact, and obtain a scope decision before scheduling it.", "Uncontrolled additions displace committed outcomes."),
            rule("A dependency is late", "Recalculate the critical path and notify affected owners immediately.", "Hidden dependency delays compound downstream."),
            rule("Client feedback conflicts with performance evidence", "Present both, propose a bounded test, and record the decision.", "Neither opinion nor a single metric should silently dominate."),
            rule("The team cannot meet the communicated deadline", "Escalate before the deadline with a recovery plan and new commitment.", "Early truth preserves options and trust."),
        ],
    },
    "Client Kickoff Preparation": {
        "outcome": "The kickoff begins with a verified scope, complete attendee list, known decisions, organized evidence, and a clear first delivery path.",
        "steps": [
            "Review the signed scope, sales notes, qualification record, promised dates, exclusions, and dependencies; resolve contradictions before inviting the client.",
            "Create the campaign workspace, source folder, decision log, task template, communication channel, and access checklist using the approved naming standard.",
            "List required client participants by decision role, not just job title, and identify the final approver plus a backup contact.",
            "Send the intake package with a due date and exact requested artifacts: offer details, audience research, proof, brand assets, tracking access, funnel access, CRM access, and reporting baselines.",
            "Audit submitted materials for completeness and record gaps as kickoff decisions or blocked dependencies rather than silently carrying them forward.",
            "Draft the kickoff agenda around outcomes, current state, constraints, responsibilities, communication, milestones, risk, and immediate next actions.",
            "Prepare specific questions for unclear economics, offer terms, claims, sales handling, fulfillment capacity, technical ownership, and approval timing.",
            "Confirm meeting logistics, recording permission, note owner, time zone, links, and follow-up deadline at least one business day before the call.",
            "Hold an internal pre-kickoff review and mark the meeting ready only when the owner can state the desired decisions and the first-week plan.",
        ],
        "rules": [
            rule("The signed scope and sales promise disagree", "Pause kickoff commitments and obtain an internal scope decision.", "The delivery team cannot inherit an unresolved commercial contradiction."),
            rule("A critical decision-maker cannot attend", "Reschedule or define a written approval path before the meeting.", "Kickoffs without decision authority create rework."),
            rule("Critical access is missing", "Keep the item as a named blocker with owner and deadline; do not promise its dependent milestone.", "Dates must reflect real dependencies."),
            rule("The intake is mostly incomplete", "Convert kickoff into a structured discovery session and reset the delivery baseline afterward.", "Pretending readiness hides uncertainty."),
        ],
    },
    "Client Request Intake and Response": {
        "outcome": "Every client request is acknowledged, clarified, prioritized, assigned, and closed without being lost in chat or silently changing scope.",
        "steps": [
            "Capture the original request in the task system with sender, timestamp, source link, requested date, affected campaign, and exact wording.",
            "Acknowledge receipt in the client channel and state when the team will return with a decision or delivery estimate; do not promise completion before triage.",
            "Clarify the desired outcome, urgency driver, acceptance condition, affected assets, audience, and whether the request replaces an earlier decision.",
            "Classify the request as incident, correction, in-scope task, change request, question, approval, or idea and route it to the matching owner.",
            "Assess dependencies, risk, effort, opportunity cost, and effect on committed dates; attach that assessment to the request record.",
            "Return a clear response: accepted with owner/date, needs information, proposed alternative, scope decision required, or declined with reason.",
            "If accepted, update the delivery plan and notify every downstream owner whose work or due date changes.",
            "Close the request only after the client-facing response, completed evidence, and any resulting decision are linked to the record.",
        ],
        "rules": [
            rule("The request reports active customer, spend, access, or compliance harm", "Classify it as an incident and use the escalation process immediately.", "Active harm takes priority over normal queue order."),
            rule("The request lacks an outcome or acceptance condition", "Ask targeted clarification questions before estimating it.", "Ambiguous work creates avoidable revisions."),
            rule("The request changes scope or a committed milestone", "Obtain an authorized trade-off decision before scheduling it.", "Priorities cannot change invisibly."),
            rule("The same question recurs", "Answer it, then update the relevant wiki page or template.", "Repeated questions indicate missing operational knowledge."),
        ],
    },
    "Client Welcome Call": {
        "outcome": "The client leaves the welcome call knowing the team, communication rules, immediate responsibilities, timeline, and exact next step.",
        "steps": [
            "Confirm the account, scope, participants, final approver, time zone, and recording permission before starting the agenda.",
            "Set the purpose of the call: establish the working relationship and operating rules, not solve every strategic question live.",
            "Introduce functional roles, explain who owns strategy, delivery, approvals, reporting, and escalation, and record any client-side counterparts.",
            "Review the agreed outcome, scope boundaries, major milestones, known dependencies, and the definition of a successful first phase.",
            "Demonstrate where requests, approvals, files, meetings, tasks, and performance updates live; have the client confirm access during the call.",
            "Explain response expectations, meeting cadence, approval deadlines, urgent escalation path, and what happens when client inputs are late.",
            "Walk through the outstanding intake and access checklist, assigning one owner and one due date to every missing item.",
            "Recap decisions, risks, first-week work, and the next meeting; ask each decision-maker to confirm their responsibility.",
            "Send the written recap and task links within the agreed follow-up window, then verify that critical client owners received them.",
        ],
        "rules": [
            rule("The client asks for material work outside scope", "Record it for a separate scope decision rather than agreeing during the call.", "Welcome calls should not create undocumented obligations."),
            rule("The final approver is unclear", "Do not finalize the approval workflow until one person and backup are named.", "Unclear authority causes late-stage reversals."),
            rule("A critical platform or folder is inaccessible", "Troubleshoot live when safe, then assign an access owner and deadline.", "Access gaps should be visible immediately."),
            rule("The client cannot meet an input deadline", "Recalculate and communicate the affected milestone before closing the call.", "Dates must move with dependencies."),
        ],
    },
    "Launch Readiness and Team Visibility": {
        "outcome": "Every launch stakeholder can see current readiness, blockers, approvals, monitoring coverage, and the go/no-go decision from one record.",
        "steps": [
            "Create a launch record containing date, time zone, destination URLs, platforms, budgets, audiences, owners, approvers, and rollback contact.",
            "Pull every critical-path task into the readiness view and mark it not started, in progress, ready for review, passed, failed, or approved exception.",
            "Attach final copy, creative, funnel, automation, tracking, offer, legal, and client approval evidence to their corresponding gates.",
            "Run technical tests with identifiable test records and record timestamps, screenshots, event IDs, notification recipients, and observed results.",
            "Publish a blocker list that states impact, owner, correction, retest, and latest safe resolution time for each item.",
            "Assign launch-day monitoring windows for spend, delivery, links, conversion events, lead routing, sales response, and customer-facing errors.",
            "Hold the go/no-go review close enough to use current evidence but early enough to correct failures without rushed changes.",
            "Record the decision and approved configuration, freeze uncontrolled edits, and communicate the launch state to all affected functions.",
            "After launch, post checkpoint results in the same record and close readiness only after the stability window passes.",
        ],
        "rules": [
            rule("A blocking gate has no evidence", "Treat it as not passed, even if someone says it is complete.", "Readiness is an evidence state, not a confidence statement."),
            rule("A change occurs after final QA", "Retest every affected dependency before launch.", "Late changes invalidate earlier evidence."),
            rule("Monitoring coverage has a gap", "Assign coverage or move the launch window.", "An unobserved launch cannot be safely controlled."),
            rule("The team disagrees on go/no-go", "The designated launch authority decides from the recorded risk and alternatives.", "A named decision owner prevents ambiguous activation."),
        ],
    },
    "Mission, Vision, Values, and Culture": {
        "outcome": "Company principles become observable decision and behavior standards rather than slogans.",
        "steps": [
            "Read the current mission, vision, values, and operating principles before planning work that changes company positioning or team behavior.",
            "Translate each relevant value into an observable behavior for the current decision, including what the team will do and what it will refuse to do.",
            "Use the mission to test whether a proposed priority serves the intended customer and company outcome rather than only short-term activity.",
            "Use the vision to choose between alternatives with different long-term system effects, documenting the trade-off explicitly.",
            "When assigning work, state the ownership, evidence, communication, and quality behavior expected instead of assuming shared interpretation.",
            "Recognize examples that demonstrate the operating standard and correct examples that contradict it, regardless of seniority or role.",
            "Escalate repeated gaps as a system, skill, capacity, or accountability issue using specific evidence rather than character judgments.",
            "Review the written principles when company strategy materially changes and record any approved revision with its effective date.",
        ],
        "rules": [
            rule("A value cannot be translated into observable behavior", "Clarify or rewrite its operating definition before using it for evaluation.", "Ambiguous values cannot guide fair decisions."),
            rule("A profitable tactic conflicts with a stated customer or integrity standard", "Reject or redesign the tactic.", "Values matter most when there is a trade-off."),
            rule("Two values point toward different choices", "Name the conflict and let the accountable owner decide the priority for this context.", "Hidden trade-offs create inconsistent culture."),
            rule("A recurring behavior gap appears across several people", "Investigate the system, incentives, training, and capacity before treating it as individual failure.", "Patterns usually have structural causes."),
        ],
    },
    "Onboarding Intake and Speed-to-Lead": {
        "outcome": "A new client moves from signed agreement to complete, assigned, and usable delivery inputs with no avoidable waiting time.",
        "steps": [
            "Trigger the onboarding workflow immediately after the authoritative signed or paid state and record that timestamp as the starting baseline.",
            "Send one intake message containing the welcome path, booking link, intake form, access instructions, asset checklist, due dates, and support contact.",
            "Create the client workspace from the approved template and verify ownership, permissions, naming, and required views before sharing it.",
            "Assign an intake owner to monitor form completion, booked call, access grants, source assets, and unanswered questions at defined checkpoints.",
            "Review every submission for completeness and usability; convert missing, contradictory, or inaccessible inputs into owned follow-up tasks.",
            "Acknowledge received inputs and state the next visible milestone so the client is never uncertain about whether the team has begun.",
            "Escalate stalled critical inputs with the precise affected deliverable and revised date rather than sending generic reminders.",
            "Close onboarding intake only when the campaign brief is populated, required access works, owners are known, and kickoff can produce decisions.",
        ],
        "rules": [
            rule("The client has not booked the welcome or kickoff call within the expected window", "Send a direct reminder and alert the client owner.", "Early inactivity predicts delivery delay."),
            rule("Credentials are sent in plain text", "Move them to the approved secure access method and remove the exposed message when possible.", "The wiki and task system must not store secrets."),
            rule("An input is present but unusable", "Explain the exact defect and request a corrected version with an example.", "Checking a box is not the same as receiving a usable asset."),
            rule("A missing input does not affect the first workstream", "Begin the unblocked work and keep the dependency visible.", "Speed improves when independent work is separated from blockers."),
        ],
    },
    "Performance Issue Escalation": {
        "outcome": "Performance problems are detected, evidenced, contained, assigned, and resolved without blame, delay, or unsupported changes.",
        "steps": [
            "Open an escalation record when a monitored result breaches its agreed guardrail or a credible stakeholder reports material harm.",
            "State the symptom, first observed time, affected audience or systems, severity, current owner, and what is still unknown.",
            "Preserve baseline evidence from platforms, analytics, CRM, sales, customer feedback, recent changes, and delivery status before editing the system.",
            "Contain active harm using the least destructive reversible action, such as pausing the affected unit while preserving unaffected work.",
            "Separate measurement failure, traffic failure, conversion failure, sales failure, offer failure, fulfillment failure, and external change as competing hypotheses.",
            "Test the highest-risk and highest-likelihood hypotheses with named evidence; record disproven explanations so the team does not repeat them.",
            "Present the accountable decision owner with the root cause, impact, options, recommendation, rollback, and next evidence checkpoint.",
            "Implement the approved correction, validate the full affected journey, and monitor long enough to distinguish recovery from temporary noise.",
            "Close with a plain-language incident summary and update the relevant checklist, alert, training, or SOP to prevent recurrence.",
        ],
        "rules": [
            rule("Active spend or customer harm is continuing", "Contain first and investigate second, preserving evidence before the change.", "Ongoing loss increases while analysis continues."),
            rule("The data source itself is unreliable", "Stop optimization changes and repair measurement before interpreting performance.", "Untrusted signals cannot guide corrective action."),
            rule("The issue affects one unit only", "Isolate that unit instead of resetting the whole system.", "Bounded containment preserves useful learning."),
            rule("No root cause is confirmed", "Use a reversible test with explicit success and rollback conditions.", "Uncertainty should produce controlled experiments, not confident rewrites."),
        ],
    },
    "Pre-Launch QA Checklist": {
        "outcome": "The complete customer and data journey passes repeatable desktop, mobile, integration, attribution, and communication tests before exposure.",
        "steps": [
            "Freeze the candidate launch version and record URLs, asset versions, automation versions, campaign settings, tester, browser, device, and test time.",
            "Compare every visible promise, date, price, guarantee, CTA, name, and legal statement with the approved source of truth.",
            "Test each page on representative desktop and mobile sizes for load, layout, navigation, forms, validation, media, accessibility basics, and competing actions.",
            "Submit uniquely labeled test leads through every entry path and verify attribution parameters, conversion events, CRM record, pipeline stage, owner, and notifications.",
            "Test calendar, checkout, confirmation, replay or thank-you, email, SMS, suppression, buyer exclusion, and internal alert paths where applicable.",
            "Verify ad-platform configuration, budget, dates, geography, audience, exclusions, placements, destination, identity, tracking, and policy state against the brief.",
            "Record each check as pass, fail, not applicable, or approved exception with screenshot, record ID, or observed output.",
            "Retest every failed item after correction and rerun upstream/downstream checks when the change could affect them.",
            "Obtain final reviewer approval only after all blocking checks pass and no uncontrolled edit has occurred since the evidence was captured.",
        ],
        "rules": [
            rule("A test lead does not reach its owner with attribution", "Block launch and repair routing or tracking.", "A lead that cannot be acted on or measured is a failed conversion path."),
            rule("A date, price, offer, or claim differs across assets", "Block the inconsistent assets until the authoritative value is applied everywhere.", "Commercial inconsistency damages trust and may create legal risk."),
            rule("Only one device class has been tested", "Keep QA incomplete until both mobile and desktop pass where relevant.", "Most funnels fail differently across form factors."),
            rule("A post-QA change touches code, copy, links, automation, or targeting", "Invalidate and rerun the affected checks.", "QA evidence belongs to a specific version."),
        ],
    },
    "Project Setup and Task Ownership": {
        "outcome": "A new project is organized so every deliverable has one accountable owner, clear inputs, dependencies, acceptance evidence, and a visible handoff.",
        "steps": [
            "Select the approved project template that matches the sold scope, then remove irrelevant work instead of leaving false obligations in the plan.",
            "Create the project naming, campaign link, client link, source folder, communication channel, and decision log before adding production work.",
            "Translate each deliverable into tasks small enough to have one outcome, one accountable owner, one reviewer, and one completion condition.",
            "Add required inputs, source links, dependencies, due date, priority, audience, destination, and acceptance evidence to every critical task.",
            "Sequence tasks by real dependency and review gates rather than giving every task the launch date.",
            "Assign ownership directly and confirm capacity; watchers, teams, or mentions do not replace one accountable owner.",
            "Create status definitions and require owners to keep status, blocker, due date, and next action current during the operating cadence.",
            "Test the plan by walking from first input to final outcome and confirming that every handoff has a receiver and no duplicate source of truth exists.",
        ],
        "rules": [
            rule("A task has several possible owners", "Choose one accountable owner and list contributors separately.", "Shared ownership often becomes no ownership."),
            rule("A task lacks a testable completion condition", "Rewrite it before work begins.", "Activity cannot be reviewed as an outcome."),
            rule("A due date precedes a required dependency", "Correct the sequence and communicate the affected milestone.", "Impossible plans hide risk."),
            rule("A template task does not apply", "Remove it and record any downstream dependency change.", "Noise makes the real plan harder to manage."),
        ],
    },
    "QA Metrics and Review": {
        "outcome": "ROAS measures quality with repeatable failure categories, review evidence, correction time, and recurrence data—not subjective impressions alone.",
        "steps": [
            "Define the quality dimensions for the deliverable, including factual accuracy, message consistency, technical function, compliance, brand fit, and acceptance criteria.",
            "Create pass/fail checks for each dimension and identify which failures block delivery versus require bounded follow-up.",
            "Record every review with deliverable version, reviewer, date, checks run, failures, evidence, and final disposition.",
            "Classify failures by source: missing input, unclear brief, production error, integration error, review miss, late change, or process gap.",
            "Measure first-pass yield, failures per deliverable, correction cycle time, escaped defects, repeat defects, and overdue reviews on the agreed cadence.",
            "Review trends by process and failure type without using raw counts to compare unlike roles or work volumes.",
            "Assign systemic corrective action when a pattern crosses several deliverables, owners, or clients; link the new control to the evidence.",
            "Verify that corrective actions reduce recurrence, then update the checklist or training rather than leaving an informal lesson.",
        ],
        "rules": [
            rule("A defect reaches the client or live customer", "Record it as an escaped defect and run root-cause review.", "External impact requires prevention, not only correction."),
            rule("The same defect repeats", "Treat it as a process or training failure, not an isolated mistake.", "Recurrence proves the earlier control was insufficient."),
            rule("A metric rewards speed at the expense of quality", "Pair it with outcome and escaped-defect measures.", "Single metrics create distorted behavior."),
            rule("Reviewers interpret a check differently", "Clarify the acceptance example and recalibrate reviewers.", "A quality system must be reproducible."),
        ],
    },
    "Quality Standard: Ten Operating Rules": {
        "outcome": "Teammates apply one shared quality standard to briefs, execution, review, evidence, communication, and continuous improvement.",
        "steps": [
            "Start from an approved outcome and source; never create a deliverable from an unverified chat fragment when a canonical brief exists.",
            "Name one accountable owner, one reviewer, and one acceptance condition for every material work item.",
            "Verify facts, links, dates, prices, claims, identities, and configuration against their source before submitting work.",
            "Test the complete customer and data journey, not only the visible asset or isolated component.",
            "Use functional checklists and evidence; memory, confidence, and verbal confirmation do not constitute a passed review.",
            "Raise uncertainty, blockers, and conflicts early with impact, options, recommendation, and decision date.",
            "Separate unit review from final integrated review so creators do not provide the only approval of their own work.",
            "Treat any edit after QA as a version change and retest the affected path.",
            "Correct the source of a recurring defect—brief, template, training, access, capacity, or system—rather than repeatedly repairing outputs.",
            "Close the loop by recording the result and updating reusable company knowledge when the lesson applies beyond one task.",
        ],
        "rules": [
            rule("The source of truth is unclear", "Pause and resolve the authoritative source before production.", "Working from conflicting inputs guarantees rework."),
            rule("The creator is also the only reviewer", "Add an independent review for material deliverables.", "Fresh review catches assumptions the creator cannot see."),
            rule("A late change is requested", "Assess affected checks and rerun them after the change.", "A passed prior version does not validate a new one."),
            rule("The same failure appears twice", "Open a prevention task tied to the process control.", "Repeat defects are system signals."),
        ],
    },
    "Retention, Resolution, and Offboarding": {
        "outcome": "Relationship risk is addressed with evidence and a recovery plan, while unavoidable exits preserve access security, assets, records, and professional closure.",
        "steps": [
            "Identify retention risk from performance, delivery, communication, expectation, payment, strategy, relationship, or client-capacity evidence and open a resolution record.",
            "Gather the sold scope, decisions, delivered work, results, open tasks, client feedback, commitments, invoices, and known constraints into one timeline.",
            "Separate correctable operating failures from strategy disagreement, expectation mismatch, external change, and fundamental lack of fit.",
            "Prepare a resolution proposal with acknowledged facts, corrective actions, owners, dates, success checks, client responsibilities, and a review point.",
            "Hold the resolution conversation with an authorized owner, document decisions, and avoid promising exceptions that have not been approved.",
            "If recovery is accepted, update the delivery plan and monitor the agreed leading indicators until the review point.",
            "If offboarding is chosen, confirm effective date, remaining obligations, asset transfer, final reporting, access removal, data handling, and communication responsibilities.",
            "Complete transfers using an inventory and recipient confirmation, then revoke access according to role and contractual timing without deleting required records.",
            "Close with a factual retrospective and anonymize only the reusable lesson for company knowledge review.",
        ],
        "rules": [
            rule("Active customer or financial harm exists", "Contain the harm before negotiating the broader relationship plan.", "Resolution cannot wait while damage continues."),
            rule("The recovery plan has no measurable checkpoint", "Do not present it until success and review timing are defined.", "Good intentions are not a recovery control."),
            rule("The client requests immediate access deletion", "Preserve legally or contractually required records and follow the approved security process.", "Deletion must respect obligations and evidence retention."),
            rule("A relationship is ending but work remains owed", "Inventory and decide every obligation explicitly.", "Ambiguous leftovers create disputes and security risk."),
        ],
    },
    "Systems of Record and Communication": {
        "outcome": "The team knows exactly where tasks, decisions, approvals, files, client communication, credentials, and performance truth belong.",
        "steps": [
            "Name the designated system for tasks, approved client communication, source files, decisions, credentials, performance reporting, and company knowledge.",
            "Create links between systems from the campaign home record so a teammate can navigate without searching private messages.",
            "Store only the minimum reference in secondary systems and link to the canonical record instead of copying content that will drift.",
            "Convert decisions and actionable requests from calls or chat into owned records with source link, due date, and acceptance condition.",
            "Keep credentials and recovery information in the approved secure access manager; never place secrets in tasks, chat, wiki pages, or ordinary documents.",
            "Apply naming, folder, permission, retention, and archival standards so current material is distinguishable from drafts and obsolete versions.",
            "Review access and stale records when roles, clients, projects, or vendors change, preserving required evidence while removing unnecessary reach.",
            "Audit a sample of active projects on the operating cadence and correct any conflicting source of truth immediately.",
        ],
        "rules": [
            rule("A decision exists only in a call or direct message", "Record it in the decision system and link the original context.", "Private memory cannot operate a team."),
            rule("Two records conflict", "Use the designated canonical system and reconcile the stale copy.", "Conflicting truths create execution errors."),
            rule("Sensitive credentials appear in an ordinary document", "Move them to secure storage and remove exposure where possible.", "Access secrets require controlled handling."),
            rule("A system cannot support the required ownership or evidence", "Use the approved alternate workflow and document the limitation.", "Tool convenience must not erase controls."),
        ],
    },
    "Two-Stage QC Workflow": {
        "outcome": "Every material deliverable receives a functional unit review and an independent final integrated review before client delivery or launch.",
        "steps": [
            "Define the unit checklist and final integrated checklist before production, including the authoritative brief and acceptance evidence.",
            "The creator self-checks the candidate version, freezes it, and submits the exact version with source links and known limitations.",
            "The unit reviewer tests specialist correctness: copy, creative, setup, tracking, automation, data, policy, or other domain requirements.",
            "The unit reviewer records each check as pass, fail, or not applicable and returns failed work with exact correction and retest evidence required.",
            "The creator corrects failures without altering unrelated approved elements and resubmits a new identified version.",
            "After unit pass, the final reviewer tests the integrated customer journey, cross-asset consistency, handoffs, and readiness against the campaign outcome.",
            "The final reviewer issues pass, fail, or approved exception; silence, comments, and partial review do not count as a pass.",
            "Any change after final pass reopens the affected checks; material changes require a new final review.",
            "Archive review evidence and deliver only the approved version to its destination.",
        ],
        "rules": [
            rule("Unit review fails", "Do not send the item to final review.", "Final review should evaluate integration, not substitute for specialist correction."),
            rule("The final reviewer finds a domain defect", "Return it to the unit owner and rerun both affected stages.", "A missed unit defect invalidates the earlier pass."),
            rule("A reviewer helped create the same material decision", "Assign an independent final reviewer where risk is material.", "Independence reduces shared blind spots."),
            rule("A post-pass change is purely administrative and cannot affect output", "Record it; otherwise reopen the affected tests.", "Only demonstrably nonfunctional edits retain prior evidence."),
        ],
    },
    "Weekly Client Check-In Call": {
        "outcome": "The weekly call produces decisions, risk resolution, and owned next actions—not a verbal recap that disappears afterward.",
        "steps": [
            "Prepare the agenda from the current goal, prior commitments, performance evidence, delivery status, open approvals, risks, and decisions needed.",
            "Send pre-read material early enough for the client to review and state which participants must attend for specific decisions.",
            "Open by confirming the intended outcome and any urgent change since the written update rather than reading every task aloud.",
            "Review outcomes and leading indicators against the agreed baseline, distinguishing verified data, interpretation, and open questions.",
            "Review completed work through its evidence and explain what decision or next step it enables.",
            "Address blockers and risks with impact, options, recommendation, owner, and latest safe decision date.",
            "Obtain explicit decisions and approvals during the call when authorized participants are present; record the exact decision and effective scope.",
            "Recap commitments by owner and date, confirm the next milestone, and ask for objections or missing context before ending.",
            "Publish notes, decisions, and updated tasks within the agreed follow-up window and verify all owners were notified.",
        ],
        "rules": [
            rule("There is no decision or material discussion required", "Use the written update and cancel or shorten the call with agreement.", "Meetings should earn their time."),
            rule("Required data is not trustworthy", "State the limitation and defer the affected conclusion.", "A polished presentation does not make bad data reliable."),
            rule("A decision-maker is absent", "Record the recommendation and obtain written approval by a named deadline.", "Discussion without authority should not masquerade as a decision."),
            rule("A new request changes priority", "Name the displaced work and obtain the trade-off decision.", "New work must not silently erase commitments."),
        ],
    },
    "Weekly Written Update": {
        "outcome": "The client receives a concise, evidence-backed record of outcomes, work completed, current priorities, risks, and decisions needed every week.",
        "steps": [
            "Pull the current goal, prior commitments, task status, performance sources, review evidence, client requests, and decision log before drafting.",
            "Lead with the executive outcome: what changed this week, why it matters, and whether the engagement is on track.",
            "Report key metrics with definition, date range, comparison, source, and interpretation; do not paste unexplained dashboards.",
            "List completed work as outcomes with links to the approved deliverable or evidence, not as activity counts.",
            "State the next priority and its expected result, owner, and target date so the client can see what happens next.",
            "Describe risks or blockers with impact, current action, owner, and decision or input needed from the client.",
            "Separate FYI information from explicit approvals and format every required decision as a direct question with a deadline.",
            "Verify names, dates, links, metrics, offer facts, and commitments against their sources before sending.",
            "Publish in the approved client channel, link the update to the project record, and convert responses into decisions or tasks.",
        ],
        "rules": [
            rule("A metric changed but the cause is unknown", "Report the observation and investigation plan without inventing an explanation.", "Trust requires separating fact from hypothesis."),
            rule("There was little visible output", "Explain the constraint, work performed, and recovery path directly.", "Silence creates more concern than a factual update."),
            rule("The client must decide something", "Put the decision in its own section with options, recommendation, and deadline.", "Buried approvals create delays."),
            rule("A result contains sensitive or person-specific detail", "Use the appropriate restricted channel and keep the general update at the necessary level.", "Team-wide visibility does not override privacy."),
        ],
    },
}
