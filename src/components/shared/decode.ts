export function decode(str: string): string {
  let txt = new DOMParser().parseFromString(str, "text/html");
  return txt.documentElement.textContent;
}
