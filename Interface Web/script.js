// Preferências de aparência salvas no navegador.
try {
  const temaSalvo = localStorage.getItem('flexmotion-theme');
  const temaDoSistema = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = temaSalvo || (temaDoSistema ? 'dark' : 'light');
} catch (erro) {
  document.documentElement.dataset.theme = 'dark';
}

const MAX_POINTS = 60;
const MAX_ROWS = 8;
const MAX_LEVEL = 10;

const ui = {
  form: document.getElementById('connectionForm'),
  host: document.getElementById('host'),
  port: document.getElementById('port'),
  username: document.getElementById('username'),
  password: document.getElementById('password'),
  topic: document.getElementById('topic'),
  connectButton: document.getElementById('connectButton'),
  demoButton: document.getElementById('demoButton'),
  themeButton: document.getElementById('themeButton'),
  pill: document.getElementById('connectionPill'),
  connectionText: document.getElementById('connectionText'),
  level: document.getElementById('levelValue'),
  angle: document.getElementById('angleValue'),
  resistance: document.getElementById('resistanceValue'),
  adc: document.getElementById('adcValue'),
  gauge: document.getElementById('gauge'),
  gaugeValue: document.getElementById('gaugeValue'),
  stateBadge: document.getElementById('stateBadge'),
  stateIndicator: document.getElementById('stateIndicator'),
  stateText: document.getElementById('stateText'),
  historyBody: document.getElementById('historyBody'),
  messageCount: document.getElementById('messageCount'),
  canvas: document.getElementById('levelChart'),
  toast: document.getElementById('toast')
};

const connectionDialog = document.getElementById('connectDialog');

let mqttClient = null;
let demoTimer = null;
let toastTimer = null;
let baseTopic = 'landim/flexmotion';
let totalMessages = 0;
let history = [];
let chartPoints = [];

