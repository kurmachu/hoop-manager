const {WebSocket, WebSocketServer} = require('ws')
const { sendTo, decodeFrom } = require('./MessageUtil')
const fs = require('fs')

console.log("Hoop house stating up...")

//#region configuration
console.log("Reading user config...")
//default config
const defaultConfig = {
	websocketURL: "ws://localhost:3994/",
	key: false
}
var config = defaultConfig
if (fs.existsSync('config.json')) {
	try {
		config = JSON.parse(fs.readFileSync('config.json'))
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
		fs.renameSync('config.json','broken-config.json')
		console.error("Your changes are backed up to broken-config.json")
		console.error(error.stack)
		console.log("Using default config...")
		fs.writeFileSync('config.json', JSON.stringify(config))
	}
	
} else {
	//save default config for user modification
	fs.writeFileSync('config.json', JSON.stringify(config))
	console.log("Default config file saved to config.json")
}
//#endregion

console.log("Reading save...")
var save = {
	state: "first"
}
try {
	if(fs.existsSync('save.json')){
		save = JSON.parse(fs.readFileSync('save.json'))
		console.log("Loaded save.")
	}else{
		console.log("No save file found.")
	}
}catch (e){
	console.error("Failed to load save. This is unrecoverable. Refer to manual.")
	console.error(e.stack)
	process.exit(1)
}
function saveState() {
	fs.writeFileSync('save.json', JSON.stringify(save))
}


var ws = null
var retryTime = 10*1000
var syncTimer = -1

if(save.state=="first"){
	console.log("We don't have a config or ID, so we cannot act yet. We will now try to register with the server at " + config.websocketURL + " to retreive information.")
	beginCommunication()
}else if(save.state=="ok"){
	console.log(`Our ID is ${save.id}, Launching services.`)
	beginManagement()
	beginCommunication()
}


function beginManagement(){
	console.log("Beginning management.")
	//TODO management
}

function rescheduleSync(){
	if(syncTimer > 0){
		console.log("Unsheduling sync")
		clearInterval(syncTimer)
		syncTimer = 0
	}
	if(ws != null){
		console.log(`Sync scheduled for every ${save.syncTime}ms`)
		syncTimer = setInterval(syncToServer, save.syncTime)
	}
}

function syncToServer(){
	console.log("Performing server sync...")
	sendTo(ws,{
		type: "sync",
		doorOpen: getIsDoorOpen(),
		temperature: getTemperature(),
		humidity: getHumidity()
	}, config.key)
}

function beginCommunication(){
	if(ws != null){
		ws.close()//will retry automatically
		return
	}
	try {
		console.log("Connecting to the server...")
		ws = new WebSocket(config.websocketURL);
	}catch (e){
		console.error("Failed to open websocket to server")
		console.error(e.stack)
		console.log(`Will retry in ${retryTime}ms.`)
		ws = null
		setTimeout(() => {
			retryTime = retryTime* 1.2
			if(retryTime > 30*60*1000){
				retryTime = 30*60*1000
			}
			beginCommunication()
		}, retryTime);
	}
	ws.onerror = (e)=>{
		console.warn("A websocket error has occured.")
		console.error(e.error.stack)
	}
	ws.onclose = ()=>{
		console.log(`Connection to server closed. Will retry in ${retryTime}ms.`)
		ws = null
		rescheduleSync()
		setTimeout(() => {
			retryTime = retryTime* 1.2
			if(retryTime > 30*60*1000){
				retryTime = 30*60*1000
			}
			beginCommunication()
		}, retryTime);
	}
	ws.onmessage = (data)=>{
		message = decodeFrom(data.data, config.key)
		switch (message.type) {
			case 'hello':
				if(save.state == "first"){
					console.log("Attemting to register with server...")
					console.log("Gathering information for initial frame...")
					let initialFrame = {
						doorOpen: getIsDoorOpen(),
						temperature: getTemperature(),
						humidity: getHumidity()
					}
					console.log("Registering...")
					sendTo(ws,{type: "am new hoop", initialFrame},config.key)
				}else{
					sendTo(ws,{type: "am hoop", id: save.id},config.key)
				}
				break;

			case 'sync': 
				console.log("Received sync from server.")
				save.auto = message.auto
				save.config = message.config
				save.id = message.id
				save.syncTime = message.syncHousesEveryMS
				save.syncTimeWatched = message.syncHousesEveryWatchedMS
				save.syncTimeOffline = message.offlineRecordTempEveryMS
				if(save.state=="first"){//this is our first sync
					console.log("Successfully registered. Our ID is " + save.id)
					beginManagement()
				}
				save.state = "ok"
				saveState()
				rescheduleSync()
				break;
		
			default:
				console.log("Unhandled type received from server:")
				console.log(message)
				break;
		}
	}
}

//#region information gathering
function getIsDoorOpen(){
	return false //TODO ACTUALLY GET VALUE
}
function getTemperature(){
	return 27 //TODO ACTUALLY GET VALUE
}
function getHumidity(){
	return 99 //TODO ACTUALLY GET VALUE
}
//#endregion