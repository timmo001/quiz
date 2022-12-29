export interface OpenTDBResponse {
  response_code: number;
  results: Array<OpenTDBQuestion>;
}

export interface OpenTDBQuestion {
  category: string;
  type: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  incorrect_answers: Array<string>;
}

export interface OpenTDBCategoriesResponse {
  trivia_categories: Array<OpenTDBTriviaCategory>;
}

export interface OpenTDBTriviaCategory {
  id: number;
  name: string;
}
