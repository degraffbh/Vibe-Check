const { WebSocketServer, WebSocket } = require('ws');
const DB = require('./database');

const MESSAGE_TYPES = {
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

function sortQueue(queue, currentSongId = null) {
  const sortedQueue = [...queue].sort(
    (a, b) => (b.likes || 0) - (a.likes || 0) || (a.timestamp || 0) - (b.timestamp || 0)
  );

  if (!currentSongId) {
    return sortedQueue;
  }

  const currentSongIndex = sortedQueue.findIndex((song) => song.id === currentSongId);
  if (currentSongIndex <= 0) {
    return sortedQueue;
  }

  const [currentSong] = sortedQueue.splice(currentSongIndex, 1);
  return [currentSong, ...sortedQueue];
}

function sanitizeUser(rawUser) {
  const user = `${rawUser || ''}`.trim();
  return user || 'Anonymous';
}

function buildSongFromPayload(song, user) {
  const safeSong = song || {};
  const videoId = `${safeSong.videoId || ''}`.trim();
  const title = `${safeSong.title || ''}`.trim();
  if (!videoId || !title) {
    return null;
  }

  return {
    id: `${safeSong.id || `${videoId}-${Date.now()}`}`,
    videoId,
    title,
    channelTitle: `${safeSong.channelTitle || 'Unknown channel'}`,
    thumbnail: `${safeSong.thumbnail || ''}`,
    user,
    likes: Array.isArray(safeSong.likedBy) ? safeSong.likedBy.length : Number(safeSong.likes || 0),
    likedBy: Array.isArray(safeSong.likedBy) ? safeSong.likedBy.filter(Boolean) : [],
    timestamp: Number(safeSong.timestamp || Date.now()),
  };
}

function getOnlineUsers(socketServer) {
  const users = new Set();

  socketServer.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.introduced) {
      users.add(sanitizeUser(client.user));
    }
  });

  return [...users];
}

