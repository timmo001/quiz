import { atom } from "nanostores";

import type { Question } from "~/types/question";

export const questions = atom<Array<Question>>();
export const currentQuestion = atom<Question>();
