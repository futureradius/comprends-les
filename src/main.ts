import "./style.css";
import { pairToFrench, type Variant } from "./french";
import { checkPhone, displayPhone, generatePhone, phoneSpeech, type PhoneExercise } from "./modes/phone";
import { frenchVoices, speak, speechAvailable } from "./speech";
import { loadSettings, loadStats, recordAttempt, saveSettings, saveStats } from "./storage";

const app = document.querySelector<HTMLDivElement>("#app")!;
let settings = loadSettings();
let stats = loadStats();

const REGION: Record<Variant, string> = { fr: "fr-FR", be: "fr-BE", ch: "fr-CH" };

const MODES = [
  { id: "phone", icon: "📞", title: "Numéros de téléphone", sub: "Phone numbers, said in pairs", ready: true },
  { id: "money", icon: "💶", title: "L'argent", sub: "Prices and amounts", ready: false },
  { id: "train", icon: "🚆", title: "À la gare", sub: "Railway announcements", ready: false },
  { id: "measure", icon: "📐", title: "Les mesures", sub: "Lengths, areas, scales", ready: false },
];

function say(text: string, slow = false) {
  return speak(text, {
    rate: slow ? settings.rate * 0.65 : settings.rate,
    region: REGION[settings.variant],
    voiceName: settings.voiceName,
  });
}

function h(html: string): HTMLElement {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}

// ---------- Home ----------

function renderHome() {
  app.replaceChildren(
    h(`<header class="top"><h1>Comprends-les !</h1>
        <button class="icon-btn" id="open-settings" aria-label="Settings">⚙️</button></header>`),
    h(`<p class="lead">Pick a mode, listen, type what you hear.</p>`),
    h(`<div class="modes">${MODES.map(
      (m) => `<button class="mode" data-mode="${m.id}" ${m.ready ? "" : "disabled"}>
        <span class="mode-icon">${m.icon}</span>
        <span class="mode-text"><strong>${m.title}</strong><small>${m.sub}${m.ready ? "" : " · bientôt"}</small></span>
      </button>`,
    ).join("")}</div>`),
    voiceWarning(),
  );
  app.querySelector("#open-settings")!.addEventListener("click", renderSettings);
  app.querySelector('[data-mode="phone"]')!.addEventListener("click", renderPhone);
}

function voiceWarning(): HTMLElement {
  const el = h(`<p class="warn" hidden></p>`);
  const update = () => {
    if (!speechAvailable()) {
      el.textContent = "This browser has no text-to-speech. Try Chrome on Android.";
      el.hidden = false;
    } else if (frenchVoices().length === 0) {
      el.innerHTML =
        "No French voice found yet. On Android: Settings → System → Languages → Text-to-speech → " +
        "Google engine ⚙️ → Install voice data → Français (download it to use offline).";
      el.hidden = false;
    } else el.hidden = true;
  };
  update();
  // Voices often load a moment after the page.
  setTimeout(update, 800);
  return el;
}

// ---------- Phone mode ----------