function peerProxy(httpServer) {
  const socketServer = new WebSocketServer({ server: httpServer, path: '/ws' });
  const state = {
    chat: [],
    queue: [],
    playback: {
      currentSongId: null,
      startedAtMs: null,
    },
    skip: {
      currentSongId: null,
      votedUsers: [],
    },
  };

  function send(socket, type, payload) {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
  }

  function broadcast(type, payload) {
    socketServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
      }
    });
  }

  function getQueueSorted() {
    return sortQueue(state.queue, state.playback.currentSongId);
  }

  function getPlaybackSnapshot() {
    return {
      ...state.playback,
      serverTimeMs: Date.now(),
    };
  }

  function resetSkipVotes(songId = state.playback.currentSongId) {
    state.skip = {
      currentSongId: songId || null,
      votedUsers: [],
    };
  }

  function getSkipSnapshot() {
    const currentSongId = state.playback.currentSongId || null;
    const onlineUsers = getOnlineUsers(socketServer);
    const votesNeeded = currentSongId ? Math.max(1, Math.ceil(onlineUsers.length / 2)) : 0;
    const votedUsers = currentSongId && state.skip.currentSongId === currentSongId
      ? state.skip.votedUsers.filter((user) => onlineUsers.includes(user))
      : [];

    if (currentSongId !== state.skip.currentSongId || votedUsers.length !== state.skip.votedUsers.length) {
      state.skip = {
        currentSongId,
        votedUsers,
      };
    }

    return {
      currentSongId,
      onlineUsers,
      onlineUserCount: onlineUsers.length,
      votedUsers,
      voteCount: votedUsers.length,
      votesNeeded,
    };
  }

  function broadcastSkipState() {
    broadcast(MESSAGE_TYPES.SKIP_STATE, getSkipSnapshot());
  }

  async function maybeSkipCurrentSong(skipSnapshot = getSkipSnapshot()) {
    const currentSongId = state.playback.currentSongId;
    if (!currentSongId) {
      return false;
    }

    if (skipSnapshot.voteCount < skipSnapshot.votesNeeded) {
      return false;
    }

    resetSkipVotes(currentSongId);
    await advanceToNextSong(currentSongId);
    return true;
  }

  async function advanceToNextSong(songIdToRemove = state.playback.currentSongId) {
    const songId = `${songIdToRemove || ''}`.trim();
    if (!songId || songId !== state.playback.currentSongId) {
      return false;
    }

    const endedSong = state.queue.find((song) => song.id === songId);
    state.queue = state.queue.filter((song) => song.id !== songId);
    if (endedSong) {
      await DB.deleteSongFromQueue(endedSong);
    }

    updatePlaybackAndBroadcastIfNeeded();
    return true;
  }

  function sendStateSnapshot(socket) {
    send(socket, MESSAGE_TYPES.STATE_SNAPSHOT, {
      queue: getQueueSorted(),
      chat: state.chat,
      playback: getPlaybackSnapshot(),
      skip: getSkipSnapshot(),
    });
  }

  function pushSystemChat(text) {
    const message = {
      id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user: 'System',
      text,
      system: true,
      timestamp: Date.now(),
    };

    state.chat = [...state.chat.slice(-99), message];
    broadcast(MESSAGE_TYPES.CHAT_EVENT, message);
  }

  function updatePlaybackAndBroadcastIfNeeded() {
    const sortedQueue = getQueueSorted();
    const hasCurrentSong = state.playback.currentSongId
      ? sortedQueue.some((song) => song.id === state.playback.currentSongId)
      : false;
    const previousSongId = state.playback.currentSongId;

    if (!hasCurrentSong) {
      const nextSong = sortedQueue[0];
      if (nextSong) {
        state.playback = {
          currentSongId: nextSong.id,
          startedAtMs: Date.now(),
        };
      } else {
        state.playback = {
          currentSongId: null,
          startedAtMs: null,
        };
      }

      if (previousSongId !== state.playback.currentSongId) {
        resetSkipVotes(state.playback.currentSongId);
      }

      broadcast(MESSAGE_TYPES.PLAYBACK_STATE, getPlaybackSnapshot());
    }

    broadcast(MESSAGE_TYPES.QUEUE_UPDATE, { queue: sortedQueue });
    broadcastSkipState();
  }

  async function loadInitialQueue() {
    try {
      const queue = await DB.getQueue();
      state.queue = Array.isArray(queue) ? queue : [];
      if (state.queue.length > 0) {
        const sortedQueue = getQueueSorted();
        state.playback = {
          currentSongId: sortedQueue[0].id,
          startedAtMs: Date.now(),
        };
        resetSkipVotes(state.playback.currentSongId);
      }
    } catch (err) {
      console.error('Failed to load initial queue state:', err);
    }
  }

  loadInitialQueue();

  socketServer.on('connection', (socket) => {
    socket.isAlive = true;
    socket.user = 'Anonymous';
    socket.introduced = false;

    socket.on('message', async (rawData) => {
      let data;
      try {
        data = JSON.parse(rawData.toString());
      } catch (_err) {
        send(socket, MESSAGE_TYPES.ERROR_EVENT, { message: 'Invalid websocket payload' });
        return;
      }

      const { type, payload } = data || {};
      if (!type) {
        return;
      }

      if (type === MESSAGE_TYPES.HELLO) {
        socket.user = sanitizeUser(payload?.user);
        if (!socket.introduced) {
          socket.introduced = true;
          pushSystemChat(`${socket.user} joined the room`);
        }
        sendStateSnapshot(socket);
        broadcastSkipState();
        return;
      }

      if (type === MESSAGE_TYPES.SYNC_REQUEST) {
        sendStateSnapshot(socket);
        return;
      }

      if (type === MESSAGE_TYPES.CHAT_SEND) {
        const text = `${payload?.text || ''}`.trim();
        if (!text) {
          return;
        }

        const message = {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          user: socket.user,
          text,
          system: false,
          timestamp: Date.now(),
        };

        state.chat = [...state.chat.slice(-99), message];
        broadcast(MESSAGE_TYPES.CHAT_EVENT, message);
        return;
      }

      if (type === MESSAGE_TYPES.QUEUE_ADD) {
        const newSong = buildSongFromPayload(payload?.song, socket.user);
        if (!newSong) {
          send(socket, MESSAGE_TYPES.ERROR_EVENT, { message: 'Song must include videoId and title' });
          return;
        }

        const existingSongFromUser = state.queue.find((song) => song.user === socket.user);
        if (existingSongFromUser) {
          state.queue = state.queue.filter((song) => song.id !== existingSongFromUser.id);
          await DB.deleteSongFromQueue(existingSongFromUser);
        }

        state.queue = [...state.queue, newSong];
        await DB.addSongToQueue(newSong);
        updatePlaybackAndBroadcastIfNeeded();
        return;
      }

      if (type === MESSAGE_TYPES.QUEUE_REMOVE) {
        const songId = `${payload?.songId || ''}`.trim();
        if (!songId) {
          send(socket, MESSAGE_TYPES.ERROR_EVENT, { message: 'songId is required' });
          return;
        }

        const song = state.queue.find((queueSong) => queueSong.id === songId);
        if (!song) {
          return;
        }

        state.queue = state.queue.filter((queueSong) => queueSong.id !== songId);
        await DB.deleteSongFromQueue(song);
        updatePlaybackAndBroadcastIfNeeded();
        return;
      }

      if (type === MESSAGE_TYPES.QUEUE_LIKE) {
        const songId = `${payload?.songId || ''}`.trim();
        if (!songId) {
          send(socket, MESSAGE_TYPES.ERROR_EVENT, { message: 'songId is required' });
          return;
        }

        const songIndex = state.queue.findIndex((queueSong) => queueSong.id === songId);
        if (songIndex < 0) {
          return;
        }

        const song = state.queue[songIndex];
        const likedBy = Array.isArray(song.likedBy) ? song.likedBy : [];
        const hasLiked = likedBy.includes(socket.user);
        const updatedLikedBy = hasLiked
          ? likedBy.filter((likedUser) => likedUser !== socket.user)
          : [...likedBy, socket.user];

        const updatedSong = {
          ...song,
          likedBy: updatedLikedBy,
          likes: updatedLikedBy.length,
        };

        state.queue[songIndex] = updatedSong;
        await DB.updateSongInQueue(updatedSong);
        updatePlaybackAndBroadcastIfNeeded();
        return;
      }

      if (type === MESSAGE_TYPES.SKIP_VOTE) {
        const currentSongId = state.playback.currentSongId;
        if (!currentSongId) {
          send(socket, MESSAGE_TYPES.ERROR_EVENT, { message: 'No song is currently playing' });
          return;
        }

        const skipSnapshot = getSkipSnapshot();
        const voter = sanitizeUser(socket.user);
        const hasVoted = skipSnapshot.votedUsers.includes(voter);
        state.skip = {
          currentSongId,
          votedUsers: hasVoted
            ? skipSnapshot.votedUsers.filter((user) => user !== voter)
            : [...skipSnapshot.votedUsers, voter],
        };

        const updatedSkipSnapshot = getSkipSnapshot();
        if (await maybeSkipCurrentSong(updatedSkipSnapshot)) {
          return;
        }

        broadcastSkipState();
        return;
      }

      if (type === MESSAGE_TYPES.SONG_ENDED) {
        const songId = `${payload?.songId || ''}`.trim();
        await advanceToNextSong(songId);
      }
    });

    socket.on('close', async () => {
      if (socket.introduced) {
        pushSystemChat(`${socket.user} left the room`);
      }

      const normalizedUser = sanitizeUser(socket.user);
      if (state.skip.votedUsers.includes(normalizedUser)) {
        state.skip = {
          ...state.skip,
          votedUsers: state.skip.votedUsers.filter((user) => user !== normalizedUser),
        };
      }

      const skipSnapshot = getSkipSnapshot();
      if (await maybeSkipCurrentSong(skipSnapshot)) {
        return;
      }

      broadcastSkipState();
    });

    socket.on('pong', () => {
      socket.isAlive = true;
    });
  });

  setInterval(() => {
    socketServer.clients.forEach((client) => {
      if (client.isAlive === false) {
        client.terminate();
        return;
      }

      client.isAlive = false;
      client.ping();
    });
  }, 10000);

  setInterval(() => {
    if (!state.playback.currentSongId) {
      return;
    }

    broadcast(MESSAGE_TYPES.PLAYBACK_STATE, getPlaybackSnapshot());
  }, 8000);
}

module.exports = { peerProxy, MESSAGE_TYPES };