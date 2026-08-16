# Scholareer: School OS

Build a fully functional, production-quality MVP called:

SCHOLAREER
"The School Operating System"

This is a Nigerian multi-school management platform.

IMPORTANT:
This must be a WORKING APPLICATION, not a static UI mockup.

All buttons, forms, tables, calculations, navigation, filters, CRUD operations, printing, imports/exports and local data persistence must actually work.

For this MVP, DO NOT require a backend database.

Use IndexedDB through Dexie.js for persistent local storage.

The application must continue working after:
- browser refresh
- closing and reopening the browser
- restarting the phone
- going offline

Data must remain available unless the user deliberately clears browser/app storage.

Architect the application so IndexedDB can later be replaced by Supabase/PostgreSQL/API without rebuilding the UI.

==================================================
1. TECHNOLOGY
==================================================

Use:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Lucide icons
- React Router
- Dexie.js / IndexedDB
- React Hook Form
- Zod
- Recharts
- PWA support

Do not introduce unnecessary dependencies.

The application must be responsive and work particularly well on Android phones, tablets and desktop computers.

==================================================
2. BRAND
==================================================

Brand:

SCHOLAREER

Meaning:

Scholar + Career

Positioning:

A modern School Operating System that helps schools manage students, academics, finance and administration while preparing students for their future.

Tagline:

"Where Scholarship Meets Career."

Use a professional education technology visual identity.

Primary visual style:
- clean
- modern
- premium
- trustworthy
- professional
- simple enough for school administrators who are not technology experts

Use a professional blue-based interface with neutral backgrounds.

Include:
- light mode
- dark mode
- responsive sidebar
- mobile navigation
- notification center
- global search

==================================================
3. MULTI-SCHOOL ARCHITECTURE
==================================================

The system must be designed as a multi-school SaaS application.

For the MVP, simulate multiple schools locally using an organizationId.

Every major record must belong to a school/organization.

Example:

School A must never see School B's:
- students
- teachers
- payments
- results
- classes
- settings

Create an Organizations table.

Each organization should have:

- id
- name
- schoolCode
- logo
- address
- phone
- email
- principalName
- proprietorName
- motto
- state
- country
- currentSession
- currentTerm
- resumptionDate

Create demo school:

"All Saints Anglican College"

School code:

"ASAC001"

Location:

Nigeria

==================================================
4. USER ROLES
==================================================

Implement role-based access control.

Roles:

SUPER_ADMIN
SCHOOL_ADMIN
PROPRIETOR
PRINCIPAL
VICE_PRINCIPAL
BURSAR
CASHIER
TEACHER
FORM_TEACHER
LIBRARIAN
RECEPTIONIST

Each role must have permissions.

Examples:

SUPER_ADMIN:
- manage all schools
- manage school administrators
- view system-wide statistics

SCHOOL_ADMIN:
- manage school settings
- students
- teachers
- classes
- subjects
- finance
- results

CASHIER:
- record payments
- issue receipts
- view payment history
- cannot edit academic results

TEACHER:
- view assigned classes
- enter scores
- edit scores before submission
- submit scores
- view student information relevant to teaching

PRINCIPAL:
- approve results
- view school analytics
- manage result access

LIBRARIAN:
- manage books
- borrowing
- returns

RECEPTIONIST:
- visitor management

The UI must hide features the current user does not have permission to access.

==================================================
5. DEMO LOGIN
==================================================

Create demo accounts:

Super Admin:
email: superadmin@scholareer.local
password: Admin123!

School Admin:
email: admin@asac.local
password: Admin123!

Cashier:
email: cashier@asac.local
password: Admin123!

Teacher:
email: teacher@asac.local
password: Admin123!

Principal:
email: principal@asac.local
password: Admin123!

Store demo authentication locally.

Display a small "Demo credentials" helper on the login screen.

==================================================
6. MAIN DASHBOARD
==================================================

Create a professional dashboard.

Dashboard cards:

- Total Students
- Total Teachers
- Total Classes
- Students Fully Paid
- Students Partially Paid
- Students Owing
- Total Fees Collected
- Results Pending Approval
- Results Blocked
- Attendance Today

