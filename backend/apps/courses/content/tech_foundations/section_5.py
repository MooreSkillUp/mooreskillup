"""Section 5 — Choosing your path.

The section that turns a finished course into a next step. A student who
finishes Tech Foundations and does not know what to learn next has gained
knowledge and lost momentum, and momentum is the scarcer of the two.
"""

SECTION_5 = {
    "title": "Choosing your path",
    "description": (
        "What each role in tech actually does all day, how to read a roadmap without "
        "drowning in it, and how to pick the one thing to learn next."
    ),
    "access_type": "free",
    "lessons": [
        {
            "title": "What each role actually does all day",
            "duration_minutes": 10,
            "html": """
<p>Job titles tell you almost nothing. Here is what the work actually looks
like, so you can pick based on the days rather than the label.</p>

<h3>Frontend developer</h3>
<p><strong>The day:</strong> building what people see and touch. A designer hands
you a screen; you make it real, make it work on a phone, and make it fast.</p>
<ul>
<li><strong>Learn:</strong> HTML, CSS, JavaScript, then React</li>
<li><strong>Suits you if:</strong> you want to <em>see</em> what you built, and you notice when spacing is wrong</li>
<li><strong>The hard part:</strong> making one design work on every screen and browser</li>
</ul>

<h3>Backend developer</h3>
<p><strong>The day:</strong> the part nobody sees. Data, rules, who is allowed to
do what, and making sure a thousand people at once does not break it.</p>
<ul>
<li><strong>Learn:</strong> Python or Node, then databases and APIs</li>
<li><strong>Suits you if:</strong> you like puzzles and logic more than pixels</li>
<li><strong>The hard part:</strong> when it goes wrong, real money or real data is involved</li>
</ul>

<h3>Full-stack developer</h3>
<p>Both. Common in Nigerian startups, where small teams need people who can move
between them. Do not start here — start with one and add the other.</p>

<h3>Mobile developer</h3>
<p><strong>The day:</strong> apps on phones, and fighting two app stores.</p>
<ul>
<li><strong>Learn:</strong> React Native or Flutter for both, or Kotlin for Android alone</li>
<li><strong>The hard part:</strong> app store review, and the phones people actually own here</li>
</ul>

<h3>Data analyst</h3>
<p><strong>The day:</strong> answering questions with numbers. "Which courses do
people finish?" You find out and explain it so a non-technical person can act.</p>
<ul>
<li><strong>Learn:</strong> Excel properly, SQL, then Python</li>
<li><strong>Suits you if:</strong> you like finding the story in a spreadsheet</li>
<li><strong>Worth knowing:</strong> the fastest route into tech for many people, and SQL alone opens doors</li>
</ul>

<h3>DevOps / Cloud engineer</h3>
<p><strong>The day:</strong> the machinery that runs everything. Deployments,
servers, keeping it up at 2am.</p>
<ul>
<li><strong>Learn:</strong> Linux, networking, Docker, a cloud provider</li>
<li><strong>Not a first job.</strong> It assumes you have built and broken things already</li>
</ul>

<h3>UI/UX designer</h3>
<p><strong>The day:</strong> deciding what a thing should look like and how it
should behave, before anyone writes code.</p>
<ul>
<li><strong>Learn:</strong> Figma, design principles, user research</li>
<li><strong>Suits you if:</strong> you are drawn to how it feels, not how it works inside</li>
</ul>

<h3>QA / Tester</h3>
<p><strong>The day:</strong> finding what is broken before users do, and
automating those checks.</p>
<ul>
<li><strong>Another good entry point</strong>, and one that teaches you how software really fails</li>
</ul>

<div class="not-prose my-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-800 dark:bg-emerald-950">
<p class="m-0"><strong>You are not choosing forever.</strong> Most people move
at least once. Frontend developers become backend developers; analysts become
engineers. Pick the one that sounds like a good Tuesday and start.</p>
</div>
""",
        },
        {
            "title": "How to read a roadmap",
            "duration_minutes": 7,
            "html": """
<p>You have probably seen those enormous roadmap diagrams with two hundred boxes.
They are useful and they are discouraging, because they are read wrongly.</p>

<h3>A roadmap is a map, not a checklist</h3>
<p>It shows everything that exists in a field — including things senior people
learned over ten years, and things most jobs never touch. Nobody has done all of
it. Nobody needs to.</p>

<h3>Read it in three layers</h3>
<ol>
<li><strong>Must have</strong> — you cannot get a job without these. Usually about six boxes</li>
<li><strong>Should have</strong> — you will meet these in your first year</li>
<li><strong>Nice to have</strong> — the rest. Learn them when a real problem needs them</li>
</ol>

<p>For frontend, the must-have layer is roughly: HTML, CSS, JavaScript, Git, one
framework, and how to call an API. That is it. Everything else on that diagram is
the other two layers.</p>

<h3>Depth beats breadth, at the start</h3>
<p>One language you know well beats four you have touched. An employer can teach
you their framework; they cannot teach you how to think, and that comes from
going deep once.</p>

<h3>Signs you are in tutorial hell</h3>
<ul>
<li>You have finished several courses and built nothing of your own</li>
<li>You start a new tutorial whenever the current one gets difficult</li>
<li>You can follow along but freeze on a blank file</li>
</ul>

<p>The cure is uncomfortable and quick: <strong>build something small without a
tutorial.</strong> It will be bad. That is the point — the difficulty is where
the learning is.</p>

<div class="not-prose my-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
<p class="m-0"><strong>The 70% rule.</strong> When you understand about 70% of a
tutorial, stop watching and start building. The last 30% you will learn faster
by hitting it yourself than by being shown.</p>
</div>
""",
        },
        {
            "title": "Picking your first course",
            "duration_minutes": 6,
            "html": """
<p>Time to choose. Not forever — just what you do next.</p>

<h3>Four honest questions</h3>
<ol>
<li><strong>Do you want to see what you build, or is the logic the appeal?</strong><br>
Seeing it → frontend or mobile. Logic → backend or data.</li>
<li><strong>How much time do you genuinely have each week?</strong><br>
Under five hours → start with one narrow thing. SQL or HTML and CSS.</li>
<li><strong>Do you need income soon?</strong><br>
Then data analysis or frontend. Both have shorter routes to paid work in Nigeria.</li>
<li><strong>What do you keep reading about anyway?</strong><br>
Whatever you are already curious about will carry you through week six, when motivation fades.</li>
</ol>

<h3>Where each path starts here</h3>
<table>
<thead><tr><th>If you chose</th><th>Start with</th></tr></thead>
<tbody>
<tr><td>Frontend</td><td>HTML &amp; CSS, then JavaScript</td></tr>
<tr><td>Backend</td><td>Python for Beginners</td></tr>
<tr><td>Data</td><td>SQL, then Python</td></tr>
<tr><td>Mobile</td><td>JavaScript first, then React Native</td></tr>
<tr><td>Still unsure</td><td>HTML &amp; CSS — shortest route to something you can see</td></tr>
</tbody>
</table>

<h3>Commit to one for three months</h3>
<p>Not one week. Three months is long enough to get past the stage where
everything is confusing and reach the stage where things start connecting.
Switching every few weeks means permanently living in the confusing part.</p>

<div class="not-prose my-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-800 dark:bg-emerald-950">
<p class="m-0"><strong>If you truly cannot decide, choose HTML and CSS.</strong>
You will build something visible on day one, it is required for frontend and
useful for everything else, and nothing about it is wasted if you later go
backend.</p>
</div>
""",
        },
        {
            "title": "A routine you will actually keep",
            "duration_minutes": 5,
            "html": """
<p>Almost nobody fails at this because the material was too hard. They fail
because life happened for two weeks and they never came back.</p>

<h3>Small and often beats long and rare</h3>
<p>One hour a day, five days a week, beats eight hours every Saturday. Every
time. You forget less between sessions, and an hour is short enough that you will
still do it on a bad day.</p>

<h3>Same time, same place</h3>
<p>A decision you make once costs nothing. A decision you make daily costs
willpower you would rather spend on the work. Pick a slot — before work, after
dinner — and defend it.</p>

<h3>Finish mid-thought</h3>
<p>Stop while you still know what comes next. Starting tomorrow is much easier
when the first step is already obvious, and staring at a blank file is where
sessions die.</p>

<h3>Build something every week</h3>
<p>However small. A page, a script, a calculator. Watching a lesson feels like
progress; building proves it. Aim for one finished small thing a week rather than
one perfect thing a month.</p>

<h3>Expect the wall at week three</h3>
<p>Weeks one and two feel great. Around week three it gets hard, the novelty is
gone, and quitting looks reasonable. <strong>This happens to everybody.</strong>
It is not a sign you are unsuited — it is the normal shape of learning something
difficult. Push through it and it gets easier.</p>

<h3>Learn where someone will notice</h3>
<ul>
<li>Push to GitHub, so there is a visible record</li>
<li>Join the MooreSkillUp community and say what you are working on</li>
<li>Tell one person what you are learning. Being asked "how is it going?" is surprisingly effective</li>
</ul>

<div class="not-prose my-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
<p class="m-0"><strong>Missing a day is fine. Missing a week is how it ends.</strong>
If you miss one, do fifteen minutes the next day rather than nothing. The streak
matters more than the hours.</p>
</div>
""",
        },
        {
            "title": "Go deeper — where to go from here",
            "duration_minutes": 2,
            "content_type": "resource",
            "html": """
<p>You have finished. Here is where to point yourself next.</p>

<h3>On MooreSkillUp</h3>
<ul>
<li><strong>Know Your Path</strong> — each path laid out with the courses in order</li>
<li><strong>The course catalogue</strong> — filter by the path you chose</li>
<li><strong>The community</strong> — say what you are starting. People who say it out loud finish more often</li>
</ul>

<h3>Free practice, once you have started</h3>
<ul>
<li><strong>freeCodeCamp</strong> — enormous and free, with exercises that check your work</li>
<li><strong>The Odin Project</strong> — the best free frontend curriculum there is, and it makes you build</li>
<li><strong>Frontend Mentor</strong> — real designs to rebuild. Perfect for escaping tutorial hell</li>
<li><strong>Exercism</strong> — small problems with a human mentor reviewing your answer</li>
</ul>

<h3>Keep up without drowning</h3>
<ul>
<li><strong>roadmap.sh</strong> — the roadmaps, now that you know how to read them</li>
<li>One newsletter, not ten. <strong>JavaScript Weekly</strong> or <strong>Python Weekly</strong></li>
</ul>

<h3>For work in Nigeria</h3>
<ul>
<li><strong>Your GitHub is your CV.</strong> Keep pushing</li>
<li><strong>Write about what you build</strong> — even short posts. It is how people find you</li>
<li><strong>Go to one meetup or community call.</strong> Most first jobs here come through people, not applications</li>
</ul>

<div class="not-prose my-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-800 dark:bg-emerald-950">
<p class="m-0"><strong>One last thing.</strong> You now know more about how
technology works than most people who use it every day. That is not nothing —
it is the foundation everything else is built on. Pick your next course today,
while the momentum is here.</p>
</div>
""",
        },
    ],
    "quiz": {
        "title": "Section 5 quiz — Choosing your path",
        "description": "Six questions. Pass with four.",
        "pass_mark_percent": 70,
        "questions": [
            {
                "text": "Which role spends its day on what users see and touch?",
                "explanation": "Frontend builds the interface and makes it work on every screen.",
                "choices": [
                    ("Frontend developer", True),
                    ("Backend developer", False),
                    ("DevOps engineer", False),
                    ("Data analyst", False),
                ],
            },
            {
                "text": "How should you read a roadmap with two hundred boxes?",
                "explanation": (
                    "As a map of everything that exists, in three layers. The must-have layer is "
                    "usually about six boxes."
                ),
                "choices": [
                    ("As a map, in layers — must have, should have, nice to have", True),
                    ("As a checklist to complete in order", False),
                    ("As a list of what to learn this year", False),
                    ("As the requirements for a first job", False),
                ],
            },
            {
                "text": "What is the cure for tutorial hell?",
                "explanation": (
                    "Build something small without a tutorial. It will be bad, and that "
                    "difficulty is where the learning is."
                ),
                "choices": [
                    ("Build something small without following a tutorial", True),
                    ("Find a better tutorial", False),
                    ("Start a second language", False),
                    ("Watch the difficult part again", False),
                ],
            },
            {
                "text": "Which study pattern works better?",
                "explanation": (
                    "You forget less between sessions, and an hour is short enough that you will "
                    "still do it on a bad day."
                ),
                "choices": [
                    ("One hour a day, five days a week", True),
                    ("Eight hours every Saturday", False),
                    ("Three hours twice a month", False),
                    ("Whenever you feel motivated", False),
                ],
            },
            {
                "text": "When does learning usually feel hardest?",
                "explanation": (
                    "Around week three, when the novelty is gone. It happens to everybody and it "
                    "is not a sign you are unsuited."
                ),
                "choices": [
                    ("Around week three, when the novelty wears off", True),
                    ("On the first day", False),
                    ("Once you get a job", False),
                    ("It should never feel hard", False),
                ],
            },
            {
                "text": "You cannot decide which path to take. What is the sensible default?",
                "explanation": (
                    "HTML and CSS: something visible on day one, required for frontend, useful "
                    "everywhere, and wasted nowhere."
                ),
                "choices": [
                    ("HTML and CSS", True),
                    ("DevOps", False),
                    ("Machine learning", False),
                    ("Wait until you are sure", False),
                ],
            },
        ],
    },
}
