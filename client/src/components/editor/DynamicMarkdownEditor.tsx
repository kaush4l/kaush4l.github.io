import React from 'react';
import { Loader2 } from "lucide-react";
import type { MarkdownContent } from '@/lib/markdown';
import MarkdownEditor from './MarkdownEditor';

interface MarkdownEditorProps {
  initialContent: MarkdownContent;
  onSave: (content: MarkdownContent) => void;
}

export function DynamicMarkdownEditor(props: MarkdownEditorProps) {
  return <MarkdownEditor {...props} />;
}