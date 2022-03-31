const {WebSocket, WebSocketServer} = require('ws')
const { sendTo, decodeFrom } = require('./MessageUtil')
const sensor = require("node-dht-sensor").promises;
const Gpio = require('onoff').Gpio;
const PiCamera = require('pi-camera');
const fs = require('fs')

console.log("Hoop house stating up...")

//#region configuration
console.log("Reading user config...")
//default config
const defaultConfig = {
	websocketURL: "ws://localhost:3994/",
	key: false,
	useCamera: true
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
var managementTimer = -1
var watchSyncTimer = -1
var camera = null
var cameraBusy = false

var doorOpen = false

//#region gpio pins
const PMWB = new Gpio(22, 'out');
const BIN1 = new Gpio(17, 'out');
const BIN2 = new Gpio(27, 'out');
const STBY = new Gpio(18, 'out');

PMWB.writeSync(1)

setTimeout(()=>{
	closeDoor()
},1000)
//#endregion


if(save.state=="first"){
	console.log("We don't have a config or ID, so we cannot act yet. We will now try to register with the server at " + config.websocketURL + " to retreive information.")
	beginCommunication()
}else if(save.state=="ok"){
	console.log(`Our ID is ${save.id}, Launching services.`)
	setupCamera()
	beginCommunication()
	rescheduleAll()
}


function doManagement(){
	if(save.auto){
		console.log("[AUTO] Gathering data to attempt management")
		getSensorDataAsync().then((sensorData)=>{
			console.log("[AUTO] Got data")
			console.log(sensorData)
			console.log(save.config)
			if(sensorData.temperature < save.config.mintemp) {
				console.log("[AUTO] Closing door due to temperature")
				closeDoor()
				return
			}else if(sensorData.temperature > save.config.maxtemp) {
				console.log("[AUTO] Opening door due to temperature")
				openDoor()
				return
			}else {
				if(sensorData.humidity>save.config.targethumid){
					console.log("[AUTO] Opening door due to humidity")
					openDoor()
					return
				}else{
					console.log("[AUTO] Closing door due to humidity")
					closeDoor()
					return
				}
			}
		})
	}
	console.log("Auto off, skipping management")
	
}

function rescheduleAll(){
	console.log("Rescheduling timers")
	if(syncTimer >= 0){
		console.log("Unsheduling sync")
		clearInterval(syncTimer)
		syncTimer = -1
	}
	if(ws != null){
		console.log(`Sync scheduled for every ${save.syncTime}ms`)
		syncTimer = setInterval(syncToServer, save.syncTime)
	}
	if(managementTimer >= 0){
		console.log("Unsheduling management")
		clearInterval(managementTimer)
		syncTimer = -1
	}
	console.log(`Management scheduled for every ${save.managementTick}ms`)
	managementTimer = setInterval(doManagement, save.managementTick)
}

function syncToServer(forWatch){
	console.log("Gathering data for server sync...")
	getSensorDataAsync().then((sensorData)=>{
		if(sensorData==undefined){
			console.log("Unable to sync.")
			return
		}
		sendTo(ws,{
			type: "sync",
			doorOpen: getIsDoorOpen(),
			temperature: sensorData.temperature,
			humidity: sensorData.humidity,
			forWatch: forWatch
		}, config.key)
		console.log("Sync sent.")
	})
	if (camera != null&&!cameraBusy) {
		cameraBusy = true
		camera.snapDataUrl().then((result) => {
			cameraBusy = false
			sendTo(ws, {type:"image", image: result},config.key)
		})
		.catch((error) => {
			cameraBusy = false
			console.warn("Unable to capture image")
			console.warn(error)
		});
	}
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
		if(watchSyncTimer>=0){
			console.log("Stopping watched sync rotine.")
			clearTimeout(watchSyncTimer)
			watchSyncTimer = -1
		}
		ws = null
		rescheduleAll()
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
					getSensorDataAsync().then((sensorData)=>{
						if(sensorData==undefined){
							console.log("Unable to sync. Will now close socket.")
							ws.close()
							return
						}
						let initialFrame = {
							doorOpen: getIsDoorOpen(),
							temperature: sensorData.temperature,
							humidity: sensorData.getHumidity
						}
						console.log("Registering...")
						sendTo(ws,{type: "am new hoop", initialFrame},config.key)
					})
					
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
				save.managementTick = message.managementTickMS
				if(save.state=="first"){//this is our first sync
					console.log("Successfully registered. Our ID is " + save.id)
					setupCamera()
				}
				save.state = "ok"
				saveState()
				rescheduleAll()
				syncToServer()
				break;
		
			case 'watched?': 
				if(message.isWatched){
					if(watchSyncTimer<0){
						console.log("Starting watched sync rotine.")
						watchSyncTimer = setInterval(()=>{
							syncToServer(true)
						}, save.syncTimeWatched)
					}
				}else{
					if(watchSyncTimer>=0){
						console.log("Stopping watched sync rotine.")
						clearTimeout(watchSyncTimer)
						watchSyncTimer = -1
					}
				}
				break;

			case "toggle door":
				if(doorOpen){
					closeDoor()
				}else{
					openDoor()
				}
				syncToServer()
				break;

			default:
				console.log("Unhandled type received from server:")
				console.log(message)
				break;
		}
	}
}

function setupCamera(){
	if(config.useCamera){
		camera = new PiCamera({
			mode: 'photo',
			width: 640,
			height: 480,
			nopreview: true,
		});
	}
}

//#region information gathering
function getIsDoorOpen(){
	return doorOpen
}
async function getSensorDataAsync() {
	try {
	  return await sensor.read(22, 4);
	} catch (err) {
	  console.error("Failed to read sensor data:", err);
	}
	// return {temperature: 10, humidity: 10}
}
function openDoor(){
	if(doorOpen==true){
		return
	}
	doorOpen = true

	BIN1.writeSync(1)
	BIN2.writeSync(0)

	STBY.writeSync(1)

	setTimeout(()=>{
		STBY.writeSync(0)
		// BIN1.writeSync(0)
		// BIN2.writeSync(0)
	},075)
	console.log("DOOR OPENING")
}
function closeDoor(){
	if(doorOpen==false){
		return
	}
	doorOpen = false

	BIN1.writeSync(0)
	BIN2.writeSync(1)

	STBY.writeSync(1)

	setTimeout(()=>{
		STBY.writeSync(0)
		// BIN1.writeSync(0)
		// BIN2.writeSync(0)
	},3000)
	console.log("DOOR CLOSING")
}
//#endregion