type Entry = Record<string, unknown> & { id: string };

export default function SetupEntryLog({
  entries,
  compact = false,
}: {
  entries: Entry[];
  compact?: boolean;
}) {
  if (entries.length === 0) {
    return <p className="text-xs text-slate-400">No changes logged</p>;
  }

  return (
    <ul className={`flex flex-col ${compact ? "gap-2" : "gap-3"}`}>
      {entries.map((entry, index) => (
        <li
          key={entry.id}
          className={compact ? "" : "rounded-lg border border-slate-200 bg-slate-50 p-3"}
        >
          <span className="text-xs font-medium text-slate-400">Change {index + 1}</span>
          {entry.computed_changes ? (
            <p className="mt-0.5 text-xs text-rose-600">{entry.computed_changes as string}</p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-400">No changes recorded</p>
          )}
          {entry.feedback ? (
            <p className="mt-0.5 text-xs text-slate-700">Felt: {entry.feedback as string}</p>
          ) : (
            <p className="mt-0.5 text-xs text-amber-600">Pending feedback</p>
          )}
        </li>
      ))}
    </ul>
  );
}