Charts:

1. Fee collection
2. Payment status
3. Student population by class
4. Academic performance

Create:

"School Briefing"

Example:

Good morning.

- 245 students enrolled
- 218 present today
- ₦3,450,000 collected this term
- 17 students have outstanding balances
- 4 teachers have pending score submissions
- 8 results are awaiting approval

These values must be calculated from actual IndexedDB records.

DO NOT hard-code dashboard statistics.

==================================================
7. STUDENT MANAGEMENT
==================================================

Create complete student CRUD.

Student fields:

- id
- admissionNumber
- firstName
- middleName
- lastName
- gender
- dateOfBirth
- passport
- phone
- email
- address
- parentName
- parentPhone
- parentEmail
- classId
- arm
- house
- admissionDate
- status
- organizationId

Student statuses:

ACTIVE
GRADUATED
TRANSFERRED
WITHDRAWN

Features:

- Add student
- Edit student
- View student
- Delete student
- Search
- Filter
- Sort
- Pagination
- Import CSV
- Export CSV
- Print student list

Create a student profile page with tabs:

Overview
Academic
Finance
Attendance
Library
Documents
Activity

==================================================
8. CLASSES
==================================================

Support:

CRECHE
NURSERY
PRIMARY
JSS
SSS

Class arms:

A
B
C

Examples:

Nursery 1A
Nursery 1B
Primary 5A
Primary 5B
JSS 1A
JSS 1B
JSS 1C
SS 2A

Each class must have:

- id
- name
- level
- arm
- organizationId
- formTeacherId

IMPORTANT:

Different classes may have different subject structures and result computation rules.

Create a class configuration system.

==================================================
9. SUBJECTS
==================================================

Create subject management.

Fields:

- subjectName
- subjectCode
- category
- maximumScore
- caMaximum
- examMaximum
- passMark
- gradingScheme

Allow subjects to be assigned to specific classes.

==================================================
10. TEACHER MANAGEMENT
==================================================

Teacher fields:

- staffId
- firstName
- lastName
- gender
- phone
- email
- qualification
- subjects
- assignedClasses
- status

Features:

- CRUD
- Search
- Assign subjects
- Assign classes
- Assign form class

Teachers must only see classes and subjects assigned to them.

==================================================
11. SCORE ENTRY
==================================================

Create a professional score-entry interface.

Teacher selects:

Session
Term
Class
Subject

Then display students in rows.

Columns:

Student
CA 1
CA 2
CA 3
Examination
Total
Grade
Remark

Allow teachers to enter scores.

Validate maximum values.

Example:

CA maximum = 30
Exam maximum = 70
Total = 100

Automatically calculate:

Total = CA1 + CA2 + CA3 + Exam

If the school's configuration uses a different structure, use the configured scoring rules.

Provide:

Save Draft
Submit Scores

Teachers can edit saved drafts.

Once submitted, scores become locked for teachers until an administrator reopens them.

==================================================
12. RESULT COMPUTATION ENGINE
==================================================

This is one of the most important modules.

Automatically calculate:

- Subject total
- Subject grade
- Subject remark
- Student total
- Student average
- Student position
- Class position

Position must be calculated correctly across the selected class.

Example:

1st
2nd
3rd
4th

Handle ties using a consistent ranking method.

DO NOT calculate position using student IDs or alphabetical order.

Ranking must be based on academic performance.

Allow the school to configure:

- grading scale
- pass mark
- CA/exam weighting
- position calculation method

Default grading:

70-100 = A
60-69 = B
50-59 = C
45-49 = D
40-44 = E
0-39 = F

Allow the administrator to change these values.

==================================================
13. AFFECTIVE DOMAIN
==================================================

Include 8 traits.

Example:

- Punctuality
- Attendance
- Neatness
- Honesty
- Cooperation
- Leadership
- Responsibility
- Courtesy

Use configurable ratings.

Example:

5 = Excellent
4 = Very Good
3 = Good
2 = Fair
1 = Poor

