import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import "./seasonDetails.css";
import { pathImg } from "../../constant/pathImg";
import nofilm from "../../assets/poster.png";

const API_KEY = "c9fac173689f5f01ba1b0420f66d7093";
const BASE = "https://api.themoviedb.org/3";

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;

export default function SeasonDetails() {
  const { id, seasonNumber } = useParams();
  const [show, setShow] = useState(null);
  const [season, setSeason] = useState(null);
  const [status, setStatus] = useState("loading");
  const episodesRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    const opts = { params: { api_key: API_KEY, language: "en-US" }, signal: controller.signal };
    setStatus("loading");
    window.scrollTo(0, 0);
    if (episodesRef.current) episodesRef.current.scrollTop = 0;

    Promise.all([
      axios.get(`${BASE}/tv/${id}`, opts),
      axios.get(`${BASE}/tv/${id}/season/${seasonNumber}`, opts),
    ])
      .then(([showRes, seasonRes]) => {
        setShow(showRes.data);
        setSeason(seasonRes.data);
        setStatus("ready");
      })
      .catch((err) => {
        if (!axios.isCancel(err)) {
          console.error(err);
          setStatus("error");
        }
      });

    return () => controller.abort();
  }, [id, seasonNumber]);

  const episodes = season?.episodes || [];
  const seasons = show?.seasons || [];
  const today = new Date().toISOString().slice(0, 10);
  const rated = episodes.filter((e) => e.vote_average > 0 && e.air_date && e.air_date <= today);
  const avgRating = rated.length
    ? rated.reduce((sum, e) => sum + e.vote_average, 0) / rated.length
    : 0;

  return (
    <div className={`season-page${status === "loading" ? " is-loading" : ""}`}>
      {show?.backdrop_path && (
        <div
          className="sp-backdrop"
          style={{ backgroundImage: `url(https://image.tmdb.org/t/p/w1280${show.backdrop_path})` }}
          aria-hidden="true"
        />
      )}

      <div className="container sp-layout">
        {/* ================= Show column ================= */}
        <aside className="sp-show">
          <Link to={`/details/tv/${id}`} className="sp-show-link">
            {show ? (
              <img
                className="sp-poster"
                src={show.poster_path ? pathImg(show.poster_path) : nofilm}
                alt={show.name}
              />
            ) : (
              <div className="sp-poster sp-sk" />
            )}
            <h1 className="sp-show-name">{show?.name || "\u00A0"}</h1>
          </Link>

          {show?.first_air_date && (
            <p className="sp-show-date">First aired {formatDate(show.first_air_date)}</p>
          )}

          {season && (
            <div className="sp-stats">
              <span>
                <i className="fa-solid fa-list-ol" aria-hidden="true"></i>
                {episodes.length} episode{episodes.length === 1 ? "" : "s"}
              </span>
              {avgRating > 0 && (
                <span>
                  <i className="fa-solid fa-star" aria-hidden="true"></i>
                  {avgRating.toFixed(1)} avg
                </span>
              )}
            </div>
          )}

          <Link to={`/details/tv/${id}`} className="sp-back">
            <i className="fa-solid fa-arrow-left" aria-hidden="true"></i> Back to show
          </Link>
        </aside>

        {/* ================= Episodes column ================= */}
        <section className="sp-episodes-box">
          <header className="sp-head">
            <h2 className="sp-title">
              Episodes {season?.name && <span>{season.name}</span>}
            </h2>

            {seasons.length > 1 && (
              <div className="dropdown">
                <button
                  className="sp-season-btn dropdown-toggle"
                  type="button"
                  id="seasonsDropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  {season?.name || "Seasons"}
                </button>
                <ul className="dropdown-menu dropdown-menu-end sp-menu" aria-labelledby="seasonsDropdown">
                  {seasons.map((s) => {
                    const active = s.season_number === Number(seasonNumber);
                    return (
                      <li key={s.id}>
                        <Link
                          className={`dropdown-item${active ? " is-active" : ""}`}
                          to={`/tv/${id}/season/${s.season_number}`}
                          aria-current={active ? "page" : undefined}
                        >
                          <span>{s.name}</span>
                          {s.episode_count > 0 && <small>{s.episode_count} ep</small>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </header>

          {status === "error" ? (
            <div className="sp-empty">
              <i className="fa-solid fa-plug-circle-xmark" aria-hidden="true"></i>
              <p>Episodes didn't load. Check your connection and refresh the page.</p>
            </div>
          ) : status === "loading" && !season ? (
            <div className="sp-list">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="sp-sk sp-sk-row" />
              ))}
            </div>
          ) : episodes.length === 0 ? (
            <div className="sp-empty">
              <i className="fa-solid fa-hourglass-half" aria-hidden="true"></i>
              <p>Episodes for this season haven't been announced yet.</p>
            </div>
          ) : (
            <div ref={episodesRef} className="sp-list">
              {episodes.map((ep) => {
                const upcoming = !ep.air_date || ep.air_date > today;
                return (
                  <article key={ep.id} className={`sp-ep${upcoming ? " is-upcoming" : ""}`}>
                    <div className="sp-ep-still">
                      <img src={ep.still_path ? pathImg(ep.still_path) : nofilm} alt="" loading="lazy" />
                      <span className="sp-ep-num">{ep.episode_number}</span>
                    </div>

                    <div className="sp-ep-body">
                      <h3 className="sp-ep-title">{ep.name}</h3>
                      <div className="sp-ep-meta">
                        {upcoming ? (
                          <span className="sp-ep-tag">
                            {ep.air_date ? `Airs ${formatDate(ep.air_date)}` : "Date not announced"}
                          </span>
                        ) : (
                          <span>{formatDate(ep.air_date)}</span>
                        )}
                        {ep.runtime > 0 && <span>{ep.runtime} min</span>}
                        {!upcoming && ep.vote_average > 0 && (
                          <span className="sp-ep-rating">
                            <i className="fa-solid fa-star" aria-hidden="true"></i>
                            {ep.vote_average.toFixed(1)}
                          </span>
                        )}
                      </div>
                      {ep.overview && <p className="sp-ep-overview">{ep.overview}</p>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}