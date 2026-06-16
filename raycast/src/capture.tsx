import { Action, ActionPanel, Clipboard, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { writePendingCapture } from "./lib/github";

export default function CaptureCommand() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [why, setWhy] = useState("");

  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (text?.startsWith("http")) {
        setUrl(text);
      }
    });
  }, []);

  async function handleSubmit() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving…" });
    try {
      await writePendingCapture(url, title, note, why);
      toast.style = Toast.Style.Success;
      toast.title = "Captured";
      popToRoot();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to capture";
      toast.message = String(err);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Bookmark" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://…"
        value={url}
        onChange={setUrl}
      />
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Page title"
        value={title}
        onChange={setTitle}
      />
      <Form.TextArea
        id="note"
        title="Note"
        placeholder="Optional note"
        value={note}
        onChange={setNote}
      />
      <Form.TextArea
        id="why"
        title="Why"
        placeholder="Why are you saving this?"
        value={why}
        onChange={setWhy}
      />
    </Form>
  );
}
