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

      if (window.summaryChart) summaryChart.destroy();
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

      renderChart(data);
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

let summaryChart = null;

function renderChart(data) {
  const ctx = document.getElementById("summaryChart").getContext("2d");

  if (summaryChart) summaryChart.destroy();

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hourMap = {};

  data.log.forEach(entry => {
    const [datePart, timePart] = entry.timestamp.split(", ");
    const date = new Date(`${datePart} ${timePart}`);
    const dayName = days[date.getDay()];

    if (!hourMap[dayName]) hourMap[dayName] = 0;
    if (entry.action === "IN") {
      hourMap[dayName] -= date.getTime();
    } else if (entry.action === "OUT") {
      hourMap[dayName] += date.getTime();
    }
  });

  const labels = days;
  const hours = days.map(day => {
    const ms = hourMap[day] || 0;
    return +(ms / (1000 * 60 * 60)).toFixed(2);
  });

  summaryChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Hours Worked",
        data: hours,
        backgroundColor: "rgba(54, 162, 235, 0.7)"
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

async function login() {
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const errorDiv = document.getElementById("loginError");
    errorDiv.textContent = "";

    if (!username || !password) {
        errorDiv.textContent = "Please enter both username and password.";
        return;
    }

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok && data.status === "ok") {
            // Hide login, show main
            document.getElementById("loginSection").classList.add("d-none");
            document.getElementById("mainSection").classList.remove("d-none");
            document.getElementById("logoutBtn").classList.remove("d-none");
            document.getElementById("username").value = username;

            // Show admin section if admin
            if (data.role === "admin") {
                document.getElementById("adminSection").classList.remove("d-none");
            } else {
                document.getElementById("adminSection").classList.add("d-none");
            }
        } else {
            errorDiv.textContent = data.message || "Login failed.";
        }
    } catch (err) {
        errorDiv.textContent = "Server error. Please try again.";
    }
}

// Optional: Logout function
async function logout() {
    await fetch("/logout");
    document.getElementById("mainSection").classList.add("d-none");
    document.getElementById("loginSection").classList.remove("d-none");
    document.getElementById("logoutBtn").classList.add("d-none");
    document.getElementById("loginUsername").value = "";
    document.getElementById("loginPassword").value = "";
    document.getElementById("loginError").textContent = "";
}

// Add this to allow pressing Enter to submit login
document.getElementById("loginPassword").addEventListener("keyup", function(event) {
    if (event.key === "Enter") {
        login();
    }
});
