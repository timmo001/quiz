import { useEffect, useState } from "preact/hooks";
import { useStore } from "@nanostores/preact";
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

import { currentQuestion, questions } from "../shared/questionStore";
import { Question } from "~/types/question";

interface PlayerProps {
  firebaseConfig: FirebaseOptions;
}

let firebaseApp: FirebaseApp,
  firebaseAnalytics: Analytics,
  firebaseDatabase: Database,
  firebaseUser: UserCredential;
export default function Player({ firebaseConfig }: PlayerProps) {
  const [setup, setSetup] = useState<boolean>(false);
  const $currentQuestion = useStore(currentQuestion);
  const $questions = useStore(questions);

  async function setupFirebase(): Promise<void> {
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
        questions.set(newQuestions);

        // Get current question
        onValue(
          ref(firebaseDatabase, `/sessions/${sessionId}/currentQuestion`),
          (snapshot: DataSnapshot) => {
            const questionId = snapshot.val() as number;
            if (questionId === null || !newQuestions) return;
            const newQuestion: Question = newQuestions[questionId];
            if (!newQuestion) return;
            console.log("New question:", newQuestion.question);
            currentQuestion.set(newQuestion);
          }
        );
      }
    );
  }

  async function setupApplication(): Promise<void> {
    setSetup(true);
    await setupFirebase();
  }

  useEffect(() => {
    if (!setup) setupApplication();
  }, [setup]);

  function handleAnswer(answer: string): void {
    console.log("Answer:", answer);

    const urlSearchParams = new URLSearchParams(window.location.search);
    const sessionId = urlSearchParams.get("sessionId");

    const updates = {
      [`/sessions/${sessionId}/answers/${$currentQuestion.id}/${firebaseUser.user.uid}`]:
        answer,
    };
    update(ref(firebaseDatabase), updates);
  }

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
