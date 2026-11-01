(() => {
  "use strict";

  const COLORS = { prey: "#d96b42", predator: "#287f83", muted: "#9aacaa" };
  const STORAGE_KEY = "lotka-volterra-labor-v3";

  const state = Object.assign({
    step: 0,
    identified: false,
    loopDone: false,
    prediction: "",
    ranExperiment: false,
    rule1: false,
    rule2: false,
    rule3Prediction: "",
    rule3: false,
    factors: [],
    notes: { observation: "", explanation: "", limitation: "" },
    params: { prey0: 40, predator0: 10, preyGrowth: 0.55, predation: 0.035, predatorMortality: 0.45 }
  }, loadState());

  const el = id => document.getElementById(id);
  const taskArea = el("taskArea");
  const controls = el("labControls");
  const chart = el("chart");
  const chartNote = el("chartNote");
  const legend = el("legend");

  const steps = [
    { eyebrow: "Mission 01", title: "Wer folgt wem?", lead: "Zwei Populationen, ein Muster. Ordne die Kurven zu.", render: renderMystery },
    { eyebrow: "Mission 02", title: "Was treibt den Zyklus?", lead: "Baue die Rückkopplung aus vier Aussagen.", render: renderLoop },
    { eyebrow: "Mission 03", title: "Verändern. Vorhersagen. Prüfen.", lead: "Teste genau einen Faktor und beobachte die Kurven.", render: renderExperiment },
    { eyebrow: "Mission 04", title: "Bleibt etwas konstant?", lead: "Untersuche einen langen Zeitraum statt eines einzelnen Zyklus.", render: renderMeans },
    { eyebrow: "Mission 05", title: "Das System wird gestört.", lead: "Beide Populationen werden im selben Moment stark dezimiert.", render: renderDisturbance },
    { eyebrow: "Mission 06", title: "Modell trifft Freiland.", lead: "In der Natur sind Zyklen selten so sauber. Finde Gründe.", render: renderReality },
    { eyebrow: "Mission 07", title: "Alles bearbeitet?", lead: "Prüfe dein Arbeitsblatt und ergänze fehlende Ergebnisse.", render: renderFinish }
  ];

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch { return {}; }
  }
  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  function simulate(opts = {}) {
    const p = Object.assign({
      prey0: state.params.prey0,
      predator0: state.params.predator0,
      preyGrowth: state.params.preyGrowth,
      predation: state.params.predation,
      conversion: 0.008,
      predatorMortality: state.params.predatorMortality,
      duration: 36,
      dt: 0.025,
      disturbanceAt: null,
      disturbanceFactor: 0.35
    }, opts);
    let x = p.prey0, y = p.predator0;
    const points = [], sampleEvery = Math.max(1, Math.round(.12 / p.dt));
    let disturbed = false;
    const deriv = (bx, ry) => [p.preyGrowth * bx - p.predation * bx * ry, p.conversion * bx * ry - p.predatorMortality * ry];
    for (let i = 0; i <= p.duration / p.dt; i++) {
      const t = i * p.dt;
      if (!disturbed && p.disturbanceAt !== null && t >= p.disturbanceAt) {
        x *= p.disturbanceFactor; y *= p.disturbanceFactor; disturbed = true;
      }
      if (i % sampleEvery === 0) points.push({ t, prey: x, predator: y });
      const [k1x, k1y] = deriv(x, y);
      const [k2x, k2y] = deriv(x + p.dt*k1x/2, y + p.dt*k1y/2);
      const [k3x, k3y] = deriv(x + p.dt*k2x/2, y + p.dt*k2y/2);
      const [k4x, k4y] = deriv(x + p.dt*k3x, y + p.dt*k3y);
      x = Math.max(.01, Math.min(300, x + p.dt*(k1x + 2*k2x + 2*k3x + k4x)/6));
      y = Math.max(.01, Math.min(300, y + p.dt*(k1y + 2*k2y + 2*k3y + k4y)/6));
    }
    return points;
  }

  function svgEl(name, attrs = {}) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attrs).forEach(([k,v]) => node.setAttribute(k, v));
    return node;
  }

  function drawChart(data, options = {}) {
    const cfg = Object.assign({ labels: ["Kurve A", "Kurve B"], reveal: false, means: false, baseline: null, eventAt: null, field: false }, options);
    chart.innerHTML = "";
    const W=760, H=420, m={l:58,r:22,t:24,b:48}, iw=W-m.l-m.r, ih=H-m.t-m.b;
    const maxT = Math.max(...data.map(d=>d.t));
    const maxY = Math.max(10, ...data.flatMap(d=>[d.prey,d.predator]), ...(cfg.baseline || []).flatMap(d=>[d.prey,d.predator])) * 1.08;
    const sx = t => m.l + t/maxT*iw;
    const sy = v => m.t + ih - v/maxY*ih;
    for (let i=0;i<=5;i++) {
      const y=m.t+i*ih/5;
      chart.append(svgEl("line",{x1:m.l,y1:y,x2:W-m.r,y2:y,class:"grid-line"}));
      const tx=svgEl("text",{x:m.l-10,y:y+4,"text-anchor":"end",class:"axis-label"}); tx.textContent=Math.round(maxY*(5-i)/5); chart.append(tx);
    }
    for (let i=0;i<=6;i++) {
      const x=m.l+i*iw/6;
      chart.append(svgEl("line",{x1:x,y1:m.t,x2:x,y2:H-m.b,class:"grid-line"}));
      const tx=svgEl("text",{x,y:H-19,"text-anchor":"middle",class:"axis-label"}); tx.textContent=Math.round(maxT*i/6); chart.append(tx);
    }
    chart.append(svgEl("line",{x1:m.l,y1:H-m.b,x2:W-m.r,y2:H-m.b,class:"axis-line"}));
    chart.append(svgEl("line",{x1:m.l,y1:m.t,x2:m.l,y2:H-m.b,class:"axis-line"}));
    const xLabel=svgEl("text",{x:W/2,y:H-3,"text-anchor":"middle",class:"axis-label"}); xLabel.textContent="Zeit"; chart.append(xLabel);
    const yLabel=svgEl("text",{x:15,y:H/2,transform:`rotate(-90 15 ${H/2})`,"text-anchor":"middle",class:"axis-label"}); yLabel.textContent="Populationsdichte"; chart.append(yLabel);

    const pathFor = (arr,key) => arr.map((d,i)=>`${i?"L":"M"}${sx(d.t).toFixed(1)},${sy(d[key]).toFixed(1)}`).join(" ");
    if (cfg.baseline) {
      chart.append(svgEl("path",{d:pathFor(cfg.baseline,"prey"),stroke:COLORS.prey,class:"series thin"}));
      chart.append(svgEl("path",{d:pathFor(cfg.baseline,"predator"),stroke:COLORS.predator,class:"series thin"}));
    }
    chart.append(svgEl("path",{d:pathFor(data,"prey"),stroke:COLORS.prey,class:"series"}));
    chart.append(svgEl("path",{d:pathFor(data,"predator"),stroke:COLORS.predator,class:"series"}));

    if (cfg.means) {
      ["prey","predator"].forEach(key=>{
        const mean=data.reduce((s,d)=>s+d[key],0)/data.length;
        chart.append(svgEl("line",{x1:m.l,y1:sy(mean),x2:W-m.r,y2:sy(mean),stroke:COLORS[key],class:"mean-line"}));
      });
    }
    if (cfg.eventAt !== null) {
      const x=sx(cfg.eventAt);
      chart.append(svgEl("line",{x1:x,y1:m.t,x2:x,y2:H-m.b,class:"event-line"}));
      const tx=svgEl("text",{x:x+7,y:m.t+15,class:"event-label"}); tx.textContent="Dezimierung"; chart.append(tx);
    }
    legend.innerHTML = [
      `<span class="legend-item"><i class="legend-line" style="background:${COLORS.prey}"></i>${cfg.reveal ? "Beute" : cfg.labels[0]}</span>`,
      `<span class="legend-item"><i class="legend-line" style="background:${COLORS.predator}"></i>${cfg.reveal ? "Räuber" : cfg.labels[1]}</span>`
    ].join("");
  }

  function setChartNote(text="") { chartNote.hidden = !text; chartNote.textContent = text; }
  function setChrome(index) {
    state.step=index; saveState();
    const s=steps[index];
    el("eyebrow").textContent=s.eyebrow; el("stepTitle").textContent=s.title; el("stepLead").textContent=s.lead;
    document.querySelectorAll(".step-tab").forEach((b,i)=>b.classList.toggle("active",i===index));
    el("progressText").textContent=`${index+1} von ${steps.length}`;
    el("progressBar").style.width=`${(index+1)/steps.length*100}%`;
    taskArea.innerHTML=""; controls.innerHTML=""; setChartNote(); s.render();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function nextButton(label="Weiter") { return `<button class="primary next-step" type="button">${label} →</button>`; }
  function bindNext() { document.querySelectorAll(".next-step").forEach(b=>b.onclick=()=>setChrome(Math.min(steps.length-1,state.step+1))); }
  function feedback(text, warn=false) { return `<div class="feedback${warn?" warn":""}">${text}</div>`; }

  function renderMystery() {
    drawChart(simulate(), { reveal: state.identified });
    taskArea.innerHTML = `
      <div class="rule-card"><strong>Hase &amp; Luchs</strong><p>In diesem Modell betrachten wir eine Hasenpopulation als Beute und eine Luchspopulation als Räuber. Die Lotka-Volterra-Regeln beschreiben typische Entwicklungen eines idealisierten Räuber-Beute-Systems.</p></div>
      <p class="question">Welche Kurve zeigt die Beutepopulation?</p>
      <div class="choice-grid">
        <label class="choice"><input type="radio" name="mystery" value="prey"> Orange Kurve</label>
        <label class="choice"><input type="radio" name="mystery" value="predator"> Blaue Kurve</label>
      </div>
      <p class="hint"><strong>Begründe deine Zuordnung in einem Satz.</strong> Halte deine Begründung auf deinem Arbeitsblatt fest.</p>
      <div class="action-row"><button class="primary" id="checkMystery">Prüfen</button></div>
      <div id="mysteryFeedback">${state.identified ? feedback("Richtig.") + `<div class="action-row">${nextButton()}</div>` : ""}</div>`;
    if (state.identified) { drawChart(simulate(),{reveal:true}); bindNext(); }
    el("checkMystery").onclick=()=>{
      const answer=document.querySelector('input[name="mystery"]:checked');
      if (!answer) { el("mysteryFeedback").innerHTML=feedback("Wähle eine Kurve.",true); return; }
      if (answer.value!=="prey") { el("mysteryFeedback").innerHTML=feedback("Falsch.",true); return; }
      state.identified=true; saveState(); drawChart(simulate(),{reveal:true});
      el("mysteryFeedback").innerHTML=feedback("Richtig.")+`<div class="action-row">${nextButton()}</div>`; bindNext();
    };
  }

  function renderLoop() {
    drawChart(simulate(),{reveal:true});
    const correct=["Mehr Beute","Mehr Räuber","Weniger Beute","Weniger Räuber"];
    taskArea.innerHTML=`<p class="question">Bringe den Kreislauf in die richtige Reihenfolge.</p>
      <p class="hint">Starte mit: Mehr Beute</p>
      <div id="loopChoices" class="choice-grid"></div><div id="loopFeedback"></div>`;
    const scrambled=["Weniger Räuber","Mehr Räuber","Mehr Beute","Weniger Beute"];
    let selected=[];
    const box=el("loopChoices");
    const paint=()=>{
      box.innerHTML=`<div class="rule-card"><strong>Deine Wirkungskette</strong><p>${selected.length?selected.join(" → "):"…"}</p></div><div class="factor-grid">${scrambled.filter(x=>!selected.includes(x)).map(x=>`<button class="chip loop-chip" data-value="${x}">${x}</button>`).join("")}</div>`;
      document.querySelectorAll(".loop-chip").forEach(b=>b.onclick=()=>{selected.push(b.dataset.value); paint(); if(selected.length===4) check();});
    };
    const check=()=>{
      if(JSON.stringify(selected)===JSON.stringify(correct)){
        state.loopDone=true; saveState(); el("loopFeedback").innerHTML=feedback("Die Wirkungskette ist richtig.")+`<div class="rule-card"><strong>Merksatz</strong><p>Bei einer <b>verzögerten negativen Rückkopplung</b> löst eine Veränderung zeitversetzt eine Gegenwirkung aus, die der ursprünglichen Veränderung entgegenwirkt.</p></div><p class="hint">Halte den Merksatz auf deinem Arbeitsblatt fest.</p><div class="action-row">${nextButton()}</div>`; bindNext();
      } else { el("loopFeedback").innerHTML=feedback("Prüfe, welche unmittelbare Folge jeder Schritt für die andere Population hat.",true)+`<div class="action-row"><button class="secondary" id="retryLoop">Neu ordnen</button></div>`; el("retryLoop").onclick=()=>{selected=[];el("loopFeedback").innerHTML="";paint();}; }
    };
    paint();
    if(state.loopDone){ selected=correct; paint(); check(); }
  }

  function renderExperiment() {
    drawChart(simulate(),{reveal:true});
    taskArea.innerHTML=`<p class="question">Formuliere eine Regel zur Abhängigkeit der Räuber- und Beutepopulation voneinander. Halte sie auf deinem Arbeitsblatt fest.</p>
      <p class="hint">Begründe deine Regel mit dem Verlauf der Modellpopulationen von Hase und Luchs.</p>
      <div class="action-row">${nextButton("Weiter zu Regel 2")}</div>`;
    controls.innerHTML=`<div class="control-grid">
      ${range("preyGrowth","Vermehrungsrate der Beute",.35,.8,.05,state.params.preyGrowth)}
      ${range("predatorMortality","Sterberate der Räuber",.25,.7,.05,state.params.predatorMortality)}
    </div><div class="action-row"><button class="primary" id="runExperiment">Simulation starten</button><button class="secondary" id="resetParams">Standardwerte</button></div>`;
    bindRanges(); bindNext();
    el("runExperiment").onclick=()=>drawChart(simulate(),{reveal:true});
    el("resetParams").onclick=()=>{state.params.preyGrowth=.55;state.params.predatorMortality=.45;saveState();renderExperiment();};
  }
  function range(key,label,min,max,step,value){return `<div class="range-control"><label for="${key}">${label}<output id="${key}Out">${Number(value).toFixed(2)}</output></label><input id="${key}" data-key="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></div>`;}
  function bindRanges(){document.querySelectorAll('input[type="range"][data-key]').forEach(input=>input.oninput=()=>{state.params[input.dataset.key]=Number(input.value);el(input.id+"Out").value=Number(input.value).toFixed(2);saveState();drawChart(simulate(),{reveal:true});});}

  function renderMeans() {
    const data=simulate({duration:70}); drawChart(data,{reveal:true,means:true});
    const mp=data.reduce((s,d)=>s+d.prey,0)/data.length, mr=data.reduce((s,d)=>s+d.predator,0)/data.length;
    taskArea.innerHTML=`<p class="question">Formuliere eine Regel zur langfristigen Entwicklung der durchschnittlichen Größen der Räuber- und Beutepopulation. Halte sie auf deinem Arbeitsblatt fest.</p>
      <p class="hint">Begründe deine Regel mithilfe der Populationsverläufe von Hase und Luchs sowie der gestrichelten Mittelwertlinien.</p>
      <div class="action-row">${nextButton("Weiter zu Regel 3")}</div>`;
    controls.innerHTML=`<div class="metric-row"><div class="metric"><span>Mittelwert Beute</span><strong>${mp.toFixed(1)}</strong></div><div class="metric"><span>Mittelwert Räuber</span><strong>${mr.toFixed(1)}</strong></div></div>`;
    bindNext();
  }

  function renderDisturbance() {
    const scenario={prey0:40,predator0:10,preyGrowth:.55,predation:.035,conversion:.008,predatorMortality:.45,duration:36};
    const disturbed=simulate({...scenario,disturbanceAt:18,disturbanceFactor:.35});
    drawChart(disturbed,{reveal:true,eventAt:18}); setChartNote("Waldbrand zum Zeitpunkt 18");
    taskArea.innerHTML=`<p class="question">Formuliere eine Regel zur Entwicklung beider Populationen nach der gleich starken Dezimierung. Halte sie auf deinem Arbeitsblatt fest.</p>
      <p class="hint">Begründe deine Regel mit dem Verlauf der Modellpopulationen von Hase und Luchs unmittelbar vor und nach dem Ereignis.</p>
      <div class="action-row"><button class="secondary" id="showDisturbanceHint" type="button">Tipp anzeigen</button>${nextButton("Weiter zum Modellcheck")}</div>
      <div id="disturbanceHint"></div>`;
    controls.innerHTML=`<div class="rule-card"><strong>Störereignis</strong><p>Ein großflächiger Waldbrand verringert im Modell zum Zeitpunkt 18 beide Populationen auf 35&nbsp;% ihrer vorherigen Größe.</p></div>`;
    bindNext();
    el("showDisturbanceHint").onclick=()=>{el("disturbanceHint").innerHTML=feedback("Vergleiche die Kurven direkt rechts der roten Linie: Welche Population steigt zuerst wieder deutlich an? Bedenke, dass es nach dem Waldbrand zunächst nur wenige Luchse gibt.");};
  }

  function fieldData(){
    const prey=[38,61,96,44,18,29,78,70,24,15,57,108,63,28,12,49,81,33,54,92,21,17,68,41,26];
    const pred=[11,13,18,39,47,25,14,21,51,36,17,12,31,58,42,16,20,44,30,18,56,35,13,27,46];
    return prey.map((v,i)=>({t:i,prey:v,predator:pred[i]}));
  }
  function renderReality() {
    drawChart(fieldData(),{reveal:true,field:true}); setChartNote("Freilanddaten: wechselnde Perioden und Amplituden");
    const all=["alternative Beute","Klima","Krankheiten","Zu- und Abwanderung","begrenzte Pflanzennahrung","weitere Räuber"];
    taskArea.innerHTML=`<p class="question">Wähle mindestens drei mögliche Gründe für die Abweichungen und erläutere deine Entscheidung in einem kurzen Text.</p><div class="factor-grid">${all.map(x=>`<button class="chip factor-chip${state.factors.includes(x)?" selected":""}" data-value="${x}">${x}</button>`).join("")}</div>
      <div class="action-row"><button class="primary" id="saveReality">Modellcheck abschließen</button></div><div id="realityFeedback"></div>`;
    document.querySelectorAll(".factor-chip").forEach(b=>b.onclick=()=>{const v=b.dataset.value;state.factors=state.factors.includes(v)?state.factors.filter(x=>x!==v):[...state.factors,v];b.classList.toggle("selected");saveState();});
    el("saveReality").onclick=()=>{if(state.factors.length<3){el("realityFeedback").innerHTML=feedback("Wähle mindestens drei Gründe.",true);return;}saveState();el("realityFeedback").innerHTML=feedback("Auswahl vollständig.")+`<div class="action-row">${nextButton("Zum Abschluss")}</div>`;bindNext();};
  }

  function renderFinish() {
    drawChart(fieldData(),{reveal:true}); setChartNote("Nutze die Navigation, um eine Seite erneut aufzurufen.");
    taskArea.innerHTML=`<p class="question">Kontrolliere, ob du alles auf deinem Arbeitsblatt bearbeitet hast.</p>
      <div class="check-list">
        <label class="check-item"><input type="checkbox"> Zuordnung der Kurven mit Begründung</label>
        <label class="check-item"><input type="checkbox"> Merksatz zur verzögerten negativen Rückkopplung</label>
        <label class="check-item"><input type="checkbox"> Lotka-Volterra-Regeln 1, 2 und 3</label>
        <label class="check-item"><input type="checkbox"> Beurteilung der Modellgrenzen</label>
      </div>
      <p class="hint">Fehlt etwas? Gehe zur entsprechenden Seite zurück und ergänze dein Arbeitsblatt.</p>
      <div class="action-row"><button class="secondary review-step" data-target="0">Zu 01</button><button class="secondary review-step" data-target="1">Zu 02</button><button class="secondary review-step" data-target="2">Zu 03</button><button class="secondary review-step" data-target="3">Zu 04</button><button class="secondary review-step" data-target="4">Zu 05</button><button class="secondary review-step" data-target="5">Zu 06</button></div>`;
    controls.innerHTML=`<div class="rule-card"><strong>Abschluss</strong><p>Besprecht eure Formulierungen anschließend im Plenum.</p></div>`;
    document.querySelectorAll(".review-step").forEach(button=>button.onclick=()=>setChrome(Number(button.dataset.target)));
  }

  function registerWebMcp() {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const report = error => console.warn("WebMCP:", error);
    const register = tool => {
      try { void Promise.resolve(context.registerTool(tool)).catch(report); }
      catch (error) { report(error); }
    };
    register({
      name: "open_learning_mission",
      title: "Lernmission öffnen",
      description: "Öffnet eine Mission des sichtbaren Lotka-Volterra-Lernwegs.",
      inputSchema: {
        type: "object",
        properties: { mission: { type: "integer", minimum: 1, maximum: 7 } },
        required: ["mission"],
        additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const mission = Number(input?.mission);
        if (!Number.isInteger(mission) || mission < 1 || mission > 7) {
          throw new Error("Mission muss zwischen 1 und 7 liegen.");
        }
        setChrome(mission - 1);
        return { mission, title: steps[mission - 1].title };
      }
    });
    register({
      name: "configure_population_model",
      title: "Populationsmodell einstellen",
      description: "Stellt Anfangsbestände und biologische Raten ein und öffnet das Modell-Labor.",
      inputSchema: {
        type: "object",
        properties: {
          preyInitial: { type: "number", minimum: 10, maximum: 100 },
          predatorInitial: { type: "number", minimum: 2, maximum: 30 },
          preyGrowth: { type: "number", minimum: 0.35, maximum: 0.8 },
          predatorMortality: { type: "number", minimum: 0.25, maximum: 0.7 }
        },
        additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const values = {
          prey0: Number(input?.preyInitial ?? state.params.prey0),
          predator0: Number(input?.predatorInitial ?? state.params.predator0),
          preyGrowth: Number(input?.preyGrowth ?? state.params.preyGrowth),
          predatorMortality: Number(input?.predatorMortality ?? state.params.predatorMortality)
        };
        if (values.prey0 < 10 || values.prey0 > 100 ||
            values.predator0 < 2 || values.predator0 > 30 ||
            values.preyGrowth < .35 || values.preyGrowth > .8 ||
            values.predatorMortality < .25 || values.predatorMortality > .7) {
          throw new Error("Mindestens ein Wert liegt außerhalb des erlaubten Bereichs.");
        }
        Object.assign(state.params, values);
        saveState();
        setChrome(2);
        return { mission: 3, parameters: values };
      }
    });
  }

  document.querySelectorAll(".step-tab").forEach(b=>b.onclick=()=>setChrome(Number(b.dataset.step)));
  el("resetButton").onclick=()=>{if(confirm("Alle lokalen Eingaben löschen und neu beginnen?")){localStorage.removeItem(STORAGE_KEY);location.reload();}};
  el("teacherInfoButton").onclick=()=>el("teacherDialog").showModal();
  el("closeTeacherDialog").onclick=()=>el("teacherDialog").close();
  setChrome(Math.min(steps.length-1,Math.max(0,state.step)));
  registerWebMcp();
})();
