"use client";

import { useOptimistic, useTransition } from "react";
import { toggleActionItem } from "@/app/actions";
import { IconCheck } from "@/components/Icons";

export function ActionItemRow({
  id,
  text,
  sub,
  due,
  late,
  doneAt,
  returnTo,
  compact,
}: {
  id: string;
  text: string;
  sub?: string;
  due?: string | null;
  late?: boolean;
  doneAt: string | null;
  returnTo: string;
  compact?: boolean;
}) {
  const [done, setDone] = useOptimistic(Boolean(doneAt));
  const [, start] = useTransition();

  function toggle() {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("done", done ? "0" : "1");
    fd.set("return_to", returnTo);
    start(async () => {
      setDone(!done);
      await toggleActionItem(fd);
    });
  }

  return (
    <div className={`check-row${done ? " done" : ""}`} style={compact ? { background: "var(--surface-3)" } : undefined}>
      <button type="button" role="checkbox" aria-checked={done} className="check-box" onClick={toggle} aria-label={`Mark "${text}" ${done ? "not done" : "done"}`}>
        {done && <IconCheck size={14} />}
      </button>
      <span className="grow stack gap-2" style={{ flex: "1 1 220px" }}>
        <span className="check-text" style={{ fontSize: compact ? 14 : 15, fontWeight: 500 }}>{text}</span>
        {sub && <span className="small muted">{sub}</span>}
      </span>
      {due && <span className={`due${late && !done ? " late" : ""}`}>{due}</span>}
    </div>
  );
}
