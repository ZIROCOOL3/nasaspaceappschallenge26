const solarEvent = {
  date: "11 de mayo de 2024",
  instrument: "STEREO-A",
  id: "20240511-AL-013",
  url: "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30728/1"
};

const days = [
  [10, "Llegada a Marte", "Revisá los sistemas. Podés dedicar el turno a mantener los paneles o a reforzar el refugio."],
  [10, "Preparativos", "Se acerca una tormenta de polvo. Podés limpiar los paneles para mañana o reforzar el refugio para la alerta solar del sol 4."],
  [6, "Tormenta de polvo", "El polvo bloquea parte de la luz. Decidí qué sistemas mantener con energía solar y qué parte cubrir con la batería."],
  [5, "Alerta de partículas solares", `NASA DONKI registró un evento el ${solarEvent.date} con ${solarEvent.instrument}. En este escenario podés refugiar a la tripulación o salir a mantener los paneles.`, solarEvent],
  [8, "Sale el Sol", "El polvo empieza a despejarse. Revisá cuánta agua queda y cuánta luz necesita la lechuga para estar lista."],
  [10, "Último sol", "Mantené las reservas y a la tripulación a salvo hasta que termine la misión."]
];

const batteryCapacity = 6;
const harvestTarget = 4;
const exposureLimit = 6;

function newMission() {
  return { day: 0, battery: 2, water: 8, food: 10, growth: 0, shield: 1, exposure: 0, dust: 0, failed: "" };
}

function solarAvailable(state) {
  return Math.max(0, days[state.day][0] - state.dust);
}

function planTurn(state, choice) {
  const solar = solarAvailable(state);
  const demand = (choice.water === "full" ? 6 : 4) + (choice.grow ? 2 : 0);
  const deficit = Math.max(0, demand - solar);
  if (deficit > (choice.battery ? state.battery : 0)) {
    return { error: `Necesitás ${demand} de energía y tenés ${solar + (choice.battery ? state.battery : 0)} disponible. Ajustá el consumo o habilitá la batería.` };
  }

  const battery = Math.min(batteryCapacity, state.battery + solar - demand);
  const water = state.water - (choice.water === "full" ? 1 : 2);
  const growth = Math.min(harvestTarget, state.growth + Number(choice.grow));
  const harvest = growth === harvestTarget && state.growth < harvestTarget;
  const food = state.food + (harvest ? 3 : 0) - 2;
  const activeEvent = days[state.day][3];
  const dose = activeEvent ? (choice.crew === "shelter" ? Math.max(0, 5 - state.shield * 2) : 6) : 0;
  const exposure = state.exposure + dose;
  const shield = Math.min(3, state.shield + Number(choice.crew === "shield"));
  const dust = choice.crew === "maintenance" ? 0 : Math.min(2, state.dust + Number(state.day >= 1 && state.day <= 3));
  const nextDay = state.day + 1;
  let failed = "";
  if (water < 0) failed = "La reserva de agua no alcanzó para completar el turno.";
  else if (food < 0) failed = "La reserva de alimentos no alcanzó para completar el turno.";
  else if (exposure >= exposureLimit) failed = "La tripulación alcanzó el límite de exposición del juego.";

  return { deficit, harvest, dose, next: { day: nextDay, battery, water, food, growth, shield, exposure, dust, failed } };
}

