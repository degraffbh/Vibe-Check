let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 8;
const RECONNECT_DELAY = 2000;
let reconnectTimeout = null;
let listeners = [];
let currentUserRef = 'Anonymous';
let shouldReconnect = true;

const WS_MESSAGE_TYPES = {
  HELLO: 'hello',
  CHAT_SEND: 'chat_send',
  CHAT_EVENT: 'chat_event',
  QUEUE_ADD: 'queue_add',
  QUEUE_REMOVE: 'queue_remove',
  QUEUE_LIKE: 'queue_like',
  QUEUE_UPDATE: 'queue_update',
  SKIP_VOTE: 'skip_vote',
  SKIP_STATE: 'skip_state',
  SONG_ENDED: 'song_ended',
  PLAYBACK_STATE: 'playback_state',
  SYNC_REQUEST: 'sync_request',
  STATE_SNAPSHOT: 'state_snapshot',
  ERROR_EVENT: 'error_event',
};

function notifyListeners(data) {
  listeners.forEach((listener) => {
    try {
      listener(data);
    } catch (err) {
      console.error('WebSocket listener error:', err);
    }
  });
}

function attemptReconnect() {
  if (!shouldReconnect) {
    return;
  }

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('Max websocket reconnection attempts reached');
    return;
  }

  reconnectAttempts += 1;
  reconnectTimeout = setTimeout(() => {
    connectWebSocket(currentUserRef).catch((err) => {
      console.error('WebSocket reconnection failed:', err);
    });
  }, RECONNECT_DELAY);
}

export function connectWebSocket(currentUser) {
  currentUserRef = `${currentUser || 'Anonymous'}`;
  shouldReconnect = true;

  return new Promise((resolve, reject) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      sendMessage(WS_MESSAGE_TYPES.HELLO, { user: currentUserRef });
      resolve();
      return;
    }

    if (ws && ws.readyState === WebSocket.CONNECTING) {
      resolve();
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:3000`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      reconnectAttempts = 0;
      sendMessage(WS_MESSAGE_TYPES.HELLO, { user: currentUserRef });
      resolve();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        notifyListeners(data);
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onerror = (error) => {
      reject(error);
    };

    ws.onclose = () => {
      ws = null;
      attemptReconnect();
    };
  });
}

export function disconnectWebSocket() {
  shouldReconnect = false;

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (ws) {
    ws.close();
    ws = null;
  }

  listeners = [];
  reconnectAttempts = 0;
}

export function sendMessage(type, payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return false;
  }

  try {
    ws.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
    return true;
  } catch (err) {
    console.error('Error sending WebSocket message:', err);
    return false;
  }
}

export function onMessage(callback) {
  listeners.push(callback);

  return () => {
    listeners = listeners.filter((listener) => listener !== callback);
  };
}

export function sendChatMessage(_user, text) {
  return sendMessage(WS_MESSAGE_TYPES.CHAT_SEND, { text });
}

export function sendAddSong(song) {
  return sendMessage(WS_MESSAGE_TYPES.QUEUE_ADD, { song });
}

export function sendRemoveSong(songId) {
  return sendMessage(WS_MESSAGE_TYPES.QUEUE_REMOVE, { songId });
}

export function sendLikeSong(songId) {
  return sendMessage(WS_MESSAGE_TYPES.QUEUE_LIKE, { songId });
}

export function sendSongEnded(songId) {
  return sendMessage(WS_MESSAGE_TYPES.SONG_ENDED, { songId });
}

export function sendSkipVote() {
  return sendMessage(WS_MESSAGE_TYPES.SKIP_VOTE, {});
}

export function requestSyncState() {
  return sendMessage(WS_MESSAGE_TYPES.SYNC_REQUEST, {});
}

export function isWebSocketConnected() {
  return !!ws && ws.readyState === WebSocket.OPEN;
}

export { WS_MESSAGE_TYPES };