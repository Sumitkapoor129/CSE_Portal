# Backend API Documentation

PhD Scholar Management & Academic Tracking System

**Base URL:** `http://localhost:5000/api`

## Authentication

### Postman/API Notes

All protected endpoints require a Bearer token:
```
Authorization: Bearer <JWT_TOKEN>
```

Roles: `student`, `supervisor`, `admin`

---

## Auth Routes — `/api/auth`

| Method | Endpoint               | Auth  | Description                              |
| ------ | ---------------------- | ----- | ---------------------------------------- |
| POST   | `/register`            | None  | Register a student (sends OTP by email)  |
| POST   | `/verify-otp`          | None  | Verify OTP to activate account           |
| POST   | `/login`               | None  | Login any user, returns JWT token        |
| GET    | `/me`                  | Any   | Get currently logged-in user + profile   |
| PUT    | `/change-password`     | Any   | Change own password                      |

### Register body
```json
{ "email": "s@college.edu", "password": "secret1", "name": "Student", "collegeId": "CSE1001", "rollNumber": "22CS001", "studentType": "frp", "department": "CSE" }
```

> **Note:** Registration auto-seeds an 11-step milestone checklist for the new student (admission, src_formed, course_work, comprehensive_exam, topic_registration, enhancement_seminar, pre_submission, thesis_submitted, thesis_approved, defense, degree_awarded).

Student types: `frp` (full-time/regular research program) | `erp` (external research program).

### Verify OTP body
```json
{ "email": "s@college.edu", "otp": "123456" }
```

### Login body
```json
{ "email": "s@college.edu", "password": "secret1" }
```

---

## Student Routes — `/api/student` (role: `student`)

| Method | Endpoint                          | Description                                        |
| ------ | --------------------------------- | -------------------------------------------------- |
| GET    | `/profile`                        | View own complete profile                          |
| PUT    | `/profile`                        | Update profile (name, researchArea, profilePhoto)  |
| GET    | `/semesters`                      | List own semesters                                 |
| POST   | `/semesters`                      | Create a new semester                              |
| GET    | `/semesters/:semesterId/courses`  | List courses of a semester                         |
| POST   | `/semesters/:semesterId/courses`  | Request to add a course (pending approval)         |
| GET    | `/credits`                        | Credits per semester + total earned (query `?semesterId=`). Credits auto-computed from approved StudentCourse↔Course joins via `src/services/creditService.ts` |
| GET    | `/documents`                      | List uploaded documents                            |
| POST   | `/documents`                      | Upload document record                             |
| GET    | `/thesis`                         | List thesis versions                               |
| POST   | `/thesis`                         | Submit thesis (creates new version)                |
| GET    | `/timeline`                       | Get generated degree timeline                      |
| GET    | `/notifications`                  | List own notifications                             |
| PUT    | `/notifications/:id/read`         | Mark a notification as read                        |
| GET    | `/dashboard`                      | Student dashboard: profile, currentSemester, credits (earned/required/remaining), milestones, nextMilestone, upcomingDeadlines, upcomingEvents, pendingCourseRequests, thesis, unreadNotifications |
| GET    | `/events`                         | List events where user is a participant. Query: `upcoming=true` (date >= now) |
| GET    | `/deadlines`                      | List deadlines scoped to student (profile/semesters/global). Query: `upcoming=true` |
| GET    | `/forms`                          | List forms filtered by studentType and current-semester applicability |
| GET    | `/milestones`                     | Student's milestone checklist (11 items, ordered by `order`) |

### Create semester body
```json
{ "semesterNumber": 1, "academicYear": "2026-27", "startDate": "2026-07-01", "endDate": "2027-06-30" }
```

### Add course body
```json
{ "courseCode": "CS701", "courseName": "Advanced Algorithms", "credits": 4 }
```

### Upload document body (file URL is stored; actual file goes to object storage)
```json
{ "documentName": "Marksheet S1", "documentType": "marksheet", "fileUrl": "https://storage/...", "semester": "<semesterId>" }
```

