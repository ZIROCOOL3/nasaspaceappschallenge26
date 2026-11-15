const solarEvent = {
  date: "11 de mayo de 2024",
  instrument: "STEREO-A",
  id: "20240511-AL-013",
  url: "https://ccmc.gsfc.nasa.gov/DONKI/view/Alert/30728/1"
};

const days = [
  [10, "¡Llegamos a Marte!", "Quedan pocos días para cosechar la lechuga. Las plantas crecen con las luces encendidas, pero esas luces gastan energía."],
  [10, "Se acerca una tormenta", "La tripulación tiene tiempo para una tarea. Podés limpiar los paneles que juntan luz del Sol o ponerle otra capa de protección al refugio."],
  [6, "¡Polvo por todos lados!", "Hoy llega menos luz a los paneles. ¿Usás la batería para las plantas o guardás esa energía para mañana?"],
  [5, "¿Entramos o esperamos a la Tierra?", "El Sol lanzó partículas que pueden hacerle daño a la tripulación. Pediste ayuda por radio: el mensaje tarda 10 minutos en llegar a la Tierra y la respuesta tarda otros 10. Tenés que decidir qué hacer mientras tanto.", solarEvent],
  [8, "Vuelve la luz", "La tormenta de polvo se está yendo. Mirá cuántos días de luz les faltan a las lechugas."],
  [10, "El último día en Marte", "Revisá cuánta agua y comida te quedan. ¿Qué necesita la base para terminar la misión?"]
];

const batteryCapacity = 6;
const harvestTarget = 4;

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
  const dose = activeEvent ? (choice.crew === "shelter" ? Math.max(0, 5 - state.shield * 2) : 4) : 0;
  const exposure = state.exposure + dose;
  const shield = Math.min(3, state.shield + Number(choice.crew === "shield"));
  const dust = choice.crew === "maintenance" ? 0 : Math.min(2, state.dust + Number(state.day >= 1 && state.day <= 3));
  const nextDay = state.day + 1;
  let failed = "";
  if (water < 0) failed = "La reserva de agua no alcanzó para completar el turno.";
  else if (food < 0) failed = "La reserva de alimentos no alcanzó para completar el turno.";

  return { deficit, harvest, dose, next: { day: nextDay, battery, water, food, growth, shield, exposure, dust, failed } };
}

const carePlans = [
  { title: "Cuidar las plantas", description: "Encendé las luces y usá la batería si hace falta.", water: "full", grow: true, crew: "maintenance", battery: true },
  { title: "Guardar energía", description: "Apagá las luces. La cosecha tendrá que esperar.", water: "full", grow: false, crew: "maintenance", battery: true },
  { title: "Usar más agua", description: "Reutilizá menos agua para que las plantas tengan luz.", water: "eco", grow: true, crew: "maintenance", battery: false }
];

const preparationPlans = [
  { ...carePlans[0], title: "Limpiar los paneles", description: "Mañana juntarán más energía. Hoy también encendés las luces." },
  { ...carePlans[0], title: "Proteger el refugio", description: "Agregá una capa de protección. El polvo queda en los paneles.", crew: "shield" }
];

const alertPlans = [
  { title: "Entrar al refugio ya", description: "Esperá la respuesta adentro. Ahorrá energía usando más agua y pausando las luces.", water: "eco", grow: false, crew: "shelter", battery: true },
  { title: "Refugiarse y cuidar las plantas", description: "Entrá ya y usá batería para mantener el agua y las luces.", water: "full", grow: true, crew: "shelter", battery: true },
  { title: "Esperar afuera y limpiar", description: "Mañana tendrás más energía, pero la tripulación queda expuesta mientras espera la respuesta.", water: "eco", grow: false, crew: "maintenance", battery: true }
];

function plansForDay(day) {
  if (day === 0) return carePlans.slice(0, 2);
  if (day === 1) return preparationPlans;
  if (day === 3) return alertPlans;
  return carePlans;
}

