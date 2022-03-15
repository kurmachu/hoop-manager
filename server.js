const {WebSocket, WebSocketServer} = require('ws')
const fs = require('fs')
const ClientIdentifier = require('./server/ClientIdentifier')
const ClientSocket = require('./server/ClientSocket')

console.log("GOD Hoophouse management server starting")

//#region configuration
//default config
const defaultConfig = {
	websocketPort: 3994,
	key: false
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
//#endregion

const wss = new WebSocketServer({ port: config.websocketPort })

//TODO actually load hoop houses
var hoopHouses = [
	{
		name: "Tomatoes",
		doorOpen: false,
		auto: true,
		temperature: 21,
		humidity: 95,
		lastUpdate: 1646938367383,
		connected: false
	},
	{
		name: "Tomatoes",
		doorOpen: false,
		auto: true,
		temperature: 21,
		humidity: 95,
		lastUpdate: 1646938367383,
		connected: false
	}
]

var clients = []

wss.on('connection', function connection(ws) {
	console.log("-> Incoming connection")
	let identifier = new ClientIdentifier(ws, config) //Send client off to be identified

	identifier.on('found-client', (clientIdentifier)=>{

		let newClient = new ClientSocket(clientIdentifier.eject(), config, clients, hoopHouses)
		let newLength = clients.push(newClient)
		console.log(`Added to -> Clients (now at ${newLength})`)

	})

});

console.log("Websocket server started on "+wss.options.port)