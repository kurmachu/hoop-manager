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
			id: this.id
		}
	}
	
	notifyChanged(){
		this.emit('changed', this)
	}

	attatchWS(ws){
		this.ws = ws
		this.ws.on('close', this.deattatchWS)
		this.syncToClient()
	}

	deattatchWS = () => {
		console.log(this.name+" Disconnected")
		this.ws.close()
		this.ws = null
		this.notifyChanged()
	}

	syncToClient() {
		if(this.ws!=null){
			sendTo(this.ws,{type:"sync", auto: this.auto, config: this.config, id: this.id, syncHousesEveryMS: this.config.syncHousesEveryMS, syncHousesEveryWatchedMS: this.config.syncHousesEveryWatchedMS, offlineRecordTempEveryMS: this.config.offlineRecordTempEveryMS,},this.key)
		}
	}
}