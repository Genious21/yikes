// set up defaults
var spots = Array();
var teams = Array();
var teamsTurn = 0;

var numberOfSpots = 0;		// number of good spots
var numberOfBugs = 0;		// additional spots that are bugs
var currentPoints = 0;		// number of points earned this turn for current player

var minPoints = 1;			// lowest possible points per spot
var maxPoints = 12;			// max possible points per spot
var retryLimit = 200;		// don't try to find an empty place for a spot more than this # of times

var circlePadding = 5;		// same as padding of style for circle

var priorSpot = -1;        // to help determine if this is a second tap
var spotTapCount = 0;     // first tap - shake, send tap - flip

function addTeams(numTeams) {
	var team = {
		name: 'Red',
		colorClass: 'redb',
		points: 0
	};
	teams[0] = team;

	if (numTeams > 1) {
		team = {
			name: 'Blue',
			colorClass: 'blueb',
			points: 0
		};
		teams[1] = team;
	}

	if (numTeams > 2) {
		team = {
			name: 'Green',
			colorClass: 'greenb',
			points: 0
		};
		teams[2] = team;
	}

	if (numTeams > 3) {
		team = {
			name: 'Yellow',
			colorClass: 'yellowb',
			points: 0
		};
		teams[3] = team;
	}

	for (var j = 0; j < teams.length; j++) {
		var d = document.createElement("div");
		d.innerHTML = "<div class='name'></div><div class='points'>0</div>";
		d.setAttribute("class", "team " + teams[j].colorClass + (j === 0 ? ' myturn' : ''));
		d.setAttribute("team", j.toString());
		$(d).children('div.name').first().text(teams[j].name);
		teams[j].element = d;
		$('#scoreboard div.teams')[0].appendChild(d);
	}
}

function isValueInRange(value, min, max) {
	return (value <= max) && (value >= min);
}

function isOverlapping(A, B, buffer) {
	var xOverlap = isValueInRange(A.x, B.x - buffer, B.x + B.width + buffer) || isValueInRange(B.x, A.x - buffer, A.x + A.width + buffer);
	var yOverlap = isValueInRange(A.y, B.y - buffer, B.y + B.height + buffer) || isValueInRange(B.y, A.y - buffer, A.y + A.height + buffer);
	return xOverlap && yOverlap;
}

function makeSpots(farm, numberOfSpots, numberOfBugs, typeOfBug) {
	if (farm) {
		// try to figure out the spacing of the circleDiameter
		var d = document.createElement("div");
		d.className = "spot";
		farm.appendChild(d);
		var circleDiameter = $(d).width();	// same as width and height of style of circle
		farm.removeChild(d);

		var gridHeight = farm.clientHeight - circleDiameter - circlePadding * 2;
		var gridWidth = farm.clientWidth - circleDiameter - circlePadding * 2;

		var retries = 0;
		// don't retry to find a spot more than retryLimit times
		var totalspots = numberOfSpots + numberOfBugs;
		for (var i = 0; i < totalspots && retries < retryLimit;) {
			var spot = {};
			spot.x = Math.floor(Math.random()*(gridWidth));
			spot.y = Math.floor(Math.random()*(gridHeight));
			spot.width = circleDiameter + circlePadding;
			spot.height = spot.width;
			spot.points = Math.floor(Math.random()*maxPoints)+minPoints;

			//var collision = false;
			// indicate collision if already behind the scoreboard
			var collision = (spot.x + spot.width > $('#scoreboard')[0].offsetLeft &&
				spot.y - spot.height < $('#scoreboard')[0].offsetTop + $('#scoreboard')[0].offsetHeight);
			// indicate collision with another spot
			for (var j = 0; j<i && !collision; j++) {
				collision = isOverlapping(spot, spots[j], 10);
			}

			if (collision) {
				retries++;
				continue;
			}
			retries = 0;

			spots[i] = spot;
			i++;
		}

		// make sure we have the requisite number of bugs
		for (var j = 0; j < numberOfBugs && j < i; j++) {
			spots[j].points = 0;
		}

		// only show setup info if we could not meet their request
		if (retries >= retryLimit) {
			console.log('bailed out -- not enough room for all those spots');
			$('#scoreboard .info').text(i.toString() + '/' + j.toString());
		}

		// add spots to dom
		for (var j = 0; j < i; j++) {
			// create the spot html element to display
			var d = document.createElement("div");
			d.className = "spot " + (spots[j].points == 0 ? 'bug ' + typeOfBug : '');
			d.style.top = spots[j].y.toString() + "px";
			d.style.left = spots[j].x.toString() + "px";
			d.innerHTML = "<div class='front shadow'></div>" +
				"<div class='back shadow'><span>" + spots[j].points.toString() + "</span></div>";
			d.setAttribute("spot", j.toString());
			farm.appendChild(d);
			spots[j].element = d;
		}
	}
}

