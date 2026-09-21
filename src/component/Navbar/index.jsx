import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Navbar.css";
import nofilm from "../../assets/poster.png";

const API_KEY = "c9fac173689f5f01ba1b0420f66d7093";

const LINKS = [
  { to: "/home", label: "Home", icon: "fa-house" },
  { to: "/movies", label: "Movies", icon: "fa-film" },
  { to: "/tv", label: "TV shows", icon: "fa-tv" },
];

const TYPE_LABEL = { movie: "Movie", tv: "TV show", person: "Person" };

const routeFor = (item) =>
  item.media_type === "person"
    ? `/person/${item.id}`
    : `/details/${item.media_type}/${item.id}`;

function metaFor(item) {
  if (item.media_type === "person") {
    return [TYPE_LABEL.person, item.known_for_department].filter(Boolean);
  }
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  return [TYPE_LABEL[item.media_type], year].filter(Boolean);
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const searchRef = useRef(null);
  const inputRef = useRef(null);

  // Solid background once the page scrolls
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menu and suggestions whenever the route changes
  useEffect(() => {
    setMenuOpen(false);
    setOpen(false);
  }, [location.pathname, location.search]);

  // Mobile menu: lock page scroll, close on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Press "/" anywhere to jump to search
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(tag)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Click outside closes suggestions
  useEffect(() => {
    const onDown = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Debounced search; cancels outdated requests
  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const id = setTimeout(() => {
      axios
        .get("https://api.themoviedb.org/3/search/multi", {
          params: { api_key: API_KEY, query: term, include_adult: false },
          signal: controller.signal,
        })
        .then(({ data }) => {
          setResults(data.results.filter((r) => TYPE_LABEL[r.media_type]).slice(0, 8));
          setLoading(false);
        })
        .catch((err) => {
          if (!axios.isCancel(err)) {
            console.error("Error fetching search results:", err);
            setLoading(false);
          }
        });
    }, 300);
    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [query]);

  // Keep the keyboard-highlighted result visible
  useEffect(() => {
    if (highlight >= 0) {
      document.getElementById(`search-opt-${highlight}`)?.scrollIntoView({ block: "nearest" });
    }
  }, [highlight]);

  const reset = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
    setHighlight(-1);
    inputRef.current?.blur();
  };

  const goSearch = () => {
    const term = query.trim();
    if (!term) return;
    navigate(`/search?query=${encodeURIComponent(term)}`);
    reset();
  };

  const choose = (item) => {
    navigate(routeFor(item));
    reset();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlight >= 0 && results[highlight]) choose(results[highlight]);
      else goSearch();
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showPanel = open && query.trim().length > 0;
  const linkClass = ({ isActive }) => `nav-tab${isActive ? " is-active" : ""}`;
  const drawerLinkClass = ({ isActive }) => `drawer-link${isActive ? " is-active" : ""}`;

  return (
    <header className={`site-nav${scrolled ? " is-scrolled" : ""}`}>
      <div className="container nav-inner">
        <Link to="/home" className="brand">
          <i className="fa-solid fa-clapperboard" aria-hidden="true"></i>
          <span>Club de Cinema</span>
        </Link>

        <nav className="nav-tabs-main" aria-label="Main">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* Search */}
        <div className="search" ref={searchRef}>
          <div className="search-field">
            <i className="fa-solid fa-magnifying-glass search-icon" aria-hidden="true"></i>
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={showPanel}
              aria-controls="search-results"
              aria-activedescendant={highlight >= 0 ? `search-opt-${highlight}` : undefined}
              aria-label="Search movies, TV shows or people"
              placeholder="Search movies, TV shows or people"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                setHighlight(-1);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
            />
            {query ? (
              <button className="search-clear" onClick={reset} aria-label="Clear search">
                <i className="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            ) : (
              <kbd className="search-kbd" aria-hidden="true">/</kbd>
            )}
          </div>

          {showPanel && (
            <div className="search-panel">
              {loading && results.length === 0 ? (
                <p className="search-note">Searching…</p>
              ) : results.length === 0 ? (
                <p className="search-note">No matches for “{query.trim()}”</p>
              ) : (
                <ul id="search-results" role="listbox" className="search-list">
                  {results.map((item, i) => {
                    const img = item.poster_path || item.profile_path;
                    return (
                      <li
                        key={`${item.media_type}-${item.id}`}
                        id={`search-opt-${i}`}
                        role="option"
                        aria-selected={i === highlight}
                        className={`search-item${i === highlight ? " is-highlighted" : ""}`}
                        onMouseEnter={() => setHighlight(i)}
                        onClick={() => choose(item)}
                      >
                        <img
                          src={img ? `https://image.tmdb.org/t/p/w92${img}` : nofilm}
                          alt=""
                          className={item.media_type === "person" ? "is-person" : ""}
                          loading="lazy"
                        />
                        <div className="search-item-text">
                          <span className="search-item-title">{item.title || item.name}</span>
                          <span className="search-item-meta">
                            {metaFor(item).map((m) => (
                              <span key={m}>{m}</span>
                            ))}
                          </span>
                        </div>
                        {item.media_type !== "person" && item.vote_average > 0 && (
                          <span className="search-item-rating">
                            <i className="fa-solid fa-star" aria-hidden="true"></i>
                            {item.vote_average.toFixed(1)}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <button className="search-all" onClick={goSearch}>
                See all results for “{query.trim()}”
                <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </button>
            </div>
          )}
        </div>

        <button
          className="menu-btn"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen(true)}
        >
          <i className="fa-solid fa-bars" aria-hidden="true"></i>
        </button>
      </div>

      {/* Mobile drawer: rendered in <body> so the header's blur can't clip it */}
      {createPortal(
        <>
          <div
            className={`drawer-backdrop${menuOpen ? " is-open" : ""}`}
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <aside id="mobile-menu" className={`drawer${menuOpen ? " is-open" : ""}`} aria-label="Menu">
            <div className="drawer-head">
              <span className="brand">
                <i className="fa-solid fa-clapperboard" aria-hidden="true"></i>
                <span>Club de Cinema</span>
              </span>
              <button className="drawer-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <i className="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            </div>
            <nav className="drawer-links">
              {LINKS.map((l) => (
                <NavLink key={l.to} to={l.to} className={drawerLinkClass}>
                  <i className={`fa-solid ${l.icon}`} aria-hidden="true"></i>
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </aside>
        </>,
        document.body
      )}
    </header>
  );
}