"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const botbuilder_1 = require("botbuilder");
const restify = require("restify");
let authenticationService = require('./app/services/authenticationService');
let utils = require('./app/helpers/utils');
let connector = new botbuilder_1.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
let bot = new botbuilder_1.UniversalBot(connector, session => session.endDialog("default_dialog"));
let server = restify.createServer();
server.post('/api/messages', connector.listen());
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});
server.use(restify.bodyParser());
server.use(restify.queryParser());
if (process.env.AUTH_PROVIDER_NAME)
    bot.auth = authenticationService.initialize(server, bot);
utils.getFiles('./app/recognizers')
    .map(file => Object.assign(file, { recognizer: require(file.path) }))
    .forEach(r => bot.recognizer(r.recognizer));
utils.getFiles('./app/dialogs')
    .map(file => Object.assign(file, { fx: require(file.path) }))
    .forEach(dialog => dialog.fx(dialog.name, bot));
utils.getFiles('./app/events')
    .map(file => Object.assign(file, { fx: require(file.path) }))
    .forEach(event => event.fx(event.name, bot));
utils.getFiles('./app/middleware')
    .map(file => require(file.path))
    .forEach(mw => bot.use(mw));
utils.getFiles('./app/libraries')
    .map(file => require(file.path))
    .forEach(library => bot.library(library.createLibrary()));
