# More SkillUp Backend Blueprint

This document is the production-level backend blueprint for the More SkillUp LMS platform. It is written so that:

- a human developer can build the backend step-by-step without guessing
- another AI can use this as a full implementation specification
- the backend matches the current frontend behavior and naming as closely as possible

This document does not assume hidden knowledge. Every major backend object, responsibility, relationship, and API contract is defined explicitly.

---

## 1. PROJECT OVERVIEW

More SkillUp is a learning management system with three primary user roles:

- `Admin`
- `Teacher`
- `Student`

The platform supports public course discovery, teacher course authoring, paid and free course access, student learning progress, notifications, and certificate generation.

### What the platform does

The system allows teachers to create structured learning products, publish them, assign prices, and make them available to students. Students can browse courses, preview content, save courses to a watchlist, unlock paid courses through payment, complete lessons and tasks, track progress, and receive certificates after completing eligible courses. Admins manage the platform structure and operational oversight.

### Who uses the platform

#### Admin

The admin manages the platform-wide system. The admin creates and manages categories and subcategories, oversees teachers, reassigns courses, monitors transactions, and broadcasts notifications.

#### Teacher

The teacher creates and manages courses. A teacher owns course content such as sections, lessons, tasks, pricing, publication state, and visibility state.

#### Student

The student consumes content. A student explores courses, views previews, adds courses to watchlist, unlocks paid courses through verified payments, learns through sections and lessons, completes tasks, tracks progress, and receives certificates when eligible.

### Core workflows

#### Create course workflow

1. A teacher logs in.
2. The teacher creates a course shell.
3. The teacher selects a category and subcategory.
4. The teacher adds course metadata such as title, subtitle, overview, scheme of work, tags, roadmap link, and price.
5. The teacher adds sections.
6. Inside each section, the teacher adds lessons and tasks.
7. The teacher marks sections as `free` or `paid`.
8. The teacher saves the course as draft or publishes it.
9. Once published and visible, the course appears in student exploration endpoints.

#### Explore course workflow

1. A student logs in.
2. The student fetches discoverable courses.
3. The student views the course preview page.
4. The backend returns course metadata plus section, lesson, and task visibility based on whether the student owns the course.
5. Free courses are fully accessible.
6. Paid courses expose preview sections and lock the rest until payment is verified.

#### Pay and unlock workflow

1. A student selects `Unlock Course`.
2. The frontend calls `initialize payment`.
3. The backend creates a payment intent and a transaction record with status `pending`.
4. The student is redirected to Paystack or OPay.
5. The payment gateway calls the backend webhook after payment completion.
6. The backend verifies the transaction using provider verification APIs and signature validation.
7. The backend marks the transaction as `successful`.
8. The backend creates or confirms an enrollment.
9. The course becomes fully unlocked for the student.
10. The course appears in `My Courses`, `Payments`, and learning endpoints.

#### Learn and complete workflow

1. An enrolled student opens a lesson.
2. The backend tracks lesson access and completion.
3. The backend stores per-lesson progress.
4. The backend calculates overall course completion percentage.
5. When all required lessons are completed, the course completion state becomes `completed`.

#### Generate certificate workflow

1. The backend detects that the student completed all required lessons for a certificate-eligible course.
2. The backend checks that a certificate does not already exist for that enrollment.
3. The backend generates a certificate record.
4. The backend optionally generates a PDF file asynchronously.
5. The student can view or download the certificate.

---

## 2. SYSTEM ARCHITECTURE

### Core stack

- Backend framework: `Django`
- API framework: `Django REST Framework`
- Database: `PostgreSQL`
- Containerization: `Docker`
- Optional queue/background processing: `Celery + Redis`

### Why Django is used

Django is used because it provides:

- a mature authentication system
- strong admin tooling
- relational model support for complex LMS data
- migration support for iterative schema changes
- good ecosystem support for JWT, payments, file storage, and background jobs
- a clean fit for role-based dashboards and structured domain models

### Why Django REST Framework is used

DRF is used because:

- the frontend is API-driven
- serializers make request and response structure explicit
- permissions and authentication are first-class
- nested resource responses are easy to control
- browsable APIs improve development speed

### Why PostgreSQL is used

PostgreSQL is the preferred database because:

- LMS data is relational
- payment and enrollment records need transactional consistency
- analytics queries benefit from SQL aggregation
- PostgreSQL handles JSON fields where flexible metadata is needed
- it is production-proven and works well with Django

### Why Docker is used

Docker is used so that:

- every developer runs the same services
- Django, PostgreSQL, and Redis can start together
- production and local environments are easier to align
- setup becomes reproducible for both humans and AI-generated implementations

### Modular app structure

The backend should be split into domain-focused Django apps. Each app should own its models, serializers, views, permissions, and tests. This makes the system easier to reason about and safer to evolve.

The recommended apps are:

- `accounts`
- `categories`
- `courses`
- `enrollments`
- `payments`
- `notifications`
- `progress`
- `certificates`

---

## 3. DJANGO PROJECT STRUCTURE (VERY DETAILED)

### How to create the project

The backend should live in a separate `backend/` directory at the repository root so the frontend and backend remain clearly separated.

Recommended creation sequence:

1. Create `backend/` directory.
2. Create a virtual environment if not using Docker-only development.
3. Install Django and core dependencies.
4. Run `django-admin startproject config .` inside `backend/`.
5. Create the domain apps under `backend/apps/`.
6. Split settings into environment-specific files.
7. Add Docker, env files, and requirements.

### Recommended folder structure

```text
backend/
  manage.py
  .env
  .env.example
  requirements/
    base.txt
    dev.txt
    prod.txt
  config/
    __init__.py
    urls.py
    wsgi.py
    asgi.py
    settings/
      __init__.py
      base.py
      dev.py
      prod.py
      test.py
  apps/
    accounts/
    categories/
    courses/
    enrollments/
    payments/
    notifications/
    progress/
    certificates/
  common/
    permissions/
    pagination/
    exceptions/
    utils/
    constants/
    mixins/
  media/
  static/
  docker/
    django/
      Dockerfile
      entrypoint.sh
    postgres/
      init.sql
  scripts/
    wait_for_db.py
  tests/
    integration/
    e2e/
```

### Purpose of each directory

#### `backend/manage.py`

This is Django’s command entry point. It is used for migrations, running the development server, creating superusers, and other management commands.

#### `backend/requirements/`

This directory separates Python dependencies by environment.

- `base.txt`: shared dependencies
- `dev.txt`: development-only dependencies such as debug tools
- `prod.txt`: production-only dependencies such as `gunicorn`

#### `backend/config/`

This contains project-wide configuration.

- `urls.py`: root API routing
- `wsgi.py`: WSGI server entry
- `asgi.py`: ASGI server entry
- `settings/`: environment-specific settings modules

#### `backend/config/settings/base.py`

This contains common settings shared by all environments, such as installed apps, middleware, REST framework configuration, timezone, and custom user configuration.

#### `backend/config/settings/dev.py`

This contains development-only settings:

- debug mode
- localhost CORS
- local database host
- optional debug toolbar

#### `backend/config/settings/prod.py`

This contains production-only settings:

- debug disabled
- allowed hosts
- secure cookies
- HSTS
- cloud storage options
- production database

#### `backend/apps/`

This is where domain apps live. Each app should contain:

- `models.py`
- `serializers.py`
- `views.py`
- `urls.py`
- `permissions.py`
- `services.py`
- `selectors.py`
- `admin.py`
- `tests/`

#### `backend/common/`

This stores reusable cross-app logic that should not belong to a single domain app.

Examples:

- custom DRF permissions
- pagination classes
- base API exceptions
- timestamp helpers
- status enums

#### `backend/media/`

This stores user-uploaded files in local development, such as certificate PDFs or task submission files if file uploads are enabled later.

#### `backend/static/`

This stores collected static files for Django admin and any backend-served assets.

#### `backend/docker/`

This stores Docker-specific files.

- `django/Dockerfile`: image build definition for Django
- `django/entrypoint.sh`: wait for DB, run migrations, then start app
- `postgres/init.sql`: optional bootstrap SQL

#### `backend/scripts/`

This stores utility scripts such as waiting for database startup.

#### `backend/tests/`

This stores cross-app integration and end-to-end backend tests that are broader than a single Django app.

---

## 4. DJANGO APPS BREAKDOWN

### `accounts`

#### Purpose

