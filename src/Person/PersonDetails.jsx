import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { pathImg } from "../constant/pathImg";
import personFallback from "../assets/images.jpeg";
import nofilm from "../assets/poster.png";
import "./person.css";

const API_KEY = "c9fac173689f5f01ba1b0420f66d7093";
const PAGE_SIZE = 18;
const TALK_OR_NEWS = [10767, 10763]; // keep talk-show appearances out of "Known for"

const SORTS = [
  { id: "popular", label: "Popular" },
  { id: "rating", label: "Top rated" },
  { id: "newest", label: "Newest" },
];

const dateOf = (c) => c.release_date || c.first_air_date || "";
const yearOf = (c) => dateOf(c).slice(0, 4);

const SORTERS = {
  popular: (a, b) => b.vote_count - a.vote_count,
  // titles with very few votes go after established ones
  rating: (a, b) =>
    (b.vote_count >= 50) - (a.vote_count >= 50) || b.vote_average - a.vote_average,
  newest: (a, b) => dateOf(b).localeCompare(dateOf(a)),
};

// TMDB lists a title once per role; merge them and include crew jobs
function mergeCredits(cast = [], crew = []) {
  const map = new Map();
  [
    ...cast.map((c) => ({ ...c, role: c.character })),
    ...crew.map((c) => ({ ...c, role: c.job })),
  ].forEach((c) => {
    const existing = map.get(c.id);
    if (existing) {
      if (c.role && !existing.roles.includes(c.role)) existing.roles.push(c.role);
    } else {
      map.set(c.id, { ...c, roles: c.role ? [c.role] : [] });
    }
  });
  return [...map.values()];
}

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

function ageBetween(from, to) {
  const start = new Date(from);
  const end = to ? new Date(to) : new Date();
  let age = end.getFullYear() - start.getFullYear();
  const m = end.getMonth() - start.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < start.getDate())) age--;
  return age;
}

function CreditCard({ item, type }) {
  return (
    <Link to={`/details/${type}/${item.id}`} className="credit">
      <div className="credit-poster">
        <img
          src={item.poster_path ? pathImg(item.poster_path) : nofilm}
          alt=""
          loading="lazy"
        />
        {item.vote_average > 0 && (
          <span className="credit-rating">
            <i className="fa-solid fa-star" aria-hidden="true"></i>
            {item.vote_average.toFixed(1)}
          </span>
        )}
      </div>
      <span className="credit-title">{item.title || item.name}</span>
      <span className="credit-year">{yearOf(item) || "In production"}</span>
      {item.roles.length > 0 && (
        <span className="credit-role" title={item.roles.join(", ")}>
          {item.roles.join(", ")}
        </span>
      )}
    </Link>
  );
}

