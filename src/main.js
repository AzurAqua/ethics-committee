import { createClient } from '@supabase/supabase-js';
import { version as appVersion } from '../package.json';
import { actions, applyAction, cellState, emptyRecord, legalActions, tracks } from './tracks.js';
import { authErrorMessage, confirmEmailLink, readEmailLink, submitAuth } from './auth-flow.js';
import './style.css';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const managedAccounts = import.meta.env.VITE_MANAGED_ACCOUNTS === 'true';
const redirectUrl = new URL(import.meta.env.BASE_URL, location.origin).href;
const client = url && key ? createClient(url, key, { auth: { detectSessionInUrl: false, flowType: 'pkce' } }) : null;
const app = document.querySelector('#app');
app.innerHTML = `
  <header class="masthead">
    <div class="mast-inner">
      <div class="brand"><img src="${import.meta.env.BASE_URL}seal.svg" alt=""><div><strong>伦理委员会</strong><small>ETHICS COMMITTEE</small></div></div>
      <div class="account"><span id="account-label"></span><button id="account-button" class="button secondary" hidden>登录</button></div>
    </div>
  </header>
  <main class="shell">
    <section class="hero" aria-labelledby="title">
      <div class="hero-content">
        <div class="hero-kicker"><span></span> 三角机构 <b>／</b> 特工档案</div>
        <h1 id="title">个人进程记录<span>.</span></h1>
        <p>记录每一次推进，也留意时间留下的痕迹。</p>
        <div class="hero-index">FIELD RECORD <i></i> 04 TRACKS</div>
      </div>
      <svg class="hero-mark" viewBox="0 0 320 230" fill="none" aria-hidden="true">
        <path d="M161 10 290 222H32Z M161 49 266 222H56Z M161 86 242 222H80Z M161 124 219 222H103Z" />
        <path d="M8 190h304M8 166h304M8 143h304M161 0v230" stroke-dasharray="3 7" />
        <path class="accent" d="m161 124 34 59h-68Z" />
        <circle cx="161" cy="124" r="5" class="dot" />
      </svg>
    </section>
    <p class="preview-notice">公开版 v${appVersion} · 每个账号保留一份记录。<a href="https://azuraqua.github.io/ethics-committee/">首批玩家第一版入口</a></p>
    <section class="workspace" aria-label="进程轨道">
      <div class="board-bar">
        <div class="board-title"><span>01 /</span><h2>进程轨道</h2></div>
        <div class="legend" aria-label="格子状态图例"><span><i class="legend-lit"></i>点亮</span><span><i class="legend-blank"></i>空白</span><span><i class="legend-grey"></i>划去</span></div>
      </div>
      <div class="statusbar"><p id="status" role="status" aria-live="polite"></p><button id="refresh" class="button text-button" hidden>刷新记录</button></div>
      <div id="tracks" class="tracks"></div>
    </section>
    <details class="help-panel">
      <summary>使用说明与问题反馈</summary>
      <div class="help-content">
        <h2>第一次使用</h2>
        <p>注册邮箱和密码，打开验证邮件并确认，即可记录。换设备时使用同一个账号登录。每个账号一份记录，其他玩家看不到你的进程。</p>
        <h2>怎样点格</h2>
        <p>从左端依次点亮，从右端依次变灰。最后一个亮格和第一个灰格可点击撤回。仅剩一格空白时，可以选择点亮或变灰。四条轨道独立，规则中的联动由你手动操作。</p>
        <h2>保存与找回</h2>
        <p>每次点格后等待「已保存」。重新打开或切回页面时自动同步。看到「记录已在另一台设备更新」时，请先查看新状态再继续操作。保存结果未确认时，点击「刷新记录」核对，不要重复点格。</p>
        <p>收不到邮件时，检查垃圾邮件并确认邮箱拼写，再使用「重发验证邮件」。忘记密码可从登录窗口发送重置链接，请打开最新的一封。密码重置不会清空记录。</p>
        <a href="https://github.com/AzurAqua/ethics-committee/issues" target="_blank" rel="noopener noreferrer">反馈问题</a><span> · 请说明设备、浏览器和页面提示，不要公开密码或邮件链接。</span>
      </div>
    </details>
    <footer><span>伦理委员会 <b>·</b> 个人进程档案</span><span>TRIANGLE AGENCY / PLAYER RECORD</span></footer>
  </main>
  <dialog id="choice" aria-labelledby="choice-title">
    <form method="dialog">
      <p class="dialog-kicker">轨道操作</p><h2 id="choice-title">选择格子状态</h2><p id="choice-detail"></p>
      <div class="dialog-actions"><button value="cancel" class="button secondary" autofocus>取消</button><button value="gray" class="button secondary">变灰</button><button value="light" class="button primary">点亮</button></div>
    </form>
  </dialog>
  <dialog id="auth" aria-labelledby="auth-title">
    <form id="auth-form">
      <button type="button" id="close-auth" class="close" aria-label="关闭">×</button>
      <p class="dialog-kicker">伦理委员会 / 账号</p><h2 id="auth-title"></h2><p id="auth-help"></p>
      <label id="email-row">邮箱<input id="email" type="email" autocomplete="email" maxlength="254"></label>
      <label id="password-row">密码<input id="password" type="password" minlength="8" maxlength="72"></label>
      <label id="confirm-password-row" hidden>确认密码<input id="confirm-password" type="password" autocomplete="new-password" minlength="8" maxlength="72"></label>
      <p id="auth-status" role="status" aria-live="polite"></p>
      <button id="auth-submit" class="button primary auth-submit" type="submit"></button>
      <div id="auth-links" class="auth-links"></div>
    </form>
  </dialog>
`;

