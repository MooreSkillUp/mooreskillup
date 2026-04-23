import { redirect } from "next/navigation";

export default function TeacherRegisterRedirectPage() {
  redirect("/admin/teachers");
}
