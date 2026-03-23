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