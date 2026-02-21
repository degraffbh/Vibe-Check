import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './app.css';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { Login } from './login/login';
import { Music } from './music/music';
import { About } from './about/about';

export default function App() {
  const [userEmail, setUserEmail] = React.useState("");

  const handleLogin = (email) => {
    setUserEmail(email);
    localStorage.setItem("currentUser", email);
  };

  const handleLogout = () => {
    setUserEmail("");
    localStorage.removeItem("currentUser");
  };

  return (
    <BrowserRouter>
      <div className="body">
        <head>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
          
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />

          <link rel="stylesheet" href="main.css"/>
          <link rel="stylesheet" href="music.css"/>
          <link rel="stylesheet" href="about.css"/>
          <title>Vibe Check HTML</title>
        </head>
        <header>
            <h1>Vibe Check ♫</h1>
            <nav>
              <menu>
                <li><NavLink to="login">Home</NavLink></li>
                <li><NavLink to="music">Vibe</NavLink></li>
                <li><NavLink to="about">About</NavLink></li>
                <li><span className="username">{userEmail || "Not Logged In"}</span></li>
              </menu>
            </nav>
          </header>
          
          <Routes>
            <Route path='/' element={<Login onLogin={handleLogin} />} exact />
            <Route path='/login' element={<Login onLogin={handleLogin} />} />
            <Route path='/music' element={<Music />} />
            <Route path='/about' element={<About />} />
            <Route path='*' element={<NotFound />} />
          </Routes>
        
          <footer>
            <span className="text-reset">Ben DeGraff</span>
            <br />
            <NavLink to="https://github.com/degraffbh/Vibe-Check">GitHub</NavLink>
          </footer>

          <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      </div>
    </BrowserRouter>
  )
}

function NotFound() {
  return <main className="container-fluid bg-secondary text-center">404: Return to sender. Address unknown.</main>;
}