This app manages authentication, user identity, user roles, password reset, and role-specific profile data.

#### What it handles

- custom user model
- JWT authentication
- teacher profile
- student profile
- login, register, logout-related token workflows
- password reset request and confirmation

### `courses`

#### Purpose

This app manages all teacher-authored learning content.

#### What it handles

- course metadata
- sections
- lessons
- tasks
- publishing state
- visibility state
- free vs paid section access rules

### `categories`

#### Purpose

This app organizes the course catalog.

#### What it handles

- categories
- subcategories
- category hierarchy used by teachers and student browsing

### `enrollments`

#### Purpose

This app manages student access to courses.

#### What it handles

- enrollment records
- watchlist
- access state after payment
- enrollment timestamps

### `payments`

#### Purpose

This app manages monetization and payment verification.

#### What it handles

- payment initialization
- transactions
- payment provider references
- webhook processing
- verification with Paystack and OPay
- payment audit trail

### `notifications`

#### Purpose

This app manages platform and user-facing notifications.

#### What it handles

- admin broadcast messages
- user notifications
- unread state
- notification expiration and cleanup

### `progress`

#### Purpose

This app manages student learning state.

#### What it handles

- lesson completion
- task completion state if later required
- last accessed lesson
- progress percentage
- learning continuity data

### `certificates`

#### Purpose

This app manages course completion certificates.

#### What it handles

- eligibility checks
- certificate issuance
- certificate code generation
- PDF generation metadata
- certificate retrieval

---

## 5. MODELS DESIGN (CRITICAL SECTION)

This section defines the database design. For each model, the app, purpose, fields, constraints, and relationships are explained.

### A. `accounts` app

### Model Name: `User`

#### Purpose

This is the custom authentication model used by the entire platform. It replaces Django’s default user model because More SkillUp requires role support and email-based authentication.

#### Fields

- `id`
  - Type: `UUIDField`
  - Description: Primary key for the user
  - Constraints: `primary_key=True`, `editable=False`

- `email`
  - Type: `EmailField`
  - Description: Main login identifier for the platform
  - Constraints: `unique=True`, indexed, required

- `username`
  - Type: `CharField`
  - Description: Public short identifier visible in some UI contexts
  - Constraints: unique, max length 150, required

- `display_name`
  - Type: `CharField`
  - Description: Human-readable name shown in dashboards and certificates
  - Constraints: max length 255, required

- `role`
  - Type: `CharField`
  - Description: Determines whether the user is an admin, teacher, or student
  - Constraints: choices `admin`, `teacher`, `student`; required

- `avatar`
  - Type: `CharField`
  - Description: Initials or short avatar token currently used by the frontend
  - Constraints: max length 10, optional

- `avatar_url`
  - Type: `URLField`
  - Description: Optional hosted avatar image
  - Constraints: blank allowed

- `is_active`
  - Type: `BooleanField`
  - Description: Determines whether the account can authenticate
  - Constraints: default `True`

- `is_staff`
  - Type: `BooleanField`
  - Description: Required for Django admin access
  - Constraints: default `False`

- `date_joined`
  - Type: `DateTimeField`
  - Description: When the account was created
  - Constraints: auto-set on create

- `last_login`
  - Type: `DateTimeField`
  - Description: Last successful login timestamp
  - Constraints: nullable

#### Relationships

- One-to-one with `TeacherProfile` when role is `teacher`
- One-to-one with `StudentProfile` when role is `student`

### Model Name: `TeacherProfile`

#### Purpose

This stores teacher-specific data that should not live directly on the base user model.

#### Fields

- `id`
  - Type: `UUIDField`
  - Description: Primary key

- `user`
  - Type: `OneToOneField` to `User`
  - Description: Connects the teacher profile to its user
  - Constraints: cascade delete

- `program`
  - Type: `CharField`
  - Description: Teacher’s main academic program, for example `Web Development`
  - Constraints: max length 100, required

- `track`
  - Type: `CharField`
  - Description: Teacher’s primary teaching track, for example `Backend with Python`
  - Constraints: max length 100, required

- `bio`
  - Type: `TextField`
  - Description: Public teacher biography
  - Constraints: optional

- `status`
  - Type: `CharField`
  - Description: Teacher availability state
  - Constraints: choices `active`, `inactive`; default `active`

#### Relationships

- One-to-one with `User`
- One-to-many with `Course` through `Course.teacher`

### Model Name: `StudentProfile`

#### Purpose

This stores student-specific preferences and learning identity data.

#### Fields

- `id`
  - Type: `UUIDField`
  - Description: Primary key

- `user`
  - Type: `OneToOneField` to `User`
  - Description: Connects the student profile to the base user
  - Constraints: cascade delete

- `selected_interest`
  - Type: `CharField`
  - Description: Primary learner interest shown in dashboards
  - Constraints: max length 100, optional but recommended

- `selected_track`
  - Type: `CharField`
  - Description: Main learner track
  - Constraints: max length 100, optional

- `plan`
  - Type: `CharField`
  - Description: Billing or access tier if platform-wide plans are later retained
  - Constraints: choices `free`, `pro`, `premium`; default `free`

#### Relationships

- One-to-one with `User`

### Optional Supporting Model Name: `PasswordResetToken`

#### Purpose

This model stores password reset requests in a secure backend-controlled way.

#### Fields

- `id`: UUID primary key
- `user`: foreign key to `User`
- `token`: secure random string or hashed token
- `expires_at`: datetime
- `used_at`: datetime nullable
- `created_at`: datetime

#### Relationships

- Many reset tokens can belong to one user

### B. `categories` app

### Model Name: `Category`

#### Purpose

This model represents a top-level course category used in course creation and student filtering.

#### Fields

- `id`
  - Type: `UUIDField`
  - Description: Primary key

- `name`
  - Type: `CharField`
  - Description: Top-level name such as `Backend Development`
  - Constraints: unique, max length 150, required

- `slug`
  - Type: `SlugField`
  - Description: URL-safe identifier derived from the category name
  - Constraints: unique

- `description`
  - Type: `TextField`
  - Description: Optional explanation for admin use and public catalog display
  - Constraints: optional

- `is_active`
  - Type: `BooleanField`
  - Description: Controls whether the category should appear in teacher creation or student filters
  - Constraints: default `True`

#### Relationships

- One category has many subcategories
- One category has many courses

### Model Name: `Subcategory`

#### Purpose

This model represents the second level of course organization under a category.

#### Fields

- `id`
  - Type: `UUIDField`
  - Description: Primary key

- `category`
  - Type: `ForeignKey` to `Category`
  - Description: Parent category
  - Constraints: cascade delete, indexed

- `name`
  - Type: `CharField`
  - Description: Name such as `Backend with Python`
  - Constraints: max length 150, required

- `slug`
  - Type: `SlugField`
  - Description: URL-safe identifier
  - Constraints: unique within the system or unique together with category

- `description`
  - Type: `TextField`
  - Description: Optional descriptive text
  - Constraints: optional

- `is_active`
  - Type: `BooleanField`
  - Description: Controls whether it can be selected
  - Constraints: default `True`

#### Relationships

- Many subcategories belong to one category
- One subcategory has many courses

#### Constraints

- `unique_together(category, name)` is recommended

### C. `courses` app

### Model Name: `Course`

#### Purpose

This is the main learning product students browse, preview, purchase, and study.

#### Fields

- `id`
  - Type: `UUIDField`
  - Description: Primary key

- `teacher`
  - Type: `ForeignKey` to `accounts.TeacherProfile`
  - Description: Owner of the course
  - Constraints: if teachers may be removed, use `SET_NULL` with nullable field or enforce reassignment before deletion

- `category`
  - Type: `ForeignKey` to `categories.Category`
  - Description: Main category
  - Constraints: required

- `subcategory`
  - Type: `ForeignKey` to `categories.Subcategory`
  - Description: More specific learning track
  - Constraints: required

- `title`
  - Type: `CharField`
  - Description: Course title
  - Constraints: max length 255, required

- `slug`
  - Type: `SlugField`
  - Description: Public identifier for URLs
  - Constraints: unique

- `subtitle`
  - Type: `CharField`
  - Description: Short supporting course pitch
  - Constraints: max length 255, required

- `overview`
  - Type: `TextField`
  - Description: Detailed HTML or rich text overview
  - Constraints: required

- `scheme_of_work`
  - Type: `TextField`
  - Description: Text representation of weekly roadmap or curriculum structure
  - Constraints: required

