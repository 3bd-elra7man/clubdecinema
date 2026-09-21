import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import CardMovies from "../Home/component/CardMovies";
import "./movies.css";

// Move this to an env variable (.env) before deploying
const API_KEY = "c9fac173689f5f01ba1b0420f66d7093";

const api = axios.create({
  baseURL: "https://api.themoviedb.org/3",
  params: { api_key: API_KEY, language: "en-US" },
});

const TABS = [
  { id: "trending", label: "Trending", endpoint: "/trending/movie/day" },
  { id: "top_rated", label: "Top rated", endpoint: "/movie/top_rated" },
  { id: "upcoming", label: "Upcoming", endpoint: "/movie/upcoming" },
];

const LANGUAGES = [
  { code: "ar", name: "Arabic" },
  { code: "en", name: "English" },
  { code: "fr", name: "French" },
  { code: "hi", name: "Hindi" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "es", name: "Spanish" },
  { code: "tr", name: "Turkish" },
];

// `api` = server-side sort used when filtering (sorts across all pages)
const SORTS = [
  { id: "", label: "Default order" },
  { id: "rating", label: "Rating", api: "vote_average.desc" },
  { id: "popularity", label: "Popularity", api: "popularity.desc" },
  { id: "vote", label: "Most voted", api: "vote_count.desc" },
  { id: "meta", label: "Meta score" },
];

const CLIENT_SORT = {
  rating: (a, b) => b.vote_average - a.vote_average,
  popularity: (a, b) => b.popularity - a.popularity,
  vote: (a, b) => b.vote_count - a.vote_count,
  meta: (a, b) => b.vote_average * b.popularity - a.vote_average * a.popularity,
};

const YEARS = Array.from(
  { length: new Date().getFullYear() + 1 - 1950 + 1 },
  (_, i) => new Date().getFullYear() + 1 - i
);

