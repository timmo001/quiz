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

import { currentQuestion } from "../shared/questionStore";
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

  async function setupFirebase(): Promise<void> {
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

    const questionRef = ref(
      firebaseDatabase,
      `currentQuestion/${firebaseUser.user.uid}`
    );

    onValue(questionRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val() as Question;
      console.log("New question:", data.question);
      currentQuestion.set(data);
    });
  }

  async function setupApplication(): Promise<void> {
    setSetup(true);
    await setupFirebase();
  }

  useEffect(() => {
    if (!setup) setupApplication();
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