- `roadmap_link`
  - Type: `URLField`
  - Description: Optional external roadmap resource
  - Constraints: optional

- `price`
  - Type: `DecimalField`
  - Description: Full course price in naira
  - Constraints: `max_digits=12`, `decimal_places=2`, minimum `0.00`

- `currency`
  - Type: `CharField`
  - Description: Currency code
  - Constraints: default `NGN`

- `status`
  - Type: `CharField`
  - Description: Content lifecycle state
  - Constraints: choices `draft`, `published`, `archived`; default `draft`

- `visibility`
  - Type: `CharField`
  - Description: Catalog visibility state
  - Constraints: choices `visible`, `hidden`; default `hidden`

- `featured`
  - Type: `BooleanField`
  - Description: Whether admins want to promote it in discovery
  - Constraints: default `False`

- `thumbnail`
  - Type: `ImageField` or `URLField`
  - Description: Course image if later introduced
  - Constraints: optional

- `total_lessons`
  - Type: `PositiveIntegerField`
  - Description: Cached lesson count for faster list responses
  - Constraints: default `0`

- `published_at`
  - Type: `DateTimeField`
  - Description: Timestamp when the course was first published
  - Constraints: nullable

- `created_at`
  - Type: `DateTimeField`
  - Description: Creation timestamp

- `updated_at`
  - Type: `DateTimeField`
  - Description: Last update timestamp

#### Relationships

- Many courses belong to one teacher
- Many courses belong to one category
- Many courses belong to one subcategory
- One course has many sections
- One course has many enrollments
- One course has many transactions
- One course has many certificates

### Model Name: `CourseTag`

#### Purpose

The current frontend uses tags on courses. A normalized tag model is cleaner than storing comma-separated text.

#### Fields

- `id`: UUID primary key
- `name`: char field, unique
- `slug`: slug field, unique

#### Relationships

- Many tags belong to many courses through a many-to-many field on `Course`

### Model Name: `Section`

#### Purpose

This groups lessons and tasks inside a course. It is the main access-control unit for free preview versus paid content.

#### Fields

- `id`
  - Type: `UUIDField`
  - Description: Primary key

- `course`
  - Type: `ForeignKey` to `Course`
  - Description: Parent course
  - Constraints: cascade delete

- `title`
  - Type: `CharField`
  - Description: Section title
  - Constraints: max length 255, required

- `description`
  - Type: `TextField`
  - Description: Section summary
  - Constraints: required

- `order`
  - Type: `PositiveIntegerField`
  - Description: Position within the course
  - Constraints: unique together with course

- `access_type`
  - Type: `CharField`
  - Description: Determines whether this section is previewable without payment
  - Constraints: choices `free`, `paid`; required

- `is_published`
  - Type: `BooleanField`
  - Description: Allows hiding incomplete sections
  - Constraints: default `True`

- `created_at`
  - Type: `DateTimeField`

- `updated_at`
  - Type: `DateTimeField`

#### Relationships

- One course has many sections
- One section has many lessons
- One section has many tasks

### Model Name: `Lesson`

#### Purpose

This stores individual learning units inside sections.

#### Fields

- `id`
  - Type: `UUIDField`
  - Description: Primary key

- `section`
  - Type: `ForeignKey` to `Section`
  - Description: Parent section
  - Constraints: cascade delete

- `title`
  - Type: `CharField`
  - Description: Lesson title
  - Constraints: max length 255, required

- `content_type`
  - Type: `CharField`
  - Description: Specifies whether the lesson is video-based or text-based
  - Constraints: choices `video`, `text`

- `video_url`
  - Type: `URLField`
  - Description: Video source URL for video lessons
  - Constraints: optional, but required when `content_type=video`

- `text_content`
  - Type: `TextField`
  - Description: HTML or markdown lesson content
  - Constraints: optional, but required when `content_type=text`

- `duration_minutes`
  - Type: `PositiveIntegerField`
  - Description: Numeric duration used for analytics and API formatting
  - Constraints: nullable if unknown

- `order`
  - Type: `PositiveIntegerField`
  - Description: Position within the section
  - Constraints: unique together with section

- `is_previewable`
  - Type: `BooleanField`
  - Description: Optional override if certain lessons should be previewable inside a paid section
  - Constraints: default `False`

- `is_published`
  - Type: `BooleanField`
  - Description: Allows hidden lessons inside published sections
  - Constraints: default `True`

- `created_at`
  - Type: `DateTimeField`

- `updated_at`
  - Type: `DateTimeField`

#### Relationships

- Many lessons belong to one section
- One lesson has many lesson progress records

### Model Name: `Task`

#### Purpose

This stores task or assessment data linked to a section.

#### Fields

- `id`
  - Type: `UUIDField`

- `section`
  - Type: `ForeignKey` to `Section`
  - Description: Parent section
  - Constraints: cascade delete

- `title`
  - Type: `CharField`
  - Description: Task title
  - Constraints: max length 255, required

- `instructions`
  - Type: `TextField`
  - Description: Detailed instructions for the student
  - Constraints: required

- `submission_type`
  - Type: `CharField`
  - Description: How the task is expected to be submitted
  - Constraints: choices `file_upload`, `text_submission`, `external_link`; required

- `resource_links`
  - Type: `JSONField`
  - Description: Array of helper links used by the frontend such as guide video or submission channel
  - Constraints: default empty list

- `order`
  - Type: `PositiveIntegerField`
  - Description: Position within the section
  - Constraints: unique together with section

- `is_required`
  - Type: `BooleanField`
  - Description: Whether task completion matters for course completion rules
  - Constraints: default `False`

- `created_at`
  - Type: `DateTimeField`

- `updated_at`
  - Type: `DateTimeField`

#### Relationships

- Many tasks belong to one section

### D. `enrollments` app

### Model Name: `Enrollment`

#### Purpose

This is the authoritative record that a student has access to a course.

#### Fields

- `id`
  - Type: `UUIDField`

- `student`
  - Type: `ForeignKey` to `accounts.StudentProfile`
  - Description: Student who owns access
  - Constraints: cascade delete

- `course`
  - Type: `ForeignKey` to `courses.Course`
  - Description: Course the student can access
  - Constraints: cascade delete

- `access_source`
  - Type: `CharField`
  - Description: Explains how access was granted
  - Constraints: choices `free`, `payment`, `admin_grant`

- `status`
  - Type: `CharField`
  - Description: Enrollment state
  - Constraints: choices `active`, `completed`, `revoked`; default `active`

- `enrolled_at`
  - Type: `DateTimeField`
  - Description: When access was granted

- `completed_at`
  - Type: `DateTimeField`
  - Description: When the course was fully completed
  - Constraints: nullable

- `last_accessed_at`
  - Type: `DateTimeField`
  - Description: Used for continue learning ordering
  - Constraints: nullable

- `last_lesson`
  - Type: `ForeignKey` to `courses.Lesson`
  - Description: Last opened lesson for fast continuity
  - Constraints: nullable, `SET_NULL`

#### Relationships

- Many enrollments belong to one student
- Many enrollments belong to one course
- One enrollment has one or many lesson progress records
- One enrollment may produce one certificate

#### Constraints

- `unique_together(student, course)` is required

### Model Name: `Watchlist`

#### Purpose

This stores courses a student has saved for later.

#### Fields

- `id`
  - Type: `UUIDField`

- `student`
  - Type: `ForeignKey` to `accounts.StudentProfile`
  - Description: Student saving the course

- `course`
  - Type: `ForeignKey` to `courses.Course`
  - Description: Saved course

- `created_at`
  - Type: `DateTimeField`

#### Relationships

- Many watchlist entries belong to one student
- Many watchlist entries point to one course

#### Constraints

- `unique_together(student, course)` is required

### E. `progress` app

### Model Name: `LessonProgress`

#### Purpose

This stores student progress at lesson level. It is the main unit for completion calculations.

#### Fields

- `id`
  - Type: `UUIDField`

- `enrollment`
  - Type: `ForeignKey` to `enrollments.Enrollment`
  - Description: Connects progress to a specific student-course pairing

- `lesson`
  - Type: `ForeignKey` to `courses.Lesson`
  - Description: Lesson being tracked

- `status`
  - Type: `CharField`
  - Description: Lesson progress state
  - Constraints: choices `not_started`, `in_progress`, `completed`; default `not_started`

