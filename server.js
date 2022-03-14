const {WebSocket, WebSocketServer} = require('ws')
const fs = require('fs')

console.log("GOD Hoophouse management server starting")

//default config
const defaultConfig = {
	websocketPort: 3994
}
var config = defaultConfig
if (fs.existsSync('server-config.json')) {
	try {
		config = JSON.parse(fs.readFileSync('server-config.json'))
		console.log("Config parsed, validating...")
		//check that the config has all keys defualtConfig has
		for (const key in defaultConfig) {
			if (!Object.hasOwnProperty.call(config, key)) {
				throw new Error("Key missing! " + key)
			}
		}
		console.log("Validation successful.")
	} catch (error) {
		console.error("Failed to load configuration. The default config will now be used.")
		config = defaultConfig
		fs.renameSync('server-config.json','broken-server-config.json')
		console.error("Your changes are backed up to broken-server-config.json")
		console.error(error.stack)
		console.log("Using default config...")
		fs.writeFileSync('server-config.json', JSON.stringify(config))
	}
	
} else {
	//save default config for user modification
	fs.writeFileSync('server-config.json', JSON.stringify(config))
	console.log("Default config file saved to server-config.json")
}


const wss = new WebSocketServer({ port: config.websocketPort })



console.log("Websocket server started on "+wss.options.port)