const byId = (id) => document.getElementById(id);
const choice = byId('choice');
const auth = byId('auth');
const refresh = byId('refresh');
const accountButton = byId('account-button');
const recoveryKey = 'ethics:recovering';

let session = null;
let epoch = 0;
let record = emptyRecord();
let ready = !client;
let busy = false;
let refreshPending = false;
let recovery = false;
let authMode = 'login';
let authBusy = false;
let selectedCell = null;
let pendingEmailLink = null;

function announce(message, tone = 'neutral') {
  byId('status').textContent = message;
  byId('status').dataset.tone = tone;
}

function canEdit() {
  return ready && !busy && !recovery && !pendingEmailLink && (!client || Boolean(session?.user.email_confirmed_at));
}

function makeBoard() {
  return tracks.map((track, index) => {
    const card = document.createElement('section');
    card.className = 'track track-' + index;
    card.innerHTML = `<div class="track-head"><div class="track-id">${String(index + 1).padStart(2, '0')}</div><div><p>${track.tag}</p><h3>${track.name}</h3></div><div class="count" aria-label="点亮格数"><strong>00</strong><span>/ ${track.size}</span></div></div><div class="track-grid"></div><div class="notes"></div>`;
    const grid = card.querySelector('.track-grid');
    if (track.ranks) grid.classList.add('has-ranks');
    const cells = Array.from({ length: track.size }, (_, offset) => {
      const cell = offset + 1;
      const wrapper = document.createElement('div');
      wrapper.className = 'cell-wrap';
      const rank = document.createElement('span');
      rank.className = 'rank';
      rank.textContent = track.ranks?.[cell] ?? '';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cell';
      button.textContent = track.codes[cell] ?? '';
      button.addEventListener('click', () => selectCell(index, cell));
      wrapper.append(rank, button);
      grid.append(wrapper);
      return button;
    });
    track.notes.forEach((note) => {
      const p = document.createElement('p');
      p.textContent = note;
      card.querySelector('.notes').append(p);
    });
    byId('tracks').append(card);
    return { cells, count: card.querySelector('.count strong') };
  });
}