function pageItems(current, total) {
  const pages = [...new Set([1, current - 1, current, current + 1, total])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const out = [];
  pages.forEach((p, i) => {
    if (i && p - pages[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}

function Select({ label, value, onChange, children }) {
  return (
    <label className="select">
      <span className="visually-hidden">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </label>
  );
}

export default function Movies() {
  // Filters live in the URL, so Back from a movie page restores them
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "trending";
  const page = Number(params.get("page")) || 1;
  const year = params.get("year") || "";
  const lang = params.get("lang") || "";
  const sort = params.get("sort") || "";
  const genreParam = params.get("genres") || "";
  const selectedGenres = useMemo(
    () => (genreParam ? genreParam.split(",").map(Number) : []),
    [genreParam]
  );
  const isFiltering = Boolean(year || lang || selectedGenres.length);
  const serverSort = isFiltering ? sort : "";

  const [genres, setGenres] = useState([]);
  const [data, setData] = useState({ results: [], totalPages: 1, totalResults: 0 });
  const [status, setStatus] = useState("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const update = (changes, { keepPage = false } = {}) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, val]) =>
      val === "" || val == null ? next.delete(key) : next.set(key, String(val))
    );
    if (!keepPage) next.delete("page");
    setParams(next);
  };

  const goToPage = (p) => update({ page: p === 1 ? "" : p }, { keepPage: true });

  const toggleGenre = (id) => {
    const next = selectedGenres.includes(id)
      ? selectedGenres.filter((g) => g !== id)
      : [...selectedGenres, id];
    update({ genres: next.join(",") });
  };

  const clearFilters = () => update({ year: "", lang: "", genres: "", sort: "" });

  useEffect(() => {
    api
      .get("/genre/movie/list")
      .then(({ data }) => setGenres(data.genres))
      .catch((err) => console.error("Error fetching genres:", err));
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  useEffect(() => {
    const controller = new AbortController();
    const query = { page };
    let endpoint;

    if (isFiltering) {
      endpoint = "/discover/movie";
      if (genreParam) query.with_genres = genreParam;
      if (lang) query.with_original_language = lang;
      if (year) query.primary_release_year = year;
      query.sort_by = SORTS.find((s) => s.id === serverSort)?.api || "popularity.desc";
      if (serverSort === "rating") query["vote_count.gte"] = 100; // skip 10/10 movies with 2 votes
    } else {
      endpoint = (TABS.find((t) => t.id === tab) || TABS[0]).endpoint;
    }

    setStatus("loading");
    api
      .get(endpoint, { params: query, signal: controller.signal })
      .then(({ data }) => {
        setData({
          results: data.results,
          totalPages: Math.max(1, Math.min(data.total_pages, 500)), // TMDB caps at 500
          totalResults: data.total_results,
        });
        setStatus("ready");
      })
      .catch((err) => {
        if (!axios.isCancel(err)) {
          console.error("Error fetching movies:", err);
          setStatus("error");
        }
      });

    return () => controller.abort();
  }, [tab, page, year, lang, genreParam, serverSort, isFiltering, reloadKey]);

  const movies = useMemo(() => {
    const compare = CLIENT_SORT[sort];
    return compare ? [...data.results].sort(compare) : data.results;
  }, [data.results, sort]);

  const genreName = (id) => genres.find((g) => g.id === id)?.name || "Genre";
  const langName = LANGUAGES.find((l) => l.code === lang)?.name || lang;

  return (
    <div className="discover container">
      <header className="discover-head">
        <h1 className="discover-title">Discover movies</h1>
        <p className="discover-sub">
          Browse what's trending, top rated and coming soon, or narrow it down by
          genre, language and year.
        </p>
      </header>

      {/* Toolbar */}
      <div className="toolbar">
        {isFiltering ? (
          <p className="result-count" aria-live="polite">
            {status === "ready"
              ? `${data.totalResults.toLocaleString()} movies match your filters`
              : "Finding movies…"}
          </p>
        ) : (
          <div className="segmented" role="tablist" aria-label="Movie lists">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={tab === t.id ? "is-active" : ""}
                onClick={() => update({ tab: t.id === "trending" ? "" : t.id })}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="toolbar-controls">
          <Select label="Release year" value={year} onChange={(v) => update({ year: v })}>
            <option value="">Any year</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
          <Select label="Original language" value={lang} onChange={(v) => update({ lang: v })}>
            <option value="">Any language</option>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </Select>
          <Select label="Sort by" value={sort} onChange={(v) => update({ sort: v })}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id ? `Sort: ${s.label}` : s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Genres */}
      <div className="genre-row" role="group" aria-label="Filter by genre">
        {genres.map((g) => (
          <button
            key={g.id}
            className={`chip${selectedGenres.includes(g.id) ? " is-on" : ""}`}
            aria-pressed={selectedGenres.includes(g.id)}
            onClick={() => toggleGenre(g.id)}
          >
            {g.name}
          </button>
        ))}
      </div>

      {/* Active filters */}
      {isFiltering && (
        <div className="active-filters">
          {year && (
            <button className="tag" onClick={() => update({ year: "" })}>
              {year} <i className="fa-solid fa-xmark" aria-hidden="true"></i>
              <span className="visually-hidden">Remove year</span>
            </button>
          )}
          {lang && (
            <button className="tag" onClick={() => update({ lang: "" })}>
              {langName} <i className="fa-solid fa-xmark" aria-hidden="true"></i>
              <span className="visually-hidden">Remove language</span>
            </button>
          )}
          {selectedGenres.map((id) => (
            <button key={id} className="tag" onClick={() => toggleGenre(id)}>
              {genreName(id)} <i className="fa-solid fa-xmark" aria-hidden="true"></i>
              <span className="visually-hidden">Remove genre</span>
            </button>
          ))}
          <button className="clear-all" onClick={clearFilters}>
            Clear all
          </button>
        </div>
      )}

      {/* Results */}
      {status === "loading" && (
        <div className="row g-4" aria-busy="true" aria-label="Loading movies">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="col-6 col-md-3 col-lg-2">
              <div className="sk sk-poster" />
            </div>
          ))}
        </div>
      )}

      {status === "error" && (
        <div className="state">
          <i className="fa-solid fa-plug-circle-xmark state-icon" aria-hidden="true"></i>
          <h2 className="state-title">Movies didn't load</h2>
          <p>Check your connection and try again.</p>
          <button className="btn-marquee" onClick={() => setReloadKey((k) => k + 1)}>
            Try again
          </button>
        </div>
      )}

      {status === "ready" && movies.length === 0 && (
        <div className="state">
          <i className="fa-solid fa-film state-icon" aria-hidden="true"></i>
          <h2 className="state-title">No movies match these filters</h2>
          <p>Try removing a genre or picking a different year.</p>
          <button className="btn-marquee" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      )}

      {status === "ready" && movies.length > 0 && (
        <>
          <div className="row g-4">
            {movies.map((movie) => (
              <CardMovies key={movie.id} movie={movie} showRating={true} />
            ))}
          </div>

          {data.totalPages > 1 && (
            <nav className="pager" aria-label="Pagination">
              <button
                className="pager-step"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                <i className="fa-solid fa-angle-left" aria-hidden="true"></i> Previous
              </button>
              <div className="pager-pages">
                {pageItems(page, data.totalPages).map((p) =>
                  typeof p === "string" ? (
                    <span key={p} className="pager-gap">…</span>
                  ) : (
                    <button
                      key={p}
                      className={`pager-num${p === page ? " is-current" : ""}`}
                      aria-current={p === page ? "page" : undefined}
                      onClick={() => goToPage(p)}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>
              <button
                className="pager-step"
                disabled={page >= data.totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Next <i className="fa-solid fa-angle-right" aria-hidden="true"></i>
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}