const EventEmitter = require('events')
const { sendTo, decodeFrom } = require('./MessageUtil')

module.exports = class ClientSocket extends EventEmitter {

	key
	ws
	
	//global lists
	hoopHouses
	clients

	constructor(websocket, config, clients, hoopHouses){
		super()
		this.key = config.key
		this.ws = websocket
		this.clients = clients
		this.hoopHouses = hoopHouses
		this.ws.on('message', this.processMessage)
		this.ws.on('close', this.onEnd)
		this.ws.on('error', this.onEnd)

		sendTo(websocket, {type:"ok, go"}, this.key) //Tell client it's okay to start asking for things
	}

	hookIntoAll(){

	}




	processMessage = (data) => { //arrow function used to avoid "this" change
		let message = decodeFrom(data, this.key)
		
		switch (message.type) {
			case "list-all":
				this.hoopHouses.forEach((hoop, index) => {
					sendTo(this.ws,{type:"house", hoop: hoop.serialize(), index: index},this.key)
				});
				
				break;
		
			default:
				break;
		}
	}

	onEnd = () =>{
		this.emit('detatch', this)

		let index = this.clients.indexOf(this)
		console.log("Client detatched.")
		if(index >= 0){
			this.clients.splice(this.clients.indexOf(this), 1)
			console.log(`Clients (now at ${this.clients.length}) -> [X]`)
		}
	}

}