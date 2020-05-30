var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var _ = require('lodash');
var config = require('./_config');



var app = express();


var customPort = 80;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.set('port', process.env.PORT || customPort);


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;


//Load modules for the websocket system and DB
const server         = require('http').Server(app);
const io             = require('socket.io')(server);
const MongoClient    = require('mongodb').MongoClient;


//Load the controllers
const Questions = require('./controllers/Questions.js');
const Tables    = require('./controllers/Tables.js');
const Game      = require('./controllers/Game.js');
const Players   = require('./controllers/players.js');


io.set('origins', '*:*');


server.listen(1337);
// WARNING: app.listen(80) will NOT work here!

console.log('Settings origins to all')

MongoClient.connect(config.mongoDatabaseString, { useUnifiedTopology: true }, function(err, db) {
  if (err) throw err;
  const dbo = db.db("db");

  let tables          = new Tables;
  let game            = new Game;
  let players         = new Players;
  let currentQuestion = {};


  io.on('connection', (socket) => {

    console.log('A new user connected');

    //Add a user to the game
    socket.on('join-game', function(gameJoinData) {


    /* --- START AND LEAVE GAME SOCKETS --- */
      dbo.collection("games").findOne({game_id: gameJoinData.roomId}, function(err, result) {
        if (err) throw err;
        if(result !== null) {
          game.addDBData(result);

          console.log('Game found!')
          if(tables.tableIdExists(gameJoinData.tableId)) {
            console.log('User is joining Game ID '+game.game_id);
            socket.join(game.socket_id);

            var errors = players.validateNewPlayer(gameJoinData, game);
            if(errors) {
              socket.emit('login-errors', errors);
            } else {

              socket.player = players.createNewPlayer(gameJoinData, socket.id, game);
              if(socket.player.isAdmin) {
                game.adminSocketID = socket.id;
                dbo.collection("games").updateOne(
                  { "id" : game.id },
                  { $set: { "adminSocketId" : socket.id } }
                ).catch(error => socket.emit('general-errors', "DB ERROR: " + error));
              }

              tableIndex = tables.data.findIndex(x => x.id === gameJoinData.tableId);
              tables.data[tableIndex].players.push(socket.player.uuid);
              socket.emit('success', 'You haver successfully joined the \''+game.name+'\' game!');
              socket.emit('user-uuid', socket.player.uuid);
              socket.emit('user-admin', socket.player.isAdmin);
              socket.to(game.socket_id).emit('chat-notifications', socket.player.name+" has joined the chat.");
              
              //Send the new player to players who have already joined.
              socket.to(game.socket_id).emit('add-player', socket.player);
              
              //Send the new player all the players who have already joined.
              console.log('---Current players---')
              //players.data.forEach(function (player) {
              console.log(players.data.length);
              console.log(players.data);

              _.map(players.data, function(player, key) {
                if(player.socket_id !== socket.id) {
                  socket.emit('add-player', player);
                }
              });
            }
          } else {
            socket.emit('login-errors', 'We could not find that table');
          }
        } else {
          socket.emit('login-errors', 'We could not find that Room, please try again!');
        }
      });
    });


    socket.on('start-game', function(startGame) {
      var errors = "";
      if(!startGame)             { errors += "Start game variable not detected!"; }
      if(!game.id)               { errors += "We could not find the game that should be starting"; }
      if(!socket.player.isAdmin) { errors += "You are not an admin player.\h"; }
      if(errors) { socket.emit('general-errors', errors); }

      dbo.collection("games").updateOne(
        { "id" : game.id },
        { $set: { "game_started" : 1 } }
      ).catch(error => socket.emit('general-errors', "DB ERROR: " + error));

      socket.questions = new Questions(game.questions);

      currentQuestion = socket.questions.loadNextQuestion();
      socket.to(game.socket_id).emit('load-question', currentQuestion);
      socket.emit('load-question', currentQuestion);

      //Start the game
      socket.emit('game-started', true);
      socket.to(game.socket_id).emit('game-started', true);

    });


    socket.on('disconnect', () => {
      if(socket.player) {
        players.removePlayer(socket.player);
        socket.to(game.socket_id).emit('chat-notifications', socket.player.name+" has left the chat.");
        socket.to(game.socket_id).emit('remove-player', socket.player.uuid);
      }
      console.log('user disconnected');
    });

    socket.on('chat-message', (msg) => {
      console.log("Chat message submitted... passing back!");
      if(typeof game.game_id !== 'undefined' && game.game_id) {
        console.log('Game found... emitting message');
        var message  = _.clone(socket.player);
        message.text = msg;
        socket.to(game.socket_id).emit('chat-message', message);
      } else {
        console.log('Game not found! Skipping message')
      }
    });


    /* --- QUIZ SOCKETS --- */
    socket.on('submit-answer', (answerForMarking) => {
      console.log('Answer received for marking... passing to the admin.');
      var errors = "";
      if(answerForMarking.answerId !== currentQuestion.id) { errors += "We're not marking that question anymore. :-(\n"; }
      if(!answerForMarking.answerText)                     { errors += "You must enter an answer for marking!\n"; }
      if(errors) { socket.emit('general-errors', errors); }
      else {
        console.log(game.adminSocketID);
        console.log(answerForMarking);
        io.to(game.adminSocketID).emit('answer-for-marking',answerForMarking);
      }
    });


    socket.on('mark-answer', (markedAnswer) => {
      console.log('Admin has marked answer... passing back to user.');
      
      //Carry out basic validation
      var errors = "";
      if(typeof markedAnswer.questionId == 'undefined')                                  { errors += "No question ID was sent.\n"; }
      else if(typeof socket.questions.questions[markedAnswer.questionId] == 'undefined') { errors += "Could not find that question.\n"; }
      if(typeof markedAnswer.playerUUID == 'undefined')                                  { errors += "No player ID was sent.\n"; }
      else if(typeof players.data[markedAnswer.playerUUID] == 'undefined')               { errors += "Could not find that player.\n"; }
      if(typeof markedAnswer.answerCorrect == 'undefined')                               { errors += "Answer correct value not sent.\n"; }
      if(!socket.player.isAdmin)                                                         { errors += "You are not an admin player.\h"; }

      //If the validation passes, update the players score and sent them a confirmation message.
      if(errors) { socket.emit('general-errors', errors); }
      else {
        var updatedPlayer = players.givePlayerPoint(markedAnswer.playerUUID, markedAnswer.answerCorrect);
        var question      = _.clone(socket.questions.questions[markedAnswer.questionId]);
        if(typeof updatedPlayer.score !== 'undefined') {
          socket.emit('updated-player-score', updatedPlayer.score, updatedPlayer.uuid);
          socket.to(game.socket_id).emit('updated-player-score', updatedPlayer.score, updatedPlayer.uuid);
          if( typeof updatedPlayer.socket_id !== 'undefined') {
            if(markedAnswer.answerCorrect) {
              io.to(updatedPlayer.socket_id).emit('success', `You got '${question.question}' correct.\n`);
            } else {
              io.to(updatedPlayer.socket_id).emit('general-errors', `You got '${question.question}' wrong :*******(.\n`);
            }
            io.to(updatedPlayer.socket_id).emit('question-marked', question.id);

          }
        }
      }
    });


    socket.on('load-next-question', (nextQuestion) => {
      var errors = "";
      if(!nextQuestion)          { errors += "You don't want to load the next question.\n"; }
      if(!socket.player.isAdmin) { errors += "You are not an admin player.\h"; }
      if(errors)                 { socket.emit('general-errors', errors); }
      else {
        if(socket.questions.noMoreQuestions) {
          socket.to(game.socket_id).emit('game-complete', true);
          socket.emit('game-complete', true);
        } else {
          currentQuestion = socket.questions.loadNextQuestion();
          socket.to(game.socket_id).emit('load-question', currentQuestion);
          socket.emit('load-question', currentQuestion);
        }
      }
    });


  });


});