function numeric(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function setTheme(theme, persist = true) {
  const selected = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = selected;

  const themeColor = selected === 'dark' ? '#0b1212' : '#f4f7f5';
  document.querySelector('meta[name="theme-color"]').setAttribute('content', themeColor);

  if (persist) {
    try {
      localStorage.setItem('flexmotion-theme', selected);
    } catch (erro) {
      // O painel continua funcionando mesmo sem acesso ao armazenamento local.
    }
  }

  drawChart();
}

function setConnection(status, message) {
  ui.pill.dataset.status = status;
  ui.connectionText.textContent = message;
}

function showToast(message, type = 'normal') {
  clearTimeout(toastTimer);
  ui.toast.textContent = message;
  ui.toast.className = `toast show${type === 'error' ? ' error' : ''}`;

  toastTimer = setTimeout(() => {
    ui.toast.className = 'toast';
  }, 4300);
}

function openConnectionDialog() {
  if (typeof connectionDialog.showModal === 'function') {
    connectionDialog.showModal();
  } else {
    connectionDialog.setAttribute('open', '');
  }
}

function closeConnectionDialog() {
  if (typeof connectionDialog.close === 'function') {
    connectionDialog.close();
  } else {
    connectionDialog.removeAttribute('open');
  }
}

function flexState(level) {
  if (level <= 3.3) {
    return { text: 'Pouca flexão', color: '#37ad78' };
  }

  if (level <= 6.6) {
    return { text: 'Flexão intermediária', color: '#e8aa32' };
  }

  return { text: 'Alta flexão', color: '#e96d7e' };
}

function resetReadingView() {
  history = [];
  chartPoints = [];
  totalMessages = 0;

  ui.level.textContent = '0.0';
  ui.angle.textContent = '0.0';
  ui.resistance.textContent = '0.00';
  ui.adc.textContent = '0';
  ui.gaugeValue.textContent = '0.0°';
  ui.gauge.style.setProperty('--gauge-angle', '0deg');
  ui.stateText.textContent = 'Aguardando dados';
  ui.stateIndicator.style.background = '#8b9996';
  ui.stateBadge.style.borderColor = '';
  ui.messageCount.textContent = '0 mensagens';
  ui.historyBody.innerHTML = `
    <tr class="empty-row">
      <td colspan="5">Aguardando dados da ESP32.</td>
    </tr>`;

  drawChart();
}

// Recebe os valores publicados pela ESP32 e atualiza as informações da tela.
function processReading(payload) {
  const level = clamp(numeric(payload.nivel), 0, MAX_LEVEL);
  const angle = clamp(numeric(payload.angulo_graus), 0, 90);

  const reading = {
    time: new Date(),
    level,
    angle,
    resistance: Math.max(0, numeric(payload.resistencia_kohm)),
    adc: Math.max(0, Math.round(numeric(payload.adc)))
  };

  totalMessages++;
  chartPoints.push(reading);
  history.unshift(reading);

  if (chartPoints.length > MAX_POINTS) {
    chartPoints.shift();
  }

  if (history.length > MAX_ROWS) {
    history.pop();
  }

  updateDashboard(reading);
  renderHistory();
  drawChart();
}

function updateDashboard(reading) {
  const state = flexState(reading.level);

  ui.level.textContent = reading.level.toFixed(1);
  ui.angle.textContent = reading.angle.toFixed(1);
  ui.resistance.textContent = reading.resistance.toFixed(2);
  ui.adc.textContent = String(reading.adc);
  ui.gaugeValue.textContent = `${reading.angle.toFixed(1)}°`;
  ui.gauge.style.setProperty('--gauge-angle', `${(reading.angle / 90) * 280}deg`);

  ui.stateText.textContent = state.text;
  ui.stateIndicator.style.background = state.color;
  ui.stateIndicator.style.boxShadow = `0 0 14px ${state.color}`;
  ui.stateBadge.style.borderColor = `${state.color}55`;

  const message = totalMessages === 1 ? 'mensagem' : 'mensagens';
  ui.messageCount.textContent = `${totalMessages} ${message}`;
}

function renderHistory() {
  if (history.length === 0) {
    ui.historyBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="5">Aguardando dados da ESP32.</td>
      </tr>`;
    return;
  }

  ui.historyBody.innerHTML = history.map((item) => {
    const time = item.time.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    return `
      <tr>
        <td>${time}</td>
        <td>${item.level.toFixed(1)} / 10</td>
        <td>${item.angle.toFixed(1)}°</td>
        <td>${item.resistance.toFixed(2)} kΩ</td>
        <td>${item.adc}</td>
      </tr>`;
  }).join('');
}

function drawChart() {
  const canvas = ui.canvas;
  const rect = canvas.getBoundingClientRect();

  if (!rect.width || !rect.height) {
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const pad = { top: 12, right: 12, bottom: 31, left: 42 };
  const width = rect.width - pad.left - pad.right;
  const height = rect.height - pad.top - pad.bottom;
  const y = (value) => pad.top + height - (value / MAX_LEVEL) * height;

  const dark = currentTheme() === 'dark';
  const grid = dark ? 'rgba(215,235,226,.18)' : 'rgba(29,91,73,.20)';
  const label = dark ? '#b4c7c0' : '#426259';

  const zones = dark
    ? [
        [0, 3.3, 'rgba(55,173,120,.13)'],
        [3.3, 6.6, 'rgba(232,170,50,.12)'],
        [6.6, 10, 'rgba(233,109,126,.12)']
      ]
    : [
        [0, 3.3, 'rgba(55,173,120,.24)'],
        [3.3, 6.6, 'rgba(232,170,50,.22)'],
        [6.6, 10, 'rgba(233,109,126,.21)']
      ];

  zones.forEach(([min, max, color]) => {
    ctx.fillStyle = color;
    ctx.fillRect(pad.left, y(max), width, y(min) - y(max));
  });

  ctx.font = '10px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  [0, 2.5, 5, 7.5, 10].forEach((value) => {
    const position = y(value);

    ctx.strokeStyle = grid;
    ctx.beginPath();
    ctx.moveTo(pad.left, position);
    ctx.lineTo(pad.left + width, position);
    ctx.stroke();

    ctx.fillStyle = label;
    ctx.fillText(value.toFixed(value % 1 ? 1 : 0), pad.left - 9, position);
  });

  if (chartPoints.length === 0) {
    ctx.fillStyle = label;
    ctx.textAlign = 'center';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillText(
      'Aguardando as primeiras amostras',
      pad.left + width / 2,
      pad.top + height / 2
    );
    return;
  }

  const x = (index) => chartPoints.length === 1
    ? pad.left + width
    : pad.left + (index / (MAX_POINTS - 1)) * width;

  const shift = MAX_POINTS - chartPoints.length;
  const line = new Path2D();

  chartPoints.forEach((point, index) => {
    const px = x(index + shift);
    const py = y(point.level);

    if (index === 0) {
      line.moveTo(px, py);
    } else {
      line.lineTo(px, py);
    }
  });

  const firstX = x(shift);
  const lastX = x(MAX_POINTS - 1);
  const area = new Path2D(line);
  area.lineTo(lastX, y(0));
  area.lineTo(firstX, y(0));
  area.closePath();

  const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + height);
  gradient.addColorStop(0, 'rgba(55,173,152,.25)');
  gradient.addColorStop(1, 'rgba(55,173,152,.005)');

  ctx.fillStyle = gradient;
  ctx.fill(area);
  ctx.strokeStyle = '#42bca7';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke(line);

  const last = chartPoints[chartPoints.length - 1];
  const state = flexState(last.level);

  ctx.fillStyle = state.color;
  ctx.beginPath();
  ctx.arc(lastX, y(last.level), 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = label;
  ctx.font = '10px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';
  ctx.fillText(chartPoints[0].time.toLocaleTimeString('pt-BR'), pad.left, rect.height - 4);
  ctx.textAlign = 'right';
  ctx.fillText(last.time.toLocaleTimeString('pt-BR'), pad.left + width, rect.height - 4);
}

function disconnectMQTT() {
  if (mqttClient) {
    mqttClient.end(true);
    mqttClient = null;
  }
}

function stopDemo() {
  if (demoTimer) {
    clearInterval(demoTimer);
    demoTimer = null;
  }

  ui.demoButton.textContent = 'Iniciar demonstração';
}

function connectMQTT() {
  stopDemo();
  disconnectMQTT();

  if (!window.mqtt || typeof window.mqtt.connect !== 'function') {
    showToast('Não foi possível carregar a biblioteca MQTT. Verifique os arquivos do projeto.', 'error');
    return;
  }

  const host = ui.host.value.trim();
  const port = ui.port.value.trim() || '8884';
  const username = ui.username.value.trim();
  const password = ui.password.value;
  baseTopic = ui.topic.value.trim().replace(/\/+$/, '');

  if (!host || !username || !password || !baseTopic) {
    showToast('Preencha servidor, porta, usuário, senha e tópico para conectar.', 'error');
    return;
  }

  resetReadingView();
  setConnection('connecting', 'Conectando…');
  ui.connectButton.disabled = true;

  const randomId = window.crypto.randomUUID
    ? window.crypto.randomUUID().slice(0, 8)
    : Math.random().toString(16).slice(2, 10);

  mqttClient = mqtt.connect(`wss://${host}:${port}/mqtt`, {
    username,
    password,
    clientId: `flexmotion-web-${randomId}`,
    clean: true,
    connectTimeout: 12000,
    reconnectPeriod: 2500,
    keepalive: 30,
    protocolVersion: 4
  });

  mqttClient.on('connect', () => {
    setConnection('connected', 'MQTT conectado');
    ui.connectButton.disabled = false;
    ui.connectButton.textContent = 'Reconectar';

    mqttClient.subscribe(`${baseTopic}/dados`, { qos: 0 }, (error) => {
      if (error) {
        showToast(`Não foi possível assinar o tópico: ${error.message}`, 'error');
      } else {
        closeConnectionDialog();
        showToast('Conectado. Aguardando as medições da ESP32.');
      }
    });
  });

  mqttClient.on('message', (topic, message) => {
    if (topic !== `${baseTopic}/dados`) {
      return;
    }

    try {
      processReading(JSON.parse(message.toString()));
    } catch (erro) {
      showToast('Mensagem recebida, mas o conteúdo não é um JSON válido.', 'error');
    }
  });

  mqttClient.on('reconnect', () => {
    setConnection('connecting', 'Reconectando…');
  });

  mqttClient.on('offline', () => {
    setConnection('connecting', 'Sem conexão');
  });

  mqttClient.on('close', () => {
    if (mqttClient) {
      setConnection('disconnected', 'Desconectado');
    }
  });

  mqttClient.on('error', (error) => {
    ui.connectButton.disabled = false;
    setConnection('disconnected', 'Falha na conexão');
    showToast(`Falha MQTT: ${error.message || 'verifique as credenciais'}`, 'error');
  });
}

