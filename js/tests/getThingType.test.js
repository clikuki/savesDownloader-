const getThingType = require('../getThingType');

test('Returns \'comment\' for comment-type saves', () =>
{
	const thing = {
		name: 't1_123456',
	}

	expect(getThingType(thing)).toBe('comment');
});

test('Returns \'video\' for video-type saves', () =>
{
	const thing = {
		name: 't3_123456',
		secure_media: {},
		preview: {},
	}

	expect(getThingType(thing)).toBe('video');
});

test('Returns \'gallery\' for gallery-type saves', () =>
{
	const thing = {
		name: 't3_123456',
		secure_media: null,
		media_metadata: {},
		preview: {},
	}

	expect(getThingType(thing)).toBe('gallery');
});

test('Returns \'text\' for text-type saves', () =>
{
	const thing = {
		name: 't3_123456',
		secure_media: null,
	}

	expect(getThingType(thing)).toBe('text');
});

test('Returns \'image\' for image-type saves', () =>
{
	const thing = {
		name: 't3_123456',
		secure_media: null,
		preview: {},
	}

	expect(getThingType(thing)).toBe('image');
});