function renderPhone() {
  let ex: PhoneExercise;
  let checked = false;

  app.replaceChildren(
    h(`<header class="top"><button class="icon-btn" id="back" aria-label="Back">←</button>
        <h1>📞 Téléphone</h1><span class="score" id="score"></span></header>`),
    h(`<div class="card">
        <div class="play-row">
          <button class="big-btn" id="play">▶ Écouter</button>
          <button class="btn" id="slow" title="Slower">🐢 Lent</button>
        </div>
        <label class="answer-label" for="answer">What number did you hear?</label>
        <input id="answer" class="answer" type="text" inputmode="numeric" autocomplete="off"
               placeholder="06 12 34 56 78" />
        <div id="result" class="result"></div>
        <button class="btn primary wide" id="action">Vérifier</button>
      </div>`),
    h(`<p class="hint">Tip: tap any pair in the result to hear it again on its own.</p>`),
  );

  const input = app.querySelector<HTMLInputElement>("#answer")!;
  const result = app.querySelector<HTMLDivElement>("#result")!;
  const action = app.querySelector<HTMLButtonElement>("#action")!;
  const score = app.querySelector<HTMLSpanElement>("#score")!;

  const updateScore = () => (score.textContent = stats.attempts ? `${stats.perfect}/${stats.attempts}` : "");

  function next() {
    ex = generatePhone({ hardBias: settings.hardBias, weights: stats.misses });
    checked = false;
    input.value = "";
    input.disabled = false;
    result.replaceChildren();
    action.textContent = "Vérifier";
    updateScore();
    say(phoneSpeech(ex, settings.variant));
    input.focus();
  }

  function check() {
    const res = checkPhone(ex, input.value);
    stats = recordAttempt(stats, res);
    saveStats(stats);
    checked = true;
    input.disabled = true;
    action.textContent = "Suivant →";
    updateScore();

    const allRight = res.every((r) => r.correct);
    result.replaceChildren(
      h(`<p class="verdict ${allRight ? "ok" : "ko"}">${allRight ? "Parfait ! 🎉" : `Le numéro : ${displayPhone(ex)}`}</p>`),
      h(`<div class="pairs">${res
        .map(
          (r) => `<button class="pair ${r.correct ? "ok" : "ko"}" data-pair="${r.expected}">
            <span class="digits">${r.expected}</span>
            ${r.correct ? "" : `<span class="given">you: ${r.given || "—"}</span>`}
            <span class="words">${pairToFrench(r.expected, settings.variant)}</span>
          </button>`,
        )
        .join("")}</div>`),
    );
    result.querySelectorAll<HTMLButtonElement>(".pair").forEach((b) =>
      b.addEventListener("click", () => say(pairToFrench(b.dataset.pair!, settings.variant), true)),
    );
  }

  app.querySelector("#back")!.addEventListener("click", () => {
    speechSynthesis.cancel();
    renderHome();
  });
  app.querySelector("#play")!.addEventListener("click", () => say(phoneSpeech(ex, settings.variant)));
  app.querySelector("#slow")!.addEventListener("click", () => say(phoneSpeech(ex, settings.variant), true));
  action.addEventListener("click", () => (checked ? next() : check()));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") checked ? next() : check();
  });
  // Space/Enter on the page after checking moves on (input is disabled then).
  document.onkeydown = (e) => {
    if (checked && e.key === "Enter" && document.activeElement !== action) next();
  };

  next();
}

// ---------- Settings ----------

function renderSettings() {
  const voices = frenchVoices();
  app.replaceChildren(
    h(`<header class="top"><button class="icon-btn" id="back" aria-label="Back">←</button><h1>Réglages</h1><span></span></header>`),
    h(`<div class="card settings">
      <label>Accent / counting
        <select id="variant">
          <option value="fr">France (soixante-dix, quatre-vingt-dix)</option>
          <option value="be">Belgique (septante, nonante) 😌</option>
          <option value="ch">Suisse (septante, huitante, nonante)</option>
        </select>
      </label>
      <label>Speed <output id="rate-out"></output>
        <input id="rate" type="range" min="0.5" max="1.4" step="0.05" />
      </label>
      <label>Extra 70–99 practice <output id="bias-out"></output>
        <input id="bias" type="range" min="0" max="1" step="0.1" />
      </label>
      <label>Voice
        <select id="voice"><option value="">Automatic</option>${voices
          .map((v) => `<option value="${v.name}">${v.name} (${v.lang})</option>`)
          .join("")}</select>
      </label>
      <button class="btn wide" id="test">🔊 Test : quatre-vingt-dix-sept</button>
      <button class="btn wide danger" id="reset">Reset my stats</button>
    </div>`),
  );

  const $ = <T extends HTMLElement>(id: string) => app.querySelector<T>(`#${id}`)!;
  const variant = $<HTMLSelectElement>("variant");
  const rate = $<HTMLInputElement>("rate");
  const bias = $<HTMLInputElement>("bias");
  const voice = $<HTMLSelectElement>("voice");

  variant.value = settings.variant;
  rate.value = String(settings.rate);
  bias.value = String(settings.hardBias);
  voice.value = settings.voiceName ?? "";

  const sync = () => {
    settings = {
      variant: variant.value as Variant,
      rate: Number(rate.value),
      hardBias: Number(bias.value),
      voiceName: voice.value || undefined,
    };
    $("rate-out").textContent = `${settings.rate.toFixed(2)}×`;
    $("bias-out").textContent = `${Math.round(settings.hardBias * 100)}%`;
    saveSettings(settings);
  };
  sync();
  [variant, rate, bias, voice].forEach((el) => el.addEventListener("input", sync));

  $("test").addEventListener("click", () => say(pairToFrench("97", settings.variant)));
  $("reset").addEventListener("click", () => {
    if (confirm("Reset all your phone-mode stats?")) {
      stats = { misses: {}, attempts: 0, perfect: 0 };
      saveStats(stats);
    }
  });
  $("back").addEventListener("click", renderHome);
}

renderHome();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
