var _ = require('lodash');

class QuestionController {
  constructor(questions, currentQuestionKey) {
    this.currentQuestion = currentQuestionKey;
    this.questions       = [];
    this.questionIds     = [];
    questions.forEach(question => {
      this.questions[question.id] = question;
      this.questionIds.push(question.id);
    });

    if(typeof this.currentQuestion == 'undefined') {
      this.currentQuestion = 0;
    }

    this.totalQuestions    = questions.length
    this.noMoreQuestions   = false;
  }

  loadNextQuestion() {
    //Get the next question to load
    if(!this.noMoreQuestions) {
      var questionId            = this.questionIds[this.currentQuestion];
      var question              = _.cloneDeep(this.questions[questionId]);
      var currentQuestionObject = {
        id: question.id,
        created_at: question.created_at,
        updated_at: question.updated_at,
        quiz_id: question.quiz_id,
        user_id: question.user_id,
        type: question.type,
        question: question.question,
        answer_1: question.answer_1,
        answer_2: question.answer_2,
        answer_3: question.answer_3,
        answer_4: question.answer_4,
        answer_5: question.answer_5,
        answer_6: question.answer_6,
        correct_answer: question.correct_answer,
        marked: 0, //As we're passing this qusetion to the players, create a marked variable
      };

      if(this.totalQuestions - 1 <= this.currentQuestion ) {
        this.noMoreQuestions = true;
      }
      this.currentQuestion++;

    }
    return currentQuestionObject;

  }

  addQuestions(questions) {
    this.questions = questions;
  }
}
module.exports = QuestionController;
