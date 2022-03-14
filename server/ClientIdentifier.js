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
		if(data.type=="am-client"){
			console.log("Identified client connection")
			this.emit('found-client', this)
		}else if(data.type=="error"){
			console.log("Kicking unidentified client: failed to identify -> [X]")
			this.websocket.close(1003)
		}
	}
}