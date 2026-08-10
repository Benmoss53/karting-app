export default function StatTile({
  icon,
  value,
  label,
  sublabel,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  sublabel?: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/10 text-red-500">
        {icon}
      </span>
      <div>
        <p className="text-xl font-bold text-white">{value}</p>
        <p className="text-xs text-neutral-500">
          {label}
          {sublabel ? <span className="block text-neutral-600">{sublabel}</span> : null}
        </p>
      </div>
    </div>
  );
}
