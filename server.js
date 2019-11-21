const express = require('express');
const dotenv = require('dotenv').config();
const bodyParser = require('body-parser');
const app = express();
const PORT = 80;

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
	var pQuery = 'SELECT * FROM clients;';
	
	pool.query(pQuery, (err, result) => {
		if (err) {
			console.log(err);
			res.send(err);
		}
		else{
			console.log(result.rows[0]);
			res.send(result.rows[0]);
		}
	}); 
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

// CRUD

app.listen(PORT, () => {
	console.log('Application running on port: ' + PORT);
});
