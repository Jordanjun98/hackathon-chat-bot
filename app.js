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
      'Courses|Profile', { listStyle: 3 });
  },
  (session, results) => {
    if (results.response.entity.toLowerCase() == 'courses') {
      session.beginDialog('course');
    } else if (results.response.entity.toLowerCase() == 'profile') {
      session.beginDialog('profile');
    } else {
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
      return `${course.name} (${course.lessons.indexOf(lesson) + 1} of ${course.lessons.length})`;
    });
    builder.Prompts.choice(session, 'Which course would you like to view?',
      [].concat(courses, ['All courses']), { listStyle: 3 });
  },
  (session, result) => {
    let user = data.users.find(user => user.id === session.message.user.id);
    let course = data.courses.find(course => result.response.entity.indexOf(course.name) !== -1);
    if (course) {
      let lesson = course.lessons.find(lesson =>
        lesson.name === user.courses.ongoing.find(ongoing => course.name === ongoing.courseName).currentLesson)
          || course.lessons[0];
      session.beginDialog('lesson', [course, lesson]);
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
  }
]).triggerAction({
  matches: /^course$/gi
});

bot.dialog('lesson', [
  (session, [course, lesson]) => {
    var msg = new builder.Message(session);
    msg.attachmentLayout(builder.AttachmentLayout.carousel);
    msg.attachments(lesson.resources.map(resource => {
      if (resource.type === 'video') {
        return new builder.VideoCard(session)
          .title(resource.name)
          .media([builder.CardMedia.create(session, resource.url)]);
      }
    }));
    session.send(msg);
    session.endDialog();
    let quiz = lesson.resources.find(resource => resource.type === 'quiz');
    let user = data.users.find(user => user.id === session.message.user.id);
    user.courses.ongoing.find(ongoing => ongoing.courseName === course.name).currentLesson = lesson.name;
    fs.writeFileSync('data.json', JSON.stringify(data));
    if (quiz) {
      session.beginDialog('quiz', quiz);
    }
  },
  (session, result, next) => { // handle quiz
    if (result) {
      console.log(result);
      console.log(next);
    } else {
      session.endDialog();
    }
  }
]);

bot.dialog('quiz', [
  (session, quiz) => {
    builder.Prompts.choice(session, quiz.name, quiz.choices, { listStyle: 3 });
  },
  (session, result) => {
    session.send('Correct!');
    console.log(result);
    // if (result.response.entity == 'z:10 , y:6') {
    //   session.send('Correct!');
    // } else {
    //   session.send('Opps, please try again.');
    // }
  }
]);

bot.dialog('help', session => {
  session.send('* Help Notes\n\nEnter \'menu\' to return to main menu.');
}).triggerAction({
  matches: /^!?help/
});

bot.dialog('profile', session => {
  let user = data.users.find(user => user.id === session.message.user.id);
  session.send('User "' + user.name + '" (' + user.id + ')\n\nOngoing courses: '
             + user.courses.ongoing.map(course => course.courseName).join(', '));
});
