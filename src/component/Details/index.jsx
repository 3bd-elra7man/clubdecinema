import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, A11y } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "./details.css";
import { pathImg } from "../../constant/pathImg";
import nofilm from "../../assets/poster.png";
import personFallback from "../../assets/images.jpeg";

const API_KEY = "c9fac173689f5f01ba1b0420f66d7093";

const SWIPER_BREAKPOINTS = {
  576: { slidesPerView: 3.3 },
  768: { slidesPerView: 4.3 },
  1024: { slidesPerView: 6 },
  1400: { slidesPerView: 7 },
};

const yearOf = (d) => (d || "").slice(0, 4);

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;

const formatMoney = (n) =>
  n > 0
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(n)
    : null;

function languageName(code) {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code);
  } catch {
    return code;
  }
}

function PeopleLinks({ people }) {
  return people.map((p, i) => (
    <React.Fragment key={p.id}>
      {i > 0 && ", "}
      <Link to={`/person/${p.id}`}>{p.name}</Link>
    </React.Fragment>
  ));
}

function Score({ value, count }) {
  const pct = Math.round((value || 0) * 10);
  return (
    <div className="dt-score">
      <div className="dt-score-ring" style={{ "--pct": pct }}>
        <span>{value ? value.toFixed(1) : "NR"}</span>
      </div>
      <div className="dt-score-text">
        <strong>User score</strong>
        <span>{(count || 0).toLocaleString()} votes</span>
      </div>
    </div>
  );
}

function SectionHeader({ title, children }) {
  return (
    <header className="dt-section-head">
      <h2 className="dt-section-title">{title}</h2>
      {children}
    </header>
  );
}

