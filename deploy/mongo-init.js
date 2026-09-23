// Creates a least-privilege application user on first start.
// Runs only when the data directory is empty.
const db = db.getSiblingDB(process.env.MONGO_INITDB_DATABASE);
db.createUser({
  user: process.env.MONGO_APP_USER,
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: 'readWrite', db: process.env.MONGO_INITDB_DATABASE }],
});
print('created application user ' + process.env.MONGO_APP_USER);
