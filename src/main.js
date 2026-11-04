import { createClient } from '@supabase/supabase-js';
import { actions, applyAction, cellState, emptyRecord, legalActions, tracks } from './tracks.js';
import './style.css';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const client = url && key ? createClient(url, key, { auth: { detectSessionInUrl: false, flowType: 'pkce' } }) : null;
const app = document.querySelector('#app');
app.innerHTML = `
  <header class="masthead">
    <div class="mast-inner">
      <div class="brand"><img src="/seal.svg" alt=""><div><strong>伦理委员会</strong><small>ETHICS COMMITTEE</small></div></div>
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
    <section class="workspace" aria-label="进程轨道">
      <div class="board-bar">
        <div class="board-title"><span>01 /</span><h2>进程轨道</h2></div>
        <div class="legend" aria-label="格子状态图例"><span><i class="legend-lit"></i>点亮</span><span><i class="legend-blank"></i>空白</span><span><i class="legend-grey"></i>划去</span></div>
      </div>
      <div class="statusbar"><p id="status" role="status" aria-live="polite"></p><button id="refresh" class="button text-button" hidden>刷新记录</button></div>
      <div id="tracks" class="tracks"></div>
    </section>
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

function announce(message, tone = 'neutral') {
  byId('status').textContent = message;
  byId('status').dataset.tone = tone;
}

function canEdit() {
  return ready && !busy && !recovery && (!client || Boolean(session?.user.email_confirmed_at));
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
  accountButton.textContent = session ? '退出' : '登录 / 注册';
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
      button.disabled = allowed.length === 0 || !ready || recovery || Boolean(client && !session?.user.email_confirmed_at);
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
  login: ['登录', '登录后打开你的个人记录。', '登录'],
  signup: ['注册', '验证邮箱后，即可开始记录。', '发送验证邮件'],
  forgot: ['找回密码', '我们会向注册邮箱发送重置链接。', '发送重置链接'],
  reset: ['设置新密码', '请输入至少 8 个字符的新密码。', '保存新密码']
};

function openAuth(mode, notice = '') {
  authMode = mode;
  const [title, help, submit] = authText[mode];
  byId('auth-title').textContent = title;
  byId('auth-help').textContent = help;
  byId('auth-submit').textContent = submit;
  byId('auth-status').textContent = notice;
  byId('password').value = '';
  byId('email-row').hidden = mode === 'reset';
  byId('email').required = mode !== 'reset';
  byId('password-row').hidden = mode === 'forgot';
  byId('password').required = mode !== 'forgot';
  byId('password').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  byId('close-auth').hidden = mode === 'reset';
  const links = byId('auth-links');
  links.replaceChildren();
  const switches = mode === 'login' ? [['signup', '注册账号'], ['forgot', '忘记密码？']]
    : mode === 'reset' ? [] : [['login', '返回登录']];
  for (const [next, label] of switches) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button text-button';
    button.textContent = label;
    button.addEventListener('click', () => openAuth(next));
    links.append(button);
  }
  if (!auth.open) auth.showModal();
  byId(mode === 'reset' ? 'password' : 'email').focus();
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
  if (recovery) return;
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
byId('close-auth').addEventListener('click', () => auth.close());
auth.addEventListener('cancel', (event) => {
  if (recovery || authBusy) event.preventDefault();
});
byId('auth-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (authBusy || !client) return;
  const mode = authMode;
  const email = byId('email').value.trim();
  const password = byId('password').value;
  const options = { emailRedirectTo: location.origin };
  const feedback = byId('auth-status');
  authBusy = true;
  for (const button of auth.querySelectorAll('button')) button.disabled = true;
  feedback.textContent = '正在处理…';
  try {
    let result;
    if (mode === 'login') result = await client.auth.signInWithPassword({ email, password });
    if (mode === 'signup') result = await client.auth.signUp({ email, password, options });
    if (mode === 'forgot') result = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
    if (mode === 'reset') result = await client.auth.updateUser({ password });
    if (result.error) throw result.error;
    if (mode === 'signup') {
      if (result.data.session) {
        await client.auth.signOut({ scope: 'local' });
        throw new Error('Email verification is disabled');
      }
      openAuth('login', '请查收验证邮件，完成验证后登录。');
    } else if (mode === 'forgot') {
      openAuth('login', '若该邮箱已注册，请查收密码重置邮件。');
    } else if (mode === 'reset') {
      sessionStorage.removeItem(recoveryKey);
      recovery = false;
      auth.close();
      setSession(session);
    } else {
      auth.close();
      setSession(result.data.session);
    }
  } catch {
    feedback.textContent = mode === 'login' ? '登录失败，请检查邮箱、密码和验证状态后重试。'
      : '暂时无法完成，请检查网络和输入后重试。';
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
  const token = address.searchParams.get('token_hash');
  const type = address.searchParams.get('type');
  let emailLinkNotice = '';
  if (token) {
    address.searchParams.delete('token_hash');
    address.searchParams.delete('type');
    history.replaceState(null, '', address.pathname + address.search);
    try {
      if (type !== 'signup' && type !== 'recovery') throw new Error('Unknown link type');
      const { data, error } = await client.auth.verifyOtp({ token_hash: token, type });
      if (error) throw error;
      if (type === 'recovery' && data.session) sessionStorage.setItem(recoveryKey, data.session.user.id);
      if (type === 'signup') emailLinkNotice = '邮箱验证成功';
    } catch {
      emailLinkNotice = '邮件链接已失效，请重新发起验证或重置。';
    }
  }
  const { data } = await client.auth.getSession();
  recovery = Boolean(data.session && sessionStorage.getItem(recoveryKey) === data.session.user.id);
  setSession(data.session);
  if (recovery) {
    announce('请设置新密码。');
    openAuth('reset');
  } else if (emailLinkNotice && !session) openAuth('login', emailLinkNotice);
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
