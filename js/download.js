const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const download = async (url, dest, autoFileName = true) => {
	const res = await fetch(url);

	if(autoFileName)
	{
		dest += path.basename(url);
	}

	const fileStream = fs.createWriteStream(dest);

	await new Promise((resolve, reject) => {
		res.body.pipe(fileStream);
		res.body.on("error", reject);
		fileStream.on("finish", resolve);
	});
};

module.exports = download;
