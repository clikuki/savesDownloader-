const readline = require('readline');

const clearLine = () =>
{
	readline.clearLine(process.stdout);
	readline.cursorTo(process.stdout, 0);
}

const getDots = (numOfDots) => Array.from({ length: numOfDots }, () => '.').join('');

const terminalProgress = (progressString, finishString) =>
{
	let dotsNum = 0;
	const intervalCB = () =>
	{
		let dotStr = getDots(++dotsNum);
		if(dotsNum === 3) dotsNum = 0;
		clearLine();
		process.stdout.write(`${progressString} ${dotStr}`);
	}
	
	intervalCB();
	const progressInterval = setInterval(intervalCB, 500);

	/**
	 * Signals to user that the process has ended and displays finish message
	 */
	return () =>
	{
		clearInterval(progressInterval)
		clearLine();
		process.stdout.write(`${finishString}\n`);
	};
}

module.exports = terminalProgress;
