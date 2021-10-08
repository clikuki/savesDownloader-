const Snoowrap = require('snoowrap');
const fs = require('fs');
const { isText } = require('istextorbinary');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const getType = require('./getType');
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
{ // load dev or user credentials and defaults
	try
	{
		return require('./dev.config.js');
	} catch
	{
		return require('./userInfo.config.js');
	}
})();

// Initialize wrapper
const r = new Snoowrap({
	userAgent: 'NodeJS Saves Downloader+ 0.0.1 By u/Clikuki',
	clientId: userInfo.CLIENT_ID,
	clientSecret: userInfo.CLIENT_SECRET,
	username: userInfo.USERNAME,
	password: userInfo.PASSWORD,
})

// Fetches saves
async function fetchSaves(limit)
{
	const processStr = 'Fetching your saves from Reddit.com';
	const finishStr = 'Finished fetching your saves!';
	terminalProgress.start(processStr);
	
	try
	{
		const listing = await r.getMe().getSavedContent({ limit });
		
		terminalProgress.stop(finishStr);
		return listing;
	}
	catch (e)
	{
		// Previous attempt at error handling doesn't work
		// Not sure how to handle errors
		throw e;
	}
}

// Takes listing and formats it to get only the needed info
function formatListing(listing)
{
	return listing.map(item =>
	{
		const type = getType(item);
		const data = {
			id: item.id,
			type,
		}
		
		switch (type)
		{
			case 'comment':
				data.url = item.link_permalink + item.id;
				break;
		
			case 'image':
			case 'text':
				data.url = item.url;
				break;
		
			case 'video':
				if (item.secure_media)
				{
					// Remove url params from appearing on file extension
					data.vidUrl = item.secure_media.reddit_video.fallback_url.split('?')[0];
					data.audioUrl = data.vidUrl.replace(/(?<=DASH_)[0-9]*/, 'audio');
				}
				else data.type = 'removed';
				break;
		
			case 'gallery':
				if(item.media_metadata)
				{
					const galleryImgObj = Object.values(item.media_metadata);
					const images = galleryImgObj.map(img => img.s.u);

					data.urlArray = images;
				}
				else data.type = 'removed';
				break;
		
			default:
				break;
		}

		return data;
	})
}

// returns a promise that resolves when save item has finished downloading
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
					// Download images from gallery one by one
					for (const url of data.urlArray)
					{
						try
						{
							const fileName = getRandFileName(url);
							await download(url, dest, fileName);
						}
						catch (e)
						{
							// Allow error to bubble up to actual error handler
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
						.then(async file =>
							{
								// If audio file is text, then the video had no audio
								if(isText(null, file))
								{
									// delete invalid audio file and move video out
									await Promise.all([
										fs.promises.unlink(newDest + audioName),
										fs.promises.rename(newDest + vidName, dest + vidName),
									])

									return fs.promises.rmdir(newDest);
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
	// Prevent empty arrays from forming if array is shorter than numOfSubArrays
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

	return new Promise(resolve =>
	{
		// don't loop over saves that can be downloaded
		const listingCopy = [...listing].filter(({ type }) => !['comment', 'text', 'removed'].includes(type));
		const chunkyListing = subArray(listingCopy, chunkLength);
		const numOfArrays = chunkyListing.length;
		let finishedArrays = 0;
		let finishedImgs = 0;

		if(numOfArrays)
		{
			terminalProgress.start(processStr, { r: `of ${listing.length} saves downloaded` });
			chunkyListing.forEach(async chunk =>
			{
					for (const [i, data] of Object.entries(chunk))
					{
						try
						{
							// Wait for download to finish then
							// increase num of downloaded saves in display
							await getDownloadPromise(data);
							terminalProgress.update(++finishedImgs);
						
							if (+i === chunk.length - 1) finishedArrays += 1;
							if (numOfArrays === finishedArrays)
							{
								terminalProgress.stop(finishStr);
								resolve();
							}
						}
						catch (e)
						{
							// Previous attempt at error handling doesn't work
							// Not sure how to handle errors
							throw e;
						}
					}
			})
		}
		else
		{
			console.log('Listing had no valid saves!')
			resolve();
		}
	})
}

function unsave(listing)
{
	if(listing.length === 0) return Promise.reject(new Error('Listing is empty'));

	const processStr = 'Unsaving downloaded submissions from saves';
	const finishStr = 'Finished Unsaving!';
	terminalProgress.start(processStr, { r: `of ${listing.length} saves unsaved` });

	let finishedImgs = 0;
	const unsavePromiseArray = Promise.all(listing.map((item) =>
		{
			const isComment = (item.type === 'comment');
			const isText = (item.type === 'text');

			// Change method to getComment if save item is a comment
			const rMethod = (isComment) ? 'getComment' : 'getSubmission';

			return r[ rMethod ](item.id)
				.unsave()
				.then(() =>
				{
					if(isComment || isText)
					{
						const file = fs.createWriteStream(`./urls/${item.type}s.txt`, { flags: 'a' });
						file.write(`${item.url}\n`);
						file.end();
					}

					terminalProgress.update(++finishedImgs);
				});
		}));

	return unsavePromiseArray.then(() => terminalProgress.stop(finishStr));
}

// Returns the required arguments for the program
function getArgs()
{
	// If no value is present in userinfo, then use CLI args or defaults
	const argsObj = {
		fetchLimit: userInfo.FETCHLIMIT || argv.limit,
		parallelDownloads: userInfo.PARALLELDOWNLOADS || argv.parallel,
		unsaveBool: userInfo.UNSAVE !== undefined ? userInfo.UNSAVE : argv.unsave,
	}

	return argsObj;
}

// For development purposes
function writeListingToFile(path, content)
{
	content = JSON.stringify(content, undefined, 4);
	return fs.promises.writeFile(path, content);
}

// Starts program
function start({ fetchLimit, parallelDownloads, unsaveBool })
{
	// .then(listing => writeListingToFile('jsonExamples/deletedGallery.json', listing))
	fetchSaves(fetchLimit)
		.then(formatListing)
		.then(async listing =>
		{	
			try
			{
				await handleDownloads(listing, parallelDownloads);
				if(unsaveBool) await unsave(listing);	
			} catch (e)
			{
				const isListingEmptyErr = (e.message === 'Listing is empty' && e.name === 'Error');
				if(isListingEmptyErr)
				{
					console.log('Your saves listing is empty!');
				}
				else throw e;
			}

			console.log('\nScript has finished!');
		})
}

start(getArgs());
