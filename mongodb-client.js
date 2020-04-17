const MongoClient = require('mongodb').MongoClient;
const url = "mongodb://localhost:27017";

module.exports = {
    db: null,
    collection: null,
    tryConnect() {
        const client = new MongoClient(url, {
            useUnifiedTopology: true
        });

        return new Promise((resolve, reject) => {
            client.connect((err, client) => {
                if (err) {
                    client.close();
                    reject(err);
                }
                this.db = client.db('clients');
                this.collection = this.db.collection('users');
                console.log("Database created!");
                resolve();
            });
        });
    },
    addUser(data) {
        return new Promise((resolve, reject) => {
            const collection = this.collection;

            if(collection) {
                collection.insertOne(data, (err) => {
                    if(err) {
                        reject(err);

                        return console.log(err);
                    }

                    resolve();
                });
            } else {
                reject();
            }
        });
    },
    getUser(sessionId) {
        return new Promise((resolve, reject) => {
            const collection = this.collection;

            if(collection) {
                collection.findOne({sessionId}, (err, res) => {
                    if(err || !res) {
                        reject(err);

                        if(err) {
                            console.log(err);
                        }

                        return;
                    }

                    const token = {
                        access_token,
                        refresh_token,
                        scope,
                        token_type,
                        expiry_date
                    } = res;

                    resolve(token);
                });
            } else {
                reject();
            }
        });
    },
    deleteUser(sessionId) {
        return new Promise((resolve, reject) => {
            const collection = this.collection;

            if(collection) {
                collection.deleteOne({sessionId}, (err, res) => {
                    if(err || !res.deletedCount) {
                        reject(err);

                        if(err) {
                            console.log(err);
                        }

                        return;
                    }

                    resolve();
                });
            } else {
                reject();
            }
        });
    }
};
