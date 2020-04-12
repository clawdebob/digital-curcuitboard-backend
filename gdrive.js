const {google} = require('googleapis');
const fs = require('fs');

const SCOPES = [
    'https://www.googleapis.com/auth/drive',
];
let credentials = null;

class Session {
    constructor(){
        const {client_secret, client_id, redirect_uris} = credentials;

        this.oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        this.drive = null;
    }
}

module.exports = {
    oAuth2Client: null,
    driveBuffer: {},
    init() {
        fs.readFile('credentials.json', (err, content) => {
            if (err) return console.log('Error loading client secret file:', err);
            credentials = JSON.parse(content).installed;
        });
    },
    sendCode(code, sessionId) {
        const {oAuth2Client} = this.driveBuffer[sessionId];
        const TOKEN_PATH = `./tokens/${sessionId}.json`;

        return new Promise((resolve) => {
            oAuth2Client.getToken(code, (err, token) => {
                let error = err;

                if (err) {
                    resolve({
                        status: 'error',
                        error: 'Error retrieving token'
                    });
                } else {
                    oAuth2Client.setCredentials(token);

                    const auth = oAuth2Client;

                    try {
                        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
                    } catch (e) {
                        error = e;
                        console.log('Error writing to file');
                    }

                    if(error) {
                        resolve({
                            status: 'error',
                            error: 'Error writing to file'
                        });
                    } else {
                        this.driveBuffer[sessionId].drive = google.drive({version: 'v3', auth});
                        this.getUserData(this.driveBuffer[sessionId].drive)
                            .then((user) => {
                                if(user) {
                                    resolve({
                                        status: 'success',
                                        user
                                    });
                                } else {
                                    resolve({
                                        status: 'error',
                                    });
                                }
                            });
                    }
                }
            });
        });
    },
    getAccessUrl(oAuth2Client) {
        return oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });
    },
    authorize(sessionId) {
        let token = null;
        const session = new Session();

        this.driveBuffer[sessionId] = session;

        return new Promise((resolve) => {
            try {
                token = JSON.parse(fs.readFileSync(`./tokens/${sessionId}.json`, 'utf8'));
            } catch (e) {
                console.log('File not found, creating new session data');
            }

            if(token) {
                session.oAuth2Client.setCredentials(token);

                const auth = session.oAuth2Client;

                session.drive = google.drive({version: 'v3', auth});

                this.getUserData(session.drive).then((user) => {
                    if(user) {
                        resolve({
                            status: 'success',
                            user
                        });
                    } else {
                        resolve({
                            status: 'error'
                        });
                    }
                }, () => {
                    resolve({
                        status: 'error'
                    });
                });
            } else {
                resolve({
                    status: 'needAuth',
                    link: this.getAccessUrl(this.driveBuffer[sessionId].oAuth2Client)
                });
            }
        });
    },
    logout(sessionId) {
        const TOKEN_PATH = `./tokens/${sessionId}.json`;

        return new Promise((resolve) => {
            delete this.driveBuffer[sessionId];
            fs.unlink(TOKEN_PATH, (err) => {
                if (err) {
                    resolve({
                        status: 'error'
                    });
                } else {
                    resolve({
                        status: 'success'
                    });
                }
            });
        });
    },
    getUserData(drive) {
        return new Promise((resolve) => {
            drive.files.get({
                fields: '*',
                fileId: 'root'
            }, (err, res) => {
                if(err) {
                    resolve(null);
                } else {
                    const owner = res.data.permissions
                        .filter((permission) => permission.role === 'owner')[0];

                    if(owner) {
                        const {displayName, emailAddress, photoLink} = owner;

                        resolve({
                            name: displayName,
                            email: emailAddress,
                            photo: photoLink
                        });
                    } else {
                        resolve(null);
                    }
                }
            });
        });
    },
    getFileList(sessionId, folderId) {
        const session = this.driveBuffer[sessionId];

        return new Promise((resolve) => {
            if(!session) {
                resolve({
                    status: 'auth',
                });
            } else {
                const {drive} = session;

                if(!drive) {
                    resolve({
                        status: 'auth',
                    });
                }

                drive.files.list({
                    fields: 'files(id, name, mimeType)',
                    orderBy: 'folder,modifiedTime desc,name',
                    q: `"${folderId}" in parents and (mimeType = 'application/vnd.google-apps.folder' or fileExtension = "dcb")`
                }, (err, res) => {
                    if(err) {
                        resolve({
                            status: err
                        });
                    } else {
                        const files = res.data.files;

                        resolve({
                            files,
                            status: 'success'
                        });
                    }
                });
            }
        });
    },
    getFile(sessionId, fileId) {
        const session = this.driveBuffer[sessionId];
        let fileData = '';

        return new Promise((resolve) => {
            if(!session) {
                resolve({
                    status: 'auth',
                });
            } else {
                const {drive} = session;

                if(!drive) {
                    resolve({
                        status: 'auth',
                    });
                }

                drive.files.get({
                    fileId,
                    alt: 'media'
                },
                {
                    responseType: 'stream'
                },
                (err, res) => {
                    if(err) {
                        resolve({
                            status: err
                        });
                    } else {
                        res.data
                            .on('end', () => {
                                resolve({
                                    status: 'success',
                                    fileData
                                });
                            })
                            .on('error', () => {
                                resolve({
                                    status: 'error'
                                });
                            })
                            .on('data', chunk => {
                                fileData += chunk;
                            });
                    }
                });
            }
        });
    },
    saveFile(sessionId, schemeData, folderId) {
        const session = this.driveBuffer[sessionId];
        const {schemeName} = JSON.parse(schemeData);
        const media = {
            body: schemeData
        };
        const fileMetadata = {
            name: schemeName + '.dcb',
            parents: [folderId]
        };

        return new Promise((resolve) => {
            if(!session) {
                resolve({
                    status: 'auth',
                });
            } else {
                const {drive} = session;

                if(!drive) {
                    resolve({
                        status: 'auth',
                    });
                }

                drive.files.create({
                    resource: fileMetadata,
                    media: media,
                    fields: 'id'
                }, (err) => {
                    if(err) {
                        resolve({
                            status: 'error'
                        });
                    } else {
                        resolve({
                            status: 'success'
                        });
                    }
                });
            }
        });
    }
};