const board = makeBoard();
function render() {
  accountButton.hidden = !client || recovery;
  accountButton.textContent = session ? '退出' : managedAccounts ? '登录' : '登录 / 注册';
  accountButton.disabled = authBusy;
  byId('account-label').textContent = recovery ? '密码重置' : session?.user.email ?? (client ? '' : '本机试用');
  refresh.hidden = !session || recovery;
  refresh.disabled = busy;
  const labels = { lit: '已点亮', blank: '空白', grey: '已变灰' };

  for (const [index, { cells, count }] of board.entries()) {
    count.textContent = String(record.lit[index]).padStart(2, '0');
    cells.forEach((button, offset) => {
      const cell = offset + 1;
      const track = tracks[index];
      const state = cellState(record, index, cell);
      const allowed = legalActions(record, index, cell);
      button.dataset.state = state;
      button.classList.toggle('available', canEdit() && allowed.length > 0);
      button.disabled = allowed.length === 0 || !ready || recovery || Boolean(pendingEmailLink) || Boolean(client && !session?.user.email_confirmed_at);
      button.setAttribute('aria-disabled', String(button.disabled || busy));
      const details = [track.name + '第' + cell + '格', track.codes[cell], track.ranks?.[cell], labels[state]];
      if (canEdit() && allowed.length) details.push(allowed.map((action) => actions[action]).join('或'));
      button.setAttribute('aria-label', details.filter(Boolean).join('，'));
    });
  }
}

function selectCell(track, cell) {
  if (!canEdit()) return;
  const allowed = legalActions(record, track, cell);
  if (allowed.length === 1) {
    void save(track, cell, allowed[0]);
  } else if (allowed.length === 2) {
    selectedCell = { track, cell, epoch, revision: record.revision };
    byId('choice-detail').textContent = tracks[track].name + ' · 第 ' + cell + ' 格';
    choice.returnValue = 'cancel';
    choice.showModal();
  }
}

choice.addEventListener('close', () => {
  const selected = selectedCell;
  selectedCell = null;
  const action = choice.returnValue;
  if (!selected || selected.epoch !== epoch || selected.revision !== record.revision || !canEdit()) return;
  if (action === 'light' || action === 'gray') void save(selected.track, selected.cell, action);
});

function finishWork(currentEpoch) {
  if (currentEpoch !== epoch) return;
  busy = false;
  render();
  if (refreshPending) {
    refreshPending = false;
    void sync(true);
  }
}

async function sync(quiet = false) {
  if (!client || !session || recovery) return;
  if (busy) {
    refreshPending = true;
    return;
  }
  const currentEpoch = epoch;
  const player = session.user.id;
  busy = true;
  if (!quiet) announce('正在读取记录…');
  render();
  try {
    const { data, error } = await client.from('player_records')
      .select('lit, grey, revision').eq('player_id', player).maybeSingle();
    if (currentEpoch !== epoch) return;
    if (error) throw error;
    const wasReady = ready;
    const changed = (data?.revision ?? 0) !== record.revision;
    record = data ?? emptyRecord();
    ready = true;
    if (changed && choice.open) choice.close('cancel');
    if (quiet && wasReady && changed) announce('记录已在另一台设备更新', 'info');
    else if (!quiet || !wasReady) announce('已同步', 'ok');
  } catch {
    if (currentEpoch === epoch) {
      ready = false;
      announce('暂时无法读取记录，请检查网络并刷新。', 'error');
    }
  } finally {
    finishWork(currentEpoch);
  }
}

async function save(track, cell, action) {
  if (!canEdit() || !legalActions(record, track, cell).includes(action)) return;
  if (!client) {
    record = applyAction(record, track, cell, action);
    render();
    return;
  }
  const currentEpoch = epoch;
  busy = true;
  announce('正在保存…');
  render();
  try {
    const { data, error } = await client.rpc('apply_track_action', {
      p_track: track + 1, p_cell: cell, p_action: action, p_revision: record.revision,
      p_player: session.user.id
    });
    if (currentEpoch !== epoch) return;
    if (error || !data) throw error ?? new Error('Empty response');
    record = { lit: data.lit, grey: data.grey, revision: data.revision };
    announce(data.conflict ? '记录已在另一台设备更新' : '已保存', data.conflict ? 'info' : 'ok');
  } catch {
    if (currentEpoch === epoch) {
      ready = false;
      announce('保存结果未确认，请刷新记录后再操作。', 'error');
    }
  } finally {
    finishWork(currentEpoch);
  }
}

