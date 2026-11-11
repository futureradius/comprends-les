import "./style.css";
import { pairToFrench, type Variant } from "./french";
import { checkPhone, displayPhone, generatePhone, phoneSpeech, type PhoneExercise } from "./modes/phone";
import { currentPair, startStep, submitStep, type StepState } from "./modes/phoneStep";
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
  document.onkeydown = null;
  app.replaceChildren(
    h(`<header class="top"><button class="icon-btn" id="back" aria-label="Back">←</button>
        <h1>📞 Téléphone</h1><span class="score" id="score"></span></header>`),
    h(`<div class="segmented" role="tablist" aria-label="Exercise style">
        <button role="tab" data-style="step">Pas à pas<small>one pair at a time</small></button>
        <button role="tab" data-style="whole">Numéro entier<small>the whole number</small></button>
      </div>`),
    h(`<div id="exercise"></div>`),
  );

  const area = app.querySelector<HTMLDivElement>("#exercise")!;
  const tabs = app.querySelectorAll<HTMLButtonElement>("[data-style]");
  const show = () => {
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.style === settings.phoneStyle)));
    speechSynthesis.cancel();
    document.onkeydown = null;
    (settings.phoneStyle === "step" ? renderPhoneStep : renderPhoneWhole)(area);
  };
  tabs.forEach((t) =>
    t.addEventListener("click", () => {
      if (settings.phoneStyle === t.dataset.style) return;
      settings = { ...settings, phoneStyle: t.dataset.style as "step" | "whole" };
      saveSettings(settings);
      show();
    }),
  );
  app.querySelector("#back")!.addEventListener("click", () => {
    speechSynthesis.cancel();
    document.onkeydown = null;
    renderHome();
  });
  show();
}

function updateScore() {
  const el = app.querySelector("#score");
  if (el) el.textContent = stats.attempts ? `${stats.perfect}/${stats.attempts}` : "";
}

function newPhone() {
  return generatePhone({ hardBias: settings.hardBias, weights: stats.misses });
}

/** Grid of pairs with their French spelling; tap one to hear it slowly. */
function pairsGrid(res: { expected: string; given?: string; correct: boolean }[], missTone = "ko"): HTMLElement {
  const grid = h(`<div class="pairs">${res
    .map(
      (r) => `<button class="pair ${r.correct ? "ok" : missTone}" data-pair="${r.expected}">
        <span class="digits">${r.expected}</span>
        ${r.correct || r.given === undefined ? "" : `<span class="given">you: ${r.given || "—"}</span>`}
        <span class="words">${pairToFrench(r.expected, settings.variant)}</span>
      </button>`,
    )
    .join("")}</div>`);
  grid.querySelectorAll<HTMLButtonElement>(".pair").forEach((b) =>
    b.addEventListener("click", () => say(pairToFrench(b.dataset.pair!, settings.variant), true)),
  );
  return grid;
}

// --- Step by step: one pair, wait for the right answer, continue ---