- `first_accessed_at`
  - Type: `DateTimeField`
  - Description: First lesson open timestamp
  - Constraints: nullable

- `last_accessed_at`
  - Type: `DateTimeField`
  - Description: Most recent lesson open timestamp
  - Constraints: nullable

- `completed_at`
  - Type: `DateTimeField`
  - Description: Completion timestamp
  - Constraints: nullable

- `time_spent_seconds`
  - Type: `PositiveIntegerField`
  - Description: Optional analytics field if video/text engagement is later tracked
  - Constraints: default `0`

#### Relationships

- Many progress rows belong to one enrollment
- Many progress rows belong to one lesson

#### Constraints

- `unique_together(enrollment, lesson)` is required

### Model Name: `CourseProgress`

#### Purpose

This stores cached course-level progress to avoid recalculating percentages on every request.

#### Fields

- `id`
  - Type: `UUIDField`

- `enrollment`
  - Type: `OneToOneField` to `enrollments.Enrollment`
  - Description: One cached course progress row per enrollment

- `completed_lessons_count`
  - Type: `PositiveIntegerField`
  - Description: Number of completed lessons

- `total_lessons_count`
  - Type: `PositiveIntegerField`
  - Description: Total lessons in the course at calculation time

- `progress_percent`
  - Type: `DecimalField`
  - Description: Percentage completion, for example `62.50`
  - Constraints: `max_digits=5`, `decimal_places=2`

- `is_completed`
  - Type: `BooleanField`
  - Description: Whether student finished the course

- `updated_at`
  - Type: `DateTimeField`

#### Relationships

- One course progress record belongs to one enrollment

### F. `payments` app

### Model Name: `Payment`

#### Purpose

This is the business-level record that represents the student paying for course access. It groups transaction outcome and final purchase state.

#### Fields

- `id`
  - Type: `UUIDField`

- `student`
  - Type: `ForeignKey` to `accounts.StudentProfile`
  - Description: Purchasing student

- `course`
  - Type: `ForeignKey` to `courses.Course`
  - Description: Course being unlocked

- `amount`
  - Type: `DecimalField`
  - Description: Amount charged
  - Constraints: positive, two decimal places

- `currency`
  - Type: `CharField`
  - Description: Currency code
  - Constraints: default `NGN`

- `payment_method`
  - Type: `CharField`
  - Description: Selected provider/method
  - Constraints: choices `paystack`, `opay`

- `status`
  - Type: `CharField`
  - Description: Overall payment state
  - Constraints: choices `pending`, `successful`, `failed`, `cancelled`, `refunded`

- `description`
  - Type: `CharField`
  - Description: Human-readable line item, for example `Frontend React Studio full course access`
  - Constraints: max length 255

- `paid_at`
  - Type: `DateTimeField`
  - Description: Confirmed payment time
  - Constraints: nullable until successful

- `created_at`
  - Type: `DateTimeField`

- `updated_at`
  - Type: `DateTimeField`

#### Relationships

- Many payments belong to one student
- Many payments belong to one course
- One payment has many transactions, though one successful transaction is expected in normal flow

### Model Name: `Transaction`

#### Purpose

This stores provider-specific transaction data. It is necessary for auditability, webhook reconciliation, and retry-safe payment verification.

#### Fields

- `id`
  - Type: `UUIDField`

- `payment`
  - Type: `ForeignKey` to `Payment`
  - Description: Parent payment record

- `provider`
  - Type: `CharField`
  - Description: Payment provider
  - Constraints: choices `paystack`, `opay`

- `reference`
  - Type: `CharField`
  - Description: Unique provider reference generated by More SkillUp or returned by provider
  - Constraints: unique, indexed

- `provider_transaction_id`
  - Type: `CharField`
  - Description: Native provider transaction identifier
  - Constraints: nullable until returned

- `provider_status`
  - Type: `CharField`
  - Description: Raw provider state such as `success`, `failed`, `pending`
  - Constraints: max length 50

- `amount`
  - Type: `DecimalField`
  - Description: Amount reported by provider

- `currency`
  - Type: `CharField`
  - Description: Provider-reported currency

- `authorization_url`
  - Type: `URLField`
  - Description: Redirect URL returned during initialization
  - Constraints: nullable

- `gateway_response`
  - Type: `JSONField`
  - Description: Raw verification or webhook payload for auditing
  - Constraints: default empty dict

- `verified_at`
  - Type: `DateTimeField`
  - Description: When backend successfully verified the payment
  - Constraints: nullable

- `created_at`
  - Type: `DateTimeField`

- `updated_at`
  - Type: `DateTimeField`

#### Relationships

- Many transactions can belong to one payment

### G. `notifications` app

### Model Name: `Notification`

#### Purpose

This stores notifications visible to individual users.

#### Fields

- `id`
  - Type: `UUIDField`

- `user`
  - Type: `ForeignKey` to `accounts.User`
  - Description: Target user

- `title`
  - Type: `CharField`
  - Description: Notification title
  - Constraints: max length 255

- `body`
  - Type: `TextField`
  - Description: Notification body

- `kind`
  - Type: `CharField`
  - Description: Notification type
  - Constraints: choices such as `course`, `payment`, `message`, `reward`

- `is_read`
  - Type: `BooleanField`
  - Description: Read state
  - Constraints: default `False`

- `expires_at`
  - Type: `DateTimeField`
  - Description: Used for auto-delete logic
  - Constraints: nullable

- `created_at`
  - Type: `DateTimeField`

#### Relationships

- Many notifications belong to one user

### Model Name: `BroadcastNotification`

#### Purpose

This stores admin-created broadcast messages before and after fan-out.

#### Fields

- `id`
  - Type: `UUIDField`

- `created_by`
  - Type: `ForeignKey` to `accounts.User`
  - Description: Admin who sent the message

- `title`
  - Type: `CharField`
  - Description: Broadcast title

- `description`
  - Type: `TextField`
  - Description: Broadcast body

- `audience`
  - Type: `CharField`
  - Description: Broadcast target group
  - Constraints: choices `students`, `teachers`, `all`

- `status`
  - Type: `CharField`
  - Description: Delivery state
  - Constraints: choices `draft`, `sent`

- `sent_at`
  - Type: `DateTimeField`
  - Description: Time sent
  - Constraints: nullable

- `expires_at`
  - Type: `DateTimeField`
  - Description: Optional cleanup timestamp
  - Constraints: nullable

- `created_at`
  - Type: `DateTimeField`

#### Relationships

- One broadcast may result in many user notifications

### H. `certificates` app

### Model Name: `Certificate`

#### Purpose

This stores proof that a student completed a certificate-eligible course.

#### Fields

- `id`
  - Type: `UUIDField`

- `student`
  - Type: `ForeignKey` to `accounts.StudentProfile`
  - Description: Recipient

- `course`
  - Type: `ForeignKey` to `courses.Course`
  - Description: Completed course

- `enrollment`
  - Type: `OneToOneField` to `enrollments.Enrollment`
  - Description: Connects certificate to specific completion record

- `certificate_code`
  - Type: `CharField`
  - Description: Unique verification code such as `MSU-BE-PY-000123`
  - Constraints: unique, indexed

- `issued_at`
  - Type: `DateTimeField`
  - Description: Issue timestamp

- `pdf_file`
  - Type: `FileField`
  - Description: Generated PDF certificate file
  - Constraints: optional if generation is async or external

- `verification_url`
  - Type: `URLField`
  - Description: Public verification endpoint
  - Constraints: optional but recommended

- `created_at`
  - Type: `DateTimeField`

#### Relationships

- Many certificates belong to students
- Many certificates belong to courses
- One enrollment should produce at most one certificate

#### Constraints

- `unique_together(student, course)` is strongly recommended

---

## 6. PERMISSIONS SYSTEM

Permissions should be enforced at three levels:

- route level
- serializer validation level
- queryset filtering level

### Admin permissions

The admin can:

- create, update, archive, or reassign categories and subcategories
- manage teachers and student status
- view all courses
- reassign course ownership
- create broadcast notifications
- view all payments and transactions
- manually grant or revoke enrollments if business rules allow
- view certificates and system reports

The admin cannot:

- impersonate users without an explicit admin feature
- silently mark payments successful without an audit trail

### Teacher permissions

The teacher can:

- create courses they own
- edit their own draft or published courses
- add, update, reorder, and delete their own sections, lessons, and tasks
- set pricing on their own courses
- publish or unpublish their own courses
- view enrollments and progress for their own courses

