// script.js
let processes = [];

function addProcess() {
  const name = document.getElementById("processName").value;
  const arrival = parseInt(document.getElementById("arrivalTime").value);
  const burst = parseInt(document.getElementById("burstTime").value);

  if (!name || isNaN(arrival) || isNaN(burst)) {
    alert("Mohon isi semua input dengan benar!");
    return;
  }

  processes.push({ name, arrival, burst });
  renderProcessTable();
}

function renderProcessTable() {
  const tbody = document.querySelector("#processTable tbody");
  tbody.innerHTML = "";
  processes.forEach((p, i) => {
    const row = `<tr>
      <td>${p.name}</td>
      <td>${p.arrival}</td>
      <td>${p.burst}</td>
      <td><button onclick="deleteProcess(${i})">Hapus</button></td>
    </tr>`;
    tbody.innerHTML += row;
  });
}

function deleteProcess(index) {
  processes.splice(index, 1);
  renderProcessTable();
}

function clearProcesses() {
  processes = [];
  renderProcessTable();
}

function toggleQuantum() {
  const algo = document.getElementById("algorithm").value;
  document.getElementById("quantumDiv").style.display = algo === "RR" ? "block" : "none";
}

function runSimulation() {
  const algo = document.getElementById("algorithm").value;
  const quantum = parseInt(document.getElementById("timeQuantum").value);
  const gantt = document.getElementById("ganttChart");
  const resultBody = document.querySelector("#resultTable tbody");
  let timeline = [];
  let results = [];

  let queue = processes.map(p => ({ ...p, remaining: p.burst }));

  if (algo === "FIFO") {
    queue.sort((a, b) => a.arrival - b.arrival);
    let time = 0;
    for (let p of queue) {
      time = Math.max(time, p.arrival);
      timeline.push({ name: p.name, start: time, end: time + p.burst });
      results.push({ ...p, finish: time + p.burst });
      time += p.burst;
    }
  }

  else if (algo === "SJF") {
    let time = 0;
    let temp = [...queue];
    while (temp.length) {
      let ready = temp.filter(p => p.arrival <= time);
      if (ready.length === 0) { time++; continue; }
      ready.sort((a, b) => a.burst - b.burst);
      let current = ready[0];
      time = Math.max(time, current.arrival);
      timeline.push({ name: current.name, start: time, end: time + current.burst });
      results.push({ ...current, finish: time + current.burst });
      time += current.burst;
      temp.splice(temp.indexOf(current), 1);
    }
  }

  else if (algo === "SRTF") {
    let time = 0;
    let remaining = [...queue];
    let active = null;
    while (remaining.some(p => p.remaining > 0)) {
      let ready = remaining.filter(p => p.arrival <= time && p.remaining > 0);
      if (ready.length === 0) { time++; continue; }
      ready.sort((a, b) => a.remaining - b.remaining);
      let current = ready[0];

      if (!active || active.name !== current.name) {
        timeline.push({ name: current.name, start: time, end: time + 1 });
        active = current;
      } else {
        let last = timeline.pop();
        timeline.push({ name: last.name, start: last.start, end: time + 1 });
      }
      current.remaining--;
      if (current.remaining === 0) current.finish = time + 1;
      time++;
    }
    results = remaining;
  }

  else if (algo === "RR") {
    let time = 0;
    let ready = [];
    let waiting = [...queue];
    while (waiting.length > 0 || ready.length > 0) {
      for (let i = 0; i < waiting.length; i++) {
        if (waiting[i].arrival <= time) {
          ready.push(waiting[i]);
          waiting.splice(i, 1);
          i--;
        }
      }
      if (ready.length === 0) { time++; continue; }
      let current = ready.shift();
      let run = Math.min(current.remaining, quantum);
      timeline.push({ name: current.name, start: time, end: time + run });
      current.remaining -= run;
      time += run;
      for (let i = 0; i < waiting.length; i++) {
        if (waiting[i].arrival <= time) {
          ready.push(waiting[i]);
          waiting.splice(i, 1);
          i--;
        }
      }
      if (current.remaining > 0) {
        current.arrival = time;
        ready.push(current);
      } else {
        current.finish = time;
      }
    }
    results = queue.map(p => {
      const done = results.find(r => r.name === p.name);
      return done ? done : p;
    });
  }

  renderGantt(timeline);
  renderResult(results);
}

function renderGantt(timeline) {
  const gantt = document.getElementById("ganttChart");
  gantt.innerHTML = "";
  timeline.forEach(item => {
    const div = document.createElement("div");
    div.innerText = '${item.name}\n${item.start}-${item.end}';
    gantt.appendChild(div);
  });
}

function renderResult(results) {
  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = "";
  let totalWait = 0, totalTurn = 0;
  results.forEach(p => {
    let wait = p.finish - p.arrival - p.burst;
    let turn = p.finish - p.arrival;
    totalWait += wait;
    totalTurn += turn;
    const row = `<tr>
      <td>${p.name}</td>
      <td>${p.arrival}</td>
      <td>${p.burst}</td>
      <td>${p.finish ?? 'N/A'}</td>
      <td>${wait ?? 'N/A'}</td>
      <td>${turn ?? 'N/A'}</td>
    </tr>`;
    tbody.innerHTML += row;
  });
  document.getElementById("avgWaiting").innerText = results.length ? (totalWait / results.length).toFixed(2) : 'N/A';
  document.getElementById("avgTurnaround").innerText = results.length ? (totalTurn / results.length).toFixed(2) : 'N/A';
}