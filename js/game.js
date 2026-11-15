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
  const available = solar + state.battery;
  if (demand > available) {
    return { demand, available, error: `Necesitás ${demand} de energía. El Sol y la batería juntos te dan ${available}.` };
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

  return { solar, demand, deficit, harvest, dose, next: { day: nextDay, battery, water, food, growth, shield, exposure, dust, failed } };
}

const carePlans = [
  { title: "Cuidar las plantas", description: "Encendé las luces y usá la batería si hace falta.", water: "full", grow: true, crew: "maintenance" },
  { title: "Guardar energía", description: "Apagá las luces. La cosecha tendrá que esperar.", water: "full", grow: false, crew: "maintenance" },
  { title: "Usar más agua", description: "Reutilizá menos agua para que las plantas tengan luz.", water: "eco", grow: true, crew: "maintenance" }
];

const preparationPlans = [
  { ...carePlans[0], title: "Limpiar los paneles", description: "Mañana juntarán más energía. Hoy también encendés las luces." },
  { ...carePlans[0], title: "Proteger el refugio", description: "Agregá una capa de protección. El polvo queda en los paneles.", crew: "shield" }
];

const alertPlans = [
  { title: "Entrar al refugio ya", description: "Esperá la respuesta adentro. Ahorrá energía usando más agua y pausando las luces.", water: "eco", grow: false, crew: "shelter" },
  { title: "Refugiarse y cuidar las plantas", description: "Entrá ya y usá batería para mantener el agua y las luces.", water: "full", grow: true, crew: "shelter" },
  { title: "Esperar afuera y limpiar", description: "Mañana tendrás más energía, pero la tripulación queda expuesta mientras espera la respuesta.", water: "eco", grow: false, crew: "maintenance" }
];

function plansForDay(day) {
  if (day === 0) return carePlans.slice(0, 2);
  if (day === 1) return preparationPlans;
  if (day === 3) return alertPlans;
  return carePlans;
}

const sprites = {
  solar: ["alerta-solar", 6],
  dust: ["tormenta-polvo", 6],
  radio: ["senal-radio", 6],
  shelter: ["entrar-refugio", 6],
  panel: ["limpiar-panel", 6],
  lettuce: ["crecer-lechuga", 6],
  savePower: ["luz-invernadero", 6],
  battery: ["bateria-base", 7],
  water: ["tanque-agua", 9],
  food: ["raciones", 4]
};

function sprite(name, frame = 0, from = frame, repeat = false) {
  const [file, frames] = sprites[name];
  const viewport = document.createElement("span");
  viewport.className = "sprite";
  viewport.setAttribute("aria-hidden", "true");
  const strip = document.createElement("img");
  strip.src = "imagenes/" + file + ".png";
  strip.alt = "";
  strip.draggable = false;
  strip.style.width = frames * 100 + "%";
  const position = (index) => "translateX(" + (-index * 100 / frames) + "%)";
  strip.style.transform = position(frame);
  viewport.append(strip);
  const cycle = repeat === "cycle";
  if ((cycle || from !== frame) && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const steps = cycle ? frames : Math.abs(frame - from);
    const duration = cycle ? 1800 : Math.max(240, steps * 160);
    const end = position(cycle ? frames : frame);
    const keyframes = [
      { transform: position(from), easing: "steps(" + steps + ", end)" },
      { transform: end, offset: repeat && !cycle ? duration / (duration + 650) : 1 }
    ];
    if (repeat && !cycle) keyframes.push({ transform: end, offset: 1 });
    strip.animate(keyframes, {
      duration: duration + (repeat && !cycle ? 650 : 0),
      iterations: repeat ? Infinity : 1
    });
  }
  return viewport;
}

function shieldAnimation() {
  const art = document.createElement("span");
  art.className = "shield-animation";
  art.setAttribute("aria-hidden", "true");
  const shield = document.createElement("span");
  shield.className = "shield-layer";
  shield.textContent = "🛡️";
  art.append(sprite("shelter", 5), shield);
  return art;
}

