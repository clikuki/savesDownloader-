const Snoowrap = require('snoowrap');
const fs = require('fs');

const download = require('./download');
const getThingType = require('./getThingType');

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

async function getUrls(limit)
{
	return await fetchSaves(limit)
		.then(listing => {
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
						data.vidUrl = thing.secure_media.reddit_video.fallback_url;
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

getUrls(1)
	.then(listing =>
	{// listing contains some properties that could get iterated, so you need to deep copy the listing
		for(const [index, thing] of Object.entries([...listing]))
		{
			console.log(`${index}:`, thing);
		}
	});

// console.log(listing.length);
// fs.writeFileSync('./downloads/image.json', JSON.stringify(listing));
// download('https://jsonplaceholder.typicode.com/users/', './downloads/test.json');
