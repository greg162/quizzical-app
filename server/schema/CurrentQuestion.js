var mongoose = require('mongoose');


var CurrentQuestionSchema = new mongoose.Schema({
  id: String,
  created_at: Date,
  updated_at: Date,
  quiz_id: Number,
  user_id: Number,
  type: String,
  question: String,
  answer_1: String,
  answer_2: String,
  answer_3: String,
  answer_4: String,
  answer_5: String,
  answer_6: String,
  correct_answer: String,
  marked: Number,
});

module.exports = CurrentQuestionSchema;
