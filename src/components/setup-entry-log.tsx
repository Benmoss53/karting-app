type Entry = Record<string, unknown> & { id: string };

export default function SetupEntryLog({
  entries,
  compact = false,
}: {
  entries: Entry[];
  compact?: boolean;
}) {
  if (entries.length === 0) {
    return <p className="text-xs text-zinc-500">No changes logged</p>;
  }

  return (
    <ul className={`flex flex-col ${compact ? "gap-2" : "gap-3"}`}>
      {entries.map((entry, index) => (
        <li
          key={entry.id}
          className={compact ? "" : "rounded-lg border border-white/10 bg-zinc-950/40 p-3"}
        >
          <span className="text-xs font-medium text-zinc-500">Change {index + 1}</span>
          {entry.computed_changes ? (
            <p className="mt-0.5 text-xs text-red-300">{entry.computed_changes as string}</p>
          ) : (
            <p className="mt-0.5 text-xs text-zinc-500">No changes recorded</p>
          )}
          {entry.feedback ? (
            <p className="mt-0.5 text-xs text-zinc-300">Felt: {entry.feedback as string}</p>
          ) : (
            <p className="mt-0.5 text-xs text-yellow-400/80">Pending feedback</p>
          )}
        </li>
      ))}
    </ul>
  );
}
