type Entry = Record<string, unknown> & { id: string };

export default function SetupEntryLog({
  entries,
  compact = false,
}: {
  entries: Entry[];
  compact?: boolean;
}) {
  if (entries.length === 0) {
    return <p className="text-xs text-neutral-500">No changes logged</p>;
  }

  return (
    <ul className={`flex flex-col ${compact ? "gap-2" : "gap-3"}`}>
      {entries.map((entry, index) => (
        <li
          key={entry.id}
          className={compact ? "" : "rounded-lg border border-neutral-800 bg-neutral-800/40 p-3"}
        >
          <span className="text-xs font-medium text-neutral-500">Change {index + 1}</span>
          {entry.computed_changes ? (
            <p className="mt-0.5 text-xs text-red-400">{entry.computed_changes as string}</p>
          ) : (
            <p className="mt-0.5 text-xs text-neutral-500">No changes recorded</p>
          )}
          {entry.feedback ? (
            <p className="mt-0.5 text-xs text-neutral-300">Felt: {entry.feedback as string}</p>
          ) : (
            <p className="mt-0.5 text-xs italic text-neutral-500">Pending feedback</p>
          )}
        </li>
      ))}
    </ul>
  );
}
