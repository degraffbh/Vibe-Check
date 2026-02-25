import React from 'react';
import './music.css';

export function Music() {
  const [messages, setMessages] = React.useState([
    { id: 1, user: 'Ben DeGraff', text: 'Hi! This is a message!', isOwn: false },
    { id: 2, user: 'You', text: 'You can send your own, it works!', isOwn: true }
  ]);
  const [inputValue, setInputValue] = React.useState('');
  const [queue, setQueue] = React.useState([]); 
  const [userLikes, setUserLikes] = React.useState({}); 
  const currentUser = localStorage.getItem('currentUser') || 'Anonymous';
  const chatBoxRef = React.useRef(null);

  const handleAddSong = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const userSong = queue.find(song => song.user === currentUser);
    const newSong = {
      id: Date.now().toString(),
      title: inputValue,
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
    setInputValue('');
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

  //----------------------------------------------------------------

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim() === '') return;

    const newMessage = {
      id: messages.length + 1,
      user: currentUser,
      text: inputValue,
      isOwn: true
    };

    setMessages([...messages, newMessage]);
    setInputValue('');
    
    setTimeout(() => {
      if (chatBoxRef.current) {
        chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
      }
    }, 0);
  };

  return (
    <main className="vibe-main">
        <section className="card player-section">
            <div className="coverinfo">
                <video controls>
                  <source src="Crystal Skies - VXLLAIN.mp4" type="video/mp4" />
                </video>
                <div className="infoBox">
                    <h2>This Is A Song Title</h2>
                    <h4>This Is A Song Artist</h4>
                </div>
            </div>
            <div className="progressjoin">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '25%' }}></div>
              </div>
              <button name="mute" className="btn btn-primary" type="button" value="false">Join The Jukebox</button>
            </div>
        </section>
        
        <section className="card queue-section">
          <h2>Global Queue</h2>
          <div className="songQue">
              <ol>
                  {topSongs.length === 0 ? (
                    <div style={{ padding: '1em', color: '#888' }}>Queue is empty</div>
                  ) : (
                    topSongs.map(song => (
                      <li className="song" key={song.id}>
                        <img src="songcov.jpg" alt="thumbnail" className="song-thumb" />
                        <span className="song-name">{song.title}</span>
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
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
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
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
          </form>
        </section>
    </main>
  );
}