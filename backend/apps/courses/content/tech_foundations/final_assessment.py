"""The final assessment — what earns the certificate.

Drawn from every section, so it cannot be passed by remembering only the last
one. Weighted towards the things that matter in practice rather than the things
that are easiest to ask about: reading an error, knowing where a decision must
be made, and not committing a secret.
"""

FINAL_QUESTIONS = [
    {
        "text": "You type a web address and press Enter. What happens first?",
        "explanation": (
            "The name has to become an IP address before any connection can be made. "
            "That is the DNS lookup."
        ),
        "choices": [
            ("The name is looked up in DNS to find an IP address", True),
            ("The HTML is downloaded", False),
            ("The server checks whether you are signed in", False),
            ("The browser draws the page", False),
        ],
    },
    {
        "text": "Where must a decision about whether someone is allowed to do something be made?",
        "explanation": (
            "Anything on the client can be changed by the person holding it. A very large "
            "share of real security holes are one team forgetting this."
        ),
        "choices": [
            ("On the server", True),
            ("On the client, for speed", False),
            ("In the DNS record", False),
            ("In the browser's cookies", False),
        ],
    },
    {
        "text": "A request comes back <code>401</code>. What does that mean?",
        "explanation": "401 means we do not know who you are — sign in. 403 means we know, and no.",
        "choices": [
            ("You are not signed in", True),
            ("You are signed in but not allowed", False),
            ("The page does not exist", False),
            ("The server crashed", False),
        ],
    },
    {
        "text": "Why should a project folder never live inside OneDrive or Dropbox?",
        "explanation": (
            "Sync tools copy thousands of small files constantly, fight the editor over locks, "
            "and can corrupt a Git repository."
        ),
        "choices": [
            ("Syncing fights with your tools and can corrupt the project", True),
            ("Cloud storage cannot hold code", False),
            ("It is against the terms of service", False),
            ("Git refuses to run in synced folders", False),
        ],
    },
    {
        "text": "In a terminal, what does pressing <kbd>Tab</kbd> do?",
        "explanation": "It completes what you have started typing, which saves typing and prevents misspellings.",
        "choices": [
            ("Completes the file or folder name you started typing", True),
            ("Runs the command", False),
            ("Cancels the command", False),
            ("Clears the screen", False),
        ],
    },
    {
        "text": "Your internet has been down all morning. Which of these can you still do?",
        "explanation": (
            "Git runs entirely on your machine, so committing needs no connection. Pushing "
            "does, because that is the part that sends your work to GitHub."
        ),
        "choices": [
            ("Commit your work, but not push it", True),
            ("Push your work, but not commit it", False),
            ("Neither — Git needs the internet", False),
            ("Both — Git does not use the internet at all", False),
        ],
    },
    {
        "text": (
            "Six months from now, something is broken and you are reading through old commits "
            "to find when it started. What makes that possible?"
        ),
        "explanation": (
            "Messages that say what each change did. That is the whole reason to write them "
            "properly — not tidiness, but being able to find something later."
        ),
        "choices": [
            ("Each commit message says what that change did", True),
            ("The commits are all on one branch", False),
            ("The repository is public", False),
            ("Every commit was made on the same day", False),
        ],
    },
    {
        "text": "Which of these must never be committed to a repository?",
        "explanation": (
            "Secrets. Bots scan public repositories within seconds, and people have woken to "
            "enormous cloud bills."
        ),
        "choices": [
            ("A .env file containing API keys", True),
            ("A README", False),
            ("A screenshot", False),
            ("A .gitignore", False),
        ],
    },
    {
        "text": "Which line of a long error message is usually most useful?",
        "explanation": "The last one names the error and explains it; the rest is how the program got there.",
        "choices": [
            ("The last line", True),
            ("The first line", False),
            ("The longest line", False),
            ("The one with the most numbers", False),
        ],
    },
    {
        "text": "What is the rule for code an AI writes for you?",
        "explanation": (
            "If you cannot explain each line, you cannot fix it when it breaks — and a live "
            "interview will find that out."
        ),
        "choices": [
            ("Never use code you cannot explain", True),
            ("Only use it for tests", False),
            ("Rewrite the variable names first", False),
            ("Use it freely — it is usually right", False),
        ],
    },
    {
        "text": "You need help in a group. Which message gets answered?",
        "explanation": (
            "The exact error as text, the relevant code, what you expected, and what you have "
            "already tried."
        ),
        "choices": [
            (
                "The exact error text, the few lines of code, what you expected, and what you tried",
                True,
            ),
            ("A photo of your screen with the error", False),
            ("“my code is not working, please help”", False),
            ("The whole file, with no explanation", False),
        ],
    },
    {
        "text": "You have finished this course and cannot decide on a path. What is the sensible default?",
        "explanation": (
            "Something visible on day one, required for frontend, useful everywhere, wasted "
            "nowhere. And commit to it for three months."
        ),
        "choices": [
            ("Start with HTML and CSS", True),
            ("Start with DevOps", False),
            ("Wait until you are certain", False),
            ("Learn four languages at once to compare", False),
        ],
    },
]

__all__ = ["FINAL_QUESTIONS"]
