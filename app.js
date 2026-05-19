const bpmValue = document.querySelector("#bpm-value");
const tempoName = document.querySelector("#tempo-name");
const tapCount = document.querySelector("#tap-count");
const intervalValue = document.querySelector("#interval-value");
const stabilityValue = document.querySelector("#stability-value");
const averageRange = document.querySelector("#average-range");
const averageOutput = document.querySelector("#average-output");
const resetButton = document.querySelector("#reset-button");
const tapButton = document.querySelector("#tap-button");
const pulseDots = [...document.querySelectorAll(".pulse-dot")];
const precisionInputs = [...document.querySelectorAll("input[name='precision']")];

let taps = [];
let beatTimer = null;
let beatIndex = 0;

function selectedPrecision() {
  return Number(precisionInputs.find((input) => input.checked)?.value ?? 0);
}

function averageLimit() {
  return Number(averageRange.value);
}

function tempoLabel(bpm) {
  if (!Number.isFinite(bpm)) return "Waiting for taps";
  if (bpm < 60) return "Largo";
  if (bpm < 76) return "Adagio";
  if (bpm < 108) return "Andante";
  if (bpm < 120) return "Moderato";
  if (bpm < 168) return "Allegro";
  if (bpm < 200) return "Presto";
  return "Prestissimo";
}

function intervals() {
  return taps.slice(1).map((time, index) => time - taps[index]);
}

function filteredIntervals() {
  const recent = intervals().slice(-averageLimit());
  if (recent.length < 3) return recent;

  const sorted = [...recent].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return recent.filter((interval) => Math.abs(interval - median) < median * 0.35);
}

function currentBpm() {
  const cleanIntervals = filteredIntervals();
  if (!cleanIntervals.length) return null;

  const average =
    cleanIntervals.reduce((sum, interval) => sum + interval, 0) / cleanIntervals.length;
  return 60000 / average;
}

function stability() {
  const cleanIntervals = filteredIntervals();
  if (cleanIntervals.length < 3) return "--";

  const mean =
    cleanIntervals.reduce((sum, interval) => sum + interval, 0) / cleanIntervals.length;
  const variance =
    cleanIntervals.reduce((sum, interval) => sum + (interval - mean) ** 2, 0) /
    cleanIntervals.length;
  const coefficient = Math.sqrt(variance) / mean;

  if (coefficient < 0.025) return "Locked";
  if (coefficient < 0.06) return "Steady";
  if (coefficient < 0.11) return "Loose";
  return "Drifting";
}

function updatePulse(bpm) {
  clearInterval(beatTimer);
  pulseDots.forEach((dot) => dot.classList.remove("active"));

  if (!Number.isFinite(bpm)) return;

  const interval = 60000 / bpm;
  beatIndex = 0;

  const pulse = () => {
    pulseDots.forEach((dot, index) => {
      dot.classList.toggle("active", index === beatIndex % pulseDots.length);
    });
    beatIndex += 1;
  };

  pulse();
  beatTimer = setInterval(pulse, interval);
}

function updateDisplay() {
  averageOutput.value = averageLimit();
  tapCount.textContent = taps.length.toString();

  const allIntervals = intervals();
  const lastInterval = allIntervals.at(-1);
  intervalValue.textContent = Number.isFinite(lastInterval)
    ? `${Math.round(lastInterval)} ms`
    : "-- ms";

  const bpm = currentBpm();
  if (!Number.isFinite(bpm)) {
    bpmValue.textContent = "--";
    tempoName.textContent = tempoLabel(null);
    stabilityValue.textContent = "--";
    updatePulse(null);
    return;
  }

  bpmValue.textContent = bpm.toFixed(selectedPrecision());
  tempoName.textContent = tempoLabel(bpm);
  stabilityValue.textContent = stability();
  updatePulse(bpm);
}

function tap() {
  const now = performance.now();
  const lastTap = taps.at(-1);

  if (lastTap && now - lastTap > 2500) {
    taps = [];
  }

  taps.push(now);
  taps = taps.slice(-(averageLimit() + 1));

  tapButton.classList.add("pressed");
  setTimeout(() => tapButton.classList.remove("pressed"), 90);
  updateDisplay();
}

function reset() {
  taps = [];
  updateDisplay();
}

tapButton.addEventListener("click", tap);
resetButton.addEventListener("click", reset);
averageRange.addEventListener("input", updateDisplay);
precisionInputs.forEach((input) => input.addEventListener("change", updateDisplay));

document.addEventListener("keydown", (event) => {
  const isTapKey = event.code === "Space" || event.code === "Enter";
  const isTyping = ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(
    document.activeElement?.tagName
  );

  if (!isTapKey || isTyping) return;

  event.preventDefault();
  tap();
});

updateDisplay();
