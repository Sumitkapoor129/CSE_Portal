# Frontend Fix Brief B — admin/supervisor/student pages (FE-B)

Repo: `C:\Users\91983\Desktop\VibeCoded\CSE_portal`. You work ONLY in `frontend/src/`. All changes below are root-caused; implement them exactly as specified. Read each file before editing.

## Constraints
- Run `npm --prefix frontend run typecheck` — must pass.
- Run `npm --prefix frontend run lint` — must pass.
- Run `npm --prefix frontend test -- --run` — all 27 tests must pass. If any fail due to your changes, fix them.
- Do NOT run `npm run build` (another agent may also be running checks; dist race).
- Do NOT commit, do NOT git add. Do NOT modify files outside your ownership set.
- Do NOT touch any file in FE-A's ownership set (shared components, app shell, layout, auth pages). If you need constants from `utils/constants.ts`, add them yourself in this brief's scope.
- Write your full report to `C:\Users\91983\Desktop\VibeCoded\CSE_portal\.superpowers\sdd\debug-and-optimize\report-frontend-pages.md`.

## Ownership (exactly these files)
- `src/utils/constants.ts`
- `src/pages/admin/StudentManagement.tsx`
- `src/pages/admin/FacultyManagement.tsx`
- `src/pages/admin/EventManagement.tsx`
- `src/pages/admin/DeadlineManagement.tsx`
- `src/pages/admin/SrcCommitteeManagement.tsx`
- `src/pages/admin/FormManagement.tsx`
- `src/pages/admin/Approvals.tsx` (if exists in admin)
- `src/pages/supervisor/SupervisorEvents.tsx`
- `src/pages/supervisor/StudentList.tsx`
- `src/pages/supervisor/StudentDetail.tsx`
- `src/pages/student/StudentOnboarding.tsx`
- `src/pages/student/StudentCourses.tsx`
- `src/pages/student/StudentCredits.tsx`
- `src/pages/student/StudentDashboard.tsx`
- `src/pages/student/StudentNotifications.tsx`
- `src/pages/student/StudentDocuments.tsx`
- `src/api/admin.ts`

## 1. `src/utils/constants.ts` — badge style templates
Read the file first. Add TWO new exports following the existing pattern (e.g., `APPROVAL_STATUS_STYLE`):
```ts
export const ACTIVE_STATUS_STYLE: Record<string, string> = {
  className: 'bg-green-50 text-green-700 border-green-200',
};
export const INACTIVE_STATUS_STYLE: Record<string, string> = {
  className: 'bg-gray-50 text-gray-700 border-gray-200',
};
```
Or if the existing pattern is a flat string, match that shape exactly. Inspect the existing `APPROVAL_STATUS_STYLE` and follow the same structure. The important thing is that the two constants are usable as `<Badge className={ACTIVE_STATUS_STYLE.className}>` or `<Badge {...ACTIVE_STATUS_STYLE}>` — match whatever pattern the existing status styles use.

## 2. `src/pages/admin/StudentManagement.tsx`
Read the file first. Three fixes:

**(a) Create-student modal — PasswordInput:** In the "Add Student" modal form (around line 368), the password field uses plain `<Input type="password" ...>`. Replace with `<PasswordInput>` from `../../components/ui/PasswordInput`. Add `autoComplete="new-password"` to the field.

**(b) Active/inactive badge — constants:** Find the inline badge styling for active/inactive (lines 109-112 use `border border-green-200 text-green-700` / `border border-gray-200 text-gray-700` with inline className strings). Replace with the new `ACTIVE_STATUS_STYLE` / `INACTIVE_STATUS_STYLE` from constants. Import them at the top.

**(c) Empty table header — screen-reader label:** The table header for the photo column has `header: ''`. Change to `header: 'Photo'` (visible column header; add a hidden span if needed for layout: the column already shows a camera icon — just putting text in header is fine since the icon is also visual context). Alternatively, use a sr-only span: `header: <span className="sr-only">Photo</span>` if the table rendering supports JSX in header (check the component).

**(d) Remove buttons — aria-labels:** Add `aria-label={`Remove ${student.name || 'student'}`}` on any Remove/delete button.

## 3. `src/pages/admin/FacultyManagement.tsx`
Same three fixes as StudentManagement:
- (a) Create-faculty modal password field → `PasswordInput` with `autoComplete="new-password"`.
- (b) Active/inactive badge → `ACTIVE_STATUS_STYLE` / `INACTIVE_STATUS_STYLE` from constants.
- (c) Empty `header: ''` for photo → `'Photo'` or sr-only label.
- (d) Remove/delete buttons → `aria-label`.

## 4. `src/pages/admin/EventManagement.tsx` — note contrast
Root cause: `text-gray-400` helper note (line ~347) has ≈2.5:1 contrast.
Fix: change `text-gray-400` to `text-gray-600` on the note/helper text. Keep other gray-400 uses only if they're decorative.

## 5. `src/pages/supervisor/SupervisorEvents.tsx` — note contrast
Same fix: find `text-gray-400` on helper/note text (around line ~257), change to `text-gray-600`.

