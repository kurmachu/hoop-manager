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
		this.hookIntoAll()
	}

	hookIntoAll(){
		this.hoopHouses.forEach((hoop)=>{
			hoop.on('changed',this.doChange)
		})
	}

	doChange = (hoop) => {
		sendTo(this.ws,{type:"house", hoop: hoop.serialize(), index: this.hoopHouses.indexOf(hoop)},this.key)
	}

	processMessage = (data) => { //arrow function used to avoid "this" change
		let message = decodeFrom(data, this.key)
		
		switch (message.type) {
			case "list all":
				this.hoopHouses.forEach((hoop, index) => {
					sendTo(this.ws,{type:"house", hoop: hoop.serialize(), index: index},this.key)
				});
				sendTo(this.ws,{type:"done"},this.key)
				break;

			case "watching":
				this.watchIndex(message.index)
				break;

			case "not watching":
				this.unwatch()
				break;

			case "save":
				try{
					let h = this.hoopHouses[message.index]
					h.name = message.name
					h.notifyChanged()
					sendTo(this.ws,{type:"done"},this.key)
				}catch(e){
					console.error("Failed to update hoop house")
					console.error(message)
					console.error(e)
				}

			default:
				break;
		}
	}

	onEnd = () =>{
		this.emit('detatch', this)

		this.unwatch()
		let index = this.clients.indexOf(this)
		console.log("Client detatched.")
		if(index >= 0){
			this.clients.splice(this.clients.indexOf(this), 1)
			console.log(`Clients (now at ${this.clients.length}) -> [X]`)
		}
		this.hoopHouses.forEach((hoop)=>{
			hoop.off('changed', this.doChange)
		})
	}


	requestRefresh(){
		sendTo(this.ws,{type:"please reload"},this.key)
	}

	watchedID = -1
	watchIndex(index){
		this.unwatch()
		this.hoopHouses[index].on('watchSync', this.onWatch)
		this.hoopHouses[index].updateIsBeingWatched()
		this.watchedID = index
		console.log("Client now watching "+ this.hoopHouses[this.watchedID].name)
	}

	onWatch = (house)=>{
		sendTo(this.ws,{type:"house", hoop: house.serialize(), index: this.watchedID},this.key)
	}

	unwatch(){
		if(this.watchedID>=0){
			console.log("Client unwatching "+ this.hoopHouses[this.watchedID].name)
			this.hoopHouses[this.watchedID].off('watchSync',this.onWatch)
			this.hoopHouses[this.watchedID].updateIsBeingWatched()
			this.watchedID = -1
		}
	}
}