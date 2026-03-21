import { auth } from "@/auth";
import { getUserByEmail } from "@/lib/users";
import { redirect } from "next/navigation";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/");

  const user = await getUserByEmail(email);
  if (!user) redirect("/");

  return (
    <main className="relative flex flex-1 flex-col">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-[var(--glow)] blur-3xl" />
        <div className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[var(--glow-2)] blur-3xl" />
      </div>
      <ProfileForm
        email={user.email}
        initialFirstName={user.firstName}
        initialLastName={user.lastName}
      />
    </main>
  );
}