function startGame() {
  const byId = (id) => document.getElementById(id);
  const form = byId("commands");
  const crew = byId("crew");
  const outcome = byId("outcome");
  let state = newMission();

  function currentPlan() {
    return planTurn(state, {
      water: byId("water").value,
      grow: byId("grow").value === "on",
      crew: crew.value,
      battery: byId("battery").checked
    });
  }

  function showPreview() {
    const plan = currentPlan();
    byId("advance").disabled = Boolean(plan.error);
    const text = plan.error || (plan.next.failed
      ? `Riesgo de misión. ${plan.next.failed}`
      : `Después de este turno quedarían ${plan.next.battery} de batería, ${plan.next.water} de agua y ${plan.next.food} porciones.${plan.harvest ? " La lechuga estará lista." : ""}${plan.dose ? ` Exposición +${plan.dose} puntos.` : ""}${plan.next.shield > state.shield ? ` El refugio subiría a nivel ${plan.next.shield}.` : ""}`);
    byId("preview").textContent = text;
    byId("preview").classList.toggle("warning", Boolean(plan.error || plan.next?.failed));
  }

  function render() {
    const finished = Boolean(state.failed) || state.day === days.length;
    const stats = [
      ["ϟ", "Batería", `${state.battery} / ${batteryCapacity}`],
      ["◉", "Agua", Math.max(0, state.water)],
      ["✦", "Alimentos", `${Math.max(0, state.food)} porciones`],
      ["♧", "Cosecha", state.growth === harvestTarget ? "Recolectada" : `${state.growth} / ${harvestTarget}`],
      ["⬡", "Blindaje", `Nivel ${state.shield}`],
      ["☀", "Exposición", `${state.exposure} / ${exposureLimit}`]
    ];
    byId("stats").replaceChildren(...stats.map(([icon, label, value]) => {
      const card = document.createElement("div");
      const symbol = document.createElement("span");
      symbol.className = "symbol";
      symbol.setAttribute("aria-hidden", "true");
      symbol.textContent = icon;
      const heading = document.createElement("span");
      heading.textContent = label;
      const number = document.createElement("strong");
      number.textContent = value;
      card.append(symbol, heading, number);
      return card;
    }));
    byId("day").textContent = finished ? `${state.day} de 6 soles` : `Sol ${state.day + 1} de 6`;
    byId("progress").value = state.day;
    outcome.hidden = !finished;
    byId("advance").disabled = finished;
    byId("controls").disabled = finished;

    if (finished) {
      byId("preview").textContent = "";
      byId("outcome-title").textContent = state.failed ? "Misión interrumpida" : "Misión cumplida";
      byId("outcome-detail").textContent = state.failed || "Los cuatro astronautas completaron los seis soles. Revisá en la bitácora cómo influyeron tus decisiones.";
      outcome.focus();
      return;
    }

    const [, title, description, event] = days[state.day];
    byId("solar").textContent = `☀ ${solarAvailable(state)} de energía solar`;
    byId("event-title").textContent = title;
    byId("event-description").textContent = description;
    byId("brief").classList.toggle("alert", Boolean(event));
    const source = byId("event-source");
    source.hidden = !event;
    if (event) {
      source.href = event.url;
      source.title = event.id;
    }
    crew.options[2].disabled = !event;
    crew.options[1].disabled = Boolean(event);
    if (crew.selectedOptions[0].disabled) crew.value = "maintenance";
    if (event) crew.value = "shelter";
    showPreview();
  }

  form.addEventListener("change", showPreview);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.failed || state.day >= days.length) return;
    const plan = currentPlan();
    if (plan.error) return;
    const notes = [];
    if (plan.deficit) notes.push(`Usaste ${plan.deficit} de batería.`);
    if (byId("water").value === "eco") notes.push("Ahorraste energía y consumiste más agua.");
    if (plan.harvest) notes.push("La cosecha sumó 3 porciones a las reservas.");
    else if (byId("grow").value === "off" && state.growth < harvestTarget) notes.push("Pausaste las luces y la cosecha quedó pendiente.");
    if (crew.value === "shield") notes.push(plan.next.shield > state.shield ? "Reforzaste el refugio." : "El refugio ya estaba reforzado al máximo.");
    if (crew.value === "shelter") notes.push(`La tripulación se refugió. Exposición +${plan.dose}; se postergó la limpieza de paneles.`);
    if (crew.value === "maintenance" && state.dust) notes.push("Limpiaste el polvo de los paneles para el próximo sol.");
    const entry = document.createElement("p");
    entry.textContent = `Sol ${plan.next.day} · ${notes.join(" ") || "Los sistemas funcionaron según lo previsto."}`;
    if (state.day === 0) byId("log").replaceChildren();
    byId("log").prepend(entry);
    state = plan.next;
    render();
  });

  byId("restart").addEventListener("click", () => {
    state = newMission();
    form.reset();
    const intro = document.createElement("p");
    intro.className = "hint";
    intro.textContent = "Acá vas a ver qué pasó después de cada decisión.";
    byId("log").replaceChildren(intro);
    render();
    byId("water").focus();
  });

  document.querySelector(".top a[href='#fuentes']").addEventListener("click", () => { byId("fuentes").open = true; });
  render();
}

if (typeof document !== "undefined") startGame();
if (typeof module !== "undefined") module.exports = { newMission, planTurn };
