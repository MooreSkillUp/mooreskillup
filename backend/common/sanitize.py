"""Cleaning HTML that somebody else wrote.

A text lesson's content is rendered as real HTML in every student's browser —
that is what makes tables, code blocks and callouts possible. It also means a
teacher's lesson runs in the reader's page with the reader's session.

Teachers are contracted people, not strangers, so this is not a hole anyone is
queueing to exploit. But an account is only as trustworthy as its password, and
the blast radius is every student who opens that lesson. So the content is
cleaned on the way in: formatting survives, anything that can execute does not.

Cleaned on save rather than on render because it happens once per edit instead
of once per view, and because the stored content then matches what is shown —
a lesson that looks right in the studio and different in the player is its own
kind of bug.
"""

import nh3

# What a lesson may contain. Everything here is formatting; nothing here runs.
ALLOWED_TAGS = {
    # Structure
    "p", "div", "span", "br", "hr", "section",
    # Headings. h1 is left out on purpose — the page already has one, and a
    # lesson that adds another breaks the document outline for screen readers.
    "h2", "h3", "h4", "h5", "h6",
    # Emphasis
    "strong", "b", "em", "i", "u", "s", "mark", "small", "sub", "sup",
    # Lists
    "ul", "ol", "li", "dl", "dt", "dd",
    # Code and quotes
    "pre", "code", "kbd", "samp", "var", "blockquote", "q", "cite", "abbr",
    # Tables
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
    # Media and links
    "a", "img", "figure", "figcaption",
    # Disclosure, which the course content uses for optional detail
    "details", "summary",
}

ALLOWED_ATTRIBUTES = {
    "*": {"class", "id", "title", "lang", "dir"},
    # `rel` is deliberately absent: nh3 sets it itself from link_rel below,
    # and listing it here as well is an error rather than a duplicate.
    "a": {"href", "target"},
    "img": {"src", "alt", "width", "height", "loading"},
    "td": {"colspan", "rowspan", "headers"},
    "th": {"colspan", "rowspan", "scope", "headers"},
    "col": {"span"},
    "colgroup": {"span"},
    "ol": {"start", "type", "reversed"},
    "details": {"open"},
    "time": {"datetime"},
}

# Anything not on this list — javascript:, data:, vbscript: — is dropped.
ALLOWED_SCHEMES = {"http", "https", "mailto", "tel"}

# `style` is deliberately absent from the attributes above. It cannot run code
# in any browser still in use, but it can cover the page with an invisible
# element over a real button, which is a real way to trick somebody into
# clicking something. Classes give all the styling a lesson needs.


def clean_lesson_html(html: str) -> str:
    """Strip anything executable from lesson content, keeping the formatting.

    Removes `<script>`, `<iframe>`, `<object>`, every `on*` handler and any
    `javascript:` link, while leaving headings, lists, tables, code blocks,
    images, links and the classes the content is styled with.

    Videos are not lost by dropping `<iframe>`: a video lesson has its own
    field, which is validated separately and played through a signed URL.
    """
    if not html:
        return ""
    return nh3.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes={key: set(value) for key, value in ALLOWED_ATTRIBUTES.items()},
        url_schemes=ALLOWED_SCHEMES,
        link_rel="noopener noreferrer",
    )


def was_changed(html: str) -> bool:
    """Whether cleaning would alter this content.

    Used to tell a teacher that something was removed, rather than silently
    dropping part of what they wrote and leaving them to wonder.
    """
    return clean_lesson_html(html) != (html or "")
