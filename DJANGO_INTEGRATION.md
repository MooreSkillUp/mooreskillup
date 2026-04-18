# Django Backend Integration Guide

## 📋 Overview

This guide walks you through building a Django REST API backend to power MooreSkillUp. By the end, you'll have a fully functional backend that the frontend can communicate with using JWT authentication, API endpoints for all features, and proper data models.

**Time Estimate**: 4-6 hours  
**Prerequisites**: Python 3.9+, Django 4.2+, PostgreSQL 12+

---

## Table of Contents

1. [Django Project Setup](#django-project-setup)
2. [Database Models](#database-models)
3. [REST API Endpoints](#rest-api-endpoints)
4. [Authentication System](#authentication-system)
5. [API Integration Checklist](#api-integration-checklist)
6. [Deployment](#deployment)

---

## 🚀 Django Project Setup

### Step 1: Create Virtual Environment

```bash
# Create a new directory for your backend
mkdir mooreskillup-backend
cd mooreskillup-backend

# Create virtual environment
python -m venv venv

# Activate it
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

### Step 2: Install Dependencies

```bash
# Create requirements.txt
cat > requirements.txt << 'EOF'
Django==4.2.10
djangorestframework==3.14.0
django-cors-headers==4.3.1
python-decouple==3.8
psycopg2-binary==2.9.9
pillow==10.1.0
pyjwt==2.8.1
djangorestframework-simplejwt==5.3.2
drf-spectacular==0.26.5
EOF

# Install dependencies
pip install -r requirements.txt
```

### Step 3: Create Django Project

```bash
# Create project
django-admin startproject mooreskillup_backend .

# Create apps for each feature
python manage.py startapp accounts      # Users, auth
python manage.py startapp courses       # Courses, lessons, modules
python manage.py startapp quizzes       # Quiz system
python manage.py startapp certificates  # Certificate generation
python manage.py startapp gamification  # Badges, streaks, points
python manage.py startapp leaderboard   # Rankings
python manage.py startapp contact       # Contact form submissions
```

### Step 4: Configure settings.py

Update `mooreskillup_backend/settings.py`:

```python
# settings.py

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party
    'rest_framework',
    'corsheaders',
    'rest_framework_simplejwt',
    'drf_spectacular',
    
    # Local apps
    'accounts.apps.AccountsConfig',
    'courses.apps.CoursesConfig',
    'quizzes.apps.QuizzesConfig',
    'certificates.apps.CertificatesConfig',
    'gamification.apps.GamificationConfig',
    'leaderboard.apps.LeaderboardConfig',
    'contact.apps.ContactConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # Add this
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# CORS Configuration (allow frontend requests)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://mooreskillup.com",
]

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'mooreskillup_db',
        'USER': 'postgres',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# JWT Configuration
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
}
```

### Step 5: Create Database

```bash
# CreatePostgreSQL database
createdb mooreskillup_db

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

---

## 📊 Database Models

### File Structure
Create these files in each app's `models.py`:

### 1. Accounts App (`accounts/models.py`)

```python
from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    """Extended user model with learning profile"""
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    total_points = models.IntegerField(default=0)
    total_streak = models.IntegerField(default=0)
    longest_streak = models.IntegerField(default=0)
    last_activity = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-total_points']
    
    def __str__(self):
        return self.username
```

Update `settings.py`:
```python
AUTH_USER_MODEL = 'accounts.CustomUser'
```

### 2. Courses App (`courses/models.py`)

```python
from django.db import models
from accounts.models import CustomUser

class Course(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    instructor = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    level = models.CharField(
        max_length=20,
        choices=[('beginner', 'Beginner'), ('intermediate', 'Intermediate'), ('advanced', 'Advanced')]
    )
    duration_weeks = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title


class Module(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modules')
    title = models.CharField(max_length=200)
    week_number = models.IntegerField()
    order = models.IntegerField()
    
    class Meta:
        ordering = ['order']
    
    def __str__(self):
        return f"{self.course.title} - {self.title}"


class Lesson(models.Model):
    STATUS_CHOICES = [
        ('locked', 'Locked'),
        ('unlocked', 'Unlocked'),
        ('completed', 'Completed'),
    ]
    
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=200)
    description = models.TextField()
    video_url = models.URLField()
    content = models.TextField()
    order = models.IntegerField()
    duration_minutes = models.IntegerField()
    
    class Meta:
        ordering = ['order']
    
    def __str__(self):
        return self.title


class UserCourseProgress(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='course_progress')
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    progress_percentage = models.IntegerField(default=0)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ('user', 'course')
    
    def __str__(self):
        return f"{self.user.username} - {self.course.title}"


class UserLessonProgress(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='lesson_progress')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ('user', 'lesson')
    
    def __str__(self):
        return f"{self.user.username} - {self.lesson.title}"
```

### 3. Quizzes App (`quizzes/models.py`)

```python
from django.db import models
from accounts.models import CustomUser
from courses.models import Lesson

class Quiz(models.Model):
    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name='quiz')
    title = models.CharField(max_length=200)
    passingScore = models.IntegerField(default=70)
    points_reward = models.IntegerField(default=100)
    
    def __str__(self):
        return self.title


class Question(models.Model):
    QUESTION_TYPE = [
        ('multiple_choice', 'Multiple Choice'),
    ]
    
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPE)
    order = models.IntegerField()
    
    class Meta:
        ordering = ['order']
    
    def __str__(self):
        return self.question_text[:50]


class Answer(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers')
    answer_text = models.TextField()
    is_correct = models.BooleanField(default=False)
    order = models.IntegerField()
    
    class Meta:
        ordering = ['order']
    
    def __str__(self):
        return self.answer_text[:50]


class QuizSubmission(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='quiz_submissions')
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE)
    score = models.IntegerField()
    passed = models.BooleanField()
    submitted_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.quiz.title} ({self.score}%)"
```

### 4. Gamification App (`gamification/models.py`)

```python
from django.db import models
from accounts.models import CustomUser

class Badge(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    icon = models.ImageField(upload_to='badges/')
    criteria = models.TextField()  # Description of how to earn
    
    def __str__(self):
        return self.title


class UserBadge(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'badge')
    
    def __str__(self):
        return f"{self.user.username} - {self.badge.title}"


class Streak(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='streak')
    current_streak = models.IntegerField(default=0)
    longest_streak = models.IntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.current_streak} day streak"
```

### 5. Certificates App (`certificates/models.py`)

```python
from django.db import models
from accounts.models import CustomUser
from courses.models import Course

class Certificate(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='certificates')
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    issued_at = models.DateTimeField(auto_now_add=True)
    pdf_file = models.FileField(upload_to='certificates/')
    
    class Meta:
        unique_together = ('user', 'course')
    
    def __str__(self):
        return f"Certificate: {self.user.username} - {self.course.title}"
```

### 6. Contact App (`contact/models.py`)

```python
from django.db import models

class ContactMessage(models.Model):
    SUBJECT_CHOICES = [
        ('general', 'General Inquiry'),
        ('support', 'Technical Support'),
        ('feedback', 'Feedback'),
        ('partnership', 'Partnership'),
    ]
    
    name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    subject = models.CharField(max_length=20, choices=SUBJECT_CHOICES)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=[('new', 'New'), ('reading', 'Reading'), ('resolved', 'Resolved')],
        default='new'
    )
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.subject}"
```

---

## 🔗 REST API Endpoints

### API Base URL
```
http://localhost:8000/api
```

### Authentication Endpoints

```
POST   /api/auth/register/      - Register new user
POST   /api/auth/login/         - Get JWT token
POST   /api/auth/refresh/       - Refresh access token
GET    /api/auth/user/          - Get current user (authenticated)
POST   /api/auth/logout/        - Logout
```

### Courses Endpoints

```
GET    /api/courses/            - List all courses
GET    /api/courses/<id>/       - Course detail
GET    /api/courses/<id>/modules/ - Course modules
GET    /api/lessons/<id>/       - Lesson detail
POST   /api/lessons/<id>/complete/ - Mark lesson complete
```

### Quiz Endpoints

```
GET    /api/quizzes/<id>/       - Get quiz with questions
POST   /api/quizzes/<id>/submit/ - Submit quiz answers
GET    /api/quizzes/<id>/results/ - Get quiz results
```

### User Progress Endpoints

```
GET    /api/user/progress/      - Get user's course progress
GET    /api/user/certificates/  - Get user's certificates
GET    /api/user/achievements/  - Get earned badges
GET    /api/user/streak/        - Get streak info
```

### Leaderboard Endpoints

```
GET    /api/leaderboard/        - Get top 100 users
GET    /api/leaderboard/top3/   - Get top 3 users
```

### Contact Endpoints

```
POST   /api/contact/submit/     - Submit contact form
GET    /api/contact/messages/   - List messages (admin only)
```

---

## 🔐 Authentication System

### JWT Token Flow

```
1. User registers/logs in
   ↓
2. Backend returns access_token & refresh_token
   ↓
3. Frontend stores tokens in localStorage
   ↓
4. Frontend includes token in Authorization header:
   Authorization: Bearer <access_token>
   ↓
5. Backend validates token & returns resource
```

### Create Auth Serializers (`accounts/serializers.py`)

```python
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from accounts.models import CustomUser

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'avatar', 'total_points']
        read_only_fields = ['id', 'total_points']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = CustomUser
        fields = ['email', 'username', 'password', 'first_name', 'last_name']
    
    def create(self, validated_data):
        user = CustomUser.objects.create_user(**validated_data)
        return user

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        return token
```

### Create Auth Views (`accounts/views.py`)

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from accounts.models import CustomUser
from accounts.serializers import UserSerializer, RegisterSerializer, CustomTokenObtainPairSerializer

class RegisterView(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            'user': UserSerializer(user).data,
            'message': 'User registered successfully'
        }, status=status.HTTP_201_CREATED)

class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['GET'])
    def me(self, request):
        """Get current user info"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
```

---

## ✅ API Integration Checklist

When integrating the frontend with this backend, follow this checklist:

- [ ] **Environment Setup**
  - [ ] Backend running on `http://localhost:8000`
  - [ ] CORS configured to allow frontend origin
  - [ ] `.env.local` updated with `VITE_API_URL=http://localhost:8000/api`

- [ ] **Authentication**
  - [ ] Update `src/lib/auth.tsx` to use `/api/auth/login/`
  - [ ] Store JWT token in localStorage after login
  - [ ] Add Authorization header to all API calls
  - [ ] Implement token refresh logic

- [ ] **Data Fetching**
  - [ ] Create `src/lib/api.ts` with all endpoints
  - [ ] Update all components to use API calls instead of mock data
  - [ ] Implement loading states and error handling

- [ ] **Features**
  - [ ] Courses listing and detail pages
  - [ ] Lesson completion tracking
  - [ ] Quiz submission and grading
  - [ ] Certificate generation/download
  - [ ] Leaderboard data
  - [ ] Badge/achievement tracking
  - [ ] Streak calculations

---

## 🚀 Deployment

### Deploy Django Backend

#### Option 1: Heroku
```bash
# Create Procfile
echo "web: gunicorn mooreskillup_backend.wsgi" > Procfile

# Deploy
heroku login
heroku create mooreskillup-api
git push heroku main
```

#### Option 2: Digital Ocean / AWS
See the main SETUP_GUIDE.md for detailed deployment instructions.

#### Option 3: Railway
```bash
# Railway detects Django automatically
railway up
```

---

## 📞 Next Steps

1. ✅ Set up local Django development environment
2. ✅ Create models, serializers, and views
3. ✅ Implement authentication with JWT
4. ✅ Test API endpoints with Postman/cURL
5. ✅ Deploy backend to production
6. ✅ Update frontend to use live API

**Questions?** See the main SETUP_GUIDE.md for more context.