refresh.addEventListener('click', () => void sync());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void sync(true);
});
window.addEventListener('focus', () => {
  if (!busy && document.visibilityState === 'visible') void sync(true);
});

const authText = {
  login: ['登录', managedAccounts
    ? '首批玩家请使用维护者提供的账号。开通账号或忘记密码时，请联系维护者。'
    : '登录后打开你的个人记录。', '登录'],
  signup: ['注册', '验证邮箱后，即可开始记录。', '发送验证邮件'],
  forgot: ['找回密码', '我们会向注册邮箱发送重置链接。', '发送重置链接'],
  resend: ['重发验证邮件', '填写注册时使用的邮箱，收到后请打开最新的一封邮件。', '重发验证邮件'],
  reset: ['设置新密码', '请输入至少 8 个字符的新密码。已有轨道记录会保留。', '保存新密码'],
  confirm: ['确认邮件链接', '点击下方按钮完成邮箱验证或继续重置密码。', '继续']
};

function openAuth(mode, notice = '') {
  authMode = mode;
  const [title, help, submit] = authText[mode];
  byId('auth-title').textContent = title;
  byId('auth-help').textContent = help;
  byId('auth-submit').textContent = submit;
  byId('auth-status').textContent = notice;
  byId('password').value = '';
  byId('confirm-password').value = '';
  const needsEmail = !['reset', 'confirm'].includes(mode);
  const needsPassword = ['login', 'signup', 'reset'].includes(mode);
  const needsConfirmation = ['signup', 'reset'].includes(mode);
  byId('email-row').hidden = !needsEmail;
  byId('email').required = needsEmail;
  byId('password-row').hidden = !needsPassword;
  byId('password').required = needsPassword;
  byId('confirm-password-row').hidden = !needsConfirmation;
  byId('confirm-password').required = needsConfirmation;
  byId('confirm-password').setCustomValidity('');
  byId('password').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  byId('close-auth').hidden = recovery;
  const links = byId('auth-links');
  links.replaceChildren();
  const switches = mode === 'login' ? (managedAccounts ? [] : [['signup', '注册账号'], ['forgot', '忘记密码？'], ['resend', '重发验证邮件']])
    : ['reset', 'confirm'].includes(mode) ? [] : [['login', '返回登录']];
  for (const [next, label] of switches) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button text-button';
    button.textContent = label;
    button.addEventListener('click', () => openAuth(next));
    links.append(button);
  }
  if (!auth.open) auth.showModal();
  byId(mode === 'confirm' ? 'auth-submit' : mode === 'reset' ? 'password' : 'email').focus();
}

function setSession(next) {
  const changed = session?.user.id !== next?.user.id;
  session = next;
  if (changed) {
    epoch++;
    busy = false;
    refreshPending = false;
    record = emptyRecord();
    ready = false;
    if (choice.open) choice.close('cancel');
  }
  render();
  if (recovery || pendingEmailLink) return;
  if (session && !ready) void sync();
  else if (!session) announce('登录后查看和记录你的进程。');
}