Do not hard-code the traits permanently.

Administrators must be able to edit them.

==================================================
14. PSYCHOMOTOR DOMAIN
==================================================

Include 8 traits.

Example:

- Handwriting
- Sports
- Drawing
- Craft
- Coordination
- Practical Skills
- Creativity
- Physical Fitness

Allow administrator customization.

==================================================
15. RESULT APPROVAL
==================================================

Create a result approval workflow.

Status:

DRAFT
SUBMITTED
APPROVED
PUBLISHED
BLOCKED

Workflow:

Teacher enters scores
↓
Save Draft
↓
Submit
↓
Principal/Admin reviews
↓
Approve
↓
Publish
↓
Student/Parent can view if access is allowed

==================================================
16. RESULT ACCESS CONTROL ENGINE
==================================================

Name:

RACE

Result Access Control Engine

This feature is critical.

Administrators must be able to control whether a student's result can be viewed.

Each student result has:

ALLOW VIEW
BLOCK VIEW

Add buttons:

"Allow Result"

"Block Result"

If blocked, the student/parent result page must show:

"Your result is currently unavailable. Please contact the school administration."

The system must NEVER reveal the result when access is blocked.

Allow bulk actions:

Block selected
Allow selected

Also display:

- Result Published
- Result Blocked
- Result Pending

==================================================
17. FINANCE / CASHIER
==================================================

Create:

Fee Structure
Payments
Receipts
Balances
Financial Dashboard

For every student show:

Total Fees
Amount Paid
Balance
Payment Status

Statuses:

PAID
PARTIAL
OWING

Cashier can record:

- amount
- date
- payment method
- reference
- description

Payment methods:

CASH
POS
BANK_TRANSFER
ONLINE

Automatically calculate balance.

Example:

Fee = ₦100,000
Paid = ₦60,000
Balance = ₦40,000
Status = PARTIAL

If paid = 100%, status becomes PAID.

Generate printable A4 receipts.

Receipt must include:

School logo
School name
Receipt number
Student
Admission number
Class
Amount
Payment method
Date
Cashier
Previous balance
Amount paid
Remaining balance

==================================================
18. RESULT ACCESS + FEES
==================================================

Allow school administrators to configure policies such as:

"Block result when student has outstanding fees."

When enabled:

If balance > 0
→ result becomes blocked.

If balance = 0
→ result may be released.

IMPORTANT:

Do not automatically override an administrator's manual decision.

Show the reason for the block.

==================================================
19. REPORT CARD
==================================================

Generate professional A4 report cards.

Must contain:

School logo
School name
School address
Student passport
Student name
Admission number
Class
Session
Term
Resumption date

Subjects table:

Subject
CA
Exam
Total
Grade
Remark

Then:

Total Score
Average
Position

Affective Domain - 8 traits

Psychomotor Domain - 8 traits

Attendance:

School days
Days present
Days absent

Teacher comment

Principal comment

Form Teacher signature area

Principal signature area

Date

Allow:

Print
Save as PDF through browser print dialog

==================================================
20. BROADSHEET
==================================================

Create class broadsheet.

Rows:

Students

Columns:

Subjects

Display:

Total
Average
Position

Provide:

Print
Export CSV

==================================================
21. TRANSCRIPT
==================================================

Create transcript generator.

For graduating students show:

School information
Student information
Academic history by session
Subjects
Grades
Averages
Positions where available
Graduation date
Principal signature

Allow printing.

==================================================
22. STUDENT ID CARD
==================================================

Create student ID card generator.

Include:

School logo
Student passport
Student name
Admission number
Class
Session
School phone
QR code

QR code should encode a student verification URL or student verification identifier.

Provide print-ready card layout.

==================================================
23. ATTENDANCE
==================================================

Create daily attendance.

Teacher selects:

Date
Class

Then marks:

Present
Absent
Late
Excused

Automatically calculate attendance percentage.

Display attendance history on student profile.

==================================================
24. LIBRARY
==================================================

Create:

Book management
Borrowing
Returns

Book fields:

