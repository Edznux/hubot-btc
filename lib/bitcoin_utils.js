var https = require("https");
var hu = require("./hubot_utils.js");
var interval = 60*10*1000; // 10 min interval in ms



/**
* Just needed for robot.brain.set and get functions
*/
var setRobot = function(r){
	robot = r;
};
module.exports.setRobot = setRobot;

/**
* Return balance for the address provided in parameters
* Params:
* 	- addr : string of the address.
*	- callback : callback function. (err, data);
*/
var getBalanceByAddr = function(addr, callback){
	var baseUrl = "https://blockchain.info/address/";
	var addr_call = baseUrl+addr+"?format=json";
	https.get(addr_call,function(res){
		var data="";
		var err = null;

		res.on('data', function(d) {
			data+=d;
		});

		res.on('end', function(){
			try{
				data = JSON.parse(data);
				callback(null, data.final_balance);
			}catch(e){
				console.log('Error while getting balance of addr : '+ addr +' : ', e);
				return callback("Error while getting balance", null);
			}
		});
	});
};
module.exports.getBalanceByAddr = getBalanceByAddr;

/**
* Return balance for all address of an user
* Params:
* 	- user : string of the user (name/UID).
*	- callback : callback function. (err, data);
*/
var getBalanceByUser = function(user, callback){
	hu.listAddrFromUser(user, function(err, list){
		var accounts = {};
			accounts.data = [];
		var done = 0;

		if(err){
			return callback(err, null);
		}

		if(list.length == 0){
			return callback("No addresses found", null);
		}

		for(var i = 0; i < list.length; i++){
			(function(l, index, output){
				var addr = l[index];
				getBalanceByAddr(addr, function(err, data){
					done++;

					if(err){
						return callback(err, null);
					}

					accounts.data.push({"addr" : addr, "balance" : data});

					console.log(done + '/' + l.length);

					if(done == l.length){
						return callback(null, accounts);
					}
				});
			})(list, i, accounts);
		}

	});
};
module.exports.getBalanceByUser = getBalanceByUser;

/*
* Return all transaction made (well, actually, only the first "page") by address
* Params:
* 	- addr : string of the address.
*	- offset : page number
*	- callback : callback function. (err, data);
*/
var getTransactionByAddr = function(addr, offset, callback){
	// set default and errored offset to 0
	if(!offset || offset < 0){
		offset = 0;
	}
	var baseUrl = "https://blockchain.info/address/";
	var addr_call = baseUrl+addr+"?format=json";

	https.get(addr_call,function(res){
		var data="";

		res.on('data', function(d) {
			data+=d;
		});

		res.on('end', function(){
			try{
				data = JSON.parse(data);
				callback(null, data);
			}catch(e){
				console.error('Error while getting transactions : ', e);
				callback("Error while getting transactions" + e, null);
			}
		});
	});
};
module.exports.getTransactionByAddr = getTransactionByAddr;

/**
* Return all transaction made (well, actually, only the first "page") by an user
* Params:
* 	- user : string of the user (name/UID).
*	- callback : callback function. (err, data);
*/
var getTransactionByUser = function(user, callback){
	hu.listAddrFromUser(user, function(err, list){
		var tx = [];
		var done = 0;

		if(err){
			return callback(err, null);
		}
		for(var i = 0; i < list.length; i++){
			(function(l, index, output){
				var addr = l[index];
				getTransactionByAddr(addr, 0,function(err, data){

					if(err){
						return callback(err, null);
					}
					// tx = tx.concat(data.txs);
					tx = data;
					done++;

					console.log(done + '/' + l.length);

					if(done == l.length){
						return callback(null, tx);
					}
				});
			})(list, i, tx);
		}
	});
};
module.exports.getTransactionByUser = getTransactionByUser;

/**
* Private method for getting price of bitcoin from different currency :
* usd, eur, cny, gbp, cad, rub, hkd, jpy, aud, btc 
* This request provide price, market cap, supply and volume
*/
var _getPrice = function(callback){
	var http = require("https");

        var addr_call = "https://blockchain.info/ticker"
	var req = http.get(addr_call, function (res) {
		var chunks = [];

		res.on("data", function (chunk) {
			chunks.push(chunk);
		});

		res.on("end", function () {
			var body = Buffer.concat(chunks);
			try{
				var data = JSON.parse(body);
				data.requestTimestamp = Date.now();
				if(data.error){
					return callback("Error, [data.error = " + data.error+"]", null);
				}
				callback(null, data);

			}catch(e){
				console.error('Error while getting price : ', e);
				callback("Error while getting price" + e, null);
			}
		});
	});

	req.end();
};

/**
* Wrapper for getPrice, get price from memory instead of request whenever possible.
*/
var getPrice = function(callback){
	var _price = robot.brain.get("bitcoin_price");

	if(!_price){
		console.warn("Empty brain")
		_getPrice(callback);
		return;
	}

	if( parseInt(_price.requestTimestamp) - interval < Date.now() ){
		console.warn("get price from internet");
		_getPrice(callback);
	}else{
		console.warn("get price from memory");
		callback(null, robot.brain.get("bitcoin_price"));
	}
};
module.exports.getPrice = getPrice;

/**
* Care : Writing to requestTimestamp instead of timestamp on the "data" object.
* The actual "timestamp" object is not the timestamp of the request but the timestamp of the update in their system.
*/
function init(){

	_getPrice(function(err, data){
		console.warn("Get price init");
		if(err){
			console.error("Error in getPrice", err);
			return;
		}

		data.requestTimestamp = Date.now();
		robot.brain.set("bitcoin_price", data);
	});

	setInterval(function(){
		console.warn("Starting getPrice interval");
		_getPrice(function(err, data){
			if(err){
				console.error("Error in getPrice", err);
			}
			data.requestTimestamp = Date.now();
			robot.brain.set("bitcoin_price", data);
		});
	},interval);
}
init();
