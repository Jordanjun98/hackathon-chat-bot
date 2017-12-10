const restify = require('restify');
const builder = require('botbuilder');
const fs = require('fs');

// Setup restify server
const server = restify.createServer();
server.listen(process.env.PORT || 3978, () =>
  console.log('%s listening to %s', server.name, server.url));

// Volatile in-memory store for prototyping
const inMemoryStorage = new builder.MemoryBotStorage();

// Create bot and bind to console
const connector = new builder.ChatConnector({
  appId: '8dcf5b02-e2d4-41bf-9cf0-e46532522b5f',
  appPassword: 'cseWOVSU598)++:kuqaZM89'
});
const bot = new builder.UniversalBot(connector).set('storage', inMemoryStorage);


// Listen for messages from user
server.post('/api/messages', connector.listen());

// Read existing datasets
let data = JSON.parse(fs.readFileSync('data.json'));

// Process bot components
bot.dialog('/', session => {
  console.log(session.message.user);
  if (session.message.type !== 'message') {
    session.send('Message type not supported');
  } else {
    let msg = session.message.text;
    switch (msg) {
    case (msg.match(/hi/i) || {}).input:
      session.send('Hello! I am Couch-K!\n\nKindly enter \' help\' whenever you need any assistance :)');
      break;
    case (msg.match(/courses/i) || {}).input:
      session.beginDialog('course');
      break;
    default:
      session.beginDialog('menu');
    }
  }
});

bot.dialog('menu', [
  function (session) {
    session.send('How can I help you?');
	//builder.Prompts.choice(session, 'How can I help you?', 'Continue where you left off|Courses|My Profile', { listStyle: 3 });
  },
  function (session, results) {
	endDialogWithResult(results);
    if (results.response.entity === 'Courses') {
      session.beginDialog('course');
    } else {
      session.send('OK');
    }
  }
])
.triggerAction({
    matches: /^menu$/gi
});

bot.dialog('course', [
  function (session) {
    let user = data.users.find(user => user.id === session.message.user.id);
    let courses = user.courses.ongoing.map(ongoing => {
      let course = data.courses.find(course => course.name === ongoing.courseName);
      let lesson = course.lessons.find(lesson => lesson.name === ongoing.currentLesson)
        || { name: '' };
      return {
        courseName: course.name,
        lessonName: lesson.name,
        progress: `${course.lessons.indexOf(lesson) + 1} of ${course.lessons.length}`
      };
    });
    builder.Prompts.choice(session, 'Who do you like?',
      [].concat(courses.map(course => course.courseName), 'All courses'), { listStyle: 3 });
  },
  function (session, result) {
    let user = data.users.find(user => user.id === session.message.user.id);
    let course = data.courses.find(course => course.name === result.response.entity);
    if (course) {
      let lesson = course.lessons.find(lesson =>
        lesson.name === user.courses.ongoing.find(ongoing => course.name === ongoing.courseName).currentLesson)
        || course.lessons[0];
      session.beginDialog('lesson', lesson);
    } else {
      let courses = data.courses.map(course => `${course.name} ${user.courses.ongoing.find(ongoing => course.name === ongoing.courseName) ? '(check)' : '(enroll)'}`);
      console.log(courses);
      //session.send('What is "' + result.response.entity + '"? Can I eat it?');
      //session.beginDialog('catalog');
	  if (courses) {
		  var msg = new builder.Message(session);
		  let current = user.courses.ongoing.entity;
		  msg.attachmentLayout(builder.AttachmentLayout.carousel);
			msg.attachments([
				new builder.ThumbnailCard(session)
				  .title(user.courses.ongoing.courseName)
				  .images([builder.CardMedia.create(session, 'https://upload.wikimedia.org/wikipedia/commons/c/cf/Angular_full_color_logo.svg')])
				  .button('Status')
			]);
		  session.send(msg).endDialog();
	  }
    }
  }
]);

bot.dialog('catalog',function (session) {
	var msg = new builder.Message(session);
	let user = data.users.find(user => user.id === session.message.user.id);
    let course = user.courses.ongoing.find(ongoing => course.name === ongoing.courseName)
	if (course) {
		let lesson = course.lessons.find(lesson =>
        lesson.name === user.courses.ongoing.find(ongoing => course.name === ongoing.courseName).currentLesson)
        || course.lessons[0];
		msg.attachmentLayout(builder.AttachmentLayout.carousel);
		msg.attachments([
			new builder.ThumbnailCard(session)
			  .title(lesson)
			  .images([builder.CardMedia.create(session, lesson.thumbnail)])
			  .button('Status')
		]);
		session.send(msg).endDialog();
	}
});

bot.dialog('lesson', function (session, lesson) {
  var msg = new builder.Message(session);
  msg.attachmentLayout(builder.AttachmentLayout.carousel);
  msg.attachments([
    new builder.VideoCard(session)
      .title(lesson.name)
      .media([builder.CardMedia.create(session, lesson.resources.find(resource => resource.type === 'video').url)])
  ]);
  session.send('Let\'s begin on where you left...');
  session.send(msg).endDialog();
  session.beginDialog('quiz');
});

bot.customAction({
    matches: /help/gi,
    onSelectAction: (session, args, next) => {
        session.send('* Help Notes\n\nEnter \'menu\' to return to main menu.');
	}
})