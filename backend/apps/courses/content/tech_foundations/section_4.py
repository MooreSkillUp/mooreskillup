"""Section 4 — Working safely, and getting unstuck.

The section that decides who finishes. Almost nobody quits because the code was
too hard; they quit because they hit an error, could not read it, could not find
the answer, and concluded they were not clever enough.
"""

SECTION_4 = {
    "title": "Working safely, and getting unstuck",
    "description": (
        "Read an error, find the answer yourself, use AI without letting it think for you, "
        "and keep your accounts and your work safe."
    ),
    "access_type": "free",
    "lessons": [
        {
            "title": "Reading an error message",
            "duration_minutes": 9,
            "html": """
<p>Beginners see a red wall of text and feel their stomach drop. Experienced
developers see the same wall and read four things from it. That is the entire
difference, and it is learnable in ten minutes.</p>

<h3>An error is a report, not a telling-off</h3>
<p>It is the computer saying, in detail, exactly what it could not do and
exactly where. It is the most helpful thing on your screen.</p>

<h3>The four things to find</h3>
<pre><code>Traceback (most recent call last):
  File "app.py", line 12, in &lt;module&gt;
    total = price * quantity
TypeError: unsupported operand type(s) for *: 'int' and 'str'</code></pre>

<ol>
<li><strong>The type</strong> — <code>TypeError</code>. Something was the wrong kind of thing</li>
<li><strong>The file and line</strong> — <code>app.py</code>, line 12. Go there</li>
<li><strong>The line itself</strong> — <code>total = price * quantity</code></li>
<li><strong>The explanation</strong> — you tried to multiply a number by text</li>
</ol>

<p>Read it and the fix is obvious: <code>quantity</code> is text when it should
be a number. Something like <code>int(quantity)</code> solves it.</p>

<h3>Read from the bottom up</h3>
<p>The most useful line is almost always the <strong>last</strong> one. Everything
above is the path the program took to get there. Start at the bottom, then work
upward if you need the context.</p>

<h3>Find your own file in the trace</h3>
<p>A long stack trace often runs through library code you did not write. Scan for
the <strong>last line that names a file of yours</strong>. That is nearly always
where the real mistake is.</p>

<h3>The five you will meet constantly</h3>
<table>
<thead><tr><th>Error</th><th>Usually means</th></tr></thead>
<tbody>
<tr><td><code>SyntaxError</code></td><td>A typo. Missing bracket, quote or colon — often on the line <em>above</em> the one reported</td></tr>
<tr><td><code>NameError</code> / <code>is not defined</code></td><td>Misspelled a name, or used it before creating it</td></tr>
<tr><td><code>TypeError</code></td><td>Wrong kind of thing — text where a number belongs</td></tr>
<tr><td><code>undefined</code> / <code>NoneType</code></td><td>Something you expected to exist does not</td></tr>
<tr><td><code>ModuleNotFoundError</code></td><td>Not installed, or installed somewhere else</td></tr>
</tbody>
</table>

<div class="not-prose my-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
<p class="m-0"><strong>Change one thing at a time.</strong> When something
breaks, the temptation is to change five things and re-run. Then it works and you
have no idea why — so next time it breaks, you are helpless again. One change,
re-run, observe.</p>
</div>

<div class="not-prose my-4 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-800 dark:bg-sky-950">
<p class="m-0"><strong>Try it yourself.</strong> Open your browser console
(<kbd>F12</kbd> → Console) and type <code>myName.length</code>. Read the error.
Find the type, and what it is telling you.</p>
</div>
""",
        },
        {
            "title": "Searching like a developer",
            "duration_minutes": 7,
            "html": """
<p>Every developer you admire searches constantly. It is not cheating; it is the
job. But there is a skill to it.</p>

<h3>Search the error, not the story</h3>
<table>
<thead><tr><th>Works</th><th>Does not</th></tr></thead>
<tbody>
<tr><td><code>TypeError: unsupported operand type(s) for *: 'int' and 'str'</code></td><td><em>my python code is not working</em></td></tr>
<tr><td><code>css flexbox center vertically</code></td><td><em>how to move thing to middle</em></td></tr>
<tr><td><code>django reverse match not found</code></td><td><em>django broken please help</em></td></tr>
</tbody>
</table>

<h3>Take your own details out</h3>
<p>Search the general shape, not your specifics:</p>
<pre><code>ModuleNotFoundError: No module named 'requests'     ← search this
ModuleNotFoundError: No module named 'my_app_v2'    ← nobody else has this</code></pre>

<h3>Add the technology and the year</h3>
<p><code>react useEffect infinite loop 2026</code> beats
<code>useEffect problem</code>. Frameworks change, and a 2019 answer may be
actively wrong now.</p>

<h3>Where the answers actually are</h3>
<ul>
<li><strong>Stack Overflow</strong> — read the accepted answer, then read the one below it with more votes, which is often better and newer</li>
<li><strong>Official documentation</strong> — slower to read, right more often</li>
<li><strong>GitHub Issues</strong> — search the library's issues. If it is a bug, somebody has reported it</li>
<li><strong>MDN</strong> — for anything web. Treat it as the truth</li>
</ul>

<h3>Read the dates</h3>
<p>An answer from 2014 about a framework that changed in 2020 will waste your
afternoon. Check the date before you trust the code.</p>

<div class="not-prose my-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
<p class="m-0"><strong>Never paste a command you do not understand.</strong>
Especially one with <code>sudo</code>, <code>rm -rf</code>, or a URL piped into
a shell. Paste it into <strong>explainshell.com</strong> first, or ask an AI what
it does. People have wiped their machines this way.</p>
</div>

<div class="not-prose my-4 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-800 dark:bg-sky-950">
<p class="m-0"><strong>Try it yourself.</strong> Take the exact error from the
last lesson and search it. Notice that thousands of people have had it, and the
first result answers it.</p>
</div>
""",
        },
        {
            "title": "Reading documentation",
            "duration_minutes": 8,
            "html": """
<p>Documentation feels harder than a tutorial because it is not trying to teach
you — it is trying to be complete. Once you can read it, you stop needing a
tutorial for every small thing.</p>

<h3>Do not read it like a book</h3>
<p>Docs are for looking things up. Find the page, find the part you need, leave.</p>

<h3>The shape of a docs page</h3>
<ul>
<li><strong>Getting started</strong> — read this once, fully</li>
<li><strong>Guides</strong> — how to do a particular thing. Your usual destination</li>
<li><strong>API reference</strong> — every option, exhaustively. For when you know what you want and need the exact spelling</li>
<li><strong>Examples</strong> — go here first. Working code answers faster than prose</li>
</ul>

<h3>Reading a function signature</h3>
<pre><code>fetch(url, options)

url      string              required
options  object              optional
  method   string            "GET" by default
  headers  object            optional
  body     string            optional</code></pre>

<p>Three things to notice: what is <strong>required</strong>, what is
<strong>optional</strong>, and what the <strong>defaults</strong> are. Most
bugs in someone's first use of a library come from missing a default.</p>

<h3>Check the version</h3>
<p>Docs sites usually have a version selector. Reading v3 docs while using v2 is
a special kind of frustration, because everything <em>almost</em> works.</p>

<h3>The five worth bookmarking now</h3>
<ul>
<li><strong>MDN Web Docs</strong> — HTML, CSS, JavaScript. The standard</li>
<li><strong>docs.python.org</strong> — Python itself</li>
<li><strong>React, Django, Node</strong> — whichever you go on to use</li>
<li><strong>DevDocs.io</strong> — many docs in one searchable place, and it works offline</li>
</ul>

<div class="not-prose my-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-800 dark:bg-emerald-950">
<p class="m-0"><strong>DevDocs works offline.</strong> Download the sets you use.
When the data runs out or the network drops, you still have the documentation —
which in Nigeria is not a small thing.</p>
</div>

<div class="not-prose my-4 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-800 dark:bg-sky-950">
<p class="m-0"><strong>Try it yourself.</strong> Open MDN and look up
<code>Array.map()</code>. Find the example, then find what it returns. Two
minutes. That is the whole skill.</p>
</div>
""",
        },
        {
            "title": "Using AI without letting it think for you",
            "duration_minutes": 10,
            "html": """
<p>AI tools are genuinely useful and they are not going away. Used one way they
make you faster. Used another way they stop you ever becoming a developer.</p>

<h3>The difference, plainly</h3>
<table>
<thead><tr><th>Makes you better</th><th>Makes you dependent</th></tr></thead>
<tbody>
<tr><td>"Explain what this error means"</td><td>"Fix my code" → paste → move on</td></tr>
<tr><td>"Why does this work?"</td><td>"Write my homework"</td></tr>
<tr><td>"What is another way to do this?"</td><td>"Build my whole project"</td></tr>
<tr><td>"Review this and say what is weak"</td><td>Accepting without reading</td></tr>
</tbody>
</table>

<h3>The rule</h3>
<div class="not-prose my-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
<p class="m-0"><strong>Never paste code you cannot explain.</strong> If you
could not tell a colleague what each line does and why, you do not understand it
— and you will not be able to fix it when it breaks at midnight. Ask the AI to
explain it until you can.</p>
</div>

<h3>It is confidently wrong, regularly</h3>
<p>AI invents functions that do not exist, uses outdated APIs, and states all of
it with complete confidence. Always:</p>
<ul>
<li><strong>Run it.</strong> Do not assume</li>
<li><strong>Check any unfamiliar function</strong> in the real documentation</li>
<li><strong>Be suspicious of anything security-related.</strong> AI authentication code is frequently subtly unsafe</li>
</ul>

<h3>Never paste secrets</h3>
<p>No API keys, no passwords, no real customer data, no proprietary code from an
employer. Assume anything you type may be stored.</p>

<h3>How to ask well</h3>
<p>Give it the error, the code, what you expected, and what happened:</p>
<pre><code>I am getting this error:
[paste the whole error]

Here is the code:
[paste the relevant part]

I expected it to print the total. Instead it stops at line 12.
Explain why, do not just rewrite it.</code></pre>

<p><em>"Explain why, do not just rewrite it"</em> is the most valuable sentence
you can add.</p>

<h3>While you are learning</h3>
<p>Try it yourself first, for a real attempt. Then ask. The struggle before the
answer is where the learning happens — take it away and you retain almost
nothing.</p>

<div class="not-prose my-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm dark:border-red-800 dark:bg-red-950">
<p class="m-0"><strong>Interviews will find you out.</strong> Nigerian employers
increasingly use live coding and questions about your own repositories. A
portfolio you cannot explain is worse than a smaller one you can.</p>
</div>
""",
        },
        {
            "title": "Asking a question people will answer",
            "duration_minutes": 4,
            "html": """
<p>You will ask for help in a WhatsApp group, a Discord, or on Stack Overflow.
How you ask decides whether anyone replies.</p>

<h3>The question nobody answers</h3>
<blockquote><p>guys my code is not working, please help 😭</p></blockquote>
<p>Nobody can help. There is nothing to work with, and answering means asking
four questions first — so people scroll past.</p>

<h3>The question people answer in minutes</h3>
<blockquote>
<p><strong>Python: TypeError when multiplying price by quantity</strong></p>
<p>I am building a small checkout script. When I run it I get:</p>
<p><code>TypeError: unsupported operand type(s) for *: 'int' and 'str'</code></p>
<p>The line is <code>total = price * quantity</code>, where <code>quantity</code>
comes from <code>input()</code>.</p>
<p>I expected the total to print. I have tried printing both values and
<code>quantity</code> shows as <code>"3"</code> with quotes.</p>
<p>Python 3.12, Windows.</p>
</blockquote>

<h3>The five things to include</h3>
<ol>
<li><strong>What you are trying to do</strong></li>
<li><strong>The exact error</strong>, copied, not described, not a photo of the screen</li>
<li><strong>The relevant code</strong> — the few lines, not the whole file</li>
<li><strong>What you expected, and what happened</strong></li>
<li><strong>What you already tried</strong></li>
</ol>

<h3>Two things that quietly matter</h3>
<ul>
<li><strong>Paste text, not screenshots.</strong> Nobody can search a photograph, and on a phone they cannot read it</li>
<li><strong>Say what you tried.</strong> It proves you made an effort, and people help those who have</li>
</ul>

<div class="not-prose my-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-800 dark:bg-emerald-950">
<p class="m-0"><strong>Writing it out often solves it.</strong> Explaining a
problem properly forces you to state your assumptions, and one of them is usually
wrong. This happens so often it has a name — rubber duck debugging. Half the
questions you carefully write, you will answer yourself before sending.</p>
</div>
""",
        },
        {
            "title": "Passwords, two-factor and keeping your accounts",
            "duration_minutes": 8,
            "html": """
<p>You are about to have accounts holding years of work, and eventually access to
other people's systems. Getting this right now costs an hour.</p>

<h3>Use a password manager</h3>
<p>You cannot remember forty strong passwords, so without one you reuse. One leak
anywhere then opens everything.</p>
<ul>
<li><strong>Bitwarden</strong> — free, works everywhere. The usual recommendation</li>
<li><strong>Your browser's manager</strong> — better than reusing passwords</li>
</ul>
<p>Remember one strong master password. The manager remembers the rest.</p>

<h3>Turn on two-factor everywhere that matters</h3>
<p>Email first, then GitHub, then your bank. Two-factor means a stolen password
alone is not enough.</p>
<table>
<thead><tr><th>Method</th><th>Verdict</th></tr></thead>
<tbody>
<tr><td>Authenticator app</td><td><strong>Use this.</strong> Free, works offline</td></tr>
<tr><td>Hardware key</td><td>Strongest. Worth it later</td></tr>
<tr><td>SMS codes</td><td>Better than nothing, but SIM swap is real in Nigeria</td></tr>
</tbody>
</table>

<p><strong>Save your recovery codes somewhere that is not your laptop.</strong>
Print them. People lose a phone and lose their GitHub account permanently.</p>

<h3>Your email is the master key</h3>
<p>Whoever controls your email can reset everything else. Protect it hardest.</p>

<h3>Secrets in code</h3>
<p>You will soon have API keys. The rules:</p>
<ul>
<li>Keys go in a <code>.env</code> file</li>
<li><code>.env</code> goes in <code>.gitignore</code></li>
<li>Never in code, never in a screenshot, never in a commit message</li>
<li>If you commit one by accident, <strong>revoke it immediately</strong>. Deleting the commit is not enough — bots scan public repositories within seconds</li>
</ul>

<div class="not-prose my-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm dark:border-red-800 dark:bg-red-950">
<p class="m-0"><strong>This happens to real people constantly.</strong>
Developers have committed cloud keys to public repositories and received bills of
thousands of dollars within hours, because bots watch GitHub for exactly this.</p>
</div>

<div class="not-prose my-4 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-800 dark:bg-sky-950">
<p class="m-0"><strong>Try it yourself.</strong> Install Bitwarden, put your
email and GitHub in it, turn on two-factor for both, and print the recovery
codes. Twenty minutes, once.</p>
</div>
""",
        },
        {
            "title": "Scams, phishing and backing up your work",
            "duration_minutes": 6,
            "html": """
<h3>Phishing looks like the real thing</h3>
<p>An email says your GitHub account will be suspended, with a button to sign in.
The page looks perfect. It is not GitHub.</p>

<p>Three habits that defeat nearly all of it:</p>
<ul>
<li><strong>Check the address bar</strong> before typing a password. <code>github.com</code> is real; <code>github-security.com</code> is not</li>
<li><strong>Never sign in from a link in an email.</strong> Open a new tab and type the address yourself</li>
<li><strong>Urgency is the tell.</strong> "Within 24 hours or your account is deleted" exists to stop you thinking</li>
</ul>

<h3>Scams aimed specifically at developers</h3>
<ul>
<li><strong>Fake recruiters</strong> sending a "coding test" as a file to run. Running it installs malware. Read code; do not run strangers' executables</li>
<li><strong>Fake job offers</strong> asking for a training fee. No real employer charges you</li>
<li><strong>Malicious packages</strong> named almost like real ones — <code>reqeusts</code> instead of <code>requests</code>. Check spelling before installing</li>
<li><strong>"Test my smart contract"</strong> offers that drain a crypto wallet</li>
</ul>

<h3>Backing up, properly</h3>
<p>Your laptop will fail, be stolen, or be damaged. Plan for it.</p>
<table>
<thead><tr><th>What</th><th>Where</th></tr></thead>
<tbody>
<tr><td>Code</td><td>GitHub. Push often — that <em>is</em> your backup</td></tr>
<tr><td>Documents, CV, certificates</td><td>Google Drive or OneDrive</td></tr>
<tr><td>Everything</td><td>An external drive, occasionally</td></tr>
<tr><td>Recovery codes</td><td>Printed, on paper</td></tr>
</tbody>
</table>

<div class="not-prose my-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
<p class="m-0"><strong>"It is on my laptop" is not a backup.</strong> Neither is
one copy on a flash drive. The rule professionals use: three copies, two kinds
of storage, one somewhere else. For you that is: your machine, GitHub, and cloud
storage.</p>
</div>

<div class="not-prose my-4 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-800 dark:bg-sky-950">
<p class="m-0"><strong>Try it yourself.</strong> Push everything you have built
so far to GitHub. If your laptop died tonight, what would you lose? Fix that
answer now.</p>
</div>
""",
        },
        {
            "title": "Go deeper — working safely and getting unstuck",
            "duration_minutes": 2,
            "content_type": "resource",
            "html": """
<p>Optional. None of this is on the quiz.</p>

<h3>Debugging properly</h3>
<ul>
<li><strong>"Debugging" by Julia Evans</strong> — short, illustrated zines that make this genuinely enjoyable</li>
<li><strong>VS Code's debugger</strong> — set a breakpoint and step through your code line by line. More useful than printing values everywhere, once you learn it</li>
</ul>

<h3>Asking well</h3>
<ul>
<li><strong>"How do I ask a good question?"</strong> — Stack Overflow's own guide. Ten minutes, and it improves every question you ever ask</li>
<li><strong>"How To Ask Questions The Smart Way"</strong> — blunt, older, still right</li>
</ul>

<h3>Staying safe</h3>
<ul>
<li><strong>haveibeenpwned.com</strong> — check whether your email has been in a breach. Most have</li>
<li><strong>GitHub's guide to secret scanning</strong> — what happens when a key leaks, and how to revoke it</li>
</ul>

<div class="not-prose my-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-800 dark:bg-emerald-950">
<p class="m-0"><strong>The habit worth building.</strong> When something breaks,
give yourself twenty real minutes before asking anyone. Read the error, search
it, check the docs. You will solve most of them — and the ones you do not, you
will ask about far better.</p>
</div>
""",
        },
    ],
    "quiz": {
        "title": "Section 4 quiz — Getting unstuck",
        "description": "Eight questions. Pass with six.",
        "pass_mark_percent": 70,
        "questions": [
            {
                "text": "Which part of a long error message is usually the most useful?",
                "explanation": (
                    "The last line names the error and explains it. Everything above is the path "
                    "the program took to get there."
                ),
                "choices": [
                    ("The last line", True),
                    ("The first line", False),
                    ("The longest line", False),
                    ("The line numbers only", False),
                ],
            },
            {
                "text": "Which search is most likely to find your answer?",
                "explanation": (
                    "Search the exact error text with your own specifics removed. Thousands of "
                    "people have had the same one."
                ),
                "choices": [
                    ("TypeError: unsupported operand type(s) for *: 'int' and 'str'", True),
                    ("my python code is not working", False),
                    ("why is programming so hard", False),
                    ("python error please help", False),
                ],
            },
            {
                "text": "What is the rule for using AI-generated code?",
                "explanation": (
                    "If you cannot explain each line, you cannot fix it when it breaks — and an "
                    "interview will find that out."
                ),
                "choices": [
                    ("Never paste code you cannot explain", True),
                    ("Only use it for small functions", False),
                    ("Only use it after you have finished learning", False),
                    ("Always rewrite it in your own style first", False),
                ],
            },
            {
                "text": "You accidentally commit an API key to a public repository. What must you do?",
                "explanation": (
                    "Revoke it at once. Bots scan public repositories within seconds, so deleting "
                    "the commit is far too late on its own."
                ),
                "choices": [
                    ("Revoke the key immediately", True),
                    ("Delete the commit and carry on", False),
                    ("Make the repository private", False),
                    ("Rename the file", False),
                ],
            },
            {
                "text": "Which two-factor method is weakest?",
                "explanation": "SIM swap attacks are common in Nigeria, which makes SMS the weak option.",
                "choices": [
                    ("SMS codes", True),
                    ("An authenticator app", False),
                    ("A hardware key", False),
                    ("A password manager", False),
                ],
            },
            {
                "text": "A recruiter emails a coding test as a file to download and run. What should you do?",
                "explanation": (
                    "Running a stranger's executable installs whatever they wrote. Read code; do "
                    "not run files from people you do not know."
                ),
                "choices": [
                    ("Do not run it — this is a known way to install malware", True),
                    ("Run it in a new folder to be safe", False),
                    ("Run it and watch what happens", False),
                    ("Rename it before running", False),
                ],
            },
            {
                "text": "What belongs in a question if you want an answer?",
                "explanation": (
                    "The exact error as text, the relevant code, what you expected, and what you "
                    "have already tried."
                ),
                "choices": [
                    ("The exact error, the code, what you expected, and what you tried", True),
                    ("A screenshot of the whole screen", False),
                    ("A description of how the error looks", False),
                    ("The name of your course", False),
                ],
            },
            {
                "text": "Your laptop is stolen tonight. What makes that survivable?",
                "explanation": (
                    "Pushing to GitHub is the backup. Three copies, two kinds of storage, one "
                    "elsewhere."
                ),
                "choices": [
                    ("Your work is pushed to GitHub", True),
                    ("Your work is on the Desktop", False),
                    ("Your work is in a folder called backup", False),
                    ("Your work is on a flash drive at home", False),
                ],
            },
        ],
    },
}
