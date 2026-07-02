import { Fragment } from "react";

// A single note in the timeline (Phase 19).
export interface NoteItem {
  id: string;
  author: string; // role of the note's owner
  context: string; // project / role the note belongs to
  note: string;
  createdAt: Date;
}

function authorColor(author: string): string {
  switch (author) {
    case "Owner":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "Recruiter":
      return "border-cyan-500/40 bg-cyan-500/10 text-cyan-300";
    default:
      return "border-zinc-700 bg-zinc-800/40 text-zinc-300";
  }
}

// Render note text with @mention highlighting.
function renderNote(note: string) {
  return note.split(/(@\w+)/g).map((part, index) =>
    /^@\w+$/.test(part) ? (
      <span key={index} className="rounded bg-cyan-500/10 px-1 text-cyan-300">
        {part}
      </span>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

// Chronological notes feed with author-role separation and mention highlights.
export function NotesTimeline({ items }: { items: NoteItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-600">No notes yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id} className="flex gap-3">
          <span
            className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${authorColor(item.author)}`}
          >
            {item.author.slice(0, 2).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 border-l border-zinc-800 pl-3">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="text-zinc-300">{item.author}</span>
              <span className="text-zinc-600">·</span>
              <span className="truncate">{item.context}</span>
              <span className="ml-auto shrink-0 tabular-nums">
                {item.createdAt.toISOString().slice(0, 10)}
              </span>
            </div>
            <p className="text-sm text-zinc-300">{renderNote(item.note)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
