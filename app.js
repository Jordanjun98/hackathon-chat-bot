const restify = require('restify');
const builder = require('botbuilder');

// Setup restify server
const server = restify.createServer();
server.listen(process.env.PORT || 3978, () =>
  console.log('%s listening to %s', server.name, server.url));

// Volatile in-memory store for prototyping
const inMemoryStorage = new builder.MemoryBotStorage();

// Create bot and bind to console
const connector = new builder.ChatConnector({
  appId: '',
  appPassword: ''
});
const bot = new builder.UniversalBot(connector).set('storage', inMemoryStorage);

// Listen for messages from user
server.post('/api/messages', connector.listen());

// Process bot components
bot.dialog('/', session => {
  if (session.message.type !== 'message') {
    session.send('Message type not supported');
  } else {
    let msg = session.message.text;
    switch (msg) {
    case (msg.match(/hi/i) || {}).input:
      session.send('Hello!');
      break;
    default:
			session.beginDialog('color');
    }
  }
});

bot.dialog('color', [
	function (session) {
		builder.Prompts.choice(session, "Which color do you prefer?", "red|blue|green", { listStyle: 3 })
	},
	function (session, results) {
		if (results) {
			console.log(results);
		} else {
			session.send('OK');
		}
	}
]);
