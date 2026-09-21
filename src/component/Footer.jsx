import React from "react";
import { Link } from "react-router-dom";
import "./footer.css";

const LINKS = [
  { to: "/home", label: "Home" },
  { to: "/movies", label: "Movies" },
  { to: "/tv", label: "TV shows" },
];

const STACK = ["React", "React Router", "Bootstrap", "Swiper", "TMDB API", "Vercel"];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="sf-top">
          <div className="sf-brand-col">
            <Link to="/home" className="sf-brand">
              <i className="fa-solid fa-clapperboard" aria-hidden="true"></i>
              <span>Club de Cinema</span>
            </Link>
            <p className="sf-tagline">
              Trending movies, TV shows and the people behind them, updated daily.
            </p>
          </div>

          <nav className="sf-links" aria-label="Footer">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to}>
                {l.label}
              </Link>
            ))}
          </nav>

          <button
            className="sf-top-btn"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
          >
            <i className="fa-solid fa-arrow-up" aria-hidden="true"></i>
          </button>
        </div>

        <div className="sf-stack">
          <span className="sf-stack-label">Built with</span>
          <ul>
            {STACK.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>

        <div className="sf-bottom">
          <p>&copy; {year} Club de Cinema. All rights reserved.</p>
          <p className="sf-tmdb">
            Movie and TV data from{" "}
            <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
              TMDB
            </a>
            . This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        </div>
      </div>
    </footer>
  );
}