The teacher cannot:

- edit another teacher’s courses
- create platform categories
- verify payments
- reassign ownership unless granted admin privileges

### Student permissions

The student can:

- register and manage their own account
- browse published and visible courses
- view course previews
- add or remove courses from watchlist
- initialize payments for courses they do not already own
- view their own payment history
- access lessons only for free courses or enrolled paid courses
- update their own lesson progress
- view and download their own certificates

The student cannot:

- create or edit courses
- change course pricing
- access paid content without valid enrollment
- view another student’s progress or payments

### Object-level permission rules

- Course edit endpoints must confirm the authenticated teacher owns the course.
- Lesson and task edit endpoints must confirm ownership through the parent course.
- Enrollment and payment list endpoints must filter to the current student unless the requester is admin.
- Certificate endpoints must filter to certificate owner unless the requester is admin.

---

## 7. SERIALIZERS (EXPLAIN STRUCTURE)

Serializers convert database objects into API responses and validate API inputs.

### `accounts` serializers

#### `UserRegistrationSerializer`

Includes input fields:

- email
- username
- display_name
- password
- role

Validates:

- unique email
- unique username
- allowed role for public signup
- password strength

Outputs:

- JWT tokens
- normalized user payload
- role-specific profile payload

#### `UserLoginSerializer`

Includes input fields:

- email
- password

Outputs:

- access token
- refresh token
- user summary

#### `UserMeSerializer`

Outputs:

- id
- email
- username
- display_name
- role
- avatar
- profile-specific data

#### `TeacherProfileSerializer`

Outputs:

- teacher profile fields
- user identity summary

#### `StudentProfileSerializer`

Outputs:

- student learning preferences
- plan

### `categories` serializers

#### `CategorySerializer`

Outputs:

- id
- name
- slug
- description
- is_active

#### `SubcategorySerializer`

Outputs:

- id
- category_id
- name
- slug
- description
- is_active

#### `CategoryWithSubcategoriesSerializer`

Outputs:

- top-level category fields
- nested subcategory array

### `courses` serializers

#### `CourseListSerializer`

Used for browse and dashboard list cards.

Should include:

- id
- slug
- title
- subtitle
- teacher display name
- category and subcategory labels
- price
- currency
- status
- visibility
- total lessons
- progress summary for current user
- ownership flags
- watchlist flag for current user

#### `CourseDetailSerializer`

Used for preview and full course pages.

Should include:

- course list fields
- overview
- scheme_of_work
- roadmap_link
- tags
- sections
- each section’s lessons and tasks
- per-user access flags such as `is_locked`, `is_free`, `can_unlock`

#### `CourseCreateUpdateSerializer`

Used by teachers for create and edit.

Input fields:

- category_id
- subcategory_id
- title
- subtitle
- overview
- scheme_of_work
- roadmap_link
- price
- tags
- visibility

Validates:

- chosen subcategory belongs to chosen category
- price is not negative
- title and subtitle are not blank

#### `SectionSerializer`

Outputs:

- id
- title
- description
- order
- access_type
- lessons
- tasks
- computed field `is_locked` for student-facing endpoints

#### `LessonSerializer`

Outputs:

- id
- title
- content_type
- video_url or text_content
- duration_minutes
- order
- status for current student

#### `TaskSerializer`

Outputs:

- id
- title
- instructions
- submission_type
- resource_links
- is_required

### `enrollments` serializers

#### `EnrollmentSerializer`

Outputs:

- id
- course summary
- access_source
- status
- enrolled_at
- completed_at
- last_accessed_at
- last_lesson summary

#### `WatchlistSerializer`

Outputs:

- id
- course summary
- created_at

### `payments` serializers

#### `PaymentInitializeSerializer`

Input:

- course_id
- payment_method
- callback_url

Validates:

- course exists
- course is published and visible
- course price is greater than zero
- student does not already own the course

#### `PaymentInitializeResponseSerializer`

Outputs:

- payment_id
- transaction_id
- reference
- authorization_url
- amount
- currency
- provider
- status

#### `PaymentSerializer`

Outputs:

- id
- course summary
- amount
- currency
- payment_method
- status
- description
- paid_at

#### `TransactionSerializer`

Outputs:

- id
- payment_id
- provider
- reference
- provider_status
- verified_at

### `notifications` serializers

#### `NotificationSerializer`

Outputs:

- id
- title
- body
- kind
- is_read
- created_at
- expires_at

#### `BroadcastNotificationSerializer`

Input/output fields:

- title
- description
- audience
- status
- sent_at

### `progress` serializers

#### `LessonProgressUpdateSerializer`

Input:

- status

Outputs:

- lesson_id
- status
- completed_at
- last_accessed_at

#### `CourseProgressSerializer`

Outputs:

- course_id
- completed_lessons_count
- total_lessons_count
- progress_percent
- is_completed

### `certificates` serializers

#### `CertificateSerializer`

Outputs:

- id
- course summary
- certificate_code
- issued_at
- verification_url
- download_url

---

## 8. API SCHEMA (VERY DETAILED)

Base path:

```text
/api/
```

All protected endpoints use JWT access tokens in the `Authorization` header:

```text
Authorization: Bearer <access_token>
```

### Auth APIs

### 1. Register

- Endpoint name: Register user
- Method: `POST`
- URL: `/api/auth/register/`

#### Request body

```json
{
  "email": "student@example.com",
  "username": "alex.moore",
  "display_name": "Alex Moore",
  "password": "StrongPassword123!",
  "role": "student"
}
```

#### Response

```json
{
  "access": "jwt-access-token",
  "refresh": "jwt-refresh-token",
  "user": {
    "id": "uuid",
    "email": "student@example.com",
    "username": "alex.moore",
    "display_name": "Alex Moore",
    "role": "student",
    "avatar": "AM"
  },
  "profile": {
    "selected_interest": null,
    "selected_track": null,
    "plan": "free"
  }
}
```

### 2. Login

- Endpoint name: Login
- Method: `POST`
- URL: `/api/auth/login/`

#### Request body

```json
{
  "email": "student@example.com",
  "password": "StrongPassword123!"
}
```

#### Response

```json
{
  "access": "jwt-access-token",
  "refresh": "jwt-refresh-token",
  "user": {
    "id": "uuid",
    "email": "student@example.com",
    "username": "alex.moore",
    "display_name": "Alex Moore",
    "role": "student",
    "avatar": "AM"
  }
}
```

### 3. Refresh token

- Endpoint name: Refresh token
- Method: `POST`
- URL: `/api/auth/refresh/`

#### Request body

```json
{
  "refresh": "jwt-refresh-token"
}
```

#### Response

```json
{
  "access": "new-jwt-access-token"
}
```

### 4. Get current user

- Endpoint name: Get current user
- Method: `GET`
- URL: `/api/auth/me/`

#### Response

```json
{
  "id": "uuid",
  "email": "student@example.com",
  "username": "alex.moore",
  "display_name": "Alex Moore",
  "role": "student",
  "avatar": "AM",
  "profile": {
    "selected_interest": "Backend Development",
    "selected_track": "Backend with Python",
    "plan": "free"
  }
}
```

### 5. Update current user

- Endpoint name: Update current user
- Method: `PATCH`
- URL: `/api/auth/me/`

#### Request body