### Submit thesis body
```json
{ "title": "PhD Thesis v1", "documentUrl": "https://storage/thesis-v1.pdf" }
```

---

## Supervisor Routes — `/api/supervisor` (role: `supervisor`)

| Method | Endpoint                          | Description                                        |
| ------ | --------------------------------- | -------------------------------------------------- |
| GET    | `/dashboard`                      | Counts of students, pending approvals, events      |
| GET    | `/students`                       | List assigned students. Query filters: `name`, `rollNumber`, `semester`, `studentType`, `researchArea`, `page`, `limit` |
| GET    | `/students/:studentId`            | Full student record (academics, docs, thesis, SRC) |
| PUT    | `/courses/:studentCourseId/approve` | Approve/reject course work                       |
| PUT    | `/thesis/:thesisId/approve`       | Approve/reject/resubmit thesis                     |
| PUT    | `/approvals/:requestId/approve`   | Approve/reject a general approval request          |
| POST   | `/events`                         | Create event with multiple student participants    |
| GET    | `/events`                         | List events created by supervisor                  |
| GET    | `/approvals/pending`              | All pending course/thesis/general approvals        |
| GET    | `/students/options`               | Eligible students assigned to this supervisor (from `getEligibleStudentOptions`) |
| PUT    | `/milestones/:id`                 | Update milestone (body: `{ status?, dueDate?, title?, description? }`). Verifies milestone's student is assigned to supervisor. Status ∈ pending/in_progress/completed/skipped. Sets `completedAt` on complete |

### Approve course body
```json
{ "status": "approved", "comment": "Looks good" }
```
`status` ∈ `approved` | `rejected`

### Approve thesis body
```json
{ "status": "approved", "comment": "Accepted" }
```
`status` ∈ `approved` | `rejected` | `resubmission_required`

### Create event body (multi-student)
```json
{ "title": "Research Progress Seminar", "eventType": "seminar", "description": "Seminar 1", "date": "2026-09-15", "startTime": "2026-09-15T11:00:00Z", "endTime": "2026-09-15T12:00:00Z", "location": "Hall A / Meet URL", "participants": ["<userId>", "<userId>"], "semester": "<semesterId>", "deadline": "2026-09-14T00:00:00Z" }
```

> **Note:** Participant ids may be either User ids or StudentProfile ids; they are resolved to User ids via `src/utils/participants.ts`. Every resolved participant gets an in-app notification + email.

---

## Admin Routes — `/api/admin` (role: `admin`)

### Dashboard
| Method | Endpoint    | Description                       |
| ------ | ----------- | --------------------------------- |
| GET    | `/dashboard` | Totals: students, faculty, events, pending approvals |

### Student management
| Method | Endpoint                          | Description                          |
| ------ | --------------------------------- | ------------------------------------ |
| POST   | `/students`                       | Create student account               |
| GET    | `/students`                       | List/paginate students. Query: `search`, `studentType`, `department`, `page`, `limit` |
| PUT    | `/students/:id`                   | Update student (id = StudentProfile id) |
| PUT    | `/students/:id/toggle-active`     | Activate/deactivate (id = User id)   |

### Create student body
```json
{ "email": "s2@college.edu", "password": "secret1", "name": "Student 2", "collegeId": "CSE1002", "rollNumber": "22CS002", "studentType": "frp", "department": "CSE", "researchArea": "ML", "admissionDate": "2026-07-01" }
```

> **Note:** `requiredCredits` defaults to 12; admin may set 20 for direct-admission PhD students.

### Faculty management
| Method | Endpoint                          | Description                            |
| ------ | --------------------------------- | -------------------------------------- |
| POST   | `/faculty`                        | Create faculty/supervisor account      |
| GET    | `/faculty`                        | List. Query: `search`, `department`, `page`, `limit` |
| PUT    | `/faculty/:id`                    | Update faculty (id = FacultyProfile id) |
| PUT    | `/faculty/:id/toggle-active`      | Activate/deactivate (id = User id)     |

