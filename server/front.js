// #1: import full build in JavaScript file
import Vue from 'vue/dist/vue.js';

import io from 'socket.io-client';

const socket = io();

const DEBUG = true;
var _ = require('lodash');


import './styles/main.scss';



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
    currentQuestion: {},
    usersQuestionAnswer: "",
    joinedGame: false,
    gameStarted: false,
    gameFinished:false,
    players: [],
    roomId: "",
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
      this.currentQuestion = {};
      this.usersQuestionAnswer = "";
      this.joinedGame = false;
      this.gameStarted = false;
      this.gameFinished = false;
      this.players = [];
      this.roomId = "";
      this.adminPassword = "";
    },
    sendMessage: function () {
      console.log('Sending message...');
      socket.emit('chat-message', this.message);
      var message  = _.clone(this.player);
      message.text = this.message;
      this.messages.unshift(message);

    },
    loadIcon(num) {
      var stringNum = num+"";
      while (stringNum.length < 3) stringNum = "0" + stringNum;
      return '/img/avatars/avatar_'+stringNum+'.svg'
    },
    joinGame(tableSent) {
      this.errors = "";
      if(!this.player.name)   { this.displayError("You must enter your name.\n"); }
      if(!this.player.avatar) { this.displayError("You must select an Avatar.\n"); }
      if(!this.roomId)        { this.displayError("You must enter a room Id.\n"); }
      this.debug('calling: Join Game');

      /*let tableFound = false
      this.tables.forEach(table => {
        if(table.id == tableSent.id) {tableFound = true };
      });
      if(!tableFound) { this.displayError("We could not find that table. Please select again.\n"); }*/
      if(!this.errors) {
        this.player.table = tableSent;
        socket.emit('join-game', {tableId: 'table_1'/*tableSent.id*/, playerName: this.player.name, roomId: this.roomId, password: this.adminPassword, playerAvatar: this.player.avatar }, function() {
          this.debug('calling: Successfully attempted to join game');
        });
      }
    },
    startGame() {
      this.errors = "";
      if(!this.player.isAdmin) { this.displayError("You must be an admin player to start a game"); }
      if(!this.player.uuid)    { this.displayError("It appears you have not joined a game yet."); }
      if(!this.errors) {
        socket.emit('start-game', true, function() {
          this.success = "Attempting to start game....";
        });
      }
    },
    displayError(errorMessage) {
      this.errors = errorMessage;
    },
    displaySuccess(successMessage) {
      this.success = successMessage;
    },
    submitAnswer(answerText) {
      if(!answerText) { this.displayError("You must select/enter an answer!\n"); }
      else {
        var answerId = this.currentQuestion.id;
        this.usersQuestionAnswer = answerText;
        socket.emit('submit-answer', { answerId: answerId, answerText: answerText, playerUUID: this.player.uuid }, function() {
          this.success = "Answer has been submitted! Waiting to see if it's correct...\n";
        }.bind(this));
      }
    },
    markAnswer(answerCorrect, playerUUID, questionId) {
      var errors = "";
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
      socket.emit('load-next-question', true)
    },
    debug(debugMessage) {
      if(DEBUG) {
        console.log(debugMessage);
      }
    }
  },
  created() {

    this.resetGameData();

    socket.on('connect', () => {
      this.success = "You have successfully connected to the server!";
      //setTimeout(() => this.success = "", 2000);
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
    });

    //Functions related to the player.
    socket.on('add-player', (player) => {
      this.debug('add-player');
      player.currentAnswerText = "";
      player.currentQuestionID = "";
      var clonedPlayer = _.clone(player);
      this.players.push(clonedPlayer);
    });
    
    socket.on('user-uuid', (uuid) => {
      this.debug('user-uuid');
      this.player.uuid              = uuid;
      this.player.currentAnswerText = "";
      this.player.currentQuestionID = "";
      this.player.score             = 0;

      this.joinedGame = true;
      var currentPlayer = _.clone(this.player);
      this.players.push(currentPlayer);
    });
    socket.on('user-admin', (isAdmin) => {
      this.debug('user-admin');
      console.log(isAdmin);
      this.player.isAdmin = isAdmin;
      this.players.forEach(function(player, index) { 
        if(player.uuid == this.player.uuid) {
          this.players[index].isAdmin = isAdmin;
        }
      }.bind(this));
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
    });

    
    //Functions related to the game
    socket.on('load-question', (question) => {
      this.debug('load-question');
      this.currentQuestion = _.clone(question);
    });

    //Functions related to the game
    socket.on('question-marked', (questionId) => {
      this.debug('question-marked');
      if(questionId == this.currentQuestion.id) {
        this.currentQuestion.marked = true;
      }
    });


    socket.on('answer-for-marking', (answerForMarking) => {
      this.debug('answer-for-marking');
      this.players.forEach(function(player, index) { 
        if(player.uuid == answerForMarking.playerUUID) {
          this.players[index].currentAnswerText = answerForMarking.answerText;
          this.players[index].currentQuestionID = answerForMarking.answerId;
        }
      }.bind(this));
    });

    socket.on('updated-player-score', (playerScore,playerUUID) => {
      this.debug('updated-player-score');
      this.players.forEach(function(player, index) { 
        if(player.uuid == playerUUID) {
          console.log(playerScore);
          this.players[index].score = parseInt(playerScore);
          if(this.player.isAdmin) {
            this.players[index].currentAnswerText = "";
            this.players[index].currentQuestionID = null;
          }
        }
      }.bind(this));
    });


  }
})