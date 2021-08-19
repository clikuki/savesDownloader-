const Snoowrap = require('snoowrap');
const fs = require('fs');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const getType = require('./getType');
const prompt = require('./prompt');
const download = require('./download');
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
async function fetchSaves(limit)
{
	const processStr = 'Fetching your saves from Reddit.com';
	const finishStr = 'Finished fetching your saves!';
	terminalProgress.start(processStr);

	let listing;
	if (limit === 'all') listing = await r.getMe().getSavedContent().fetchAll()
	listing = await r.getMe().getSavedContent({ limit });

	terminalProgress.stop(finishStr);
	return listing;
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
function downloadPromise(data)
{
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

	const dest = './downloads/'
	switch (data.type)
	{
		case 'comment':
		case 'text':
			// Skip over them because they don't have files that can be downloaded,
			// and regex-ing over them to get image/video urls is difficult
			return;

		case 'image':
			return download(data.url, dest);

		case 'gallery':
			// Not finalized, kinda just put this part together
			return new Promise(async (resolve, reject) =>
			{
				for (const url of data.urlArray)
				{
					try
					{
						await download(url, dest);
					}
					catch (e)
					{
						reject(e);
						break;
					}
				}
			})

		case 'video':
			{
				const newDest = `${dest}${uniqueStr()}/`;

				return fs.promises.mkdir(newDest)
					.then(() => download(data.vidUrl, newDest))
					.then(() => download(data.audioUrl, newDest));
			}
	}
}

// Split array into chunks/arrays within an array
function subArray(array, numOfSubArrays)
{
	const newArray = Array.from({ length: numOfSubArrays }, () => []);

	let subArrIndex = 0;
	for(const elem of array)
	{
		newArray[subArrIndex].push(elem);
		if(subArrIndex < numOfSubArrays - 1) subArrIndex += 1; 
		else subArrIndex = 0; 
	}

	return newArray;
}

// Runs parralel downloads on chunked listing
function handleDownloads(listing, chunkLength)
{
	const processStr = 'Downloading saves';
	const finishStr = 'Finished Downloading!';
	terminalProgress.start(processStr);

	return new Promise(resolve =>
	{
		const chunkyListing = subArray([...listing], chunkLength || 2);
		const numOfArrays = chunkyListing.length;
		let finishedArrays = 0;

		// for(const [i, chunk] of Object.entries(chunkyListing))
		for (const chunk of chunkyListing)
		{
			(async () =>
			{
				for (const [i, data] of Object.entries(chunk))
				// for (const data of chunk)
				{
					try
					{
						await downloadPromise(data)

						data.downloaded = true;
						if (+i === chunk.length - 1) finishedArrays += 1;
						if (numOfArrays === finishedArrays)
						{
							terminalProgress.stop(finishStr);
							resolve(listing);
						}
					} catch (e)
					{
						if (e.code === 'ETIMEDOUT')
						{
							prompt([
								{
									question: 'A download took to long. Would you like to try again?',
									key: 'confirm',
								},
							], ({ confirm }) =>
							{
								if (confirm === 'yes')
								{
									// Remove already downloaded saves
									const filteredLising = chunkyListing.map(subArr =>
									{
										return subArr.filter(thing => !thing.downloaded);
									})

									handleDownloads(filteredLising);
								}
							});
						}
						else throw e;
					}
				}
			})()
		}
	})
}

function unsave(listing)
{
	const processStr = 'Unsaving downloaded submissions from saves';
	const finishStr = 'Finished Unsaving!';
	terminalProgress.start(processStr);
	terminalProgress.stop(finishStr);

	console.log(listing);
	return listing;
	// TODO: Implement unsave feature
}

// Returns the required arguments for the program
function getArgs()
{
	let argsObj = {
		fetchLimit: userInfo.FETCHLIMIT || argv.limit,
		parallelDownloads: userInfo.PARALLELDOWNLOADS || argv.parallel,
		unsaveBool: userInfo.UNSAVE !== undefined ? userInfo.UNSAVE : argv.unsave,
	}

	return argsObj;
}

// Starts program
function init()
{
	const { fetchLimit, parallelDownloads, unsaveBool } = getArgs();

	fetchSaves(+fetchLimit || 10)
		.then(formatListing)
		.then(listing => handleDownloads(listing, parallelDownloads))
		.then(listing => unsaveBool ? unsave(listing) : listing);
}

init();
