"""Tech Foundations, as content.

The free course every other MooreSkillUp course starts from, written as text
lessons rather than video — the W3Schools shape: read a short page, see a real
example, answer a question, move on.

Written as data rather than typed into the studio because a course that lives
in the repository can be reviewed in a pull request, corrected with a one-line
change, and seeded into any environment identically. A course typed into a form
exists in one database and nowhere else.

Each lesson's `html` goes into `Lesson.text_content`, which the lesson page
renders inside a Tailwind `prose` container. So write ordinary HTML — headings,
paragraphs, lists, tables, `pre` for anything that is typed — and the styling
follows.
"""

from .final_assessment import FINAL_QUESTIONS
from .section_1 import SECTION_1
from .section_2 import SECTION_2
from .section_3 import SECTION_3
from .section_4 import SECTION_4
from .section_5 import SECTION_5

COURSE = {
    "title": "Tech Foundations",
    "subtitle": "How technology actually works, and the tools every developer uses",
    "level": "beginner",
    "price": 0,
    "overview": (
        "Before you learn to build, it helps to know what you are building on. This course "
        "explains how a computer, the internet and the web actually work, sets up the tools "
        "every developer uses, and teaches you the habits that make the difference between "
        "someone who finishes what they start and someone who gives up in week three.\n\n"
        "It assumes nothing. No degree, no prior course, no expensive laptop. If you can use "
        "a phone and you have a computer to practise on, you can do this.\n\n"
        "It is free, and it always will be. Every other MooreSkillUp course starts from here."
    ),
    "scheme_of_work": (
        "Five sections, about four hours of reading and practice.\n\n"
        "1. How technology works — computers, files, the internet, the web, APIs\n"
        "2. Your toolkit — editors, the terminal, and setting your computer up properly\n"
        "3. Git and GitHub — version control, and the profile employers actually look at\n"
        "4. Working safely, and getting unstuck — errors, searching, documentation, AI, security\n"
        "5. Choosing your path — what each role does, and what to learn next\n\n"
        "Each section ends in a quiz. The course ends in a project you can show someone, "
        "and a final assessment that earns your certificate."
    ),
    "learning_outcomes": [
        "Explain what happens between typing a web address and the page appearing",
        "Set up a computer for development, with an editor configured the way professionals use it",
        "Use the terminal for the dozen commands that cover most daily work",
        "Track your work with Git and publish it to GitHub",
        "Read an error message and find the answer yourself",
        "Use AI tools without letting them do your thinking",
        "Choose which path in tech fits you, and know what to learn next",
    ],
    "tags": ["beginner", "fundamentals", "free", "career"],
    "tech_stack": ["VS Code", "Git", "GitHub", "Terminal", "Chrome DevTools"],
    "certificate_enabled": True,
    # Sequential: each section unlocks the next. The whole point of a
    # foundations course is that section three makes no sense without one.
    "progression_mode": "sequential",
    "sections": [SECTION_1, SECTION_2, SECTION_3, SECTION_4, SECTION_5],
    # One thing they finish and can show somebody. Deliberately not a
    # programming task — this course teaches the ground everything stands on,
    # so the project proves they can use the tools rather than write code.
    "project": {
        "title": "Set up, and prove it",
        "section": "Choosing your path",
        "description": (
            "Put everything in this course together into one thing that lives on the "
            "internet under your own name.\n\n"
            "1. Make a folder called about-me in your projects folder.\n"
            "2. Create a README.md that says who you are, which path you chose and why, "
            "what you set up on your machine, and one thing from this course that "
            "surprised you.\n"
            "3. Track it with Git, with at least three commits and real messages.\n"
            "4. Push it to GitHub as a public repository.\n"
            "5. Add a screenshot of your configured VS Code, and show it in the README.\n\n"
            "Submit the link to the repository.\n\n"
            "It is small on purpose. The point is that it is real, it is yours, it is "
            "public, and it is the first square on a contribution graph that will matter "
            "to somebody hiring you."
        ),
        "how_to_submit": "Paste the link to your public GitHub repository.",
    },
    # Passing this is what issues the certificate. Drawn from every section,
    # so it cannot be passed by remembering only the last one.
    "final_assessment": {
        "title": "Tech Foundations — final assessment",
        "description": (
            "Twelve questions from across the whole course. Pass with nine to earn your "
            "certificate. You can retake it."
        ),
        "pass_mark_percent": 75,
        "questions": FINAL_QUESTIONS,
    },
}

__all__ = ["COURSE"]
