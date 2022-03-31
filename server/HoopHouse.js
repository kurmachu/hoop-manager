const EventEmitter = require('events')
const { sendTo, decodeFrom } = require('./MessageUtil')
const fs = require('fs')

module.exports = class ClientSocket extends EventEmitter {

	//server-only vars
	name
	lastUpdate

	//should sync
	auto
	config
	id

	//from client
	humidity
	temperature
	doorOpen

	//transients
	image

	//other
	log = []
	ws = null

	//infrastructure
	serverConfig
	key

	constructor(persistantData, config){
		super()

		this.name = persistantData.name
		this.lastUpdate = persistantData.lastUpdate
		this.auto = persistantData.auto
		this.config = persistantData.config
		this.id = persistantData.id
		this.humidity = persistantData.humidity
		this.temperature = persistantData.temperature
		this.doorOpen = persistantData.doorOpen
		this.log = persistantData.log

		this.serverConfig = config
		this.key = this.serverConfig.key
	}

	serialize(full) {
		return full? {
			name: this.name,
			lastUpdate: this.lastUpdate,
			auto: this.auto,
			humidity: this.humidity,
			temperature: this.temperature,
			doorOpen: this.doorOpen,
			connected: (this.ws!=null),
			config: this.config,
			log: this.log,
			id: this.id
		} : {
			name: this.name,
			lastUpdate: this.lastUpdate,
			auto: this.auto,
			humidity: this.humidity,
			temperature: this.temperature,
			doorOpen: this.doorOpen,
			connected: (this.ws!=null),
			id: this.id,
			config: this.config
		}
	}
	
	notifyChanged(){
		this.emit('changed', this)
	}

	attatchWS(ws){
		if(this.ws!=null){
			console.warn(this.name + " has attemted to connect twice! Something is probably incorrectly configured. Refer to manual. This connection attempt will now probably fail.")
			this.deattatchWS()

		}
		console.log(this.name+" Connected")
		this.ws = ws
		this.ws.on('close', this.deattatchWS)
		this.ws.on('message', this.processMessage)
		this.syncToClient()
		this.notifyChanged()
		this.updateIsBeingWatched()
	}

	deattatchWS = () => {
		console.log(this.name+" Disconnected")
		try{
			this.ws.close()
			this.ws = null
			this.notifyChanged()
		}catch{

		}
	}

	processMessage = (data) => {
		let message = decodeFrom(data, this.key)
		if(message.type=="sync"){
			console.log(this.name + " has sent information")
			this.humidity = Math.floor(message.humidity),
			this.temperature = Math.floor(message.temperature),
			this.doorOpen = message.doorOpen,
			this.lastUpdate = new Date().getTime()
			if(message.forWatch){
				this.emit('watchSync', this)
			}else{
				this.notifyChanged()
			}
		}else if (message.type == "image"){
			this.image = message.image
			console.log("Received image from " + this.name)
			this.notifyChanged()
		}
	}

	syncToClient() {
		if(this.ws!=null){
			sendTo(this.ws,{type:"sync",
			auto: this.auto,
			config: this.config,
			id: this.id,
			syncHousesEveryMS: this.serverConfig.syncHousesEveryMS,
			syncHousesEveryWatchedMS: this.serverConfig.syncHousesEveryWatchedMS,
			offlineRecordTempEveryMS: this.serverConfig.offlineRecordTempEveryMS,
			managementTickMS: this.serverConfig.managementTickMS},this.key)
		}
	}

	updateIsBeingWatched() {
		if(this.ws!=null){
			sendTo(this.ws,{type:"watched?", isWatched: this.listenerCount('watchSync')},this.serverConfig.key)
		}
	}

	askToggleDoor(){
		if(this.ws != null){
			sendTo(this.ws,{type:"toggle door"},this.serverConfig.key)
		}
	}
}