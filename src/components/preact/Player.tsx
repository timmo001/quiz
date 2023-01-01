import { useEffect, useState } from "preact/hooks";
import { useStore } from "@nanostores/preact";

import { currentQuestion } from "../shared/questionStore";

export default function Play() {
  const [setup, setSetup] = useState<boolean>(false);
  const $currentQuestion = useStore(currentQuestion);

  function connectToHost(): void {
    setSetup(true);
  }

  useEffect(() => {
    if (!setup) connectToHost();
  }, [setup]);

  return (
    <>
      {setup && $currentQuestion ? (
        <>
          <h3 className="col-span-4 text-center">
            {$currentQuestion.question}
          </h3>
          {$currentQuestion.answers.map((a: string, id: number) => (
            <button
              key={id}
              className="col-span-4 bg-primary hover:bg-secondary text-white font-bold py-2 px-4 rounded active:animate-ping"
              onClick={() => {
                console.log(a);
                // handleNextQuestion();
              }}
            >
              {a}
            </button>
          ))}
        </>
      ) : (
        <h3 className="col-span-4 text-center">Loading..</h3>
      )}
    </>
  );
}
