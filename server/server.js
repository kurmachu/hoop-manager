const {WebSocket, WebSocketServer} = require('ws')
const fs = require('fs')
const ClientIdentifier = require('./ClientIdentifier')
const ClientSocket = require('./ClientSocket')
const HoopHouse = require('./HoopHouse')
const { randomUUID } = require('crypto');

console.log("GOD Hoophouse management server starting")

//#region configuration
//default config
const defaultConfig = {
	websocketPort: 3994,
	key: false,
	syncHousesEveryMS: 60000,
	syncHousesEveryWatchedMS: 5000,
	managementTickMS: 60*1000,
}
var config = defaultConfig
if (fs.existsSync('server-config.json')) {
	try {
		config = JSON.parse(fs.readFileSync('server-config.json'))
		console.log("Config parsed, validating...")
		//check that the config has all keys defaultConfig has
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
// var hoopHouses = [
// 	new HoopHouse({
// 		name: "Tomatoes",
// 		doorOpen: false,
// 		auto: true,
// 		temperature: 21,
// 		humidity: 95,
// 		lastUpdate: 1646938367383,
// 		connected: false,
// 		config: [],
// 		id: "test"
// 	}, config)
// ]
var hoopHouses = []
if (fs.existsSync('./save/houses.json')) {
	console.log("Loading houses...")
	try {
		let hoopHouseInfo = JSON.parse(fs.readFileSync('./save/houses.json'))
		hoopHouseInfo.forEach((house)=>{
			hoopHouses.push(new HoopHouse(house, config))
			console.log("Loaded " + house.name)
		})
	} catch (error) {
		console.error("EXCEPTION THROWN WHILE LOADING HOOP HOUSES! THIS IS VERY BAD!")
		console.error(error.stack)
		console.error("This error is unrecoverable; possible data corruption. Consult manual immediately.")
		process.exit(1)
	}
}else{
	console.log("House save file not found, skipping...")
}
hoopHouses.forEach((house)=>{
	house.on('changed', ()=>{
		console.log("Saving houses to disk...")
		saveHouses()
	})
})

function saveHouses() {
	let hoopHouseInfo = []
	hoopHouses.forEach((house, i)=>{
		hoopHouseInfo[i] = house.serialize(true)
	})
	if(!fs.existsSync('./save/')){
		fs.mkdirSync('./save/')
	}
	fs.writeFileSync('./save/houses.json', JSON.stringify(hoopHouseInfo))
}

var clients = []

wss.on('connection', function connection(ws) {
	console.log("-> Incoming connection")
	let identifier = new ClientIdentifier(ws, config) //Send client off to be identified

	identifier.on('found-client', (clientIdentifier)=>{

		let newClient = new ClientSocket(clientIdentifier.eject(), config, clients, hoopHouses)
		let newLength = clients.push(newClient)
		console.log(`Added to -> Clients (now at ${newLength})`)

	})

	identifier.on('found-new-hoop', (clientIdentifier, initialFrame)=>{

		let newID = randomUUID()
		let newHoophouse = new HoopHouse({
			name: "Unnamed",
			doorOpen: initialFrame.doorOpen,
			auto: false,
			temperature: Math.floor(initialFrame.temperature),
			humidity: Math.floor(initialFrame.humidity),
			lastUpdate: new Date().getTime(),
			config: {
				mintemp: 18,
				maxtemp: 26,
				targethumid: 85
			},
			id: newID
		}, config)
		newHoophouse.attatchWS(clientIdentifier.eject())
		hoopHouses.push(newHoophouse)
		saveHouses()
		clients.forEach((client)=>{
			client.requestRefresh()
		})
		newHoophouse.on('changed', ()=>{ //Fix that save bug
			console.log("Saving houses to disk...")
			saveHouses()
		})
		console.log("Welcomed new hoop house -> "+newID)
	})

	identifier.on('found-hoop', (clientIdentifier, id)=>{
		for (const hoopHouse of hoopHouses) {
			if(hoopHouse.id == id){
				hoopHouse.attatchWS(clientIdentifier.eject())
				return
			}
		}
		//We didn't find a hoophouse
		let ws = clientIdentifier.eject()
		console.log(`Kicking unknown hoophouse ID ${id} -> [X]`)
		ws.send(JSON.stringify({type: "you don't exist"}))
		ws.close()
	})

});

console.log("Websocket server started on "+wss.options.port)