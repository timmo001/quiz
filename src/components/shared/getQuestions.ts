import { OpenTDBQuestion, OpenTDBResponse } from "~/types/opentdb";
import { Question } from "~/types/question";
import { decode } from "./decode";

export async function getQuestions(
  amount: number,
  category: number
): Promise<Array<Question>> {
  const url = `https://opentdb.com/api.php?amount=${amount}${
    category ? `&category=${category}` : ""
  }`;
  const fetchResponse = await fetch(url);
  const response = (await fetchResponse.json()) as OpenTDBResponse;

  return response.results.map(
    (q: OpenTDBQuestion, id: number): Question => ({
      ...q,
      id,
      question: decode(q.question),
      answers: [
        ...q.incorrect_answers.map((a: string) => decode(a)),
        decode(q.correct_answer),
      ].sort(() => Math.random() - 0.5),
      answer: decode(q.correct_answer),
    })
  );
}
