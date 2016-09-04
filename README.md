# Balance Server

This turns a balance connected to the the computer into 
a WebSocket server that pushes readings. 


## Options


`--port=<port number>` sets the port that the WebSocket server will 
listen on. Defaults to port 3333. 


## Running 

A process monitor such as `pm2` or `forever` is suggested. 

``` bash
npm install -g pm2
pm2 start app.js
```

