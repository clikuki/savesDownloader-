const Snoowrap = require('snoowrap');
const fs = require('fs');
const { isText } = require('istextorbinary');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const getType = require('./getType');
const prompt = require('./prompt');
const download = require('./download');
const getRandFileName = require('./getRandFileName');
const terminalProgress = require('./terminalProgress');

const argv = yargs(hideBin(process.argv))
	.coerce('limit', (arg) =>
	{
		switch (true)
		{
			case typeof arg === 'string' && arg === 'all':
				return 'all';

			case typeof arg !== 'number':
			case +arg === 0:
				break;

			default:
				return +arg;
		}
	})
	.coerce('parallel', (arg) =>
	{
		switch (true)
		{
			case typeof arg !== 'number':
			case +arg === 0:
				break;

			default:
				return +arg;
		}
	})
	.coerce('unsave', (arg) =>
	{
		switch (true)
		{
			case typeof arg === 'boolean':
				return arg;

			case arg === undefined:
				break;

			case arg.toLowerCase() === 'true':
				return true;

			case arg.toLowerCase() === 'false':
				return false;

			default:
				break;
		}
	})
	.default({
		limit: 10,
		parallel: 3,
		unsave: true
	})
	.argv;

const userInfo = (() =>
{ // load dev or user credentials
	try
	{
		return require('./dev.config.js');
	} catch
	{
		return require('./userInfo.config.js');
	}
})();

const r = new Snoowrap({
	userAgent: 'NodeJS Saves Downloader+ 0.0.1 By u/Clikuki',
	clientId: userInfo.CLIENT_ID,
	clientSecret: userInfo.CLIENT_SECRET,
	username: userInfo.USERNAME,
	password: userInfo.PASSWORD,
})

// Fetch saves
function fetchSaves(limit)
{
	return new Promise(async (resolve) =>
	{
		const processStr = 'Fetching your saves from Reddit.com';
		const finishStr = 'Finished fetching your saves!';
		terminalProgress.start(processStr);
	
		try
		{
			const listing = await r.getMe().getSavedContent({ limit });
	
			terminalProgress.stop(finishStr);
			resolve(listing);
		}
		catch (e)
		{
			console.log(e.code, e.message);
			if (/ETIMEDOUT/.test(e.message))
			{
				const questionArray = [
					{
						question: 'The request took too long. Would you like to try again?',
						key: 'confirm',
					},
				]

				const promptCallback = async ({ confirm }) =>
				{
					if(confirm === 'yes')
					{
						const listing = await fetchSaves(limit);
						terminalProgress.stop(finishStr);
						resolve(listing);
					}
				} 
				
				prompt(questionArray, promptCallback);
			}
			else throw e;
		}
	})
}

// Takes the needed data from the listing and return it
function formatListing(listing)
{
	return listing.map(thing =>
	{
		const type = getType(thing);
		const data = {
			downloaded: false,
			unsaved: false,
			id: thing.id,
			type,
		}

		switch (type)
		{
			case 'comment':
				data.postUrl = thing.link_permalink;
				data.url = data.postUrl + thing.id;
				break;

			case 'image':
			case 'text':
				data.url = thing.url;
				break;

			case 'video':
				data.vidUrl = thing.secure_media.reddit_video.fallback_url
					.replace('?source=fallback', '');

				data.audioUrl = data.vidUrl.replace(/(?<=DASH_)[0-9]*/, 'audio');
				break;

			case 'gallery':
				data.urlArray = Object.values(thing.media_metadata).map(img => img.s.u);
				break;

			default:
				break;
		}

		return data;
	});
}

// returns a diffrent promise for each type of save
const getDownloadPromise = (() =>
{
	const dest = './downloads/';

	const uniqueStr = () =>
	{
		const getRandomInt = (min, max) =>
		{
			min = Math.ceil(min);
			max = Math.floor(max);

			const randomInt = Math.floor(Math.random() * (max - min + 1)) + min;

			return randomInt;
		}

		const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		const charactersLength = characters.length;

		let result = '';
		for (let i = 0; i < getRandomInt(10, 20); i++)
		{
			result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}

		return result;
	};

	const getPromise = (data) =>
	{
		switch (data.type)
		{
			case 'comment':
			case 'text':
				// Skip over them because they don't have files that can be downloaded,
				// and regex-ing over them to get image/video urls is difficult
				return Promise.resolve();
			case 'image':
				{
					const fileName = getRandFileName(data.url);
					return download(data.url, dest, fileName);
				}
	
			case 'gallery':
				return new Promise(async (resolve, reject) =>
				{
					for (const url of data.urlArray)
					{
						try
						{
							const fileName = getRandFileName(url);
							await download(url, dest, fileName);
						}
						catch (e)
						{
							reject(e);
							break;
						}
					}
	
					resolve();
				})
	
			case 'video':
				{
					const newDest = `${dest}${uniqueStr()}/`;
					const vidName = getRandFileName(data.vidUrl);
					const audioName = getRandFileName(data.audioUrl);
	
					return fs.promises.mkdir(newDest)
						.then(() => download(data.vidUrl, newDest, vidName))
						.then(() => download(data.audioUrl, newDest, audioName))
						.then(() => fs.promises.readFile(newDest + audioName))
						.then(file =>
							{
								if(isText(null, file))
								{
									return fs.promises.unlink(newDest + audioName);
								}
							});
				}
		}
	}

	return (data) => getPromise(data);
})()

