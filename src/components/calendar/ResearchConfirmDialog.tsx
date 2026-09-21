"use client";

import { Modal } from "../shared/Modal";

/** Asks before re-researching a week that already has events, since the run replaces them. */
export function ResearchConfirmDialog({
  disabled,
  onConfirm,
  onClose,
}: {
  /** True while another AI request is running, so a second one can't start. */
  disabled: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Research this week?" ariaLabel="Research this week" onClose={onClose}>
      <div className="status-modal-body">
        <p className="status-modal-message">
          A fresh research run will replace this week&rsquo;s events with the newly gathered
          results. Some events currently shown may not appear again.
        </p>
        <div className="modal-actions modal-actions--spaced">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={disabled}>
            Research
          </button>
        </div>
      </div>
    </Modal>
  );
}