function renderPhoneStep(area: HTMLElement) {
  let st: StepState;
  let busy = false; // ignore typing while a "correct" transition is running

  area.replaceChildren(
    h(`<div class="card">
        <div class="slots" id="slots" aria-live="polite"></div>
        <p class="feedback" id="feedback">&nbsp;</p>
        <input id="answer" class="answer" type="text" inputmode="numeric" maxlength="2"
               autocomplete="off" aria-label="Type the pair you heard" placeholder="··" />
        <div class="play-row">
          <button class="btn grow" id="repeat">🔁 Répéter</button>
          <button class="btn grow" id="slow">🐢 Lent</button>
        </div>
        <div id="summary" class="result"></div>
      </div>`),
    h(`<p class="hint">Type the 2 digits you hear. It checks automatically. Wrong? You'll hear it again, slower.</p>`),
  );

  const slots = area.querySelector<HTMLDivElement>("#slots")!;
  const feedback = area.querySelector<HTMLParagraphElement>("#feedback")!;
  const input = area.querySelector<HTMLInputElement>("#answer")!;
  const summary = area.querySelector<HTMLDivElement>("#summary")!;
  const repeat = area.querySelector<HTMLButtonElement>("#repeat")!;
  const slow = area.querySelector<HTMLButtonElement>("#slow")!;

  const pairText = (p: string) => pairToFrench(p, settings.variant);
  const sayCurrent = (slowly = false) => say(pairText(currentPair(st)), slowly);

  function drawSlots() {
    slots.replaceChildren(
      ...st.ex.pairs.map((p, i) => {
        let cls = "slot";
        let text = "··";
        if (i < st.index) {
          cls += st.firstTry[i] ? " ok" : " retry";
          text = p;
        } else if (i === st.index && !st.done) {
          cls += " current";
          if (st.revealed) text = p;
        }
        return h(`<span class="${cls}">${text}</span>`);
      }),
    );
  }

  function setFeedback(html: string, tone: "" | "ok" | "ko" = "") {
    feedback.className = `feedback ${tone}`;
    feedback.innerHTML = html;
  }

  function next() {
    st = startStep(newPhone());
    busy = false;
    summary.replaceChildren();
    input.hidden = false;
    slots.hidden = false;
    repeat.hidden = slow.hidden = false;
    input.value = "";
    setFeedback("Écoute… 👂");
    drawSlots();
    updateScore();
    input.focus();
    sayCurrent();
  }

  function finish() {
    const results = st.ex.pairs.map((p, i) => ({ expected: p, correct: st.firstTry[i] }));
    stats = recordAttempt(stats, results);
    saveStats(stats);
    updateScore();
    const first = st.firstTry.filter(Boolean).length;

    input.hidden = true;
    repeat.hidden = slow.hidden = true;
    slots.hidden = true;
    const msg =
      first === 5 ? "Parfait ! 🎉 All five on the first try."
      : first >= 3 ? `${first}/5 on the first try. Bien joué !`
      : `${first}/5 on the first try. Courage, it gets easier 💪`;
    setFeedback(msg, first >= 3 ? "ok" : "");
    const all = h(`<div class="summary-actions">
        <button class="btn grow" id="hear-all">🔊 En entier</button>
        <button class="btn primary grow" id="next">Suivant →</button>
      </div>`);
    summary.replaceChildren(pairsGrid(results, "retry"), all);
    all.querySelector("#hear-all")!.addEventListener("click", () => say(phoneSpeech(st.ex, settings.variant)));
    const nextBtn = all.querySelector<HTMLButtonElement>("#next")!;
    nextBtn.addEventListener("click", next);
    nextBtn.focus();
  }

  function submit() {
    if (busy || st.done) return;
    const expected = currentPair(st);
    const [s, out] = submitStep(st, input.value);
    st = s;

    if (out === "correct" || out === "done") {
      busy = true;
      drawSlots();
      setFeedback(`✓ ${expected} · <em>${pairText(expected)}</em>`, "ok");
      setTimeout(() => {
        input.value = "";
        busy = false;
        if (out === "done") finish();
        else sayCurrent();
      }, 650);
      return;
    }

    // Wrong: shake, clear, replay slowly. After MAX_TRIES the answer is shown.
    input.classList.remove("shake");
    void input.offsetWidth; // restart the animation
    input.classList.add("shake");
    const typed = input.value;
    input.value = "";
    drawSlots();
    if (out === "reveal") {
      setFeedback(`It's <strong>${expected}</strong> · <em>${pairText(expected)}</em>. Type it to continue.`, "ko");
    } else {
      setFeedback(`Not ${typed}. Listen again…`, "ko");
    }
    sayCurrent(true);
  }

  input.addEventListener("animationend", () => input.classList.remove("shake"));
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 2);
    if (input.value.length === 2) submit();
  });
  repeat.addEventListener("click", () => {
    sayCurrent();
    input.focus();
  });
  slow.addEventListener("click", () => {
    sayCurrent(true);
    input.focus();
  });
  document.onkeydown = (e) => {
    if (st.done && e.key === "Enter") next();
  };

  next();
}

// --- Whole number: hear all five pairs, type the full number ---

function renderPhoneWhole(area: HTMLElement) {
  let ex: PhoneExercise;
  let checked = false;

  area.replaceChildren(
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

  const input = area.querySelector<HTMLInputElement>("#answer")!;
  const result = area.querySelector<HTMLDivElement>("#result")!;
  const action = area.querySelector<HTMLButtonElement>("#action")!;

  function next() {
    ex = newPhone();
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
      pairsGrid(res),
    );
  }

  area.querySelector("#play")!.addEventListener("click", () => say(phoneSpeech(ex, settings.variant)));
  area.querySelector("#slow")!.addEventListener("click", () => say(phoneSpeech(ex, settings.variant), true));
  action.addEventListener("click", () => (checked ? next() : check()));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") checked ? next() : check();
  });
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
      phoneStyle: settings.phoneStyle,
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
