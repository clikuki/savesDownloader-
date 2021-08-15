const isComment = (() =>
{
	const getPrefix = (str) => str.substring(0, 3);

	return (name) =>
	{
		if(typeof name !== 'string') throw new Error('Invalid name: must be a string');

		if(getPrefix(name) === 't1_') return true;
		return false;
	}
})();

const getLinkType = (link) => {
	switch(true)
	{
		// if link has no secure_media prop, then throw an exception
		case (!{}.hasOwnProperty.call(link, 'secure_media')):
			throw new Error('Invalid argument: link-type does not have secure_media prop');

		case (link.secure_media !== null):
			return 'video';
		
		case ({}.hasOwnProperty.call(link, 'media_metadata')):
			return 'gallery';

		case (!{}.hasOwnProperty.call(link, 'preview')):
		case (!link.preview.enabled && link.selftext_html !== null):
			return 'text';

		default:
			return 'image';
	}
};

const isObject = (obj) =>
{
	return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

const getType = (thing) =>
{
	switch(true)
	{
		// throw exception if thing is not an object
		case (!isObject(thing)):
			throw new Error('Invalid argument: must be an object');

		case (isComment(thing.name)):
			return 'comment';

		default:
			return getLinkType(thing);
	}
}

module.exports = getType;
