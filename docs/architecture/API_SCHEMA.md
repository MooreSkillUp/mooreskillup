# API Schema

This document defines the backend contract the current Next.js frontend should target when replacing its mock data.

Base URL example:

```text
http://localhost:8000/api
```

## Authentication

### `POST /auth/register/`

Request:

```json
{
  "username": "alex.moore",
  "email": "alex@example.com",
  "password": "strong-password"
}
```

Response:

```json
{
  "access": "jwt-access-token",
  "refresh": "jwt-refresh-token",
  "user": {
    "id": "u_1",
    "username": "alex.moore",
    "display_name": "Alex Moore",
    "email": "alex@example.com",
    "avatar": "AM",
    "joined_at": "2026-04-20"
  }
}
```

### `POST /auth/login/`

Request:

```json
{
  "email": "alex@example.com",
  "password": "strong-password"
}
```

Response shape matches register.

### `POST /auth/refresh/`

```json
{
  "refresh": "jwt-refresh-token"
}
```

### `GET /auth/me/`

```json
{
  "id": "u_1",
  "username": "alex.moore",
  "display_name": "Alex Moore",
  "email": "alex@example.com",
  "avatar": "AM",
  "joined_at": "2026-04-20"
}
```

### `PATCH /auth/me/`

```json
{
  "username": "alex.moore",
  "display_name": "Alex Moore",
  "email": "alex@example.com"
}
```

## Courses

### Course list item

```json
{
  "id": "fullstack-101",
  "title": "Fullstack Web Development",
  "description": "From HTML fundamentals to deploying a complete React + API application.",
  "instructor": "Dr. Lena Park",
  "total_lessons": 16,
  "completed_lessons": 6,
  "cover": "from-primary to-primary-glow"
}
```

### Module

```json
{
  "id": "m1",
  "title": "Foundations of the Web",
  "week": 1,
  "lessons": [
    {
      "id": "m1-l1",
      "title": "How the web works",
      "duration": "10 min",
      "status": "completed",
      "video_id": "dQw4w9WgXcQ",
      "description": "Lesson description"
    }
  ]
}
```

### `GET /courses/`

Response:

```json
[
  {
    "id": "fullstack-101",
    "title": "Fullstack Web Development",
    "description": "From HTML fundamentals to deploying a complete React + API application.",
    "instructor": "Dr. Lena Park",
    "total_lessons": 16,
    "completed_lessons": 6,
    "cover": "from-primary to-primary-glow"
  }
]
```

### `GET /courses/<course_id>/`

Response:

```json
{
  "id": "fullstack-101",
  "title": "Fullstack Web Development",
  "description": "From HTML fundamentals to deploying a complete React + API application.",
  "instructor": "Dr. Lena Park",
  "total_lessons": 16,
  "completed_lessons": 6,
  "cover": "from-primary to-primary-glow",
  "modules": [
    {
      "id": "m1",
      "title": "Foundations of the Web",
      "week": 1,
      "lessons": [
        {
          "id": "m1-l1",
          "title": "How the web works",
          "duration": "10 min",
          "status": "completed",
          "video_id": "dQw4w9WgXcQ",
          "description": "Lesson description"
        }
      ]
    }
  ]
}
```

## Lessons

### `GET /lessons/<lesson_id>/`

```json
{
  "id": "m1-l1",
  "title": "How the web works",
  "duration": "10 min",
  "status": "completed",
  "video_id": "dQw4w9WgXcQ",
  "description": "Lesson description",
  "course": {
    "id": "fullstack-101",
    "title": "Fullstack Web Development"
  },
  "module": {
    "id": "m1",
    "title": "Foundations of the Web",
    "week": 1
  }
}
```

### `POST /lessons/<lesson_id>/complete/`

```json
{
  "completed": true,
  "completed_at": "2026-04-20T12:00:00Z"
}
```

### `PUT /lessons/<lesson_id>/notes/`

```json
{
  "notes": "Short user note saved from the lesson page."
}
```

## Dashboard

### `GET /dashboard/`

```json
{
  "user": {
    "id": "u_1",
    "display_name": "Alex Moore",
    "email": "alex@example.com",
    "avatar": "AM"
  },
  "main_course": {
    "id": "fullstack-101",
    "title": "Fullstack Web Development",
    "total_lessons": 16,
    "completed_lessons": 6
  },
  "today_lesson": {
    "id": "m2-l3",
    "title": "DOM manipulation",
    "duration": "24 min",
    "module_week": 2
  },
  "announcements": [
    {
      "id": "a1",
      "title": "New module released",
      "body": "Week 3 lessons are now available.",
      "date": "2026-04-20T11:00:00Z",
      "tag": "release"
    }
  ],
  "stats": {
    "streak": 6,
    "points": 1840,
    "rank": 4
  }
}
```

## Quizzes

### `GET /quizzes/<quiz_id>/`

```json
{
  "id": "quiz-fullstack-foundations",
  "course_id": "fullstack-101",
  "title": "Foundations of the Web Quiz",
  "description": "Test your knowledge of HTML, CSS, and how the web works.",
  "passing_score": 70,
  "points_reward": 200,
  "questions": [
    {
      "id": "q1",
      "question": "What does HTML stand for?",
      "options": [
        "HyperText Markup Language",
        "HighText Machine Language",
        "HyperTool Multi Language",
        "Home Tool Markup Language"
      ]
    }
  ]
}
```

### `POST /quizzes/<quiz_id>/submit/`

Request:

```json
{
  "answers": [
    {
      "question_id": "q1",
      "selected_index": 0
    }
  ]
}
```

Response:

```json
{
  "score": 4,
  "total": 5,
  "score_pct": 80,
  "passed": true,
  "points_awarded": 200,
  "results": [
    {
      "question_id": "q1",
      "correct_index": 0,
      "selected_index": 0,
      "is_correct": true,
      "explanation": "HTML stands for HyperText Markup Language."
    }
  ]
}
```

## Leaderboard and achievements

### `GET /leaderboard/`

```json
{
  "current_user_rank": 4,
  "entries": [
    {
      "rank": 1,
      "user_id": "u_99",
      "name": "Sade Adeyemi",
      "avatar": "SA",
      "points": 3420,
      "streak": 22,
      "is_current_user": false
    }
  ]
}
```

### `GET /achievements/`

```json
{
  "stats": {
    "points": 1840,
    "streak": 6,
    "longest_streak": 14,
    "lessons_completed": 8,
    "quizzes_passed": 3,
    "certificates_earned": 1,
    "rank": 4
  },
  "badges": [
    {
      "id": "b1",
      "name": "First Steps",
      "description": "Complete your first lesson",
      "icon": "rocket",
      "earned": true,
      "earned_at": "2026-01-15"
    }
  ]
}
```

## Certificates

### `GET /certificates/`

```json
[
  {
    "id": "cert_1",
    "course_id": "fullstack-101",
    "course_title": "Fullstack Web Development",
    "instructor": "Dr. Lena Park",
    "issued_at": "2026-04-20T12:00:00Z",
    "certificate_code": "MSU-FULLST-0001",
    "download_url": "http://localhost:8000/media/certificates/cert_1.pdf"
  }
]
```

### `POST /certificates/<course_id>/generate/`

Use this only if you want the backend to own PDF generation and certificate storage.

## Error format

Recommended DRF error format:

```json
{
  "detail": "Human readable message"
}
```

Validation example:

```json
{
  "email": ["This field is required."]
}
```
