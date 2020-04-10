// Dependencies
const Discord = require('discord.js');
const {prefix, token, version, admins} = require('./config.json');
const ytdl = require('ytdl-core');
const winston = require('winston');
const yts = require('yt-search');

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
    new winston.transports.File({ filename: './logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: './logs/combined.log' })
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

const client = new Discord.Client();

// Here all the different servers that the bot serves are stored by their guild.id.
// Besides guild.id each server's queueContruct is stored here.
const queue = new Map();

client.once('ready', () => {
	logger.info(`UP AND RUNNING! VERSION: ${version}`);
	client.user.setActivity('plebs crying for -help', {
    type: 'WATCHING'
  });
});
client.once('reconnecting', () => {
	logger.info(`RECONNECTING!`);
});
client.once('disconnect', () => {
	logger.info(`DISCONNECT!`);
});

client.on('message', async message => {
	// If the message that you read is from a bot then do nothing.
	if(message.author.bot) return;
	// If the message does not start with the prefix then do nothing.
	if(!message.content.startsWith(prefix)) return;
	// Try to access server's queue by it's guild.id.
	// If it does not exist serverQueue is null.
	const serverQueue = queue.get(message.guild.id);
	// Check which command the user typed.
	if(message.content.toLowerCase().startsWith(`${prefix}ping`)) {
		ping(message);
		return;
	} else if (message.content.toLowerCase().startsWith(`${prefix}play`) || message.content.toLowerCase().startsWith(`${prefix}p`)) {
		execute(message, serverQueue);
		return;
	} else if(message.content.toLowerCase().startsWith(`${prefix}next`) || message.content.toLowerCase().startsWith(`${prefix}n`)) {
		skip(message, serverQueue);
		return;
	} else if(message.content.toLowerCase().startsWith(`${prefix}stop`) || message.content.toLowerCase().startsWith(`${prefix}s`)) {
		stop(message, serverQueue);
		return;
	} else if(message.content.toLowerCase().startsWith(`${prefix}help`) || message.content.toLowerCase().startsWith(`${prefix}h`)) {
		help(message);
		return;
	} else if(message.content.toLowerCase().startsWith(`${prefix}queue`)) {
		showQueue(message, serverQueue);
		return;
	} else if(message.content.toLowerCase().startsWith(`${prefix}remove`)) {
		remove(message, serverQueue);
		return;
	} else if(message.content.toLowerCase().startsWith(`${prefix}qq`)) {
		resetBot(message, serverQueue);
		return;
	} else {
		return;
	}
});

// Function that executes the play command.
async function execute(message, serverQueue) {
	const args = message.content.split(' ');
	const info = await ytdl.getInfo(args[1]);
	console.log(info);
	if(args.length === 1) return sendEmbed(message, {'emoji': '👿', 'description': 'I need you to tell me what to play BABOON! 🤮', 'color': orange});
	const voiceChannel = message.member.voice.channel;
	// Check if the user is in a voice channel.
	if(!voiceChannel) {
		return sendEmbed(message, {'emoji': '🤦‍♂️', 'description': 'You must be in a voice channel PLEB! 😵', 'color': orange});
	}
	const permissions = voiceChannel.permissionsFor(message.client.user);
	// Check the bots permissions in the voice channel.
	if(!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
		return sendEmbed(message, {'emoji': '🗝️', 'description': 'Gimme permissions to join and speak, BABOON.', 'color': red});
	}
	// Check if the args[1] is a valid youtube url link.
	if(ytdl.validateURL(args[1])) {
		// Check if the url provided is a playlist. REMEMBER TO.
		const isPlaylist = false;
		if(isPlaylist){
			return;
		} else {
			// The user inserted a valid youtube url which is not a playlist.
			// Play the song or add it to the queue.
			const songInfo = await ytdl.getInfo(args[1]);
			const song = {
				authorId: message.author.id,
				title: songInfo.title,
				url: songInfo.video_url
			};
			// Check if a server's queue already exists.
			// If not set it up from scratch.
			if(!serverQueue) {
				const queueContract = {
					textChannel: message.channel,
					voiceChannel: voiceChannel,
					connection: null,
					songs: [],
					volume: 5,
					playing: true
				};
				queue.set(message.guild.id, queueContract);
				queueContract.songs.push(song);

				try {
					const connection = await voiceChannel.join();
					queueContract.connection = connection;
					play(message, queueContract.songs[0]);
				} catch(error) {
					logger.info(`ERR - TRYING TO PLAY A SONG!`);
					queue.delete(message.guild.id);
					return sendEmbed(message, {'emoji': '🥺', 'description': `Sad, but I can't come to you ma baby! 🚲`, 'color': red});
				}
			} else {
				// There is already a queue contract.
				serverQueue.songs.push(song);
				return sendEmbed(message, {'emoji': '🎸', 'description': `Queued [${song.title}](${song.url}) by <@${song.authorId}>`, 'color': yellow});
			}
		}
	} else {
		// The user input is a youtube search. Do the search and play the link.
		let dataString = '';
		for(let i = 1; i < args.length; i++) {
			dataString = dataString + ' ' + args[i];
		}
		const searchString = dataString.substr(1);
		// Play the song or add it to the queue.
		let song = {
      authorId: '',
			title: '',
			url: ''
		}
		try {
			const songInfo = await yts(searchString);
			song = {
        authorId: message.author.id,
				title: songInfo.videos[0].title,
				url: songInfo.videos[0].url
			};
		} catch (error) {
			logger.info(`ERR TRYING TO SEARCH YOUTUBE -${error}`);
			return sendEmbed(message, {'emoji': '☹️', 'description': `Fook my life I couldn't find your song. Try again! 🙃`, 'color': red});
		}
		// Check if a server's queue already exists.
		// If not set it up from scratch.
		if(!serverQueue) {
			const queueContract = {
				textChannel: message.channel,
				voiceChannel: voiceChannel,
				connection: null,
				songs: [],
				volume: 5,
				playing: true
			};
			queue.set(message.guild.id, queueContract);
			queueContract.songs.push(song);

			try {
				const connection = await voiceChannel.join();
				queueContract.connection = connection;
				play(message, queueContract.songs[0]);
			} catch(error) {
				logger.info(`ERR - TRYING TO PLAY A SONG!`);
				console.error();
				queue.delete(message.guild.id);
				return sendEmbed(message, {'title': 'Some really serious shit happened. 🤢', 'description': error, 'color': red});
			}
		} else {
			// There is already a queue contract.
			serverQueue.songs.push(song);
			return sendEmbed(message, {'emoji': '🎸', 'description': `Queued [${song.title}](${song.url}) by <@${song.authorId}>`, 'color': yellow});
		}
	}
}

function remove (message, serverQueue) {
	if(!message.member.voice.channel) {
		return sendEmbed(message, {'emoji': '🤦‍♂️', 'description': 'You must be in a voice channel PLEB! 😵', 'color': orange});
	}
	if(!serverQueue) {
		return sendEmbed(message, {'emoji': '🤦‍♂️', 'description': 'No songs in the queue, milady. 🤪', 'color': orange});
	}
	if(serverQueue.songs.length === 1) {
		return sendEmbed(message, {'emoji': '🤦‍♂️', 'description': 'No songs in the queue, milady. 🤪', 'color': orange}); 
	}
	try {
		const removeArgs = message.content.split(' ');
		if(!removeArgs[1]) {
			sendEmbed(message, {'emoji': '👍', 'description': `[${serverQueue.songs[serverQueue.songs.length - 1].title}](${serverQueue.songs[serverQueue.songs.length - 1].url}) removed!`, 'color': orange});
			serverQueue.songs.splice(serverQueue.songs.length - 1, 1);
			return;
		} 
		if(removeArgs.length > 2) {
			return sendEmbed(message, {'emoji': '🤦‍♂️', 'description': 'Go home you are drunk. 🤪', 'color': orange});
		}
		if(serverQueue.songs[removeArgs[1]]) {
			sendEmbed(message, {'emoji': '👍', 'description': `[${serverQueue.songs[removeArgs[1]].title}](${serverQueue.songs[removeArgs[1]].url}) removed!`, 'color': orange});
			serverQueue.songs.splice(removeArgs[1], 1);
			return;
		} else {
			return sendEmbed(message, {'emoji': '🤦‍♂️', 'description': 'Go home you are drunk. 🤪', 'color': orange});
		}
	} catch(error) {
		logger.info(`ERROR ON REMOVE FUNCTION - ${error}`);
	}
}

function showQueue(message, serverQueue) {
	if(!message.member.voice.channel) {
		return sendEmbed(message, {'emoji': '🤦‍♂️', 'description': 'You must be in a voice channel PLEB! 😵', 'color': orange});
	}
	if(!serverQueue) {
		return sendEmbed(message, {'emoji': '🤦‍♂️', 'description': 'No songs in the queue, milady. 🤪', 'color': orange});
	}
	if(serverQueue.songs.length === 1) {
		return sendEmbed(message, {'emoji': '🤦‍♂️', 'description': 'No songs in the queue, milady. 🤪', 'color': orange}); 
	}
	let numberOfEmbeds = Math.floor((serverQueue.songs.length - 1) / 25) + 1;
	for(let i = 0; i < numberOfEmbeds; i++) {
		let queueEmbed = new Discord.MessageEmbed();
		queueEmbed.setTitle('Playlist');
		for(let j = i * 25 + 1; (j < serverQueue.songs.length) && (j <= (i + 1) * 25) ; j++) {
			queueEmbed.addField(`#${j}`, `[${serverQueue.songs[j].title}](${serverQueue.songs[j].url}) by <@${serverQueue.songs[j].authorId}>`, false);
		}
		if(queueEmbed.fields.length !== 0) {
			message.channel.send(queueEmbed).then(message => {
				message.delete({timeout: 30000})
			}).catch(error => {
				logger.info(`ERROR ON SHOWQUEUE FUNCTION - ${error}`)
			});
		}
	}
	return;
}

function fuckThisShit(message, serverQueue) {
	try {
		serverQueue.songs = [];
	} catch (error) {
		logger.info(`ERROR ON FUCKTHISSHIT FUNCTION - ${error}`);
	}
}

function skip(message, serverQueue) {
	if(!message.member.voice.channel) {
		return sendEmbed(message, {'emoji': '🤦‍♂️', 'description': 'You must be in a voice channel PLEB! 😵', 'color': orange});
	}
	if(!serverQueue || serverQueue.songs.length < 2) {
		return sendEmbed(message, {'emoji': '🤦‍♂️', 'description': 'No more songs to play, milady. 🤪', 'color': orange});
	}
	if(!serverQueue.connection || !serverQueue.connection.dispatcher) {
		fuckThisShit(message, serverQueue);
		return sendEmbed(message, {'emoji': '🔥', 'description': `Fuck this shit I'm out! 🖕`, 'color': red});
	}
	serverQueue.connection.dispatcher.end();
	sendEmbed(message, {'emoji': '🤙', 'description': 'Playing next song.', 'color': brown});
}

function stop(message, serverQueue) {
	if(!message.member.voice.channel) {
		return sendEmbed(message, {'emoji': '🤦‍♂️', 'description': 'You must be in a voice channel PLEB! 😵', 'color': orange});
	}
	if(!serverQueue || serverQueue.songs.length === 0) {
		return sendEmbed(message, {'emoji': '🤦‍♂️', 'description': 'No songs to be stopped, Sir. 🚬', 'color': orange});
	}
	if(!serverQueue.connection || !serverQueue.connection.dispatcher) {
		fuckThisShit(message, serverQueue);
		return sendEmbed(message, {'emoji': '🔥', 'description': `Fuck this shit I'm out! 🖕`, 'color': red});
	}
	try {
		serverQueue.songs = [];
		serverQueue.connection.dispatcher.end();
		sendEmbed(message, {'emoji': '🤐', 'description': `Was I a good boy? 😈`, 'color': red});
	} catch(error) {
		logger.info(`ERROR ON STOP FUNCTION - ${error}`);
		return sendEmbed(message, {'emoji': '🤦‍♂️', 'description': 'No songs to be stopped, Sir. 🚬', 'color': orange});
	}
}

function play(message, song) {
	const serverQueue = queue.get(message.guild.id);
	if(!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(message.guild.id);
		return;
	}
	const dispatcher = serverQueue.connection
		.play(ytdl(song.url, {filter: 'audioonly', highWaterMark: 1<<25}))
		.on('finish', () => {
			// console.log("Dispatcher finish activated");
			serverQueue.songs.shift();
			play(message, serverQueue.songs[0]);
		})
		.on('error', error => {
			logger.info(`ERROR ON DISPATCHER - ${error}`);

		});
	if(dispatcher) message.channel.send({embed: {title: `Now playing`, description: `[${song.title}](${song.url}) by <@${song.authorId}>`, color: green}});
}

function ping(message) {
	return sendEmbed(message, {'emoji': '🏓', 'description': `Pong 🏆`, 'color': liteBlue});
}

function help(message) {
	return sendEmbed(message, {
		'emoji': '🤓',
		'author': {'name': 'JunkieMusic', 'url': 'https://github.com/junkiedan/', 'iconURL': 'https://scontent.fath4-2.fna.fbcdn.net/v/t1.15752-9/89906094_3137648086254193_62368182177890304_n.jpg?_nc_cat=103&_nc_sid=b96e70&_nc_ohc=IZfllTS1WQQAX94E9y0&_nc_ht=scontent.fath4-2.fna&oh=05f86d68adc8032f0c9d016d22e13365&oe=5EA372DC'},
		'title': `JunkieMusic created by JunkieDan`,
		'field1': {'name': `Available commands`, 'value': `\t**${prefix}play** *"link"* or *"youtube search"* to play a song\n\t**${prefix}next** to skip the currently playing song\n\t**${prefix}stop** to stop the music\nYou can use **${prefix}p**, **${prefix}n**, **${prefix}s** for the same functions *respectively*.`},
		'footer': {'text': `version: ${version}`},
		'color': purple
	});
}

function sendEmbed(message, opts) {
	let messageEmbed = new Discord.MessageEmbed();

	if(opts['emoji']) message.react(opts['emoji']);
	if(opts['author']) messageEmbed.setAuthor(opts['author'].name, opts['author'].iconURL, opts['author'].url);
	if(opts['color']) messageEmbed.setColor(opts['color']);
	if(opts['description']) messageEmbed.setDescription(opts['description']);
	if(opts['footer']) messageEmbed.setFooter(opts['footer'].text, opts['footer'].iconURL);
	if(opts['image']) messageEmbed.setImage(opts['image']);
	if(opts['thumbnail']) messageEmbed.setThumbnail(opts['thumbnail']);
	if(opts['title']) messageEmbed.setTitle(opts['title']);
	if(opts['url']) messageEmbed.setURL(opts['url']);
	if(opts['field1']) messageEmbed.addField(opts['field1'].name, opts['field1'].value, true);
	if(opts['field2']) messageEmbed.addField(opts['field2'].name, opts['field2'].value, true);
	if(opts['field3']) messageEmbed.addField(opts['field3'].name, opts['field3'].value, true);
	if(opts['field4']) messageEmbed.addField(opts['field4'].name, opts['field4'].value, true);
	if(opts['field5']) messageEmbed.addField(opts['field5'].name, opts['field5'].value, true);
	return message.channel.send(messageEmbed).then(message => {
		message.delete({timeout: 60000})
	}).catch(error => {
		logger.info(`ERROR ON SENDEMBED FUNCTION - ${error}`)
	});
}

async function resetBot(message, serverQueue) {
	let isAdmin = false;
	admins.forEach(admin => {
		if(admin === message.member.id) isAdmin = true;
	});
	if(!isAdmin) return sendEmbed(message, {'emoji': '⛔', 'description': `THIS IS NOT FOR PLEBS!`, 'color': red});
	sendEmbed(message, {'emoji': '⚠️', 'description': 'Resetting...', 'color': red});
	try {
		client.destroy();
		if(serverQueue) {
			serverQueue.songs = [];
			if(serverQueue.connection && serverQueue.connection.dispatcher) {
				serverQueue.connection.dispatcher.end();
				serverQueue.connection.disconnect();
			}
		}
		await client.login(token);
	} catch(error) {
		logger.info(`ERROR ON RESETTING - ${error}`);
	}
}

client.login(token);
