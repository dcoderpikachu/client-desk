import Link from "next/link";
import { toggleActionItem } from "@/app/actions";
import { IconTask } from "@/components/Icons";
import { SubmitButton } from "@/components/SubmitButton";
import type { Attention } from "@/lib/model";

const CHIP: Record<Attention["kind"], { cls: string; label: string }> = {
  risk: { cls: "chip-risk", label: "At risk" },
  watch: { cls: "chip-watch", label: "Watch" },
  task: { cls: "chip-neutral", label: "Task late" },
  rerate: { cls: "chip-neutral", label: "Re-rate" },
};

export function AttentionList({ items }: { items: Attention[] }) {
  if (!items.length) {
    return <p className="muted">Nothing needs you right now. Every client is healthy and every promise is on time.</p>;
  }
  return (
    <div className="stack gap-10">
      {items.map((a, i) => (
        <div key={`${a.clientId}-${a.kind}-${i}`} className="rowbox attn">
          <span className={`chip ${CHIP[a.kind].cls} attn-chip`}>
            {a.kind === "task" ? <IconTask /> : <span className="dot" aria-hidden="true" />}
            {CHIP[a.kind].label}
          </span>
          <div className="attn-body">
            <Link href={`/clients/${a.clientId}`} className="attn-title">
              {a.clientName}
            </Link>
            <span className="small muted">{a.text}</span>
          </div>
          <div className="attn-metric">
            <b>{a.metric}</b>
            <span className="xsmall subtle">{a.metricSub}</span>
          </div>
          <div className="attn-action">
            {a.action.markDoneId ? (
              <form action={toggleActionItem}>
                <input type="hidden" name="id" value={a.action.markDoneId} />
                <input type="hidden" name="done" value="1" />
                <input type="hidden" name="return_to" value="/" />
                <SubmitButton className="btn" style={{ width: "100%" }} pendingText="Saving…">
                  {a.action.label}
                </SubmitButton>
              </form>
            ) : (
              <Link href={a.action.href ?? "/"} className="btn" style={{ width: "100%" }}>
                {a.action.label}
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
