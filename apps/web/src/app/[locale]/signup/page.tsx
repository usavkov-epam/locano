import { LocaleSwitcher } from "@/components";

export default function SignupPage() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex w-full max-w-md flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Sign Up</h1>
        <p className="text-sm text-muted-foreground">
          Please sign up to continue.
        </p>
        {/* Signup form component would go here */}
        <LocaleSwitcher />
      </div>
    </div>
  );
}
