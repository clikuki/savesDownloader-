const Snoowrap = require('snoowrap');
const fs = require('fs');

const getThingType = require('./getThingType');
const prompt = require('./prompt');
const download = require('./download');
const { resolve } = require('path');

const userInfo = (() =>
{ // load dev or user credentials
	try {
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
	if(limit === 'all')
	{
		return r.getMe().getSavedContent().fetchAll();
	}

	return r.getMe().getSavedContent({ limit });
}

// takes the needed data from the listing and return it
function getUrls(limit)
{
	return fetchSaves(limit).then(listing =>
		{
		return listing.map(thing =>
		{
			const type = getThingType(thing);
			const data = {
				type,
			}

			switch(type)
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
	})
}

// returns a diffrent promise for each type of save
function downloadSave(data)
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
	switch(data.type)
	{
		case 'comment':
		case 'text':
			// Skip over them because they don't have files that can be downloaded,
			// and regex-ing over them to get image/video urls is difficult
			break;

		case 'image':
			return download(data.url, dest);

		case 'gallery':
			{ // not finalized, kinda just put this part together
				return new Promise(async () =>
				{
					for(const url of data.urlArray)
					{
						await download(url, dest);
					}
				})
			}
			break;

		case 'video':
			{
				const newDest = `${dest}${uniqueStr()}/`;
			
				return async () =>
				{
					await fs.promises.mkdir(newDest)
					await download(data.vidUrl, newDest);
					await download(data.audioUrl, newDest);
				}
			}
	}
}

// Split array into chunks/arrays within an array
function chunkify(array, chunkLength)
{
	const newArr = []
	for (let i = 0; i < array.length; i += chunkLength) {
		newArr.push(array.slice(i, i + chunkLength));
	}

	return newArr;
}

// callback that is called when fetch limit prompt has been answered
function startCallback({ fetchLimit })
{
	getUrls(+fetchLimit || 10)
		.then(listing => chunkify([...listing], 2))
		.then(async (chunkyListing) =>
		{	
			for(const chunk of chunkyListing)
			{
				const promiseArray = chunk.map(data => downloadSave(data));
				await Promise.all(promiseArray);
			}
		})
}

// start program with fetch limit prompt
prompt([
	{
		question: 'How many saves do you want to fetch?',
		key: 'fetchLimit', 
	}
], startCallback)