### Create faculty body
```json
{ "email": "prof@college.edu", "password": "secret1", "name": "Prof. X", "employeeId": "FAC001", "department": "CSE", "designation": "Professor", "researchAreas": ["ML", "NLP"] }
```

### Supervisor assignment
| Method | Endpoint              | Description                          |
| ------ | --------------------- | ------------------------------------ |
| POST   | `/supervisor/assign`  | Assign/change supervisor for student |

Body:
```json
{ "studentId": "<studentProfileId>", "supervisorId": "<facultyProfileId>", "coSupervisorId": "<facultyProfileId>" }
```

### SRC Committee
| Method | Endpoint                  | Description                         |
| ------ | ------------------------- | ----------------------------------- |
| POST   | `/src-committee`          | Create SRC committee for a student  |
| PUT    | `/src-committee/:id`      | Update members/roles                |

Create body:
```json
{ "studentId": "<studentProfileId>", "members": [ { "faculty": "<facultyProfileId>", "role": "chairperson" } ] }
```
Roles: `chairperson` | `supervisor` | `co_supervisor` | `member`

> **Note:** Validation enforces exactly one chairperson. If a supervisor member is present, it must match the student's assigned supervisor.

### Milestones
| Method | Endpoint            | Description                                                       |
| ------ | ------------------- | ----------------------------------------------------------------- |
| PUT    | `/milestones/:id`   | Update milestone (body: `{ status?, dueDate?, title?, description? }`). No ownership check. Status ∈ pending/in_progress/completed/skipped. Sets `completedAt` on complete |

### Events
| Method | Endpoint       | Description                  |
| ------ | -------------- | ---------------------------- |
| POST   | `/events`      | Create event                 |
| GET    | `/events`      | List all events              |
| PUT    | `/events/:id`  | Update event                 |
| DELETE | `/events/:id`  | Delete event                 |

### Forms
| Method | Endpoint      | Description                            |
| ------ | ------------- | -------------------------------------- |
| GET    | `/forms`      | List forms                             |
| POST   | `/forms`      | Add form                               |
| PUT    | `/forms/:id`  | Update form                            |
| DELETE | `/forms/:id`  | Remove form                            |

Create form body:
```json
{ "formName": "DPF-01", "formType": "admission", "fileUrl": "https://storage/dpf1.pdf", "semesterApplicable": [1, 2], "studentTypeApplicable": ["frp"] }
```

### Deadlines
| Method | Endpoint       | Description        |
| ------ | -------------- | ------------------ |
| GET    | `/deadlines`   | List all deadlines |
| POST   | `/deadlines`   | Create deadline    |

Create deadline body:
```json
{ "title": "Course Registration", "description": "Register S2 courses", "dueDate": "2026-12-01T00:00:00Z", "semester": "<semesterId>", "student": "<studentProfileId>" }
```

> **Note:** A deadline scheduler runs on startup and every 6 hours. It finds unsent deadlines due within 7 days, creates a Notification + email per affected student, and sets `Deadline.notificationSent = true`.

### Search
| Method | Endpoint   | Description                          |
| ------ | ---------- | ------------------------------------ |
| GET    | `/search`  | Global search. Query: `q=<term>` — matches name, collegeId, rollNumber, employeeId, email |

---

## Health Check

| Method | Endpoint | Description          |
| ------ | -------- | -------------------- |
| GET    | `/health` | Server health status |

---

## Response Format

Successful responses:
```json
{ "success": true, "data": { ... } }
```

Errors (via error middleware):
```json
{ "message": "Error description" }
```

## Error Codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 400  | Bad request / validation error       |
| 401  | Invalid credentials / token          |
| 403  | Unauthorized role / inactive account |
| 404  | Resource not found                   |
| 409  | Duplicate / conflict                 |
| 500  | Internal server error                |

## File Uploads

Document and form uploads only store a `fileUrl` string in the database. Actual files must be uploaded to object storage (S3/GCS/Multer temp) and the resulting URL passed to respective create endpoints.