export default function PersonDetails() {
  const { personId } = useParams();
  const [person, setPerson] = useState(null);
  const [status, setStatus] = useState("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState("movie");
  const [sort, setSort] = useState("popular");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [bioOpen, setBioOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setBioOpen(false);
    setLimit(PAGE_SIZE);
    window.scrollTo(0, 0);

    axios
      .get(`https://api.themoviedb.org/3/person/${personId}`, {
        params: {
          api_key: API_KEY,
          language: "en-US",
          append_to_response: "movie_credits,tv_credits,external_ids",
        },
        signal: controller.signal,
      })
      .then(({ data }) => {
        const movieCount = (data.movie_credits?.cast?.length || 0) + (data.movie_credits?.crew?.length || 0);
        const tvCount = (data.tv_credits?.cast?.length || 0) + (data.tv_credits?.crew?.length || 0);
        setTab(movieCount >= tvCount ? "movie" : "tv");
        setPerson(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (!axios.isCancel(err)) {
          console.error(err);
          setStatus("error");
        }
      });

    return () => controller.abort();
  }, [personId, reloadKey]);

  const movies = useMemo(
    () => mergeCredits(person?.movie_credits?.cast, person?.movie_credits?.crew),
    [person]
  );
  const shows = useMemo(
    () => mergeCredits(person?.tv_credits?.cast, person?.tv_credits?.crew),
    [person]
  );

  const knownFor = useMemo(
    () =>
      [
        ...movies.map((m) => ({ ...m, type: "movie" })),
        ...shows.map((s) => ({ ...s, type: "tv" })),
      ]
        .filter((c) => !c.genre_ids?.some((g) => TALK_OR_NEWS.includes(g)))
        .sort(SORTERS.popular)
        .slice(0, 8),
    [movies, shows]
  );

  const credits = useMemo(
    () => [...(tab === "movie" ? movies : shows)].sort(SORTERS[sort]),
    [tab, sort, movies, shows]
  );

  if (status === "loading") {
    return (
      <div className="person-page" aria-busy="true" aria-label="Loading person">
        <div className="container person-skeleton">
          <div className="sk sk-photo" />
          <div className="sk-lines">
            <div className="sk sk-line w-25" />
            <div className="sk sk-line sk-title" />
            <div className="sk sk-line" />
            <div className="sk sk-line" />
            <div className="sk sk-line w-75" />
          </div>
        </div>
      </div>
    );
  }

  if (status === "error" || !person) {
    return (
      <div className="person-page">
        <div className="container state">
          <i className="fa-solid fa-user-slash state-icon" aria-hidden="true"></i>
          <h1 className="state-title">This profile didn't load</h1>
          <p>Check your connection and try again.</p>
          <button className="btn-marquee" onClick={() => setReloadKey((k) => k + 1)}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const ids = person.external_ids || {};
  const socials = [
    ids.imdb_id && { href: `https://www.imdb.com/name/${ids.imdb_id}`, icon: "fa-brands fa-imdb", label: "IMDb" },
    ids.instagram_id && { href: `https://instagram.com/${ids.instagram_id}`, icon: "fa-brands fa-instagram", label: "Instagram" },
    ids.twitter_id && { href: `https://x.com/${ids.twitter_id}`, icon: "fa-brands fa-x-twitter", label: "X" },
    ids.facebook_id && { href: `https://facebook.com/${ids.facebook_id}`, icon: "fa-brands fa-facebook", label: "Facebook" },
  ].filter(Boolean);

  const backdrop = knownFor.find((c) => c.backdrop_path)?.backdrop_path;
  const bio = person.biography?.trim();
  const longBio = bio && bio.length > 500;
  const shown = credits.slice(0, limit);
  const remaining = credits.length - shown.length;

  return (
    <div className="person-page">
      {/* Hero */}
      <section className="person-hero">
        {backdrop && (
          <div
            className="person-hero-bg"
            style={{ backgroundImage: `url(https://image.tmdb.org/t/p/w1280${backdrop})` }}
            aria-hidden="true"
          />
        )}
        <div className="container person-hero-inner">
          <img
            className="person-photo"
            src={person.profile_path ? pathImg(person.profile_path) : personFallback}
            alt={person.name}
          />

          <div className="person-info">
            {person.known_for_department && (
              <p className="person-dept">{person.known_for_department}</p>
            )}
            <h1 className="person-name">{person.name}</h1>

            <dl className="person-facts">
              {person.birthday && (
                <div>
                  <dt>Born</dt>
                  <dd>
                    {formatDate(person.birthday)}
                    {!person.deathday && ` (age ${ageBetween(person.birthday)})`}
                  </dd>
                </div>
              )}
              {person.deathday && (
                <div>
                  <dt>Died</dt>
                  <dd>
                    {formatDate(person.deathday)}
                    {person.birthday && ` (aged ${ageBetween(person.birthday, person.deathday)})`}
                  </dd>
                </div>
              )}
              {person.place_of_birth && (
                <div>
                  <dt>Birthplace</dt>
                  <dd>{person.place_of_birth}</dd>
                </div>
              )}
              <div>
                <dt>Credits</dt>
                <dd>
                  {movies.length} movies, {shows.length} TV shows
                </dd>
              </div>
            </dl>

            {socials.length > 0 && (
              <div className="person-socials">
                {socials.map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label}>
                    <i className={s.icon} aria-hidden="true"></i>
                  </a>
                ))}
              </div>
            )}

            {bio && (
              <div className="person-bio">
                <div className={`person-bio-text${longBio && !bioOpen ? " is-clamped" : ""}`}>
                  {bio.split(/\n+/).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
                {longBio && (
                  <button className="text-btn" onClick={() => setBioOpen((o) => !o)} aria-expanded={bioOpen}>
                    {bioOpen ? "Show less" : "Read full biography"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="container">
        {/* Known for */}
        {knownFor.length > 0 && (
          <section className="person-section">
            <header className="section-head">
              <h2 className="section-title">Known for</h2>
            </header>
            <div className="known-row">
              {knownFor.map((item) => (
                <CreditCard key={`${item.type}-${item.id}`} item={item} type={item.type} />
              ))}
            </div>
          </section>
        )}

        {/* Credits */}
        <section className="person-section">
          <header className="section-head credits-head">
            <h2 className="section-title">Filmography</h2>
            <div className="credits-controls">
              <div className="segmented" role="tablist" aria-label="Credit type">
                {[
                  { id: "movie", label: "Movies", count: movies.length },
                  { id: "tv", label: "TV shows", count: shows.length },
                ].map((t) => (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={tab === t.id}
                    className={tab === t.id ? "is-active" : ""}
                    onClick={() => {
                      setTab(t.id);
                      setLimit(PAGE_SIZE);
                    }}
                  >
                    {t.label} <span className="count">{t.count}</span>
                  </button>
                ))}
              </div>
              <div className="segmented segmented-sm" role="group" aria-label="Sort credits">
                {SORTS.map((s) => (
                  <button
                    key={s.id}
                    aria-pressed={sort === s.id}
                    className={sort === s.id ? "is-active" : ""}
                    onClick={() => {
                      setSort(s.id);
                      setLimit(PAGE_SIZE);
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {credits.length === 0 ? (
            <p className="empty-note">
              No {tab === "movie" ? "movie" : "TV"} credits listed for {person.name}.
            </p>
          ) : (
            <>
              <div className="credit-grid">
                {shown.map((item) => (
                  <CreditCard key={item.id} item={item} type={tab} />
                ))}
              </div>
              {remaining > 0 && (
                <div className="load-more">
                  <button className="btn-outline" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                    Show more ({remaining} left)
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}