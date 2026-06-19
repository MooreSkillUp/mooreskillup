"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, PencilLine, Plus, Sparkles, Star, ThumbsUp, Trash2, Users } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";
import { useAdminPlatform } from "@/lib/admin-platform";

export default function AdminCoursesPage() {
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const {
    categories,
    courses,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
    updateCourseCatalog,
    deleteCourse,
    abortCourseDeletion,
    isLoading,
    error,
  } = useAdminPlatform();
  const canDelete = user?.permissions?.includes("courses:delete") ?? false;
  const [busyCourseId, setBusyCourseId] = useState<string | null>(null);

  const deletionRequests = useMemo(() => courses.filter((course) => course.pendingDeletion), [courses]);

  const approveDeletion = async (courseId: string, title: string) => {
    if (!window.confirm(`Permanently delete "${title}"? This cannot be undone.`)) return;
    setBusyCourseId(courseId);
    try {
      await deleteCourse(courseId);
      notifySuccess("Course deleted");
    } catch (e) {
      notifyError("Delete failed", e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusyCourseId(null);
    }
  };

  const abortDeletion = async (courseId: string) => {
    setBusyCourseId(courseId);
    try {
      await abortCourseDeletion(courseId);
      notifySuccess("Deletion aborted", "The course stays live and the teacher was notified.");
    } catch (e) {
      notifyError("Abort failed", e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusyCourseId(null);
    }
  };
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryByCategory, setNewSubcategoryByCategory] = useState<Record<string, string>>({});
  const [courseSearch, setCourseSearch] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("all");
  const [selectedTrackId, setSelectedTrackId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedTeacherId, setSelectedTeacherId] = useState("all");
  const [communityDrafts, setCommunityDrafts] = useState<Record<string, { url: string; label: string }>>({});

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [categories],
  );

  const teacherOptions = useMemo(() => {
    const map = new Map<string, string>();
    courses.forEach((course) => {
      if (course.ownerType === "teacher" && course.teacherId && course.teacherName) {
        map.set(course.teacherId, course.teacherName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [courses]);

  const reorderCategory = async (categoryId: string, direction: "up" | "down") => {
    const index = sortedCategories.findIndex((category) => category.id === categoryId);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapIndex < 0 || swapIndex >= sortedCategories.length) return;
    const current = sortedCategories[index];
    const neighbour = sortedCategories[swapIndex];
    const currentOrder = current.displayOrder ?? index;
    const neighbourOrder = neighbour.displayOrder ?? swapIndex;
    try {
      await Promise.all([
        updateCategory(current.id, { displayOrder: neighbourOrder }),
        updateCategory(neighbour.id, { displayOrder: currentOrder }),
      ]);
    } catch (e) {
      notifyError("Reorder failed", e instanceof Error ? e.message : "Request failed.");
    }
  };

  const saveCommunity = async (categoryId: string) => {
    const draft = communityDrafts[categoryId];
    if (!draft) return;
    try {
      await updateCategory(categoryId, { communityUrl: draft.url.trim(), communityLabel: draft.label.trim() });
      notifySuccess("Community link saved", "Students on this program will see the join link.");
    } catch (e) {
      notifyError("Could not save community link", e instanceof Error ? e.message : "Request failed.");
    }
  };

  const toggleRecommended = async (courseId: string, next: boolean) => {
    try {
      await updateCourseCatalog(courseId, { isRecommended: next });
    } catch (e) {
      notifyError("Update failed", e instanceof Error ? e.message : "Request failed.");
    }
  };

  const featuredCourses = useMemo(() => courses.filter((course) => course.featured), [courses]);
  const totalTracks = useMemo(
    () => categories.reduce((sum, category) => sum + category.subcategories.length, 0),
    [categories],
  );
  const trackOptions = useMemo(() => {
    if (selectedProgramId === "all") {
      return categories.flatMap((category) =>
        category.subcategories.map((subcategory) => ({
          id: subcategory.id,
          name: subcategory.name,
          categoryName: category.name,
        })),
      );
    }

    const selectedCategory = categories.find((category) => category.id === selectedProgramId);
    return (selectedCategory?.subcategories ?? []).map((subcategory) => ({
      id: subcategory.id,
      name: subcategory.name,
      categoryName: selectedCategory?.name ?? "",
    }));
  }, [categories, selectedProgramId]);
  const filteredCourses = useMemo(() => {
    const query = courseSearch.trim().toLowerCase();

    return courses.filter((course) => {
      const matchesSearch =
        !query ||
        [course.title, course.teacherName, course.program, course.track]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));
      const matchesProgram = selectedProgramId === "all" || course.categoryId === selectedProgramId;
      const matchesTrack = selectedTrackId === "all" || course.subcategoryId === selectedTrackId;
      const matchesStatus = selectedStatus === "all" || course.status === selectedStatus;
      const matchesTeacher =
        selectedTeacherId === "all" ||
        (selectedTeacherId === "admin" ? course.ownerType === "admin" : course.teacherId === selectedTeacherId);
      return matchesSearch && matchesProgram && matchesTrack && matchesStatus && matchesTeacher;
    });
  }, [courseSearch, courses, selectedProgramId, selectedTrackId, selectedStatus, selectedTeacherId]);

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
            Course structure
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold">Admin courses configuration</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            This area is only for platform structure: programs, tracks, course organization rules, and featured course setup. Admin-owned course editing lives in its own module.
          </p>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {[
            { label: "Programs", value: `${categories.length}` },
            { label: "Tracks", value: `${totalTracks}` },
            { label: "Featured courses", value: `${featuredCourses.length}` },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</div>
              <div className="mt-2 font-display text-3xl font-bold">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div>
              <h2 className="font-display text-2xl font-bold">Programs and tracks</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Programs are the top-level course categories. Tracks are the specializations beneath each program.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  className="h-11 rounded-lg border border-input bg-card px-3.5 text-sm text-foreground shadow-sm outline-none"
                  placeholder="Program name"
                />
                <Button
                  variant="accent"
                  onClick={() => {
                    if (!newCategoryName.trim()) return;
                    void addCategory({ name: newCategoryName.trim() });
                    setNewCategoryName("");
                  }}
                >
                  <Plus className="h-4 w-4" /> Add Program
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {sortedCategories.map((category, categoryIndex) => (
                <div key={category.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            disabled={categoryIndex === 0}
                            onClick={() => void reorderCategory(category.id, "up")}
                            className="text-muted-foreground disabled:opacity-30"
                            aria-label="Move program up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={categoryIndex === sortedCategories.length - 1}
                            onClick={() => void reorderCategory(category.id, "down")}
                            className="text-muted-foreground disabled:opacity-30"
                            aria-label="Move program down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="font-display text-xl font-bold">{category.name}</div>
                      </div>
                      <div className="mt-3 space-y-2">
                        {category.subcategories.length ? (
                          category.subcategories.map((subcategory) => (
                            <div
                              key={subcategory.id}
                              className="flex items-center justify-between rounded-2xl border border-border bg-card px-3 py-2"
                            >
                              <div className="text-sm text-muted-foreground">{subcategory.name}</div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextName = window.prompt("Edit track name", subcategory.name);
                                    if (nextName?.trim()) {
                                      void updateSubcategory({
                                        categoryId: category.id,
                                        subcategoryId: subcategory.id,
                                        name: nextName.trim(),
                                      });
                                    }
                                  }}
                                  className="text-xs font-semibold uppercase tracking-[0.2em] text-primary"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void deleteSubcategory({
                                      categoryId: category.id,
                                      subcategoryId: subcategory.id,
                                    })
                                  }
                                  className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                            No tracks yet.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const nextName = window.prompt("Edit program name", category.name);
                          if (nextName?.trim()) void updateCategory(category.id, { name: nextName.trim() });
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                      >
                        <PencilLine className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteCategory(category.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                    <input
                      value={newSubcategoryByCategory[category.id] ?? ""}
                      onChange={(event) =>
                        setNewSubcategoryByCategory((current) => ({
                          ...current,
                          [category.id]: event.target.value,
                        }))
                      }
                      className="h-11 rounded-lg border border-input bg-card px-3.5 text-sm text-foreground shadow-sm outline-none"
                      placeholder={`Add track under ${category.name}`}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        const value = newSubcategoryByCategory[category.id]?.trim();
                        if (!value) return;
                        void addSubcategory({ categoryId: category.id, name: value });
                        setNewSubcategoryByCategory((current) => ({ ...current, [category.id]: "" }));
                      }}
                    >
                      <Plus className="h-4 w-4" /> Add Track
                    </Button>
                  </div>

                  <div className="mt-4 rounded-2xl border border-border bg-card p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                      <Users className="h-3.5 w-3.5" /> Community link
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Students in {category.name} see a &quot;Join community&quot; link on their dashboard and settings.
                    </p>
                    <div className="mt-3 grid gap-2 md:grid-cols-[0.7fr_1.3fr]">
                      <input
                        value={communityDrafts[category.id]?.label ?? category.communityLabel ?? ""}
                        onChange={(event) =>
                          setCommunityDrafts((current) => ({
                            ...current,
                            [category.id]: {
                              url: current[category.id]?.url ?? category.communityUrl ?? "",
                              label: event.target.value,
                            },
                          }))
                        }
                        className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                        placeholder="Label (WhatsApp, Discord)"
                      />
                      <input
                        value={communityDrafts[category.id]?.url ?? category.communityUrl ?? ""}
                        onChange={(event) =>
                          setCommunityDrafts((current) => ({
                            ...current,
                            [category.id]: {
                              label: current[category.id]?.label ?? category.communityLabel ?? "",
                              url: event.target.value,
                            },
                          }))
                        }
                        className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                        placeholder="https://chat.whatsapp.com/..."
                      />
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => void saveCommunity(category.id)}>
                        Save community link
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div>
              <h2 className="font-display text-2xl font-bold">Organization and featured setup</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep the global course catalog organized and decide which courses receive featured placement on the platform.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                  <Sparkles className="h-4 w-4" />
                  Course organization
                </div>
                <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                  <div className="rounded-2xl bg-card p-3">
                    Every course inherits its program and track from the teacher assignment or existing admin-owned course mapping.
                  </div>
                  <div className="rounded-2xl bg-card p-3">
                    Admin-owned course editing is isolated from this page so platform structure and owned content do not collide.
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                  <Star className="h-4 w-4" />
                  Featured configuration
                </div>
                <div className="mt-3 text-sm text-muted-foreground">
                  Featured courses remain learner-visible highlights. Toggle them below without moving ownership or editing content.
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid gap-4 rounded-2xl border border-border bg-background p-4 sm:grid-cols-2 lg:grid-cols-3">
                <Input
                  label="Search courses"
                  value={courseSearch}
                  onChange={(event) => setCourseSearch(event.target.value)}
                  placeholder="Search by title, teacher, program, or track"
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Program</label>
                  <select
                    value={selectedProgramId}
                    onChange={(event) => {
                      setSelectedProgramId(event.target.value);
                      setSelectedTrackId("all");
                    }}
                    className="h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm"
                  >
                    <option value="all">All programs</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Track</label>
                  <select
                    value={selectedTrackId}
                    onChange={(event) => setSelectedTrackId(event.target.value)}
                    className="h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm"
                  >
                    <option value="all">All tracks</option>
                    {trackOptions.map((track) => (
                      <option key={track.id} value={track.id}>
                        {track.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(event) => setSelectedStatus(event.target.value)}
                    className="h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm"
                  >
                    <option value="all">All statuses</option>
                    <option value="published">Published</option>
                    <option value="review">In review</option>
                    <option value="draft">Draft</option>
                    <option value="declined">Declined</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Owner</label>
                  <select
                    value={selectedTeacherId}
                    onChange={(event) => setSelectedTeacherId(event.target.value)}
                    className="h-11 w-full rounded-lg border border-input bg-card px-3.5 text-sm"
                  >
                    <option value="all">All owners</option>
                    <option value="admin">Admin-owned</option>
                    {teacherOptions.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {deletionRequests.length > 0 && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-100">
                  <strong>{deletionRequests.length}</strong> course
                  {deletionRequests.length === 1 ? "" : "s"} awaiting your deletion decision below
                  (Delete to approve, or Abort to keep it).
                </div>
              )}

              {filteredCourses.length ? (
                filteredCourses.map((course) => (
                  <div key={course.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2 font-medium">
                          {course.title}
                          {course.pendingDeletion && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-500/15 dark:text-amber-100">
                              Deletion requested
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {course.program} / {course.track} | {course.ownerType === "admin" ? "Admin-owned" : course.teacherName}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant={course.featured ? "accent" : "outline"}
                          size="sm"
                          onClick={() => void updateCourseCatalog(course.id, { featured: !course.featured })}
                          disabled={isLoading}
                        >
                          <Star className="h-4 w-4" />
                          {course.featured ? "Featured" : "Mark Featured"}
                        </Button>
                        <Button
                          variant={course.isRecommended ? "accent" : "outline"}
                          size="sm"
                          onClick={() => void toggleRecommended(course.id, !course.isRecommended)}
                          disabled={isLoading}
                        >
                          <ThumbsUp className="h-4 w-4" />
                          {course.isRecommended ? "Recommended" : "Recommend"}
                        </Button>
                        {course.pendingDeletion && (
                          <Button variant="outline" size="sm" loading={busyCourseId === course.id} onClick={() => void abortDeletion(course.id)}>
                            Abort
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            loading={busyCourseId === course.id}
                            onClick={() => void approveDeletion(course.id, course.title)}
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                  {isLoading ? "Loading course catalog..." : "No courses matched that filter yet."}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
