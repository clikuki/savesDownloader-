const readline = require('readline');

const makeQuestion = (str) => `${str}\n> `;
const getObjLen = (obj) => Object.values(obj).length;
const prompt = (questionsArray, callback) =>
{
	const answersObject = {};
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	})

	const fullCallback = (answer) =>
	{
		const key = questionsArray[getObjLen(answersObject)].key;
		answersObject[key] = answer;

		const answersObjLen = getObjLen(answersObject);
		if (answersObjLen < questionsArray.length)
		{
			const question = makeQuestion(questionsArray[answersObjLen].question);
			rl.question(question, fullCallback);
		}
		else
		{
			console.log(''); // add new line
			rl.close();
			callback(answersObject);
		}
	}

	rl.question(makeQuestion(questionsArray[0].question), fullCallback);
}

module.exports = prompt;
