import NewSessionForm from "@/components/new-session-form";
import { errorBannerClass } from "@/lib/dark-ui";

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold text-white sm:text-3xl">Add a test / race day</h1>

      {params.error && <p className={`mb-4 ${errorBannerClass}`}>{params.error}</p>}

      <NewSessionForm />
    </div>
  );
}
