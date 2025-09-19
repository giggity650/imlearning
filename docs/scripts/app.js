import { MarkovLearner } from './learner.js';

const connectForm = document.querySelector('#connect-form');
const chatSection = document.querySelector('#chat-section');
const messageList = document.querySelector('#conversation');
const messageForm = document.querySelector('#message-form');
const messageInput = document.querySelector('#message-input');
const statusLine = document.querySelector('#status-line');
const historySummary = document.querySelector('#history-summary');

const learner = new MarkovLearner();
let config = null;
let conversation = { messages: [] };
let fileSha = null;
let isSaving = false;

connectForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (isSaving) {
    return;
  }
  const formData = new FormData(connectForm);
  const owner = formData.get('owner').trim();
  const repo = formData.get('repo').trim();
  const branch = formData.get('branch').trim() || 'main';
  const path = formData.get('path').trim() || 'data/conversations.json';
  const token = formData.get('token').trim();

  if (!owner || !repo) {
    setStatus('Repository owner and name are required.', true);
    return;
  }

  config = { owner, repo, branch, path, token };
  setStatus('Connecting to GitHub…');

  try {
    await loadConversation();
    renderMessages();
    chatSection.classList.remove('hidden');
    setStatus('Connected. Start chatting!');
  } catch (error) {
    console.error(error);
    setStatus(`Failed to load conversation: ${error.message}`, true);
    chatSection.classList.add('hidden');
  }
});

messageForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!config) {
    setStatus('Connect to a repository before chatting.', true);
    return;
  }
  if (isSaving) {
    return;
  }
  const text = messageInput.value.trim();
  if (!text) {
    return;
  }

  const timestamp = new Date().toISOString();
  const userMessage = { speaker: 'user', text, timestamp };
  conversation.messages.push(userMessage);
  const reply = learner.nextReply(conversation.messages);
  const botMessage = { speaker: 'bot', text: reply, timestamp: new Date().toISOString() };
  conversation.messages.push(botMessage);
  renderMessages();
  messageInput.value = '';
  setStatus('Saving conversation to GitHub…');

  try {
    await saveConversation();
    setStatus('Conversation saved. Keep going!');
  } catch (error) {
    console.error(error);
    // Revert the last two messages if the save failed.
    conversation.messages.splice(-2, 2);
    renderMessages();
    setStatus(`Failed to save conversation: ${error.message}`, true);
  }
});

async function loadConversation() {
  if (!config) {
    throw new Error('Not configured');
  }
  const headers = buildHeaders();
  const url = buildContentsUrl();
  const response = await fetch(url, { headers });
  if (response.status === 404) {
    conversation = { messages: [] };
    fileSha = null;
    setStatus('No existing conversation found. A new one will be created when you chat.');
    renderMessages();
    return;
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  const payload = await response.json();
  fileSha = payload.sha;
  const text = decodeBase64(payload.content);
  try {
    conversation = JSON.parse(text);
  } catch (error) {
    throw new Error('Conversation file is not valid JSON.');
  }
  if (!conversation.messages) {
    conversation.messages = [];
  }
  renderMessages();
}

async function saveConversation() {
  if (!config) {
    throw new Error('Not configured');
  }
  if (!config.token) {
    throw new Error('A GitHub personal access token is required to save changes.');
  }
  isSaving = true;
  try {
    const headers = buildHeaders(true);
    const url = buildContentsUrl();
    const content = JSON.stringify(conversation, null, 2) + '\n';
    const body = {
      message: 'Update conversation log via web chat',
      content: encodeBase64(content),
      branch: config.branch,
    };
    if (fileSha) {
      body.sha = fileSha;
    }
    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    const payload = await response.json();
    fileSha = payload.content?.sha ?? null;
  } finally {
    isSaving = false;
  }
}

function renderMessages() {
  messageList.innerHTML = '';
  conversation.messages.forEach((message) => {
    const item = document.createElement('li');
    item.className = `message message-${message.speaker}`;
    const header = document.createElement('div');
    header.className = 'message-meta';
    const speaker = message.speaker === 'bot' ? 'Learner' : 'You';
    header.textContent = `${speaker} • ${new Date(message.timestamp).toLocaleString()}`;
    const text = document.createElement('div');
    text.className = 'message-text';
    text.textContent = message.text;
    item.appendChild(header);
    item.appendChild(text);
    messageList.appendChild(item);
  });
  historySummary.textContent = `${conversation.messages.length} messages stored`;
  messageList.scrollTop = messageList.scrollHeight;
}

function buildContentsUrl() {
  const { owner, repo, path, branch } = config;
  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;
}

function buildHeaders(includeToken = false) {
  const headers = {
    Accept: 'application/vnd.github+json',
  };
  const token = includeToken ? config.token : config.token || '';
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  headers['X-GitHub-Api-Version'] = '2022-11-28';
  return headers;
}

function setStatus(message, isError = false) {
  statusLine.textContent = message;
  statusLine.classList.toggle('error', Boolean(isError));
}

function decodeBase64(value) {
  const binary = atob(value.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

function encodeBase64(value) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}
