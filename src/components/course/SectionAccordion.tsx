"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, FolderGit2, PlayCircle, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionAccordion({
  sections,
  courseOwned,
  previewHrefBuilder,
}: {
  sections: Array<{
    id: string;
    title: string;
    lessons: Array<{
      id: string;
      title: string;
      type: string;
      isPreviewable?: boolean;
      isLocked?: boolean;
    }>;
    assignments?: Array<{ id: string; title: string }>;
    projects?: Array<{ id: string; title: string }>;
    isFree?: boolean;
    isLocked?: boolean;
    lessonCount?: number;
  }>;
  courseOwned?: boolean;
  previewHrefBuilder: (id: string) => string;
}) {
  const [openSections, setOpenSections] = useState<string[]>([]);

  return (
    <div className="space-y-3">
      {sections.map((section, index) => {
        const isOpen = openSections.includes(section.id);
        return (
          <div key={section.id} className="overflow-hidden rounded-[1.25rem] border border-border bg-card shadow-sm">
            <button
              type="button"
              onClick={() =>
                setOpenSections((curr) => (curr.includes(section.id) ? curr.filter((id) => id !== section.id) : [...curr, section.id]))
              }
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <PlayCircle className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">{section.title || `Section ${index + 1}`}</div>
                  <div className="text-xs text-muted-foreground">
                    {section.lessonCount ?? section.lessons.length} lessons · {section.isFree ? "Free preview" : "Structured learning"}
                  </div>
                </div>
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {isOpen ? (
              <div className="border-t border-border bg-background/70">
                {section.lessons.map((lesson) => {
                  const canPreview = courseOwned || !section.isLocked || lesson.isPreviewable || section.isFree;
                  return (
                    <div key={lesson.id} className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3 last:border-b-0">
                      <div className="flex items-center gap-3">
                        {lesson.type === "video" ? (
                          <PlayCircle className="h-4 w-4 text-primary" />
                        ) : lesson.type === "resource" ? (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ScrollText className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm text-foreground">{lesson.title || "Untitled lesson"}</span>
                      </div>
                      {canPreview ? (
                        <a href={previewHrefBuilder(lesson.id)} className="text-sm font-semibold text-primary">
                          {courseOwned ? "Open" : "Preview"}
                        </a>
                      ) : (
                        <div className="text-sm text-muted-foreground">Locked</div>
                      )}
                    </div>
                  );
                })}
                {section.assignments?.length ? (
                  <div className="px-5 py-3 text-sm text-muted-foreground">
                    {section.assignments.map((a) => (
                      <div key={a.id} className="flex items-center gap-2 py-1">
                        <FolderGit2 className="h-4 w-4" /> {a.title}
                      </div>
                    ))}
                  </div>
                ) : null}
                {section.projects?.length ? (
                  <div className="px-5 py-3 text-sm text-muted-foreground">
                    {section.projects.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 py-1">
                        <FileText className="h-4 w-4" /> {p.title}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
