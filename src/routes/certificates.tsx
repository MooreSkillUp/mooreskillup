import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Download, Award, Lock } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { courses } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth";
import { generateCertificatePdf } from "@/lib/certificate";

export const Route = createFileRoute("/certificates")({
  component: CertificatesPage,
});

function CertificatesPage() {
  const { user } = useAuth();

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="rounded-2xl bg-gradient-to-br from-primary via-primary-glow to-accent p-6 text-primary-foreground shadow-lg sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-white/80">
                Certificates
              </div>
              <h1 className="font-display text-3xl font-bold sm:text-4xl">Your accomplishments</h1>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-white/85">
            Download official certificates for the courses you've completed. Share them on LinkedIn, your résumé, or your portfolio.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {courses.map((course, i) => {
            const eligible = course.completedLessons === course.totalLessons;
            const certId = `MSU-${course.id.toUpperCase().slice(0, 6)}-${(user?.id ?? "00000").slice(-4)}`;
            const date = new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            });

            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
              >
                {/* Certificate preview */}
                <div className="relative aspect-[1.4/1] border-b border-border bg-white p-6">
                  <div className="absolute inset-3 rounded-lg border-[6px] border-primary/90">
                    <div className="absolute inset-2 border border-accent" />
                  </div>
                  <div className="relative flex h-full flex-col items-center justify-center text-center text-foreground">
                    <div className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                      MooreSkillUp
                    </div>
                    <div className="mt-2 font-display text-base font-bold text-primary sm:text-lg">
                      Certificate of Completion
                    </div>
                    <div className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                      Awarded to
                    </div>
                    <div className="mt-1 font-display text-lg font-bold sm:text-xl">
                      {user?.displayName ?? "Your name"}
                    </div>
                    <div className="mt-3 text-[10px] text-muted-foreground">for completing</div>
                    <div className="mt-0.5 text-sm font-semibold text-primary">"{course.title}"</div>
                  </div>
                  {!eligible && (
                    <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <Lock className="h-7 w-7 text-muted-foreground" />
                        <div className="text-sm font-semibold text-foreground">
                          Complete the course to unlock
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {course.completedLessons}/{course.totalLessons} lessons done
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-display text-base font-bold">{course.title}</div>
                    <div className="text-xs text-muted-foreground">by {course.instructor}</div>
                  </div>
                  <Button
                    variant={eligible ? "accent" : "outline"}
                    disabled={!eligible}
                    onClick={() =>
                      generateCertificatePdf({
                        recipientName: user?.displayName ?? "Learner",
                        courseTitle: course.title,
                        instructor: course.instructor,
                        date,
                        certId,
                      })
                    }
                  >
                    <Download className="h-4 w-4" />
                    {eligible ? "Download PDF" : "Locked"}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-5 text-sm text-muted-foreground">
          Tip: certificates also unlock automatically when you finish all the lessons for a course.{" "}
          <Link to="/courses" className="font-semibold text-primary hover:text-accent">
            See your courses →
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
