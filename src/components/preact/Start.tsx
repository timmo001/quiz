import { useState } from "preact/hooks";

import type { OpenTDBTriviaCategory } from "~/types/opentdb";

interface Options {
  amount: string;
  category: string;
}

interface Props {
  categories: Array<OpenTDBTriviaCategory>;
  defaultOptions: Options;
}

export default function Start({ categories, defaultOptions }: Props) {
  const [options, setOptions] = useState<Options>(defaultOptions);

  function handleOptionChange(key: string, value: string | number): void {
    setOptions({ ...options, [key]: value });
  }

  const { amount, category } = options;

  return (
    <>
      <span class="col-span-1 self-center">Amount</span>
      <input
        className="col-span-3 form-number px-4 py-3 rounded-full bg-transparent border"
        type="number"
        name="amount"
        min="1"
        max="50"
        autocomplete="off"
        value={amount || 10}
        onChange={(event: any) => {
          handleOptionChange(event.target.name, event.target.value);
        }}
      />
      <span class="col-span-1 self-center">Category</span>
      <select
        className="col-span-3 form-select px-4 py-3 rounded-full bg-transparent border"
        name="category"
        value={category}
        onChange={(event: any) => {
          handleOptionChange(event.target.name, event.target.value);
        }}
      >
        <option value={null}>Any</option>
        {categories.map((category: OpenTDBTriviaCategory) => (
          <option value={category.id}>{category.name}</option>
        ))}
      </select>
      <button
        className="col-span-4 bg-primary hover:bg-secondary text-white font-bold py-2 px-4 rounded active:animate-ping"
        onClick={() => {
          location.href = `/play?amount=${amount}&category=${category}`;
        }}
      >
        Start
      </button>
    </>
  );
}
