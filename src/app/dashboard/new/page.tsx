import NewSessionForm from "@/components/new-session-form";

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-50">
        Add a test / race day
      </h1>

      {params.error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-inset ring-red-400/20">
          {params.error}
        </p>
      )}

      <NewSessionForm />
    </div>
  );
}