```json
{
  "display_name": "Alex A. Moore",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

#### Response

Returns updated `me` payload.

### 6. Request password reset

- Endpoint name: Request password reset
- Method: `POST`
- URL: `/api/auth/password-reset/request/`

#### Request body

```json
{
  "email": "student@example.com"
}
```

#### Response

```json
{
  "detail": "If the account exists, a reset link has been sent."
}
```

### 7. Confirm password reset

- Endpoint name: Confirm password reset
- Method: `POST`
- URL: `/api/auth/password-reset/confirm/`

#### Request body

```json
{
  "token": "secure-reset-token",
  "password": "NewStrongPassword123!"
}
```

#### Response

```json
{
  "detail": "Password reset successful."
}
```

### Teacher APIs

### 8. Create course

- Endpoint name: Create course
- Method: `POST`
- URL: `/api/teacher/courses/`

#### Request body

```json
{
  "category_id": "uuid",
  "subcategory_id": "uuid",
  "title": "Frontend React Studio",
  "subtitle": "Modern frontend delivery from HTML foundations to polished React interfaces",
  "overview": "<p>Course overview</p>",
  "scheme_of_work": "Week 1\nWeek 2\nWeek 3",
  "roadmap_link": "https://roadmap.sh/frontend",
  "price": "18500.00",
  "tags": ["React", "HTML", "CSS"],
  "visibility": "hidden"
}
```

#### Response

```json
{
  "id": "uuid",
  "status": "draft",
  "visibility": "hidden",
  "title": "Frontend React Studio"
}
```

### 9. List teacher courses

- Endpoint name: List teacher courses
- Method: `GET`
- URL: `/api/teacher/courses/`

#### Response

Array of teacher-owned courses with summary fields.

### 10. Get teacher course detail

- Endpoint name: Get teacher course detail
- Method: `GET`
- URL: `/api/teacher/courses/<course_id>/`

#### Response

Full editable course structure including sections, lessons, and tasks.

### 11. Update course

- Endpoint name: Update course
- Method: `PATCH`
- URL: `/api/teacher/courses/<course_id>/`

#### Request body

Any editable subset of course fields.

#### Response

Updated course detail.

### 12. Delete course

- Endpoint name: Delete course
- Method: `DELETE`
- URL: `/api/teacher/courses/<course_id>/`

#### Response

`204 No Content`

### 13. Add section

- Endpoint name: Create section
- Method: `POST`
- URL: `/api/teacher/courses/<course_id>/sections/`

#### Request body

```json
{
  "title": "HTML and CSS Foundations",
  "description": "Introductory section for frontend basics",
  "order": 1,
  "access_type": "free"
}
```

#### Response

Created section payload.

### 14. Update section

- Endpoint name: Update section
- Method: `PATCH`
- URL: `/api/teacher/sections/<section_id>/`

#### Request body

```json
{
  "title": "HTML, CSS, and Web Structure",
  "access_type": "paid"
}
```

#### Response

Updated section payload.

### 15. Delete section

- Endpoint name: Delete section
- Method: `DELETE`
- URL: `/api/teacher/sections/<section_id>/`

### 16. Add lesson

- Endpoint name: Create lesson
- Method: `POST`
- URL: `/api/teacher/sections/<section_id>/lessons/`

#### Request body

```json
{
  "title": "How the web works",
  "content_type": "video",
  "video_url": "https://youtube.com/watch?v=123",
  "duration_minutes": 12,
  "order": 1
}
```

#### Response

Created lesson payload.

### 17. Update lesson

- Endpoint name: Update lesson
- Method: `PATCH`
- URL: `/api/teacher/lessons/<lesson_id>/`

### 18. Delete lesson

- Endpoint name: Delete lesson
- Method: `DELETE`
- URL: `/api/teacher/lessons/<lesson_id>/`

### 19. Add task

- Endpoint name: Create task
- Method: `POST`
- URL: `/api/teacher/sections/<section_id>/tasks/`

#### Request body

```json
{
  "title": "Landing page challenge",
  "instructions": "Build the page described in the section",
  "submission_type": "external_link",
  "resource_links": [
    "https://youtube.com/watch?v=guide",
    "https://wa.me/2340000000000"
  ],
  "order": 1,
  "is_required": true
}
```

### 20. Update task

- Endpoint name: Update task
- Method: `PATCH`
- URL: `/api/teacher/tasks/<task_id>/`

### 21. Delete task

- Endpoint name: Delete task
- Method: `DELETE`
- URL: `/api/teacher/tasks/<task_id>/`

### 22. Set pricing

- Endpoint name: Set pricing
- Method: `PATCH`
- URL: `/api/teacher/courses/<course_id>/pricing/`

#### Request body

```json
{
  "price": "22500.00",
  "currency": "NGN"
}
```

#### Response

```json
{
  "id": "uuid",
  "price": "22500.00",
  "currency": "NGN"
}
```

### 23. Publish course

- Endpoint name: Publish course
- Method: `POST`
- URL: `/api/teacher/courses/<course_id>/publish/`

#### Response

```json
{
  "id": "uuid",
  "status": "published",
  "visibility": "visible",
  "published_at": "2026-04-22T10:00:00Z"
}
```

### Student APIs

### 24. Browse courses

- Endpoint name: Browse courses
- Method: `GET`
- URL: `/api/courses/`

#### Query parameters

- `category`
- `subcategory`
- `search`
- `price_type` with values `free` or `paid`
- `owned=true|false`
- `watchlist=true|false`

#### Response

```json
[
  {
    "id": "uuid",
    "slug": "frontend-react-studio",
    "title": "Frontend React Studio",
    "subtitle": "Modern frontend delivery from HTML foundations to polished React interfaces",
    "teacher_name": "Mina Duarte",
    "price": "18500.00",
    "currency": "NGN",
    "is_owned": false,
    "is_in_watchlist": true,
    "cta": "unlock_course"
  }
]
```

### 25. View course

- Endpoint name: Course detail
- Method: `GET`
- URL: `/api/courses/<course_id>/`

#### Response

Should include:

- course metadata
- pricing
- section array
- lesson visibility state
- task visibility state
- computed lock flags for the authenticated student

### 26. Add to watchlist

- Endpoint name: Add to watchlist
- Method: `POST`
- URL: `/api/watchlist/`

#### Request body

```json
{
  "course_id": "uuid"
}
```

#### Response

```json
{
  "id": "uuid",
  "course_id": "uuid",
  "created_at": "2026-04-22T10:00:00Z"
}
```

### 27. Remove from watchlist

- Endpoint name: Remove from watchlist
- Method: `DELETE`
- URL: `/api/watchlist/<course_id>/`

### 28. List watchlist

- Endpoint name: List watchlist
- Method: `GET`
- URL: `/api/watchlist/`

### 29. My courses

- Endpoint name: List student enrolled courses
- Method: `GET`
- URL: `/api/my-courses/`

#### Response

Array of enrolled course summaries plus progress data.

### 30. Unlock course

- Endpoint name: Unlock course through payment initialization
- Method: `POST`
- URL: `/api/payments/initialize/`

#### Request body

```json
{
  "course_id": "uuid",
  "payment_method": "paystack",
  "callback_url": "https://frontend.example.com/payment/callback"
}
```

#### Response

```json
{
  "payment_id": "uuid",
  "transaction_id": "uuid",
  "reference": "PSTK-ABC12345",
  "authorization_url": "https://checkout.paystack.com/...",
  "amount": "18500.00",
  "currency": "NGN",
  "provider": "paystack",
  "status": "pending"
}
```

### 31. Track progress

- Endpoint name: Mark lesson in progress or completed
- Method: `POST`
- URL: `/api/progress/lessons/<lesson_id>/`

#### Request body

```json
{
  "status": "completed"
}
```

#### Response

```json
{
  "lesson_id": "uuid",
  "status": "completed",
  "course_progress": {
    "completed_lessons_count": 5,
    "total_lessons_count": 20,
    "progress_percent": "25.00",
    "is_completed": false
  }
}
```

### 32. Get progress summary

- Endpoint name: Get course progress
- Method: `GET`
- URL: `/api/progress/courses/<course_id>/`

### 33. Continue learning payload

- Endpoint name: Continue learning
- Method: `GET`
- URL: `/api/dashboard/student/`

#### Response

Should include:

- dashboard user summary
- continue learning course
- recent courses
- recommended courses
- notification preview

### Admin APIs

### 34. Create category

- Endpoint name: Create category
- Method: `POST`
- URL: `/api/admin/categories/`

#### Request body

```json
{
  "name": "AI and Data",
  "description": "Learning paths for AI, ML, and data workflows"
}
```

### 35. List categories

- Endpoint name: List categories
- Method: `GET`
- URL: `/api/admin/categories/`

### 36. Update category

- Endpoint name: Update category
- Method: `PATCH`
- URL: `/api/admin/categories/<category_id>/`

### 37. Delete category

- Endpoint name: Delete category
- Method: `DELETE`
- URL: `/api/admin/categories/<category_id>/`

### 38. Create subcategory

- Endpoint name: Create subcategory
- Method: `POST`
- URL: `/api/admin/subcategories/`

#### Request body

```json
{
  "category_id": "uuid",
  "name": "AI Automation",
  "description": "Automation workflows powered by AI"
}
```

### 39. Manage teachers

- Endpoint name: List teachers
- Method: `GET`
- URL: `/api/admin/teachers/`

### 40. Update teacher

- Endpoint name: Update teacher profile or status
- Method: `PATCH`
- URL: `/api/admin/teachers/<teacher_id>/`

#### Request body

```json
{
  "display_name": "Mina Duarte",
  "status": "active"
}
```

### 41. Reassign courses

- Endpoint name: Reassign course owner
- Method: `POST`
- URL: `/api/admin/courses/<course_id>/reassign/`

#### Request body

```json
{
  "new_teacher_profile_id": "uuid"
}
```

#### Response

```json
{
  "detail": "Course reassigned successfully."
}
```

### 42. Broadcast notifications

- Endpoint name: Create and send broadcast
- Method: `POST`
- URL: `/api/admin/broadcasts/`

#### Request body

```json
{
  "title": "New backend course sections unlocked",
  "description": "Students can now preview the first backend section before purchase.",
  "audience": "students"
}
```

### Payments APIs

### 43. Initialize payment

- Endpoint name: Initialize payment
- Method: `POST`
- URL: `/api/payments/initialize/`

This is the same student unlock action described above. It creates:

- a `Payment` row with status `pending`
- a `Transaction` row with provider reference

### 44. Verify payment

- Endpoint name: Verify payment by reference
- Method: `POST`
- URL: `/api/payments/verify/`

#### Request body

```json
{
  "reference": "PSTK-ABC12345"
}
```

#### Response

```json
{
  "payment_id": "uuid",
  "reference": "PSTK-ABC12345",
  "status": "successful",
  "course_unlocked": true
}
```

### 45. Webhook handling

- Endpoint name: Payment webhook
- Method: `POST`
- URL: `/api/payments/webhooks/paystack/`

Request body:

- raw JSON exactly as sent by Paystack

Response:

```json
{
  "detail": "Webhook processed."
}
```

Equivalent OPay endpoint:

- Method: `POST`
- URL: `/api/payments/webhooks/opay/`

### 46. Student payment history

- Endpoint name: List student payments
- Method: `GET`
- URL: `/api/payments/`

#### Response

Array of `PaymentSerializer` payloads sorted by newest first.

### 47. Admin transaction history

- Endpoint name: List all transactions
- Method: `GET`
- URL: `/api/admin/transactions/`

---

## 9. COURSE FLOW LOGIC

### Course creation to publish logic

1. Teacher creates a draft course.
2. Draft course must contain minimum required metadata:
   - category
   - subcategory
   - title
   - subtitle
   - overview
   - scheme of work
   - non-negative price
3. Teacher adds at least one section.
4. Each section must have:
   - title
   - description
   - valid order
5. Each section must contain at least one lesson before publishing.
6. Each lesson must satisfy content rules:
   - video lessons require `video_url`
   - text lessons require `text_content`
7. Publish action runs validation.
8. If validation passes:
   - `status` becomes `published`
   - `visibility` becomes `visible` unless explicitly hidden
   - `published_at` is set if empty

### Free vs paid access logic

#### Free course

If `course.price == 0`:

- students do not need payment
- access can be granted automatically on first interaction or on first lesson open
- all sections should be accessible

#### Paid course

If `course.price > 0`:

- course preview is public or student-visible
- sections marked `free` are accessible without payment
- sections marked `paid` are locked unless active enrollment exists

### Unlock after payment logic

1. Student starts payment.
2. Successful payment creates or confirms `Enrollment` with `access_source=payment`.
3. The course detail endpoint checks for enrollment existence.
4. If enrollment exists:
   - `is_owned = true`
   - all sections return unlocked
   - lesson progress endpoints are permitted

---

## 10. PAYMENT SYSTEM (VERY IMPORTANT)

### Paystack integration flow

1. Student chooses Paystack.
2. Frontend sends course and callback data to `/api/payments/initialize/`.
3. Backend validates:
   - user is student
   - course exists and is published
   - course is paid
   - user is not already enrolled
4. Backend creates:
   - `Payment(status=pending)`
   - `Transaction(provider=paystack, reference=<generated_reference>)`
5. Backend calls Paystack initialize API with:
   - email
   - amount in kobo
   - reference
   - callback URL
   - metadata such as course id and user id
6. Backend stores `authorization_url` returned by Paystack.
7. Frontend redirects student to `authorization_url`.
8. Paystack sends webhook on transaction completion.
9. Backend validates webhook signature.
10. Backend fetches transaction verification from Paystack using the reference.
11. Backend compares:
   - amount
   - currency
   - status
   - reference
12. If valid, backend marks:
   - `Transaction.provider_status=success`
   - `Transaction.verified_at=now`
   - `Payment.status=successful`
   - `Payment.paid_at=now`
13. Backend creates `Enrollment` if it does not exist.
14. Backend creates user notification.

### OPay integration flow

The same flow applies conceptually, but the exact field names depend on the OPay API. The backend must abstract provider differences behind a service layer.

Recommended approach:

- create a `PaymentGatewayService` interface
- implement:
  - `PaystackGatewayService`
  - `OPayGatewayService`
- both services expose:
  - `initialize_payment(...)`
  - `verify_payment(reference)`
  - `validate_webhook(request)`

### Payment verification

Verification should never rely only on the frontend callback. The backend must verify directly with the provider.

The backend must confirm:

- provider status is successful
- provider amount matches expected course price
- provider currency matches `NGN`
- transaction reference belongs to a valid pending transaction
- payment was not already processed

### Webhooks

Webhook endpoints are critical because:

- frontend redirects are not guaranteed
- the user may close the browser
- the provider is the trusted source of final payment state

Webhook processing rules:

1. Read raw body.
2. Validate provider signature.
3. Parse event type.
4. Ignore unknown events safely.
5. Locate transaction by reference.
6. Use database transaction locking to prevent duplicate enrollment creation.
7. Update transaction and payment records idempotently.
8. If already successful, return success without side effects.

### Security checks

The backend must enforce:

- secret keys stored only in environment variables
- webhook signature verification
- amount validation against course price
- idempotent verification logic
- no direct trust in client-provided status
- locking or unique constraints to avoid double enrollment
- audit storage of raw provider response

---

## 11. PROGRESS TRACKING

### How lesson completion is stored

Lesson completion is stored in `LessonProgress`.

For each enrollment and lesson pair:

- `status` tracks current lesson state
- `completed_at` stores completion timestamp
- `last_accessed_at` tracks continuity

### How progress percentage is calculated

The formula is:

```text
progress_percent = (completed_lessons_count / total_lessons_count) * 100
```

### Calculation rules

- only lessons belonging to the enrolled course count
- only published lessons count
- tasks should not count toward lesson percentage unless business rules later change
- if total lessons is `0`, progress must be `0`
- when `completed_lessons_count == total_lessons_count`, set `is_completed = true`

### Update flow

1. Student opens lesson.
2. Backend updates `Enrollment.last_lesson` and `Enrollment.last_accessed_at`.
3. If student marks lesson complete:
   - upsert `LessonProgress` to `completed`
4. Recalculate or update cached `CourseProgress`
5. If course reaches 100%, mark enrollment completed and trigger certificate eligibility check

---

## 12. CERTIFICATE SYSTEM

### When certificate is generated

A certificate should be generated when:

- the course is marked certificate-eligible
- the enrollment is active
- all required lessons are completed
- a certificate for that enrollment does not already exist

### Conditions for generation

Minimum condition:

- `CourseProgress.progress_percent == 100`

Recommended additional conditions:

- enrollment status is not revoked
- course status is published
- certificate generation is not duplicated

### Certificate issuance flow

1. Completion logic detects course completion.
2. Backend checks for existing certificate.
3. Backend generates a unique `certificate_code`.
4. Backend creates a `Certificate` row.
5. Optional async task generates PDF and stores file path.
6. Frontend lists the certificate in `/certificates`.

### Verification

The backend should support a certificate verification endpoint:

- `GET /api/certificates/verify/<certificate_code>/`

Response should confirm:

- certificate exists
- student name
- course title
- issue date

---

## 13. NOTIFICATION SYSTEM

### Admin broadcast

Admin broadcasts are created in `BroadcastNotification`.

Flow:

1. Admin submits broadcast.
2. Backend saves broadcast with audience.
3. Backend selects matching users.
4. Backend creates one `Notification` per user.
5. Broadcast status becomes `sent`.

### User notifications

User notifications should be created for events such as:

- course unlocked after payment
- course reassigned to teacher
- admin broadcast received
- certificate issued

### Auto-delete logic

The current frontend previously used expiration cleanup for some local notifications. The backend should support expiration through `expires_at`.

Cleanup options:

- scheduled Celery beat job
- Django management command run by cron

Cleanup rule:

- delete notifications where `expires_at < now()`

Do not auto-delete payment notifications or certificate notifications too aggressively unless product requirements demand it.

---

## 14. FRONTEND ↔ BACKEND INTEGRATION

### How frontend calls APIs

The Next.js frontend should call the Django API using `NEXT_PUBLIC_API_URL`.

Recommended frontend API client responsibilities:

- attach JWT access token
- auto-refresh on `401` where appropriate
- normalize backend validation errors
- provide typed request and response functions

### Authentication flow with JWT

1. Frontend calls login or register endpoint.
2. Backend returns `access` and `refresh` tokens.
3. Frontend stores tokens securely.
4. Frontend includes access token in protected API calls.
5. When access token expires, frontend uses refresh token endpoint.

### Data flow examples

#### Explore courses flow

- Frontend calls `GET /api/courses/`
- Backend returns course list with ownership and watchlist flags
- Frontend renders card CTA based on `is_owned` and `price`

#### Course preview flow

- Frontend calls `GET /api/courses/<course_id>/`
- Backend returns sections with lock state based on enrollment
- Frontend renders `Unlock Course` for paid locked content

#### Payment flow

- Frontend calls `POST /api/payments/initialize/`
- Backend returns authorization URL
- Frontend redirects to provider
- Provider calls webhook
- Frontend later calls payment verification or simply refetches course and payment state

#### Learning flow

- Frontend opens lesson detail
- Frontend calls progress update endpoint when lesson is opened or completed
- Backend updates progress
- Frontend refetches dashboard and course state

---

## 15. DOCKER SETUP

### Services

The Docker Compose stack should include:

- `web`: Django application
- `db`: PostgreSQL
- `redis`: optional, for Celery and caching

### Django container responsibilities

The Django container should:

- install Python dependencies
- wait for PostgreSQL to be ready
- apply migrations
- optionally collect static files
- start the Django development server in local mode or Gunicorn in production mode

### PostgreSQL container responsibilities

The PostgreSQL container should:

- create the application database
- persist data through a Docker volume

### Redis container responsibilities

Redis is optional but recommended if:

- certificates are generated asynchronously
- notifications are queued
- caching is introduced

### Environment variables

At minimum:

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `DJANGO_ALLOWED_HOSTS`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_HOST`
- `DATABASE_PORT`
- `REDIS_URL`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PUBLIC_KEY`
- `PAYSTACK_WEBHOOK_SECRET`
- `OPAY_SECRET_KEY`
- `OPAY_PUBLIC_KEY`
- `OPAY_WEBHOOK_SECRET`
- `CORS_ALLOWED_ORIGINS`

---

## 16. DEVELOPMENT ROADMAP

### Phase 1: Auth system

Build:

- custom user model
- teacher profile
- student profile
- register
- login
- JWT refresh
- current user endpoint
- password reset

### Phase 2: Course system

Build:

- categories and subcategories
- course create and edit
- section create and edit
- lesson create and edit
- task create and edit
- teacher course publishing
- student browse and detail endpoints

### Phase 3: Payments

Build:

- payment initialization
- transaction model
- Paystack verification
- OPay verification
- webhooks
- enrollment creation after verified payment
- student payment history

### Phase 4: Progress

Build:

- enrollment model
- watchlist
- lesson progress
- course progress aggregation
- continue learning dashboard logic

### Phase 5: Optimization

Build:

- certificate generation
- notification expiration job
- analytics query optimization
- caching where necessary
- background tasks
- monitoring and error reporting

---

## 17. README FILE

The backend repository should contain a `README.md` with the following structure.

### Recommended README content

```text
# More SkillUp Backend

