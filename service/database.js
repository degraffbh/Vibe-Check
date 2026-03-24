const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const { MongoClient } = require('mongodb');
const config = require('./dbConfig.json');

const user = encodeURIComponent(config.userName);
const pass = encodeURIComponent(config.password);
const url = `mongodb+srv://${user}:${pass}@${config.hostname}/?retryWrites=true&w=majority`;

const client = new MongoClient(url);
const db = client.db('vibecheck');
const userCollection = db.collection('user');
const queueCollection = db.collection('queue');

(async function testConnection() {
  try {
    await db.command({ ping: 1 });
    console.log(`Connect to database`);
  } catch (ex) {
    console.log(`Unable to connect to database with ${url} because ${ex.message}`);
    process.exit(1);
  }
})();

function getSongLookupCriteria(songOrQuery) {
  if (!songOrQuery) {
    return {};
  }

  if (typeof songOrQuery === 'string') {
    return { id: songOrQuery };
  }

  if (songOrQuery._id) {
    return { _id: songOrQuery._id };
  }

  if (songOrQuery.id) {
    return { id: songOrQuery.id };
  }

  if (songOrQuery.videoId && songOrQuery.user) {
    return {
      videoId: songOrQuery.videoId,
      user: songOrQuery.user,
    };
  }

  if (songOrQuery.videoId) {
    return { videoId: songOrQuery.videoId };
  }

  if (songOrQuery.title && songOrQuery.user) {
    return {
      title: songOrQuery.title,
      user: songOrQuery.user,
    };
  }

  if (songOrQuery.name) {
    return { name: songOrQuery.name };
  }

  return songOrQuery;
}

function getUser(email) {
  return userCollection.findOne({ email: email });
}

function getUserByToken(token) {
  return userCollection.findOne({ token: token });
}

async function addUser(user) {
  await userCollection.insertOne(user);
}

async function updateUser(user) {
  await userCollection.updateOne({ email: user.email }, { $set: user });
}

async function updateUserRemoveAuth(user) {
  await userCollection.updateOne({ email: user.email }, { $unset: { token: 1 } });
}

async function getQueue(queue) {
  if (!queue) {
    return queueCollection.find({}).toArray();
  }

  return queueCollection.findOne(getSongLookupCriteria(queue));
}

async function addSongToQueue(song) {
  if (!song || typeof song !== 'object') {
    throw new Error('A song object is required');
  }

  await queueCollection.insertOne({ ...song });
}

async function deleteSongFromQueue(song) {
  const criteria = getSongLookupCriteria(song);
  if (Object.keys(criteria).length === 0) {
    throw new Error('A song id or song object is required');
  }

  await queueCollection.deleteOne(criteria);
}

async function updateSongInQueue(song) {
  if (!song || typeof song !== 'object') {
    throw new Error('A song object is required');
  }

  const criteria = getSongLookupCriteria(song);
  if (Object.keys(criteria).length === 0) {
    throw new Error('A song id or song object is required');
  }

  const { _id, ...songWithoutId } = song;
  await queueCollection.updateOne(criteria, { $set: songWithoutId });
}

module.exports = {
  getUser,
  getUserByToken,
  addUser,
  updateUser,
  updateUserRemoveAuth,
  getQueue,
  addSongToQueue,
  deleteSongFromQueue,
  updateSongInQueue
};