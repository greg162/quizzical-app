var mongoose = require('mongoose');
const QuestionSchema        = require('./Question.js');
const CurrentQuestionSchema = require('./CurrentQuestion.js');
const PlayerSchema          = require('./Player.js');
const AnswerSchema          = require('./Answer.js');

var GameSchema = new mongoose.Schema({
  id: Number,
  game_id: String,
  name: String,
  description: String,
  password: String,
  game_started: Number,
  game_completed: Number,
  game_start_time: Date,
  questions: [QuestionSchema],
  current_question: CurrentQuestionSchema,
  admin_socket_id: String,
  players: [PlayerSchema],
  answers: [AnswerSchema],
  number_of_players: Number,
  have_admin_player: Number,
  current_question_key: Number,
});

module.exports = GameSchema;
