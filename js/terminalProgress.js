const readline = require('readline');

let progressInterval;

const clearLine = () =>
{
	readline.clearLine(process.stdout);
	readline.cursorTo(process.stdout, 0);
}

const getDots = (numOfDots) => Array.from({ length: 3 }, (_, i) => i < numOfDots ? '.' : ' ').join('');

const write = (str) =>
{
	clearLine();
	process.stdout.write(str);
}

const progressUpdateMethods = (() =>
{
	let processes = 0;

	return {
		get: () => processes,
		set: (num) =>
		{
			if(!progressInterval) return;
			processes = num
		},
		close: () => processes = 0,
	}
})()

const start = (() =>
{
	const getProgressStrMaker = (left = '', right = '') => () => `${left} ${progressUpdateMethods.get()} ${right} `;

	return (progressString, processObj) =>
	{
		if(progressInterval) return;
	
		const progressStrMaker = processObj ? getProgressStrMaker(processObj.l, processObj.r) : null;

		let dotsNum = 0;
		const intervalCB = () =>
		{
			const dotStr = getDots(++dotsNum);
			if(dotsNum === 3) dotsNum = 0;
	
			const progress = progressStrMaker ? progressStrMaker() : '';
			const str = `${progressString} ${dotStr}${progress}`;
	
			write(str);
		}
		
		intervalCB(); // Call once at start
		progressInterval = setInterval(intervalCB, 500);
	}
})()

const stop = (finishString) =>
{
	if(progressInterval !== undefined)
	{
		clearInterval(progressInterval);
		progressUpdateMethods.close();
		progressInterval = undefined;
		write(`${finishString}\n`);
	}
}

const terminalProgress = {
	start,
	stop,
	update: progressUpdateMethods.set,
}

module.exports = terminalProgress;
