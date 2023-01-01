import { useStore } from "@nanostores/preact";
import { useEffect } from "preact/hooks";

import { currentQuestion, questions } from "../shared/questionStore";
import { getQuestions } from "../shared/getQuestions";
import { Question } from "~/types/question";

export default function Host() {
  const $currentQuestion = useStore(currentQuestion);
  const $questions = useStore(questions);

  async function getData(): Promise<void> {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const amount = Number(urlSearchParams.get("amount")) || 10;
    const category = Number(urlSearchParams.get("category"));

    const newQuestions: Array<Question> = await getQuestions(amount, category);
    questions.set(newQuestions);
    currentQuestion.set(newQuestions[0]);
  }

  useEffect(() => {
    if (!$questions) getData();
  }, [$questions]);

  return (
    <>
      {$questions && $currentQuestion ? (
        <>
          <h2 className="col-span-4 text-center">
            {$currentQuestion.question}
          </h2>
          {$currentQuestion.answers.map((a: string, id: number) => (
            <span className="col-span-4 text-justify">
              {id + 1}: {a}
            </span>
          ))}
        </>
      ) : null}
    </>
  );
}
