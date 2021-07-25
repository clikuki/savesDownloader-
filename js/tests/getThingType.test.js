const getThingType = require('../getThingType');

const name = {
	comment: 't1_123456',
	link: 't3_123456',
}

test('Returns \'comment\' for comment-type saves', () =>
{
	const thing = {
		name: name.comment,
	}

	expect(getThingType(thing)).toBe('comment');
});

test('Returns \'video\' for video-type saves', () =>
{
	const thing = {
		name: name.link,
		secure_media: {},
		preview: {},
	}

	expect(getThingType(thing)).toBe('video');
});

test('Returns \'gallery\' for gallery-type saves', () =>
{
	const thing = {
		name: name.link,
		secure_media: null,
		media_metadata: {},
		preview: {},
	}

	expect(getThingType(thing)).toBe('gallery');
});

test('Returns \'text\' for text-type saves', () =>
{
	const thing = {
		name: name.link,
		secure_media: null,
	}

	expect(getThingType(thing)).toBe('text');
});

test('Returns \'image\' for image-type saves', () =>
{
	const thing = {
		name: name.link,
		secure_media: null,
		preview: {},
	}

	expect(getThingType(thing)).toBe('image');
});

test('Throws an exception if argument is not an object', () =>
{
	const errRegex = /object/i;

	expect((() => getThingType(undefined))).toThrow(errRegex);
	expect((() => getThingType(null))).toThrow(errRegex);
	expect((() => getThingType(false))).toThrow(errRegex);
	expect((() => getThingType(true))).toThrow(errRegex);
	expect((() => getThingType(0))).toThrow(errRegex);
	expect((() => getThingType(1))).toThrow(errRegex);
	expect((() => getThingType([]))).toThrow(errRegex);
});

test('Throws an exception if argument is not a comment but has no secure_media prop', () =>
{
	const thing = {
		name: name.link,
		preview: {},
	}

	const errRegex = /secure_media/i

	expect(() => getThingType(thing)).toThrow(errRegex);
});

test('Throws an exception if argument name prop is undefined or not a string', () => {
	const errRegex = /string/i;

	expect(() => getThingType({})).toThrow(errRegex);
	expect(() => getThingType({ name: [] })).toThrow(errRegex);
});
