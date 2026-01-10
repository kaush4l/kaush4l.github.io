"use client"

import { useEffect, useState } from "react";
import remark from "remark";
import html from "remark-html";

export default function MarkdownContent({ content }) {
  const [htmlContent, setHtmlContent] = useState("");

  useEffect(() => {
    remark()
      .use(html)
      .process(content)
      .then((file) => {
        setHtmlContent(String(file));
      });
  }, [content]);

  return (
    <div
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}