from django.contrib import admin

from .models import Choice, Question, Quiz, QuizAttempt


class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 4


class QuestionInline(admin.StackedInline):
    model = Question
    extra = 1
    show_change_link = True


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ("title", "course", "kind", "pass_mark_percent", "is_published")
    list_filter = ("kind", "is_published")
    search_fields = ("title", "course__title")
    inlines = [QuestionInline]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("__str__", "quiz")
    search_fields = ("text",)
    inlines = [ChoiceInline]


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ("student", "quiz", "score_percent", "passed", "submitted_at")
    list_filter = ("passed",)
    # Attempts are evidence behind a certificate, not something to edit.
    readonly_fields = ("quiz", "student", "question_ids", "answers", "score_percent", "passed", "submitted_at")