More SkillUp Backend is the Django REST API for the More SkillUp LMS platform.
It powers authentication, course management, payments, enrollments, progress tracking, notifications, and certificates.

## Stack

- Django
- Django REST Framework
- PostgreSQL
- Docker
- Redis (optional)

## Features

- JWT authentication
- Role-based accounts: admin, teacher, student
- Course creation with sections, lessons, and tasks
- Category and subcategory management
- Paid and free course access
- Paystack and OPay payment integration
- Progress tracking
- Notifications
- Certificates

## Setup

1. Copy `.env.example` to `.env`
2. Start services with Docker Compose
3. Run migrations
4. Create a superuser
5. Open the API at `http://localhost:8000/api/`

## Docker commands

- `docker compose up --build`
- `docker compose exec web python manage.py migrate`
- `docker compose exec web python manage.py createsuperuser`

## Main API groups

- `/api/auth/`
- `/api/courses/`
- `/api/teacher/`
- `/api/admin/`
- `/api/payments/`
- `/api/progress/`
- `/api/certificates/`
```

---

## 18. SETUP GUIDE (STEP-BY-STEP)

This setup guide assumes a fresh machine.

### Step 1: Install prerequisites

Install:

- Docker Desktop
- Git
- Python 3.12 or the project’s chosen version if local non-Docker execution is needed

### Step 2: Create backend directory

At the repository root, create:

```text
backend/
```

### Step 3: Create dependency files

Create:

- `backend/requirements/base.txt`
- `backend/requirements/dev.txt`
- `backend/requirements/prod.txt`

Add Django, DRF, PostgreSQL driver, SimpleJWT, cors headers, and optional Celery dependencies.

### Step 4: Create the Django project

Inside `backend/`:

1. create a virtual environment if desired
2. install dependencies
3. run Django project creation
4. create the domain apps inside `backend/apps/`

### Step 5: Configure settings

In `config/settings/base.py`:

- add installed apps
- set `AUTH_USER_MODEL = "accounts.User"`
- configure PostgreSQL
- configure DRF authentication and permissions
- configure timezone
- configure media and static settings

In `config/settings/dev.py`:

- enable debug
- set local allowed hosts
- set local CORS origins for the frontend

### Step 6: Configure Docker

Create:

- `docker/django/Dockerfile`
- `docker/django/entrypoint.sh`
- `docker-compose.yml`

Docker Compose should start:

- Django service
- PostgreSQL service
- Redis service if used

### Step 7: Create `.env`

Populate all required values:

- Django secret key
- DB credentials
- payment provider keys
- local frontend origin

### Step 8: Start containers

Run:

```text
docker compose up --build
```

This should build the image and start database and backend containers.

### Step 9: Run migrations

Inside the running web container:

```text
python manage.py makemigrations
python manage.py migrate
```

Purpose:

- `makemigrations` creates migration files from model definitions
- `migrate` applies them to PostgreSQL

### Step 10: Create superuser

Run:

```text
python manage.py createsuperuser
```

Purpose:

- gives admin access to Django admin
- allows immediate platform setup

### Step 11: Seed baseline data

Create either fixtures or a custom management command to seed:

- categories
- subcategories
- one admin
- sample teachers
- sample courses if needed

### Step 12: Start API server

If using Docker, the server should already be running through Compose.

If running locally without Docker:

```text
python manage.py runserver 0.0.0.0:8000
```

### Step 13: Verify basic endpoints

Test:

- `/api/auth/register/`
- `/api/auth/login/`
- `/api/courses/`
- `/api/admin/categories/`

### Step 14: Connect frontend

In the frontend `.env.local`, set:

```text
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Step 15: Enable payment sandbox mode

Use Paystack and OPay test credentials first. Never start with live keys.

### Step 16: Add automated tests

Before production deployment, create tests for:

- auth
- course authoring
- access control
- payment verification
- webhook idempotency
- progress calculation
- certificate issuance

### Step 17: Production readiness checklist

Before deployment:

- set `DEBUG=False`
- configure secure allowed hosts
- configure HTTPS
- set secure cookie settings
- use cloud media storage if needed
- configure centralized logging
- configure Sentry or similar error monitoring
- verify webhook endpoints publicly reachable

---

## Final Implementation Notes

To keep the backend aligned with the current frontend:

- prices should be stored in `NGN`
- paid access should unlock the full course, not individual lessons
- free preview access should be section-based
- student dashboard queries should return enough data for `Continue Learning`, `My Courses`, `Explore Courses`, `Watchlist`, and `Payments`
- payment verification must be server-controlled and idempotent
- certificate generation should trigger from course completion state, not from a manual frontend button alone

This blueprint is intended to be sufficient for both manual backend development and AI-assisted backend generation.