ISBN
Title
Author
Category
Quantity
Available quantity

Borrowing record:

Student
Book
Date borrowed
Due date
Date returned
Status

Dashboard:

Total books
Available
Borrowed
Overdue

==================================================
25. VISITOR MANAGEMENT
==================================================

Create visitor register.

Fields:

Visitor name
Phone
Purpose
Person to visit
ID type
ID number
Time in
Time out
Status

Features:

Register visitor
Check out visitor
Search
Today's visitors
Print visitor record

==================================================
26. BULK IMPORT / EXPORT
==================================================

Support CSV import/export.

Students:

CSV template:

admissionNumber,
firstName,
middleName,
lastName,
gender,
dateOfBirth,
class,
arm,
parentName,
parentPhone

Allow:

Download template
Import CSV
Validate records
Show errors
Confirm import

Also support score CSV import/export.

Never silently import invalid data.

==================================================
27. NOTIFICATIONS
==================================================

Create notification center.

Examples:

New payment
Result submitted
Result approved
Result blocked
Teacher score submission pending
Library overdue
Visitor checked in

==================================================
28. AUDIT LOG
==================================================

Record important actions.

Examples:

User logged in
Student created
Student edited
Payment recorded
Score entered
Score submitted
Result approved
Result blocked

Record:

user
action
entity
entityId
timestamp
details

Create an Audit Log page accessible to administrators.

==================================================
29. SETTINGS
==================================================

School settings:

School name
Logo
Address
Phone
Email
Motto
Principal
Proprietor

Academic settings:

Session
Term
Resumption date

Grading settings:

Grade
Minimum score
Maximum score
Remark

Affective settings

Psychomotor settings

Fee settings

Result access settings

==================================================
30. MODULE MANAGER
==================================================

Create module enable/disable system.

Modules:

Students
Teachers
Academics
Results
Finance
Attendance
Library
Visitors
ID Cards
Reports

Administrators can enable/disable modules.

Disabled modules should disappear from navigation.

Do not delete their stored data when disabled.

==================================================
31. GLOBAL SEARCH
==================================================

Create global search.

Search across:

Students
Teachers
Classes
Payments
Receipts
Books
Visitors

Example:

Search "John"

Return matching records with type labels.

==================================================
32. DASHBOARD DATA
==================================================

All dashboard statistics must come from IndexedDB.

Do not hard-code values.

Create selectors/services that calculate:

student count
teacher count
paid students
partial students
owing students
total revenue
pending results
blocked results
attendance

==================================================
33. DEMO DATA
==================================================

On first launch, automatically seed:

1 school

5 students

5 teachers

Classes:

JSS 1A
JSS 1B
JSS 2A
SS 1A
SS 2A

At least 7 subjects.

Example:

English Language
Mathematics
Biology
Physics
Chemistry
Economics
Government

Create realistic demo scores.

Create payment records showing:

- some fully paid
- some partially paid
- some owing

Create attendance records.

Create library books.

Create visitor records.

IMPORTANT:

Only seed data if the database is empty.

Never overwrite existing user data.

==================================================
34. DATA PERSISTENCE
==================================================

All CRUD operations must write to IndexedDB.

After:

refresh
browser close
device restart

the data must remain.

Create a centralized database service.

Do not scatter direct IndexedDB operations throughout components.

==================================================
35. PWA
==================================================

Make the application installable.

Include:

manifest
icons
service worker
offline caching
installable PWA

Display offline status.

When offline:

Show:

"Offline Mode — Your data is saved on this device."

==================================================
36. ERROR HANDLING
==================================================

Do not allow the application to crash from normal user errors.

Use:

validation
empty states
loading states
error states
confirmation dialogs
success notifications

Example:

Before deleting a student:

"Are you sure you want to delete this student?"

==================================================
37. RESPONSIVE DESIGN
==================================================

Desktop:

Sidebar + content

Tablet:

Collapsible sidebar

Mobile:

Drawer + bottom navigation for primary actions

Tables must become mobile-friendly cards or horizontally scrollable tables.

Forms must work comfortably on small screens.

