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
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode-svg";

import type { Answers } from "~/types/answers";
import type { Players } from "~/types/player";
import type { Question } from "~/types/question";
import { Status } from "~/types/status";
import { getQuestionsFromOpenTDB } from "../shared/getQuestions";

interface HostProps {
  firebaseConfig: FirebaseOptions;
}

let firebaseApp: FirebaseApp,
  firebaseAnalytics: Analytics,
  firebaseDatabase: Database,
  firebaseUser: UserCredential;
export default function Host({ firebaseConfig }: HostProps) {
  const [answers, setAnswers] = useState<Answers>();
  const [currentQuestion, setCurrentQuestion] = useState<Question>();
  const [players, setPlayers] = useState<Players>();
  const [questions, setQuestions] = useState<Array<Question>>();
  const [status, setStatus] = useState<Status>(Status.Unset);

  async function getQuestions(): Promise<void> {
    if (questions) return;

    console.log("Getting questions...");

    const urlSearchParams = new URLSearchParams(window.location.search);
    const amount = Number(urlSearchParams.get("amount")) || 10;
    const category = Number(urlSearchParams.get("category"));
    const sessionId = urlSearchParams.get("sessionId");

    const newQuestions: Array<Question> = await getQuestionsFromOpenTDB(
      amount,
      category
    );
    console.log("Questions:", newQuestions);

    setQuestions(newQuestions);
    setCurrentQuestion(newQuestions[0]);

    const updates = {
      [`/sessions/${sessionId}/currentQuestion`]: newQuestions[0].id,
      [`/sessions/${sessionId}/questions`]: newQuestions,
      [`/sessions/${sessionId}/status`]: Status.Active,
    };

    await update(ref(firebaseDatabase), updates);
  }

  async function setupApplication(): Promise<void> {
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

    // Get status
    onValue(
      ref(firebaseDatabase, `/sessions/${sessionId}/status`),
      (snapshot: DataSnapshot) => {
        const status = snapshot.val() as Status;
        console.log("New status:", status);
        setStatus(status);
      }
    );

    // Generate QR code
    const url = `${window.location.origin}/play/player?sessionId=${sessionId}`;
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
    if (status !== Status.Unset) return;
    setupApplication();
  }, [status]);

  useEffect(() => {
    if (status === Status.Unset || questions) return;

    const urlSearchParams = new URLSearchParams(window.location.search);
    const sessionId = urlSearchParams.get("sessionId");

    if (!sessionId) return;

    // Get questions
    const unsubQuestions = onValue(
      ref(firebaseDatabase, `/sessions/${sessionId}/questions`),
      async (snapshot: DataSnapshot) => {
        const newQuestions = snapshot.val() as Array<Question>;
        console.log("New questions:", newQuestions);
        if (!newQuestions) {
          getQuestions();
          return;
        }
        setQuestions(newQuestions);
      }
    );

    return () => {
      unsubQuestions();
    };
  }, [status, questions]);

  useEffect(() => {
    if (status === Status.Unset || !questions) return;

    const urlSearchParams = new URLSearchParams(window.location.search);
    const sessionId = urlSearchParams.get("sessionId");

    if (!sessionId) return;

    // Get current question
    const unsubCurrentQuestion = onValue(
      ref(firebaseDatabase, `/sessions/${sessionId}/currentQuestion`),
      async (snapshot: DataSnapshot) => {
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
  }, [status, questions]);

  useEffect(() => {
    if (status === Status.Unset || !currentQuestion || !questions) return;

    const urlSearchParams = new URLSearchParams(window.location.search);
    const sessionId = urlSearchParams.get("sessionId");

    if (!sessionId) return;

    // Get players
    const unsubPlayers = onValue(
      ref(firebaseDatabase, `/sessions/${sessionId}/players`),
      (snapshot: DataSnapshot) => {
        const newPlayers = snapshot.val() as Players;
        if (!newPlayers) return;
        console.log("New players:", newPlayers);
        setPlayers(newPlayers);
      }
    );

    return () => {
      unsubPlayers();
    };
  }, [status, currentQuestion, questions]);

  useEffect(() => {
    if (status === Status.Unset || !currentQuestion || !players) return;

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
        console.log(
          "New answers:",
          `${Object.keys(newAnswers).length}/${Object.keys(players).length}`,
          newAnswers
        );
        setAnswers(newAnswers);
        // Check if all players have answered
        if (Object.keys(newAnswers).length === Object.keys(players).length) {
          console.log("All players have answered");
          setTimeout(async () => {
            if (currentQuestion.id + 1 >= questions.length) {
              console.log("All questions have been answered. Game over.");
              const updates = {
                [`/sessions/${sessionId}/status`]: Status.Finished,
              };
              await update(ref(firebaseDatabase), updates);
              return;
            }

            console.log("Next question");
            const updates = {
              [`/sessions/${sessionId}/currentQuestion`]:
                questions[currentQuestion.id + 1].id,
            };
            await update(ref(firebaseDatabase), updates);
          }, 4000);
        }
      }
    );

    return () => {
      unsubAnswers();
    };
  }, [status, currentQuestion, players]);

  const questionNumber = useMemo<number>(() => {
    if (!currentQuestion || !questions) return 0;
    return questions.findIndex((q) => q.id === currentQuestion.id) + 1;
  }, [currentQuestion, questions]);

  const allAnswered = useMemo<boolean>(() => {
    if (!players || !currentQuestion || !answers) return false;
    return Object.keys(answers).length === Object.keys(players).length;
  }, [players, currentQuestion, answers]);

  return (
    <>
      {status === Status.Unset ? (
        <h2 className="col-span-4 text-center">Loading...</h2>
      ) : status === Status.Inactive ? (
        <h2 className="col-span-4 text-center">Session Expired!</h2>
      ) : status === Status.Setup ? (
        <h2 className="col-span-4 text-center">Loading...</h2>
      ) : status === Status.Active ? (
        <>
          {currentQuestion ? (
            <>
              <h2 className="col-span-4 text-center">
                Q{questionNumber}: {currentQuestion.question}
              </h2>
              {currentQuestion.answers.map((a: string, id: number) => (
                <span
                  className={`col-span-4 text-justify ${
                    allAnswered && a === currentQuestion.answer
                      ? "text-green-500"
                      : "text-current"
                  }`}
                >
                  {id + 1}: {a}
                </span>
              ))}
            </>
          ) : (
            <h3 className="col-span-4 text-center">Loading..</h3>
          )}
          <div className="fixed bottom-4 left-4">
            <span>
              Answers: {answers ? Object.keys(answers).length : 0}/
              {players ? Object.keys(players).length : 0}
            </span>
          </div>
        </>
      ) : status === Status.Finished ? (
        <h2 className="col-span-4 text-center">Game over!</h2>
      ) : null}

      {status !== Status.Finished ? (
        <div className="fixed bottom-4 right-4" id="qrcode"></div>
      ) : null}
    </>
  );
}
