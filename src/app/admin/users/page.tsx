import { redirect } from "next/navigation";

// Teacher management lives in one place now. This route used to be a second,
// overlapping teacher screen; old links and bookmarks land on the real one.
export default function AdminUsersRedirect() {
  redirect("/admin/teachers");
}
