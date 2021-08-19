const path = require('path');

const getRandFileName = (() =>
{
	const getRandString = (() =>
	{
		const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		const charsLen = chars.length;

		const getRandChar = () => chars.charAt(Math.floor(Math.random() * charsLen))

		return (minLen, maxLen) =>
		{
			const length = getRandomInt(minLen, maxLen);
			const fileName = Array.from({ length }, getRandChar).join('');

			return fileName;
		}
	})()

	const getExt = url => path.extname(url).split('?')[0];

	return (originalUrl, maxLen = 20, minLen = 10) =>
	{
		const name = getRandString(minLen, maxLen);
		const fileExtension = getExt(originalUrl);

		return `${name}${fileExtension}`;
	};
})();

module.exports = getRandFileName;
