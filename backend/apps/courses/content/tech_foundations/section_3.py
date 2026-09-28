"""Section 3 — Git and GitHub.

The section that changes how a beginner works. Everything before this is setup;
this is the first professional habit, and the first thing an employer can
actually look at.
"""

SECTION_3 = {
    "title": "Git and GitHub",
    "description": (
        "Track your work properly, stop keeping folders called final-v2, and put your first "
        "project somewhere an employer can see it."
    ),
    "access_type": "free",
    "lessons": [
        {
            "title": "Why version control exists",
            "duration_minutes": 6,
            "html": """
<p>You have done this:</p>

<pre><code>report.docx
report-v2.docx
report-final.docx
report-final-FINAL.docx
report-final-FINAL-use-this-one.docx</code></pre>

<p>It works, badly, for one person and one file. It falls apart the moment the
project has forty files or two people.</p>

<h3>What Git actually does</h3>
<p>Git remembers <strong>every version of every file</strong>, with a note
saying what changed and why. Nothing is overwritten. Nothing is lost.</p>

<ul>
<li>Go back to how things were last Tuesday, in seconds</li>
<li>See exactly which lines changed between two points, and who changed them</li>
<li>Try something risky on a branch and throw it away if it fails</li>
<li>Two people work on the same project without emailing files</li>
</ul>

<h3>Git and GitHub are not the same thing</h3>
<table>
<thead><tr><th>Git</th><th>GitHub</th></tr></thead>
<tbody>
<tr><td>A program on your computer</td><td>A website</td></tr>
<tr><td>Tracks versions, offline</td><td>Stores a copy online</td></tr>
<tr><td>Works with no internet</td><td>Needs internet</td></tr>
<tr><td>Made by Linus Torvalds, 2005</td><td>A company, now owned by Microsoft</td></tr>
</tbody>
</table>

<p>Git is the tool. GitHub is one place to keep a copy — GitLab and Bitbucket
are others. You could use Git for years and never touch GitHub.</p>

<h3>The three words to learn now</h3>
<ul>
<li><strong>Repository</strong> (repo) — a project Git is watching</li>
<li><strong>Commit</strong> — a saved point, with a message saying what you did</li>
<li><strong>Push</strong> — send your commits to GitHub</li>
</ul>

<div class="not-prose my-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-800 dark:bg-emerald-950">
<p class="m-0"><strong>Why this matters more than it sounds.</strong> Your
GitHub profile is the first thing many Nigerian employers look at — often before
your CV. A year of commits is evidence that no certificate can give you.</p>
</div>
""",
        },
        {
            "title": "Installing and setting up Git",
            "duration_minutes": 7,
            "html": """
<h3>Install</h3>
<ul>
<li><strong>Windows:</strong> <code>winget install Git.Git</code>, or download from git-scm.com. Accept the defaults</li>
<li><strong>Mac:</strong> <code>git --version</code> — macOS offers to install it. Or <code>brew install git</code></li>
<li><strong>Linux:</strong> <code>sudo apt install git</code></li>
</ul>

<p>Check it:</p>
<pre><code>git --version</code></pre>

<h3>Tell Git who you are</h3>
<p>Every commit is signed with a name and email. Set them once:</p>

<pre><code>git config --global user.name "Ada Obi"
git config --global user.email "ada@example.com"</code></pre>

<p>Use the email you will use for GitHub, so your commits link to your profile
and show on your contribution graph.</p>

<h3>Two settings worth doing now</h3>
<pre><code>git config --global init.defaultBranch main
git config --global core.editor "code --wait"</code></pre>

<p>The first names your starting branch <code>main</code>, which is what
everyone uses now. The second makes Git open VS Code when it needs a message
from you — otherwise you land in <strong>Vim</strong>, and a great many
beginners have been stuck there, unable to get out.</p>

<div class="not-prose my-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
<p class="m-0"><strong>If you ever do land in Vim:</strong> press
<kbd>Esc</kbd>, then type <code>:wq</code> and press Enter. Write and quit. Keep
that somewhere.</p>
</div>

<h3>Check your work</h3>
<pre><code>git config --list</code></pre>
<p>You should see your name, your email, <code>main</code> and the editor.</p>

<div class="not-prose my-4 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-800 dark:bg-sky-950">
<p class="m-0"><strong>Try it yourself.</strong> Run all four config commands
now, then <code>git config --list</code> to confirm. The next lesson assumes
they are set.</p>
</div>
""",
        },
        {
            "title": "Your first commit",
            "duration_minutes": 10,
            "html": """
<p>Do this now, in a terminal. Reading it is not the same as doing it.</p>

<h3>1. Make a project</h3>
<pre><code>cd projects
mkdir git-practice
cd git-practice
code .</code></pre>

<h3>2. Start tracking it</h3>
<pre><code>git init</code></pre>
<p>Git creates a hidden <code>.git</code> folder. That folder <em>is</em> the
repository — the entire history lives there. Delete it and you delete the
history, so leave it alone.</p>

<h3>3. Make something</h3>
<p>In VS Code, create <code>README.md</code> with a line in it:</p>
<pre><code># Git practice

Learning Git on MooreSkillUp.</code></pre>

<h3>4. Ask Git what it sees</h3>
<pre><code>git status</code></pre>
<p>It reports <code>README.md</code> as <strong>untracked</strong> — it exists,
and Git is not yet watching it. <code>git status</code> is the command you will
run most; when confused, run it.</p>

<h3>5. Stage it</h3>
<pre><code>git add README.md</code></pre>
<p>Staging means "include this in the next commit". It lets you commit some
changes and not others. <code>git add .</code> stages everything.</p>

<h3>6. Commit it</h3>
<pre><code>git commit -m "Add README"</code></pre>

<p>That is a saved point in history. Nothing can lose it now.</p>

<h3>7. Look at what you did</h3>
<pre><code>git log --oneline</code></pre>

<h3>The cycle, forever</h3>
<pre><code>edit → git add . → git commit -m "what you did" → repeat</code></pre>

<h3>Writing a message worth reading</h3>
<table>
<thead><tr><th>Good</th><th>Useless</th></tr></thead>
<tbody>
<tr><td><code>Add contact form to homepage</code></td><td><code>update</code></td></tr>
<tr><td><code>Fix price showing as zero on mobile</code></td><td><code>fix</code></td></tr>
<tr><td><code>Remove unused images</code></td><td><code>changes</code></td></tr>
<tr><td><code>Correct typo in course title</code></td><td><code>asdf</code></td></tr>
</tbody>
</table>

<p>Write what the change does, in the present tense, as though finishing the
sentence <em>"This commit will…"</em>. In six months you will be reading these
to find when something broke.</p>

<div class="not-prose my-4 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-800 dark:bg-sky-950">
<p class="m-0"><strong>Try it yourself.</strong> Add a second line to the README,
then <code>git status</code>, <code>git add .</code>, <code>git commit -m "Add a
line about what I am learning"</code>, <code>git log --oneline</code>. Two
commits. You are using version control.</p>
</div>
""",
        },
        {
            "title": "Branches, in plain English",
            "duration_minutes": 8,
            "html": """
<p>A branch is a place to try something without risking what already works.</p>

<h3>The idea</h3>
<p>Your work lives on <code>main</code>. You want to add a contact form, and you
are not sure you will get it right. So you make a branch, work there, and
<code>main</code> stays exactly as it was. If it works, you merge it in. If it
does not, you delete the branch and nothing was harmed.</p>

<h3>The commands</h3>
<pre><code>git branch                      # which branches exist, and where I am
git switch -c contact-form      # make one and move to it
git switch main                 # go back
git merge contact-form          # bring the work into main
git branch -d contact-form      # delete it once merged</code></pre>

<p>You may see <code>git checkout -b</code> in older tutorials. It does the same
as <code>git switch -c</code>. <code>switch</code> is newer and clearer.</p>

<h3>Try it properly</h3>
<pre><code>git switch -c add-about
# create about.md, write a line in it
git add .
git commit -m "Add about page"
git switch main
ls        # about.md is not here
git merge add-about
ls        # now it is</code></pre>

<p>Watching <code>about.md</code> disappear and come back is the moment branches
stop being abstract.</p>

<h3>Why teams live this way</h3>
<ul>
<li><code>main</code> always works, so it can be deployed at any moment</li>
<li>Several people build different things at once without colliding</li>
<li>Work gets reviewed on its branch before it joins the real thing</li>
</ul>

<p>MooreSkillUp itself is built this way — every change you have used arrived on
a branch and was reviewed before it merged.</p>

<div class="not-prose my-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
<p class="m-0"><strong>Conflicts are normal.</strong> If two branches change the
same line, Git asks you to choose. It marks both versions in the file with
<code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code> and <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code>.
Delete the markers, keep what should be there, commit. It is not a failure —
it is Git refusing to guess.</p>
</div>
""",
        },
        {
            "title": "Creating your GitHub account",
            "duration_minutes": 5,
            "html": """
<p>Go to <strong>github.com</strong> and sign up. A few choices here will follow
you for years, so make them deliberately.</p>

<h3>Choose the username carefully</h3>
<p>It becomes your address — <code>github.com/yourname</code> — and you will put
it on your CV.</p>
<ul>
<li><strong>Good:</strong> <code>adaobi</code>, <code>ada-obi</code>, <code>adaobidev</code></li>
<li><strong>Bad:</strong> <code>xX_coder_Xx</code>, <code>ada123456</code>, <code>dontjudgeme</code></li>
</ul>
<p>Use the name you would be comfortable reading aloud in an interview, because
you will.</p>

<h3>Use the same email as your Git config</h3>
<p>Otherwise your commits will not link to your profile and your contribution
graph stays empty while you work.</p>

<h3>Turn on two-factor authentication</h3>
<p>Not optional. GitHub requires it, and it protects the account that will hold
years of your work. Use an authenticator app, and <strong>save the recovery
codes somewhere that is not your laptop</strong>.</p>

<h3>Fill in the profile</h3>
<p>Five minutes, and it is what a recruiter sees first:</p>
<ul>
<li>A real photo of your face</li>
<li>Your actual name</li>
<li>A one-line bio — <em>"Backend developer learning Python. Lagos."</em></li>
<li>Your location</li>
</ul>

<div class="not-prose my-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-800 dark:bg-emerald-950">
<p class="m-0"><strong>The Student Developer Pack.</strong> If you have a school
email, apply for GitHub's student pack — free Copilot, free hosting credit and a
long list of paid tools at no cost. Worth twenty minutes of your time.</p>
</div>

<div class="not-prose my-4 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-800 dark:bg-sky-950">
<p class="m-0"><strong>Try it yourself.</strong> Create the account, turn on 2FA,
add a photo and a bio. The next lesson puts your project on it.</p>
</div>
""",
        },
        {
            "title": "Pushing your project to GitHub",
            "duration_minutes": 11,
            "html": """
<p>Your commits are on your laptop. If the laptop dies, they die. Time to put
them somewhere safe.</p>

<h3>1. Make an empty repository</h3>
<p>On GitHub: <strong>+ → New repository</strong>.</p>
<ul>
<li>Name it <code>git-practice</code></li>
<li>Public</li>
<li><strong>Do not</strong> tick "Add a README" — you already have one, and ticking it causes a conflict on your first push</li>
</ul>

<h3>2. Connect and push</h3>
<p>GitHub shows you the commands. They are:</p>
<pre><code>git remote add origin https://github.com/YOURNAME/git-practice.git
git branch -M main
git push -u origin main</code></pre>

<p>What those mean:</p>
<ul>
<li><code>remote add origin</code> — remember this GitHub address under the name <code>origin</code></li>
<li><code>branch -M main</code> — make sure the branch is called <code>main</code></li>
<li><code>push -u origin main</code> — send it, and remember the pairing so future pushes are just <code>git push</code></li>
</ul>

<h3>3. Signing in</h3>
<p>Your GitHub password will not work here. Use a <strong>Personal Access
Token</strong>:</p>
<p>GitHub → Settings → Developer settings → Personal access tokens → Tokens
(classic) → Generate new token → tick <code>repo</code> → copy it.</p>

<p>Paste the token when Git asks for a password. <strong>Copy it before you
close the page</strong> — GitHub never shows it again.</p>

<div class="not-prose my-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm dark:border-red-800 dark:bg-red-950">
<p class="m-0"><strong>A token is a password.</strong> Never put it in a file you
commit, never paste it into a chat, never put it in a screenshot. Section 4.6
covers how to keep secrets properly.</p>
</div>

<h3>4. From now on</h3>
<pre><code>git add .
git commit -m "what I did"
git push</code></pre>

<h3>Add a .gitignore before you have anything to hide</h3>
<p>Some things must never be committed. Create a file called
<code>.gitignore</code>:</p>

<pre><code>node_modules/
__pycache__/
.env
.DS_Store
*.log</code></pre>

<p><code>.env</code> is the important one — it is where passwords and API keys
live. People have committed AWS keys to public repositories and woken up to
enormous bills.</p>

<div class="not-prose my-4 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-800 dark:bg-sky-950">
<p class="m-0"><strong>Try it yourself.</strong> Push <code>git-practice</code>,
then open <code>github.com/YOURNAME/git-practice</code> in a browser. Your README
is on the internet. Check your profile — there is a green square on today.</p>
</div>
""",
        },
        {
            "title": "What a good README says about you",
            "duration_minutes": 5,
            "html": """
<p>The README is the first thing anyone sees. For most of your projects it is
the <em>only</em> thing they read, and it is judged as work in its own right.</p>

<h3>What belongs in one</h3>
<pre><code># Project name

One sentence on what it does and who it is for.

## What it looks like
A screenshot. This matters more than anything else here.

## Built with
- HTML, CSS, JavaScript
- Whatever else

## Running it
1. `git clone https://github.com/you/project.git`
2. `cd project`
3. Open `index.html`

## What I learned
Two or three honest sentences.</code></pre>

<h3>The screenshot is not optional</h3>
<p>A recruiter with forty tabs open will not clone your repository and run it.
They will look for a picture. No picture, and they move on.</p>
<p>Take one, put it in the repository, and show it:</p>
<pre><code>![The homepage](screenshot.png)</code></pre>

<h3>"What I learned" is the part people remember</h3>
<p>A junior developer who can say <em>"I used floats for layout, hit a wall with
responsiveness and rewrote it with flexbox"</em> is showing exactly what an
employer wants to see: that you notice, and you fix it.</p>

<h3>Markdown, in thirty seconds</h3>
<table>
<thead><tr><th>Write</th><th>Get</th></tr></thead>
<tbody>
<tr><td><code># Big heading</code></td><td>A heading</td></tr>
<tr><td><code>**bold**</code></td><td><strong>bold</strong></td></tr>
<tr><td><code>- item</code></td><td>A bullet</td></tr>
<tr><td><code>`code`</code></td><td><code>code</code></td></tr>
<tr><td><code>[text](url)</code></td><td>A link</td></tr>
</tbody>
</table>

<div class="not-prose my-4 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-800 dark:bg-sky-950">
<p class="m-0"><strong>Try it yourself.</strong> Rewrite your
<code>git-practice</code> README using the template. Commit and push. Then look
at it on GitHub — it renders properly there.</p>
</div>
""",
        },
        {
            "title": "Go deeper — Git and GitHub",
            "duration_minutes": 2,
            "content_type": "resource",
            "html": """
<p>Optional. None of this is on the quiz.</p>

<h3>When you get stuck</h3>
<ul>
<li><strong>Oh Sh*t, Git!?!</strong> (ohshitgit.com) — plain answers to "I committed to the wrong branch" and every other panic. Bookmark it now, before you need it</li>
<li><strong>git-scm.com/book</strong> — the free official book. Chapters 2 and 3 cover nearly everything you will use</li>
</ul>

<h3>See it working</h3>
<ul>
<li><strong>Learn Git Branching</strong> (learngitbranching.js.org) — a game where you type real commands and watch the branches move. The best half hour available on this</li>
<li><strong>GitLens</strong> in VS Code — hover any line to see who last changed it and why</li>
</ul>

<h3>When you are ready for more</h3>
<ul>
<li><strong>Pull requests</strong> — how a change gets reviewed before joining <code>main</code>. GitHub's own guides cover this well</li>
<li><strong>GitHub Pages</strong> — publish a site free from a repository. Your portfolio can live there</li>
<li><strong>SSH keys</strong> — stop typing a token on every push</li>
</ul>

<div class="not-prose my-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-800 dark:bg-emerald-950">
<p class="m-0"><strong>The habit that matters most.</strong> Commit small and
often, with real messages. Not one enormous commit a week called "updates". A
year of that history is a thing you can show someone.</p>
</div>
""",
        },
    ],
    "quiz": {
        "title": "Section 3 quiz — Git and GitHub",
        "description": "Eight questions. Pass with six.",
        "pass_mark_percent": 70,
        "questions": [
            {
                "text": "What is the difference between Git and GitHub?",
                "explanation": (
                    "Git is a program on your computer that tracks versions. GitHub is a website "
                    "that stores a copy. You can use Git without GitHub entirely."
                ),
                "choices": [
                    ("Git is the tool on your computer; GitHub is a site that stores a copy", True),
                    ("They are two names for the same thing", False),
                    ("Git is for teams; GitHub is for individuals", False),
                    ("GitHub runs on your machine; Git is online", False),
                ],
            },
            {
                "text": "Which command shows what Git currently sees in your project?",
                "explanation": "git status is the one to run whenever you are unsure.",
                "choices": [
                    ("git status", True),
                    ("git log", False),
                    ("git add", False),
                    ("git push", False),
                ],
            },
            {
                "text": "What does staging a file with <code>git add</code> mean?",
                "explanation": (
                    "It marks the file for inclusion in the next commit, which lets you commit "
                    "some changes and leave others for later."
                ),
                "choices": [
                    ("It will be included in the next commit", True),
                    ("It is uploaded to GitHub", False),
                    ("It is permanently saved in history", False),
                    ("It is deleted from the folder", False),
                ],
            },
            {
                "text": "Which commit message is worth writing?",
                "explanation": (
                    "Say what the change does. In six months you will read these to find when "
                    "something broke."
                ),
                "choices": [
                    ("Fix price showing as zero on mobile", True),
                    ("update", False),
                    ("changes", False),
                    ("asdf", False),
                ],
            },
            {
                "text": "Why work on a branch instead of directly on <code>main</code>?",
                "explanation": (
                    "main stays working while you try something. If it fails, delete the branch "
                    "and nothing was harmed."
                ),
                "choices": [
                    ("So main keeps working while you try something that might not", True),
                    ("Because Git will not let you commit to main", False),
                    ("Because branches are faster", False),
                    ("Because GitHub charges for commits to main", False),
                ],
            },
            {
                "text": "What must never be committed to a repository?",
                "explanation": (
                    "Secrets. People have committed cloud keys to public repositories and woken "
                    "up to enormous bills. That is what .gitignore and .env are for."
                ),
                "choices": [
                    ("Passwords, API keys and .env files", True),
                    ("README files", False),
                    ("Screenshots", False),
                    ("HTML files", False),
                ],
            },
            {
                "text": "A recruiter opens your project on GitHub. What matters most in the README?",
                "explanation": (
                    "A screenshot. Somebody with forty tabs open will not clone and run your "
                    "project; they will look for a picture."
                ),
                "choices": [
                    ("A screenshot of what it looks like", True),
                    ("The number of commits", False),
                    ("The programming language badge", False),
                    ("The licence", False),
                ],
            },
            {
                "text": "You are stuck in Vim after a Git command. How do you get out?",
                "explanation": "Esc, then :wq and Enter — write and quit.",
                "choices": [
                    ("Press Esc, type :wq and press Enter", True),
                    ("Press Ctrl+C twice", False),
                    ("Close the terminal window", False),
                    ("Type exit and press Enter", False),
                ],
            },
        ],
    },
}
