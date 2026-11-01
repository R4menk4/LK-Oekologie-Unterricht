(() => {
  "use strict";

  const STORAGE_KEY = "tangwald-nahrungsnetz-v3";
  const imageFiles = [
    "riesentang.png", "phytoplankton.png", "seeigel.png", "abalone.png", "zooplankton.png",
    "kelp-fisch.png", "sonnenblumen-seestern.png", "seeotter.png", "detritivoren.png", "tangdetritus.png"
  ];

  const organisms = [
    { id: "kelp", name: "Riesentang", sprite: 0, role: "producer", trophic: "Produzent", zone: "producer" },
    { id: "phyto", name: "Phytoplankton", sprite: 1, role: "producer", trophic: "Produzent", zone: "producer" },
    { id: "urchin", name: "Seeigel", sprite: 2, role: "consumer", trophic: "Konsument 1. Ordnung", zone: "herbivore" },
    { id: "abalone", name: "Abalone", sprite: 3, role: "consumer", trophic: "Konsument 1. Ordnung", zone: "herbivore" },
    { id: "zoo", name: "Zooplankton", sprite: 4, role: "consumer", trophic: "Konsument 1. Ordnung", zone: "herbivore" },
    { id: "fish", name: "Kelp-Fisch", sprite: 5, role: "consumer", trophic: "Konsument 2. Ordnung", zone: "predator" },
    { id: "star", name: "Sonnenblumen-Seestern", sprite: 6, role: "consumer", trophic: "Konsument 2. Ordnung", zone: "predator" },
    { id: "otter", name: "Seeotter", sprite: 7, role: "consumer", trophic: "Konsument 2. Ordnung", zone: "predator" }
  ];
  const organismById = Object.fromEntries(organisms.map(o => [o.id, o]));
  const displayOrganisms = ["urchin", "kelp", "otter", "phyto", "abalone", "fish", "star", "zoo"].map(id => organismById[id]);

  const foodInfo = {
    kelp: "Riesentang dient Seeigeln und Abalonen als Nahrung.",
    phyto: "Phytoplankton dient Zooplankton als Nahrung.",
    urchin: "Seeigel fressen Riesentang und werden von Seesternen und Seeottern gefressen.",
    abalone: "Abalonen weiden Riesentang ab und werden von Seeottern gefressen.",
    zoo: "Zooplankton frisst Phytoplankton und dient dem Kelp-Fisch als Nahrung.",
    fish: "Der Kelp-Fisch frisst Zooplankton.",
    star: "Der Sonnenblumen-Seestern frisst Seeigel.",
    otter: "Der Seeotter frisst Seeigel und Abalonen."
  };

  const correctEdges = [
    ["kelp", "urchin"], ["kelp", "abalone"], ["phyto", "zoo"],
    ["zoo", "fish"], ["urchin", "star"], ["urchin", "otter"], ["abalone", "otter"]
  ].map(([a,b]) => `${a}>${b}`);

  const defaultState = {
    step: 0, done: [false, false, false, false, false, false], roles: {}, trophic: {},
    placements: {}, placementDone: false, edges: [], processes: {}, definitions: {},
    definitionsDone: false, decomposition: {}, statements: []
  };

  const loaded = loadState();
  const state = Object.assign({}, defaultState, loaded, {
    done: Array.isArray(loaded.done) ? defaultState.done.map((v,i) => loaded.done[i] ?? v) : [...defaultState.done],
    roles: loaded.roles || {}, trophic: loaded.trophic || {}, placements: loaded.placements || {},
    edges: loaded.edges || [], processes: loaded.processes || {}, definitions: loaded.definitions || {},
    decomposition: loaded.decomposition || {}, statements: loaded.statements || []
  });

  const el = id => document.getElementById(id);
  const taskArea = el("taskArea");
  const stepNav = el("stepNav");
  const steps = [
    { short: "Start", title: "Vom Tangwald zum Nahrungsnetz", lead: "Untersuche, wie Organismen durch Nahrung, Stoffe und Energie miteinander verbunden sind.", render: renderStart },
    { short: "Rollen", title: "Produzenten und Konsumenten", lead: "Ordne die Organismen danach, ob sie organische Stoffe selbst aufbauen oder andere Organismen als Nahrung nutzen.", render: renderRoles },
    { short: "Ebenen", title: "Trophieebenen zuordnen", lead: "Bestimme die Ernährungsposition der Organismen anhand der angegebenen Nahrungsbeziehungen.", render: renderTrophic },
    { short: "Netz", title: "Nahrungsbeziehungen verbinden", lead: "Ordne die Organismen in die Ebenen ein und verbinde sie anschließend zu einem Nahrungsnetz.", render: renderNetwork },
    { short: "Prozesse", title: "Photosynthese und Zellatmung", lead: "Markiere, welche Stoffwechselprozesse in den verschiedenen Organismen stattfinden.", render: renderProcesses },
    { short: "Abbau", title: "Detritus und Destruenten", lead: "Erschließe die Fachbegriffe und ergänze anschließend den Weg abgestorbener Biomasse.", render: renderDecomposition }
  ];

  function loadState() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } }
  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function isUnlocked(index) { return index === 0 || state.done[index - 1]; }
  function setDone(index, value = true) { state.done[index] = value; saveState(); renderChrome(); }
  function nameOf(id) { return organismById[id]?.name || id; }
  function sprite(index, extra = "") { return `<img class="organism-art ${extra}" src="assets/organismen/${imageFiles[index]}" alt="">`; }
  function feedback(title, text, warn = false) { return `<div class="feedback${warn ? " warn" : ""}" role="${warn ? "alert" : "status"}"><strong>${title}</strong>${text}</div>`; }
  function nextButton(label = "Weiter") { return `<button class="primary next-step" type="button">${label} →</button>`; }
  function bindNext() { document.querySelectorAll(".next-step").forEach(button => button.addEventListener("click", () => setStep(Math.min(steps.length - 1, state.step + 1)))); }

  function renderChrome() {
    stepNav.innerHTML = steps.map((step, index) => {
      const unlocked = isUnlocked(index);
      return `<button class="step-tab${state.step === index ? " active" : ""}${state.done[index] ? " done" : ""}${unlocked ? "" : " locked"}" data-step="${index}" type="button" ${unlocked ? "" : "disabled"}><span>0${index + 1}${state.done[index] ? " · ERLEDIGT" : unlocked ? "" : " · GESPERRT"}</span><b>${step.short}</b></button>`;
    }).join("");
    stepNav.querySelectorAll("button:not(:disabled)").forEach(button => button.addEventListener("click", () => setStep(Number(button.dataset.step))));
    el("progressText").textContent = `${state.step + 1} von ${steps.length}`;
    el("progressBar").style.width = `${(state.step + 1) / steps.length * 100}%`;
    el("eyebrow").textContent = `Mission 0${state.step + 1}`;
    el("stepTitle").textContent = steps[state.step].title;
    el("stepLead").textContent = steps[state.step].lead;
    el("stepStatus").textContent = state.done[state.step] ? "Erledigt" : "Noch offen";
    el("stepStatus").classList.toggle("done", state.done[state.step]);
  }

  function setStep(index) {
    if (!isUnlocked(index)) return;
    state.step = index; saveState(); renderChrome(); taskArea.innerHTML = ""; steps[index].render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderStart() {
    taskArea.innerHTML = `<div class="hero-grid"><img class="hero-image" src="assets/tangwald-detritus.png" alt="Tangwald mit lebendem und abgestorbenem Riesentang, kleinen Bodentieren und Fischresten"><div class="hero-copy"><p class="eyebrow">Ausgangsfrage</p><h2>Was geschieht mit der Biomasse im Tangwald?</h2><p>Du ordnest zunächst die lebenden Organismen, baust anschließend ihre Nahrungsbeziehungen auf und ergänzt zuletzt den Abbau abgestorbener Biomasse.</p><ul><li>Produzenten und Konsumenten unterscheiden</li><li>Trophieebenen aus Ernährungsangaben ableiten</li><li>Organismen anordnen und mit Nahrungspfeilen verbinden</li><li>Stoffwechselprozesse und Abbauwege zuordnen</li></ul><div class="action-row"><button id="startButton" class="primary" type="button">Lernweg beginnen →</button></div></div></div>`;
    el("startButton").addEventListener("click", () => { setDone(0); setStep(1); });
  }

  function renderRoles() {
    taskArea.innerHTML = `<p class="instruction"><strong>Ordne zu:</strong> Produzenten stellen mithilfe der Photosynthese organische Stoffe her. Konsumenten nehmen organische Stoffe mit ihrer Nahrung auf.</p><div class="card-grid">${displayOrganisms.map(o => `<article class="organism-card">${sprite(o.sprite)}<div class="card-body"><span class="card-name">${o.name}</span><div class="card-controls" role="group" aria-label="${o.name} zuordnen"><button class="choice-button${state.roles[o.id] === "producer" ? " selected" : ""}" data-id="${o.id}" data-value="producer" type="button">Produzent</button><button class="choice-button${state.roles[o.id] === "consumer" ? " selected" : ""}" data-id="${o.id}" data-value="consumer" type="button">Konsument</button></div></div></article>`).join("")}</div><div class="action-row"><button id="checkRoles" class="primary" type="button">Zuordnung prüfen</button></div><div id="roleFeedback"></div>`;
    document.querySelectorAll(".choice-button").forEach(button => button.addEventListener("click", () => { state.roles[button.dataset.id] = button.dataset.value; saveState(); button.closest(".card-controls").querySelectorAll("button").forEach(b => b.classList.toggle("selected", b === button)); }));
    el("checkRoles").addEventListener("click", () => {
      const unanswered = organisms.filter(o => !state.roles[o.id]); const wrong = organisms.filter(o => state.roles[o.id] && state.roles[o.id] !== o.role);
      if (unanswered.length) el("roleFeedback").innerHTML = feedback("Noch nicht vollständig", `Ordne noch ${unanswered.length} Organismus${unanswered.length === 1 ? "" : "men"} zu.`, true);
      else if (wrong.length) el("roleFeedback").innerHTML = feedback("Prüfe deine Auswahl", `${wrong.length} Zuordnung${wrong.length === 1 ? " ist" : "en sind"} noch nicht richtig.`, true);
      else { setDone(1); el("roleFeedback").innerHTML = feedback("Richtig zugeordnet", "Riesentang und Phytoplankton sind Produzenten. Die übrigen dargestellten Organismen sind Konsumenten.") + `<div class="action-row">${nextButton("Trophieebenen bestimmen")}</div>`; bindNext(); }
    });
  }

  function renderTrophic() {
    const options = ["", "Produzent", "Konsument 1. Ordnung", "Konsument 2. Ordnung"];
    taskArea.innerHTML = `<p class="instruction"><strong>Trophieebenen</strong> beschreiben die Ernährungsposition im Nahrungsnetz. Nutze die Ernährungsangaben für deine Zuordnung. Diese Angaben brauchst du anschließend für den Aufbau des Nahrungsnetzes.</p><div class="table-wrap"><table class="learning-table"><thead><tr><th>Organismus und Ernährungsangabe</th><th>Trophieebene</th></tr></thead><tbody>${displayOrganisms.map(o => `<tr><td><span class="mini-organism">${sprite(o.sprite)}<span><strong>${o.name}</strong><small>${foodInfo[o.id]}</small></span></span></td><td><select data-id="${o.id}" aria-label="Trophieebene für ${o.name}">${options.map(option => `<option value="${option}"${state.trophic[o.id] === option ? " selected" : ""}>${option || "Bitte auswählen"}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table></div><p class="hint">Die Einordnung gilt für das dargestellte, vereinfachte Nahrungsnetz. Bei anderer Nahrung kann ein Organismus einer anderen Konsumentenordnung angehören.</p><div class="action-row"><button id="checkTrophic" class="primary" type="button">Trophieebenen prüfen</button></div><div id="trophicFeedback"></div>`;
    document.querySelectorAll("select[data-id]").forEach(select => select.addEventListener("change", () => { state.trophic[select.dataset.id] = select.value; saveState(); }));
    el("checkTrophic").addEventListener("click", () => {
      const unanswered = organisms.filter(o => !state.trophic[o.id]); const wrong = organisms.filter(o => state.trophic[o.id] && state.trophic[o.id] !== o.trophic);
      if (unanswered.length || wrong.length) el("trophicFeedback").innerHTML = feedback("Prüfe die Zuordnung", `${unanswered.length ? `${unanswered.length} Zuordnung${unanswered.length === 1 ? " fehlt" : "en fehlen"}. ` : ""}${wrong.length ? `${wrong.length} Zuordnung${wrong.length === 1 ? " ist" : "en sind"} noch nicht richtig.` : ""}`, true);
      else { setDone(2); el("trophicFeedback").innerHTML = feedback("Richtig eingeordnet", "Produzenten bilden die erste Trophieebene. Konsumenten 1. Ordnung ernähren sich von Produzenten; Konsumenten 2. Ordnung nutzen diese wiederum als Nahrung.") + `<div class="action-row">${nextButton("Nahrungsnetz aufbauen")}</div>`; bindNext(); }
    });
  }

  function networkCard(o) {
    return `<article class="network-node" draggable="true" data-id="${o.id}"><button class="info-button" data-info="${o.id}" type="button" aria-expanded="false" aria-label="Nahrungsinformation zu ${o.name} anzeigen">${sprite(o.sprite)}</button><button class="connect-button${state.placementDone ? "" : " inactive"}" data-connect="${o.id}" type="button" ${state.placementDone ? "" : "disabled"}>${o.name}</button><div class="node-info" id="info-${o.id}" hidden>${foodInfo[o.id]}</div></article>`;
  }

  function renderNetwork() {
    const zones = [{ id: "predator", label: "Räuberische Konsumenten" }, { id: "herbivore", label: "Pflanzenfressende Konsumenten" }, { id: "producer", label: "Produzenten" }];
    const unplaced = displayOrganisms.filter(o => !state.placements[o.id]);
    taskArea.innerHTML = `<p class="instruction"><strong>Schritt 1:</strong> Ziehe alle Organismen in die passende Ebene. Die Produzenten stehen unten. Klicke auf ein Bild, wenn du die Nahrungsinformation erneut benötigst.</p><div class="network-layout"><div><section class="organism-tray" aria-label="Noch nicht eingeordnete Organismen"><h2>Noch einzuordnen</h2><div class="tray-items">${unplaced.length ? unplaced.map(networkCard).join("") : `<span class="hint">Alle Organismen sind eingeordnet.</span>`}</div></section><div id="networkBoard" class="network-board"><svg id="networkSvg" class="network-svg" aria-hidden="true"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#173f3a"></path></marker></defs></svg><div class="network-stages">${zones.map(zone => `<section class="trophic-zone zone-${zone.id}" data-zone="${zone.id}"><h2>${zone.label}</h2><div class="zone-items">${organisms.filter(o => state.placements[o.id] === zone.id).map(networkCard).join("")}</div></section>`).join("")}</div></div></div><aside class="network-side"><div><h2>${state.placementDone ? "Schritt 2: Pfeile" : "Anordnung prüfen"}</h2><p id="selectionText" class="hint">${state.placementDone ? "Wähle zuerst die Nahrung aus, indem du auf den <strong>Namen</strong> klickst, und anschließend auf den Namen des Konsumenten." : "Verschiebe Karten bei Bedarf zwischen den Ebenen."}</p><div id="edgeList" class="edge-list"></div></div><div class="action-row">${state.placementDone ? `<button id="checkNetwork" class="primary" type="button">Netz prüfen</button><button id="clearNetwork" class="secondary" type="button">Pfeile löschen</button>` : `<button id="checkPlacement" class="primary" type="button">Anordnung prüfen</button>`}</div><div id="networkFeedback"></div></aside></div>`;
    bindDragAndDrop(); bindInfoButtons();
    if (!state.placementDone) {
      el("checkPlacement").addEventListener("click", () => {
        const missing = organisms.filter(o => !state.placements[o.id]); const wrong = organisms.filter(o => state.placements[o.id] && state.placements[o.id] !== o.zone);
        if (missing.length || wrong.length) el("networkFeedback").innerHTML = feedback("Anordnung noch nicht richtig", `${missing.length ? `${missing.length} Organismus${missing.length === 1 ? " ist" : "men sind"} noch nicht eingeordnet. ` : ""}${wrong.length ? `${wrong.length} Karte${wrong.length === 1 ? " liegt" : "n liegen"} noch in der falschen Ebene.` : ""}`, true);
        else { state.placementDone = true; saveState(); renderNetwork(); }
      });
      return;
    }
    let selected = null; const selectionText = el("selectionText");
    document.querySelectorAll(".connect-button").forEach(button => button.addEventListener("click", () => {
      const id = button.dataset.connect;
      if (!selected) { selected = id; button.classList.add("selected"); selectionText.textContent = `${nameOf(id)} ist als Nahrung ausgewählt. Wähle nun den Konsumenten.`; return; }
      document.querySelectorAll(".connect-button").forEach(b => b.classList.remove("selected"));
      if (selected !== id) { const edge = `${selected}>${id}`; if (!state.edges.includes(edge)) state.edges.push(edge); saveState(); }
      selected = null; selectionText.innerHTML = "Wähle zuerst die Nahrung aus, indem du auf den <strong>Namen</strong> klickst, und anschließend auf den Namen des Konsumenten."; updateNetwork();
    }));
    el("clearNetwork").addEventListener("click", () => { state.edges = []; selected = null; saveState(); updateNetwork(); el("networkFeedback").innerHTML = ""; });
    el("checkNetwork").addEventListener("click", () => {
      const wrong = state.edges.filter(edge => !correctEdges.includes(edge)); const missing = correctEdges.filter(edge => !state.edges.includes(edge));
      if (wrong.length || missing.length) el("networkFeedback").innerHTML = feedback("Noch nicht vollständig", `${wrong.length ? `${wrong.length} Pfeil${wrong.length === 1 ? " passt" : "e passen"} nicht. ` : ""}${missing.length ? `${missing.length} richtige Verbindung${missing.length === 1 ? " fehlt" : "en fehlen"}.` : ""}`, true);
      else { setDone(3); el("networkFeedback").innerHTML = feedback("Nahrungsnetz vollständig", "Die Nahrungspfeile verbinden die drei Trophieebenen zu einem Nahrungsnetz.") + `<div class="action-row">${nextButton("Stoffwechsel markieren")}</div>`; bindNext(); }
    });
    requestAnimationFrame(updateNetwork);
  }

  function bindDragAndDrop() {
    document.querySelectorAll(".network-node").forEach(card => {
      card.addEventListener("dragstart", event => { event.dataTransfer.setData("text/plain", card.dataset.id); event.dataTransfer.effectAllowed = "move"; card.classList.add("dragging"); });
      card.addEventListener("dragend", () => card.classList.remove("dragging"));
    });
    document.querySelectorAll("[data-zone], .organism-tray").forEach(zone => {
      zone.addEventListener("dragover", event => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; zone.classList.add("drag-over"); });
      zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
      zone.addEventListener("drop", event => { event.preventDefault(); zone.classList.remove("drag-over"); const id = event.dataTransfer.getData("text/plain"); if (!organismById[id]) return; if (zone.dataset.zone) state.placements[id] = zone.dataset.zone; else delete state.placements[id]; state.placementDone = false; state.edges = []; saveState(); renderNetwork(); });
    });
  }

  function bindInfoButtons() {
    document.querySelectorAll(".info-button").forEach(button => button.addEventListener("click", () => { const info = el(`info-${button.dataset.info}`); const open = info.hidden; info.hidden = !open; button.setAttribute("aria-expanded", String(open)); }));
  }

  function updateNetwork() {
    const list = el("edgeList"); if (!list) return;
    list.innerHTML = state.edges.length ? state.edges.map(edge => { const [a,b] = edge.split(">"); return `<button class="edge-chip" data-edge="${edge}" type="button">${nameOf(a)} → ${nameOf(b)} ×</button>`; }).join("") : `<span class="hint">Noch keine Pfeile eingezeichnet.</span>`;
    list.querySelectorAll("button").forEach(button => button.addEventListener("click", () => { state.edges = state.edges.filter(edge => edge !== button.dataset.edge); saveState(); updateNetwork(); })); drawEdges();
  }

  function drawEdges() {
    const board = el("networkBoard"), svg = el("networkSvg"); if (!board || !svg) return;
    const defs = svg.querySelector("defs")?.outerHTML || ""; const rect = board.getBoundingClientRect(); svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`); svg.innerHTML = defs;
    state.edges.forEach(edge => {
      const [a,b] = edge.split(">"); const from = board.querySelector(`[data-id="${a}"]`), to = board.querySelector(`[data-id="${b}"]`); if (!from || !to) return;
      const fr = from.getBoundingClientRect(), tr = to.getBoundingClientRect(); const upward = fr.top > tr.top;
      const x1 = fr.left - rect.left + fr.width / 2, x2 = tr.left - rect.left + tr.width / 2;
      const y1 = upward ? fr.top - rect.top + 3 : fr.bottom - rect.top - 3, y2 = upward ? tr.bottom - rect.top - 3 : tr.top - rect.top + 3;
      const bend = Math.max(38, Math.abs(y2 - y1) * .45); const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", `M ${x1} ${y1} C ${x1} ${y1 + (upward ? -bend : bend)}, ${x2} ${y2 + (upward ? bend : -bend)}, ${x2} ${y2}`); path.setAttribute("marker-end", "url(#arrow)"); svg.append(path);
    });
  }

  function renderProcesses() {
    taskArea.innerHTML = `<p class="instruction"><strong>Markiere alle zutreffenden Prozesse.</strong></p><div class="table-wrap"><table class="learning-table"><thead><tr><th>Organismus</th><th>Stoffwechselprozesse</th></tr></thead><tbody>${displayOrganisms.map(o => { const selected = state.processes[o.id] || []; return `<tr><td><span class="mini-organism">${sprite(o.sprite)}<span>${o.name}</span></span></td><td><div class="process-cell" role="group" aria-label="Prozesse bei ${o.name}"><button class="process-button${selected.includes("photo") ? " selected" : ""}" data-id="${o.id}" data-process="photo" type="button">Photosynthese</button><button class="process-button${selected.includes("resp") ? " selected" : ""}" data-id="${o.id}" data-process="resp" type="button">Zellatmung</button></div></td></tr>`; }).join("")}</tbody></table></div><div class="action-row"><button id="checkProcesses" class="primary" type="button">Markierungen prüfen</button></div><div id="processFeedback"></div>`;
    document.querySelectorAll(".process-button").forEach(button => button.addEventListener("click", () => { const id = button.dataset.id, process = button.dataset.process; const selected = state.processes[id] || []; state.processes[id] = selected.includes(process) ? selected.filter(p => p !== process) : [...selected, process]; button.classList.toggle("selected"); saveState(); }));
    el("checkProcesses").addEventListener("click", () => {
      const wrong = organisms.filter(o => { const actual = [...(state.processes[o.id] || [])].sort(); const expected = (o.role === "producer" ? ["photo", "resp"] : ["resp"]).sort(); return JSON.stringify(actual) !== JSON.stringify(expected); });
      if (wrong.length) el("processFeedback").innerHTML = feedback("Noch nicht vollständig", `Bei ${wrong.length} Organismus${wrong.length === 1 ? "" : "men"} fehlen Markierungen oder es ist ein unpassender Prozess gewählt.`, true);
      else { setDone(4); el("processFeedback").innerHTML = feedback("Richtig markiert", "Produzenten betreiben Photosynthese und Zellatmung. Konsumenten betreiben Zellatmung, aber keine Photosynthese.") + `<div class="action-row">${nextButton("Abbauweg ergänzen")}</div>`; bindNext(); }
    });
  }

  function renderDecomposition() {
    const definitions = [["microbes", "Lebewesen, die den letzten Abschnitt des Abbaus übernehmen und Stoffe in eine für Produzenten erneut nutzbare Form überführen.", "Destruenten"], ["dead", "Sammelbezeichnung für organisches Material, das nicht mehr Bestandteil eines lebenden Organismus ist.", "Detritus"], ["eaters", "Konsumenten, die am Anfang des Abbauwegs stehen und durch ihre Ernährung die Oberfläche des Ausgangsmaterials vergrößern.", "Detritivoren"]];
    const termOrders = {
      microbes: ["", "Detritivoren", "Detritus", "Destruenten"],
      dead: ["", "Destruenten", "Detritivoren", "Detritus"],
      eaters: ["", "Detritus", "Destruenten", "Detritivoren"]
    };
    const terms = ["", "Detritus", "Destruenten", "Detritivoren"];
    if (!state.definitionsDone) {
      taskArea.innerHTML = `<div class="reading-text"><h2>Aufräumarbeiten im Tangwald</h2><p>Nach einem Sturm sinken abgerissene Tangstücke zum Meeresboden. Dort liegen sie zusammen mit Ausscheidungen und den Überresten gestorbener Lebewesen. Dieses tote organische Material wird als <strong>Detritus</strong> bezeichnet.</p><p>Flohkrebse, Borstenwürmer und andere kleine Tiere fressen davon und zerlegen größere Reste in kleinere Stücke. Weil sie Detritus als Nahrung nutzen, nennt man sie <strong>Detritivoren</strong>. Was nach ihrer Arbeit übrig bleibt, wird unter anderem von Bakterien und Pilzen weiterverarbeitet. Diese <strong>Destruenten</strong> zerlegen die enthaltenen Stoffe so weit, dass schließlich wieder mineralische Nährstoffe im Wasser und Boden verfügbar sind. Riesentang und Phytoplankton können sie erneut aufnehmen.</p></div><p class="instruction"><strong>Begriffe erschließen:</strong> Ordne jeder Definition den passenden Fachbegriff zu. Übertrage dazu die Informationen aus dem Text.</p><div class="definition-list">${definitions.map(([id,text]) => `<div class="definition-row"><p>${text}</p><select data-definition="${id}" aria-label="Fachbegriff zur Definition auswählen">${termOrders[id].map(term => `<option value="${term}"${state.definitions[id] === term ? " selected" : ""}>${term || "Fachbegriff auswählen"}</option>`).join("")}</select></div>`).join("")}</div><div class="action-row"><button id="checkDefinitions" class="primary" type="button">Begriffe prüfen</button></div><div id="definitionFeedback"></div>`;
      document.querySelectorAll("select[data-definition]").forEach(select => select.addEventListener("change", () => { state.definitions[select.dataset.definition] = select.value; saveState(); }));
      el("checkDefinitions").addEventListener("click", () => { const unanswered = definitions.filter(([id]) => !state.definitions[id]); const wrong = definitions.filter(([id,,answer]) => state.definitions[id] && state.definitions[id] !== answer); if (unanswered.length || wrong.length) el("definitionFeedback").innerHTML = feedback("Prüfe die Begriffe", `${unanswered.length ? `${unanswered.length} Begriff${unanswered.length === 1 ? " fehlt" : "e fehlen"}. ` : ""}${wrong.length ? `${wrong.length} Zuordnung${wrong.length === 1 ? " ist" : "en sind"} noch nicht richtig.` : ""}`, true); else { state.definitionsDone = true; saveState(); renderDecomposition(); } });
      return;
    }
    const concepts = [{ id: "decomposer", name: "Bakterien", art: `<div class="microbe-art" aria-hidden="true"><i></i><i></i><i></i></div>`, answer: "Destruenten" }, { id: "detritus", name: "Abgestorbener Tang", art: sprite(9), answer: "Detritus" }, { id: "detritivore", name: "Flohkrebs und Borstenwurm", art: sprite(8), answer: "Detritivoren" }];
    const statements = [["all-levels", "Abgestorbene Biomasse kann von Produzenten und Konsumenten stammen."], ["detritivore", "Detritivoren fressen und zerkleinern abgestorbene organische Substanz."], ["mineralize", "Destruenten bauen organische Stoffe ab und setzen dabei anorganische Stoffe frei."], ["only-apex", "Destruenten verwerten ausschließlich tote Endkonsumenten."], ["producer-uptake", "Produzenten können freigesetzte Mineralstoffe wieder aufnehmen."]];
    taskArea.innerHTML = `<div class="glossary-strip"><div><strong>Detritus</strong><span>abgestorbene organische Substanz</span></div><div><strong>Detritivoren</strong><span>fressen und zerkleinern Detritus</span></div><div><strong>Destruenten</strong><span>bauen organische Stoffe ab und mineralisieren sie</span></div></div><p class="instruction"><strong>Wende die Begriffe an:</strong> Ordne die drei Beispiele zu. Wähle danach alle fachlich richtigen Aussagen aus.</p><div class="decomp-grid">${concepts.map(c => `<article class="concept-card"><div class="concept-art">${c.art}</div><div class="concept-body"><label for="concept-${c.id}">${c.name}</label><select id="concept-${c.id}" data-concept="${c.id}">${terms.map(term => `<option value="${term}"${state.decomposition[c.id] === term ? " selected" : ""}>${term || "Bitte zuordnen"}</option>`).join("")}</select></div></article>`).join("")}</div><div class="statement-list">${statements.map(([id,text]) => `<label class="statement"><input type="checkbox" value="${id}"${state.statements.includes(id) ? " checked" : ""}><span>${text}</span></label>`).join("")}</div><div class="action-row"><button id="checkDecomposition" class="primary" type="button">Abbauweg prüfen</button></div><div id="decompFeedback"></div>`;
    document.querySelectorAll("select[data-concept]").forEach(select => select.addEventListener("change", () => { state.decomposition[select.dataset.concept] = select.value; saveState(); }));
    document.querySelectorAll(".statement input").forEach(input => input.addEventListener("change", () => { state.statements = input.checked ? [...new Set([...state.statements, input.value])] : state.statements.filter(id => id !== input.value); saveState(); }));
    el("checkDecomposition").addEventListener("click", () => { const conceptWrong = concepts.filter(c => state.decomposition[c.id] !== c.answer); const correctStatements = ["all-levels", "detritivore", "mineralize", "producer-uptake"]; const selectedCorrectly = correctStatements.every(id => state.statements.includes(id)) && !state.statements.includes("only-apex") && state.statements.length === correctStatements.length; if (conceptWrong.length || !selectedCorrectly) el("decompFeedback").innerHTML = feedback("Prüfe deine Auswahl", `${conceptWrong.length ? `${conceptWrong.length} Begriff${conceptWrong.length === 1 ? " ist" : "e sind"} noch nicht richtig zugeordnet. ` : ""}${!selectedCorrectly ? "Mindestens eine Aussage fehlt oder eine falsche Aussage ist ausgewählt." : ""}`, true); else { setDone(5); el("decompFeedback").innerHTML = feedback("Lernweg abgeschlossen", "Detritivoren zerkleinern abgestorbene Biomasse. Destruenten mineralisieren organische Stoffe aus allen Trophieebenen. Die freigesetzten Mineralstoffe stehen den Produzenten erneut zur Verfügung.") + `<div class="summary-card" style="margin-top:22px"><h2>Das vollständige Modell</h2><ol><li>Produzenten bauen organische Stoffe auf.</li><li>Konsumenten übernehmen Stoffe und Energie mit ihrer Nahrung.</li><li>Alle lebenden Organismen betreiben Zellatmung.</li><li>Abgestorbene Biomasse wird zu Detritus.</li><li>Detritivoren zerkleinern Detritus; Destruenten mineralisieren organische Stoffe.</li></ol></div>`; } });
  }

  el("resetButton").addEventListener("click", () => { if (confirm("Alle lokalen Eingaben löschen und das Lernprogramm neu beginnen?")) { localStorage.removeItem(STORAGE_KEY); location.reload(); } });
  el("teacherInfoButton").addEventListener("click", () => el("teacherDialog").showModal());
  el("closeTeacherDialog").addEventListener("click", () => el("teacherDialog").close());
  const firstLocked = state.done.findIndex(done => !done); const maxUnlocked = firstLocked < 0 ? steps.length - 1 : firstLocked;
  setStep(Math.max(0, Math.min(maxUnlocked, state.step)));
})();
