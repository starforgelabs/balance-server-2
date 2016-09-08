# Balance Server

This turns a balance connected to the the computer into 
a WebSocket server that pushes readings. 

## Installing

### Node.js

The latest Node.js (6.5.0 as of this writing) is required as this
was written for ECMAScript 2015 (ES6). This can be obtained from
[the Node.js website](http://www.nodejs.org).

You can determine the version of Node.js  that is currently
installed on your machine by typing the following into a terminal:

``` bash
node --version
```

### git

The current version of `git` as of this writing is 2.10.0.
It can be obtained from [the git website](http://www.git-scm.com).

You can determine the version of `git`  that is currently
installed on your machine by typing the following into a terminal:

``` bash
git --version
```

#### Installation "Gotcha"

*Note:* These instructions were written against OS X *El Capitan*
version 10.11.16.

Note that if you download the `git` installer, 
and try to install it, 
that OS X may refuse to do so, 
saying that the `.pkg` file is from an unidentified developer. 

If you get this message, 
you need to temporarily disable the portion of OS X security that
controls this. 

1.  Go to `System Preferences...` under the Apple menu.
2.  Choose `Security and Privacy`.
3.  Locate the padlock at the bottom on the window, 
    which says, `Click the lock to make changes.` and click on it.
4.  Enter in the administrator password . 
5.  In the `General` tab, the lower half of the window has options
    with the description, `Allow apps downloaded from:`. 
    Select `Anywhere`. 
6.  OS X will give a warning, 
    `Choosing 'Anywhere' makes you Mac less secure.`
    Click on the button that says, `Allow From Anywhere`
    
Now OS X will allow you to install the latest version of git. 

**!!! Be sure to not leave the security setting as it is. !!!**
If you don't set the security setting back to where it was, 
your Mac is less secure. Do that similarly:

1.  Go to `System Preferences...` under the Apple menu.
2.  Choose `Security and Privacy`.
3.  Locate the padlock at the bottom on the window, 
    which says, `Click the lock to make changes.` and click on it.
4.  Enter in the administrator password . 
5.  In the `General` tab, the lower half of the window has options
    with the description, `Allow apps downloaded from:`. 
    Select `Mac App Store and identified developers`.


### Installing the program

Open up a terminal window and type the following:

```
git clone https://github.com/starforgelabs/balance-server-2.git
cd balance-server-2
npm install
```

## Options


`--port=<port number>` sets the port that the WebSocket server will 
listen on. Defaults to port 3333. 


## Running 

A process monitor such as `pm2` or `forever` is suggested. 

``` bash
sudo npm install -g pm2
pm2 start app.js
```

or

``` bash
sudo npm install -g forever
forever start app.js
```


## Debugging

Debugging information can ben enabled with the DEBUG environment
variable. There are three sections that can be enabled independently:

* *app* - The main application, which includes the WebSocket server. 
* *proxy* - The glue between a WebSocket connection and the serial port.
* *balance* - A wrapper for the serial port that pushes information
   with RxJS. 
   
To enable everything,


``` bash
export DEBUG="app proxy balance"
node app.js
```

## WebSocket Commands

The commands sent to the WebSocket server are 'stringified" JSON. 

The format of the JSON data can be found in the file `api.d.ts`.

### List Detected Serial Devices

This will return a `SerialList`, which is an array of 
`SerialPortResponse` objects. The important fields are:

*   `connected` - A boolean that indicates whether the server is 
    currently connected to this device.
*   `device` - The name of the device, which is passed to the 
    server in the `connect` command.
*   `prefer` - This is `true` when the device is detected as an FTDI 
    serial port. This suggests that the device is likely an
    Ohaus balance. 

Example: 

``` javascript
let ws = new WebSocket("ws://localhost:3333")
let command = { 
    command: "list"
}
ws.send(JSON.stringify(command))
```
    
### Connect to Serial Device

This will tell the server to try connecting to the given serial device.

Example: 

``` javascript
let ws = new WebSocket("ws://localhost:3333")
let command = { 
    command: "connect", 
    device: "/dev/cu-usbserial-000012FD" 
}
ws.send(JSON.stringify(command))
```
    
### Disconnect from Serial Device

This will tell the server to disconnect from the current serial device.

Example: 

``` javascript
let ws = new WebSocket("ws://localhost:3333")
let command = { 
    command: "disconnect"
}
ws.send(JSON.stringify(command))
```

#### Request Connection Status

This will tell the server to try connecting to the given serial device.

Example: 

``` javascript
let ws = new WebSocket("ws://localhost:3333")
let command = { 
    command: "status" 
}
ws.send(JSON.stringify(command))
```


