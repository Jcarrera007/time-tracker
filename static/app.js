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

  fetch('/punch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, action })
  })
    .then(res => res.json())
    .then(data => {
      const formattedTime = new Date(data.timestamp).toLocaleString('en-GB');
      appendOutput(`✅ ${action} punched at ${formattedTime}`);
    });
}

function viewToday() {
  const username = getUsername();
  if (!username) return;

  fetch(`/today?username=${encodeURIComponent(username)}`)
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) {
        document.getElementById("output").innerText = ">> No entries today.";
        return;
      }

      const out = data.map(e => `➔ ${e.action} at ${e.timestamp}`).join('\n');
      document.getElementById("output").innerText = out;
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
      if (!Array.isArray(data) || data.length === 0) {
        document.getElementById("output").innerText = ">> No activity this week.";
        return;
      }

      const grouped = {};
      data.forEach(e => {
        const [date, time, meridiem] = e.timestamp.split(" ");
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push({ action: e.action, time: `${time} ${meridiem}` });
      });

      let out = "";
      for (const [date, entries] of Object.entries(grouped)) {
        out += `📅 ${date}:\n`;
        entries.forEach(e => {
          out += `  ➔ ${e.action} at ${e.time}\n`;
        });
      }

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
