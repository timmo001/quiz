import { atom } from "nanostores";

import type { Player } from "~/types/player";

export const players = atom<Map<string, Player>>();
