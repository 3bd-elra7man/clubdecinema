import React, { useContext, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay, A11y, EffectFade, Keyboard } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/effect-fade";
import "./style.css";
import CardMovies from "./component/CardMovies";
import CardTv from "./component/CardTv";
import { MoviesContext } from "../context/Store";
import { pathImg } from "../../constant/pathImg";
import fallbackPerson from "../../assets/images.jpeg";

const HERO_COUNT = 5;
// Large TMDB size so the full-width hero backdrop stays sharp
const backdropUrl = (path) => `https://image.tmdb.org/t/p/w1280${path}`;

function SectionHeader({ icon, title, subtitle, to, linkText }) {
  return (
    <header className="section-head">
      <div>
        <h2 className="section-title">
          <i className={`fa-solid ${icon}`} aria-hidden="true"></i>
          {title}
        </h2>
        <p className="section-sub">{subtitle}</p>
      </div>
      {to && (
        <Link to={to} className="section-link">
          {linkText}
          <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </Link>
      )}
    </header>
  );
}

function HeroSlide({ movie, rank }) {
  const year = (movie.release_date || "").slice(0, 4);
  const bg = movie.backdrop_path || movie.poster_path;

  return (
    <div className="hero-slide">
      {bg && (
        <div
          className="hero-bg"
          style={{ backgroundImage: `url(${backdropUrl(bg)})` }}
          aria-hidden="true"
        />
      )}
      <div className="hero-body">
        <p className="hero-rank">No. {rank} trending today</p>
        <h2 className="hero-title">{movie.title || movie.name}</h2>
        <div className="hero-meta">
          {year && <span>{year}</span>}
          {movie.vote_average ? (
            <span>
              <i className="fa-solid fa-star" aria-hidden="true"></i>{" "}
              {movie.vote_average.toFixed(1)}
            </span>
          ) : null}
          {movie.original_language && (
            <span className="hero-lang">{movie.original_language}</span>
          )}
        </div>
        {movie.overview && <p className="hero-overview">{movie.overview}</p>}
        {/* Adjust this route to match your movie details page */}
        <Link to={`/details/movie/${movie.id}`} className="btn-marquee">
          View details
        </Link>
      </div>
    </div>
  );
}

function HeroCarousel({ items }) {
  const swiperRef = useRef(null);
  const progressRef = useRef(null);
  const [active, setActive] = useState(0);

  if (!items.length) return null;

  return (
    <section className="hero" aria-label="Top trending movies">
      <Swiper
        className="hero-swiper"
        modules={[Autoplay, EffectFade, A11y, Keyboard]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        loop
        speed={900}
        keyboard={{ enabled: true }}
        autoplay={{ delay: 6000, disableOnInteraction: false, pauseOnMouseEnter: true }}
        onSwiper={(s) => (swiperRef.current = s)}
        onSlideChange={(s) => setActive(s.realIndex)}
        onAutoplayTimeLeft={(s, time, progress) =>
          progressRef.current?.style.setProperty("--progress", 1 - progress)
        }
      >
        {items.map((movie, i) => (
          <SwiperSlide key={movie.id}>
            <HeroSlide movie={movie} rank={i + 1} />
          </SwiperSlide>
        ))}
      </Swiper>

      <div className="hero-thumbs" role="tablist" aria-label="Choose a movie">
        {items.map((movie, i) => (
          <button
            key={movie.id}
            role="tab"
            aria-selected={i === active}
            aria-label={`Show ${movie.title || movie.name}`}
            className={`hero-thumb${i === active ? " is-active" : ""}`}
            onClick={() => swiperRef.current?.slideToLoop(i)}
          >
            {movie.poster_path && <img src={pathImg(movie.poster_path)} alt="" />}
            <span className="hero-thumb-track">
              <span
                className="hero-thumb-bar"
                ref={i === active ? progressRef : null}
              />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function HomeSkeleton() {
  return (
    <div className="home container" aria-busy="true" aria-label="Loading trending titles">
      <div className="sk sk-hero" />
      <div className="row g-4 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="col-6 col-md-4 col-lg-2">
            <div className="sk sk-poster" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const { people, movies, tv, status } = useContext(MoviesContext);

  if (status === "error") {
    return (
      <div className="home container home-error">
        <i className="fa-solid fa-film home-error-icon" aria-hidden="true"></i>
        <h1 className="section-title">Trending titles didn't load</h1>
        <p>Check your connection, then reload the page.</p>
        <button className="btn-marquee" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </div>
    );
  }

  if (status !== "none") return <HomeSkeleton />;

  const heroMovies = movies.slice(0, HERO_COUNT);
  const gridMovies = movies.slice(HERO_COUNT, HERO_COUNT + 12);

  return (
    <div className="home container">
      <h1 className="visually-hidden">Trending movies, people and TV shows</h1>

      <HeroCarousel items={heroMovies} />

      {/* Movies */}
      <section className="home-section">
        <SectionHeader
          icon="fa-film"
          title="Trending movies"
          subtitle="What everyone is watching today"
          to="/movies"
          linkText="Browse all movies"
        />
        <div className="row g-4">
          {gridMovies.map((movie) => (
            <CardMovies key={movie.id} movie={movie} />
          ))}
        </div>
      </section>

      {/* People */}
      <section className="home-section">
        <SectionHeader
          icon="fa-user"
          title="Trending people"
          subtitle="Actors and creators in the spotlight"
        />
        <Swiper
          className="people-swiper"
          modules={[Navigation, Autoplay, A11y]}
          navigation
          autoplay={{ delay: 2500, disableOnInteraction: false, pauseOnMouseEnter: true }}
          spaceBetween={16}
          slidesPerView={2}
          breakpoints={{
            576: { slidesPerView: 3 },
            768: { slidesPerView: 4 },
            1024: { slidesPerView: 6 },
            1400: { slidesPerView: 7 },
          }}
        >
          {people.slice(0, 20).map((person) => (
            <SwiperSlide key={person.id}>
              <Link className="person" to={`/person/${person.id}`}>
                <span className="person-frame">
                  <img
                    src={person.profile_path ? pathImg(person.profile_path) : fallbackPerson}
                    alt=""
                    loading="lazy"
                  />
                </span>
                <span className="person-name">{person.name}</span>
                {person.known_for_department && (
                  <span className="person-dept">{person.known_for_department}</span>
                )}
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      {/* TV */}
      <section className="home-section">
        <SectionHeader
          icon="fa-tv"
          title="Trending TV shows"
          subtitle="Series people are starting today"
          to="/tv"
          linkText="Browse all TV shows"
        />
        <div className="row g-4">
          {tv.slice(0, 12).map((show) => (
            <CardTv key={show.id} tv={show} />
          ))}
        </div>
      </section>
    </div>
  );
}