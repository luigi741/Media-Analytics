const express 		= require('express');
const dotenv 		= require('dotenv').config();
const bodyParser 	= require('body-parser');
const https			= require('https');
const request		= require('request');
const app 			= express();
const PORT 			= 80;

const { Pool, Client } = require('pg');
const pool = new Pool({
	user:       process.env.SQL_USER,
	host:       process.env.INSTANCE_ADDR,
	database:   process.env.DB_NAME,
	password:   process.env.SQL_PASSWORD,
	port:       process.env.INSTANCE_PORT
});

app.use(
	bodyParser.urlencoded({ extended: true }),
	bodyParser.json()
);

app.get('/', (req, res) => {
	console.log('GET /');
	res.send('GET /');
});

app.get('/sql', (req, res) => {
	console.log('GET /sql');
	var pQuery = 'SELECT * FROM tweets;';
	
	pool.query(pQuery, (err, result) => {
		if (err) {
			console.log(err);
			res.send(err);
		}
		else {
			console.log(result.rows[0]);
			res.send(result.rows[0]);
		}
	}); 
});

// http://{COMPUTER ENGINE IP}/tweets?keyword={HASHTAG SEARCH}
app.get('/tweets', (req, res) => {
	console.log(req.query);
	// const twitterAPI = 'https://api.twitter.com/1.1/search/tweets.json?q=%23ai%20-filter%3Aretweets&result_type=recent&tweet_mode=extended';

	const twitterAPI = `https://api.twitter.com/1.1/search/tweets.json?q=3%23${req.query.keyword}%20-filter%3Aretweets&result_type=popular&tweet_mode=extended`;

	var options = {
		url: twitterAPI,
		headers: {
			'Authorization': `Bearer ${process.env.BEARER_TOKEN}`
		}
	};

	function requestCallback(error, response, body) {
		if (!error && response.statusCode == 200) {
			var info = JSON.parse(body);
			var statuses = info.statuses
			
			console.log(`Posts: ${statuses.length}`);
			for (var i = 0; i < statuses.length; i++) {
				console.log(statuses[i].full_text + '\n');
			}
			console.log('Twitter API success.');

			res.send('Twitter API request successful!');
		}
		else {
			res.send('There was an error making a request to the Twitter API');
		}
	}

	request(options, requestCallback);
});

app.post('/testinsert', (req, res) => {
	console.log('POST /testinsert');
	var pQuery = "INSERT INTO tweets VALUES ('twitter.com', 'test', 'ai', 'AI is cool');";

	pool.query(pQuery, (err, results) => {
		if (err) {
			console.log(err);
			res.send(err);
		}
		else {
			console.log('Successful insert!');
			res.send('Successful insert!');
		}
	});
});

app.listen(PORT, () => {
	console.log('Application running on port: ' + PORT);
});


//================================================
// screen - Linux commands
// 
// $ screen -ls => list all screens
// $ screen -r {SCREEN #} => Reattach
// CTRL + A + D => Detach