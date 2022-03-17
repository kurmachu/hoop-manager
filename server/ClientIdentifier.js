const EventEmitter = require('events')
const { sendTo, decodeFrom } = require('./MessageUtil')

module.exports = class ClientIdentifier extends EventEmitter {

	key
	websocket

	constructor(websocket, config){
		super()
		this.key = config.key;
		this.websocket = websocket
		this.websocket.send(JSON.stringify({type: "hello",useIdentification: config.key? true : false}))
		this.websocket.on('message', this.processMessage)
	}

	processMessage = (data) => { //arrow function used to avoid "this" change
		data = decodeFrom(data, this.key)
		if(data.type=="am client"){
			console.log("Identified client connection")
			this.emit('found-client', this)
		}else if(data.type=="am hoop"){
			if(!data.id){
				this.websocket.close(4002, "Okay but which one")
				console.log("Kicking supposed hoophouse: failed to provide id -> [X]")
			}
			console.log("Identified hoophouse connection")
			this.emit('found-hoop', this, data.id)
		}else if(data.type=="am new hoop"){
			if(!data.initialFrame){
				console.log("Kicking supposed new hoophouse: failed to provide initial frame -> [X]")
				this.websocket.close(4002, "Initial frame missing")
				return
			}
			console.log("Identified new hoophouse connection")
			this.emit('found-new-hoop', this, data.initialFrame)
		}else if(data.type=="error"){
			console.log("Kicking unidentified client: failed to identify -> [X]")
			this.websocket.close(4002, "Failed to identify")
		}
	}

	eject() {
		this.websocket.off('message', this.processMessage)
		return this.websocket
	}
}