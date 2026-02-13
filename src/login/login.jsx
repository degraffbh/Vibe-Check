import React from 'react';
import '../app.css';

export function Login() {
  return (
    <main>
      <h1>Welcome To The Best Online Jukebox</h1>
      <form method="get" action="music.html">
        <div className="login mb-1">
          <span>📧</span>
          <input type="text" placeholder="email" />
        </div>
        <div className="login mb-1">
          <span>🔒</span>
          <input type="password" placeholder="password" />
        </div>
        <div className="d-flex justify-content-center gap-2 mt-3">
          <button type="submit" className="btn btn-primary">Login</button>
          <button type="submit" className="btn btn-primary">Create</button>
        </div>
      </form>
    </main>
  );
}