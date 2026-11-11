/** Thin wrapper around the browser / Android text-to-speech engine. */

let voices: SpeechSynthesisVoice[] = [];

function loadVoices() {
  voices = speechSynthesis.getVoices();
}

export function speechAvailable(): boolean {
  return "speechSynthesis" in window;
}

if (speechAvailable()) {
  loadVoices();
  speechSynthesis.addEventListener("voiceschanged", loadVoices);
}

export function frenchVoices(): SpeechSynthesisVoice[] {
  return voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("fr"));
}

/** Prefer a voice matching the region (fr-FR, fr-BE, fr-CH), then any French voice. */
function pickVoice(region: string, preferredName?: string): SpeechSynthesisVoice | undefined {
  const fr = frenchVoices();
  return (
    fr.find((v) => v.name === preferredName) ??
    fr.find((v) => v.lang.replace("_", "-").toLowerCase() === region.toLowerCase()) ??
    fr.find((v) => v.lang.toLowerCase().includes("fr-fr")) ??
    fr[0]
  );
}

export function speak(text: string, opts: { rate: number; region: string; voiceName?: string }): Promise<void> {
  return new Promise((resolve) => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(opts.region, opts.voiceName);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? opts.region;
    u.rate = opts.rate;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}
