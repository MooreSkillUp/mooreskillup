# MooreSkillUp — test script

For testers. You don't need any technical knowledge: you're using the platform as a
student, a teacher or an admin would, and telling us where it disagrees with what
you expected.

**Please don't test on the live site with real money.** Use the test environment and
the test card below. Nothing here charges anyone.

---

## Before you start

| | |
|---|---|
| **Where** | The link you were sent (the test site, not the public one) |
| **Browser** | Whatever you normally use. Phone as well as laptop, if you can |
| **Your account** | Make your own — signing up is the first thing we want tested |
| **Time needed** | About 25 minutes per role |

If something breaks badly enough that you can't continue, skip to the next section
and note it. Don't spend more than a minute stuck.

---

## Part A — Student (everyone does this one)

1. **Sign up.** Use a real email address you can open. Pick a learning path.
   - *Expected:* a 6-digit code arrives by email within a minute; entering it signs you in.
   - Try getting it wrong on purpose: a bad code should say so clearly.
2. **First look.** You have no courses yet.
   - *Expected:* the dashboard says so plainly and points you at the catalog. It should
     not show invented numbers, streaks or progress.
3. **Browse.** Open Courses → All courses. Search for something. Filter by level and price.
   - *Expected:* results actually narrow. Free and paid are labelled clearly.
4. **Take a free course.** Open one, enrol, open the first lesson.
   - *Expected:* the lesson opens, the curriculum sidebar shows where you are, and
     "Complete & continue" moves you to the next lesson.
5. **Come back later.** Sign out, sign in again, reopen the course.
   - *Expected:* your progress is exactly where you left it — not reset to zero, and
     nothing you finished is locked again.
6. **Buy a course** (test card below — no real money).
   - *Expected:* Paystack's page opens, payment succeeds, you're returned to
     MooreSkillUp and the course is unlocked immediately.
7. **Finish a course that offers a certificate.**
   - *Expected:* the certificate appears under Certificates, with **your real name**
     on it, and the verification link works when opened in a private window.
8. **Ask for help.** Support → raise a ticket.
   - *Expected:* it tells you when to expect a reply, and the ticket appears in your list.
9. **Your account.** Settings → change your avatar and name.
   - *Expected:* it saves, and the new name shows in the header.

## Part B — Teacher

1. **Sign in** with the teacher account you were given.
2. **Create a course.** Title, description, a section, a couple of lessons.
   - *Expected:* nothing is lost when you move between steps or refresh.
3. **Preview it** as a student would see it.
4. **Submit for review.**
   - *Expected:* it moves to "In review" and you can't edit it into a published state yourself.
5. **After an admin declines it** (ask whoever is testing admin): open the course.
   - *Expected:* you can see **why** it was declined, and resubmit after fixing it.
6. **Your students.** Students → check the list and the last-active column.
   - *Expected:* someone who studied today is not shown as inactive.
7. **Analytics.** Check the numbers against what you know is true.
8. **Announcements.** Send one to your students (if enabled).

## Part C — Admin / Super Admin

1. **Dashboard.** Does the headline match reality — does anything actually need you?
2. **Course reviews.** Approve one, decline another **with a reason**.
   - *Expected:* declining without a reason is refused; the teacher can see the reason.
3. **Students.** Suspend one, then reactivate. Try deleting a student who has paid.
   - *Expected:* the delete is refused and explains why, and offers to suspend instead.
4. **Teachers.** Add one.
   - *Expected:* you're told whether the email actually went out. If it didn't, you get
     the password to pass on yourself.
5. **Admin team.** Change someone's rank, then their permissions.
   - *Expected:* rank changes ask first. You can't change your own.
6. **Payments.** Find a paid purchase, refund it with a reason.
   - *Expected:* the student loses the course, keeps their progress, and the refund
     shows who did it and why.
7. **Support.** Open a ticket, leave a **note for admins**, then send a **reply**.
   - *Expected:* the student sees the reply and **never** the note.
8. **Broadcasts.** Send an announcement to students.
   - *Expected:* it appears in a student's bell, and the history shows who sent it and
     how many people got it.
9. **Settings.** Turn maintenance mode on, check a student sees an explanation, turn it off.
10. **Activity logs.** Everything you just did should be listed, in plain language.

---

## Test card (no real money)

Paystack's published test card:

| | |
|---|---|
| Card number | `4084 0840 8408 4081` |
| Expiry | any future date, e.g. `12/30` |
| CVV | `408` |
| PIN | `0000` |
| OTP | `123456` |

If you're asked for a bank or transfer instead, choose **Card**.

---

## Telling us what you found

One report per problem. Copy this:

```
What I did:        (the steps, in order)
What I expected:   
What happened:     
Where:             (page address, and which account)
When:              (date and rough time — it helps us find it in the logs)
Phone or laptop:   
Screenshot:        (attach if you can)
```

**The most useful thing you can report** is anything the platform tells you that isn't
true: a number that looks wrong, a message that says something was sent when it
wasn't, a button that appears to do nothing. Those matter more than cosmetic issues —
though send those too.

---

## Known, already understood

Don't report these:

- Emails go nowhere until the mail key is set on the test site — you'll be told if that's
  still the case when you test.
- Achievements, Leaderboard and Quiz shop show "Coming soon": they're deliberately off.
- Course banner images are plain colour blocks until teachers upload artwork.
