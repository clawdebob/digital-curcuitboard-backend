const express = require('express');
const cors = require('cors');
const gdrive = require('./gdrive');
const bodyParser = require('body-parser');
const app = express();
const port = 3030;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true,
    limit: '4mb'
}));


app.post('/logout', (request, response) => {
    const {sessionId} = request.body;

    gdrive
        .logout(sessionId)
        .then((data) => response.send(data));
});

app.post('/download', (request, response) => {
    const {sessionId, fileId} = request.body;

    gdrive
        .getFile(sessionId, fileId)
        .then((data) => response.send(data));
});

app.post('/load', (request, response) => {
   const {sessionId, fileId} = request.body;

   gdrive
       .getFile(sessionId, fileId)
       .then((data) => response.send(data));
});

app.post('/save', (request, response) => {
    const {sessionId, schemeData, folderId} = request.body;

    gdrive
        .saveFile(sessionId, schemeData, folderId)
        .then((data) => response.send(data));
});

app.post('/files', (request, response) => {
    const {sessionId, folderId} = request.body;

    gdrive
        .getFileList(sessionId, folderId)
        .then((data) => response.send(data));
});

app.post('/code', (request, response) => {
    const {code, sessionId} = request.body;

    gdrive
        .sendCode(code, sessionId)
        .then((data) => response.send(data));
});

app.post('/auth', (request, response) => {
    const sessionId = request.body.sessionId;

    gdrive
        .authorize(sessionId)
        .then((data) => response.send(data));
});

app.listen(port, (err) => {
    if (err) {
        return console.log('Error launching server', err);
    }
    gdrive.init();
    console.log(`server is listening on ${port}`);
});
