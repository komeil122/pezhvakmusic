import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Heart,
  Home,
  Library,
  ListMusic,
  History,
  Plus,
  Search,
  Play,
  type LucideIcon,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  AudioLines,
  BarChart3,
  Download,
  Menu,
  Music2,
  Sparkles,
  SlidersHorizontal,
  LockKeyhole,
  UnlockKeyhole,
  X,
  ArrowLeft,
  Mail,
  Instagram,
  Send,
} from "lucide-react";

import cover2 from "@/assets/cover-2.jpg";

const referenceCovers = Array.from(
  { length: 11 },
  (_, index) => `/cover/reference-cover-${String(index + 1).padStart(2, "0")}.jpg`,
);

type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration?: number;
  src?: string;
};

function isUnsupportedAudioSource(src?: string) {
  return Boolean(
    src && new URL(src, window.location.origin).pathname.toLowerCase().endsWith(".flac"),
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pezhvak Music — Dark Music Player Dashboard" },
      {
        name: "description",
        content:
          "Pezhvak Music is a dark, cinematic music player dashboard with library, playlists, now playing panel and full playback controls.",
      },
      { property: "og:title", content: "Pezhvak Music — Dark Music Player Dashboard" },
      {
        property: "og:description",
        content:
          "Browse albums, playlists and artists in a near-black player dashboard with live playback controls.",
      },
    ],
  }),
  component: PezhvakMusic,
});

type PlaylistCard = {
  id: string;
  name: string;
  cover: string;
  icon: LucideIcon;
  count: number;
  trackIds?: string[];
};

const basePlaylists: PlaylistCard[] = [
  { id: "p1", name: "Something Dead", cover: referenceCovers[0], icon: ListMusic, count: 0 },
];

const navItems = [
  { name: "Home", icon: Home },
  { name: "My Library", icon: Library },
  { name: "Playlists", icon: ListMusic },
  { name: "Favorites", icon: Heart },
  { name: "Recently Played", icon: History },
  { name: "Settings", icon: AudioLines },
  { name: "Add Music URL", icon: Plus },
];

const themeOptions = [
  { id: "obsidian", name: "Midnight Sigil", accent: "Obsidian black" },
  { id: "ember-red", name: "Crimson Ember", accent: "Warm ember glow" },
  { id: "embers", name: "Verdant Ember", accent: "Forest glow" },
  { id: "blue", name: "Deep Blue", accent: "Midnight current" },
  { id: "purple", name: "Royal Pulse", accent: "Electric plum glow" },
  { id: "yellow", name: "Solar Dust", accent: "Golden signal" },
  { id: "caramel", name: "Caramel Tape", accent: "Soft amber warmth" },
  { id: "silver", name: "Silver Dark", accent: "Cool metallic glow" },
] as const;

