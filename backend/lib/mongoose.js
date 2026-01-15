const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL || 'mongodb://localhost:27017/mydb';

const options = {
  // Update options for your Mongoose version if needed
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // useCreateIndex: true, // remove if using Mongoose >= 6
};

let cached = global._mongoose;

if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

async function connect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_URI, options).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = {
  connect,
  mongoose,
};
