// Dependencies
const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const winston = require('winston');
const yts = require('yt-search');
const fs = require('fs');

// Program constant variables
const PREFIX = '-';
const version = '1.0.1';
const client = new Discord.Client();

// Import token
const rawdata = fs.readFileSync('.gitignore/auth.json');
const auth_json = JSON.parse(rawdata);
const token = auth_json[0].token;

// Colours
const liteBlue = 378866;
const yellow = 15914832;
const red = 15865366;

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
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Songs queue is stored here
let servers = {};

// Log into console when on
client.once('ready', () => {
  logger.info(`JunkieMusic is on - version ${version}`);
});

// Read user inputs on chat
client.on('message', message => {
  const args = message.content.substring(PREFIX.length).split(' ');

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
      return;
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
      return;
    case 'p':
    case 'play':
      // Function that validates if the provided string is url
      function validURL(str) {
        let pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
        '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
        return !!pattern.test(str);
      }
      //Function that plays the music stream
      function play(connection, message) {
        return;
      }
      // Check if the member is in a voice channel
      if(!message.member.voice.channel) {
        message.react('🤦‍♂️').then(message.channel.send('', {
          embed: {
            description: 'Pffff bro... You need to be in a channel to use this command...',
            color: red
          }
        })).catch((err) => {
          logger.error(err);
        });
        return;
      }
      //Check if there is something after the play command
      if(!args[1]) {
        message.react('😡').then(message.channel.send('', {
          embed: {
            description: 'I need you to tell me what to play. BABOON!',
            color: red
          }
        })).catch((err) => {
          logger.error(err);
        });
        return;
      }
      // Check if the message contains a link or a yt search


      // Function
      return;
  }
});



client.login(token);