function resetGame() {
	// reset spots
	spots = Array();
	// remove any preexisting spots from the dom
	$('div#farm .spot').remove();

	// set up the teams
	teams = Array();
	// remove all preexisting team objects from dom
	$('#scoreboard .teams').children('div.team').remove();

	teamsTurn = 0;
	currentPoints = 0;

	indicateWinningTeam();
}

function indicateWinningTeam() {
	var winningTeam = -1;
	var winningPoints = 0;
	for (var j = 0; j < teams.length; j++)
	{
		if (teams[j].points >= winningPoints) {
			winningTeam = j;
			winningPoints = teams[j].points;
		}
	}

	// todo: what to do if there is a tie?

	if (winningTeam != -1 && winningPoints > 0) {
		$('.watermark').attr('class', 'watermark ' + teams[winningTeam].colorClass.substring(0, teams[winningTeam].colorClass.length - 1));
	} else
	{
		$('.watermark').attr('class', 'watermark');
	}
}

function startGame() {
	resetGame();

	$('#scoreboard').show();

	var typeOfBug = localStorage["critter"];

	addTeams(localStorage["teams"]);
	makeSpots($("#farm")[0], parseInt(localStorage["spots"]), parseInt(localStorage["bugs"]), typeOfBug);

	// set up click/tap panels
	$('.spot').on('click', function() {
		// uncover
		if ($(this).hasClass('flip')) {
			// don't do anything because it has already been flipped
		}
		else
		{
      // if it has not been shaken yet, then shake it
      var id = parseInt($(this).attr("spot"));
      if (priorSpot != id) {
        priorSpot = id;
        $(this).find('.front').effect('shake');
      } else {
        // make it flip over
  			$(this).addClass('flip');
  			$(this).children('.back').first().addClass(teams[teamsTurn].colorClass);
  			$(this).attr("team", teamsTurn.toString());

  			var points = spots[parseInt($(this).attr("spot"))].points;

  			// add points to current team
  			if (points === 0) {
  				// it's a bug!
  				$(this).addClass('bug');

  				// zero score
  				teams[teamsTurn].points -= currentPoints;
  				$(teams[teamsTurn].element).children('div.points').first().text(teams[teamsTurn].points.toString());

  				// move to next team
  				// set that team as active team
  				$(teams[teamsTurn].element).removeClass('myturn');

  				currentPoints = 0;
  				teamsTurn++;
  				if (teamsTurn >= teams.length)
  					teamsTurn = 0;
  				$(teams[teamsTurn].element).addClass('myturn');
          $(teams[teamsTurn].element).effect('pulsate', 10);
  			} else {
  				currentPoints += points;
  				teams[teamsTurn].points += points;
  				$(teams[teamsTurn].element).children('div.points').first().text(teams[teamsTurn].points.toString());
  			}

  			indicateWinningTeam();
      }
		}
	});

	$('.team').click(function() {
		// set that team as active team
		$(teams[teamsTurn].element).removeClass('myturn');

		teamsTurn = parseInt($(this).attr('team'));
		$(teams[teamsTurn].element).addClass('myturn');
    $(teams[teamsTurn].element).effect('pulsate', 10);
		currentPoints = 0; // this round
    priorSpot = -1; // no prior spot
	});

}

$(document).ready(function () {
	// check the index.html for setup info, if none default
	if (localStorage["spots"] == null) {
		// initialize here

		localStorage["spots"] = "24";
		localStorage["bugs"] = "4";
		localStorage["teams"] = "4";
		localStorage["critter"] = "shark";
	}

	// set the name of the game to the critter chosen
	$(".watermark").text(localStorage["critter"] + "!");

	// set up the reset button
	//$('#scoreboard button').click(function () {
	//	return confirm('Are you sure you want to reset the game?');
	//});

  $('.setup-button').on('click', function () {
    window.location.href = '/setup.html';
  });

	startGame();
});
