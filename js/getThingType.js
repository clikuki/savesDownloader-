const isComment = (() =>
{
	const getPrefix = (str) => str.substring(0, 3);

	return (name) =>
	{
		const prefix = getPrefix(name);
		if(prefix === 't1_') return true;
		return false;
	}
})();

const getLinkType = (link) => {
	if(link.secure_media !== null) return 'video';
	if({}.hasOwnProperty.call(link, 'media_metadata')) return 'gallery';
	if(!{}.hasOwnProperty.call(link, 'preview')) return 'text';
	return 'image';
};

module.exports = (thing) =>
	{
		if(isComment(thing.name)) return 'comment';
		return getLinkType(thing);
	};