// Split array into chunks/arrays within an array
function subArray(array, numOfSubArrays)
{
	if(numOfSubArrays >= array.length) return array.map(item => [item]);

	const newArray = Array.from({ length: numOfSubArrays }, () => []);

	let subArrIndex = 0;
	for (const elem of array)
	{
		newArray[subArrIndex].push(elem);
		if (subArrIndex < numOfSubArrays - 1) subArrIndex += 1;
		else subArrIndex = 0;
	}

	return newArray;
}

// Runs parralel downloads on chunked listing
function handleDownloads(listing, chunkLength)
{
	if(listing.length === 0) return Promise.reject(new Error('Listing is empty'));

	const processStr = 'Downloading saves';
	const finishStr = 'Finished Downloading!';
	terminalProgress.start(processStr, { r: `of ${listing.length} images downloaded` });

	return new Promise(resolve =>
	{
		const chunkyListing = subArray([...listing], chunkLength);
		const numOfArrays = chunkyListing.length;
		let finishedArrays = 0;
		let finishedImgs = 0;

		chunkyListing.forEach(async chunk =>
		{
			for (const [i, data] of Object.entries(chunk))
			{
				try
				{
					await getDownloadPromise(data)

					terminalProgress.update(++finishedImgs);
					data.downloaded = true;
					if (+i === chunk.length - 1) finishedArrays += 1;
					if (numOfArrays === finishedArrays)
					{
						terminalProgress.stop(finishStr);
						resolve();
					}
				}
				catch (e)
				{
					console.log(e.code, e.message);
					if (/ETIMEDOUT/.test(e.message))
					{
						const questionArray = [
							{
								question: 'A download took to long. Would you like to try again?',
								key: 'confirm',
							},
						]

						const promptCallback = async ({ confirm }) =>
						{
							if (confirm === 'yes')
							{
								const filteredLising = chunkyListing.map(subArr =>
								{ // Remove already downloaded saves
									return subArr.filter(thing => !thing.downloaded);
								})

								await handleDownloads(filteredLising);
								terminalProgress.stop(finishStr);
								resolve();
							}
						}

						prompt(questionArray, promptCallback);
						break;
					}
					else throw e;
				}
			}
		})
	})
}

function unsave(listing)
{
	if(listing.length === 0) return Promise.reject(new Error('Listing is empty'));

	const processStr = 'Unsaving downloaded submissions from saves';
	const finishStr = 'Finished Unsaving!';
	terminalProgress.start(processStr, { r: `of ${listing.length} images unsaved` });

	let finishedImgs = 0;
	const unsavePromiseArray = Promise.all(listing.map((thing) =>
		{
			const isComment = (thing.type === 'comment');
			const isText = (thing.type === 'text');

			// Change method to getComment if thing is a comment
			const rMethod = (isComment) ? 'getComment' : 'getSubmission';

			return r[ rMethod ](thing.id)
				.unsave()
				.then(() =>
				{
					thing.unsaved = true;

					if(isComment || isText)
					{
						const file = fs.createWriteStream(`./urls/${thing.type}s.txt`, { flags: 'a' });
						file.write(`${thing.url}\n`);
						file.end();
					}

					terminalProgress.update(++finishedImgs);
				});
		}));

	return unsavePromiseArray
		.then(() => terminalProgress.stop(finishStr));
}

// Returns the required arguments for the program
function getArgs()
{
	const argsObj = {
		fetchLimit: userInfo.FETCHLIMIT || argv.limit,
		parallelDownloads: userInfo.PARALLELDOWNLOADS || argv.parallel,
		unsaveBool: userInfo.UNSAVE !== undefined ? userInfo.UNSAVE : argv.unsave,
	}

	return argsObj;
}

// Starts program
function start({ fetchLimit, parallelDownloads, unsaveBool })
{
	fetchSaves(fetchLimit).then(formatListing)
		.then(listing =>
		{	
			handleDownloads(listing, parallelDownloads)
				.then(() => unsaveBool && unsave(listing))
				.catch(e =>
				{
					const isListingEmptyErr = (e.message === 'Listing is empty' && e.name === 'Error');
					if(isListingEmptyErr)
					{
						console.log('Your saves listing is empty!');
					}
					else throw e;
				})
				.finally(() => console.log('\nScript has finished!'));
		})
}

start(getArgs());
