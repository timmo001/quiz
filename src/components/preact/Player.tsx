import { useEffect, useState } from "preact/hooks";
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

import type { Question } from "~/types/question";

interface PlayerProps {
  firebaseConfig: FirebaseOptions;
}

let firebaseApp: FirebaseApp,
  firebaseAnalytics: Analytics,
  firebaseDatabase: Database,
  firebaseUser: UserCredential;
export default function Player({ firebaseConfig }: PlayerProps) {
  const [currentQuestion, setCurrentQuestion] = useState<Question>();
  const [questions, setQuestions] = useState<Array<Question>>();
  const [setup, setSetup] = useState<boolean>(false);

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
      }
    );

    return () => {
      unsubCurrentQuestion();
    };
  }, [setup, questions, currentQuestion]);

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

  return (
    <>
      {setup && currentQuestion ? (
        <>
          <h3 className="col-span-4 text-center">{currentQuestion.question}</h3>
          {currentQuestion.answers.map((a: string, id: number) => (
            <button
              key={id}
              className="col-span-4 bg-primary hover:bg-secondary text-white py-2 px-4 rounded-full active:animate-ping"
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
  );
}
