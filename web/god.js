var houses = [{
	name: "Tomatoes",
	doorOpen: false,
	auto: true,
	temperature: 21,
	humidity: 95,
	lastUpdate: new Date().getTime(),
	connected: false,
	config: [],
	id: "test"
}]

function updatePreviewCards(){
	houses.forEach((hoopHouse, i)=>{
		let card
		if (i<$('.hoophouse-card').length){
			card = $($('.hoophouse-card')[i])
		}else{
			card = inflatePreviewCard()
		}

		card.find('h1').text(hoopHouse.name)
		card.find('.temp').text(hoopHouse.temperature)
		card.find('.humid').text(hoopHouse.humidity+"%")

		card.find('.last-update-text').text("Last updated: " + produceLastUpdateString(new Date().getTime() - hoopHouse.lastUpdate))

		let chips = card.find('.card-status-chips')
		chips.children().remove()

		chips.append(inflateChip("sensor_door",hoopHouse.doorOpen? "Open" : "Closed", hoopHouse.doorOpen? "door-open" : "door-closed"))
		chips.append(inflateChip(hoopHouse.auto? "settings_suggest" : "gamepad",hoopHouse.auto? "Auto" : "Manual", hoopHouse.auto? "door-auto" : "door-manual"))
		if(!hoopHouse.connected){
			chips.append(inflateChip("wifi_off","Disconnected", "chip-disconnected"))
			card.find('.hoop-img-cover div').text('wifi_off').fadeIn()
		}
		
	})
}

window.setTimeout(()=>{
	updatePreviewCards()
},30*1000)
updatePreviewCards()

function inflatePreviewCard(){
	let newCard = $(`<section class="hoophouse-card">
						<div class="hoop-img-container">
							<img class="hoop-img" src="" alt="">
							<div class="hoop-img-cover">
								<div class="material-icons">hourglass_top</div>
							</div>
						</div>
						<div class="card-info">
							<div class="split-panel mostly-left">
								<div class="left">
									<h1>...</h1>
								</div>
								<div class="right" style="text-align: end;">
									<div class="readouts">
										<div class="readout"><span class="material-icons">thermostat</span><span class="temp">..</span></div>
										<div class="readout"><span class="material-icons">water_drop</span><span class="humid">..</span></div>
									</div>
									
								</div>
							</div>
							<div class="card-status-chips">
								<p>...</p>
							</div>
							<p class="last-update-text">Updating...</p>
						</div>
					</section>`)
	$('.page.overview > .coltainer').append(newCard)
	return newCard
}

function inflateChip(icon, text, cssClass) {
	return $(`<span class="status-chip ${cssClass}"><span class="material-icons">${icon}</span><span>${text}</span></span>`)
}

function produceLastUpdateString(time){
	if (time < 10*1000){
		return "Just now"
	}else if (time < 60*1000){
		return "This minute"
	}else if (time < 2 * 60 * 1000) {
		return "A minute ago"
	}else if (time < 60 * 60 * 1000) {
		return `${Math.floor(time/(60*1000))} minutes ago`
	}else if (time < 2 * 60 * 60 * 1000){
		return `An hour ago`
	}else if (time < 24 * 60 * 60 * 1000){
		return `${Math.floor(time/(60 * 60 * 1000))} hours ago`
	}else if (time < 2 * 24 * 60 * 60 * 1000){
		return `A day ago`
	}else if (time < 7 * 24 * 60 * 60 * 1000){
		return `${Math.floor(time/(24 * 60 * 60 * 1000))} days ago`
	}else if (time < 2 * 7 * 24 * 60 * 60 * 1000){
		return `Over a week ago`
	}else{
		return `A long time ago`
	}
}