export function ttsRead(apiKey: string, text: string): void {
  const url = `https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${apiKey}`;
  const data = {
    input: {
      text: text,
    },
    voice: {
      languageCode: "en-gb",
      ssmlGender: "FEMALE",
    },
    audioConfig: {
      audioEncoding: "MP3",
    },
  };
  const otherparam = {
    headers: {
      "content-type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(data),
    method: "POST",
  };
  fetch(url, otherparam)
    .then((data) => {
      return data.json();
    })
    .then((res) => {
      console.log(res);
      const audio = new Audio(`data:audio/mp3;base64,${res.audioContent}`);
      audio.play();
    })
    .catch((error) => {
      console.error(error);
    });
}
