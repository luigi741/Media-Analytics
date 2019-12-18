const express 		= require('express');
const dotenv 		= require('dotenv').config();
const bodyParser 	= require('body-parser');
const https			= require('https');
const request		= require('request');
const app 			= express();
const PORT 			= 80;
const cors			= require('cors');

//Sets the parameters for accessing the database. 
const { Pool, Client } = require('pg');
const pool = new Pool({
	user:       process.env.SQL_USER,
	host:       process.env.INSTANCE_ADDR,
	database:   process.env.DB_NAME,
	password:   process.env.SQL_PASSWORD,
	port:       process.env.INSTANCE_PORT
});

app.use(cors());

app.use(
	bodyParser.urlencoded({ extended: true }),
	bodyParser.json()
);

//A function that displays when the frontend is not active. 
app.get('/', (req, res) => {
	console.log('GET /');
	res.send('GET /');
});

//A debugging function to get results from the tweets table
app.get('/sql', (req, res) => {
	console.log('GET /sql');
	var pQuery = 'SELECT * FROM tweets;';
	
	pool.query(pQuery, (err, result) => {
		if (err) {
			console.log(err);
			res.send(err);
		}
		else {
			for (var n = 0; n < result.rows.length; n++) {
				console.log(result.rows[n]);
			}
			res.json(result.rows);
		}
	}); 
});

//This gets the currently active table's schema. 
app.get('/schema', (req, res) => {
	console.log('GET /schema');
	var pQuery = 'SELECT column_name, data_type, character_maximum_length FROM INFORMATION_SCHEMA.COLUMNS where table_name = \'tweets\';';
	
	pool.query(pQuery, (err, result) => {
		if (err) {
			console.log(err);
			res.send(err);
		}
		else {
			for (var n = 0; n < result.rows.length; n++) {
				console.log(result.rows[n]);
			}
			res.send('schema sent');
		}
	}); 
});

//This drops the tweet table to allow for new data to be populated. 
app.get('/droptweets', (req, res) => {
	console.log('GET /droptweets');
	var pQuery = 'DROP TABLE IF EXISTS tweets';
	pool.query(pQuery, (err, result) => {
		if (err) {
			console.log(err);
			res.send(err);
		}
		else {
			console.log('tweets table has been dropped');
			res.send('tweets table has been dropped');
		}
	}); 
});

//This is used to create tweets, function primarily used during testing phase. 
app.get('/createtweets', (req, res) => {
	console.log('GET /createtweets');
	var pQuery = 'CREATE TABLE tweets( username varchar, url varchar, hashtag varchar, score numeric(2,1), description varchar);';
	//user varchar(255), , desc varchar(255)
	
	pool.query(pQuery, (err, result) => {
		if (err) {
			console.log(err);
			res.send(err);
		}
		else {
			console.log('tweets table has been created');
			res.send('tweets table has been created');
		}
	}); 
});

