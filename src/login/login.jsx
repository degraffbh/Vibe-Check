import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../app.css';
import {registerUser, loginUser} from '../service';

export function Login({onLogin}) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const navigate = useNavigate();

  function handleRegister(event) {
    event.preventDefault();
    if (email && password) {
      registerUser(email, password);
      onLogin(email);
      setEmail("");
      setPassword("");
      navigate("/music");
    }
  }

  function handleLogin(event) {
    event.preventDefault();
    const user = loginUser(email, password);
    if (user) {
      onLogin(user.email);
      setEmail("");
      setPassword("");
      navigate("/music");
    } else {
      alert("Invalid email or password");
    }
  }

  return (
    <main>
      <h1>Welcome To The Best Online Jukebox</h1>
      <form onSubmit={handleLogin}>
        <div className="login mb-1">
          <span>📧</span>
          <input type="text" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="login mb-1">
          <span>🔒</span>
          <input type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)}  />
        </div>
        <div className="d-flex justify-content-center gap-2 mt-3">
          <button type="submit" className="btn btn-primary">Login</button>
          <button type="button" className="btn btn-primary" onClick={handleRegister}>Create</button>
        </div>
      </form>
    </main>
  );
}