# API Schema Documentation

Complete API reference for MooreSkillUp backend integration.

## Base URL
- **Development**: `http://localhost:8000/api`
- **Production**: `https://api.mooreskillup.com/api`

---

## Authentication Endpoints

### Register User
```
POST /api/auth/register/

Request Body:
{
  "email": "user@example.com",
  "username": "username",
  "password": "securepassword123",
  "first_name": "John",
  "last_name": "Doe"
}

Response (201):
{
  "id": 1,
  "username": "username",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "avatar": null,
  "total_points": 0
}
```

### Login
```
POST /api/auth/login/

Request Body:
{
  "email": "user@example.com",
  "password": "securepassword123"
}

Response (200):
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "username",
    "email": "user@example.com"
  }
}
```

### Refresh Token
```
POST /api/auth/refresh/

Request Body:
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

Response (200):
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Get Current User
```
GET /api/auth/user/
Headers: Authorization: Bearer {access_token}

Response (200):
{
  "id": 1,
  "username": "username",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "avatar": "https://...",
  "total_points": 350
}
```

---

## Courses Endpoints

### List All Courses
```
GET /api/courses/?page=1&limit=20

Response (200):
{
  "count": 5,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "JavaScript Fundamentals",
      "description": "Learn JS basics...",
      "level": "beginner",
      "duration_weeks": 4,
      "instructor": {
        "id": 1,
        "username": "john_instructor"
      },
      "modules_count": 4,
      "user_progress": 45
    }
  ]
}
```

### Get Course Detail
```
GET /api/courses/{id}/

Response (200):
{
  "id": 1,
  "title": "JavaScript Fundamentals",
  "description": "...",
  "level": "beginner",
  "duration_weeks": 4,
  "modules": [
    {
      "id": 1,
      "title": "Variables & Data Types",
      "week_number": 1,
      "lessons": [
        {
          "id": 1,
          "title": "Introduction to Variables",
          "video_url": "https://youtube.com/...",
          "duration_minutes": 15,
          "status": "unlocked",
          "completed": false
        }
      ]
    }
  ]
}
```

### Get Course Modules
```
GET /api/courses/{id}/modules/

Response (200):
[
  {
    "id": 1,
    "title": "Variables & Data Types",
    "week_number": 1,
    "lessons_count": 3,
    "completed_lessons": 1
  }
]
```

### Get Lesson Detail
```
GET /api/lessons/{id}/
Headers: Authorization: Bearer {access_token}

Response (200):
{
  "id": 1,
  "title": "Introduction to Variables",
  "description": "Learn about variables...",
  "video_url": "https://youtube.com/...",
  "content": "## Lesson Content\n\n...",
  "duration_minutes": 15,
  "status": "unlocked",
  "completed": false,
  "quiz": {
    "id": 1,
    "title": "Variables Quiz"
  }
}
```

### Mark Lesson Complete
```
POST /api/lessons/{id}/complete/
Headers: Authorization: Bearer {access_token}

Response (200):
{
  "message": "Lesson marked as complete",
  "completed_at": "2024-04-18T10:30:00Z",
  "course_progress": 45
}
```

---

## Quiz Endpoints

### Get Quiz with Questions
```
GET /api/quizzes/{id}/
Headers: Authorization: Bearer {access_token}

Response (200):
{
  "id": 1,
  "title": "Variables Quiz",
  "passing_score": 70,
  "points_reward": 100,
  "questions": [
    {
      "id": 1,
      "question_text": "What is a variable?",
      "question_type": "multiple_choice",
      "answers": [
        {
          "id": 1,
          "answer_text": "A container for storing data",
          "order": 1
        },
        {
          "id": 2,
          "answer_text": "A function",
          "order": 2
        }
      ]
    }
  ]
}
```

### Submit Quiz
```
POST /api/quizzes/{id}/submit/
Headers: Authorization: Bearer {access_token}

Request Body:
{
  "answers": {
    "1": "1",  // question_id: answer_id
    "2": "4"
  }
}

Response (200):
{
  "score": 85,
  "passed": true,
  "points_earned": 100,
  "feedback": "Great job! You passed the quiz.",
  "correct_answers": {
    "1": "1",
    "2": "4"
  }
}
```

### Get Quiz Results
```
GET /api/quizzes/{id}/results/
Headers: Authorization: Bearer {access_token}

Response (200):
{
  "quiz_id": 1,
  "user_score": 85,
  "passed": true,
  "attempts": 2,
  "submissions": [
    {
      "id": 1,
      "score": 75,
      "submitted_at": "2024-04-18T09:00:00Z"
    },
    {
      "id": 2,
      "score": 85,
      "submitted_at": "2024-04-18T10:00:00Z"
    }
  ]
}
```

---

## User Progress Endpoints

### Get User Course Progress
```
GET /api/user/progress/
Headers: Authorization: Bearer {access_token}

