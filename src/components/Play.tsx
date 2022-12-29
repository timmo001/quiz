import { useEffect, useMemo, useState } from "preact/hooks";

import type { OpenTDBQuestion, OpenTDBResponse } from "~/types/opentdb";

interface Question extends OpenTDBQuestion {
  id: number;
  answers?: Array<string>;
}

export default function Play() {
  const [questions, setQuestions] = useState<Array<Question>>();
  const [question, setQuestion] = useState<Question>();

  function handleNextQuestion(): void {
    if (question && question.id >= questions.length - 1) {
      console.log("Reached question limit");
      return;
    }
    const q = question ? questions[question.id + 1] : questions[0];
    setQuestion({
      ...q,
      answers: [...q.incorrect_answers, q.correct_answer].sort(
        () => Math.random() - 0.5
      ),
    });
  }

  async function getData(): Promise<void> {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const amount = Number(urlSearchParams.get("amount")) || 10;
    const category = Number(urlSearchParams.get("category"));

    const url = `https://opentdb.com/api.php?amount=${amount}${
      category ? `&category=${category}` : ""
    }`;
    const fetchResponse = await fetch(url);
    const response = (await fetchResponse.json()) as OpenTDBResponse;

    setQuestions(
      response.results.map((q: OpenTDBQuestion, id: number) => ({
        ...q,
        id,
        question: decode(q.question),
        correct_answer: decode(q.correct_answer),
        incorrect_answers: q.incorrect_answers.map((a: string) => decode(a)),
      }))
    );
  }

  function decode(str: string): string {
    let txt = new DOMParser().parseFromString(str, "text/html");
    return txt.documentElement.textContent;
  }

  useEffect(() => {
    if (!questions) getData();
    if (questions && !question) handleNextQuestion();
  }, [questions, question]);

  return (
    <>
      {question ? (
        <>
          <h2 className="col-span-4 text-center">{question.question}</h2>
          {question.answers.map((a: string, id: number) => (
            <button
              key={id}
              className="col-span-4 bg-primary hover:bg-secondary text-white font-bold py-2 px-4 rounded active:animate-ping"
              onClick={() => {
                console.log(a);
                handleNextQuestion();
              }}
            >
              {a}
            </button>
          ))}
        </>
      ) : (
        <h2 className="col-span-4 text-center">Loading..</h2>
      )}
    </>
  );
}
