# Saves Downloader plus
A node.js program for downloading your saved posts in reddit

## Installing
First, you will need to have node and npm installed. Go to [Node.js download page](https://nodejs.org/en/download/) and download node. The package includes npm too, so all you have to do is run the node installer. Verify that you have downloaded node correctly by opening command prompt and entering `node -v` into the console.

Once you have node installed, download the program by going under the releases tab. Unzip it, then navigate to the folder with `cd "File path to program files"`. Once you have navigated to the folder, enter `npm install` to download the dependecies required. Once you have done that, you can run the program now. The only thing you'll need to do is to enter your username, password, and client ID and secret.

## Getting your client ID and secret
First, go to <https://www.reddit.com/prefs/apps> and click create app. It will then ask for the following-

> name - Enter whatever you want, it doesn't matter  
> web app, installed app, or script - Click script, as this will only run on command prompt  
> description - You can leave this empty  
> about url - You can leave this empty  
> redirect url - Set this to https://www.reddit.com  

After filling it out, it will show up under **developed applications**. To get the client ID, copy the string beside the icon (or under the words "personal use script"). To get the client secret, click on edit then copy the string beside **secret**.

## Entering your user credentials to the program
Go to the program folder, go to the folder named js, and open `userInfo.js` with a text editor such as notepad or VSCode. Then, find the area to put your credentials. It will look like this:
```javascript
module.exports = {
	CLIENT_SECRET: 'Client secret here',
	CLIENT_ID: 'Client ID here',
	USERNAME: 'Username here',
	PASSWORD: 'Pwd here',
	FETCHLIMIT: undefined,
	PARALLELDOWNLOADS: undefined,
	UNSAVE: undefined,
}
```
Replace the strings between the single quotes with their respective information, then hit save.

## Running the program
To run it, open command prompt and navigate to the folder with `cd "path to program files"`.
Then enter `node . limit='num of saves' parallel='num of files to download at a time' unsave='true to unsave, false otherwise'`. Replace the values between the apostrophes with your values.

## Adding default parameters
To avoid having to enter params for the program every time you run it, you can add default values.
Go to the program folder, go to the folder named js, and open `userInfo.js` with a text editor such as notepad or VSCode.
Then, replace these parameters with your own values:
> FETCHLIMIT - Number of saves to fetch from Reddit.com  
> PARALLELDOWNLOADS - Number of files to download at a time.  
> UNSAVE - Whether the program remove submissions from your saves. Its a good idea to set this to True  
