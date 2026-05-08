const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  buildAnswerRecord,
  buildQuizResults,
  createInitialQuizState,
  getProgressText,
  getProgressValue,
  getResultBand,
  renderQuizMedia
} = require("../frontend/assets/js/app.js");

const content = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "content.json"), "utf8")
);

test("quiz contract includes required screen and scoring fields", () => {
  const { quiz } = content;

  assert.ok(quiz.title);
  assert.ok(quiz.summary);
  assert.ok(quiz.intro);
  assert.equal(typeof quiz.passingScore, "number");
  assert.ok(Array.isArray(quiz.resultBands));
  assert.ok(Array.isArray(quiz.questions));
  assert.equal(quiz.questions.length, 10);

  const listeningQuestions = quiz.questions.filter((question) => question.audio);
  assert.equal(listeningQuestions.length, 5);

  for (const question of quiz.questions) {
    assert.ok(question.id);
    assert.ok(question.prompt);
    assert.ok(question.context);
    assert.ok(Array.isArray(question.options));
    assert.ok(question.options.length >= 2);
    assert.equal(typeof question.answerIndex, "number");
    assert.ok(question.correctFeedback);
    assert.ok(question.incorrectFeedback);
    assert.ok(question.insight);

    if (question.audio) {
      assert.ok(question.audio.label);
      assert.ok(question.audio.caption);
      assert.ok(Array.isArray(question.audio.listenFor));
      assert.ok(question.audio.src.startsWith("/assets/audio/"));

      const relativeAudioPath = question.audio.src.replace("/assets/", "").replace(/\//g, path.sep);
      const absoluteAudioPath = path.join(__dirname, "..", "frontend", "assets", relativeAudioPath.replace(`audio${path.sep}`, `audio${path.sep}`));
      assert.equal(fs.existsSync(absoluteAudioPath), true);
    }
  }
});

test("initial quiz state starts on the intro screen", () => {
  assert.deepEqual(createInitialQuizState(), {
    screen: "intro",
    currentIndex: 0,
    score: 0,
    answers: []
  });
});

test("answer records preserve correctness and feedback details", () => {
  const question = content.quiz.questions[0];
  const correctRecord = buildAnswerRecord(question, question.answerIndex);
  const wrongRecord = buildAnswerRecord(question, 0);

  assert.equal(correctRecord.isCorrect, true);
  assert.equal(correctRecord.correctOption, question.options[question.answerIndex]);
  assert.equal(correctRecord.feedback, question.correctFeedback);

  assert.equal(wrongRecord.isCorrect, false);
  assert.equal(wrongRecord.feedback, question.incorrectFeedback);
  assert.equal(wrongRecord.correctOption, question.options[question.answerIndex]);
});

test("progress helpers produce human-readable progress and bar width", () => {
  assert.equal(getProgressText(0, 10), "Question 1 of 10");
  assert.equal(getProgressText(9, 10), "Question 10 of 10");
  assert.equal(getProgressValue(1, 10), 20);
});

test("result bands are selected by score thresholds", () => {
  assert.equal(getResultBand(content.quiz.resultBands, 9).title, "Genre guide");
  assert.equal(getResultBand(content.quiz.resultBands, 7).title, "On the right track");
  assert.equal(getResultBand(content.quiz.resultBands, 1).title, "Keep exploring");
});

test("quiz results compute score totals and pass state", () => {
  const answers = [
    buildAnswerRecord(content.quiz.questions[0], content.quiz.questions[0].answerIndex),
    buildAnswerRecord(content.quiz.questions[1], content.quiz.questions[1].answerIndex),
    buildAnswerRecord(content.quiz.questions[2], 0),
    buildAnswerRecord(content.quiz.questions[3], content.quiz.questions[3].answerIndex),
    buildAnswerRecord(content.quiz.questions[4], 0),
    buildAnswerRecord(content.quiz.questions[5], content.quiz.questions[5].answerIndex),
    buildAnswerRecord(content.quiz.questions[6], content.quiz.questions[6].answerIndex),
    buildAnswerRecord(content.quiz.questions[7], content.quiz.questions[7].answerIndex),
    buildAnswerRecord(content.quiz.questions[8], content.quiz.questions[8].answerIndex),
    buildAnswerRecord(content.quiz.questions[9], 1)
  ];

  const results = buildQuizResults(content.quiz, answers);

  assert.equal(results.correct, 7);
  assert.equal(results.incorrect, 3);
  assert.equal(results.total, 10);
  assert.equal(results.passed, true);
  assert.equal(results.band.title, "On the right track");
});

test("listening questions render an audio card", () => {
  const mediaMarkup = renderQuizMedia(content.quiz.questions[5]);
  const plainMarkup = renderQuizMedia(content.quiz.questions[0]);

  assert.match(mediaMarkup, /Listening challenge/);
  assert.match(mediaMarkup, /audio/);
  assert.equal(plainMarkup, "");
});