==================================================
38. ACCESSIBILITY
==================================================

Use:

proper labels
keyboard navigation
ARIA where appropriate
clear focus states
accessible buttons
readable contrast

==================================================
39. SECURITY
==================================================

Even though this MVP uses local storage:

- never expose passwords in UI after login
- validate all inputs
- enforce role permissions in application logic
- prevent unauthorized navigation
- never expose blocked results
- never trust UI-only permission checks

Create a centralized authorization utility.

==================================================
40. CODE QUALITY
==================================================

Use:

- TypeScript types
- reusable components
- modular architecture
- service layer
- hooks
- validation schemas
- clear naming
- no duplicated business logic

Avoid:

- giant components
- hard-coded business rules
- duplicated calculations
- direct database operations inside UI components
- fake buttons
- placeholder functionality presented as complete

==================================================
41. IMPORTANT UI REQUIREMENT
==================================================

Every major feature must actually function.

Do not create:

"Coming Soon"

buttons for functionality included in this specification.

If a button exists:

it must perform the intended action.

==================================================
42. NAVIGATION
==================================================

Create routes:

/login

/dashboard

/students

/students/:id

/teachers

/classes

/subjects

/attendance

/finance

/finance/payments

/results

/results/entry

/results/broadsheet

/results/approval

/results/report-card

/transcripts

/library

/visitors

/id-cards

/reports

/settings

/audit-log

==================================================
43. DEMO EXPERIENCE
==================================================

When the application launches for the first time:

Show professional onboarding.

Step 1:
Welcome to Scholareer.

Step 2:
School information.

Step 3:
Academic session.

Step 4:
Create/select classes.

Step 5:
Dashboard.

For demo purposes, provide:

"Load Demo School"

button.

This should populate the database with the All Saints Anglican College demo data.

==================================================
44. ACCEPTANCE TEST
==================================================

Before declaring the MVP complete, test this exact workflow:

1. Login as School Admin.

2. Open dashboard.

3. Create a student.

4. Assign student to JSS 1A.

5. Create/edit subject.

6. Assign subject to JSS 1A.

7. Login as Teacher.

8. Enter scores.

9. Save scores.

10. Submit scores.

11. Login as Principal.

12. Approve result.

13. Login as Cashier.

14. Record partial payment.

15. Verify balance is calculated.

16. Block student's result.

17. Attempt to view result.

18. Confirm result is hidden.

19. Record remaining payment.

20. Allow result.

21. View result.

22. Verify A4 report card.

23. Verify position calculation.

24. Export student CSV.

25. Import student CSV.

26. Generate student ID card.

27. Borrow a library book.

28. Register visitor.

29. Refresh browser.

30. Confirm all data remains.

31. Turn off internet.

32. Refresh.

33. Confirm application still works.

==================================================
45. IMPORTANT DEVELOPMENT INSTRUCTION
==================================================

Build this incrementally.

First create:

CORE
AUTHENTICATION
DATABASE
LAYOUT
DASHBOARD

Then:

STUDENTS
TEACHERS
CLASSES
SUBJECTS

Then:

ACADEMICS
RESULT ENGINE
RESULT ACCESS CONTROL

Then:

FINANCE

Then:

ATTENDANCE
LIBRARY
VISITORS
ID CARDS
TRANSCRIPTS

Then:

REPORTS
AUDIT LOG
SETTINGS
MODULE MANAGER

Do not attempt to generate a superficial single-page application containing all features.

Build each module as a real functional module.

After implementing each major module, verify that it works before proceeding.

==================================================
46. FINAL REQUIREMENT
==================================================

The result should feel like a real commercial Nigerian school management platform.

It must NOT look like:

- a school project
- a template
- a static dashboard
- a collection of mockups

It should feel like software a proprietor could realistically sit down and use.

Product name everywhere:

SCHOLAREER

Tagline:

WHERE SCHOLARSHIP MEETS CAREER

Build the application now.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://scholareer-nigeria-os.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/96996de2-ee3c-4cb4-9314-df0015cf9f66).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
