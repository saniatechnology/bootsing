"use client";

import { useState } from "react";
import { Modal } from "./Modal";

const OFFLINE_TITLE = "Diva down :/";
const OFFLINE_MESSAGE = "You appear to be offline. Check your internet connection and try again.";

/** Topbar icon shown only on a connection/request problem; opens a modal with the detail. */
export function StatusIndicator({
  error,
  offline,
  onDismiss,
}: {
  error: string | null;
  offline: boolean;
  onDismiss: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!offline && error === null) return null;

  const message = offline ? OFFLINE_MESSAGE : error;
  const title = offline ? OFFLINE_TITLE : "Something went wrong";

  return (
    <>
      <button
        type="button"
        className="status-indicator"
        aria-label={offline ? OFFLINE_TITLE : "Connection problem — view details"}
        title={offline ? OFFLINE_TITLE : "Connection problem"}
        onClick={() => setOpen(true)}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          {offline ? "cloud_off" : "error"}
        </span>
      </button>

      {open && (
        <Modal title={title} ariaLabel="Connection status" onClose={() => setOpen(false)}>
          <div className="status-modal-body">
            <p className="status-modal-message">{message}</p>
            {!offline && error !== null && (
              <div className="status-modal-actions">
                <button
                  type="button"
                  className="status-dismiss"
                  onClick={() => {
                    onDismiss();
                    setOpen(false);
                  }}
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
