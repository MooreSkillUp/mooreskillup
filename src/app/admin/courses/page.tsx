"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PencilLine, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { formatNaira } from "@/lib/commerce";
import { useAdminPlatform } from "@/lib/admin-platform";

type OwnerFilter = "all" | "admin";

export default function AdminCoursesPage() {
  const {
    categories,
    courses,
    teachers,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
    reassignCourse,
    isLoading,
    error,
  } = useAdminPlatform();
  const categoryList = useMemo(() => (Array.isArray(categories) ? categories : []), [categories]);
  const teacherList = useMemo(() => (Array.isArray(teachers) ? teachers : []), [teachers]);
  const courseList = useMemo(() => (Array.isArray(courses) ? courses : []), [courses]);

  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("all");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryByCategory, setNewSubcategoryByCategory] = useState<Record<string, string>>({});

  const selectedCategory =
    selectedCategoryId === "all"
      ? null
      : categoryList.find((category) => category.id === selectedCategoryId) ?? null;

  const visibleCourses = useMemo(
    () =>
      courseList.filter((course) => {
        if (!course) return false;
        if (ownerFilter === "admin" && course.teacherId !== "admin-owned") return false;
        if (selectedCategoryId !== "all" && course.categoryId !== selectedCategoryId) return false;
        if (selectedSubcategoryId !== "all" && course.subcategoryId !== selectedSubcategoryId) return false;
        return true;
      }),
    [courseList, ownerFilter, selectedCategoryId, selectedSubcategoryId],
  );

  const adminOwnedCourses = useMemo(
    () => courseList.filter((course) => course.teacherId === "admin-owned"),
    [courseList],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setOwnerFilter(params.get("owner") === "admin" ? "admin" : "all");
  }, []);

  const groupedCourses = useMemo(
    () =>
      visibleCourses.reduce<Record<string, typeof visibleCourses>>((acc, course) => {
        const key = `${course.categoryId}:${course.subcategoryId}`;
        acc[key] = [...(acc[key] ?? []), course];
        return acc;
      }, {}),
    [visibleCourses],
  );

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h1 className="font-display text-3xl font-bold">Admin courses management</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Manage category structure, keep admin-owned courses safe, and make course organization update everywhere instantly.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div>
              <h2 className="font-display text-2xl font-bold">Categories and subcategories</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a main category with only its name, then attach specializations beneath it.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  className="h-11 rounded-lg border border-input bg-card px-3.5 text-sm text-foreground shadow-sm outline-none"
                  placeholder="Category name"
                />
                <Button
                  variant="accent"
                  onClick={() => {
                    if (!newCategoryName.trim()) return;
                    addCategory({ name: newCategoryName.trim() });
                    setNewCategoryName("");
                  }}
                >
                  <Plus className="h-4 w-4" /> Add Category
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {categoryList.map((category) => (
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
                                    const nextName = window.prompt("Edit subcategory name", subcategory.name);
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
                            No subcategories yet.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const nextName = window.prompt("Edit category name", category.name);
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
                      placeholder={`Add subcategory under ${category.name}`}
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
                      <Plus className="h-4 w-4" /> Add Subcategory
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold">Course organization</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Filter by category, subcategory, and ownership without losing reassignment visibility.
                </p>
                {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "all", label: "All Courses" },
                  { id: "admin", label: "Admin-Owned Courses" },
                ].map((item) => {
                  const active = ownerFilter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setOwnerFilter(item.id as OwnerFilter)}
                      className={`rounded-full border px-4 py-2 text-sm transition ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={selectedCategoryId}
                onChange={(event) => {
                  setSelectedCategoryId(event.target.value);
                  setSelectedSubcategoryId("all");
                }}
                className="h-11 rounded-lg border border-input bg-background px-3.5 text-sm"
              >
                <option value="all">All categories</option>
                {categoryList.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedSubcategoryId}
                onChange={(event) => setSelectedSubcategoryId(event.target.value)}
                className="h-11 rounded-lg border border-input bg-background px-3.5 text-sm"
              >
                <option value="all">All subcategories</option>
                {(selectedCategory?.subcategories ?? categoryList.flatMap((category) => category.subcategories)).map(
                  (subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="font-medium">Admin-owned fallback</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {adminOwnedCourses.length} course{adminOwnedCourses.length === 1 ? "" : "s"} currently safe under admin ownership.
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(groupedCourses).length ? (
                Object.entries(groupedCourses).map(([key, courseGroup]) => (
                  <div key={key} className="rounded-2xl border border-border bg-background p-4">
                    <div className="font-display text-xl font-bold">
                      {courseGroup[0].categoryName} / {courseGroup[0].subcategoryName}
                    </div>
                    <div className="mt-3 space-y-3">
                      {courseGroup.map((course) => {
                        const owner = teacherList.find((teacher) => teacher.id === course.teacherId);
                        const ownerLabel = owner?.displayName ?? "Admin ownership";

                        return (
                          <div key={course.id} className="rounded-2xl border border-border bg-card p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <div className="font-medium">{course.title}</div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                  Owner: {ownerLabel} | {course.track} | {course.status} | {formatNaira(Number(course.price))}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Link href={`/teacher/courses/${course.id}/edit`}>
                                  <Button variant="outline">Edit</Button>
                                </Link>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    const selectedTeacherId = window.prompt(
                                      "Enter a teacher profile ID to reassign, or type admin-owned",
                                      course.teacherId ?? "admin-owned",
                                    );
                                    if (!selectedTeacherId?.trim()) return;
                                    void reassignCourse({
                                      courseId: course.id,
                                      newTeacherId: selectedTeacherId.trim(),
                                    });
                                  }}
                                >
                                  Reassign
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                  {isLoading ? "Loading courses..." : "No courses match the selected filters."}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
