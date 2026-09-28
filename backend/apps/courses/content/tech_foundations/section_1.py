"""Section 1 — How technology works.

The section that makes every other section possible. A student who does not
know what a server is will nod through an explanation of deployment and
understand none of it.

Written to be read on a phone: short paragraphs, one idea at a time, a concrete
example for every abstraction, and nothing that assumes a degree.
"""

SECTION_1 = {
    "title": "How technology works",
    "description": (
        "What the parts of a computer actually do, where your files really live, how the "
        "internet carries a message, and what happens in the second between typing a web "
        "address and seeing the page."
    ),
    "access_type": "free",
    "lessons": [
        {
            "title": "Your computer: what the parts actually do",
            "duration_minutes": 6,
            "is_previewable": True,
            "html": """
<p>You are going to spend years working on a computer. It is worth ten minutes
understanding what is inside one.</p>

<p>There are four parts that matter. Everything else is detail.</p>

<h3>The CPU — the part that thinks</h3>
<p>The processor does the actual work: arithmetic, comparisons, decisions. When
someone says a computer is "fast", this is usually what they mean. Modern CPUs
have several <strong>cores</strong>, which lets them genuinely do several things
at once rather than pretending to.</p>

<h3>RAM — the desk you work on</h3>
<p>RAM is where the computer keeps what it is using <em>right now</em>. Think of
a desk: the bigger it is, the more papers you can spread out without putting
some back in the drawer.</p>

<p>RAM is <strong>temporary</strong>. Turn the machine off and it is empty. This
is why unsaved work disappears when the power goes — and why, in Nigeria, you
save often.</p>

<div class="not-prose my-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
<p class="m-0"><strong>Why this matters to you.</strong> When your laptop crawls
with twelve browser tabs and VS Code open, it is almost always RAM, not the CPU.
4&nbsp;GB is painful for development. 8&nbsp;GB is workable. 16&nbsp;GB is
comfortable.</p>
</div>

<h3>Storage — the drawer</h3>
<p>Your SSD or hard drive keeps things when the power is off: your files, your
programs, the operating system itself. Storage is much larger than RAM and much
slower.</p>

<table>
<thead><tr><th></th><th>RAM</th><th>Storage</th></tr></thead>
<tbody>
<tr><td>Holds</td><td>What you are using now</td><td>Everything you keep</td></tr>
<tr><td>When power goes</td><td>Empty</td><td>Still there</td></tr>
<tr><td>Typical size</td><td>8 GB</td><td>512 GB</td></tr>
<tr><td>Speed</td><td>Very fast</td><td>Much slower</td></tr>
</tbody>
</table>

<h3>The operating system — the manager</h3>
<p>Windows, macOS, Linux and Android are operating systems. The OS decides which
program gets the CPU, hands out RAM, and gives you a way to open a file without
knowing which physical part of the disk it sits on.</p>

<p>When you write code, you are writing something the operating system will run
on your behalf. That relationship is worth remembering.</p>

<div class="not-prose my-4 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-800 dark:bg-sky-950">
<p class="m-0"><strong>Try it yourself.</strong> Open Task Manager on Windows
(<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Esc</kbd>) or Activity Monitor on a Mac.
Sort by memory. Look at what is eating your RAM. It is usually the browser, and
it is usually a surprise.</p>
</div>
""",
        },
        {
            "title": "Files, folders, and where things really live",
            "duration_minutes": 6,
            "html": """
<p>Most people who struggle with their first programming course are not
struggling with code. They are struggling because they cannot find the file they
just made.</p>

<h3>A path is an address</h3>
<p>Every file has an address, called a <strong>path</strong>. It reads like
directions from the top of the drive down to the file.</p>

<pre><code>C:\\Users\\Ada\\Documents\\projects\\my-site\\index.html   (Windows)
/Users/Ada/Documents/projects/my-site/index.html        (Mac and Linux)</code></pre>

<p>Windows separates folders with a backslash; everyone else uses a forward
slash. That is the only real difference, and it trips up beginners constantly.</p>

<h3>Absolute and relative</h3>
<p>An <strong>absolute path</strong> starts from the very top and works
anywhere: <code>C:\\Users\\Ada\\projects\\site\\style.css</code>.</p>

<p>A <strong>relative path</strong> starts from where you already are. If you are
in <code>site</code>, then <code>style.css</code> means the one right here, and
<code>../notes.txt</code> means go up one folder and look there.</p>

<p><code>..</code> means "the folder above this one". You will type it a great
deal.</p>

<h3>Extensions are a promise, not a fact</h3>
<p>The bit after the dot tells the computer what kind of file it is:
<code>.html</code>, <code>.py</code>, <code>.jpg</code>. But renaming
<code>photo.jpg</code> to <code>photo.py</code> does not turn a picture into a
program. The extension is a label, and labels can lie — which is exactly how
some viruses arrive.</p>

<div class="not-prose my-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
<p class="m-0"><strong>Turn extensions on. Today.</strong> Windows hides them by
default, so <code>invoice.pdf.exe</code> shows as <code>invoice.pdf</code>. In
File Explorer: <strong>View → Show → File name extensions</strong>. This is a
security setting as much as a convenience.</p>
</div>

<h3>Name files like a developer</h3>
<ul>
<li><strong>No spaces.</strong> Use <code>my-site</code>, not <code>my site</code>. Spaces need quoting in the terminal and break URLs.</li>
<li><strong>Lower case.</strong> Linux servers treat <code>Index.html</code> and <code>index.html</code> as different files. Your laptop may not. Your server will.</li>
<li><strong>Dashes, not underscores</strong>, for anything that becomes a web address.</li>
<li><strong>No "final".</strong> <code>report-final-FINAL-v2.docx</code> is how you lose an afternoon. Section 3 teaches the real answer.</li>
</ul>

<div class="not-prose my-4 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-800 dark:bg-sky-950">
<p class="m-0"><strong>Try it yourself.</strong> Make a folder called
<code>projects</code> somewhere you will remember — not Downloads. Everything you
build in this course goes in it. Lesson 2.7 explains why that one decision saves
you hours later.</p>
</div>
""",
        },
        {
            "title": "Getting online: wifi, data, IP addresses and DNS",
            "duration_minutes": 7,
            "html": """
<p>The internet is not a cloud. It is cables, radio waves and a very large number
of machines agreeing on how to pass messages.</p>

<h3>Your device gets an address</h3>
<p>Every device online has an <strong>IP address</strong> — a number that says
where to send replies. Yours looks something like
<code>192.168.1.5</code> on your home network, or
<code>102.89.23.14</code> as the wider internet sees you.</p>

<p>Two kinds matter:</p>
<ul>
<li><strong>Private</strong> — your address inside your own network. Your phone and laptop each have one. They start <code>192.168.</code> or <code>10.</code>.</li>
<li><strong>Public</strong> — the single address your whole household shares, given by MTN, Airtel, Glo or your fibre provider.</li>
</ul>

<h3>DNS — the phone book</h3>
<p>Nobody remembers <code>142.250.185.78</code>. So when you type
<code>google.com</code>, your device asks a <strong>DNS server</strong>: "what is
the IP address for this name?" The DNS server answers, and only then does the
real conversation start.</p>

<p>Every web address you have ever typed went through this lookup first. It takes
a few thousandths of a second, and when it fails you get
<em>"server not found"</em> — which usually means DNS could not answer, not that
the site is down.</p>

<div class="not-prose my-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-800 dark:bg-emerald-950">
<p class="m-0"><strong>A trick worth knowing.</strong> When a site will not load
for you but works for everyone else, changing your DNS to Cloudflare
(<code>1.1.1.1</code>) or Google (<code>8.8.8.8</code>) fixes it surprisingly
often, especially on Nigerian mobile networks.</p>
</div>

<h3>Wifi and mobile data are just roads</h3>
<p>They carry the same traffic; they differ in cost, speed and reliability. What
matters for you as a developer:</p>

<ul>
<li><strong>Latency</strong> — how long a single message takes to make the round trip. Mobile data has higher latency than fibre.</li>
<li><strong>Bandwidth</strong> — how much you can move at once.</li>
<li><strong>Data cost</strong> — real money, and the reason a 6 MB homepage is a genuine failure for Nigerian users.</li>
</ul>

<p>Build as though your user is on mobile data with two bars. Many of them are.</p>

<div class="not-prose my-4 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-800 dark:bg-sky-950">
<p class="m-0"><strong>Try it yourself.</strong> Search "what is my IP" and note
the number. Then turn wifi off and use mobile data, and check again. Different
road, different address.</p>
</div>
""",
        },
        {
            "title": "What happens when you type a web address",
            "duration_minutes": 8,
            "is_previewable": True,
            "html": """
<p>This is the single most useful thing in this section, and a real interview
question. Between pressing Enter and seeing the page, seven things happen.</p>

<h3>1. The browser reads the address</h3>
<pre><code>https://mooreskillup.com/courses

https://          the protocol — how to talk
mooreskillup.com  the domain — who to talk to
/courses          the path — what you want</code></pre>

<h3>2. DNS turns the name into a number</h3>
<p>The browser asks for the IP address behind <code>mooreskillup.com</code>. If
it asked recently, it remembers and skips this.</p>

<h3>3. It opens a connection</h3>
<p>Your machine and the server agree to talk — a short back-and-forth called a
handshake. With <code>https</code> there is a second handshake that sets up
encryption, so nobody between you can read what follows.</p>

<h3>4. The browser asks for the page</h3>
<pre><code>GET /courses HTTP/1.1
Host: mooreskillup.com</code></pre>
<p>That is an HTTP request. It is genuinely that plain.</p>

<h3>5. The server decides what to send</h3>
<p>It might read a file from disk. It might ask a database which courses exist
and build the page. This is the part you will eventually write.</p>

<h3>6. The response comes back</h3>
<pre><code>HTTP/1.1 200 OK
Content-Type: text/html

&lt;!DOCTYPE html&gt;...</code></pre>
<p><code>200</code> means fine. You have met <code>404</code> — not found. You
will meet <code>500</code> often: the server broke.</p>

<h3>7. The browser builds the page</h3>
<p>It reads the HTML, finds it needs CSS, images and JavaScript, and asks for
each of those too — often thirty or more extra requests. Then it draws.</p>

<div class="not-prose my-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
<p class="m-0"><strong>Why this matters.</strong> Every one of those requests
costs time and data. This is why a slow site is usually not a slow server — it is
a site asking for too many things.</p>
</div>

<div class="not-prose my-4 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-800 dark:bg-sky-950">
<p class="m-0"><strong>Try it yourself.</strong> Press <kbd>F12</kbd> in Chrome,
open the <strong>Network</strong> tab, and reload this page. Every row is one
request. Look at the first one — that is the HTML. Everything under it is what the
HTML asked for.</p>
</div>
""",
        },
        {
            "title": "Client, server, and what \u201cthe cloud\u201d really is",
            "duration_minutes": 7,
            "html": """
<h3>Client and server is just a conversation</h3>
<p>The <strong>client</strong> asks. The <strong>server</strong> answers. Your
browser is a client. Your phone's banking app is a client. The machine that holds
the data and replies is the server.</p>

<p>That is the whole idea. Everything else is detail about what is said and how
fast.</p>

<h3>A server is a computer that does not sleep</h3>
<p>A server is not a special species of machine. It is an ordinary computer that
is always on, connected to the internet, and running a program that waits for
requests.</p>

<p>Your own laptop can be a server. In section 2 you will run one on it.</p>

<h3>So what is "the cloud"?</h3>
<p>Somebody else's computer, rented by the hour.</p>

<p>That is not a joke. When a company uses AWS, Azure or Google Cloud, they are
renting machines in a building somewhere rather than buying their own and putting
them in a cupboard. MooreSkillUp itself runs this way.</p>

<table>
<thead><tr><th></th><th>Your own server</th><th>The cloud</th></tr></thead>
<tbody>
<tr><td>Up-front cost</td><td>High — you buy it</td><td>None</td></tr>
<tr><td>If it breaks</td><td>You fix it</td><td>They fix it</td></tr>
<tr><td>Busy day</td><td>You buy more</td><td>It grows, you pay more</td></tr>
<tr><td>Quiet month</td><td>You still own it</td><td>You pay less</td></tr>
</tbody>
</table>

<h3>Frontend and backend</h3>
<p>Now these words mean something:</p>
<ul>
<li><strong>Frontend</strong> — what runs on the client. What the user sees and touches.</li>
<li><strong>Backend</strong> — what runs on the server. Data, rules, who is allowed to do what.</li>
</ul>

<p>When you sign in here, the frontend collects your email and password and the
backend decides whether they are right. The decision must happen on the server,
because anything on the client can be tampered with by the person holding it.</p>

<div class="not-prose my-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
<p class="m-0"><strong>A rule to carry with you.</strong> Never trust the client.
Check it on the server. A very large share of real security holes are one team
forgetting this.</p>
</div>
""",
        },
        {
            "title": "HTTP in plain words",
            "duration_minutes": 6,
            "html": """
<p>HTTP is the language clients and servers speak. It has a small vocabulary, and
knowing it makes error messages readable.</p>

<h3>The verbs</h3>
<table>
<thead><tr><th>Verb</th><th>Means</th><th>Example</th></tr></thead>
<tbody>
<tr><td><code>GET</code></td><td>Give me something</td><td>Open a course page</td></tr>
<tr><td><code>POST</code></td><td>Here is something new</td><td>Create an account</td></tr>
<tr><td><code>PUT</code> / <code>PATCH</code></td><td>Change something</td><td>Edit your profile</td></tr>
<tr><td><code>DELETE</code></td><td>Remove something</td><td>Delete a draft</td></tr>
</tbody>
</table>

<p>A <code>GET</code> should never change anything. If clicking a link deleted
your account, that would be a bug — and once upon a time, on some sites, it was.</p>

<h3>The numbers</h3>
<p>Every response carries a status code. The first digit tells you who to blame.</p>

<table>
<thead><tr><th>Range</th><th>Meaning</th><th>You will meet</th></tr></thead>
<tbody>
<tr><td><code>2xx</code></td><td>Fine</td><td><code>200 OK</code>, <code>201 Created</code></td></tr>
<tr><td><code>3xx</code></td><td>It moved</td><td><code>301</code>, <code>302</code></td></tr>
<tr><td><code>4xx</code></td><td><strong>You</strong> got it wrong</td><td><code>400</code>, <code>401</code>, <code>403</code>, <code>404</code></td></tr>
<tr><td><code>5xx</code></td><td><strong>The server</strong> got it wrong</td><td><code>500</code>, <code>503</code></td></tr>
</tbody>
</table>

<p>Three worth telling apart, because beginners confuse them constantly:</p>
<ul>
<li><code>401 Unauthorized</code> — <em>we do not know who you are.</em> Sign in.</li>
<li><code>403 Forbidden</code> — <em>we know who you are, and you may not.</em></li>
<li><code>404 Not Found</code> — <em>there is nothing here.</em> Usually a typo in the address.</li>
</ul>

<h3>Headers carry the extras</h3>
<p>Alongside the request and response travel <strong>headers</strong>: small
labelled facts. <code>Content-Type</code> says what kind of thing is being sent.
<code>Authorization</code> carries proof of who you are. <code>Cookie</code>
carries what the site remembered about you.</p>

<div class="not-prose my-4 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-800 dark:bg-sky-950">
<p class="m-0"><strong>Try it yourself.</strong> <kbd>F12</kbd> → Network →
reload → click any row → <strong>Headers</strong>. You are looking at the real
conversation your browser just had. Nothing is hidden from you here.</p>
</div>
""",
        },
        {
            "title": "What an API is, using a real one",
            "duration_minutes": 8,
            "html": """
<p>API stands for Application Programming Interface, which explains nothing.</p>

<p>Here is what it is: <strong>a way for one program to ask another program for
something, without either knowing how the other works inside.</strong></p>

<h3>The restaurant, but properly</h3>
<p>You order from a menu. The waiter takes it to a kitchen you cannot see and
brings food back. You do not need to know the recipe; the kitchen does not need
to know your name.</p>

<p>The menu is the API. It lists what you may ask for and what you get back.</p>

<h3>A real one you can try now</h3>
<p>Open this in a new tab:</p>

<pre><code>https://api.github.com/users/torvalds</code></pre>

<p>What comes back is <strong>JSON</strong> — the format nearly every API uses:</p>

<pre><code>{
  "login": "torvalds",
  "name": "Linus Torvalds",
  "public_repos": 7,
  "followers": 230000
}</code></pre>

<p>Curly braces hold a set of <code>"name": value</code> pairs. Square brackets
hold a list. That is essentially all of JSON, and you will read it every day for
the rest of your career.</p>

<div class="not-prose my-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-800 dark:bg-emerald-950">
<p class="m-0"><strong>You just used an API.</strong> No code required. A browser
is a client, GitHub's server answered, and you read the response. Change
<code>torvalds</code> to your own GitHub username once you have one.</p>
</div>

<h3>Why everything is built this way</h3>
<p>Because it lets separate things work together without being welded to one
another:</p>

<ul>
<li>Paystack's API takes payments, so MooreSkillUp never touches your card number</li>
<li>A weather app has no weather station — it asks an API</li>
<li>"Sign in with Google" is your app asking Google's API who you are</li>
<li>This platform's own app talks to its own API. They are separate programs</li>
</ul>

<h3>The words you will hear</h3>
<ul>
<li><strong>Endpoint</strong> — one address you can ask, like <code>/users/torvalds</code></li>
<li><strong>Request</strong> and <strong>response</strong> — the question and the answer</li>
<li><strong>API key</strong> — a password proving your program may ask. <em>Never put one in code you publish.</em> Section 4 returns to this</li>
<li><strong>Rate limit</strong> — how often you may ask before being told to slow down</li>
</ul>

<div class="not-prose my-4 rounded-lg border border-sky-300 bg-sky-50 p-4 text-sm dark:border-sky-800 dark:bg-sky-950">
<p class="m-0"><strong>Try it yourself.</strong> Open
<code>https://api.github.com/users/torvalds/repos</code>. Square brackets now —
a list of repositories. Find the <code>"name"</code> of the first one.</p>
</div>
""",
        },
        {
            "title": "Website, web app, mobile app: the difference",
            "duration_minutes": 3,
            "html": """
<p>People use these words loosely. The differences are real and they decide what
you learn next.</p>

<table>
<thead><tr><th></th><th>What it is</th><th>Example</th></tr></thead>
<tbody>
<tr><td><strong>Website</strong></td><td>Pages you read. Mostly the same for everyone</td><td>A company's About page</td></tr>
<tr><td><strong>Web app</strong></td><td>A program in the browser. You sign in and do things</td><td>MooreSkillUp, Gmail</td></tr>
<tr><td><strong>Mobile app</strong></td><td>Installed on the phone, from a store</td><td>WhatsApp, your bank</td></tr>
<tr><td><strong>PWA</strong></td><td>A web app that installs like a mobile one</td><td>MooreSkillUp, again</td></tr>
</tbody>
</table>

<h3>The line is blurry, and that is fine</h3>
<p>A site can be both: mooreskillup.com is a website; app.mooreskillup.com is a
web app. Same brand, different jobs.</p>

<h3>What it means for your learning</h3>
<ul>
<li>Want to build <strong>websites and web apps</strong>? Start with HTML, CSS and JavaScript.</li>
<li>Want <strong>mobile apps</strong>? Either React Native and Flutter — one codebase, both phones — or Kotlin for Android and Swift for iPhone.</li>
<li>Want the <strong>part behind</strong> all of them? That is backend: Python, Node, databases.</li>
</ul>

<p>Section 5 goes into each of these properly. For now, just know they are
different jobs, and that most people start with the web because you can see what
you built immediately.</p>

<div class="not-prose my-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-800 dark:bg-emerald-950">
<p class="m-0"><strong>You are using a PWA right now.</strong> On your phone,
open MooreSkillUp in the browser and choose <strong>Add to Home Screen</strong>.
It gets an icon and opens without the browser bar — a web app, installed.</p>
</div>
""",
        },
        {
            "title": "Go deeper — how technology works",
            "duration_minutes": 2,
            "content_type": "resource",
            "html": """
<p>Optional. Nothing here is needed to pass the quiz — these are for when
something in this section caught your interest and you want more.</p>

<h3>Watch</h3>
<ul>
<li><strong>How the Internet Works in 5 Minutes</strong> — the physical cables and routing, in plain language.</li>
<li><strong>What happens when you type a URL</strong> — the same seven steps as lesson 1.4, drawn out.</li>
</ul>

<h3>Read</h3>
<ul>
<li><strong>MDN: An overview of HTTP</strong> — the reference you will come back to for years. Bookmark it.</li>
<li><strong>Cloudflare Learning Center: What is DNS?</strong> — clear diagrams, no marketing.</li>
<li><strong>HTTP Cats</strong> — every status code as a photograph of a cat. Genuinely the fastest way to remember them.</li>
</ul>

<h3>Play</h3>
<ul>
<li>Open <kbd>F12</kbd> on any site you use daily and watch the Network tab while it loads. Do this a few times and the seven steps stop being theory.</li>
<li>Try three more GitHub API endpoints and read the JSON.</li>
</ul>

<div class="not-prose my-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950">
<p class="m-0"><strong>Do not let this become the course.</strong> Watching
explanations feels like progress and is not. One resource, then back to section 2
and actually set your machine up.</p>
</div>
""",
        },
    ],
    "quiz": {
        "title": "Section 1 quiz — How technology works",
        "description": "Eight questions. Pass with six.",
        "pass_mark_percent": 70,
        "questions": [
            {
                "text": "Your laptop slows to a crawl with many browser tabs open. Which part is most likely the limit?",
                "explanation": (
                    "RAM holds what is in use right now. Too many tabs fills it, and the machine "
                    "starts shuffling data to much slower storage."
                ),
                "choices": [
                    ("RAM", True),
                    ("Storage", False),
                    ("The operating system", False),
                    ("Your internet connection", False),
                ],
            },
            {
                "text": "What does <code>..</code> mean in a file path?",
                "explanation": "It means the folder one level above the current one.",
                "choices": [
                    ("The folder above this one", True),
                    ("The top of the drive", False),
                    ("A hidden file", False),
                    ("The current folder", False),
                ],
            },
            {
                "text": "You type a web address and the browser says \u201cserver not found\u201d. What failed first?",
                "explanation": (
                    "The name has to be turned into an IP address before anything else happens. "
                    "That is DNS, and it is the usual cause of this message."
                ),
                "choices": [
                    ("The DNS lookup", True),
                    ("The server crashed", False),
                    ("The HTML failed to render", False),
                    ("Your password was wrong", False),
                ],
            },
            {
                "text": "A request returns <code>403 Forbidden</code>. What does that tell you?",
                "explanation": (
                    "403 means you are known and still not allowed. 401 is the one that means "
                    "sign in first."
                ),
                "choices": [
                    ("The server knows who you are and you are not allowed", True),
                    ("You need to sign in", False),
                    ("The page does not exist", False),
                    ("The server crashed", False),
                ],
            },
            {
                "text": "Which HTTP verb should never change anything on the server?",
                "explanation": "GET asks for something. A GET that deletes data is a bug.",
                "choices": [
                    ("GET", True),
                    ("POST", False),
                    ("PATCH", False),
                    ("DELETE", False),
                ],
            },
            {
                "text": "What is \u201cthe cloud\u201d, honestly?",
                "explanation": (
                    "Somebody else's computers, rented rather than owned. Useful, and not magic."
                ),
                "choices": [
                    ("Computers somebody else owns, rented by the hour", True),
                    ("Storage that exists on the internet itself", False),
                    ("A network with no physical hardware", False),
                    ("Another word for the internet", False),
                ],
            },
            {
                "text": "Where must a decision about whether someone may do something be made?",
                "explanation": (
                    "Anything on the client can be changed by the person holding it. The server "
                    "decides. This one rule prevents a lot of real security holes."
                ),
                "choices": [
                    ("On the server", True),
                    ("On the client", False),
                    ("In the DNS record", False),
                    ("In the browser's headers", False),
                ],
            },
            {
                "text": "You open an API address and see <code>[</code> at the start of the response. What does that mean?",
                "explanation": "Square brackets hold a list. Curly braces hold one object.",
                "choices": [
                    ("A list of several items", True),
                    ("A single item", False),
                    ("An error", False),
                    ("An empty response", False),
                ],
            },
        ],
    },
}
