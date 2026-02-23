import React from 'react';
import './music.css';

export function Music() {
  const [messages, setMessages] = React.useState([
    { id: 1, user: 'Ben DeGraff', text: 'Hi! This is a message!', isOwn: false },
    { id: 2, user: 'You', text: 'You can send your own, it works!', isOwn: true }
  ]);
  const [inputValue, setInputValue] = React.useState('');
  const currentUser = localStorage.getItem('currentUser') || 'Anonymous';
  const chatBoxRef = React.useRef(null);

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
                  <li className="song">
                    <img src="songcov.jpg" alt="thumbnail" className="song-thumb" />
                    <span className="song-name">Song 1</span>
                    <span className="like-container">
                      <button className="btn btn-primary lb" type="button">❤️</button>
                      <span className="like-count">17</span>
                    </span>
                  </li>
                  <li className="song">
                    <img src="songcov.jpg" alt="thumbnail" className="song-thumb" />
                    <span className="song-name">Song 2</span>
                    <span className="like-container">
                      <button className="btn btn-primary lb" type="button">❤️</button>
                      <span className="like-count">5</span>
                    </span>
                  </li>
                  <li className="song">
                    <img src="songcov.jpg" alt="thumbnail" className="song-thumb" />
                    <span className="song-name">Song 3</span>
                    <span className="like-container">
                      <button className="btn btn-primary lb" type="button">❤️</button>
                      <span className="like-count">1</span>
                    </span>
                  </li>
                  <li className="song">
                    <img src="songcov.jpg" alt="thumbnail" className="song-thumb" />
                    <span className="song-name">Song 4</span>
                    <span className="like-container">
                      <button className="btn btn-primary lb" type="button">❤️</button>
                      <span className="like-count">1</span>
                    </span>
                  </li>
                  <li className="song">
                    <img src="songcov.jpg" alt="thumbnail" className="song-thumb" />
                    <span className="song-name">Song 5</span>
                    <span className="like-container">
                      <button className="btn btn-primary lb" type="button">❤️</button>
                      <span className="like-count">1</span>
                    </span>
                  </li>
                  <li className="song">
                    <img src="songcov.jpg" alt="thumbnail" className="song-thumb" />
                    <span className="song-name">Song 6</span>
                    <span className="like-container">
                      <button className="btn btn-primary lb" type="button">❤️</button>
                      <span className="like-count">1</span>
                    </span>
                  </li>
              </ol>
          </div>
          <form>
            <label htmlFor="search" id="searchtext">Search:</label>
            <input type="search" id="search" placeholder="add a song" />
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