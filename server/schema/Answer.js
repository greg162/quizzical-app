var mongoose = require('mongoose');

var AnswerSchema = new mongoose.Schema({
  uuid: String,
  question_id: Number,
  user_id: String,
  answer: String,
  points: Number,
  correct_answer: Boolean,
});

module.exports = AnswerSchema;
