const fetch = require('node-fetch');
const fs = require('fs');

const download = async (url, dest, fileName) => {
	const res = await fetch(url);
	const fileStream = fs.createWriteStream(dest + fileName);

	return new Promise((resolve, reject) => {
		res.body.pipe(fileStream);
		res.body.on("error", reject);
		fileStream.on("finish", resolve);
	});
};

module.exports = download;
