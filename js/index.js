const Snoowrap = require('snoowrap');
const fs = require('fs');

const getThingType = require('./getThingType');
const prompt = require('./prompt');
const download = require('./download');

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

function fetchSaves(limit)
{
	if(limit === 'all')
	{
		return r.getMe().getSavedContent().fetchAll();
	}

	return r.getMe().getSavedContent({ limit });
}

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

prompt([
	{
		question: 'How many saves do you want to fetch?',
		key: 'fetchLimit', 
	}
], ({ fetchLimit }) =>
{
	getUrls(+fetchLimit || 10)
		// .then(listing => chunkify([...listing], 10))
		.then(async (listing) =>
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
			for(const data of listing)
			{
				switch(data.type)
				{
					case 'comment':
					case 'text':
						// Skip over them because they don't have files that can be downloaded,
						// and regex-ing over them to get image/video urls is difficult
						break;

					case 'image':
						await download(data.url, dest);
						break;

					case 'gallery':
						{
							for(const url of data.urlArray)
							{
								await download(url, dest);
							}
						}
						break;

					case 'video':
						{
							const dest = './downloads/';
							const newDest = `${dest}${uniqueStr()}/`;
						
							await fs.promises.mkdir(newDest)
							await download(data.vidUrl, newDest);
							await download(data.audioUrl, newDest);
						}
						break;
				}
			}
		})
})

// listing contains some properties that could get iterated, so you need to deep copy the listing
// for(const [index, thing] of Object.entries([...listing]))
// {
// 	console.log(`${index}:`, thing);
// }
// console.log(listing.length);
// fs.writeFileSync('./downloads/image.json', JSON.stringify(listing));
// download('https://jsonplaceholder.typicode.com/users/', './downloads/test.json');
