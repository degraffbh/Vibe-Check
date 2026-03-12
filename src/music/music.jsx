import React from 'react';
import YouTube from 'react-youtube';
import './music.css';
import { searchYouTube } from '../service';

export function Music() {
  const [messages, setMessages] = React.useState([
    { id: 1, user: 'Ben DeGraff', text: 'Hi! This is a message!', isOwn: false },
    { id: 2, user: 'You', text: 'You can send your own, it works!', isOwn: true }
  ]);
  const [songInput, setSongInput] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);
  const [searchError, setSearchError] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [chatInput, setChatInput] = React.useState('');
  const [queue, setQueue] = React.useState([]); 
  const [userLikes, setUserLikes] = React.useState({}); 
  const [videoProgress, setVideoProgress] = React.useState(0);
  const [inJukebox, setInJukebox] = React.useState(false);
  const currentUser = localStorage.getItem('currentUser') || 'Anonymous';
  const chatBoxRef = React.useRef(null);
  const playerRef = React.useRef(null);
  const intervalRef = React.useRef(null);

  //----Queue Logic----------------------------------------------------------------

  const handleAddSong = (e) => {
    e.preventDefault();
    if (searchResults.length === 0) return;
    addSongToQueue(searchResults[0]);
  };

  const addSongToQueue = (result) => {
    if (!result?.videoId) return;

    const userSong = queue.find(song => song.user === currentUser);
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
    let newQueue = queue;
    if (userSong) {
      newQueue = queue.filter(song => song.user !== currentUser);
    }
    setQueue([...newQueue, newSong]);
    setSongInput('');
    setSearchResults([]);
    setSearchError('');
  };

  const handleRemoveSong = (songId) => {
    setQueue(queue.filter(song => song.id !== songId));
  };

  const handleLikeSong = (songId) => {
    const alreadyLiked = userLikes[songId];
    setUserLikes({ ...userLikes, [songId]: !alreadyLiked });
    setQueue(queue.map(song => {
      if (song.id === songId) {
        if (!alreadyLiked && !song.likedBy.includes(currentUser)) {
          return {
            ...song,
            likes: song.likes + 1,
            likedBy: [...song.likedBy, currentUser]
          };
        } else if (alreadyLiked && song.likedBy.includes(currentUser)) {
          return {
            ...song,
            likes: song.likes - 1,
            likedBy: song.likedBy.filter(u => u !== currentUser)
          };
        }
      }
      return song;
    }));
  };

  const topSongs = [...queue]
    .sort((a, b) => (b.likes || 0) - (a.likes || 0) || b.timestamp - a.timestamp)
    .slice(0, 6);
  const nowPlaying = topSongs[0];

  //----Song Player Logic----------------------------------------------------------------

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
    if (nowPlaying?.videoId) {
      event.target.loadVideoById(nowPlaying.videoId);
    }
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
      if (nowPlaying) {
        setQueue(prevQueue => prevQueue.filter(song => song.id !== nowPlaying.id));
      }
    }
  };

  const handlePlayerError = () => {
    if (nowPlaying) {
      setQueue(prevQueue => prevQueue.filter(song => song.id !== nowPlaying.id));
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

    const newMessage = {
      id: messages.length + 1,
      user: currentUser,
      text: chatInput,
      isOwn: true
    };

    setMessages([...messages, newMessage]);
    setChatInput('');
    
    setTimeout(() => {
      if (chatBoxRef.current) {
        chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
      }
    }, 0);
  };

  //----------------------------------------------------------------

  return (
    <main className="vibe-main">
        <section className="card player-section">
            <div className="coverinfo">
                {nowPlaying ? (
                  <YouTube
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
          <div className="songQue">
              <ol>
                  {topSongs.length === 0 ? (
                    <div style={{ padding: '1em', color: '#888' }}>Queue is empty</div>
                  ) : (
                    topSongs.map((song, index) => (
                      <li className="song" key={song.id} style={index === 0 ? { backgroundColor: 'rgba(0, 255, 100, 0.1)', borderLeft: '3px solid #00ff64' } : {}}>
                        <img src={song.thumbnail || 'songcov.jpg'} alt="thumbnail" className="song-thumb" />
                        <span className="song-name">
                          {song.title}
                          {index === 0 && <span style={{marginLeft: '0.5em', color: '#00ff64', fontSize: '0.8em', fontWeight: 'bold' }}>PLAYING NOW ▶</span>}
                        </span>
                        <span className="like-container">
                          <button
                            className={`btn btn-primary lb${userLikes[song.id] ? ' liked' : ''}`}
                            type="button"
                            onClick={() => handleLikeSong(song.id)}
                          >❤️</button>
                          <span className="like-count">{song.likes}</span>
                        </span>
                        {song.user === currentUser && index !== 0 && (
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
              <div key={msg.id} className={`message ${msg.isOwn ? 'sent' : 'received'}`}>
                {!msg.isOwn && <span className="user-name">{msg.user}</span>}
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