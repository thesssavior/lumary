import { YoutubeTranscript } from "youtube-transcript";

const videoId = "dQw4w9WgXcQ";
const fetchTranscript = async () => {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    console.log(transcript.length);
}

fetchTranscript();


