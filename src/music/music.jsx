import React from 'react';
import './music.css';

export function Music() {
  const [messages, setMessages] = React.useState([
    { id: 1, user: 'Ben DeGraff', text: 'Hi! This is a message!', isOwn: false },
    { id: 2, user: 'You', text: 'You can send your own, it works!', isOwn: true }
  ]);
  const [songInput, setSongInput] = React.useState('');
  const [chatInput, setChatInput] = React.useState('');
  const [queue, setQueue] = React.useState([]); 
  const [userLikes, setUserLikes] = React.useState({}); 
  const [videoProgress, setVideoProgress] = React.useState(0);
  const [inJukebox, setInJukebox] = React.useState(false);
  const currentUser = localStorage.getItem('currentUser') || 'Anonymous';
  const chatBoxRef = React.useRef(null);
  const videoRef = React.useRef(null);

  //----Queue Logic----------------------------------------------------------------

  const handleAddSong = (e) => {
    e.preventDefault();
    if (!songInput.trim()) return;
    const userSong = queue.find(song => song.user === currentUser);
    const newSong = {
      id: Date.now().toString(),
      title: songInput,
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

  //----Song Player Logic----------------------------------------------------------------

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const progress = (video.currentTime / video.duration) * 100;
      setVideoProgress(progress);
    };

    const handleEnded = () => {
      setVideoProgress(0);
      if (topSongs.length > 0) {
        setQueue(prevQueue => prevQueue.filter(song => song.id !== topSongs[0].id));
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [topSongs]);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (topSongs.length > 0) {
      video.currentTime = 0;
      video.play().catch(err => console.log('Autoplay prevented:', err));
    } else {
      video.pause();
      video.currentTime = 0;
      setVideoProgress(0);
    }
  }, [topSongs.length > 0 ? topSongs[0]?.id : null]);

  const handleToggleJukebox = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = inJukebox;
    }
    setInJukebox(!inJukebox);
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
                <video ref={videoRef} controlsList="nodownload nofullscreen noremoteplayback" disablePictureInPicture muted>
                  <source src="Crystal Skies - VXLLAIN.mp4" type="video/mp4" />
                </video>
                <div className="infoBox">
                    <h2>{topSongs.length > 0 ? topSongs[0].title : 'No Song Playing'}</h2>
                    <h4>Artist - TBD</h4>
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
                        <img src="songcov.jpg" alt="thumbnail" className="song-thumb" />
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
                        {song.user === currentUser && (
                          <button className="btn btn-outline-danger btn-sm" style={{ marginLeft: '0.5em', padding: '2px 6px', fontSize: '0.8em' }} onClick={() => handleRemoveSong(song.id)}>✕</button>
                        )}
                      </li>
                    ))
                  )}
              </ol>
          </div>
          <form onSubmit={handleAddSong} style={{ marginTop: '1em' }}>
            <label htmlFor="search" id="searchtext">Add a Song:</label>
            <input
              type="text"
              id="search"
              placeholder="add a song"
              value={songInput}
              onChange={e => setSongInput(e.target.value)}
              autoComplete="off"
            />
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