function startGame() {
  const byId = (id) => document.getElementById(id);
  const form = byId("commands");
  const choices = byId("choices");
  const outcome = byId("outcome");
  let state = newMission();

  function selectedChoice() {
    return plansForDay(state.day)[choices.querySelector("input:checked")?.value];
  }

  function showPreview() {
    const choice = selectedChoice();
    byId("advance").disabled = !choice;
    if (!choice) {
      byId("preview").textContent = "Tocá una opción para ver qué cambiaría.";
      byId("preview").classList.remove("warning");
      return;
    }
    const plan = planTurn(state, choice);
    byId("advance").disabled = Boolean(plan.error);
    const text = plan.error || (plan.next.failed
      ? plan.next.failed
      : `Te quedarían ${plan.next.battery} de batería, ${plan.next.water} de agua y ${plan.next.food} porciones de comida.${plan.harvest ? " ¡La lechuga estará lista!" : ""}${days[state.day][3] ? ` Radiación recibida: ${plan.dose} puntos.` : ""}`);
    byId("preview").textContent = text;
    byId("preview").classList.toggle("warning", Boolean(plan.error || plan.next?.failed));
  }

  function render() {
    const finished = Boolean(state.failed) || state.day === days.length;
    const stats = [
      ["🔋", "Energía", `Batería: ${state.battery} de ${batteryCapacity}`, "Los paneles cargan la batería."],
      ["💧", "Agua y comida", `${Math.max(0, state.water)} de agua · ${Math.max(0, state.food)} porciones`, state.growth === harvestTarget ? "¡Lechuga cosechada!" : `Luz para las plantas: ${state.growth} de ${harvestTarget} días`],
      ["🛡️", "Refugio", `Protección: nivel ${state.shield}`, `Radiación recibida: ${state.exposure} puntos`]
    ];
    byId("stats").replaceChildren(...stats.map(([icon, label, value, detail]) => {
      const card = document.createElement("div");
      const symbol = document.createElement("span");
      symbol.className = "symbol";
      symbol.setAttribute("aria-hidden", "true");
      symbol.textContent = icon;
      const heading = document.createElement("span");
      heading.textContent = label;
      const number = document.createElement("strong");
      number.textContent = value;
      const note = document.createElement("span");
      note.textContent = detail;
      card.append(symbol, heading, number, note);
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
      byId("outcome-detail").textContent = state.failed
        ? `${state.failed} Podés volver a jugar y probar otra decisión.`
        : state.exposure > 3
          ? "¡Llegaste al último sol! La tripulación recibió mucha radiación por esperar afuera. Probá otra vez y fijate cuánto podés bajar ese número."
          : `¡Los cuatro astronautas completaron la misión! Recibieron ${state.exposure} puntos de radiación. ¿Qué cambiarías si volvieras a jugar?`;
      outcome.focus();
      return;
    }

    const [, title, description, event] = days[state.day];
    byId("solar").textContent = `☀ ${solarAvailable(state)} de energía solar`;
    byId("event-title").textContent = title;
    byId("event-description").textContent = description;
    const scene = ["landing", "prepare", "dust", "alert", "sun", "finish"][state.day];
    document.querySelector("main").dataset.scene = scene;
    byId("brief").classList.toggle("alert", Boolean(event));
    byId("scene-icon").textContent = ["👩‍🚀", "🛠️", "🌪️", "📡", "🌤️", "🚩"][state.day];
    const source = byId("event-source");
    source.hidden = !event;
    if (event) {
      source.href = event.url;
      source.title = event.id;
      source.textContent = `Evento real · ${event.date} · ${event.instrument} ↗`;
    }
    choices.replaceChildren(...plansForDay(state.day).map((choice, index) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "plan";
      input.value = index;
      const copy = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = choice.title;
      const description = document.createElement("span");
      description.textContent = choice.description;
      copy.append(title, description);
      const icon = document.createElement("span");
      icon.className = "plan-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = choice.crew === "shield" ? "🛡️"
        : choice.crew === "shelter" ? (choice.grow ? "🌱" : "🏠")
        : event ? "📡"
        : state.day === 1 ? "🧹"
        : choice.water === "eco" ? "💧"
        : choice.grow ? "🌱" : "🔋";
      title.prepend(icon);
      label.append(input, copy);
      return label;
    }));
    showPreview();
  }

  form.addEventListener("change", showPreview);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.failed || state.day >= days.length) return;
    const choice = selectedChoice();
    if (!choice) return;
    const plan = planTurn(state, choice);
    if (plan.error) return;
    const notes = [];
    if (plan.deficit) notes.push(`Usaste ${plan.deficit} de batería.`);
    if (choice.water === "eco") notes.push("Ahorraste energía usando más agua.");
    if (plan.harvest) notes.push("La cosecha sumó 3 porciones a las reservas.");
    else if (!choice.grow && state.growth < harvestTarget) notes.push("Hoy las plantas se quedaron sin luz. La cosecha tiene que esperar.");
    if (choice.crew === "shield") notes.push("Pusiste otra capa de protección en el refugio.");
    if (days[state.day][3]) {
      notes.push(choice.crew === "shelter"
        ? `Esperaste bajo techo. Radiación recibida: ${plan.dose} puntos. Quedó pendiente limpiar los paneles.`
        : `Limpiaste los paneles mientras esperabas afuera. Radiación recibida: ${plan.dose} puntos.`);
      notes.push("La Tierra respondió 20 minutos después. Para entonces ya habías actuado.");
    } else if (choice.crew === "maintenance" && state.dust) {
      notes.push("Limpiaste el polvo de los paneles para mañana.");
    }
    const entry = document.createElement("p");
    entry.textContent = `Sol ${plan.next.day} · ${notes.join(" ") || "Los sistemas funcionaron según lo previsto."}`;
    if (state.day === 0) byId("log").replaceChildren();
    byId("log").prepend(entry);
    byId("last-result").textContent = entry.textContent;
    byId("last-result").hidden = false;
    state = plan.next;
    render();
    if (outcome.hidden) choices.querySelector("input").focus();
  });

  byId("restart").addEventListener("click", () => {
    state = newMission();
    form.reset();
    byId("last-result").hidden = true;
    byId("last-result").textContent = "";
    const intro = document.createElement("p");
    intro.className = "hint";
    intro.textContent = "Acá vas a ver qué cambió con cada decisión.";
    byId("log").replaceChildren(intro);
    render();
    choices.querySelector("input").focus();
  });

  document.querySelector(".top a[href='#fuentes']").addEventListener("click", () => { byId("fuentes").open = true; });
  render();
}

if (typeof document !== "undefined") startGame();
if (typeof module !== "undefined") module.exports = { newMission, planTurn, plansForDay };
