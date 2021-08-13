const Snoowrap = require('snoowrap');
const fs = require('fs');

const getThingType = require('./getThingType');
const prompt = require('./prompt');
const download = require('./download');

const userInfo = (() =>
{ // load dev or user credentials
	try
	{
		return require('./dev.config.js');
	} catch {
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

// fetch saves
function fetchSaves(limit)
{
	console.log('Fetching listing from Reddit.com...')

	if (limit === 'all') return r.getMe().getSavedContent().fetchAll()
	return r.getMe().getSavedContent({ limit });
}

// takes the needed data from the listing and return it
function formatListing(listing)
{
	return listing.map(thing =>
	{
		const type = getThingType(thing);
		const data = {
			downloaded: true,
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
			{ // not finalized, kinda just put this part together
				return new Promise(async () =>
				{
					for (const url of data.urlArray)
					{
						await download(url, dest);
					}
				})
			}
			break;

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
function subArray(array, numOfArrays)
{
	const newArr = [];
	const arrLen = Math.round(array.length / numOfArrays);

	for (let i = 0; i < numOfArrays; i++)
	{
		const startIndex = i * arrLen;
		const isNotDivisible = !(arrLen === array.length / numOfArrays);
		const onLastIndex = i + 1 === numOfArrays;
		const endIndex = isNotDivisible && onLastIndex ? array.length : startIndex + arrLen;
		const subArr = array.slice(startIndex, endIndex);
		newArr.push(subArr);
	}

	return newArr;
}

// Runs parralel downloads on chunked listing
function handleDownloads(listing, chunkLength)
{
	console.log('Downloading saves...')

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

						data.downloaded === true;
						if (+i === chunk.length - 1) finishedArrays += 1;
						if (numOfArrays === finishedArrays) resolve(listing);
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
	console.log('Unsaving downloaded submissions from saves...');
	console.log(listing);
	// TODO: Implement unsave feature
}

// callback that is called when fetch limit prompt has been answered
function startCallback({ fetchLimit, chunkLength })
{
	const downloadListing = listing => handleDownloads(listing, chunkLength);

	fetchSaves(+fetchLimit || 10)
		.then(formatListing)
		.then(downloadListing)
		.then(unsave);
}

// start program with fetch limit prompt
function init()
{
	const promptArray = [
		{
			question: 'How many saves do you want to fetch?',
			key: 'fetchLimit',
		},
		{
			question: 'How many parrallel downloads do you want?',
			key: 'chunkLength',
		},
	]

	prompt(promptArray, startCallback)
}

init();
