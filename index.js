const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];
const TOKEN_PATH = 'token.js';

fs.readFile('credentials.json', (err, content) => {
	if (err) return console.error('credentials load error:', err);
	authorize(JSON.parse(content), listFiles);
});

function authorize(credentials, callback) {
	const {client_secret, client_id, redirect_uris} = credentials.installed;
	const oAuth2Client = new google.auth.OAuth2(
		client_id, client_secret, redirect_uris[0]);

	fs.readFile(TOKEN_PATH, (err, token) => {
		if (err) return getAccessToken(oAuth2Client, callback);
		oAuth2Client.setCredentials(JSON.parse(token));
		callback(oAuth2Client);
	});
}

function getAccessToken(oAuth2Client, callback) {
	const authUrl = oAuth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES,
	});
	console.log('url to authorize: ', authUrl);

	const r1 = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	r1.question('code? ', (code) => {
		r1.close();
		oAuth2Client.getToken(code, (err, token) => {
			if (err) return console.error('token retrieval error', err);
			oAuth2Client.setCredentials(token);
			fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
				if (err) console.error(err);
				console.log('token stored to ', TOKEN_PATH);
			});
			callback(oAuth2Client);
		});
	});
}

function listFiles(auth) {
	const drive = google.drive({version: 'v3', auth});
	const fileFields = [
		'id',
		'name',
		'createdTime',
		'description',
		'fileExtension',
		'fullFileExtension',
		'imageMediaMetadata',
		'kind',
		'originalFilename',
		'parents',
		'properties',
		'quotaBytesUsed',
		'size',
		'webContentLink',
		'webViewLink'
	];

	drive.files.list({
		pageSize: 300,
		q: 'mimeType="image/jpeg"',
		fields: `nextPageToken, files(${fileFields.join(',')})`,
	}, (err, res) => {
		// console.log(res);
		fs.writeFile('data', JSON.stringify(res.data), (err) => {
			if (err) console.error(err);
			console.log('wrote data file');
		});
		if (err) return console.error('API error', err);
		const files = res.data.files;
		if (files.length) {
			console.log('FILES:');
			files.map((file) => {
				console.log(`${file.name} (${file.id})`);
			});
		} else {
			console.log('no files found');
		}
	});
}