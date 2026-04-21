import { redirect } from "next/navigation";

// The (app) root redirects to /dashboard
export default function AppRoot() {
  redirect("/dashboard");
}
