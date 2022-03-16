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
	config
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

		this.config = config
		this.key = this.config.key
	}

	serialize() {
		return {
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
		}
	}
}