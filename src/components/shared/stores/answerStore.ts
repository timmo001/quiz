import { atom } from "nanostores";

import type { Answer } from "~/types/answer";

export const answers = atom<Array<Answer>>([]);