accountButton.addEventListener('click', async () => {
  if (!session) return openAuth('login');
  authBusy = true;
  render();
  try {
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw error;
    setSession(null);
  } catch {
    announce('暂时无法退出，请重试。', 'error');
  } finally {
    authBusy = false;
    render();
  }
});
byId('close-auth').addEventListener('click', () => {
  if (authBusy) return;
  pendingEmailLink = null;
  auth.close();
  setSession(session);
});
byId('confirm-password').addEventListener('input', () => byId('confirm-password').setCustomValidity(''));
byId('password').addEventListener('input', () => byId('confirm-password').setCustomValidity(''));
auth.addEventListener('cancel', (event) => {
  if (recovery || authBusy) event.preventDefault();
  else {
    pendingEmailLink = null;
    setSession(session);
  }
});
byId('auth-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (authBusy || !client) return;
  const mode = authMode;
  const email = byId('email').value.trim();
  const password = byId('password').value;
  if (['signup', 'reset'].includes(mode) && password !== byId('confirm-password').value) {
    byId('confirm-password').setCustomValidity('两次密码输入不一致。');
    byId('confirm-password').reportValidity();
    return;
  }
  const feedback = byId('auth-status');
  authBusy = true;
  for (const button of auth.querySelectorAll('button')) button.disabled = true;
  feedback.textContent = '正在处理…';
  try {
    if (mode === 'confirm') {
      const link = pendingEmailLink;
      const next = await confirmEmailLink(client.auth, link);
      pendingEmailLink = null;
      if (link.type === 'recovery') {
        recovery = true;
        sessionStorage.setItem(recoveryKey, next.user.id);
        setSession(next);
        openAuth('reset');
      } else {
        auth.close();
        setSession(next);
        announce('邮箱验证成功，正在读取记录…', 'ok');
      }
      return;
    }
    const data = await submitAuth(client.auth, mode, { email, password, redirectUrl });
    if (mode === 'signup' || mode === 'resend') {
      openAuth('login', '若账号尚未验证，请查收验证邮件（包括垃圾邮件），并打开最新的一封完成验证。');
    } else if (mode === 'forgot') {
      openAuth('login', '若该邮箱已注册，请查收密码重置邮件。');
    } else if (mode === 'reset') {
      sessionStorage.removeItem(recoveryKey);
      recovery = false;
      auth.close();
      setSession(session);
      announce('新密码已保存，轨道记录已保留。', 'ok');
    } else {
      auth.close();
      setSession(data.session);
    }
  } catch (error) {
    if (mode === 'confirm' && error.code === 'otp_expired') {
      const next = pendingEmailLink?.type === 'recovery' ? 'forgot' : 'resend';
      pendingEmailLink = null;
      openAuth(next, authErrorMessage(error, mode));
    } else feedback.textContent = authErrorMessage(error, mode);
  } finally {
    authBusy = false;
    for (const button of auth.querySelectorAll('button')) button.disabled = false;
    render();
  }
});

async function boot() {
  if (!client) {
    announce('本机试用 · 格子变化仅保留在当前页面。');
    render();
    return;
  }
  announce('正在连接账号…');
  render();
  const address = new URL(location.href);
  pendingEmailLink = readEmailLink(location.href);
  let emailLinkNotice = '';
  if (pendingEmailLink) {
    address.searchParams.delete('token_hash');
    address.searchParams.delete('type');
    history.replaceState(null, '', address.pathname + address.search);
  } else if (address.searchParams.has('error') || address.searchParams.has('code')) {
    emailLinkNotice = '邮件链接无法使用，请重新发送邮件。若持续失败，请反馈问题。';
    for (const name of ['error', 'error_code', 'error_description', 'code']) address.searchParams.delete(name);
    history.replaceState(null, '', address.pathname + address.search);
  }
  const { data } = await client.auth.getSession();
  recovery = Boolean(data.session && sessionStorage.getItem(recoveryKey) === data.session.user.id);
  setSession(data.session);
  if (pendingEmailLink) {
    recovery = false;
    openAuth('confirm');
  } else if (recovery) {
    announce('请设置新密码。');
    openAuth('reset');
  } else if (emailLinkNotice) openAuth('login', emailLinkNotice);
  client.auth.onAuthStateChange((event, next) => {
    if (event === 'INITIAL_SESSION') return;
    setTimeout(() => {
      if (!next && recovery) {
        sessionStorage.removeItem(recoveryKey);
        recovery = false;
        auth.close();
      }
      setSession(next);
    }, 0);
  });
}

void boot().catch(() => {
  announce('暂时无法连接，请刷新页面重试。', 'error');
  render();
});
