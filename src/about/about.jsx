import React from 'react';
import { NavLink } from 'react-router-dom';
import './about.css';

export function About() {
  return (
    <main>
      <h2>About Vibe Check</h2>
        <p>Vibe Check is a full-stack project made by Ben DeGraff, a CS Student at BYU. Vibe Check was created in a period of around 4 months and furthur development is TBD. All songs played are 5 minutes or less.</p>
        <h3>Vibe Check's Goal</h3>
        <p>Vibe Check aims to allow users to listen to music with their friends and family in a fair and shared way. Users can all suggest songs, chat with one another, and listen together. The experience is made to be shared, and enjoying music together is something that we believe is very special.</p>
        <h3>Bugs Or Errors?</h3>
        <p>If you encounter any bugs or errors while using Vibe Check, you may email this address and we'll get back to you!</p>
        <NavLink to="mailto:benjamindegraff@gmail.com">Send an email</NavLink>
    </main>
  );
}