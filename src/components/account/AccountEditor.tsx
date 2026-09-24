"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";

interface AccountEditorProps {
  initialUsername: string;
  initialEmail: string | null;
}

type Feedback = { kind: "ok"; message: string } | { kind: "error"; message: string } | null;

/**
 * The Account page: change username, email or password (each confirmed with
 * the current password), sign out, or delete the account and all its data.
 * Every mutation goes through one of the `/api/auth/account` operations.
 */
export function AccountEditor({ initialUsername, initialEmail }: AccountEditorProps) {
  const router = useRouter();

  const [username, setUsername] = useState(initialUsername);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [newPassword, setNewPassword] = useState("");

  // A separate current-password field per form keeps each confirmation explicit.
  const [usernamePw, setUsernamePw] = useState("");
  const [emailPw, setEmailPw] = useState("");
  const [passwordPw, setPasswordPw] = useState("");
  const [deletePw, setDeletePw] = useState("");

  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [busy, setBusy] = useState<string | null>(null);

  function setResult(form: string, value: Feedback) {
    setFeedback((prev) => ({ ...prev, [form]: value }));
  }

  async function run(form: string, action: () => Promise<void>) {
    setBusy(form);
    setResult(form, null);
    try {
      await action();
    } catch (err) {
      setResult(form, { kind: "error", message: errorMessage(err, "Something went wrong.") });
    } finally {
      setBusy(null);
    }
  }

  function saveUsername(e: React.FormEvent) {
    e.preventDefault();
    void run("username", async () => {
      const user = await api.updateAccount({
        field: "username",
        username,
        currentPassword: usernamePw,
      });
      setUsername(user.username);
      setUsernamePw("");
      setResult("username", { kind: "ok", message: "Username updated." });
    });
  }

  function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    void run("email", async () => {
      const user = await api.updateAccount({ field: "email", email, currentPassword: emailPw });
      setEmail(user.email ?? "");
      setEmailPw("");
      setResult("email", { kind: "ok", message: "Email updated." });
    });
  }

  function savePassword(e: React.FormEvent) {
    e.preventDefault();
    void run("password", async () => {
      await api.updateAccount({ field: "password", newPassword, currentPassword: passwordPw });
      setNewPassword("");
      setPasswordPw("");
      setResult("password", { kind: "ok", message: "Password updated." });
    });
  }

  function logOut() {
    void run("logout", async () => {
      await api.logout();
      router.replace("/");
      router.refresh();
    });
  }

  function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm("Delete your account and all your data? This cannot be undone.")) return;
    void run("delete", async () => {
      await api.deleteAccount(deletePw);
      router.replace("/");
      router.refresh();
    });
  }

  const message = (form: string) => {
    const f = feedback[form];
    if (!f) return null;
    return (
      <span className={f.kind === "ok" ? "config-save-msg" : "config-save-err"}>{f.message}</span>
    );
  };

  return (
    <div className="wrap">
      <header className="page">
        <div className="topbar">
          <h1>Account</h1>
          <Link
            href="/"
            className="settings-btn"
            aria-label="Back to calendar"
            title="Back to calendar"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_back
            </span>
          </Link>
        </div>
      </header>

      <div className="account-grid">
        <form className="config-card account-form" onSubmit={saveUsername}>
          <h2 className="account-card-title">Username</h2>
          <label className="account-field">
            <span>Username</span>
            <input
              value={username}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label className="account-field">
            <span>Current password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={usernamePw}
              onChange={(e) => setUsernamePw(e.target.value)}
            />
          </label>
          <div className="account-actions">
            {message("username")}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy !== null || username.trim() === "" || usernamePw === ""}
            >
              {busy === "username" ? "Saving…" : "Save username"}
            </button>
          </div>
        </form>

        <form className="config-card account-form" onSubmit={saveEmail}>
          <h2 className="account-card-title">Email</h2>
          <label className="account-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              autoComplete="email"
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="account-field">
            <span>Current password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={emailPw}
              onChange={(e) => setEmailPw(e.target.value)}
            />
          </label>
          <div className="account-actions">
            {message("email")}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy !== null || emailPw === ""}
            >
              {busy === "email" ? "Saving…" : "Save email"}
            </button>
          </div>
        </form>

        <form className="config-card account-form" onSubmit={savePassword}>
          <h2 className="account-card-title">Password</h2>
          <label className="account-field">
            <span>New password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
          <label className="account-field">
            <span>Current password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={passwordPw}
              onChange={(e) => setPasswordPw(e.target.value)}
            />
          </label>
          <div className="account-actions">
            {message("password")}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy !== null || newPassword.length < 8 || passwordPw === ""}
            >
              {busy === "password" ? "Saving…" : "Save password"}
            </button>
          </div>
        </form>

        <section className="config-card account-form">
          <h2 className="account-card-title">Session</h2>
          <p className="account-note">Sign out on this device.</p>
          <div className="account-actions">
            {message("logout")}
            <button type="button" className="btn" onClick={logOut} disabled={busy !== null}>
              {busy === "logout" ? "Signing out…" : "Log out"}
            </button>
          </div>
        </section>

        <form className="config-card account-form account-danger" onSubmit={deleteAccount}>
          <h2 className="account-card-title">Delete account</h2>
          <p className="account-note">
            Permanently deletes your account and all of your saved events. This cannot be undone.
          </p>
          <label className="account-field">
            <span>Current password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={deletePw}
              onChange={(e) => setDeletePw(e.target.value)}
            />
          </label>
          <div className="account-actions">
            {message("delete")}
            <button
              type="submit"
              className="btn btn-danger"
              disabled={busy !== null || deletePw === ""}
            >
              {busy === "delete" ? "Deleting…" : "Delete account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
