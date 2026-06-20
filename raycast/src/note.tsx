import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { getPrefs } from "./lib/github";

export default function NoteCommand() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [why, setWhy] = useState("");

  async function handleSubmit() {
    const { github_pat, github_repo } = getPrefs();
    if (!title.trim() && !body.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Title or body required" });
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving…" });
    try {
      const timestamp = (() => {
        const d = new Date();
        const pad = (n: number, len = 2) => String(n).padStart(len, "0");
        return (
          d.getUTCFullYear() +
          pad(d.getUTCMonth() + 1) +
          pad(d.getUTCDate()) +
          pad(d.getUTCHours()) +
          pad(d.getUTCMinutes()) +
          pad(d.getUTCSeconds())
        );
      })();

      const lines = [
        `type=note`,
        `url=`,
        `title=${title.trim()}`,
        `note=${body.trim()}`,
        `why=${why.trim()}`,
        `captured_by=raycast`,
      ];
      const content = btoa(unescape(encodeURIComponent(lines.join("\n"))));

      const res = await fetch(
        `https://api.github.com/repos/${github_repo}/contents/data/pending/${timestamp}.json`,
        {
          method: "PUT",
          headers: {
            Authorization: `token ${github_pat}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: `note: ${title.trim() || "quick note"}`, content }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? `GitHub API error ${res.status}`);
      }
      toast.style = Toast.Style.Success;
      toast.title = "Note saved";
      popToRoot();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to save note";
      toast.message = String(err);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Short headline…"
        value={title}
        onChange={setTitle}
      />
      <Form.TextArea
        id="body"
        title="Note"
        placeholder="Write something…"
        value={body}
        onChange={setBody}
      />
      <Form.TextArea
        id="why"
        title="Context"
        placeholder="Why write this down? (optional)"
        value={why}
        onChange={setWhy}
      />
    </Form>
  );
}
