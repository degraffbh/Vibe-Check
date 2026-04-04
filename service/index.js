require('dotenv').config();
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const express = require('express');
const http = require('http');
const uuid = require('uuid');
const DB = require('./database');
const { peerProxy } = require('./peerProxy');
const app = express();

const authCookieName = 'token';

// The service port. In production the front-end code is statically hosted by the service on the same port.
const port = Number(process.env.PORT || (process.argv.length > 2 ? process.argv[2] : 3000));

// JSON body parsing using built-in middleware
app.use(express.json());

// Use the cookie parser middleware for tracking authentication tokens
app.use(cookieParser());

// Serve up the front-end static content hosting
app.use(express.static('public'));

// Router for service endpoints
var apiRouter = express.Router();
app.use(`/api`, apiRouter);

// CreateAuth a new user
apiRouter.post('/auth/create', async (req, res) => {
  if (await findUser('email', req.body.email)) {
    res.status(409).send({ msg: 'Existing user' });
  } else {
    const user = await createUser(req.body.email, req.body.password);

    setAuthCookie(res, user.token);
    res.send({ email: user.email });
  }
});

// GetAuth login an existing user
apiRouter.post('/auth/login', async (req, res) => {
  const user = await findUser('email', req.body.email);
  if (user) {
    if (await bcrypt.compare(req.body.password, user.password)) {
      user.token = uuid.v4();
      await DB.updateUser(user);
      setAuthCookie(res, user.token);
      res.send({ email: user.email });
      return;
    }
  }
  res.status(401).send({ msg: 'Unauthorized' });
});

// DeleteAuth logout a user
apiRouter.delete('/auth/logout', async (req, res) => {
  const user = await findUser('token', req.cookies[authCookieName]);
  if (user) {
    await DB.updateUserRemoveAuth(user);
  }
  res.clearCookie(authCookieName);
  res.status(204).end();
});

