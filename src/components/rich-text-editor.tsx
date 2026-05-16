"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ReactNode, useEffect, useMemo } from "react";
import { RichTextDocument } from "../lib/types";

interface RichTextEditorProps {
  id: string;
  value?: RichTextDocument;
  placeholder?: string;
  onChange: (document: RichTextDocument, text: string) => void;
}

interface RichTextPreviewProps {
  document?: RichTextDocument;
  fallback: string;
}

function markKey(mark: Record<string, unknown>, index: number) {
  return `${String(mark.type || "mark")}-${index}`;
}

function renderTextNode(node: Record<string, unknown>, key: string) {
  const text = String(node.text || "");
  const marks = Array.isArray(node.marks) ? (node.marks as Record<string, unknown>[]) : [];

  return marks.reduce<ReactNode>((content, mark, index) => {
    if (mark.type === "bold") {
      return <strong key={markKey(mark, index)}>{content}</strong>;
    }
    if (mark.type === "italic") {
      return <em key={markKey(mark, index)}>{content}</em>;
    }
    return content;
  }, text) || <span key={key}>{text}</span>;
}

function renderInlineContent(content: unknown, parentKey: string) {
  if (!Array.isArray(content)) {
    return null;
  }

  return content.map((node, index) => {
    if (!node || typeof node !== "object") {
      return null;
    }

    const child = node as Record<string, unknown>;
    const key = `${parentKey}-${index}`;
    if (child.type === "text") {
      return <span key={key}>{renderTextNode(child, key)}</span>;
    }
    if (Array.isArray(child.content)) {
      return <span key={key}>{renderInlineContent(child.content, key)}</span>;
    }
    return null;
  });
}

function renderBlock(node: Record<string, unknown>, key: string): React.ReactNode {
  switch (node.type) {
    case "heading": {
      const attrs = node.attrs && typeof node.attrs === "object" ? (node.attrs as Record<string, unknown>) : {};
      const level = attrs.level === 1 || attrs.level === 2 || attrs.level === 3 ? attrs.level : 2;
      if (level === 1) {
        return <h3 key={key}>{renderInlineContent(node.content, key)}</h3>;
      }
      if (level === 3) {
        return <h5 key={key}>{renderInlineContent(node.content, key)}</h5>;
      }
      return <h4 key={key}>{renderInlineContent(node.content, key)}</h4>;
    }
    case "bulletList":
      return <ul key={key}>{renderListItems(node.content, key)}</ul>;
    case "orderedList":
      return <ol key={key}>{renderListItems(node.content, key)}</ol>;
    case "paragraph":
    default:
      return <p key={key}>{renderInlineContent(node.content, key)}</p>;
  }
}

function renderListItems(content: unknown, parentKey: string) {
  if (!Array.isArray(content)) {
    return null;
  }

  return content.map((node, index) => {
    if (!node || typeof node !== "object") {
      return null;
    }

    const item = node as Record<string, unknown>;
    return <li key={`${parentKey}-${index}`}>{renderInlineContent(item.content, `${parentKey}-${index}`)}</li>;
  });
}

function hasVisibleText(content: unknown): boolean {
  if (!Array.isArray(content)) {
    return false;
  }

  return content.some((node) => {
    if (!node || typeof node !== "object") {
      return false;
    }

    const candidate = node as Record<string, unknown>;
    return String(candidate.text || "").trim().length > 0 || hasVisibleText(candidate.content);
  });
}

export function RichTextPreview({ document, fallback }: RichTextPreviewProps) {
  const blocks = Array.isArray(document?.content) ? document.content : [];

  if (blocks.length === 0 || !hasVisibleText(blocks)) {
    return <div className="preview">{fallback || "Base content preview appears here."}</div>;
  }

  return (
    <div className="preview rich-preview">
      {blocks.map((node, index) =>
        node && typeof node === "object" ? renderBlock(node as Record<string, unknown>, `block-${index}`) : null
      )}
    </div>
  );
}

export function RichTextEditor({ id, value, placeholder, onChange }: RichTextEditorProps) {
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      })
    ],
    []
  );

  const editor = useEditor({
    extensions,
    content: value || {
      type: "doc",
      content: [{ type: "paragraph" }]
    },
    editorProps: {
      attributes: {
        id,
        class: "rich-editor-content",
        "aria-label": placeholder || "Post editor"
      }
    },
    immediatelyRender: false,
    onUpdate({ editor: currentEditor }) {
      onChange(currentEditor.getJSON() as RichTextDocument, currentEditor.getText({ blockSeparator: "\n" }));
    }
  });

  useEffect(() => {
    if (!editor || !value) {
      return;
    }

    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(value)) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  if (!editor) {
    return <div className="rich-editor-shell" />;
  }

  return (
    <div className="rich-editor-shell">
      <div className="rich-editor-toolbar" aria-label="Editor formatting controls">
        <button
          type="button"
          className={editor.isActive("heading", { level: 1 }) ? "active" : ""}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </button>
        <button
          type="button"
          className={editor.isActive("heading", { level: 2 }) ? "active" : ""}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </button>
        <button
          type="button"
          className={editor.isActive("bold") ? "active" : ""}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          type="button"
          className={editor.isActive("italic") ? "active" : ""}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </button>
        <button
          type="button"
          className={editor.isActive("bulletList") ? "active" : ""}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          Bullets
        </button>
        <button
          type="button"
          className={editor.isActive("orderedList") ? "active" : ""}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          Numbered
        </button>
        <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          Undo
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          Redo
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
