"""Section 2 — Your toolkit.

The section where the student stops reading and sets their machine up. Every
lesson here ends with something installed or configured, because a foundations
course that leaves someone with an unconfigured laptop has taught them nothing
they can use.
"""

SECTION_2 = {
    "title": "Your toolkit",
    "description": (
        "Set your computer up the way developers actually have theirs: a proper editor, "
        "configured sensibly, and a terminal you are not afraid of."
    ),
    "access_type": "free",
    "lessons": [
        {
            "title": "Editors and IDEs: what they are, and which to pick",
            "duration_minutes": 6,
            "html": """
<p>You could write code in Notepad. People did, for years. You should not.</p>

<h3>What an editor gives you</h3>
<ul>
<li><strong>Syntax highlighting</strong> — colour by meaning, so a missing quote is visible rather than hunted</li>
<li><strong>Autocomplete</strong> — it finishes names you have already used, and catches typos as you make them</li>
<li><strong>Error marks</strong> — a red squiggle before you run anything</li>
<li><strong>Jump to definition</strong> — click a function name, land where it was written</li>
<li><strong>Integrated terminal</strong> — run your code without leaving the window</li>
</ul>

<h3>Editor or IDE?</h3>
<p>An <strong>IDE</strong> (Integrated Development Environment) bundles the
editor with a debugger, a build system and project tools. An <strong>editor</strong>
starts smaller and grows as you add extensions.</p>

<p>The line has blurred. VS Code began as an editor and, with extensions, does
most of what an IDE does.</p>

<table>
<thead><tr><th>Tool</th><th>Best for</th><th>Cost</th></tr></thead>
<tbody>
<tr><td><strong>VS Code</strong></td><td>Almost everything. The default choice</td><td>Free</td></tr>
<tr><td>PyCharm</td><td>Serious Python work</td><td>Free tier, paid pro</td></tr>
<tr><td>IntelliJ IDEA</td><td>Java and Kotlin</td><td>Free tier, paid pro</td></tr>
<tr><td>Android Studio</td><td>Android apps</td><td>Free</td></tr>
<tr><td>Xcode</td><td>iPhone apps. Mac only</td><td>Free</td></tr>
</tbody>
</table>

<h3>We are using VS Code</h3>
<p>Not because it is best at everything, but because it is good at everything,
it is free, it runs on any machine you are likely to own, and the job adverts
you will read in a year assume you know it.</p>

<div class="not-prose my-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
<p class="m-0"><strong>On a weak laptop?</strong> VS Code is lighter than the
full IDEs and runs on 4&nbsp;GB. If it still struggles, close browser tabs
first — that is almost always the real problem.</p>
</div>
""",
        },
        {
            "title": "Setting up your computer",
            "duration_minutes": 7,
            "html": """
<p>Before installing anything, get the machine itself in order. Twenty minutes
here saves hours later.</p>

<h3>1. Show file extensions</h3>
<p>Covered in lesson 1.2, and worth repeating because it matters twice — once
for your sanity and once for your safety.</p>
<ul>
<li><strong>Windows:</strong> File Explorer → View → Show → File name extensions</li>
<li><strong>Mac:</strong> Finder → Settings → Advanced → Show all filename extensions</li>
</ul>

<h3>2. Make a projects folder</h3>
<p>One folder, near the top of your drive, where everything you build lives.</p>
<pre><code>C:\\projects          (Windows — not Documents, not Desktop)
~/projects            (Mac and Linux)</code></pre>
<p>Short paths save typing and avoid a real Windows limit on very long ones.</p>

<h3>3. Free some space</h3>
<p>Development eats disk. Aim for at least 10&nbsp;GB free before you start.
Node projects alone routinely take 300&nbsp;MB each.</p>

<h3>4. Know your machine</h3>
<p>You will be asked "32-bit or 64-bit?" and "Intel or Apple silicon?" by
installers. Find out once and remember it.</p>
<ul>
<li><strong>Windows:</strong> Settings → System → About</li>
<li><strong>Mac:</strong> Apple menu →  About This Mac</li>
</ul>

<h3>5. Turn on automatic updates</h3>
<p>An unpatched machine is the easiest way to lose your work and your accounts.
Section 4 goes further into this.</p>

<div class="not-prose my-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-800 dark:bg-emerald-950">
<p class="m-0"><strong>On Windows, install a package manager while you are
here.</strong> Open PowerShell and run <code>winget --version</code>. If it
answers, you can install most tools with one line instead of hunting for
download pages — and <code>winget</code> gets them from the real source, which
is safer than a search result.</p>
</div>

<div class="not-prose my-4 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-800 dark:bg-sky-950">
<p class="m-0"><strong>Try it yourself.</strong> Do all five now. The next
lesson assumes your projects folder exists.</p>
</div>
""",
        },
        {
            "title": "Installing VS Code",
            "duration_minutes": 6,
            "html": """
<h3>Get it from the right place</h3>
<p>Only from <strong>code.visualstudio.com</strong>. Not from a search result,
not from a download site. Editors are a favourite way to hand someone malware,
because developers install them with full permissions.</p>

<h3>Windows</h3>
<p>Download the <strong>User Installer</strong> for x64. During setup, tick:</p>
<ul>
<li><strong>Add "Open with Code" to the file context menu</strong></li>
<li><strong>Add "Open with Code" to the directory context menu</strong></li>
<li><strong>Add to PATH</strong> — this one matters most; it lets you type <code>code .</code> in a terminal</li>
</ul>

<p>Or one line in PowerShell:</p>
<pre><code>winget install Microsoft.VisualStudioCode</code></pre>

<h3>Mac</h3>
<p>Download, unzip, drag <strong>Visual Studio Code</strong> into Applications.
Then open it, press <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>, type
<code>shell command</code> and choose <strong>Install 'code' command in
PATH</strong>.</p>

<h3>Linux</h3>
<pre><code>sudo snap install --classic code</code></pre>

<h3>Check it worked</h3>
<p>Open a new terminal and type:</p>
<pre><code>code --version</code></pre>
<p>Three lines of version information means you are set. <em>"command not
found"</em> means PATH was missed — reinstall with that box ticked, or run the
shell command step on a Mac.</p>

<div class="not-prose my-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-800 dark:bg-emerald-950">
<p class="m-0"><strong>The one command worth memorising.</strong> From any
folder in a terminal, <code>code .</code> opens that folder in VS Code. The dot
means "here". You will type it thousands of times.</p>
</div>

<div class="not-prose my-4 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-800 dark:bg-sky-950">
<p class="m-0"><strong>Try it yourself.</strong> Open a terminal, go to your
projects folder, and run <code>code .</code>. VS Code should open with that
folder loaded.</p>
</div>
""",
        },
        {
            "title": "The VS Code settings that matter",
            "duration_minutes": 9,
            "html": """
<p>VS Code has hundreds of settings. Nine are worth changing on day one.</p>

<p>Open settings with <kbd>Ctrl</kbd>+<kbd>,</kbd> (<kbd>Cmd</kbd>+<kbd>,</kbd>
on Mac) and search for each by name.</p>

<h3>The nine</h3>
<table>
<thead><tr><th>Setting</th><th>Set to</th><th>Why</th></tr></thead>
<tbody>
<tr><td>Auto Save</td><td><code>afterDelay</code></td><td>Stop losing work to a crash or a power cut</td></tr>
<tr><td>Format On Save</td><td>on</td><td>Your code is tidy without you thinking about it</td></tr>
<tr><td>Tab Size</td><td><code>2</code></td><td>Matches what most web code uses</td></tr>
<tr><td>Word Wrap</td><td><code>on</code></td><td>No horizontal scrolling on a small screen</td></tr>
<tr><td>Render Whitespace</td><td><code>boundary</code></td><td>See the spaces that break things</td></tr>
<tr><td>Files: Trim Trailing Whitespace</td><td>on</td><td>Keeps diffs clean in section 3</td></tr>
<tr><td>Files: Insert Final Newline</td><td>on</td><td>The convention; its absence annoys tools</td></tr>
<tr><td>Editor: Bracket Pair Colorization</td><td>on</td><td>Matching brackets share a colour</td></tr>
<tr><td>Explorer: Compact Folders</td><td>off</td><td>Folders stop collapsing confusingly</td></tr>
</tbody>
</table>

<h3>Or paste them all at once</h3>
<p>Press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>, type
<strong>Preferences: Open User Settings (JSON)</strong>, and paste this inside
the braces:</p>

<pre><code>"files.autoSave": "afterDelay",
"editor.formatOnSave": true,
"editor.tabSize": 2,
"editor.wordWrap": "on",
"editor.renderWhitespace": "boundary",
"files.trimTrailingWhitespace": true,
"files.insertFinalNewline": true,
"editor.bracketPairColorization.enabled": true,
"explorer.compactFolders": false</code></pre>

<h3>Shortcuts worth learning now</h3>
<table>
<thead><tr><th>Windows / Linux</th><th>Mac</th><th>Does</th></tr></thead>
<tbody>
<tr><td><kbd>Ctrl</kbd>+<kbd>P</kbd></td><td><kbd>Cmd</kbd>+<kbd>P</kbd></td><td>Open any file by typing part of its name</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd></td><td><kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd></td><td>Every command there is</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>`</kbd></td><td><kbd>Ctrl</kbd>+<kbd>`</kbd></td><td>Show or hide the terminal</td></tr>
<tr><td><kbd>Ctrl</kbd>+<kbd>/</kbd></td><td><kbd>Cmd</kbd>+<kbd>/</kbd></td><td>Comment the line out</td></tr>
<tr><td><kbd>Alt</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd></td><td><kbd>Opt</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd></td><td>Move a line up or down</td></tr>
</tbody>
</table>

<div class="not-prose my-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
<p class="m-0"><strong>Learn <kbd>Ctrl</kbd>+<kbd>P</kbd> properly.</strong>
Clicking through folders to find a file is the slowest habit a beginner keeps.
Two keys and four letters is faster every time.</p>
</div>
""",
        },
        {
            "title": "Extensions worth having",
            "duration_minutes": 6,
            "html": """
<p>Extensions are how VS Code becomes yours. They are also how it becomes slow,
so install deliberately.</p>

<p>Open the Extensions panel with
<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>X</kbd>.</p>

<h3>Install these now</h3>
<table>
<thead><tr><th>Extension</th><th>What it does</th></tr></thead>
<tbody>
<tr><td><strong>Prettier</strong></td><td>Formats your code consistently. Pair with Format On Save</td></tr>
<tr><td><strong>Live Server</strong></td><td>Opens your HTML in a browser that reloads as you type</td></tr>
<tr><td><strong>Code Spell Checker</strong></td><td>Catches typos in names and comments, which cause real bugs</td></tr>
<tr><td><strong>Error Lens</strong></td><td>Shows the error next to the line instead of hidden in a panel</td></tr>
<tr><td><strong>GitLens</strong></td><td>Who changed this line, and when. Makes sense after section 3</td></tr>
</tbody>
</table>

<h3>Add later, when you need them</h3>
<ul>
<li><strong>Python</strong> — once you start Python</li>
<li><strong>ESLint</strong> — once you start JavaScript properly</li>
<li><strong>Tailwind CSS IntelliSense</strong> — if you use Tailwind</li>
<li><strong>Thunder Client</strong> — try APIs without leaving the editor</li>
</ul>

<h3>Check before you install</h3>
<p>Anyone can publish an extension, and extensions run with your permissions.</p>
<ul>
<li>Look at the <strong>publisher</strong>. Prettier's is <code>Prettier</code>; Python's is <code>Microsoft</code></li>
<li>Look at the <strong>install count</strong>. Millions is reassuring; two hundred is not</li>
<li>Be suspicious of a brand new extension with a famous name</li>
</ul>

<div class="not-prose my-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
<p class="m-0"><strong>Themes are not productivity.</strong> Spending an evening
on colour schemes feels like setting up and is not. Pick one, move on. You can
change it when you have shipped something.</p>
</div>

<div class="not-prose my-4 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-800 dark:bg-sky-950">
<p class="m-0"><strong>Try it yourself.</strong> Install the five, then make
<code>index.html</code> in your projects folder, type <code>!</code> and press
<kbd>Tab</kbd>. A whole HTML page appears. Right-click → <strong>Open with Live
Server</strong>.</p>
</div>
""",
        },
        {
            "title": "The terminal, without fear",
            "duration_minutes": 11,
            "html": """
<p>The terminal frightens beginners because it gives no hints. But it is only a
way of typing what you would otherwise click, and about a dozen commands cover
most days.</p>

<h3>Which one you have</h3>
<ul>
<li><strong>Windows:</strong> PowerShell. Use it, not the old Command Prompt</li>
<li><strong>Mac and Linux:</strong> Terminal, running bash or zsh</li>
</ul>
<p>Or just press <kbd>Ctrl</kbd>+<kbd>`</kbd> inside VS Code, which is what you
will actually do.</p>

<h3>The dozen that matter</h3>
<table>
<thead><tr><th>Command</th><th>Does</th></tr></thead>
<tbody>
<tr><td><code>pwd</code></td><td>Where am I?</td></tr>
<tr><td><code>ls</code> (<code>dir</code> on Windows)</td><td>What is in here?</td></tr>
<tr><td><code>cd projects</code></td><td>Go into <code>projects</code></td></tr>
<tr><td><code>cd ..</code></td><td>Go up one folder</td></tr>
<tr><td><code>cd</code> alone</td><td>Go home</td></tr>
<tr><td><code>mkdir my-site</code></td><td>Make a folder</td></tr>
<tr><td><code>touch a.txt</code> / <code>ni a.txt</code></td><td>Make an empty file</td></tr>
<tr><td><code>cat a.txt</code></td><td>Show a file's contents</td></tr>
<tr><td><code>cp a.txt b.txt</code></td><td>Copy</td></tr>
<tr><td><code>mv a.txt c.txt</code></td><td>Move, or rename</td></tr>
<tr><td><code>rm a.txt</code></td><td>Delete. <strong>No recycle bin</strong></td></tr>
<tr><td><code>code .</code></td><td>Open this folder in VS Code</td></tr>
</tbody>
</table>

<h3>Three habits that make it painless</h3>
<ul>
<li><strong><kbd>Tab</kbd> completes.</strong> Type <code>cd proj</code> and press Tab. Never type a full folder name again, and never misspell one</li>
<li><strong>Up arrow repeats.</strong> Your last commands are there. Do not retype</li>
<li><strong><kbd>Ctrl</kbd>+<kbd>C</kbd> stops.</strong> Something running away? That stops it</li>
</ul>

<div class="not-prose my-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm dark:border-red-800 dark:bg-red-950">
<p class="m-0"><strong>Read before you press Enter on <code>rm</code>.</strong>
There is no undo and no recycle bin. And never paste a command from the internet
that you do not understand — especially one with <code>sudo rm -rf</code> in it.
That is a real way people lose everything.</p>
</div>

<h3>Reading a command</h3>
<pre><code>mkdir -p projects/my-site
 │     │   └── the thing you are acting on
 │     └── a flag, changing how it behaves (-p makes parents too)
 └── the command</code></pre>

<div class="not-prose my-4 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-800 dark:bg-sky-950">
<p class="m-0"><strong>Try it yourself.</strong> In your terminal, in order:
<code>cd projects</code>, <code>mkdir terminal-practice</code>,
<code>cd terminal-practice</code>, <code>pwd</code>, then <code>code .</code>.
Five commands, and you have made a project and opened it without touching the
mouse.</p>
</div>
""",
        },
        {
            "title": "Where to keep your projects",
            "duration_minutes": 4,
            "html": """
<p>A small decision that saves real time later.</p>

<h3>One folder, short path, not synced</h3>
<pre><code>C:\\projects\\          (Windows)
~/projects/            (Mac and Linux)</code></pre>

<p>Three reasons it is not Documents or Desktop:</p>
<ul>
<li><strong>Short paths.</strong> Windows has a real limit on path length, and deep <code>node_modules</code> folders hit it</li>
<li><strong>No spaces.</strong> <code>C:\\Users\\Ada Obi\\My Documents\\</code> needs quoting in every command</li>
<li><strong>Not in OneDrive, iCloud or Dropbox.</strong> This one matters most</li>
</ul>

<div class="not-prose my-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm dark:border-red-800 dark:bg-red-950">
<p class="m-0"><strong>Never put a project inside a synced folder.</strong>
Sync tools copy thousands of tiny files constantly, fight with your editor over
locked files, and corrupt Git repositories. It is one of the most common causes
of "my project broke and I do not know why". Section 3 gives you a better way to
keep your work safe.</p>
</div>

<h3>One folder per project</h3>
<pre><code>projects/
  my-portfolio/
  python-practice/
  tech-foundations-project/</code></pre>

<p>Never nest one project inside another. Tools look upward for configuration
and get confused about which project they are in.</p>

<h3>Name them like the files</h3>
<p>Lower case, dashes, no spaces. <code>my-portfolio</code>, not
<code>My Portfolio (final)</code>. These names often become web addresses.</p>

<div class="not-prose my-4 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-800 dark:bg-sky-950">
<p class="m-0"><strong>Try it yourself.</strong> If your work is currently on
the Desktop or in OneDrive, move it now, while there are only a few things to
move.</p>
</div>
""",
        },
        {
            "title": "Go deeper — your toolkit",
            "duration_minutes": 2,
            "content_type": "resource",
            "html": """
<p>Optional. None of this is on the quiz.</p>

<h3>Learn your editor properly</h3>
<ul>
<li><strong>VS Code's own Interactive Playground</strong> — Help → Interactive Playground. Ten minutes, and it teaches multi-cursor editing, which feels like a superpower the first time</li>
<li><strong>VS Code Tips and Tricks</strong> in the official docs</li>
</ul>

<h3>Get comfortable in the terminal</h3>
<ul>
<li><strong>The Missing Semester of Your CS Education</strong> (MIT) — the shell lecture is the best hour you can spend on this</li>
<li><strong>explainshell.com</strong> — paste any command and it labels every part. Use it before running something you copied</li>
</ul>

<h3>When you are ready for more</h3>
<ul>
<li><strong>Windows Terminal</strong> — tabs, panes, and a much better experience than the default window</li>
<li><strong>Oh My Zsh</strong> (Mac and Linux) — a nicer prompt that shows your Git branch. Worth it after section 3</li>
<li><strong>Windows Subsystem for Linux</strong> — a real Linux inside Windows. Genuinely useful once you deploy to servers</li>
</ul>

<div class="not-prose my-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
<p class="m-0"><strong>Resist the setup rabbit hole.</strong> There is always
another plugin, another theme, another shell. A perfectly configured machine with
nothing built on it helps nobody. Move on to section 3.</p>
</div>
""",
        },
    ],
    "quiz": {
        "title": "Section 2 quiz — Your toolkit",
        "description": "Eight questions. Pass with six.",
        "pass_mark_percent": 70,
        "questions": [
            {
                "text": "What does <code>code .</code> do?",
                "explanation": "The dot means the current folder, so it opens that folder in VS Code.",
                "choices": [
                    ("Opens the current folder in VS Code", True),
                    ("Creates a new file called code", False),
                    ("Runs the code in the current folder", False),
                    ("Shows the VS Code version", False),
                ],
            },
            {
                "text": "Why should a project folder not live inside OneDrive, iCloud or Dropbox?",
                "explanation": (
                    "Sync tools constantly copy thousands of small files, fight the editor over "
                    "locks and can corrupt Git repositories."
                ),
                "choices": [
                    ("Syncing fights with your tools and can corrupt the project", True),
                    ("Cloud storage cannot hold code files", False),
                    ("It uses too much bandwidth to be allowed", False),
                    ("VS Code refuses to open synced folders", False),
                ],
            },
            {
                "text": "In the terminal, what does <code>cd ..</code> do?",
                "explanation": "Two dots mean the folder above the current one.",
                "choices": [
                    ("Moves up one folder", True),
                    ("Goes to the home folder", False),
                    ("Lists everything in the folder", False),
                    ("Creates a folder", False),
                ],
            },
            {
                "text": "Which terminal key finishes a folder name you have started typing?",
                "explanation": "Tab completes. It saves typing and prevents misspellings.",
                "choices": [
                    ("Tab", True),
                    ("Enter", False),
                    ("Ctrl+C", False),
                    ("Shift", False),
                ],
            },
            {
                "text": "What is different about <code>rm</code> compared with deleting in a file manager?",
                "explanation": "There is no recycle bin. It is gone.",
                "choices": [
                    ("There is no recycle bin — the file is gone", True),
                    ("It only works on empty files", False),
                    ("It asks for confirmation first", False),
                    ("It moves the file to the desktop", False),
                ],
            },
            {
                "text": "Before installing a VS Code extension, what is worth checking?",
                "explanation": (
                    "Anyone can publish an extension, and extensions run with your permissions. "
                    "The publisher and install count are the quickest signals."
                ),
                "choices": [
                    ("Who published it and how many people use it", True),
                    ("Whether it has a dark theme", False),
                    ("The file size", False),
                    ("Whether it was updated today", False),
                ],
            },
            {
                "text": "Why set Auto Save on?",
                "explanation": (
                    "Unsaved work lives in RAM, and RAM empties when the power goes — which in "
                    "Nigeria is not a rare event."
                ),
                "choices": [
                    ("So a crash or power cut does not lose your work", True),
                    ("So the file uploads to the cloud", False),
                    ("So the code runs faster", False),
                    ("So Git commits automatically", False),
                ],
            },
            {
                "text": "Which is the best folder name for a project?",
                "explanation": (
                    "Lower case, dashes, no spaces. These names often become part of a web "
                    "address, and Linux servers care about case."
                ),
                "choices": [
                    ("my-portfolio", True),
                    ("My Portfolio", False),
                    ("My_Portfolio_Final_v2", False),
                    ("portfolio (new)", False),
                ],
            },
        ],
    },
}