function foodFrame(food) {
  return food <= 0 ? 0 : Math.min(3, Math.ceil(food * 3 / 10));
}

const english = {
  "¡Llegamos a Marte!": "We made it to Mars!",
  "Quedan pocos días para cosechar la lechuga. Las plantas crecen con las luces encendidas, pero esas luces gastan energía.": "The lettuce is almost ready to pick. The plants grow when the lights are on, and the lights use power.",
  "Se acerca una tormenta": "A storm is coming",
  "La tripulación tiene tiempo para una tarea. Podés limpiar los paneles que juntan luz del Sol o ponerle otra capa de protección al refugio.": "The crew has time for one job. You can clean the solar panels or add another layer of protection to the shelter.",
  "¡Polvo por todos lados!": "Dust everywhere!",
  "Hoy llega menos luz a los paneles. ¿Usás la batería para las plantas o guardás esa energía para mañana?": "The panels get less sunlight today. Will you use the battery to keep the plants growing or save that power for tomorrow?",
  "¿Entramos o esperamos a la Tierra?": "Take shelter or wait for Earth?",
  "El Sol lanzó partículas que pueden hacerle daño a la tripulación. Pediste ayuda por radio: el mensaje tarda 10 minutos en llegar a la Tierra y la respuesta tarda otros 10. Tenés que decidir qué hacer mientras tanto.": "The Sun sent out particles that can harm the crew. Your radio message takes 10 minutes to reach Earth, and the reply takes another 10. What will you do while you wait?",
  "Vuelve la luz": "Sunlight is back",
  "La tormenta de polvo se está yendo. Mirá cuántos días de luz les faltan a las lechugas.": "The dust storm is clearing. Check how many days of light the lettuce still needs.",
  "El último día en Marte": "Last day on Mars",
  "Revisá cuánta agua y comida te quedan. ¿Qué necesita la base para terminar la misión?": "Check how much water and food you have left. What does the base need to finish the mission?",
  "Cuidar las plantas": "Keep the plants growing",
  "Encendé las luces y usá la batería si hace falta.": "Turn on the lights and use the battery if you need to.",
  "Guardar energía": "Save power",
  "Apagá las luces. La cosecha tendrá que esperar.": "Turn off the lights. The harvest will have to wait.",
  "Usar más agua": "Use more water",
  "Reutilizá menos agua para que las plantas tengan luz.": "Recycle less water so the plants can have light.",
  "Limpiar los paneles": "Clean the solar panels",
  "Mañana juntarán más energía. Hoy también encendés las luces.": "The panels will make more power tomorrow. Today you also turn on the grow lights.",
  "Proteger el refugio": "Reinforce the shelter",
  "Agregá una capa de protección. El polvo queda en los paneles.": "Add a layer of protection. Dust stays on the panels.",
  "Entrar al refugio ya": "Take shelter now",
  "Esperá la respuesta adentro. Ahorrá energía usando más agua y pausando las luces.": "Wait for the reply inside. Save power by using more water and turning the grow lights off.",
  "Refugiarse y cuidar las plantas": "Take shelter and keep the plants growing",
  "Entrá ya y usá batería para mantener el agua y las luces.": "Go inside now and use the battery to keep the water recycler and grow lights running.",
  "Esperar afuera y limpiar": "Wait outside and clean the panels",
  "Mañana tendrás más energía, pero la tripulación queda expuesta mientras espera la respuesta.": "You'll have more power tomorrow, but the crew is exposed to radiation while they wait for the reply.",
  "La reserva de agua no alcanzó para completar el turno.": "You ran out of water before the end of the turn.",
  "La reserva de alimentos no alcanzó para completar el turno.": "You ran out of food before the end of the turn.",
  "BASE MARTE": "MARS BASE",
  "Fuentes de la misión": "Mission sources",
  "CONTROL DE MISIÓN · MARTE": "MISSION CONTROL · MARS",
  "Base Marte": "Mars Base",
  "¡Vos estás al mando! Guiá a cuatro astronautas durante seis soles. Un sol es un día en Marte.": "You're in charge! Guide four astronauts through six sols. A sol is one day on Mars.",
  "MISIÓN DE SUPERFICIE": "SURFACE MISSION",
  "Soles completados": "Sols completed",
  "Reservas de la base": "Base supplies",
  "Tu próxima decisión": "Your next decision",
  "Ver registro en NASA DONKI ↗": "View the NASA DONKI record ↗",
  "Elegí un plan": "Pick a plan",
  "Si elegís este plan": "If you pick this plan",
  "Hacerlo": "Do it",
  "Lo que pasó": "What happened",
  "Resultados de cada sol": "Results for each sol",
  "Acá vas a ver qué cambió con cada decisión.": "See what changed after each decision.",
  "Volver a jugar": "Play again",
  "Fuentes de la misión y reglas": "Mission sources and rules",
  "El evento de partículas solares es histórico. La exposición y los costos de energía usan puntos del juego.": "The solar particle event really happened. Radiation exposure and energy costs use game points.",
  "NASA DONKI · Notificación de partículas solares del 11 de mayo de 2024": "NASA DONKI · Solar particle event notification from May 11, 2024",
  ". La lechuga de hoja tarda aproximadamente 21 a 28 días en crecer. La misión empieza con plantas cerca de la cosecha.": ". Leaf lettuce takes about 21 to 28 days to grow. You start the mission with plants that are almost ready to pick.",
  "NASA · Energía solar de Opportunity durante la tormenta de polvo": "NASA · Opportunity's solar power during the dust storm",
  "NASA · Cómo llegan los mensajes a Marte": "NASA · How messages reach Mars",
  ". La señal tarda entre 3 y 22 minutos por tramo. Para la escena elegimos 10 minutos de ida y 10 de vuelta.": ". The signal takes 3 to 22 minutes each way. In this scene it takes 10 minutes each way.",
  "Gestioná una base marciana y mantené a salvo a tu tripulación durante seis soles.": "Run a Mars base and keep your crew safe for six sols.",
  "Idioma": "Language"
};

