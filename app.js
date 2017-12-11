const restify = require('restify');
const builder = require('botbuilder');
const fs = require('fs');

// Setup restify server
const server = restify.createServer();
server.listen(process.env.PORT || 3978, () =>
  console.log('%s listening to %s', server.name, server.url));

// Volatile in-memory store for prototyping
const inMemoryStorage = new builder.MemoryBotStorage();

// Create bot and bind to chat
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
    case (msg.match(/courses/i) || {}).input:
      session.beginDialog('course');
      break;
    case (msg.match(/hi/i) || {}).input:
      session.send('Hello! I am Couch-K!\n\nKindly enter \' help\' whenever you need any assistance '
                   + String.fromCharCode(0xD83D, 0xDE01));
      /* fall through */
    default:
      session.beginDialog('menu');
    }
  }
});

bot.dialog('menu', [
  session => {
    builder.Prompts.choice(session, 'How can I help you?',
      'Courses|Profile|Quiz', { listStyle: 3 });
  },
  (session, results) => {
    if (results.response.entity.toLowerCase() == 'courses') {
      session.beginDialog('course');
    }else if (results.response.entity.toLowerCase() == 'quiz') {
	  session.beginDialog('quiz');
	}else {
      session.send('Other functions are still under development :)');
    }
  }
])
  .triggerAction({
    matches: /^menu$/gi
  });

bot.dialog('course', [
  session => {
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
    builder.Prompts.choice(session, 'Which course would you like to view?',
      [].concat(courses.map(course => course.courseName), 'All courses'), { listStyle: 3 });
  },
  (session, result) => {
    let user = data.users.find(user => user.id === session.message.user.id);
    let course = data.courses.find(course => course.name === result.response.entity);
    if (course) {
      let lesson = course.lessons.find(lesson =>
        lesson.name === user.courses.ongoing.find(ongoing => course.name === ongoing.courseName).currentLesson)
          || course.lessons[0];
      session.beginDialog('lesson', lesson);
    } else {
      let msg = new builder.Message(session);
      msg.attachmentLayout(builder.AttachmentLayout.carousel);
      msg.attachments(data.courses.map(course =>
        new builder.HeroCard(session)
          .title(course.name)
          .subtitle(user.courses.ongoing.find(ongoing => course.name === ongoing.courseName)
            ? 'check' : 'enroll')
          .images([new builder.CardImage.create(session).url(course.thumbnail)])
      ));
      session.send(msg);
    }
  },
  (session, result) => {
    session.beginDialog('lesson', data.courses.map(course => course.name === result.response.entity));
  }
]).triggerAction({
  matches: /^course$/gi
});

bot.dialog('lesson', [
  (session, lesson) => {
    var msg = new builder.Message(session);
    msg.attachmentLayout(builder.AttachmentLayout.carousel);
    msg.attachments(lesson.resources.map(resource => {
      if (resource.type === 'video') {
        return new builder.VideoCard(session)
          .title(resource.name)
          .media([builder.CardMedia.create(session, resource.url)]);
      }
    }));
    session.send('Let\'s begin on where you left...\n\nType "next" to go to the next lesson.');
    session.send(msg);
  },
  (session, result, next) => { // handle quiz
    if (result) {
      console.log(result);
      console.log(next);
    }
  }
]);

bot.dialog('quiz', [
  (session) => {
    builder.Prompts.choice(session, 'Consider this code:\n\nz = 5\n\ny = z + 1\n\nz = 10\n\nAfter these statemets execute, which of the following describes the values of x and y point to?',
      'z:5 , y:6|z:10 , y:6|z:10 , y:11|z and y point to memory address',{listStyle:3});
  },	
  (session, result) => {
    if (result.response.entity == 'z:10 , y:6') {
      session.send('Correct!');
    } else {
      session.send('Opps, please try again.');
    }
  }
]);

bot.dialog('help', session => {
  session.send('* Help Notes\n\nEnter \'menu\' to return to main menu.');
}).triggerAction({
  matches: /^!?help/
});