function toggleDemo() {
  if (demoTimer) {
    stopDemo();
    setConnection('disconnected', 'Demonstração pausada');
    return;
  }

  disconnectMQTT();
  resetReadingView();
  setConnection('connected', 'Modo demonstração');
  ui.demoButton.textContent = 'Parar demo';
  showToast('Demonstração iniciada com dados simulados.');

  let phase = 0;

  function generateReading() {
    phase += 0.28;

    const level = clamp(
      5 + Math.sin(phase) * 4.2 + (Math.random() - 0.5) * 0.22,
      0,
      MAX_LEVEL
    );

    const angle = level * 9;

    processReading({
      nivel: level,
      angulo_graus: angle,
      resistencia_kohm: 10.2 + level * 1.65 + Math.random() * 0.25,
      adc: Math.round(1200 + level * 230)
    });
  }

  generateReading();
  demoTimer = setInterval(generateReading, 900);
}

// Eventos dos botões e do formulário.
ui.form.addEventListener('submit', (event) => {
  event.preventDefault();
  connectMQTT();
});

ui.demoButton.addEventListener('click', toggleDemo);
ui.themeButton.addEventListener('click', () => {
  setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
});

document.getElementById('settingsButton').addEventListener('click', openConnectionDialog);
document.getElementById('heroSettingsButton').addEventListener('click', openConnectionDialog);
document.getElementById('closeDialogButton').addEventListener('click', closeConnectionDialog);
document.getElementById('cancelDialogButton').addEventListener('click', closeConnectionDialog);

connectionDialog.addEventListener('click', (event) => {
  if (event.target === connectionDialog) {
    closeConnectionDialog();
  }
});

window.addEventListener('resize', drawChart);
window.addEventListener('beforeunload', () => {
  stopDemo();
  disconnectMQTT();
});

if ('ResizeObserver' in window) {
  new ResizeObserver(drawChart).observe(ui.canvas.parentElement);
}

setTheme(currentTheme(), false);
drawChart();