## 6. `src/pages/admin/DeadlineManagement.tsx` — semester as number
Root cause: `api.admin.createDeadline({ ..., semester: form.semester })` sends a string.
Fix: change to `semester: form.semester ? Number(form.semester) : undefined`. Also if the form default is a string, coerce appropriately.

## 7. `src/pages/admin/SrcCommitteeManagement.tsx`
Read the file. Two fixes:
- **Remove button aria-label:** Add `aria-label` on any Remove/delete buttons with the member name.
- **Checkbox group fieldset:** The member-type checkbox group (student checkboxes, around lines 138-141) — wrap in `<fieldset>` + `<legend>`. Keep existing layout/styling.

## 8. `src/pages/admin/FormManagement.tsx` — fieldset
Read the file. Wrap the "Applicable To" checkbox group (lines ~256-274, student type checkboxes) in `<fieldset>` + `<legend className="text-sm font-medium">Applicable To</legend>`.

## 9. `src/pages/supervisor/StudentList.tsx` — link affordance
Root cause: the "View Details" trigger looks like plain text, not a navigable link.
Fix: on the clickable element that navigates to student detail (around line ~143), add visual link affordance — `className` should include `text-blue-600 hover:text-blue-800 hover:underline cursor-pointer` (or use an actual `<Link>` if the current element is a `<button>` that does `navigate()`; if so, change it to a `<Link to={...}>` with the same classes). Read the file to determine the best approach.

## 10. `src/pages/supervisor/StudentDetail.tsx` — empty header
Fix: any `header: ''` in table columns → sr-only label or descriptive text (e.g., `'Evidence'` for document links).

## 11. `src/pages/student/StudentOnboarding.tsx`
Read the file. Three fixes:
- **(a) Step focus on change:** When the user advances to the next step (lines ~192-205), focus the first input of the new step (or the step heading). Use a ref: create `stepHeadingRef = useRef<HTMLHeadingElement>(null)` for each step's heading; when step changes, `stepHeadingRef.current?.focus()`. Add `tabIndex={-1}` to the heading so it can receive programmatic focus.
- **(b) Autocomplete attributes:** DOB field: add `autoComplete="bday"` and `type="date"` (if currently `type="text"` or no type). Phone: add `autoComplete="tel"` and `type="tel"` (if currently `type="number"` or no type). Email: add `autoComplete="email"` and `type="email"`. Read what's currently there and update only what's missing.
- **(c) `aria-current="step"` on active step indicator:** On the step indicator element for the current step, add `aria-current="step"`. Find the step indicator rendering (the numbered circles or progress markers) and add this attribute to the active one.

## 12. `src/pages/student/StudentCourses.tsx`
Read the file. Two fixes:
- **(a) Empty state CTA:** The empty state for "no courses" (around lines 155-160) is plain text. Wrap it in the shared `<EmptyState>` component from `../../components/shared/EmptyState` (import it; it already exists and is used elsewhere). Add an `action` prop with a `<Link to="/student/onboarding">` button labeled "Add Semester" (matching the existing onboarding link pattern in the file).
- **(b) Success banner margin:** If a success banner exists with no bottom margin, add `mb-6` to its wrapper for spacing before the cards below. (Only if visually needed — check the rendering.)

## 13. `src/pages/student/StudentCredits.tsx` — StatCard
Read the file. Root cause: hand-built stat cards (lines ~48-61) bypass the shared `<StatCard>` component.
Fix: replace the three hand-built stat cards with `<StatCard>` from `../../components/shared/StatCard`. Pass the existing label, value, description, and icon props. Check the StatCard component API first (read `src/components/shared/StatCard.tsx`) to match prop names.

## 14. `src/pages/student/StudentDashboard.tsx` — progressbar + link affordance
Read the file. Two fixes:
- **Milestone progress bar** (around line ~117): add `role="progressbar"`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-valuenow={Math.round(...)}` (compute the percentage). Also add `aria-label` describing what it measures.
- **Unread notifications link** (line ~383): add `aria-label="View all unread notifications"` to the link.

## 15. `src/pages/student/StudentNotifications.tsx` — link hover
Fix: on the "Open" / "Open & Mark Read" link (line ~147), add `hover:text-blue-700 transition-colors` to the className for visual feedback.

## 16. `src/pages/student/StudentDocuments.tsx` — empty headers
Fix: any `header: ''` columns → descriptive labels (e.g., `'Thumbnail'`, `'Preview'`, etc.). Read the file to determine what each empty-header column contains.

## 17. `src/api/admin.ts` — compact pickers
Read the file. Find `studentList` and `facultyList` functions. Add an optional `fields?: string` parameter that gets appended as `?fields=...` query param. This is additive and backward-compatible (no existing callers break).
Also find `createDeadline` and ensure the `semester` field in the request body is typed as `number | undefined` (not `string`). Check the type definition at the top of the file.

## Report
Write to the report file path above: summary, per-item status (done / deviation), test output summary, and any concerns. Return to me: one-line status, test counts, and any concerns.
