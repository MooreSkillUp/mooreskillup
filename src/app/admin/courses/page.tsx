"use client";

import { useMemo, useState } from "react";
import { PencilLine, Plus, Sparkles, Star, Trash2 } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { useAdminPlatform } from "@/lib/admin-platform";

export default function AdminCoursesPage() {
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
    isLoading,
    error,
  } = useAdminPlatform();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryByCategory, setNewSubcategoryByCategory] = useState<Record<string, string>>({});
  const [courseSearch, setCourseSearch] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("all");
  const [selectedTrackId, setSelectedTrackId] = useState("all");

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
      return matchesSearch && matchesProgram && matchesTrack;
    });
  }, [courseSearch, courses, selectedProgramId, selectedTrackId]);

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
              {categories.map((category) => (
                <div key={category.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="font-display text-xl font-bold">{category.name}</div>
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
              <div className="grid gap-4 rounded-2xl border border-border bg-background p-4 lg:grid-cols-[1.3fr_0.8fr_0.8fr]">
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
              </div>

              {filteredCourses.length ? (
                filteredCourses.map((course) => (
                  <div key={course.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="font-medium">{course.title}</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {course.program} / {course.track} | {course.ownerType === "admin" ? "Admin-owned" : course.teacherName}
                        </div>
                      </div>
                      <Button
                        variant={course.featured ? "accent" : "outline"}
                        onClick={() => void updateCourseCatalog(course.id, { featured: !course.featured })}
                        disabled={isLoading}
                      >
                        <Star className="h-4 w-4" />
                        {course.featured ? "Featured" : "Mark Featured"}
                      </Button>
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
