// #1: import full build in JavaScript file
import Vue from 'vue/dist/vue.js';

import io from 'socket.io-client';


const socket        = io();
const DEBUG         = true;
var _               = require('lodash');
const confetti      = require('canvas-confetti');
var myCanvas        = document.getElementById('confetti-cannon');
var victoryConfetti = confetti.create(myCanvas, {
  resize: true,
  useWorker: true
});

let answerCorrectNoise   = new Audio('/audio/answer-correct.mp3');
let answerReceivedNoise  = new Audio('/audio/answer-received.mp3');
let answerSubmittedNoise = new Audio('/audio/answer-submitted.mp3');
let answerWrongNoise     = new Audio('/audio/answer-wrong.mp3');
let newMessageNoise      = new Audio('/audio/new-message.mp3');
let playerPointNoise     = new Audio('/audio/player-point.mp3');
let buttonClickNoise     = new Audio('/audio/button-click.mp3');

var app = new Vue({
  el: '#app',
  data: {
    errors:"",
    success: "",
    notifications: "",
    quiz: "",
    message:'',
    messages: [],
    player: {
      name: "",
      uuid: "",
      table:{},
      isAdmin: false,
    },
    currentQuestion: {
      marked: false,
    },
    usersQuestionAnswer: "",
    joinedGame: false,
    gameStarted: false,
    gameFinished:false,
    players: [],
    gameId: "",
    adminPassword: "",
    tables: [
      {
        name: 'Table 1',
        id: "table_1",
        custom_name: "",
      },
      {
        name: 'Table 2',
        id: "table_2",
        custom_name: "",
      },
      {
        name: 'table 3',
        id: "table_3",
        custom_name: "",
      },
      {
        name: 'Table 4',
        id: "table_4",
        custom_name: "",
      },
      {
        name: 'Table 5',
        id: "table_5",
        custom_nam: "",

      },
      {
        name: 'Table 6',
        id: "table_6",
        custom_name: "",
      }
    ]
  },
  methods: {
    resetGameData() {
      this.quiz =  "";
      this.message =  '';
      this.messages =  [];
      this.player =  {
        name: "",
        uuid: "",
        table:{},
        isAdmin: false,
        avatar: false,
      };
      this.currentQuestion     = {marked: false};
      this.usersQuestionAnswer = "";
      this.joinedGame          = false;
      this.gameStarted         = false;
      this.gameFinished        = false;
      this.players             = [];
      //Get the game ID from the URL if it was passed.
      if(initGameId) {
        this.gameId = initGameId;
      }
  
      this.adminPassword = "";
    },
    sendMessage() {
      buttonClickNoise.play();
      console.log('Sending message...');
      socket.emit('chat-message', this.message);
      var message  = _.cloneDeep(this.player);
      message.text = this.message;
      this.messages.unshift(message);
      this.message = "";
    },
    loadIcon(num) {
      var stringNum = num+"";
      while (stringNum.length < 3) stringNum = "0" + stringNum;
      return '/img/avatars/avatar_'+stringNum+'.svg'
    },
    joinGame(tableSent) {
      buttonClickNoise.play();
      this.errors = "";
      if(!this.player.name)   { this.displayError("You must enter your name.\n"); }
      if(!this.player.avatar) { this.displayError("You must select an Avatar.\n"); }
      if(!this.gameId)        { this.displayError("You must enter a room Id.\n"); }
      this.debug('calling: Join Game');

      /*let tableFound = false
      this.tables.forEach(table => {
        if(table.id == tableSent.id) {tableFound = true };
      });
      if(!tableFound) { this.displayError("We could not find that table. Please select again.\n"); }*/
      if(!this.errors) {
        this.player.table = tableSent;
        socket.emit('join-game', {tableId: 'table_1'/*tableSent.id*/, playerName: this.player.name, gameId: this.gameId, password: this.adminPassword, playerAvatar: this.player.avatar }, function() {
          this.debug('calling: Successfully attempted to join game');
        });
      }
    },
    exitGame() {
      this.resetGameData();
      //this.gameId = "";
      localStorage.removeItem('currentGame');
      //socket.disconnect();
    },
    startGame() {
      buttonClickNoise.play();
      this.errors = "";
      if(!this.player.isAdmin) { this.displayError("You must be an admin player to start a game"); }
      if(!this.player.uuid)    { this.displayError("It appears you have not joined a game yet."); }
      if(!this.errors) {
        socket.emit('start-game', true, function() {
          this.displaySuccess("Attempting to start game....");
        });
      }
    },
    displayError(errorMessage) {
      this.errors = errorMessage;
      setTimeout(() => this.errors = "", 1000);
    },
    displaySuccess(successMessage) {
      this.success = successMessage;
      setTimeout(() => this.success = "", 1000);
    },
    displayHeaderQuestion(question) {
      if(question.type == 'divider') { return false; }
      else                           { return true; }
    },
    questionIsMarkable(question) {
      if(question.type == 'divider') { return false; }
      else                           { return true; }
    },
    submitAnswer(answerText) {
      buttonClickNoise.play();
      if(!answerText) { this.displayError("You must select/enter an answer!\n"); }
      else {
        var answerId = this.currentQuestion.id;
        this.usersQuestionAnswer = answerText;
        socket.emit('submit-answer', { answerId: answerId, answerText: answerText, playerUUID: this.player.uuid });
        this.displaySuccess("Answer has been submitted! Waiting to see if it's correct...\n");
        this.currentQuestion.answerSubmitted = true;
        setTimeout(() => this.currentQuestion.answerSubmitted = false, 500); //Remove the class after the animation has finished
        answerSubmittedNoise.play();
        this.usersQuestionAnswer = "";
      }
    },
    markAnswer(answerCorrect, playerUUID, questionId) {
      var errors = "";
      buttonClickNoise.play();
      //Carry out basic validation
      if(typeof isCorrect === 'null')  { errors = "You must select if the answer is correct or not!"; }
      if(!playerUUID)                  { errors = "Player ID not found!"; }
      if(!questionId)                  { errors = "Question ID not found!"; }
      
      //Pass back errors if there are any, otherwise, mark question
      if(errors) { this.displayError(errors); }
      else {
        socket.emit('mark-answer', { answerCorrect: answerCorrect, questionId: questionId, playerUUID: playerUUID }, function() {
        }.bind(this));
      }
    },
    loadNextQuestion() {
      buttonClickNoise.play();
      socket.emit('load-next-question', true)
    },
    debug(debugMessage) {
      if(DEBUG) {
        console.log(debugMessage);
      }
    },
    addPlayer(player) {
      var playerFound = false;
      this.players.forEach(function(subPlayer, index) { 
        if(subPlayer.uuid == player.uuid) {
          playerFound = true;
        }
      }.bind(this));
      if(!playerFound) {
        this.players.push(player);
      }
    }
  },
  created() {

    this.resetGameData();

    socket.on('connect', () => {
      this.displaySuccess("You have successfully connected to the server!");
      var currentGame = localStorage.getItem('currentGame');
      if(currentGame) {
        currentGame = JSON.parse(currentGame);
        if(currentGame && currentGame.hasOwnProperty('gameId') &&  currentGame.hasOwnProperty('playerUuid') ) {
          if(currentGame.gameId == this.gameId) {
            this.debug('join-game');
            socket.emit('join-game', {tableId: 'table_1'/*tableSent.id*/, playerUuid: currentGame.playerUuid, gameId: this.gameId, }, function() {
              this.debug('calling: Successfully attempted to join game');
            });
          }
        }
      }
    });

    socket.on('connect_error', (error) => {
      console.log(error);
      this.displayError("Error connecting. Please try again later!");
      this.resetGameData();
    });

    socket.on('connect_timeout', (timeout) => {
      console.log(timeout);
      this.displayError("Connection timed out. Please check you still have internet.<br>\n");
      this.resetGameData();
    });

    socket.on('success', (successMessage) => {
      this.displaySuccess(successMessage);
    });

    socket.on('login-errors', (errorMessage) => {
      this.debug('login-errors');
      this.displayError(errorMessage);
    });

    socket.on('general-errors', (errorMessage) => {
      this.debug('general-errors');
      this.displayError(errorMessage);
    });

    socket.on('chat-notifications', (notificationMessage) => {
      this.debug('chat-notifications');
      this.notifications = notificationMessage;
    });

    socket.on('chat-message', (message) => {
      this.debug('chat-message');
      this.messages.unshift(message);
      newMessageNoise.play();
    });

    //Functions related to the player.
    socket.on('add-player', (player) => {
      this.debug('add-player');
      player.currentAnswerText = "";
      player.currentQuestionID = "";
      this.addPlayer(player);
    });

    socket.on('joined-game', (player) => {
      this.debug('joined-game');
      this.player.uuid              = player.uuid;
      this.player.score             = player.score;
      this.player.score             = player.name;
      this.player.score             = player.score;
      this.player.avatar            = player.avatar;
      this.player.currentAnswerText = "";
      this.player.currentQuestionID = "";
      this.player.isAdmin           = player.isAdmin;
      this.joinedGame               = true;

      localStorage.setItem('currentGame', JSON.stringify({gameId: this.gameId, playerUuid: player.uuid}));
      this.addPlayer(player);
    });


    socket.on('remove-player', (uuid) => {
      this.debug('remove-player');
      var playerIndex = this.players.findIndex(player => player.uuid === uuid);
      this.players.splice(playerIndex, 1);
    });

    //Functions related to the game
    socket.on('game-started', (gameStarted) => {
      this.debug('game-started');
      this.gameStarted  = gameStarted;
      this.gameFinished = false;
    });

    socket.on('game-complete', (gameFinished) => {
      this.debug('game-complete');
      this.gameFinished = gameFinished;
      victoryConfetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    });

    
    //Functions related to the game
    socket.on('load-question', (question) => {
      this.debug('load-question');
      this.currentQuestion        = _.cloneDeep(question);
      this.currentQuestion.answer_text = this.currentQuestion['answer_'+this.currentQuestion.correct_answer];
      this.players.forEach(function(player, index) { 
        this.players[index].scoreUpdated = false;
        this.players[index].answerAdded = false;
      }.bind(this));
    });

    //Functions related to the game
    socket.on('question-marked', (questionId) => {
      this.debug('question-marked');
      if(questionId == this.currentQuestion.id) {
        this.currentQuestion.marked = 1;
      }
    });

    socket.on('answer-for-marking', (answerForMarking) => {
      this.debug('answer-for-marking');
      this.players.forEach(function(player, index) { 
        if(player.uuid == answerForMarking.playerUUID) {
          this.players[index].currentAnswerText = answerForMarking.answerText;
          this.players[index].currentQuestionID = answerForMarking.answerId;
          this.players[index].answerAdded = true;
          answerReceivedNoise.play();
        }
      }.bind(this));
    });

    socket.on('updated-player-score', (playerScore, gotPoint, playerUUID) => {
      this.debug('updated-player-score');
      this.players.forEach(function(player, index) {

        if(player.uuid == playerUUID) {
          
          this.players[index].score        = parseInt(playerScore);
          this.players[index].scoreUpdated = true;
          if(this.player.isAdmin) {
            this.players[index].currentAnswerText = "";
            this.players[index].currentQuestionID = null;
          }

          if(playerUUID == this.player.uuid) {
            if(gotPoint === true) {
              answerCorrectNoise.play();
            } else {
              answerWrongNoise.play();
            }
          } else {
            playerPointNoise.play();
          }
        }
      }.bind(this));
    });


  }
})