const localAdminName = "admin-komeil";
const localAdminPin = "Komeil12235q8";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function PezhvakMusic() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlistLoading, setPlaylistLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [mood, setMood] = useState<"all" | "late-night" | "favorites" | "long-form">("all");
  const [section, setSection] = useState("Home");
  const [libraryFilter, setLibraryFilter] = useState<"all" | "favorites">("all");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(42);
  const [volume, setVolume] = useState(70);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [nextTrackId, setNextTrackId] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>(["khooneye-man"]);
  const [recentTrackIds, setRecentTrackIds] = useState<string[]>([]);
  const [navOpen, setNavOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addMusicOpen, setAddMusicOpen] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [adminLoginMessage, setAdminLoginMessage] = useState("");
  const [musicUrl, setMusicUrl] = useState("");
  const [musicTitle, setMusicTitle] = useState("");
  const [musicArtist, setMusicArtist] = useState("");
  const [musicAlbum, setMusicAlbum] = useState("");
  const [musicMessage, setMusicMessage] = useState("");
  const [downloadingTrackId, setDownloadingTrackId] = useState<string | null>(null);
  const [settingsPosition, setSettingsPosition] = useState({ top: 80, left: 820 });
  const [theme, setTheme] = useState<(typeof themeOptions)[number]["id"]>("obsidian");
  const [playlists, setPlaylists] = useState<PlaylistCard[]>(basePlaylists);
  const [openPlaylistId, setOpenPlaylistId] = useState<string | null>(null);
  const [openArtistName, setOpenArtistName] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "Recently Played": false,
    "Your Playlists": false,
    "Top Artists": false,
  });
  const [trackDuration, setTrackDuration] = useState<number>(0);
  const [durationByTrack, setDurationByTrack] = useState<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedTheme = window.localStorage.getItem("pezhvak-theme") as
        (typeof themeOptions)[number]["id"] | null;
      const savedFavorites = JSON.parse(window.localStorage.getItem("pezhvak-favorites") ?? "null");
      const savedRecent = JSON.parse(window.localStorage.getItem("pezhvak-recent") ?? "null");
      if (savedTheme && themeOptions.some((option) => option.id === savedTheme))
        setTheme(savedTheme);
      if (Array.isArray(savedFavorites))
        setFavorites(savedFavorites.filter((id): id is string => typeof id === "string"));
      if (Array.isArray(savedRecent))
        setRecentTrackIds(savedRecent.filter((id): id is string => typeof id === "string"));
    } catch {
      setRecentTrackIds([]);
    }
  }, []);

  const current = tracks[index] ?? tracks[0];
  const nextTrack = nextTrackId
    ? tracks.find((track) => track.id === nextTrackId)
    : tracks.length > 1
      ? tracks[(index + 1) % tracks.length]
      : undefined;
  const isFav = current ? favorites.includes(current.id) : false;
  const duration = current
    ? current.src
      ? durationByTrack[current.id] || trackDuration || current.duration || 0
      : current.duration || 0
    : 0;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("pezhvak-theme", theme);

    document.documentElement.classList.remove("theme-switching");
    void document.documentElement.offsetWidth;
    document.documentElement.classList.add("theme-switching");
    const transitionTimer = window.setTimeout(() => {
      document.documentElement.classList.remove("theme-switching");
    }, 720);

    return () => window.clearTimeout(transitionTimer);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem("pezhvak-favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    window.localStorage.setItem("pezhvak-recent", JSON.stringify(recentTrackIds));
  }, [recentTrackIds]);

  useEffect(() => {
    fetch("/playlist.json")
      .then((response) => {
        if (!response.ok) throw new Error("Playlist not found");
        return response.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const loadedTracks = (data as Track[])
            .filter((track) => !isUnsupportedAudioSource(track.src))
            .map((track, index) => ({
              ...track,
              cover: referenceCovers[index % referenceCovers.length],
            }));
          const savedManualTracks = JSON.parse(
            window.localStorage.getItem("pezhvak-manual-tracks") ?? "[]",
          );
          const manualTracks = Array.isArray(savedManualTracks)
            ? savedManualTracks.filter(
                (track): track is Track =>
                  track &&
                  typeof track.id === "string" &&
                  typeof track.title === "string" &&
                  typeof track.src === "string",
              )
            : [];
          const allTracks = [...loadedTracks, ...manualTracks];
          setTracks(allTracks);
          setPlaylists((current) =>
            current.map((playlist) =>
              playlist.id === "p1" && !playlist.trackIds
                ? { ...playlist, trackIds: allTracks.map((track) => track.id) }
                : playlist,
            ),
          );
          if (data[0]) {
            setIndex(0);
          }
        }
        setPlaylistLoading(false);
      })
      .catch(() => {
        setTracks([]);
        setPlaylistLoading(false);
      });
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = muted ? 0 : volume / 100;
  }, [volume, muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setTrackDuration(audio.duration);
        setDurationByTrack((currentDurations) => ({
          ...currentDurations,
          [current.id]: audio.duration,
        }));
      }
    };

    const handleTimeUpdate = () => {
      if (audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      if (repeat) {
        audio.currentTime = 0;
        void audio.play();
        return;
      }
      const upcomingTrack = nextTrackId
        ? tracks.find((track) => track.id === nextTrackId)
        : tracks.length > 1
          ? tracks[(index + 1) % tracks.length]
          : undefined;
      const preloadAudio = preloadAudioRef.current;
      if (upcomingTrack?.src && preloadAudio?.getAttribute("src") === upcomingTrack.src) {
        audio.src = upcomingTrack.src;
        audio.load();
      }
      setIndex((i) => {
        const queuedIndex = nextTrackId
          ? tracks.findIndex((track) => track.id === nextTrackId)
          : -1;
        return queuedIndex >= 0 ? queuedIndex : (i + 1) % tracks.length;
      });
      setNextTrackId(null);
      setProgress(0);
    };

    const handleCanPlay = () => {
      if (!playing) return;
      setPlaybackError(null);
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        void playPromise.catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setPlaying(false);
        });
      }
    };

    const handleError = () => {
      setPlaying(false);
      setPlaybackError(`Could not play ${current.title}.`);
    };

    audio.addEventListener("loadedmetadata", handleMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);
    return () => {
      audio.removeEventListener("loadedmetadata", handleMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
    };
  }, [current?.id, index, nextTrackId, playing, repeat, tracks]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!current?.src) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      return;
    }

    if (audio.getAttribute("src") !== current.src) {
      audio.src = current.src;
      audio.load();
    }
    setTrackDuration(0);
    setPlaybackError(null);
    setProgress(0);
  }, [current?.id, current?.src]);

  useEffect(() => {
    const preloadAudio = preloadAudioRef.current;
    if (!preloadAudio || !nextTrack?.src) return;

    if (preloadAudio.getAttribute("src") !== nextTrack.src) {
      preloadAudio.src = nextTrack.src;
      preloadAudio.load();
    }

    return () => {
      preloadAudio.pause();
    };
  }, [nextTrack?.id, nextTrack?.src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        void playPromise.catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setPlaying(false);
        });
      }
    } else {
      audio.pause();
    }
  }, [current?.id, current?.src, playing]);

  useEffect(() => {
    if (!current || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

    const mediaSession = navigator.mediaSession;
    const artworkUrl = new URL(current.cover, window.location.origin).href;
    mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist || "Pezhvak Music",
      album: current.album || "Pezhvak Music",
      artwork: [
        { src: artworkUrl, sizes: "96x96", type: "image/jpeg" },
        { src: artworkUrl, sizes: "256x256", type: "image/jpeg" },
        { src: artworkUrl, sizes: "512x512", type: "image/jpeg" },
      ],
    });
    mediaSession.playbackState = playing ? "playing" : "paused";

    const actions: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ["play", () => setPlaying(true)],
      ["pause", () => setPlaying(false)],
      ["nexttrack", () => step(1)],
      ["previoustrack", () => step(-1)],
    ];

    actions.forEach(([action, handler]) => {
      try {
        mediaSession.setActionHandler(action, handler);
      } catch {
        // Some browsers expose Media Session without supporting every action.
      }
    });

    return () => {
      actions.forEach(([action]) => {
        try {
          mediaSession.setActionHandler(action, null);
        } catch {
          // Ignore unsupported Media Session actions during cleanup.
        }
      });
    };
  }, [current, playing]);

  const visiblePlaylists = useMemo(
    () =>
      playlists.map((playlist, idx) => ({
        ...playlist,
        count:
          idx === 0 && playlist.name === "Favorites"
            ? favorites.length || 1
            : playlist.trackIds
              ? playlist.trackIds.length
              : tracks.length,
      })),
    [favorites.length, playlists, tracks.length],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchingTracks = !q
      ? tracks
      : tracks.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.artist.toLowerCase().includes(q) ||
            t.album.toLowerCase().includes(q),
        );
    const moodTracks =
      mood === "favorites"
        ? matchingTracks.filter((track) => favorites.includes(track.id))
        : mood === "long-form"
          ? matchingTracks.filter((track) => (track.duration ?? 0) > 300)
          : mood === "late-night"
            ? matchingTracks.filter((track) =>
                /night|moon|dark|dream|alone|sleep/i.test(`${track.title} ${track.album}`),
              )
            : matchingTracks;
    return libraryFilter === "favorites"
      ? moodTracks.filter((track) => favorites.includes(track.id))
      : moodTracks;
  }, [favorites, libraryFilter, mood, query, tracks]);

  const filteredPlaylists = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? visiblePlaylists.filter((p) => p.name.toLowerCase().includes(q)) : visiblePlaylists;
  }, [query, visiblePlaylists]);

  const artists = useMemo(() => {
    const artistMap = new Map<string, { track: Track; trackCount: number }>();
    tracks.forEach((track) => {
      const artistName = track.artist.trim();
      if (!artistName || artistName.toLowerCase() === "unknown artist") return;

      const existing = artistMap.get(artistName);
      artistMap.set(artistName, {
        track: existing?.track ?? track,
        trackCount: (existing?.trackCount ?? 0) + 1,
      });
    });
    return Array.from(artistMap, ([name, artist]) => ({
      name,
      cover: artist.track.cover,
      track: artist.track,
      trackCount: artist.trackCount,
      isCollaboration: /,|\s&\s|\sfeat\.?\s/i.test(name),
      visualIndex: Array.from(artistMap.keys()).indexOf(name),
    }));
  }, [tracks]);

  const filteredArtists = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? artists.filter((a) => a.name.toLowerCase().includes(q)) : artists;
  }, [artists, query]);

  const playAudio = (track: Track) => {
    const audio = audioRef.current;
    if (!audio || !track.src) return;
    if (isUnsupportedAudioSource(track.src)) {
      setPlaying(false);
      setPlaybackError(`${track.title} uses an unsupported FLAC format on mobile browsers.`);
      return;
    }

    if (audio.getAttribute("src") !== track.src) {
      audio.src = track.src;
      audio.load();
    }
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      void playPromise.catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPlaying(false);
        setPlaybackError(`Could not play ${track.title}.`);
      });
    }
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio || !current?.src) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    if (audio.getAttribute("src") === current.src) {
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        void playPromise.catch(() => {
          setPlaying(false);
          setPlaybackError(`Could not play ${current.title}.`);
        });
      }
    } else {
      playAudio(current);
    }
    setPlaying(true);
  };

  const selectTrack = (t: Track) => {
    const i = tracks.findIndex((x) => x.id === t.id);
    setIndex(i < 0 ? 0 : i);
    setTrackDuration(0);
    setProgress(0);
    playAudio(t);
    setPlaying(true);
    setNextTrackId(null);
    setPlaybackError(null);
    setRecentTrackIds((recent) => [t.id, ...recent.filter((id) => id !== t.id)].slice(0, 12));
  };

  const queueTrackNext = (track: Track) => {
    setNextTrackId(track.id);
  };

  const openPlaylist = (playlist: PlaylistCard) => {
    setOpenPlaylistId(playlist.id);
    setOpenArtistName(null);
    setSection(playlist.name);
    setNavOpen(false);
  };

  const openArtist = (artistName: string) => {
    setOpenArtistName(artistName);
    setOpenPlaylistId(null);
    setSection(artistName);
    setNavOpen(false);
  };

  const navigateTo = (name: string) => {
    setOpenPlaylistId(null);
    setOpenArtistName(null);
    setSection(name);
    setLibraryFilter(name === "Favorites" ? "favorites" : "all");
    setNavOpen(false);

    const targetId =
      name === "My Library" || name === "Recently Played"
        ? "recently-played"
        : name === "Playlists"
          ? "your-playlists"
          : "welcome-section";
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const addTrackToPlaylist = (track: Track) => {
    if (playlists.length === 0) return;

    const choices = playlists
      .map((playlist, playlistIndex) => `${playlistIndex + 1}. ${playlist.name}`)
      .join("\n");
    const answer = window.prompt(`Add "${track.title}" to which playlist?\n${choices}`, "1");
    const selectedIndex = Number(answer) - 1;
    const selectedPlaylist = playlists[selectedIndex];
    if (!selectedPlaylist || selectedPlaylist.trackIds?.includes(track.id)) return;

    setPlaylists((current) =>
      current.map((playlist) =>
        playlist.id === selectedPlaylist.id
          ? { ...playlist, trackIds: [...(playlist.trackIds ?? []), track.id] }
          : playlist,
      ),
    );
  };

  const openPlaylistTracks = useMemo(() => {
    const playlist = playlists.find((item) => item.id === openPlaylistId);
    const playlistTracks = playlist?.trackIds
      ? tracks.filter((track) => playlist.trackIds?.includes(track.id))
      : tracks;
    const searchTerm = query.trim().toLowerCase();
    return searchTerm
      ? playlistTracks.filter(
          (track) =>
            track.title.toLowerCase().includes(searchTerm) ||
            track.artist.toLowerCase().includes(searchTerm) ||
            track.album.toLowerCase().includes(searchTerm),
        )
      : playlistTracks;
  }, [openPlaylistId, playlists, query, tracks]);

  const openArtistTracks = useMemo(() => {
    if (!openArtistName) return [];
    const searchTerm = query.trim().toLowerCase();
    return tracks.filter(
      (track) =>
        track.artist === openArtistName &&
        (!searchTerm ||
          track.title.toLowerCase().includes(searchTerm) ||
          track.album.toLowerCase().includes(searchTerm)),
    );
  }, [openArtistName, query, tracks]);

  const handleSeek = (value: number) => {
    const audio = audioRef.current;
    setProgress(value);

    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }

    audio.currentTime = (value / 100) * audio.duration;
  };

  const createPlaylist = () => {
    if (typeof window === "undefined") return;

    const nextName = window.prompt("Create a playlist", "My Playlist");
    if (!nextName) return;

    const cleanName = nextName.trim();
    if (!cleanName) return;

    const newPlaylist: PlaylistCard = {
      id: `playlist-${Date.now()}`,
      name: cleanName,
      cover: cover2,
      icon: ListMusic,
      count: 0,
      trackIds: [],
    };

    setPlaylists((current) => [newPlaylist, ...current]);
  };

  const toggleSection = (title: string) => {
    setSection(title);
    setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const openSettings = (trigger: HTMLButtonElement | null) => {
    const rect = trigger?.getBoundingClientRect();
    const panelWidth = Math.min(416, window.innerWidth - 32);
    const panelHeight = 420;
    const nextLeft = rect
      ? rect.right + 16 + panelWidth <= window.innerWidth - 16
        ? rect.right + 16
        : Math.max(16, rect.left - panelWidth - 16)
      : Math.max(16, (window.innerWidth - panelWidth) / 2);
    const nextTop = rect
      ? Math.min(Math.max(rect.top, 16), window.innerHeight - panelHeight - 16)
      : 80;

    setSettingsPosition({ top: nextTop, left: nextLeft });
    setSettingsOpen(true);
  };

  const toggleTheme = (event?: { currentTarget: HTMLButtonElement }) => {
    if (event) {
      openSettings(event.currentTarget);
      return;
    }

    setSettingsOpen(true);
  };

  const addMusicByUrl = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanUrl = musicUrl.trim();
    if (!cleanUrl || !musicTitle.trim()) {
      setMusicMessage("Add a music URL and title first.");
      return;
    }

    try {
      new URL(cleanUrl);
    } catch {
      setMusicMessage("Enter a valid direct music URL.");
      return;
    }

    const track: Track = {
      id: `manual-${Date.now()}`,
      title: musicTitle.trim(),
      artist: musicArtist.trim() || "Unknown Artist",
      album: musicAlbum.trim() || "Pezhvak Music",
      cover: referenceCovers[tracks.length % referenceCovers.length],
      src: cleanUrl,
    };
    setTracks((currentTracks) => [...currentTracks, track]);
    const savedManualTracks = JSON.parse(
      window.localStorage.getItem("pezhvak-manual-tracks") ?? "[]",
    );
    window.localStorage.setItem(
      "pezhvak-manual-tracks",
      JSON.stringify([...(Array.isArray(savedManualTracks) ? savedManualTracks : []), track]),
    );
    setMusicUrl("");
    setMusicTitle("");
    setMusicArtist("");
    setMusicAlbum("");
    setMusicMessage("Track added to this browser's library.");
  };

  const unlockAdmin = (event: React.FormEvent) => {
    event.preventDefault();
    if (adminName.trim() === localAdminName && adminPin === localAdminPin) {
      setAdminUnlocked(true);
      setAdminPin("");
      setAdminLoginMessage("");
      return;
    }
    setAdminLoginMessage("The admin name or PIN is incorrect.");
  };

  const applyTheme = (nextTheme: (typeof themeOptions)[number]["id"]) => {
    setTheme(nextTheme);
    setSettingsOpen(false);
  };

  const step = (dir: 1 | -1) => {
    if (tracks.length === 0) return;
    setIndex((i) => {
      if (shuffle) return Math.floor(Math.random() * tracks.length);
      return (i + dir + tracks.length) % tracks.length;
    });
    setNextTrackId(null);
    setTrackDuration(0);
    setPlaybackError(null);
    setProgress(0);
  };

  const toggleFav = (id: string) =>
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const saveTrackOffline = async (track: Track) => {
    if (!track.src || downloadingTrackId) return;

    setDownloadingTrackId(track.id);
    try {
      if (!("caches" in window)) throw new Error("Offline storage is unavailable");
      const response = await fetch(track.src);
      if (!response.ok && response.type !== "opaque") throw new Error("Offline save failed");
      const cache = await caches.open("pezhvak-audio-v1");
      await cache.put(track.src, response.clone());
    } catch {
      setMusicMessage("This track could not be saved for offline listening.");
    } finally {
      setDownloadingTrackId(null);
    }
  };

  const queue = shuffle
    ? []
    : [nextTrackId ? tracks.find((track) => track.id === nextTrackId) : undefined]
        .filter((track): track is Track => Boolean(track))
        .concat(
          tracks
            .slice(index + 1)
            .concat(tracks.slice(0, index))
            .filter((track) => track.id !== nextTrackId)
            .slice(0, 4),
        );
  const recentTracks = recentTrackIds
    .map((id) => tracks.find((track) => track.id === id))
    .filter((track): track is Track => Boolean(track));
  const elapsed = (progress / 100) * duration;
  const visibleTracks =
    query.trim() || expandedSections["Recently Played"]
      ? filtered
      : (recentTracks.length ? recentTracks : filtered).slice(0, 5);
  const visiblePlaylistCards = expandedSections["Your Playlists"]
    ? filteredPlaylists
    : filteredPlaylists.slice(0, 5);
  const visibleArtistsList = expandedSections["Top Artists"]
    ? filteredArtists
    : filteredArtists.slice(0, 6);

  if (playlistLoading || !current) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <div className="text-center">
          <AudioLines className="mx-auto animate-pulse text-primary" size={28} />
          <p className="mt-3 text-sm text-muted-foreground">Loading your music</p>
        </div>
      </div>
    );
  }

  return (
    <div className="music-shell min-h-screen overflow-x-hidden bg-background text-foreground">
      <audio ref={audioRef} preload="auto" crossOrigin="anonymous" playsInline />
      <audio ref={preloadAudioRef} preload="auto" crossOrigin="anonymous" playsInline />
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-sidebar transition-transform lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <div>
            <p className="text-xl font-semibold tracking-[0.2em] text-primary">PEZHVAK</p>
            <p className="text-[0.65rem] tracking-[0.4em] text-muted-foreground">MUSIC</p>
          </div>
          <button
            className="text-muted-foreground lg:hidden"
            onClick={() => setNavOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 px-3">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={(event) => {
                if (item.name === "Settings") {
                  openSettings(event.currentTarget);
                  setSection(item.name);
                  setNavOpen(false);
                  return;
                }
                if (item.name === "Add Music URL") {
                  setAddMusicOpen(true);
                  setAdminLoginMessage("");
                  setNavOpen(false);
                  return;
                }
                navigateTo(item.name);
              }}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                section === item.name
                  ? "border border-primary/30 bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              }`}
            >
              <item.icon size={17} />
              {item.name}
            </button>
          ))}
        </nav>

        <div className="mt-8 flex items-center justify-between px-6">
          <p className="text-[0.7rem] tracking-[0.2em] text-muted-foreground">YOUR PLAYLISTS</p>
          <button
            onClick={createPlaylist}
            aria-label="Create playlist"
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="mt-3 flex-1 space-y-1 overflow-y-auto px-3 pb-6">
          {visiblePlaylists.map((p) => (
            <button
              key={p.id}
              onClick={() => openPlaylist(p)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-sidebar-accent"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-secondary text-primary">
                <p.icon size={14} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm text-foreground">{p.name}</span>
                <span className="block text-xs text-muted-foreground">{p.count} songs</span>
              </span>
            </button>
          ))}
        </div>

        <div className="border-t border-sidebar-border px-6 py-5 text-center">
          <AudioLines className="mx-auto text-primary" size={22} />
          <p className="mt-2 text-sm text-primary">Pezhvak</p>
          <p className="text-xs text-muted-foreground">Sound of your world.</p>
        </div>
      </aside>

      {navOpen && (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-background/70 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      {settingsOpen && (
        <>
          <button
            aria-label="Close settings"
            className="modal-backdrop fixed inset-0 z-40 bg-background/70"
            onClick={() => setSettingsOpen(false)}
          />
          <div
            className="settings-panel theme-picker fixed z-50 w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-5 shadow-2xl"
            style={{ top: settingsPosition.top, left: settingsPosition.left }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
                  Settings
                </p>
                <h3 className="mt-1 text-xl font-semibold">Appearance</h3>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                aria-label="Close settings panel"
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {themeOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => applyTheme(option.id)}
                  className={`flex min-h-20 w-full flex-col items-start justify-between rounded-xl border p-3 text-left transition-colors ${
                    theme === option.id
                      ? "border-primary/50 bg-primary/10"
                      : "border-border bg-secondary/30 hover:border-primary/30"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{option.name}</p>
                    <p className="text-xs text-muted-foreground">{option.accent}</p>
                  </div>
                  <span
                    className="mb-3 h-4 w-4 rounded-full border border-border shadow-sm"
                    style={{
                      backgroundColor:
                        option.id === "obsidian"
                          ? "#0a0a0f"
                          : option.id === "ember-red"
                            ? "#b84a44"
                            : option.id === "embers"
                              ? "#4eaa78"
                              : option.id === "blue"
                                ? "#477bc2"
                                : option.id === "purple"
                                  ? "#9b6cff"
                                  : option.id === "yellow"
                                    ? "#e0b84f"
                                    : option.id === "caramel"
                                      ? "#d49a54"
                                      : "#b8c0ca",
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {addMusicOpen && (
        <>
          <button
            aria-label="Close add music panel"
            className="modal-backdrop fixed inset-0 z-40 bg-background/70"
            onClick={() => setAddMusicOpen(false)}
          />
          <section className="add-music-panel settings-panel fixed left-1/2 top-1/2 z-50 w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.7rem] uppercase tracking-[0.2em] text-primary">Library</p>
                <h3 className="mt-1 text-xl font-semibold">Add music by URL</h3>
              </div>
              <button
                onClick={() => setAddMusicOpen(false)}
                aria-label="Close add music panel"
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>
            {!adminUnlocked ? (
              <form onSubmit={unlockAdmin} className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/10 p-3">
                  <LockKeyhole size={18} className="shrink-0 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Admin access is required to add music.
                  </p>
                </div>
                <input
                  value={adminName}
                  onChange={(event) => setAdminName(event.target.value)}
                  placeholder="Admin name"
                  autoComplete="username"
                  required
                  className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-sm outline-none focus:border-primary/50"
                />
                <input
                  type="password"
                  value={adminPin}
                  onChange={(event) => setAdminPin(event.target.value)}
                  placeholder="Admin PIN"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-sm outline-none focus:border-primary/50"
                />
                <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
                  <UnlockKeyhole size={16} /> Unlock admin
                </button>
                {adminLoginMessage && (
                  <p className="text-sm text-destructive">{adminLoginMessage}</p>
                )}
              </form>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/10 px-3 py-2">
                  <span className="text-xs text-primary">{localAdminName}</span>
                  <button
                    type="button"
                    onClick={() => setAdminUnlocked(false)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <LockKeyhole size={14} /> Lock
                  </button>
                </div>
                <form onSubmit={addMusicByUrl} className="space-y-4">
                  <p className="text-sm leading-6 text-muted-foreground">
                    Paste a direct MP3 or audio file URL. It will be saved in this browser only.
                  </p>
                  <input
                    type="url"
                    value={musicUrl}
                    onChange={(event) => setMusicUrl(event.target.value)}
                    placeholder="https://example.com/song.mp3"
                    required
                    className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-sm outline-none focus:border-primary/50"
                  />
                  <input
                    value={musicTitle}
                    onChange={(event) => setMusicTitle(event.target.value)}
                    placeholder="Song title"
                    required
                    className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-sm outline-none focus:border-primary/50"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={musicArtist}
                      onChange={(event) => setMusicArtist(event.target.value)}
                      placeholder="Artist"
                      className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-sm outline-none focus:border-primary/50"
                    />
                    <input
                      value={musicAlbum}
                      onChange={(event) => setMusicAlbum(event.target.value)}
                      placeholder="Album"
                      className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-sm outline-none focus:border-primary/50"
                    />
                  </div>
                  <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
                    <Plus size={16} /> Add to library
                  </button>
                </form>
                {musicMessage && (
                  <p className="mt-4 text-sm text-muted-foreground">{musicMessage}</p>
                )}
              </>
            )}
          </section>
        </>
      )}

      {nowPlayingOpen && (
        <>
          <button
            aria-label="Close now playing card"
            className="modal-backdrop fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm"
            onClick={() => setNowPlayingOpen(false)}
          />
          <section className="now-playing-card fixed left-1/2 top-1/2 z-[70] max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
                  Now playing
                </p>
                <p className="mt-1 text-sm text-primary">{playing ? "Playing now" : "Paused"}</p>
              </div>
              <button
                onClick={() => setNowPlayingOpen(false)}
                aria-label="Close now playing card"
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={current.cover}
              alt={`${current.title} cover art`}
              className="aspect-square w-full rounded-xl border border-border object-cover"
            />
            <div className="mt-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold">{current.title}</h2>
                <p className="truncate text-sm text-muted-foreground">{current.artist}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{current.album}</p>
              </div>
              <button
                onClick={() => toggleFav(current.id)}
                aria-label="Toggle favorite"
                className="shrink-0 text-muted-foreground hover:text-primary"
              >
                <Heart size={21} className={isFav ? "fill-primary text-primary" : ""} />
              </button>
              <button
                onClick={() => void saveTrackOffline(current)}
                aria-label={`Save ${current.title} for offline listening`}
                title="Save for offline listening"
                disabled={downloadingTrackId === current.id}
                className="shrink-0 text-muted-foreground hover:text-primary disabled:opacity-50"
              >
                <Download size={19} />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{fmt(elapsed)}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(event) => handleSeek(Number(event.target.value))}
                aria-label="Seek current song"
                className="w-full accent-primary"
              />
              <span>{fmt(duration)}</span>
            </div>
            <Controls
              playing={playing}
              shuffle={shuffle}
              repeat={repeat}
              onPlay={togglePlayback}
              onNext={() => step(1)}
              onPrev={() => step(-1)}
              onShuffle={() => setShuffle((value) => !value)}
              onRepeat={() => setRepeat((value) => !value)}
              className="mt-5 justify-center"
            />
          </section>
        </>
      )}

      {/* Main */}
      <div className="lg:pl-64 xl:pr-[22rem]">
        <header className="sticky top-0 z-20 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/90 px-4 py-4 backdrop-blur md:px-8">
          <button
            className="text-muted-foreground lg:hidden"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="relative min-w-0">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search songs, artists, and albums"
              placeholder="Search for songs, artists, albums..."
              className="w-full max-w-md rounded-full border border-border bg-card py-2.5 pl-9 pr-10 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <button
            onClick={() => setQueueOpen((v) => !v)}
            className="rounded-full border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground xl:hidden"
          >
            Now Playing
          </button>
          <button
            onClick={(event) => toggleTheme(event)}
            className="hidden rounded-full border border-border bg-card px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground xl:inline-flex"
          >
            Theme
          </button>
          <span className="hidden size-9 place-items-center rounded-full border border-primary/40 text-sm text-primary xl:grid">
            P
          </span>
        </header>

        <main className="space-y-10 px-4 pb-40 pt-6 md:px-8">
          <section
            id="welcome-section"
            className="flex flex-wrap items-center justify-between gap-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <AudioLines className="shrink-0 text-primary" size={26} />
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold">Welcome back, Pezhvak</h1>
                <p className="text-sm text-muted-foreground">
                  Here's what's playing in your world.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShuffle(true);
                  selectTrack(tracks[Math.floor(Math.random() * tracks.length)] as Track);
                }}
                className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Shuffle size={15} /> Shuffle All
              </button>
              <button
                onClick={() => {
                  setLibraryFilter("all");
                  setSection("My Library");
                  selectTrack(tracks[0] as Track);
                }}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm hover:border-primary/40"
              >
                <Play size={15} /> Play All
              </button>
            </div>
          </section>

          <section className="dashboard-hero overflow-hidden rounded-2xl border border-primary/20 bg-card p-5 shadow-sm md:p-6">
            <div className="relative z-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary">
                  <Sparkles size={14} /> Your listening space
                </div>
                <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
                  Find the sound that fix this moment.
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
                  Your library, your pace, and a queue that stays ready whenever you are.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <ListeningStat icon={Music2} value={tracks.length} label="Tracks" />
                <ListeningStat icon={Heart} value={favorites.length} label="Favorites" />
                <ListeningStat icon={ListMusic} value={playlists.length} label="Playlists" />
              </div>
            </div>
          </section>

          <section className="flex flex-wrap items-center gap-2" aria-label="Library filters">
            <div className="mr-2 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <SlidersHorizontal size={14} /> Focus
            </div>
            {(
              [
                ["all", "All tracks"],
                ["late-night", "Late night"],
                ["favorites", "Favorites"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => {
                  setMood(value);
                  setLibraryFilter(value === "favorites" ? "favorites" : "all");
                }}
                className={`rounded-full border px-3 py-2 text-xs transition-colors ${
                  mood === value
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </section>

          {openPlaylistId || openArtistName ? (
            <section className="order-first space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setOpenPlaylistId(null);
                      setOpenArtistName(null);
                      setSection("Home");
                    }}
                    aria-label="Back to music home"
                    className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
                      {openArtistName ? "Artist" : "Playlist"}
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold">
                      {openArtistName ?? playlists.find((p) => p.id === openPlaylistId)?.name}
                    </h2>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">
                  {openArtistName ? openArtistTracks.length : openPlaylistTracks.length} songs
                </span>
              </div>

              <div className="max-h-[calc(100dvh-15rem)] divide-y divide-border overflow-y-auto rounded-xl border border-border sm:max-h-[calc(100dvh-13rem)]">
                {(openArtistName ? openArtistTracks : openPlaylistTracks).map(
                  (track, trackIndex) => (
                    <button
                      key={track.id}
                      onClick={() => selectTrack(track)}
                      className="flex w-full items-center gap-3 p-3 text-left hover:bg-secondary/40"
                    >
                      <span className="w-6 text-center text-xs text-muted-foreground">
                        {trackIndex + 1}
                      </span>
                      <img src={track.cover} alt="" className="size-11 rounded-md object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-foreground">
                          {track.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {track.artist} · {track.album}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {durationByTrack[track.id] ? fmt(durationByTrack[track.id]) : "--:--"}
                      </span>
                    </button>
                  ),
                )}
                {(openArtistName ? openArtistTracks : openPlaylistTracks).length === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    This playlist is empty.
                  </p>
                )}
              </div>
            </section>
          ) : null}

          {!openPlaylistId && !openArtistName && (
            <>
              <Section
                title={query.trim() ? "Search Results" : "Recently Played"}
                id="recently-played"
                expanded={expandedSections["Recently Played"]}
                onSeeAll={() => toggleSection("Recently Played")}
              >
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                  {visibleTracks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => selectTrack(t)}
                      className={`group overflow-hidden rounded-xl border bg-card text-left transition-colors ${
                        current.id === t.id
                          ? "border-primary/50"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="relative aspect-square overflow-hidden">
                        <img
                          src={t.cover}
                          alt={t.album ? `${t.album} cover art` : `${t.title} cover art`}
                          loading="lazy"
                          width={768}
                          height={768}
                          className="music-cover size-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                      <div className="p-3">
                        <button onClick={() => selectTrack(t)} className="block w-full text-center">
                          <p className="truncate text-sm">{t.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {t.artist} · {t.album}
                          </p>
                        </button>
                        <div className="mt-3 flex items-center justify-center gap-1">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              queueTrackNext(t);
                            }}
                            aria-label={`Play ${t.title} next`}
                            title={nextTrackId === t.id ? "Next track selected" : "Play next"}
                            aria-pressed={nextTrackId === t.id}
                            className={`grid size-6 shrink-0 place-items-center rounded-full border text-muted-foreground hover:border-primary/40 hover:text-primary ${
                              nextTrackId === t.id
                                ? "border-primary/50 bg-primary/10 text-primary"
                                : "border-border"
                            }`}
                          >
                            <SkipForward size={12} />
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              addTrackToPlaylist(t);
                            }}
                            aria-label={`Add ${t.title} to playlist`}
                            title="Add to playlist"
                            className="grid size-6 shrink-0 place-items-center rounded-full border border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              selectTrack(t);
                            }}
                            aria-label={`Play ${t.title}`}
                            title="Play"
                            className="grid size-6 shrink-0 place-items-center rounded-full border border-primary/40 bg-primary text-primary-foreground hover:border-primary"
                          >
                            <Play size={12} />
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleFav(t.id);
                            }}
                            aria-label={
                              favorites.includes(t.id)
                                ? `Remove ${t.title} from favorites`
                                : `Add ${t.title} to favorites`
                            }
                            aria-pressed={favorites.includes(t.id)}
                            title={
                              favorites.includes(t.id)
                                ? "Remove from favorites"
                                : "Add to favorites"
                            }
                            className="grid size-6 shrink-0 place-items-center rounded-full border border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                          >
                            <Heart
                              size={12}
                              className={
                                favorites.includes(t.id) ? "fill-primary text-primary" : ""
                              }
                            />
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              void saveTrackOffline(t);
                            }}
                            aria-label={`Save ${t.title} for offline listening`}
                            title="Save for offline listening"
                            disabled={downloadingTrackId === t.id}
                            className="grid size-6 shrink-0 place-items-center rounded-full border border-border text-muted-foreground hover:border-primary/40 hover:text-primary disabled:opacity-50"
                          >
                            <Download size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filtered.length === 0 && <Empty />}
                </div>
              </Section>

              <Section
                title="Your Playlists"
                id="your-playlists"
                expanded={expandedSections["Your Playlists"]}
                onSeeAll={() => toggleSection("Your Playlists")}
              >
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                  {visiblePlaylistCards.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => openPlaylist(p)}
                      className="group overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-primary/30"
                    >
                      <div className="aspect-[4/3] overflow-hidden">
                        <img
                          src={p.cover}
                          alt={`${p.name} playlist artwork`}
                          loading="lazy"
                          width={768}
                          height={768}
                          className="music-cover size-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                      <div className="p-3">
                        <p className="truncate text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.count} songs</p>
                      </div>
                    </button>
                  ))}
                  {filteredPlaylists.length === 0 && <Empty />}
                </div>
              </Section>

              <Section
                title="Top Artists"
                expanded={expandedSections["Top Artists"]}
                onSeeAll={() => toggleSection("Top Artists")}
              >
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                  {visibleArtistsList.map((a) => (
                    <button
                      key={a.name}
                      onClick={() => openArtist(a.name)}
                      className="group rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/30"
                    >
                      <img
                        src={a.cover}
                        alt={`${a.name} artwork`}
                        loading="lazy"
                        width={768}
                        height={768}
                        className="music-cover aspect-square w-full rounded-lg border border-border object-cover"
                        style={{
                          objectPosition: `${35 + ((a.visualIndex * 17) % 30)}% ${35 + ((a.visualIndex * 13) % 30)}%`,
                          filter: `grayscale(${35 + ((a.visualIndex * 11) % 45)}%) contrast(${1 + (a.visualIndex % 3) * 0.04})`,
                        }}
                      />
                      <p className="mt-3 truncate text-sm text-foreground">{a.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {a.isCollaboration
                          ? "Collaboration"
                          : `${a.trackCount} ${a.trackCount === 1 ? "track" : "tracks"}`}
                      </p>
                    </button>
                  ))}
                  {filteredArtists.length === 0 && <Empty />}
                </div>
              </Section>
            </>
          )}

          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-medium">More about Pezhvak Music</h2>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-primary">
                Studio
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Pezhvak Music is built as a modern dark-themed listening experience focused on
                  smooth playback, curated playlists, and a personal music library feel.
                </p>
                <p>
                  It was designed to bring together mood, discovery, and simple control in one
                  place.
                </p>
              </div>

              <div className="relative rounded-xl border border-border bg-secondary/40 p-4">
                <p className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
                  Owner &amp; Maker
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={() => setContactOpen((open) => !open)}
                    aria-label="Show Komeil's contact details"
                    aria-expanded={contactOpen}
                    title="Contact Komeil"
                    className="grid size-8 shrink-0 place-items-center rounded-full border border-primary/40 text-primary hover:bg-primary/10"
                  >
                    <Mail size={15} />
                  </button>
                  <p className="text-xl font-semibold text-foreground">Komeil</p>
                </div>

                {contactOpen && (
                  <div className="mt-4 space-y-2 border-t border-border pt-4">
                    <a
                      href="mailto:komeilbarani122@gmail.com"
                      className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <Mail size={15} className="text-primary" />
                      <span className="truncate">komeilbarani122@gmail.com</span>
                    </a>
                    <a
                      href="https://instagram.com/komeil_122"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <Instagram size={15} className="text-primary" />
                      <span>@komeil_122</span>
                    </a>
                    <a
                      href="https://t.me/ronda1996"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <Send size={15} className="text-primary" />
                      <span>@ronda1996</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Now Playing panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-40 h-dvh max-h-dvh w-[min(22rem,calc(100vw-1rem))] overflow-y-auto border-l border-border bg-sidebar px-5 pb-40 pt-5 transition-transform ${
          queueOpen ? "translate-x-0" : "translate-x-full xl:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm text-primary">Now Playing</p>
          <button className="text-muted-foreground xl:hidden" onClick={() => setQueueOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <img
          src={current.cover}
          alt={current.album ? `${current.album} cover art` : `${current.title} cover art`}
          width={768}
          height={768}
          className="mt-5 aspect-square w-full rounded-xl border border-border object-cover"
        />

        <div className="mt-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{current.title}</h2>
            <p className="truncate text-sm text-muted-foreground">{current.artist}</p>
          </div>
          <button onClick={() => toggleFav(current.id)} aria-label="Toggle favorite">
            <Heart
              size={22}
              className={isFav ? "fill-primary text-primary" : "text-muted-foreground"}
            />
          </button>
          <button
            onClick={() => void saveTrackOffline(current)}
            aria-label={`Save ${current.title} for offline listening`}
            title="Save for offline listening"
            disabled={downloadingTrackId === current.id}
            className="text-muted-foreground hover:text-primary disabled:opacity-50"
          >
            <Download size={19} />
          </button>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => handleSeek(Number(e.target.value))}
          aria-label="Seek"
          className="mt-4 w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{fmt(elapsed)}</span>
          <span>{fmt(duration)}</span>
        </div>

        <Controls
          playing={playing}
          shuffle={shuffle}
          repeat={repeat}
          onPlay={togglePlayback}
          onNext={() => step(1)}
          onPrev={() => step(-1)}
          onShuffle={() => setShuffle((s) => !s)}
          onRepeat={() => setRepeat((r) => !r)}
          className="mt-5 justify-center"
        />

        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm text-primary">Next Up</p>
          <span className="text-xs text-muted-foreground">
            {shuffle ? "Shuffle mode" : `${queue.length} tracks`}
          </span>
        </div>
        {shuffle ? (
          <p className="mt-3 rounded-lg border border-border/70 bg-secondary/30 p-3 text-xs leading-5 text-muted-foreground">
            The next track will be selected when this song ends.
          </p>
        ) : (
          <ul className="mt-3 space-y-1">
            {queue.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => selectTrack(t)}
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-sidebar-accent"
                >
                  <img
                    src={t.cover}
                    alt=""
                    loading="lazy"
                    className="size-10 shrink-0 rounded object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{t.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{t.artist}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {durationByTrack[t.id] ? fmt(durationByTrack[t.id]) : "--:--"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Playback bar */}
      <div className="playback-bar fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 lg:grid-cols-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setNowPlayingOpen(true)}
              aria-label={`Open now playing card for ${current.title}`}
              className="flex min-w-0 items-center gap-3 text-left"
            >
              <img
                src={current.cover}
                alt=""
                className="size-11 shrink-0 rounded-md border border-border object-cover"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm">{current.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {current.artist}
                </span>
              </span>
            </button>
            <button onClick={() => toggleFav(current.id)} aria-label="Toggle favorite">
              <Heart
                size={16}
                className={isFav ? "fill-primary text-primary" : "text-muted-foreground"}
              />
            </button>
          </div>

          <Controls
            playing={playing}
            shuffle={shuffle}
            repeat={repeat}
            onPlay={togglePlayback}
            onNext={() => step(1)}
            onPrev={() => step(-1)}
            onShuffle={() => setShuffle((s) => !s)}
            onRepeat={() => setRepeat((r) => !r)}
            className="justify-center"
          />

          <div className="col-span-2 flex items-center gap-3 lg:col-span-1 lg:justify-end">
            <button onClick={() => setMuted((m) => !m)} aria-label="Toggle mute">
              {muted || volume === 0 ? (
                <VolumeX size={17} className="text-muted-foreground" />
              ) : (
                <Volume2 size={17} className="text-muted-foreground" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const next = Number(e.target.value);
                setMuted(next === 0);
                setVolume(next);
                if (audioRef.current) {
                  audioRef.current.volume = next / 100;
                }
              }}
              aria-label="Volume"
              className="w-32 accent-primary"
            />
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {fmt(elapsed)} / {fmt(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  id,
  children,
  expanded,
  onSeeAll,
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
  expanded?: boolean;
  onSeeAll?: () => void;
}) {
  return (
    <section id={id} className="music-section scroll-mt-24">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">{title}</h2>
        <button onClick={onSeeAll} className="text-xs text-primary hover:underline">
          {expanded ? "Show Less" : "See All"}
        </button>
      </div>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="col-span-full text-sm text-muted-foreground">No matches for your search.</p>;
}

function ListeningStat({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-background/35 p-3 md:p-4">
      <Icon size={16} className="text-primary" />
      <p className="mt-3 text-xl font-semibold md:text-2xl">{value}</p>
      <p className="mt-1 text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function Controls({
  playing,
  shuffle,
  repeat,
  onPlay,
  onNext,
  onPrev,
  onShuffle,
  onRepeat,
  className = "",
}: {
  playing: boolean;
  shuffle: boolean;
  repeat: boolean;
  onPlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onShuffle: () => void;
  onRepeat: () => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-5 ${className}`}>
      <button onClick={onShuffle} aria-label="Shuffle">
        <Shuffle size={17} className={shuffle ? "text-primary" : "text-muted-foreground"} />
      </button>
      <button onClick={onPrev} aria-label="Previous track">
        <SkipBack size={19} className="text-foreground" />
      </button>
      <button
        onClick={onPlay}
        aria-label={playing ? "Pause" : "Play"}
        className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {playing ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <button onClick={onNext} aria-label="Next track">
        <SkipForward size={19} className="text-foreground" />
      </button>
      <button onClick={onRepeat} aria-label="Repeat">
        <Repeat size={17} className={repeat ? "text-primary" : "text-muted-foreground"} />
      </button>
    </div>
  );
}
