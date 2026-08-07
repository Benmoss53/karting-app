import NewSessionForm from "@/components/new-session-form";

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="max-w-xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-slate-900">
        Add a test / race day
      </h1>

      {params.error && (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
          {params.error}
        </p>
      )}

      <NewSessionForm />
    </div>
  );
}
