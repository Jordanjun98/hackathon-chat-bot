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
      session.send('Hello! I am Couch-K!');
      break;
    default:
      session.beginDialog('userChoice');
    }
  }
});

// Read existing datasets
let data;
fs.readFile('data.json', 'utf8', (err, data) => {
  if (err) throw err;
  data = JSON.parse(data);

  // Get kklee progreess on courses
  let user = data.users.find(user => user.name === 'kklee');
  let ongoingCourses = user.courses.ongoing.map(ongoing => {
    let course = data.courses.find(course => course.name === ongoing.courseName);
    let lesson = course.lessons.find(lesson => lesson.name === ongoing.currentLesson);
    return {
      courseName: course.name,
      lessonName: lesson.name,
      progress: `${course.lessons.indexOf(lesson) + 1} of ${course.lessons.length}`
    };
  });
  console.log(ongoingCourses);
});

// Prompt the choices for the user
bot.dialog('userChoice', [
  function (session) {
    builder.Prompts.choice(session, 'How can I help you?', 'Continue where you left off|Courses|My Profile', { listStyle: 3 });
  },
  function (session, results) {
    console.log(results);
    if (results.response.entity === 'Courses') {
      session.beginDialog('Courses');
    } else {
      session.send('OK');
    }
  }
]);

bot.dialog('Courses', [
  function (session) {
    builder.Prompts.choice(session, 'How can I help you?', 'Introduction to Python|Java(To be completed)|More Coming Soon', { listStyle: 3 });
  },
  function(session, result){
    console.log(result);
    //switch (result){
    if (result.response.entity === 'Introduction to Python'){
      session.beginDialog('samplevideo');
    }//	break;
    //default:
    //session.send('Opps, the rest of the courses are under developing xD!');
    //}
  }
]);

bot.dialog('Python1', function (session) {
  var msg = new builder.Message(session);
  msg.attachmentLayout(builder.AttachmentLayout.carousel);
  msg.attachments([
    new builder.VideoCard(session)
      .title('Variable')
      .media([builder.CardMedia.create(session,'https://d3c33hcgiwev3.cloudfront.net/1variables.c86b5453a6afdd5995498484b6f5469a/full/540p/index.mp4?Expires=1513036800&Signature=k4-S1AlgrHX53k4v-G6zgRxBAg26fJDLbfT1R3ukOGP4KPxVOImBM1FWf~uQIcCe3p2kyp5ka9KeP7lLX3sxZz0WzTmfnRX4bntzGw6jj-arnDMTGweynI-gsdububAO9-3iSf44ggzIDPuFgFwCBiXlpSgM87TMh8FPbmjIvR0_&Key-Pair-Id=APKAJLTNE6QMUY6HBC5A')])
  ]);
  session.send(msg).endDialog();
});
