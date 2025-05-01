function getUsername() {
  const name = document.getElementById('username').value.trim();
  if (!name) {
    alert("Please enter your username.");
    return null;
  }
  return name;
}

function punch(action) {
  const username = getUsername();
  if (!username) return;

  const now = new Date();
  const clientFormatted = now.toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  fetch('/punch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, action, timestamp: clientFormatted })
  })
    .then(res => res.json())
    .then(data => {
      appendOutput(`✅ ${action} punched at ${data.timestamp}`);
    });
}

function viewToday() {
  const username = getUsername();
  if (!username) return;

  fetch(`/today?username=${encodeURIComponent(username)}`)
    .then(res => res.json())
    .then(data => {
      const logLines = data.log.map(e => `➔ ${e.action} at ${e.timestamp}`).join('\n');
      const summary = `🕒 Total hours worked today: ${data.total_hours.toFixed(2)} hrs`;
      document.getElementById("output").innerText = logLines + "\n\n" + summary;
    })
    .catch(() => {
      document.getElementById("output").innerText = ">> Error loading today's log.";
    });
}

function viewWeek() {
  const username = getUsername();
  if (!username) return;

  fetch(`/week?username=${encodeURIComponent(username)}`)
    .then(res => res.json())
    .then(data => {
      const grouped = {};
      data.log.forEach(e => {
        const [date, ...rest] = e.timestamp.split(", ");
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(`${e.action} at ${rest.join(", ")}`);
      });

      let out = "";
      for (const [date, actions] of Object.entries(grouped)) {
        out += `📅 ${date}:\n`;
        actions.forEach(line => out += `  ➔ ${line}\n`);
      }

      out += `\n🕒 Total hours worked this week: ${data.total_hours.toFixed(2)} hrs`;
      document.getElementById("output").innerText = out;
    })
    .catch(() => {
      document.getElementById("output").innerText = ">> Error loading weekly log.";
    });
}

function downloadLog() {
  const username = getUsername();
  if (!username) return;

  fetch(`/download?username=${encodeURIComponent(username)}`)
    .then(response => response.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${username}_log.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
}

function appendOutput(text) {
  const area = document.getElementById("output");
  area.innerText += (area.innerText ? "\n" : "") + text;
}
