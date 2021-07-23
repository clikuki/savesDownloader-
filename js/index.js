const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

// load in client ID and secret
const userInfo = (() =>
{ // load dev or user credentials
	try {
		return require('./dev.config.js');
	} catch (err) {
		return require('./userInfo.config.js');
	}
})();

const uri = 'https://jsonplaceholder.typicode.com/users';
// 'https://www.reddit.com/user/Clikuki/saved/'

fetch(uri, {
	method: 'GET',
	mode: 'cors',
	headers: {
		Accept: 'application/json',
	},
})
	.then(res => res.json())
	.then(json => json.map(user =>
		{
			return {
				person: user.name,
				geo: user.address.geo,
			};
		}))
	.then(console.log);
