"use client";

import type { ProposedAction } from "@/lib/validation";

export interface PendingProposal {
  actions: ProposedAction[];
  /** Ids of the actions currently ticked for applying; defaults to all of them. */
  accepted: ReadonlySet<string>;
}

const ACTION_LABEL: Record<ProposedAction["kind"], string> = {
  add: "Add",
  edit: "Edit",
  delete: "Delete",
};

/** The card listing the assistant's proposed changes, each with a checkbox, plus Confirm / Cancel. */
export function ProposalReview({
  proposal,
  onToggle,
  onConfirm,
  onCancel,
}: {
  proposal: PendingProposal;
  onToggle: (actionId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="proposal">
      <div className="proposal-head">Review changes</div>
      {proposal.actions.map((a) => (
        <label className="proposal-action" key={a.id}>
          <input
            type="checkbox"
            checked={proposal.accepted.has(a.id)}
            onChange={() => onToggle(a.id)}
          />
          <span className={`proposal-kind ${a.kind}`}>{ACTION_LABEL[a.kind]}</span>
          <span className="proposal-summary">{a.summary}</span>
        </label>
      ))}
      <div className="proposal-actions">
        <button type="button" className="proposal-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="proposal-confirm"
          onClick={onConfirm}
          disabled={proposal.accepted.size === 0}
        >
          Confirm {proposal.accepted.size}
        </button>
      </div>
    </div>
  );
}
