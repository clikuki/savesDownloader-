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

function getSaves(limit)
{
	if(limit === 'all')
	{
		return r.getMe().getSavedContent().fetchAll();
	}

	return r.getMe().getSavedContent({ limit });
}

// getSaves(1).then(listing => {
// 	listing.forEach(element => {
		
// 	});
// });

// console.log(listing.length);
// fs.writeFileSync('./downloads/image.json', JSON.stringify(listing));
// download('https://jsonplaceholder.typicode.com/users/', './downloads/test.json');
