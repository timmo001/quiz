export interface Question {
  id: number;
  category: string;
  type: string;
  difficulty: string;
  question: string;
  answers?: Array<string>;
  answer: string;
  image?: string;
  video?: string;
}
