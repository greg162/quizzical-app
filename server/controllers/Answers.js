const { v4: uuidv4 } = require('uuid');

class AnswersController {
  constructor(questionID, userID, answer, correct, points) {
    this.uuid           = uuidv4();;
    this.question_id    = questionID;
    this.user_id        = userID;
    this.answer         = answer;
    this.points         = points;
    this.correct_answer = correct;
  }

  answerToObject() {
    return {
      uuid: this.uuid,
      question_id: this.question_id,
      user_id: this.user_id,
      answer: this.answer,
      points: this.points,
      correct_answer: this.correct_answer,
    }
  }


}

module.exports = AnswersController;
