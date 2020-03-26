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
const green = 311125;

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
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}



// Servers connected with the bot stored here
var servers = {};

// Log into console when on
client.once('ready', () => {
  logger.info(`JunkieMusic is on - version ${version}`);
  // Add description on the bot
  client.user.setActivity('plebs crying for -help', {
    type: 'WATCHING'
  });
});

// Read user inputs on chat
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
        let pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
        '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
        return !!pattern.test(str);
      }
      //Function that plays the music stream
      function playmp(connection, message) {
        let server = servers[message.guild.id];
        server.isPlaying = true;
        server.dispatcher = connection.play(ytdl(server.queue[0], {filter: 'audioonly'}));
        server.queue.shift();
        server.dispatcher.on('finish', () => {
          server.isPlaying = false;
          if(server.queue[0]) {
            playmp(connection, message);
          } else {
            connection.disconnect();
          }
        });
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
        break;
      } else {
        message.member.voice.channel.join();
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
        break;
      }
      // Create for the current server a null queue and save it in a variable
      if(!servers[message.guild.id]) {
        servers[message.guild.id] = {
          queue: [],
          isPlaying: false
        }
      }
      var server = servers[message.guild.id];
      // React on the user that send the song to be played
      message.react('🎺');
      // Check if the message contains a link or a yt search
      if(validURL(args[1])) {
        // Play music from a link
        if(server.isPlaying) {
          server.queue.push(args[1]);
          break;
        }
        server.queue.push(args[1]);
        if(message.guild.voice.connection) {
          playmp(message.guild.voice.connection, message);
        } else {
          logger.error(`message.guild.voice.connection = null`);
        }

      } else {
        //Search youtube and play
        let dataString = ''
        for(let i = 1; i < args.length; i++) {
          dataString = dataString + ' ' + args[i];
        }
        let searchString = dataString.substr(1);
        yts(searchString, (err, r) => {
          if(err) {
            logger.error(err);
          }
          var link = r.videos[0].url;
          if(server.isPlaying) {
            server.queue.push(link);
            message.channel.send({
              embed: {
                type: 'link',
                description: 'Song queued',
                url: link,
                color: green
              }
            });
            return;
          }
          server.queue.push(link);
          logger.info(`search for ${searchString} and resulted ${link}`);
          if(message.guild.voice.connection) {
            playmp(message.guild.voice.connection, message);
          } else {
            logger.error(`message.guild.voice.connection = null`);
          }
        });


      }
      break;
    case 'n':
    case 'next':
      var server_n = servers[message.guild.id];
      server_n.queue.shift();
      if(server_n.dispatcher) {
        server_n.dispatcher.destroy();
      }
      break;
    case 's':
    case 'stop':
      let server_s = servers[message.guild.id];
      if(message.guild.voice.connection) {
        for(let i = server_s.queue.length - 1; i >= 0; i--) {
          server_s.queue.splice(i, 1);
        }
        server_s.dispatcher.destroy();
        logger.info(`Stopped the queue!`);
      }
      if(message.guild.voice.connection) {
        message.guild.voice.connection.disconnect();
      }
      break;
  }


});



client.login(token);