Response (200):
[
  {
    "course_id": 1,
    "course_title": "JavaScript Fundamentals",
    "progress_percentage": 45,
    "lessons_completed": 9,
    "lessons_total": 20,
    "completed_at": null
  }
]
```

### Get User Certificates
```
GET /api/user/certificates/
Headers: Authorization: Bearer {access_token}

Response (200):
[
  {
    "id": 1,
    "course_title": "JavaScript Fundamentals",
    "issued_at": "2024-04-18T10:00:00Z",
    "pdf_url": "https://api.mooreskillup.com/media/certificates/cert_1.pdf"
  }
]
```

### Download Certificate
```
GET /api/user/certificates/{id}/download/
Headers: Authorization: Bearer {access_token}

Response: PDF file binary
```

### Get User Achievements
```
GET /api/user/achievements/
Headers: Authorization: Bearer {access_token}

Response (200):
{
  "earned_badges": [
    {
      "id": 1,
      "title": "First Steps",
      "description": "Complete your first lesson",
      "icon_url": "https://api.mooreskillup.com/media/badges/first_steps.png",
      "earned_at": "2024-04-18T10:00:00Z"
    }
  ],
  "locked_badges": [
    {
      "id": 2,
      "title": "Course Master",
      "description": "Complete all lessons in a course",
      "icon_url": "https://..."
    }
  ]
}
```

### Get User Streak
```
GET /api/user/streak/
Headers: Authorization: Bearer {access_token}

Response (200):
{
  "current_streak": 7,
  "longest_streak": 15,
  "last_activity_date": "2024-04-18",
  "activity_log": [
    {
      "date": "2024-04-18",
      "activities": 2
    },
    {
      "date": "2024-04-17",
      "activities": 1
    }
  ]
}
```

---

## Leaderboard Endpoints

### Get Top 100 Users
```
GET /api/leaderboard/?page=1&limit=100
Headers: Authorization: Bearer {access_token}

Response (200):
{
  "count": 100,
  "results": [
    {
      "rank": 1,
      "user_id": 5,
      "username": "top_learner",
      "avatar_url": "https://...",
      "total_points": 2500,
      "courses_completed": 5
    }
  ],
  "user_rank": {
    "rank": 25,
    "total_points": 1200
  }
}
```

### Get Top 3 Users
```
GET /api/leaderboard/top3/
Headers: Authorization: Bearer {access_token}

Response (200):
{
  "podium": [
    {
      "rank": 1,
      "username": "top_learner",
      "points": 2500
    },
    {
      "rank": 2,
      "username": "second_place",
      "points": 2300
    },
    {
      "rank": 3,
      "username": "third_place",
      "points": 2100
    }
  ]
}
```

---

## Contact Endpoints

### Submit Contact Form
```
POST /api/contact/submit/

Request Body:
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "subject": "general",
  "message": "I have a question about..."
}

Response (201):
{
  "id": 1,
  "message": "Thank you for your message. We'll get back to you soon!",
  "status": "new"
}
```

### List Contact Messages (Admin Only)
```
GET /api/contact/messages/?status=new
Headers: Authorization: Bearer {admin_token}

Response (200):
{
  "count": 5,
  "results": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "subject": "general",
      "message": "...",
      "status": "new",
      "created_at": "2024-04-18T10:00:00Z"
    }
  ]
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid data",
  "details": {
    "email": ["This field may not be blank."]
  }
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

### 500 Server Error
```json
{
  "error": "Internal server error",
  "message": "Please try again later"
}
```

---

## Pagination

All list endpoints support pagination:

```
GET /api/courses/?page=1&limit=20

Response includes:
{
  "count": 50,           // Total items
  "next": "...?page=2",  // Next page URL
  "previous": null,      // Previous page URL
  "results": [...]       // Array of items
}
```

---

## Rate Limiting

- **Authenticated users**: 1000 requests/hour
- **Unauthenticated users**: 100 requests/hour
- **Contact submissions**: 5 per hour

---

## Deployment Checklist

Before deploying to production:

- [ ] Update all hardcoded API URLs to production domain
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS for production domain only
- [ ] Set `DEBUG = False` in Django settings
- [ ] Enable database backups
- [ ] Set up error logging (Sentry)
- [ ] Configure email service for cert generation
- [ ] Load test the API
- [ ] Document any custom endpoints

---

**Last Updated**: April 2026
