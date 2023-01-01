import { useEffect, useMemo, useState } from "preact/hooks";
import { FirebaseApp, FirebaseOptions, initializeApp } from "firebase/app";
import { Analytics, getAnalytics } from "firebase/analytics";
import { getAuth, signInAnonymously, UserCredential } from "firebase/auth";
import {
  Database,
  DataSnapshot,
  getDatabase,
  onValue,
  ref,
  update,
} from "firebase/database";

import type { Answers } from "~/types/answers";
import type { Question } from "~/types/question";
import { Status } from "~/types/status";

interface PlayerProps {
  firebaseConfig: FirebaseOptions;
}

let firebaseApp: FirebaseApp,
  firebaseAnalytics: Analytics,
  firebaseDatabase: Database,
  firebaseUser: UserCredential;
export default function Player({ firebaseConfig }: PlayerProps) {
  const [answers, setAnswers] = useState<Answers>();
  const [currentQuestion, setCurrentQuestion] = useState<Question>();
  const [questions, setQuestions] = useState<Array<Question>>();
  const [setup, setSetup] = useState<boolean>(false);
  const [status, setStatus] = useState<Status>(Status.Unset);

  async function setupApplication(): Promise<void> {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const sessionId = urlSearchParams.get("sessionId");
    const name = urlSearchParams.get("name") || "Anonymous";

    if (!sessionId) {
      console.error("No sessionId provided");
      return;
    }

    firebaseApp = initializeApp(firebaseConfig);
    firebaseAnalytics = getAnalytics(firebaseApp);

    const auth = getAuth();
    try {
      firebaseUser = await signInAnonymously(auth);
    } catch (error) {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.error(errorCode, errorMessage);
      return;
    }
    console.log("User:", firebaseUser.user.uid);
    firebaseDatabase = getDatabase(firebaseApp);

    // Get status
    onValue(
      ref(firebaseDatabase, `/sessions/${sessionId}/status`),
      (snapshot: DataSnapshot) => {
        const status = snapshot.val() as Status;
        console.log("New status:", status);
        setStatus(status);
      }
    );

    const updates = {
      [`/sessions/${sessionId}/players/${firebaseUser.user.uid}`]: {
        id: firebaseUser.user.uid,
        name,
      },
    };

    await update(ref(firebaseDatabase), updates);

    // Get questions
    onValue(
      ref(firebaseDatabase, `/sessions/${sessionId}/questions`),
      (snapshot: DataSnapshot) => {
        const newQuestions = snapshot.val() as Array<Question>;
        if (!newQuestions) return;
        console.log("New questions:", newQuestions);
        setQuestions(newQuestions);
      }
    );

    setSetup(true);
  }

  useEffect(() => {
    if (setup) return;
    setupApplication();
  }, [setup]);

  useEffect(() => {
    if (!setup || !questions) return;

    const urlSearchParams = new URLSearchParams(window.location.search);
    const sessionId = urlSearchParams.get("sessionId");

    // Get current question
    const unsubCurrentQuestion = onValue(
      ref(firebaseDatabase, `/sessions/${sessionId}/currentQuestion`),
      (snapshot: DataSnapshot) => {
        const questionId = snapshot.val() as number;
        if (questionId === null || !questions) return;
        const newQuestion: Question = questions[questionId];
        if (!newQuestion) return;
        console.log("New question:", newQuestion.question);
        setCurrentQuestion(newQuestion);
        setAnswers({});
      }
    );

    return () => {
      unsubCurrentQuestion();
    };
  }, [setup, questions, currentQuestion]);

  useEffect(() => {
    if (!setup || !currentQuestion) return;

    const urlSearchParams = new URLSearchParams(window.location.search);
    const sessionId = urlSearchParams.get("sessionId");

    if (!sessionId) return;

    // Get answers
    const unsubAnswers = onValue(
      ref(
        firebaseDatabase,
        `/sessions/${sessionId}/answers/${currentQuestion.id}`
      ),
      async (snapshot: DataSnapshot) => {
        const newAnswers = snapshot.val() as Answers;
        if (!newAnswers) return;
        console.log("New answers:", newAnswers);
        setAnswers(newAnswers);
      }
    );

    return () => {
      unsubAnswers();
    };
  }, [setup, currentQuestion]);

  function handleAnswer(answer: string): void {
    console.log("Answer:", answer);

    const urlSearchParams = new URLSearchParams(window.location.search);
    const sessionId = urlSearchParams.get("sessionId");

    const updates = {
      [`/sessions/${sessionId}/answers/${currentQuestion.id}/${firebaseUser.user.uid}`]:
        answer,
    };
    update(ref(firebaseDatabase), updates);
  }

  const answer = useMemo<string | undefined>(
    () =>
      answers && firebaseUser?.user.uid
        ? answers[firebaseUser?.user.uid]
        : undefined,
    [answers]
  );

  const questionNumber = useMemo<number>(() => {
    if (!currentQuestion || !questions) return 0;
    return questions.findIndex((q) => q.id === currentQuestion.id) + 1;
  }, [currentQuestion, questions]);

  return (
    <>
      {!setup || status === Status.Unset ? (
        <h2 className="col-span-4 text-center">Loading...</h2>
      ) : status === Status.Inactive ? (
        <h2 className="col-span-4 text-center">Session Expired!</h2>
      ) : status === Status.Setup ? (
        <h2 className="col-span-4 text-center">Loading...</h2>
      ) : status === Status.Active ? (
        <>
          {currentQuestion ? (
            <>
              <h3 className="col-span-4 text-center">
                Q{questionNumber}: {currentQuestion.question}
              </h3>
              {currentQuestion.answers.map((a: string, id: number) => (
                <button
                  key={id}
                  disabled={answer !== undefined}
                  className={`col-span-4 ${
                    answer === a
                      ? "bg-primary"
                      : answer !== undefined
                      ? "bg-violet-600/40"
                      : "bg-primary hover:bg-secondary active:animate-ping"
                  } text-white py-2 px-4 rounded-full`}
                  onClick={() => handleAnswer(a)}
                >
                  {a}
                </button>
              ))}
            </>
          ) : (
            <h3 className="col-span-4 text-center">Loading..</h3>
          )}
        </>
      ) : status === Status.Finished ? (
        <h2 className="col-span-4 text-center">Game over!</h2>
      ) : null}
    </>
  );
}
