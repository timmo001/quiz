export interface Player {
  id: string;
  name: string;
}

export interface Players {
  [id: string]: Player;
}
