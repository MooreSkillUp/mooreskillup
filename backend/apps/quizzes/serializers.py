"""Two views of the same quiz: what a student may see, and what a teacher may.

The split matters. A student's serializer must never carry `is_correct` — the
answer key is one devtools panel away otherwise, and a certificate that rests on
a score would mean nothing.
"""

from rest_framework import serializers

from .models import Choice, Question, Quiz, QuizAttempt


class StudentChoiceSerializer(serializers.ModelSerializer):
    """A choice as a student sees it: text only, never whether it is right."""

    class Meta:
        model = Choice
        fields = ("id", "text")


class StudentQuestionSerializer(serializers.ModelSerializer):
    choices = StudentChoiceSerializer(many=True, read_only=True)
    isMultiSelect = serializers.BooleanField(source="is_multi_select", read_only=True)

    class Meta:
        model = Question
        # No `explanation` either — it often gives the answer away, and it is
        # returned with the review once the attempt is scored.
        fields = ("id", "text", "isMultiSelect", "choices")


class StudentQuizSerializer(serializers.ModelSerializer):
    questionCount = serializers.IntegerField(source="question_count", read_only=True)
    passMarkPercent = serializers.IntegerField(source="pass_mark_percent", read_only=True)
    questionsPerAttempt = serializers.IntegerField(source="questions_per_attempt", read_only=True)
    sectionId = serializers.UUIDField(source="section_id", read_only=True)

    class Meta:
        model = Quiz
        fields = (
            "id",
            "kind",
            "title",
            "description",
            "sectionId",
            "questionCount",
            "passMarkPercent",
            "questionsPerAttempt",
        )


class AttemptSerializer(serializers.ModelSerializer):
    scorePercent = serializers.DecimalField(
        source="score_percent", max_digits=5, decimal_places=2, read_only=True
    )
    submittedAt = serializers.DateTimeField(source="submitted_at", read_only=True)
    quizId = serializers.UUIDField(source="quiz_id", read_only=True)

    class Meta:
        model = QuizAttempt
        fields = ("id", "quizId", "scorePercent", "passed", "submittedAt")


# --- teacher side ----------------------------------------------------------


class TeacherChoiceSerializer(serializers.ModelSerializer):
    isCorrect = serializers.BooleanField(source="is_correct", required=False)

    class Meta:
        model = Choice
        fields = ("id", "text", "isCorrect", "order")


class TeacherQuestionSerializer(serializers.ModelSerializer):
    choices = TeacherChoiceSerializer(many=True, required=False)

    class Meta:
        model = Question
        fields = ("id", "text", "explanation", "order", "choices")

    def create(self, validated_data):
        choices = validated_data.pop("choices", [])
        question = Question.objects.create(**validated_data)
        for index, choice in enumerate(choices):
            Choice.objects.create(question=question, order=index, **choice)
        return question

    def update(self, instance, validated_data):
        choices = validated_data.pop("choices", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()

        if choices is not None:
            # Replaced wholesale rather than diffed: a question's choices are
            # edited as a set, and matching them up by id invites half-applied
            # edits that leave a question with no correct answer.
            instance.choices.all().delete()
            for index, choice in enumerate(choices):
                Choice.objects.create(question=instance, order=index, **choice)
        return instance


class TeacherQuizSerializer(serializers.ModelSerializer):
    questions = TeacherQuestionSerializer(many=True, read_only=True)
    passMarkPercent = serializers.IntegerField(source="pass_mark_percent", required=False)
    questionsPerAttempt = serializers.IntegerField(source="questions_per_attempt", required=False)
    isPublished = serializers.BooleanField(source="is_published", required=False)
    isReady = serializers.BooleanField(source="is_ready", read_only=True)
    questionCount = serializers.IntegerField(source="question_count", read_only=True)

    class Meta:
        model = Quiz
        fields = (
            "id",
            "course",
            "section",
            "kind",
            "title",
            "description",
            "passMarkPercent",
            "questionsPerAttempt",
            "isPublished",
            "isReady",
            "questionCount",
            "questions",
        )
