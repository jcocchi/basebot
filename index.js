"use strict";
let builder = require("botbuilder"); //the BotBuilder SDK
let restify = require('restify'); //Restify used to serve the bot
let dotenv = require('dotenv');
let botauth = require('botauth');
let authStrategy = require(`passport-${AUTH_PROVIDER_NAME}`).Strategy;

//this loads the environment variables from the .env file
dotenv.config();

let connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

let bot = new builder.UniversalBot(connector, session => session.endDialog("default_dialog"));

//serve the bot
let server = restify.createServer();
server.post('/api/messages', connector.listen());
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});
server.use(restify.bodyParser());
server.use(restify.queryParser());

// Initialize with the strategies we want to use
let auth = new botauth.BotAuthenticator(server, bot, { baseUrl: `https://${process.env.WEBSITE_HOSTNAME}`, secret: process.env.BOTAUTH_SECRET })
    .provider(process.env.AUTH_PROVIDER_NAME, (options) => {
        return new authStrategy({
            clientID: process.env.AUTH_PROVIDER_APP_ID,
            clientSecret: process.env.AUTH_PROVIDER_APP_SECRET,
            scope: ['read_public', 'read_relationships'],
            callbackURL: options.callbackURL
        }, (accessToken, refreshToken, profile, done) => {
            profile = profile || {};
            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;
            return done(null, profile);
        });
    });

//recognizers
//this dynamically configures recognizers for the bot by enumerating the files in ./app/recognizers, requiring each, and then calling bot.recognizer for each
utils.getFiles('./app/recognizers')
    .map(file => Object.assign(file, { recognizer: require(file.path) }))
    .forEach(r => bot.recognizer(r.recognizer));

//dialogs
//this dynamically configures dialogs for the bot by enumerating the files in ./app/dialogs, requiring each (as fx), and then calling that fx passing in the bot
utils.getFiles('./app/dialogs')
    .map(file => Object.assign(file, { fx: require(file.path) }))
    .forEach(dialog => dialog.fx(dialog.name, bot, auth));


//events
//this dynamically configures events for the bot by enumerating the files in ./app/events, requiring each (as fx), and then calling that fx passing in the bot
utils.getFiles('./app/events')
    .map(file => Object.assign(file, { fx: require(file.path) }))
    .forEach(event => event.fx(event.name, bot));

//middleware
//this dynamically configures middleware modules for the bot by enumerating the files in ./app/middleware, requiring each, and then calling bot.use on each
utils.getFiles('./app/middleware')
    .map(file => require(file.path))
    .forEach(mw => bot.use(mw));

//libraries
utils.getFiles('./app/libraries')
    .map(file => require(file.path))
    .forEach(library => bot.library(library.createLibrary()));
