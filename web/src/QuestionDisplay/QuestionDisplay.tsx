import React from "react";
import ReactMarkdown from "react-markdown";
export const QuestionDisplay = ({
  title,
  markdown,
}: {
  title: string;
  markdown: string;
}) => {
  return (
    <div>
      <h1 className="question__round-info">{title}</h1>
      <section>
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </section>
    </div>
  );
};
