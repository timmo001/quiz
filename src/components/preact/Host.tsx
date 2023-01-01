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
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode-svg";

import { currentQuestion, questions } from "../shared/questionStore";
import { getQuestions } from "../shared/getQuestions";
import { Question } from "~/types/question";

interface HostProps {
  firebaseConfig: FirebaseOptions;
}

let firebaseApp: FirebaseApp,
  firebaseAnalytics: Analytics,
  firebaseDatabase: Database,
  firebaseUser: UserCredential;
export default function Host({ firebaseConfig }: HostProps) {
  const [setup, setSetup] = useState<boolean>(false);
  const $currentQuestion = useStore(currentQuestion);
  const $questions = useStore(questions);

  async function setupFirebase(): Promise<void> {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const amount = Number(urlSearchParams.get("amount")) || 10;
    const category = Number(urlSearchParams.get("category"));
    let sessionId = urlSearchParams.get("sessionId");

    if (!sessionId) {
      sessionId = uuidv4();
      window.history.replaceState(
        {},
        document.title,
        `?amount=${amount}&category=${category}&sessionId=${sessionId}`
      );
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

    // Get questions
    onValue(
      ref(firebaseDatabase, `/sessions/${sessionId}/questions`),
      async (snapshot: DataSnapshot) => {
        const newQuestions = snapshot.val() as Array<Question>;
        if (!newQuestions) {
          await getData();
          return;
        }
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

  async function getData(): Promise<void> {
    if ($questions) return;

    const urlSearchParams = new URLSearchParams(window.location.search);
    const amount = Number(urlSearchParams.get("amount")) || 10;
    const category = Number(urlSearchParams.get("category"));
    const sessionId = urlSearchParams.get("sessionId");

    const newQuestions: Array<Question> = await getQuestions(amount, category);
    questions.set(newQuestions);
    currentQuestion.set(newQuestions[0]);

    const updates = {
      [`/sessions/${sessionId}/questions`]: newQuestions,
      [`/sessions/${sessionId}/currentQuestion`]: newQuestions[0].id,
    };

    await update(ref(firebaseDatabase), updates);
  }

  async function setupApplication(): Promise<void> {
    setSetup(true);
    await setupFirebase();

    // Generate QR code
    const urlSearchParams = new URLSearchParams(window.location.search);
    const url = `${
      window.location.origin
    }/play/player?sessionId=${urlSearchParams.get("sessionId")}`;
    console.log("Player URL:", url);
    const qrcode = new QRCode({
      content: url,
      height: 180,
      width: 180,
      padding: 0,
      background: "transparent",
      color: "#FFFFFF",
      join: true,
    });
    const container = document.getElementById("qrcode");
    const anchor = document.createElement("a");
    anchor.setAttribute("href", url);
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");
    anchor.innerHTML = qrcode.svg();
    container.appendChild(anchor);
  }

  useEffect(() => {
    if (!setup) setupApplication();
  }, [setup]);

  return (
    <>
      {setup && $currentQuestion ? (
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
      ) : (
        <h3 className="col-span-4 text-center">Loading..</h3>
      )}
      <div className="fixed bottom-4 right-4" id="qrcode"></div>
    </>
  );
}
