"use client";

import { useState, type FormEvent } from "react";
import { Megaphone, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { Textarea } from "@/components/ui/textarea";
import { useFeedback } from "@/lib/feedback";
import { useTeacherPlatform } from "@/lib/teacher-platform";

export default function TeacherAnnouncementsPage() {
  const { notifyError, notifySuccess } = useFeedback();
  const { announcementsEnabled, sendAnnouncement, teacherCourses, isLoading } = useTeacherPlatform();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [sending, setSending] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSending(true);
    try {
      const result = await sendAnnouncement({
        title: title.trim(),
        description: description.trim(),
        courseId: courseId || undefined,
      });
      notifySuccess("Announcement sent", `Delivered to ${result.recipients} student(s).`);
      setTitle("");
      setDescription("");
    } catch (error) {
      notifyError("Unable to send", error instanceof Error ? error.message : "Request failed.");
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell allowedRoles={["teacher"]}>
      <div className="space-y-6">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Announcements</div>
          <h1 className="mt-2 font-display text-4xl font-bold">Message your students</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Send an in-app notification to students enrolled in your courses.
          </p>
        </div>

        {!announcementsEnabled ? (
          <div className="rounded-[2rem] border border-border bg-card p-8 text-center shadow-sm">
            <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 font-display text-2xl font-bold">Announcements are turned off</h2>
            <p className="mt-2 text-muted-foreground">
              An admin controls this. Ask them to enable teacher announcements in platform settings.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="max-w-2xl space-y-4 rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-bold">New announcement</h2>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Send to</label>
              <select
                value={courseId}
                onChange={(event) => setCourseId(event.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm"
              >
                <option value="">All my students (every course)</option>
                {teacherCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title || "Untitled course"}
                  </option>
                ))}
              </select>
            </div>

            <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} required />
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Message</label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-28 bg-background"
                placeholder="What do you want your students to know?"
              />
            </div>

            <Button
              type="submit"
              variant="accent"
              disabled={isLoading || !title.trim() || !description.trim()}
              loading={sending}
              loadingText="Sending..."
            >
              <Megaphone className="h-4 w-4" />
              Send announcement
            </Button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
