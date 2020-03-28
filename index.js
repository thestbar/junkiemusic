// Dependencies
const fs = require('fs');
const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const winston = require('winston');
const yts = require('yt-search');

// Program constant variables
const PREFIX = '-';
const version = '1.0.2';
const client = new Discord.Client();

// Import token
const rawdata = fs.readFileSync('.gitignore/auth.json');
const auth_json = JSON.parse(rawdata);
const token = auth_json[0].token;

// Colours
const liteBlue = 378866;
const yellow = 15902749;
const red = 15865366;
const green = 311125;
const orange = 15890444;
const purple = 9653977;
const brown = 10897684;

// Winston logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log`
    // - Write all logs error (and below) to `error.log`.
    //
    new winston.transports.File({ filename: '.gitignore/logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: '.gitignore/logs/combined.log' })
  ]
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `.
//
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Solve to a bug with stop requiring a next if someone wantes to play music again
// Here the bot is ensured that a user typed stop command before
var lastStop = false;

// Servers connected with the bot stored here.
var servers = {};

// Log into console when on.
client.once('ready', () => {
  logger.info(`JunkieMusic is on - version ${version}`);
  // Add description on the bot.
  client.user.setActivity('plebs crying for -help', {
    type: 'WATCHING'
  });
});

// Read user inputs on chat.
client.on('message', message => {
  let args = message.content.substring(PREFIX.length).split(' ');

  switch(args[0]) {
    case 'ping':
      message.react('🏓').then(message.channel.send('', {
        embed: {
          description:`Pong 🏆`,
          color: liteBlue
        }
      })).catch((err) => {
        logger.error(err);
      });
      break;
    case 'h':
    case 'help':
      message.react('🚬').then(message.channel.send('', {
        embed: {
          author: {
            name: 'JunkieMusic',
            url: 'https://github.com/junkiedan/',
            iconURL: 'https://scontent.fath4-2.fna.fbcdn.net/v/t1.15752-9/89906094_3137648086254193_62368182177890304_n.jpg?_nc_cat=103&_nc_sid=b96e70&_nc_ohc=IZfllTS1WQQAX94E9y0&_nc_ht=scontent.fath4-2.fna&oh=05f86d68adc8032f0c9d016d22e13365&oe=5EA372DC'
          },
          color: yellow,
          title: 'Hello this is JunkieMusic created by JunkieDan.',
          description: `Available commands:\n\t${PREFIX}play "link" or "youtube search" to play a song\n\t${PREFIX}next to skip the currently playing song\n\t${PREFIX}stop to stop the music\nYou can use ${PREFIX}p, ${PREFIX}n, ${PREFIX}s for the same functions respectively.`,
          footer: {
            text: `version ${version}`
          }

        }
      })).catch((err) => {
        logger.error(err);
      });
      break;
    case 'p':
    case 'play':
      // Function that validates if the provided string is url
      function validURL(str) {
        var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
        '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
        return !!pattern.test(str);
      }
      // Function that gets the song played.
      function playmp(connection, message) {
        var server = servers[message.guild.id];

        ytdl.getBasicInfo(server.queue[0], function(err, info) {
          if(!err) {
            message.channel.send({embed: {
              title: `Now playing`,
              description: `[${info.title}](${info.video_url}) by <@${message.author.id}>`,
              color: green,
            }});
          }
        }).catch(function(err) {
          logger.error(`Tried to play a song on empty queue - ERRCODE: ${err}`);
        });
        server.dispatcher = connection.play(ytdl(server.queue[0], {filter: 'audioonly', quality: 'highestaudio', liveBuffer: 40000, highWaterMark: 1<<30}));
        server.queue.shift();
        server.dispatcher.on('finish', function() {
          console.log(`server.dispatcher.onFinish event occured`);
          lastStop = true;
          if(server.queue[0]) playmp(connection, message);
          // Not sure if is wanted the bot to leave the channel when it stops playing the queue
          // else connection.disconnect();
        });
      }

      // Check if the member is in a voice channel.
      if(!message.member.voice.channel) {
        message.react('🤦‍♂️');
        message.channel.send({embed: {
          description: 'Pffff bro... You need to be in a channel to use this command...',
          color: red
        }});
        break;
      }
      // Check if there are arguments inserted after the -play command.
      if(!args[1]) {
        message.react('😡');
        message.channel.send({embed: {
          description: 'I need you to tell me what to play. BABOON!',
          color: red
        }});
        break;
      }
      // Create for the server in which the user called the bot an empty array
      // with the name "queue". There will be saved the songs that will be played
      // Each server gets access on its queue with `guild.id`.
      if(!servers[message.guild.id]) {
        servers[message.guild.id] = {
          queue: []
        }
      }
      // Select the server that made the request to play a song
      var server = servers[message.guild.id];
      // Join the channel that the user who made the request is in
      // (if it still exists).
      if(message.member.voice.channel) message.member.voice.channel.join();
      // React on the user that send the request to play a song on his server.
      message.react('🎺');
      // Now we check if the song that the user sent to play is on url format
      // or string format.
      if(validURL(args[1])) {
        // The user inputed a YOUTUBE URL to be played.
        // Now we check if the link is a playlist or a single song.
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // ~~~~~~~~~~~~~~~~~~~~~~~~~WORK TO DO~~~~~~~~~~~~~~~~~~~~~~~~~~
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        var isPlaylist = false;
        if(!isPlaylist) {
          server.queue.push(args[1]);
          if( message.guild.voice && message.guild.voice.connection && (lastStop || !server.dispatcher) ) {
            lastStop = false;
            playmp(message.guild.voice.connection, message);
          } else {
            ytdl.getBasicInfo(args[1], function(err, info) {
              if(err) logger.error(err);
              message.channel.send({embed: {
                description: `Queued [${info.title}](${info.video_url}) by <@${message.author.id}>`,
                color: yellow
              }});
            });
          }
        }
      } else {
        // The user inputed a YOUTUBE SEARCH to be played.
        var dataString = '';
        for(var i=1; i<args.length; i++) {
          dataString = dataString + ' ' + args[i];
        }
        var searchString = dataString.substr(1);
        yts(searchString, function(err, r) {
          if(err) {
            logger.error(err);
            message.channel.send({embed: {
              description: `Something bad happened trying to play this song. Sorry miladies... 😒`,
              color: red
            }});
            return;
          }
          const videos = r.videos;
          var link = videos[0].url;
          server.queue.push(link);
          // Last stop fixes a bug being explained on line 52.
          if( message.guild.voice && message.guild.voice.connection && ( lastStop || !server.dispatcher) ) {
            lastStop = false;
            playmp(message.guild.voice.connection, message);
          } else {
            ytdl.getBasicInfo(link, function(err, info) {
              if(err) throw err;
              message.channel.send({embed: {
                description: `Queued [${info.title}](${info.video_url}) by <@${message.author.id}>`,
                color: yellow
              }});
            });
          }
        });
      }
      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      // FIX IMPORTANT BUG:
      // Ensure that the bot want try to play if there are no real youtube
      // links on the queue.
      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

      break;
    case 'n':
    case 'next':
    // When a user commits the next command we must destroy the current dispatcher
    // which plays the current song. Then the dispatcher on destroy function
    // will be triggered and the next song will be played (if it exists).
      if(args[1]) break;
      var server = servers[message.guild.id];
      if(server && server.dispatcher && server.queue[0]) {
        message.channel.send({embed: {
          description: `Skipping song.`,
          color: brown
        }});
        server.dispatcher.destroy();
        playmp(message.guild.voice.connection, message);
      } else {
        message.channel.send({embed: {
          description: `The queue is empty.`,
          color: red
        }});
      }
      break;
    case 's':
    case 'stop':
    // When a user commits the stop command we must destroy the current dispatcher
    // which plays the current song. Also, we must empty the queue because we don't
    // want to have remaining urls inside the queue without being played.
    if(args[1]) break;
      // Last stop fixes a bug being explained on line 52.
      lastStop = true;
      var server = servers[message.guild.id];
      // The first check is happening for the case that the user is using the
      // stop command when the bot is not inside a voice channel. So, if there
      // no voice property we cannot check for connection property.
      if(message.guild.voice && message.guild.voice.connection) {
        for(var i = server.queue.length - 1; i >= 0; i--) {
          server.queue.splice(i, 1);
        }
        server.dispatcher.destroy();
        message.channel.send({embed: {
          description: `Stopped playing cool music.`,
          color: red
        }});
        // Create a log for who is running the commands
        logger.info(`Bot stopped from playing music by user [id: ${message.member.id}`);
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // Send the bot to sleep by disconnecting it (not sure if this
        // feature will be added).
        // message.guild.voice.connection.disconnect();
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      }
      break;
  }

});

client.login(token);