function TrailerModal({ video, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!video) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [video, onClose]);

  if (!video) return null;

  return (
    <div className="dt-modal-backdrop" onClick={onClose}>
      <div
        className="dt-modal"
        role="dialog"
        aria-modal="true"
        aria-label={video.name}
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeRef} className="dt-modal-close" onClick={onClose} aria-label="Close video">
          <i className="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
        <div className="dt-modal-frame">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.key}?autoplay=1&rel=0`}
            title={video.name}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
        <p className="dt-modal-title">{video.name}</p>
      </div>
    </div>
  );
}

export default function Details() {
  const { mediatype, id } = useParams();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [playing, setPlaying] = useState(null);

  const closeVideo = useCallback(() => setPlaying(null), []);

  useEffect(() => {
    const controller = new AbortController();
    const extra = mediatype === "movie" ? "release_dates" : "content_ratings";
    setStatus("loading");
    setPlaying(null);
    window.scrollTo(0, 0);

    axios
      .get(`https://api.themoviedb.org/3/${mediatype}/${id}`, {
        params: {
          api_key: API_KEY,
          language: "en-US",
          include_video_language: "en,null",
          append_to_response: `credits,videos,recommendations,${extra}`,
        },
        signal: controller.signal,
      })
      .then(({ data }) => {
        setData(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (axios.isCancel(err)) return;
        console.error(err);
        setStatus(err.response?.status === 404 ? "notfound" : "error");
      });

    return () => controller.abort();
  }, [mediatype, id, reloadKey]);

  /* ---------- Loading / error ---------- */
  if (status === "loading") {
    return (
      <div className="details-page" aria-busy="true" aria-label="Loading details">
        <div className="container dt-skeleton">
          <div className="dt-sk dt-sk-poster" />
          <div className="dt-sk-lines">
            <div className="dt-sk dt-sk-title" />
            <div className="dt-sk dt-sk-line w-50" />
            <div className="dt-sk dt-sk-line" />
            <div className="dt-sk dt-sk-line" />
            <div className="dt-sk dt-sk-line w-75" />
          </div>
        </div>
      </div>
    );
  }

  if (status !== "ready" || !data) {
    const notFound = status === "notfound";
    return (
      <div className="details-page">
        <div className="container dt-state">
          <i className={`fa-solid ${notFound ? "fa-film" : "fa-plug-circle-xmark"} dt-state-icon`} aria-hidden="true"></i>
          <h1 className="dt-state-title">
            {notFound ? "This title doesn't exist" : "Details didn't load"}
          </h1>
          <p>
            {notFound
              ? "It may have been removed from the database."
              : "Check your connection and try again."}
          </p>
          {notFound ? (
            <Link to="/home" className="dt-btn-primary">Go to home</Link>
          ) : (
            <button className="dt-btn-primary" onClick={() => setReloadKey((k) => k + 1)}>
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ---------- Derived data ---------- */
  const isMovie = mediatype === "movie";
  const title = data.title || data.name;
  const date = data.release_date || data.first_air_date;
  const cast = data.credits?.cast?.slice(0, 18) || [];
  const crew = data.credits?.crew || [];

  const directors = crew.filter((c) => c.job === "Director");
  const writers = [
    ...new Map(
      crew.filter((c) => c.department === "Writing").map((c) => [c.id, c])
    ).values(),
  ].slice(0, 3);
  const creators = data.created_by || [];

  const certification = isMovie
    ? data.release_dates?.results
        ?.find((r) => r.iso_3166_1 === "US")
        ?.release_dates?.find((d) => d.certification)?.certification
    : data.content_ratings?.results?.find((r) => r.iso_3166_1 === "US")?.rating;

  const runtime = isMovie
    ? data.runtime
      ? `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m`
      : null
    : data.number_of_seasons
    ? `${data.number_of_seasons} season${data.number_of_seasons > 1 ? "s" : ""}`
    : null;

  const videos = (data.videos?.results || [])
    .filter((v) => v.site === "YouTube" && ["Trailer", "Teaser"].includes(v.type))
    .sort((a, b) => (b.type === "Trailer") - (a.type === "Trailer") || b.official - a.official)
    .slice(0, 6);
  const mainTrailer = videos[0];

  const recommendations = (data.recommendations?.results || []).slice(0, 14);
  const seasons = data.seasons || [];

  const facts = [
    isMovie && directors.length > 0 && { label: directors.length > 1 ? "Directors" : "Director", value: <PeopleLinks people={directors} /> },
    !isMovie && creators.length > 0 && { label: "Created by", value: <PeopleLinks people={creators} /> },
    isMovie && writers.length > 0 && { label: "Writing", value: <PeopleLinks people={writers} /> },
    date && { label: isMovie ? "Release date" : "First aired", value: formatDate(date) },
    data.status && { label: "Status", value: data.status },
    data.original_language && { label: "Original language", value: languageName(data.original_language) },
    !isMovie && data.networks?.length > 0 && { label: "Network", value: data.networks.map((n) => n.name).join(", ") },
    isMovie && formatMoney(data.budget) && { label: "Budget", value: formatMoney(data.budget) },
    isMovie && formatMoney(data.revenue) && { label: "Box office", value: formatMoney(data.revenue) },
  ].filter(Boolean);

  const backdrop = data.backdrop_path;

  return (
    <div className="details-page">
      {/* ================= Hero ================= */}
      <section className="dt-hero">
        {backdrop && (
          <div
            className="dt-hero-bg"
            style={{ backgroundImage: `url(https://image.tmdb.org/t/p/w1280${backdrop})` }}
            aria-hidden="true"
          />
        )}
        <div className="container dt-hero-inner">
          <img
            className="dt-poster"
            src={data.poster_path ? pathImg(data.poster_path) : nofilm}
            alt={title}
          />

          <div className="dt-info">
            <h1 className="dt-title">
              {title}
              {date && <span className="dt-year"> ({yearOf(date)})</span>}
            </h1>

            <div className="dt-meta">
              {certification && <span className="dt-cert">{certification}</span>}
              {runtime && <span>{runtime}</span>}
              {!isMovie && data.number_of_episodes > 0 && <span>{data.number_of_episodes} episodes</span>}
            </div>

            {data.genres?.length > 0 && (
              <div className="dt-genres">
                {data.genres.map((g) => (
                  <span key={g.id} className="dt-genre">{g.name}</span>
                ))}
              </div>
            )}

            <div className="dt-actions">
              <Score value={data.vote_average} count={data.vote_count} />
              {mainTrailer && (
                <button className="dt-btn-primary" onClick={() => setPlaying(mainTrailer)}>
                  <i className="fa-solid fa-play" aria-hidden="true"></i> Play trailer
                </button>
              )}
            </div>

            {data.tagline && <p className="dt-tagline">{data.tagline}</p>}
            {data.overview && (
              <div className="dt-overview">
                <h2>Overview</h2>
                <p>{data.overview}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="container">
        {/* ================= Facts ================= */}
        {facts.length > 0 && (
          <dl className="dt-facts">
            {facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {/* ================= Seasons ================= */}
        {!isMovie && seasons.length > 0 && (
          <section className="dt-section">
            <SectionHeader title="Seasons" />
            <div className="dt-season-row">
              {seasons.map((s) => (
                <Link key={s.id} to={`/tv/${id}/season/${s.season_number}`} className="dt-season">
                  <div className="dt-season-poster">
                    <img src={s.poster_path ? pathImg(s.poster_path) : nofilm} alt="" loading="lazy" />
                  </div>
                  <span className="dt-card-title">{s.name}</span>
                  <span className="dt-card-sub">
                    {[yearOf(s.air_date), s.episode_count ? `${s.episode_count} episodes` : null]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ================= Cast ================= */}
        {cast.length > 0 && (
          <section className="dt-section">
            <SectionHeader title="Top cast" />
            <Swiper
              className="dt-swiper"
              modules={[Navigation, A11y]}
              navigation
              spaceBetween={16}
              slidesPerView={2.3}
              breakpoints={SWIPER_BREAKPOINTS}
            >
              {cast.map((c) => (
                <SwiperSlide key={c.credit_id || c.id}>
                  <Link className="dt-cast" to={`/person/${c.id}`}>
                    <span className="dt-cast-frame">
                      <img
                        src={c.profile_path ? pathImg(c.profile_path) : personFallback}
                        alt=""
                        loading="lazy"
                      />
                    </span>
                    <span className="dt-cast-name">{c.name}</span>
                    {c.character && <span className="dt-cast-role">{c.character}</span>}
                  </Link>
                </SwiperSlide>
              ))}
            </Swiper>
          </section>
        )}

        {/* ================= Videos ================= */}
        {videos.length > 0 && (
          <section className="dt-section">
            <SectionHeader title="Trailers and teasers" />
            <div className="dt-video-grid">
              {videos.map((v) => (
                <button key={v.id} className="dt-video" onClick={() => setPlaying(v)}>
                  <span className="dt-video-thumb">
                    <img src={`https://i.ytimg.com/vi/${v.key}/hqdefault.jpg`} alt="" loading="lazy" />
                    <span className="dt-video-play" aria-hidden="true">
                      <i className="fa-solid fa-play"></i>
                    </span>
                  </span>
                  <span className="dt-card-title">{v.name}</span>
                  <span className="dt-card-sub">{v.type}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ================= Recommendations ================= */}
        {recommendations.length > 0 && (
          <section className="dt-section">
            <SectionHeader title={`If you liked ${title}`} />
            <Swiper
              className="dt-swiper"
              modules={[Navigation, A11y]}
              navigation
              spaceBetween={16}
              slidesPerView={2.3}
              breakpoints={SWIPER_BREAKPOINTS}
            >
              {recommendations.map((item) => (
                <SwiperSlide key={item.id}>
                  <Link className="dt-rec" to={`/details/${item.media_type || mediatype}/${item.id}`}>
                    <div className="dt-rec-poster">
                      <img src={item.poster_path ? pathImg(item.poster_path) : nofilm} alt="" loading="lazy" />
                      {item.vote_average > 0 && (
                        <span className="dt-rating">
                          <i className="fa-solid fa-star" aria-hidden="true"></i>
                          {item.vote_average.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <span className="dt-card-title">{item.title || item.name}</span>
                    <span className="dt-card-sub">{yearOf(item.release_date || item.first_air_date)}</span>
                  </Link>
                </SwiperSlide>
              ))}
            </Swiper>
          </section>
        )}
      </div>

      <TrailerModal video={playing} onClose={closeVideo} />
    </div>
  );
}