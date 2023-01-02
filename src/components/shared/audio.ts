export function playAudio(filename: string): void {
  const audio = new Audio(`/assets/audio/${filename}`);
  audio.play();
}
