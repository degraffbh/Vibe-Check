import React from 'react';
import YouTube from 'react-youtube';
import './music.css';
import { searchYouTube } from '../service';
import {
  connectWebSocket,
  disconnectWebSocket,
  onMessage,
  requestSyncState,
  sendAddSong,
  sendChatMessage,
  sendLikeSong,
  sendRemoveSong,
  sendSongEnded,
  WS_MESSAGE_TYPES,
} from '../wsService';

export function Music() {
  const [messages, setMessages] = React.useState([]);
  const [songInput, setSongInput] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);
  const [searchError, setSearchError] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [chatInput, setChatInput] = React.useState('');
  const [queue, setQueue] = React.useState([]);
  const [queueError, setQueueError] = React.useState('');
  const [videoProgress, setVideoProgress] = React.useState(0);
  const [inJukebox, setInJukebox] = React.useState(false);
  const [playbackState, setPlaybackState] = React.useState({ currentSongId: null, startedAtMs: null });
  const currentUser = localStorage.getItem('currentUser') || 'Anonymous';
  const chatBoxRef = React.useRef(null);
  const playerRef = React.useRef(null);
  const intervalRef = React.useRef(null);
  const endedSongRef = React.useRef(null);

  const normalizeUser = React.useCallback((user) => `${user || ''}`.trim().toLowerCase(), []);
  const isOwnMessage = React.useCallback(
    (messageUser) => normalizeUser(messageUser) === normalizeUser(currentUser),
    [currentUser, normalizeUser]
  );

  const sortedQueue = React.useMemo(
    () => [...queue].sort((a, b) => (b.likes || 0) - (a.likes || 0) || (a.timestamp || 0) - (b.timestamp || 0)),
    [queue]
  );

  const nowPlaying = React.useMemo(() => {
    if (!playbackState?.currentSongId) {
      return null;
    }

    return sortedQueue.find((song) => song.id === playbackState.currentSongId) || null;
  }, [playbackState?.currentSongId, sortedQueue]);

  const topSongs = React.useMemo(() => sortedQueue.slice(0, 6), [sortedQueue]);

  const syncPlayerToServer = React.useCallback(() => {
    const player = playerRef.current;
    if (!player || !nowPlaying || !playbackState?.startedAtMs) {
      return;
    }

    const targetSeconds = Math.max(0, (Date.now() - playbackState.startedAtMs) / 1000);
    try {
      const currentSeconds = player.getCurrentTime ? player.getCurrentTime() : 0;
      if (Math.abs(currentSeconds - targetSeconds) > 1.5 && player.seekTo) {
        player.seekTo(targetSeconds, true);
      }
      if (player.playVideo) {
        player.playVideo();
      }
    } catch (err) {
      console.warn('Unable to sync local player with server playback:', err);
    }
  }, [nowPlaying, playbackState]);

  const handleSocketMessage = React.useCallback((message) => {
    if (!message?.type) {
      return;
    }

    if (message.type === WS_MESSAGE_TYPES.STATE_SNAPSHOT) {
      setQueue(Array.isArray(message.payload?.queue) ? message.payload.queue : []);
      setMessages(
        Array.isArray(message.payload?.chat)
          ? message.payload.chat.map((chatMessage) => ({
              ...chatMessage,
              isOwn: !chatMessage.system && isOwnMessage(chatMessage.user),
            }))
          : []
      );
      setPlaybackState(message.payload?.playback || { currentSongId: null, startedAtMs: null });
      setQueueError('');
      return;
    }

    if (message.type === WS_MESSAGE_TYPES.CHAT_EVENT) {
      if (message.payload) {
        setMessages((prevMessages) => [
          ...prevMessages.slice(-99),
          {
            ...message.payload,
            isOwn: !message.payload.system && isOwnMessage(message.payload.user),
          },
        ]);
      }
      return;
    }

    if (message.type === WS_MESSAGE_TYPES.QUEUE_UPDATE) {
      setQueue(Array.isArray(message.payload?.queue) ? message.payload.queue : []);
      setQueueError('');
      return;
    }

    if (message.type === WS_MESSAGE_TYPES.PLAYBACK_STATE) {
      setPlaybackState(message.payload || { currentSongId: null, startedAtMs: null });
      return;
    }

    if (message.type === WS_MESSAGE_TYPES.ERROR_EVENT) {
      setQueueError(message.payload?.message || 'Real-time update failed');
    }
  }, [isOwnMessage]);

  React.useEffect(() => {
    setMessages((prevMessages) =>
      prevMessages.map((message) => ({
        ...message,
        isOwn: !message.system && isOwnMessage(message.user),
      }))
    );
  }, [isOwnMessage]);

  //----Queue Logic----------------------------------------------------------------

  const handleAddSong = (e) => {
    e.preventDefault();
    if (searchResults.length === 0) return;
    addSongToQueue(searchResults[0]);
  };

  const addSongToQueue = async (result) => {
    if (!result?.videoId) return;

    const newSong = {
      id: `${result.videoId}-${Date.now()}`,
      videoId: result.videoId,
      title: result.title,
      channelTitle: result.channelTitle,
      thumbnail: result.thumbnail,
      user: currentUser,
      likes: 0,
      likedBy: [],
      timestamp: Date.now()
    };

    try {
      sendAddSong(newSong);
      setSongInput('');
      setSearchResults([]);
      setSearchError('');
    } catch (err) {
      setSearchError(err.message || 'Unable to add song');
    }
  };

  const handleRemoveSong = async (songId) => {
    sendRemoveSong(songId);
  };

  const handleLikeSong = async (songId) => {
    try {
      sendLikeSong(songId);
      setQueueError('');
    } catch (err) {
      setQueueError(err.message || 'Unable to update like');
    }
  };

  //----Song Player Logic----------------------------------------------------------------

  React.useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;

    unsubscribe = onMessage(handleSocketMessage);
    connectWebSocket(currentUser)
      .then(() => {
        if (cancelled) {
          return;
        }
        requestSyncState();
      })
      .catch((err) => {
        if (!cancelled) {
          setQueueError(err?.message || 'Unable to connect to realtime server');
        }
      });

    return () => {
      cancelled = true;
      unsubscribe();
      disconnectWebSocket();
    };
  }, [currentUser, handleSocketMessage]);

  React.useEffect(() => {
    if (!songInput.trim()) {
      setSearchResults([]);
      setSearchError('');
      return;
    }

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchYouTube(songInput.trim());
        if (!cancelled) {
          setSearchResults(results);
          setSearchError('');
        }
      } catch (err) {
        if (!cancelled) {
          setSearchResults([]);
          setSearchError(err.message || 'Unable to search YouTube');
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [songInput]);

  React.useEffect(() => {
    if (!nowPlaying) {
      setVideoProgress(0);
      playerRef.current = null;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [nowPlaying?.id]);

  React.useEffect(() => {
    endedSongRef.current = null;
    syncPlayerToServer();
  }, [nowPlaying?.id, playbackState?.startedAtMs, syncPlayerToServer]);

  React.useEffect(() => {
    if (!chatBoxRef.current) {
      return;
    }
    chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [messages]);

  React.useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleToggleJukebox = () => {
    const player = playerRef.current;
    if (player) {
      if (inJukebox) {
        player.mute();
      } else {
        player.unMute();
      }
    }
    setInJukebox(!inJukebox);
  };

  const updateProgress = () => {
    const player = playerRef.current;
    if (!player) return;

    const duration = player.getDuration();
    if (!duration) {
      setVideoProgress(0);
      return;
    }

    const currentTime = player.getCurrentTime();
    setVideoProgress((currentTime / duration) * 100);
  };

  const startProgressTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(updateProgress, 500);
  };

  const handlePlayerReady = (event) => {
    playerRef.current = event.target;
    if (!inJukebox) {
      event.target.mute();
    }
    syncPlayerToServer();
  };

  const handlePlayerStateChange = (event) => {
    if (!window.YT) return;

    if (event.data === window.YT.PlayerState.PLAYING) {
      startProgressTracking();
      return;
    }

    if (event.data === window.YT.PlayerState.PAUSED) {
      try {
        event.target.playVideo();
      } catch (err) {
        console.error('Unable to resume paused video:', err);
      }
      return;
    }

    if (event.data === window.YT.PlayerState.ENDED) {
      setVideoProgress(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (nowPlaying && endedSongRef.current !== nowPlaying.id) {
        endedSongRef.current = nowPlaying.id;
        sendSongEnded(nowPlaying.id);
      }
    }
  };

  const handlePlayerError = (event) => {
    console.warn(`YouTube player error (code ${event.data}) for "${nowPlaying?.title}" — removing from queue`);
    if (nowPlaying && endedSongRef.current !== nowPlaying.id) {
      endedSongRef.current = nowPlaying.id;
      sendSongEnded(nowPlaying.id);
    }
  };

  const playerOptions = {
    width: '390',
    height: '225',
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      rel: 0,
      modestbranding: 1,
      iv_load_policy: 3,
      playsinline: 1,
    },
  };

  //----Chat Logic----------------------------------------------------------------

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (chatInput.trim() === '') return;

    sendChatMessage(currentUser, chatInput.trim());
    setChatInput('');
  };

  //----------------------------------------------------------------

  return (
    <main className="vibe-main">
        <section className="card player-section">
            <div className="coverinfo">
                {nowPlaying ? (
                  <YouTube
                    key={nowPlaying.id}
                    className="youtube-player"
                    videoId={nowPlaying.videoId}
                    opts={playerOptions}
                    onReady={handlePlayerReady}
                    onStateChange={handlePlayerStateChange}
                    onError={handlePlayerError}
                  />
                ) : (
                  <div className="youtube-placeholder">No song selected yet</div>
                )}
                <div className="infoBox">
                    <h2>{nowPlaying ? nowPlaying.title : 'No Song Playing'}</h2>
                    <h4>{nowPlaying ? nowPlaying.channelTitle : 'Artist - TBD'}</h4>
                </div>
            </div>
            <div className="progressjoin">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${videoProgress}%` }}></div>
              </div>
              <button 
                className="joinJukebox btn btn-primary" 
                type="button" 
                onClick={handleToggleJukebox}
              >
                {inJukebox ? 'Leave The Jukebox' : 'Join The Jukebox'}
              </button>
            </div>
        </section>
        
        <section className="card queue-section">
          <h2>Global Queue</h2>
          {queueError && <div className="search-error">{queueError}</div>}
          <div className="songQue">
              <ol>
                  {topSongs.length === 0 ? (
                    <div style={{ padding: '1em', color: '#888' }}>Queue is empty</div>
                  ) : (
                    topSongs.map((song, index) => (
                      <li className="song" key={song.id} style={song.id === nowPlaying?.id ? { backgroundColor: 'rgba(0, 255, 100, 0.1)', borderLeft: '3px solid #00ff64' } : {}}>
                        <img src={song.thumbnail || 'songcov.jpg'} alt="thumbnail" className="song-thumb" />
                        <span className="song-name">
                          {song.title}
                          {song.id === nowPlaying?.id && <span style={{marginLeft: '0.5em', color: '#00ff64', fontSize: '0.8em', fontWeight: 'bold' }}>PLAYING NOW ▶</span>}
                        </span>
                        <span className="like-container">
                          <button
                            className={`btn btn-primary lb${(song.likedBy || []).includes(currentUser) ? ' liked' : ''}`}
                            type="button"
                            onClick={() => handleLikeSong(song.id)}
                          >❤️</button>
                          <span className="like-count">{song.likes}</span>
                        </span>
                        {song.user === currentUser && song.id !== nowPlaying?.id && (
                          <button className="btn btn-outline-danger btn-sm" style={{ marginLeft: '0.5em', padding: '2px 6px', fontSize: '0.8em' }} onClick={() => handleRemoveSong(song.id)}>✕</button>
                        )}
                      </li>
                    ))
                  )}
              </ol>
          </div>
          <form onSubmit={handleAddSong} style={{ marginTop: '1em' }}>
            <label htmlFor="search" id="searchtext">Add a Song:</label>
            <div className="search-container">
              <input
                type="text"
                id="search"
                placeholder="search YouTube"
                value={songInput}
                onChange={e => setSongInput(e.target.value)}
                autoComplete="off"
              />
              {(isSearching || searchError || searchResults.length > 0) && (
                <div className="search-overlay">
                  {isSearching && <div className="search-status">Searching...</div>}
                  {searchError && <div className="search-error">{searchError}</div>}
                  {searchResults.length > 0 && (
                    <ul className="search-results">
                      {searchResults.map((result) => (
                        <li key={result.videoId}>
                          <button
                            type="button"
                            className="search-result-button"
                            onClick={() => addSongToQueue(result)}
                          >
                            <img src={result.thumbnail || 'songcov.jpg'} alt="result thumbnail" className="song-thumb" />
                            <span>{result.title}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </form>
        </section>
        
        <section className="card chat-section">
          <h2>Chat</h2>
          <div className="chatBox" ref={chatBoxRef}>
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.system ? 'received' : msg.isOwn ? 'sent' : 'received'}`}>
                {!msg.system && !msg.isOwn && <span className="user-name">{msg.user}</span>}
                {msg.system && <span className="user-name">System</span>}
                {msg.text}
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage}>
              <label htmlFor="chat" id="chattext">Send A Message:</label>
              <input 
                type="text" 
                id="chat" 
                placeholder="..." 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
          </form>
        </section>
    </main>
  );
}