"""Lesson HTML is cleaned before it is stored.

A text lesson renders as real HTML in every student's browser. That is what
makes tables, code blocks and callouts possible, and it also means whatever a
teacher writes runs in the reader's page with the reader's session.

Teachers are contracted people rather than strangers, so this is not a hole
anyone is queueing to exploit — but an account is only as trustworthy as its
password, and the blast radius is every student who opens that lesson.

Two things are being proved here, and the second matters as much as the first:
nothing executable survives, and the formatting the real course depends on does.
"""

import pytest

from apps.courses.content.tech_foundations import COURSE
from common.sanitize import clean_lesson_html, was_changed


class TestNothingExecutableSurvives:
    def test_a_script_tag_is_removed(self):
        cleaned = clean_lesson_html("<p>Hello</p><script>alert(document.cookie)</script>")
        assert "<script" not in cleaned
        assert "alert" not in cleaned
        assert "<p>Hello</p>" in cleaned

    def test_an_event_handler_is_removed(self):
        """The subtler one. No script tag, and it still runs."""
        cleaned = clean_lesson_html('<img src="x" onerror="fetch(\'/steal\')">')
        assert "onerror" not in cleaned
        assert "fetch" not in cleaned

    @pytest.mark.parametrize(
        "attribute",
        ["onclick", "onload", "onmouseover", "onfocus", "onerror"],
    )
    def test_every_handler_shape_goes(self, attribute):
        cleaned = clean_lesson_html(f'<div {attribute}="badness()">text</div>')
        assert attribute not in cleaned
        assert "badness" not in cleaned

    def test_a_javascript_link_is_defused(self):
        cleaned = clean_lesson_html('<a href="javascript:alert(1)">Click me</a>')
        assert "javascript:" not in cleaned

    def test_a_data_url_is_removed(self):
        cleaned = clean_lesson_html('<a href="data:text/html,<script>alert(1)</script>">x</a>')
        assert "data:" not in cleaned

    def test_an_iframe_is_removed(self):
        """A video lesson has its own field, validated separately and played
        through a signed URL. A text lesson has no business embedding one."""
        cleaned = clean_lesson_html('<iframe src="https://evil.example/x"></iframe>')
        assert "<iframe" not in cleaned

    @pytest.mark.parametrize("tag", ["object", "embed", "form", "input", "style", "base"])
    def test_other_dangerous_tags_go(self, tag):
        cleaned = clean_lesson_html(f"<{tag}>x</{tag}>")
        assert f"<{tag}" not in cleaned

    def test_style_attributes_are_dropped(self):
        """Cannot run code in any browser still in use, but can put an invisible
        element over a real button."""
        cleaned = clean_lesson_html(
            '<div style="position:fixed;inset:0;opacity:0">trap</div>'
        )
        assert "style=" not in cleaned
        assert "trap" in cleaned

    def test_an_external_link_gets_rel_noopener(self):
        cleaned = clean_lesson_html('<a href="https://example.com">Docs</a>')
        assert "noopener" in cleaned


class TestTheFormattingSurvives:
    def test_headings_lists_and_emphasis(self):
        source = "<h3>Title</h3><ul><li><strong>bold</strong> and <em>italic</em></li></ul>"
        assert clean_lesson_html(source) == source

    def test_tables_survive_whole(self):
        source = (
            "<table><thead><tr><th>A</th></tr></thead>"
            "<tbody><tr><td>B</td></tr></tbody></table>"
        )
        assert clean_lesson_html(source) == source

    def test_code_blocks_and_keys_survive(self):
        source = "<pre><code>git commit -m &quot;x&quot;</code></pre><kbd>Ctrl</kbd>"
        cleaned = clean_lesson_html(source)
        assert "<pre>" in cleaned and "<code>" in cleaned and "<kbd>" in cleaned

    def test_classes_survive(self):
        """The callouts in the course are styled entirely with classes."""
        source = '<div class="rounded-lg border border-amber-300">note</div>'
        assert 'class="rounded-lg border border-amber-300"' in clean_lesson_html(source)

    def test_details_and_summary_survive(self):
        source = "<details><summary>More</summary><p>Detail</p></details>"
        cleaned = clean_lesson_html(source)
        assert "<details>" in cleaned and "<summary>" in cleaned

    def test_images_and_safe_links_survive(self):
        source = '<img src="https://example.com/a.png" alt="A diagram">'
        cleaned = clean_lesson_html(source)
        assert 'src="https://example.com/a.png"' in cleaned
        assert 'alt="A diagram"' in cleaned

    def test_empty_content_is_fine(self):
        assert clean_lesson_html("") == ""
        assert clean_lesson_html(None) == ""


class TestAgainstTheRealCourse:
    """The allowlist is proved against real content, not only against attacks.

    A sanitiser that blocks every attack and also destroys the course it is
    protecting has not helped anybody.
    """

    def test_no_lesson_in_tech_foundations_is_altered(self):
        altered = []
        for section in COURSE["sections"]:
            for lesson in section["lessons"]:
                if was_changed(lesson["html"].strip()):
                    altered.append(f"{section['title']} / {lesson['title']}")
        assert altered == [], f"cleaning changed these lessons: {altered}"

    def test_every_lesson_still_has_its_content(self):
        for section in COURSE["sections"]:
            for lesson in section["lessons"]:
                cleaned = clean_lesson_html(lesson["html"])
                assert len(cleaned) > 200, f"{lesson['title']} came back nearly empty"


class TestThroughTheApi:
    def test_a_teacher_cannot_store_a_script(self, db):
        """The path that matters: the serializer, not the function."""
        from apps.courses.serializers import LessonSerializer

        serializer = LessonSerializer(
            data={
                "title": "Sneaky",
                "content_type": "text",
                "text_content": "<p>Fine</p><script>alert(1)</script>",
            }
        )
        assert serializer.is_valid(), serializer.errors
        assert "<script" not in serializer.validated_data["text_content"]
        assert "<p>Fine</p>" in serializer.validated_data["text_content"]