//This is used to grab tweets from the Twitter API using the specified search term. It includes API calls. 
//It also adds the tweets to the tweets table on the database. 
// http://{COMPUTER ENGINE IP}/tweets?keyword={HASHTAG SEARCH}
app.get('/tweets', (req, res) => {
	console.log(req.query);

	const twitterAPI = `https://api.twitter.com/1.1/search/tweets.json?q=3%23${req.query.keyword}%20-filter%3Aretweets&result_type=recent&tweet_mode=extended&lang=en`;
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

			var pQuery;
			var link;
			var hashtags;
			var description;
			var score;
			var username;

			for (var i = 0; i < statuses.length; i++) {
				
				//Debugging Code
				//console.log(statuses[i]); Prints .json for debugging
				// console.log('https://twitter.com/' + statuses[i].user.screen_name + '/status/' + statuses[i].id_str);
				// for (var k = 0; k < statuses[i].entities.hashtags.length; k++){
				// 	console.log(statuses[i].entities.hashtags[k].text + ', ');
				// }
				// console.log(statuses[i].full_text + '\n');
				// console.log(statuses[i].user.screen_name);
				
				link  = 'https://twitter.com/' + statuses[i].user.screen_name + '/status/' + statuses[i].id_str;
				hashtags = statuses[i].entities.hashtags[0].text;
				for (var k = 1; k < statuses[i].entities.hashtags.length; k++){
					var temptags = hashtags; 
					hashtags = temptags + ', ' + statuses[i].entities.hashtags[k].text;
				}
				description = statuses[i].full_text;
				score = 0;
				username = statuses[i].user.screen_name;

				pQuery = "INSERT INTO tweets VALUES('" + username + "', '" + link + "', '" + hashtags + "', '" + score + "', '" + description + "');";
				pool.query(pQuery, (err, results) => {
					if (err) {
						console.log(err);
					}
					else {
						console.log('Successful insert!');
					}
				});
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

app.get('/tweets2', (req, res) => {

	console.log('GET /tweets2');
	console.log(req.query);

	var options = { 
		method: 'GET',
		url: 'https://api.twitter.com/1.1/search/tweets.json',
		qs: {
			q: `%23${req.query.keyword}%20-filter%3Aretweets`,
			result_type: 'recent',
			tweet_mode: 'extended'
		},
		headers: { 
			Authorization: `Bearer ${process.env.BEARER_TOKEN}`
		}
	};

	request(options, (error, response, body) => {
		if (error) {
			throw new Error(error);    
		}
		else {
			let responseBody = JSON.parse(body);
			let numTweets = responseBody.statuses.length;
			let sentimentScores = [];

			console.log(`Number of tweets: ${responseBody.statuses.length}`);
			
			for (let i = 0; i < numTweets; i++) {
				let googleBody = {
					"document": {
						"type": "PLAIN_TEXT",
						"language": "en",
						"content": `${responseBody.statuses[i].full_text}`
					},
					"encodingType": "UTF16"
				}
				
				let googleOptions = {
					method: 'POST',
					url: `https://language.googleapis.com/v1/documents:analyzeSentiment?key=${process.env.G_API_KEY}`,
					json: googleBody 
				}

				request(googleOptions, (error, response, body) => {
					if (error) {
						throw new Error(error);
					}
					else {
						console.log(body);
						
						sentimentScores[i] = {
							
						}

						console.log("sentiment scores here" + sentimentScores[i]);
					}
				});
			}

			res.send(responseBody.statuses[0].full_text);
		}
	});
});

app.post('/sentiment', (req, res) => {
	const NLAPI = `https://language.googleapis.com/v1/documents:analyzeSentiment?key=${process.env.key}`;
	var body = {
		"document": {
			"type": "PLAIN_TEXT",
			"language": "en",
			"content": "string"
	  },
	  "encodingType": "UTF16"
	}

	body.document.content = "hello world";

	function requestCallback(error, response, body) {
		if (!error && response.statusCode == 200) {
			var info = JSON.parse(body);
			var statuses = info.statuses;
			
			console.log(`Posts: ${statuses.length}`);

			var description;
			var score;
			var username;

			pQuery = "UPDATE tweets SET score = " + score + " WHERE description = " + description + ";";	
			//pQuery = "INSERT INTO tweets VALUES('" + username + "', '" + link + "', '" + hashtags + "', '" + score + "', '" + description + "');";
			pool.query(pQuery, (err, results) => {
				if (err) {
					console.log(err);
				}
				else {
					console.log('Successful insert!');
				}
			});

			// for (var i = 0; i < statuses.length; i++) {
				
			// 	//Debugging Code
			// 	//console.log(statuses[i]); Prints .json for debugging
			// 	// console.log('https://twitter.com/' + statuses[i].user.screen_name + '/status/' + statuses[i].id_str);
			// 	// for (var k = 0; k < statuses[i].entities.hashtags.length; k++){
			// 	// 	console.log(statuses[i].entities.hashtags[k].text + ', ');
			// 	// }
			// 	// console.log(statuses[i].full_text + '\n');
			// 	// console.log(statuses[i].user.screen_name);
				
			// 	link  = 'https://twitter.com/' + statuses[i].user.screen_name + '/status/' + statuses[i].id_str;
			// 	hashtags = statuses[i].entities.hashtags[0].text;
			// 	for (var k = 1; k < statuses[i].entities.hashtags.length; k++){
			// 		var temptags = hashtags; 
			// 		hashtags = temptags + ', ' + statuses[i].entities.hashtags[k].text;
			// 	}
			// 	description = statuses[i].full_text;
			// 	score = 0;
			// 	username = statuses[i].user.screen_name;

			// 	pQuery = "INSERT INTO tweets VALUES('" + username + "', '" + link + "', '" + hashtags + "', '" + score + "', '" + description + "');";
			// 	pool.query(pQuery, (err, results) => {
			// 		if (err) {
			// 			console.log(err);
			// 		}
			// 		else {
			// 			console.log('Successful insert!');
			// 		}
			// 	});
			// }
			console.log('Google NL API success.');

			res.send('Sentiment Analysis successful!');
		}
		else {
			res.send('There was an error making a request to the TGoogle NL API');
		}
	}

	request(options, requestCallback);
});

//Used to insert a tweet into the database. 
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

//Used to clear the tweets in the database
app.get('/cleartweets', (req, res) => {
	console.log('GET /cleartweets');
	var pQuery = "DELETE FROM tweets;";

	pool.query(pQuery, (err, results) => {
		if (err) {
			console.log(err);
			res.send(err);
		}
		else {
			console.log('Successful clear!');
			res.send('Successful clear!');
		}
	});
});

//Logs the currently active port. 
app.listen(PORT, () => {
	console.log('Application running on port: ' + PORT);
});