const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const download = async (url, dest, autoFileName = true) => {
	if(autoFileName) dest += path.basename(url);

	const res = await fetch(url);
	const fileStream = fs.createWriteStream(dest);

	return new Promise((resolve, reject) => {
		res.body.pipe(fileStream);
		res.body.on("error", reject);
		fileStream.on("finish", resolve);
	});
};

module.exports = download;
