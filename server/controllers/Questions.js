class questions {
  constructor(questions) {
    this.currentQuestion = 0;
    this.questions = [];
    this.questionIds = [];
    questions.forEach(question => {
      this.questions[question.id] = question;
      this.questionIds.push(question.id);
    });

    console.log(this.questions);
    this.totalQuestions    = questions.length
    this.noMoreQuestions   = false;
  }
  loadNextQuestion() {
    //Get the next question to load
    var question = {};
    if(!this.noMoreQuestions) {
      var questionId = this.questionIds[this.currentQuestion];
      question        = this.questions[questionId];
      question.marked = false;
      if(this.totalQuestions - 1 <= this.currentQuestion ) {
        this.noMoreQuestions = true;
      }
      this.currentQuestion++;

    }
    return question;

  }

  addQuestions(questions) {
    this.questions = questions;
  }
}
module.exports = questions;
