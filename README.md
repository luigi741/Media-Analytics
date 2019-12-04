# AAA Server

For our cloud computing services, we use the following command for hosting the test server `sudo npm start`

This will allow all the server API functionality to be accessible. 

This portion of the server is run on Port 80 (the default port).

You must set a `.env` file with the following variables for this API to function properly: 

```
INSTANCE_ADDR=<public ip or host domain>
INSTANCE_PORT=<port to run the postgres database on>
SQL_USER=<postgres database username>
SQL_PASSWORD=<postgres database password>
DB_NAME=<database name>
BEARER_TOKEN=<Twitter bearer token>
```