function startGame() {
  const byId = (id) => document.getElementById(id);
  const form = byId("commands");
  const choices = byId("choices");
  const outcome = byId("outcome");
  let state = newMission();
  const languagePicker = byId("language");
  const history = [];
  let language = "es";
  try {
    if (localStorage.getItem("base-marte-language") === "en") language = "en";
  } catch {
    // Language switching still works when storage is unavailable.
  }

  const t = (spanish, english, values = {}) =>
    (language === "en" ? english : spanish).replace(/\{(\w+)\}/g, (_, key) => values[key]);
  const translate = (spanish) => language === "en" ? (english[spanish] ?? spanish) : spanish;

  // Keep the original text nodes so changing languages never replaces icons or links.
  const staticText = [];
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const spanish = node.data.trim();
    if (english[spanish]) staticText.push([node, spanish, node.data]);
  }
  const staticAttributes = [];
  for (const element of document.querySelectorAll("[aria-label], meta[name='description']")) {
    const attribute = element.hasAttribute("aria-label") ? "aria-label" : "content";
    const spanish = element.getAttribute(attribute);
    if (english[spanish]) staticAttributes.push([element, attribute, spanish]);
  }

  function translatePage() {
    document.documentElement.lang = language === "en" ? "en" : "es-AR";
    languagePicker.value = language;
    for (const [node, spanish, original] of staticText) node.data = original.replace(spanish, () => translate(spanish));
    for (const [element, attribute, spanish] of staticAttributes) element.setAttribute(attribute, translate(spanish));
  }


  function selectedChoice() {
    return plansForDay(state.day)[choices.querySelector("input:checked")?.value];
  }

  function showActionPreview(choice, plan) {
    const preview = byId("action-preview");
    let art;
    let message;
    if (choice.crew === "shield") {
      art = shieldAnimation();
      message = t("Protección del refugio: nivel {before} → {after}.",
        "Shelter protection: level {before} → {after}.", { before: state.shield, after: plan.next.shield });
    } else if (choice.crew === "shelter") {
      art = sprite("shelter", 5, 0, true);
      message = t("La tripulación se refugiaría mientras espera la respuesta.", "The crew would take shelter while waiting for the reply.");
    } else if (choice === carePlans[1]) {
      art = sprite("savePower", 5, 0, true);
      message = plan.next.growth === harvestTarget
        ? t("Apagarías las luces para ahorrar energía.", "You would turn off the grow lights to save power.")
        : t("Apagarías las luces para ahorrar energía. La lechuga dejaría de crecer por este sol.",
        "You would turn off the grow lights to save power. The lettuce would pause growing for this sol.");
    } else if (state.day === 1 || state.day === 3 || state.dust) {
      art = sprite("panel", 5, 0, true);
      message = plan.next.day < days.length
        ? t("Paneles limpios. Tendrías {energy} de energía solar el próximo sol.", "Clean panels. You would have {energy} solar power next sol.", { energy: solarAvailable(plan.next) })
        : t("La tripulación limpiaría los paneles.", "The crew would clean the panels.");
    } else if (plan.next.growth > state.growth) {
      art = sprite("lettuce", plan.harvest ? 5 : plan.next.growth, state.growth, true);
      message = plan.harvest
        ? t("Las luces ayudarían a completar la cosecha.", "The grow lights would get the lettuce ready to harvest.")
        : t("Las luces sumarían un día de crecimiento.", "The grow lights would add one day of growth.");
    }
    preview.hidden = !art;
    if (!art) {
      preview.replaceChildren();
      return;
    }
    const text = document.createElement("p");
    text.textContent = message;
    preview.replaceChildren(art, text);
  }

  function showResourcePreview(plan, choice) {
    const panel = byId("resource-preview");
    panel.hidden = !plan?.next;
    if (panel.hidden) {
      byId("action-preview").replaceChildren();
      byId("action-preview").hidden = true;
      return;
    }
    showActionPreview(choice, plan);
    const next = plan.next;
    const charged = next.battery - state.battery;
    const batteryChange = charged > 0 ? t("Cargás +", "Charge +") + charged : charged < 0 ? t("Usás −", "Use −") + plan.deficit : t("Sin cambio", "No change");
    const resources = [
      [t("Batería", "Battery"), "battery", state.battery, next.battery, state.battery, next.battery, batteryChange,
        t("El Sol aporta {solar} · El plan usa {demand} de energía", "Sun supplies {solar} · Plan uses {demand} power", plan)],
      [t("Agua", "Water"), "water", state.water, next.water, state.water, Math.max(0, next.water),
        t("Usás −", "Use −") + (state.water - next.water), ""],
      [t("Comida", "Food"), "food", state.food, next.food, foodFrame(state.food), foodFrame(next.food),
        plan.harvest ? t("Comen −2 · Cosechás +3", "Eat −2 · Harvest +3") : t("Comen −2 porciones", "Eat −2 portions"), ""]
    ];
    const cards = resources.map(([label, art, before, after, beforeFrame, afterFrame, change, detail]) => {
      const card = document.createElement("div");
      card.className = "preview-card";
      const title = document.createElement("strong");
      title.textContent = label;
      const comparison = document.createElement("div");
      comparison.className = "preview-comparison";
      for (const [caption, value, frame] of [[t("Ahora", "Now"), before, beforeFrame], [t("Te queda", "Left"), after, afterFrame]]) {
        const step = document.createElement("div");
        const name = document.createElement("span");
        name.textContent = caption;
        const amount = document.createElement("strong");
        amount.textContent = value < 0 ? t("0 (falta {amount})", "0 (short by {amount})", { amount: Math.abs(value) }) : value;
        step.append(name, sprite(art, frame), amount);
        if (caption === t("Te queda", "Left")) {
          const arrow = document.createElement("span");
          arrow.setAttribute("aria-hidden", "true");
          arrow.textContent = "→";
          comparison.append(arrow);
        }
        comparison.append(step);
      }
      const effect = document.createElement("p");
      effect.className = "preview-effect";
      effect.textContent = change;
      card.append(title, comparison, effect);
      if (detail) {
        const explanation = document.createElement("p");
        explanation.className = "preview-detail";
        explanation.textContent = detail;
        card.append(explanation);
      }
      return card;
    });
    byId("preview-cards").replaceChildren(...cards);
  }

  function showPreview() {
    const choice = selectedChoice();
    byId("advance").disabled = !choice;
    if (!choice) {
      showResourcePreview();
      byId("preview").textContent = t("Tocá una opción para ver qué cambiaría.", "Tap a plan to see what would change.");
      byId("preview").classList.remove("warning");
      return;
    }
    const plan = planTurn(state, choice);
    byId("advance").disabled = Boolean(plan.error);
    showResourcePreview(plan, choice);
    const text = plan.error
      ? t("Necesitás {demand} de energía. El Sol y la batería juntos te dan {available}. Probá otro plan.", "You need {demand} power. The Sun and battery together give you {available}. Try another plan.", plan)
      : translate(plan.next.failed) || [
      plan.harvest ? t("¡La lechuga estará lista!", "The lettuce will be ready!") : "",
      days[state.day][3] ? t("Radiación que recibirías: {dose} puntos.", "Radiation you would receive: {dose} points.", plan) : ""
    ].filter(Boolean).join(" ");
    byId("preview").textContent = text;
    byId("preview").classList.toggle("warning", Boolean(plan.error || plan.next?.failed));
  }

  function render(previous = state, selected, focusOutcome = true) {
    const finished = Boolean(state.failed) || state.day === days.length;
    const stats = [
      ["🔋", t("Energía", "Power"), t(`Batería: ${state.battery} de ${batteryCapacity}`, `Battery: ${state.battery} of ${batteryCapacity}`), t("Los paneles cargan la batería.", "The panels charge the battery.")],
      ["💧", t("Agua y comida", "Water and food"), t(`${Math.max(0, state.water)} de agua · ${Math.max(0, state.food)} porciones`, `${Math.max(0, state.water)} water · ${Math.max(0, state.food)} portions`), state.growth === harvestTarget ? t("¡Lechuga cosechada!", "Lettuce harvested!") : t(`Luz para las plantas: ${state.growth} de ${harvestTarget} días`, `Light for plants: ${state.growth} of ${harvestTarget} days`)],
      ["🛡️", t("Refugio", "Shelter"), t(`Protección: nivel ${state.shield}`, `Protection: level ${state.shield}`), t(`Radiación recibida: ${state.exposure} puntos`, `Radiation received: ${state.exposure} points`)]
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
      const art = document.createElement("span");
      art.className = "resource-art";
      if (icon === "🔋") {
        art.append(sprite("battery", state.battery, previous.battery));
      } else if (icon === "💧") {
        const growthFrame = (growth) => growth === harvestTarget ? 5 : growth;
        art.append(
          sprite("water", Math.max(0, state.water), Math.max(0, previous.water)),
          sprite("food", foodFrame(state.food), foodFrame(previous.food)),
          sprite("lettuce", growthFrame(state.growth), growthFrame(previous.growth))
        );
      } else {
        art.append(symbol);
      }
      card.append(art, heading, number, note);
      return card;
    }));
    byId("day").textContent = finished ? t(`${state.day} de 6 soles`, `${state.day} of 6 sols`) : t(`Sol ${state.day + 1} de 6`, `Sol ${state.day + 1} of 6`);
    byId("progress").value = state.day;
    outcome.hidden = !finished;
    byId("advance").disabled = finished;
    byId("controls").disabled = finished;

    const eventArt = byId("event-art");
    eventArt.hidden = finished || (state.day !== 2 && state.day !== 3);
    eventArt.replaceChildren();
    if (!eventArt.hidden) {
      if (state.day === 2) eventArt.append(sprite("dust", 3, 0, "cycle"));
      else eventArt.append(sprite("solar", 3, 0, "cycle"), sprite("radio", 5, 0, true));
    }

    const ending = byId("mission-ending");
    ending.hidden = !finished;
    form.hidden = finished;
    byId("operations").textContent = finished
      ? t("Resultado de la misión", "Mission result")
      : t("Tu próxima decisión", "Your next decision");

    if (finished) {
      ending.src = state.failed ? "imagenes/mision-interrumpida.png" : "imagenes/mision-cumplida.png";
      ending.alt = state.failed
        ? t("La tripulación revisa el plan dentro de la base marciana.", "The crew reviews the plan inside the Mars base.")
        : t("La tripulación celebra frente a la base marciana.", "The crew celebrates outside the Mars base.");
      byId("turn-result").hidden = true;
      byId("brief").hidden = true;
      byId("solar").textContent = "";
      choices.replaceChildren();
      showResourcePreview();
      byId("preview").textContent = "";
      byId("outcome-title").textContent = state.failed ? t("Misión interrumpida", "Mission stopped") : t("Misión cumplida", "Mission complete");
      byId("outcome-detail").textContent = state.failed
        ? translate(state.failed) + t(" Podés volver a jugar y probar otra decisión.", " Play again and try a different choice.")
        : state.exposure > 3
          ? t("¡Llegaste al último sol! La tripulación recibió mucha radiación por esperar afuera. Probá otra vez y fijate cuánto podés bajar ese número.", "You made it to the last sol! The crew received a lot of radiation while waiting outside. Play again and see how low you can get that number.")
          : t(`¡Los cuatro astronautas completaron la misión! Recibieron ${state.exposure} puntos de radiación. ¿Qué cambiarías si volvieras a jugar?`, `All four astronauts finished the mission! They received ${state.exposure} radiation points. What would you do differently next time?`);
      if (focusOutcome) outcome.focus();
      return;
    }

    byId("brief").hidden = false;
    const [, title, description, event] = days[state.day];
    const solar = solarAvailable(state);
    byId("solar").textContent = t(
      "☀ {solar} del Sol + 🔋 {battery} de batería = {total} de energía disponible",
      "☀ {solar} from the Sun + 🔋 {battery} from the battery = {total} power available",
      { solar, battery: state.battery, total: solar + state.battery }
    );
    byId("event-title").textContent = translate(title);
    byId("event-description").textContent = translate(description);
    const scene = ["landing", "prepare", "dust", "alert", "sun", "finish"][state.day];
    document.querySelector("main").dataset.scene = scene;
    byId("brief").classList.toggle("alert", Boolean(event));
    byId("scene-icon").textContent = ["👩‍🚀", "🛠️", "🌪️", "📡", "🌤️", "🚩"][state.day];
    const source = byId("event-source");
    source.hidden = !event;
    if (event) {
      source.href = event.url;
      source.title = event.id;
      source.textContent = t(`Evento real · ${event.date} · ${event.instrument} ↗`, `Real event · May 11, 2024 · ${event.instrument} ↗`);
    }
    choices.replaceChildren(...plansForDay(state.day).map((choice, index) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "plan";
      input.value = index;
      input.checked = String(index) === selected;
      const copy = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = translate(choice.title);
      const description = document.createElement("span");
      description.textContent = translate(choice.description);
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

  function summarizeTurn({ turnStart, choice, plan }) {
    const notes = [];
    if (plan.deficit) notes.push(t(`Usaste ${plan.deficit} de batería.`, `You used ${plan.deficit} battery power.`));
    if (choice.water === "eco") notes.push(t("Ahorraste energía usando más agua.", "You saved power by using more water."));
    if (plan.harvest) notes.push(t("La cosecha sumó 3 porciones a las reservas.", "The harvest added 3 portions to your supplies."));
    else if (!choice.grow && turnStart.growth < harvestTarget) notes.push(t("Hoy las plantas se quedaron sin luz. La cosecha tiene que esperar.", "The plants went without light today. The harvest will have to wait."));
    if (choice.crew === "shield") notes.push(t("Pusiste otra capa de protección en el refugio.", "You added another layer of protection to the shelter."));
    if (days[turnStart.day][3]) {
      notes.push(choice.crew === "shelter"
        ? t(`Esperaste bajo techo. Radiación recibida: ${plan.dose} puntos. Quedó pendiente limpiar los paneles.`, `You waited inside and received ${plan.dose} radiation points. The panels still need cleaning.`)
        : t(`Limpiaste los paneles mientras esperabas afuera. Radiación recibida: ${plan.dose} puntos.`, `You cleaned the panels while waiting outside and received ${plan.dose} radiation points.`));
      notes.push(t("La Tierra respondió 20 minutos después. Para entonces ya habías actuado.", "Earth replied 20 minutes later. You had already acted by then."));
    } else if (choice.crew === "maintenance" && turnStart.dust) {
      notes.push(t("Limpiaste el polvo de los paneles para mañana.", "You cleaned the dust off the panels for tomorrow."));
    }
    return `Sol ${plan.next.day} · ${notes.join(" ") || t("Los sistemas funcionaron según lo previsto.", "The base ran as planned.")}`;
  }

  function renderLog() {
    const log = byId("log");
    if (!history.length) {
      const intro = document.createElement("p");
      intro.className = "hint";
      intro.textContent = t("Acá vas a ver qué cambió con cada decisión.", "See what changed after each decision.");
      log.replaceChildren(intro);
      byId("last-result").textContent = "";
      return;
    }
    const entries = history.slice().reverse().map((turn) => {
      const entry = document.createElement("p");
      entry.textContent = summarizeTurn(turn);
      return entry;
    });
    log.replaceChildren(...entries);
    byId("last-result").textContent = entries[0].textContent;
  }

  languagePicker.addEventListener("change", () => {
    const selected = choices.querySelector("input:checked")?.value;
    language = languagePicker.value;
    try {
      localStorage.setItem("base-marte-language", language);
    } catch {
      // Keep the selected language for the current page.
    }
    translatePage();
    renderLog();
    render(state, selected, false);
  });

  form.addEventListener("change", showPreview);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.failed || state.day >= days.length) return;
    const choice = selectedChoice();
    if (!choice) return;
    const plan = planTurn(state, choice);
    if (plan.error) return;
    history.push({ turnStart: state, choice, plan });
    renderLog();
    byId("turn-result").hidden = false;
    const resultArt = byId("result-art");
    resultArt.replaceChildren();
    if (choice.crew === "shield") resultArt.append(shieldAnimation());
    else if (choice.crew === "shelter") resultArt.append(sprite("shelter", 5, 0, true));
    else if (choice === carePlans[1]) resultArt.append(sprite("savePower", 5, 0, true));
    else if (choice.crew === "maintenance" && (state.day === 1 || state.day === 3 || state.dust)) {
      resultArt.append(sprite("panel", 5, 0, true));
    }
    if (plan.harvest) resultArt.append(sprite("lettuce", 5, 4, true));
    const previous = state;
    state = plan.next;
    render(previous);
    if (outcome.hidden) choices.querySelector("input").focus();
  });

  byId("restart").addEventListener("click", () => {
    state = newMission();
    form.reset();
    languagePicker.value = language;
    history.length = 0;
    byId("turn-result").hidden = true;
    byId("result-art").replaceChildren();
    renderLog();
    render();
    choices.querySelector("input").focus();
  });

  document.querySelector(".top a[href='#fuentes']").addEventListener("click", () => { byId("fuentes").open = true; });
  translatePage();
  renderLog();
  render();
}

if (typeof document !== "undefined") startGame();
if (typeof module !== "undefined") module.exports = { newMission, planTurn, plansForDay };
