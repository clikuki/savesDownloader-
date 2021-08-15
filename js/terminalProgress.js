const readline = require('readline');

let progressInterval;

const clearLine = () =>
{
	readline.clearLine(process.stdout);
	readline.cursorTo(process.stdout, 0);
}

const getDots = (numOfDots) => Array.from({ length: numOfDots }, () => '.').join('');

const write = (str) =>
{
	clearLine();
	process.stdout.write(str);
}

const start = (progressString) =>
{
	if(progressInterval) return;

	let dotsNum = 0;
	const intervalCB = () =>
	{
		let dotStr = getDots(++dotsNum);
		if(dotsNum === 3) dotsNum = 0;
		write(`${progressString} ${dotStr}`);
	}
	
	intervalCB(); // Call once at start
	progressInterval = setInterval(intervalCB, 500);
}

const stop = (finishString) =>
{
	clearInterval(progressInterval);
	progressInterval = undefined;
	write(`${finishString}\n`);
}

const terminalProgress = {
	start,
	stop,
}

module.exports = terminalProgress;
