import React, { useState } from "react";
import "./App.css";
import { QuestionDisplay } from "./QuestionDisplay";
import { BreakDisplay } from "./BreakDisplay";
import { Sponsors } from "./Sponsors";

const apiId = "ofdi1ued0k";
const stage = "v1";

interface WsQuestionFormat {
  title: string;
  body: string;
  break: boolean;
}

const websocketUrl = `wss://${apiId}.execute-api.ap-southeast-2.amazonaws.com/${stage}`;
let exampleSocket = new WebSocket(websocketUrl);
const createSocket = ({
  setQuestion,
  setConnected,
}: {
  setQuestion: React.Dispatch<
    React.SetStateAction<{
      title: string;
      body: string;
      break: boolean;
    }>
  >;
  setConnected: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  exampleSocket.onmessage = (e: MessageEvent) => {
    console.log(e);
    const data = JSON.parse(e.data) as WsQuestionFormat;
    setQuestion({
      title: data.title,
      body: data.body,
      break: data.break,
    });
  };

  exampleSocket.onopen = (e: Event) => {
    setConnected(true);
  };
  exampleSocket.onclose = (e: Event) => {
    setConnected(false);
  };
};

const App: React.FC = () => {
  const [question, setQuestion] = useState({
    title: "",
    body: "",
    break: true,
  });
  const [connected, setConnected] = useState(false);

  createSocket({ setConnected, setQuestion });

  console.log(connected);
  return (
    <div className="App">
      <Sponsors />
      <small>{connected ? "Connected" : "Please refresh"}</small>
      <PickDisplay {...{ question }} />
      {/* <QuestionDisplay title={"Round Question"} markdown={"# heading\n\nbody\n\n```js\n\ncode\n\n\tcode2\n\n``` \n\n Normal text"} /> */}
    </div>
  );
};

const PickDisplay = ({ question }: { question: WsQuestionFormat }) => {
  if (question.break) {
    return <BreakDisplay />;
  }
  return <QuestionDisplay title={question.title} markdown={question.body} />;
};
export default App;