// Search YouTube videos by query (requires authenticated user)
apiRouter.get('/youtube/search', verifyAuth, async (req, res) => {
  const query = `${req.query.q || ''}`.trim();
  if (!query) {
    res.status(400).send({ msg: 'Search query is required' });
    return;
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    res.status(500).send({ msg: 'YouTube API key is not configured' });
    return;
  }

  const searchParams = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    videoEmbeddable: 'true',
    maxResults: '8',
    q: query,
    key: apiKey,
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    res.status(response.status).send({ msg: payload.error?.message || 'YouTube search failed' });
    return;
  }

  const searchItems = (payload.items || []).filter((item) => item?.id?.videoId);
  const videoIds = searchItems.map((item) => item.id.videoId);
  if (videoIds.length === 0) {
    res.send({ items: [] });
    return;
  }

  const detailsParams = new URLSearchParams({
    part: 'contentDetails',
    id: videoIds.join(','),
    key: apiKey,
  });
  const detailsResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?${detailsParams.toString()}`);
  const detailsPayload = await detailsResponse.json().catch(() => ({}));
  if (!detailsResponse.ok) {
    res.status(detailsResponse.status).send({ msg: detailsPayload.error?.message || 'YouTube video details failed' });
    return;
  }

  const durationById = new Map(
    (detailsPayload.items || []).map((item) => [
      item.id,
      parseYouTubeDurationToSeconds(item.contentDetails?.duration || 'PT0S'),
    ])
  );

  const items = searchItems
    .filter((item) => (durationById.get(item.id.videoId) ?? Number.POSITIVE_INFINITY) <= 300)
    .map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet?.title || 'Unknown title',
      channelTitle: item.snippet?.channelTitle || 'Unknown channel',
      thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
    }));

  res.send({ items });
});

apiRouter.get('/queue', verifyAuth, async (_req, res) => {
  const queue = await DB.getQueue();
  res.send({ items: queue });
});

apiRouter.post('/queue', verifyAuth, async (req, res) => {
  const song = req.body || {};
  if (!song.videoId || !song.title) {
    res.status(400).send({ msg: 'Song must include videoId and title' });
    return;
  }

  const existingQueue = await DB.getQueue();
  const user = req.user?.email || 'Anonymous';
  const existingUserSong = existingQueue.find((queuedSong) => queuedSong.user === user);
  if (existingUserSong) {
    await DB.deleteSongFromQueue(existingUserSong);
  }

  const newSong = {
    id: song.id || `${song.videoId}-${Date.now()}`,
    videoId: song.videoId,
    title: song.title,
    channelTitle: song.channelTitle || 'Unknown channel',
    thumbnail: song.thumbnail || '',
    user,
    likes: Array.isArray(song.likedBy) ? song.likedBy.length : Number(song.likes || 0),
    likedBy: Array.isArray(song.likedBy) ? song.likedBy.filter(Boolean) : [],
    timestamp: Number(song.timestamp || Date.now()),
  };

  await DB.addSongToQueue(newSong);
  res.status(201).send({ item: newSong });
});

apiRouter.delete('/queue/:songId', verifyAuth, async (req, res) => {
  const songId = `${req.params.songId || ''}`.trim();
  if (!songId) {
    res.status(400).send({ msg: 'songId is required' });
    return;
  }

  const existingSong = await DB.getQueue({ id: songId });
  if (!existingSong) {
    res.status(404).send({ msg: 'Song not found' });
    return;
  }

  await DB.deleteSongFromQueue(existingSong);
  res.status(204).end();
});

apiRouter.post('/queue/:songId/like', verifyAuth, async (req, res) => {
  const songId = `${req.params.songId || ''}`.trim();
  if (!songId) {
    res.status(400).send({ msg: 'songId is required' });
    return;
  }

  const song = await DB.getQueue({ id: songId });
  if (!song) {
    res.status(404).send({ msg: 'Song not found' });
    return;
  }

  const currentUser = req.user?.email || 'Anonymous';
  const likedBy = Array.isArray(song.likedBy) ? song.likedBy : [];
  const hasLiked = likedBy.includes(currentUser);
  const updatedLikedBy = hasLiked
    ? likedBy.filter((likedUser) => likedUser !== currentUser)
    : [...likedBy, currentUser];

  const updatedSong = {
    ...song,
    likedBy: updatedLikedBy,
    likes: updatedLikedBy.length,
  };

  await DB.updateSongInQueue(updatedSong);
  res.send({ item: updatedSong, liked: !hasLiked });
});

// Middleware to verify that the user is authorized to call an endpoint
async function verifyAuth(req, res, next) {
  const user = await findUser('token', req.cookies[authCookieName]);
  if (user) {
    req.user = user;
    next();
  } else {
    res.status(401).send({ msg: 'Unauthorized' });
  }
}

// Default error handler
app.use(function (err, req, res, next) {
  res.status(500).send({ type: err.name, message: err.message });
});

// Return the application's default page if the path is unknown
app.use((_req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

async function createUser(email, password) {
  const passwordHash = await bcrypt.hash(password, 10);

  const user = {
    email: email,
    password: passwordHash,
    token: uuid.v4(),
  };
  await DB.addUser(user);

  return user;
}

async function findUser(field, value) {
  if (!value) return null;

  if (field === 'email') {
    return DB.getUser(value);
  }

  if (field === 'token') {
    return DB.getUserByToken(value);
  }

  return null;
}

function parseYouTubeDurationToSeconds(duration) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration || '');
  if (!match) {
    return 0;
  }

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

// setAuthCookie in the HTTP response
function setAuthCookie(res, authToken) {
  res.cookie(authCookieName, authToken, {
    maxAge: 1000 * 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
  });
}

const httpServer = http.createServer(app);
peerProxy(httpServer);

httpServer.listen(port, () => {
  console.log(`Listening on port ${port}`);
});