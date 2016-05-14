// Description:
//   Allows hubot query bitcoin network and few bitcoin api
//
// Dependencies:
//   hubot-brain-redis
//
// Configuration:
//   none
//
// Commands:
//   btc list
//   btc add <address>
//   btc rm <address>
//   btc balance
//   btc check <address>
//
// Author:
//   Edouard SCHWEISGUTH <edznux@gmail.com> (https://edouard.schweisguth.fr)
//

function main(robot){

	var DEFAULT_PRICE_CURRENCY = "EUR";
	var SECOND_PRICE_CURRENCY = "USD";
	var SATOSHI = 100000000;

	var hu = require("./lib/hubot_utils.js");
	hu.setRobot(robot);
	var btc = require("./lib/bitcoin_utils.js");
	btc.setRobot(robot);

	robot.hear(/bitcoin( .*)?/i, function(res){
		if(res.message.rawText.match(/^bitcoin/i)){

			res.match[1] = res.match[1].trim();
			switch(true){
				case /check/.test(res.match[1]):
					_check(res);
					break;
				case /add/.test(res.match[1]):
					_addAddr(res);
					break;
				case /(rm)|(delete)|(remove)|(del)/.test(res.match[1]):
					_deleteAddr(res);
					break;
				case res.match[1] == "list":
					_getList(res);
					break;
				case /transaction (.*)/.test(res.match[1]):
					_getTransactionByAddr(res);
					break;
				case res.match[1] == "transaction":
					_getTransaction(res);
					break;
				case /balance (.*)/.test(res.match[1]) :
					_getBalanceByCurrency(res);
					break;

				case res.match[1] == "balance" :
					_getBalance(res);
					break;

				case res.match[1] == "price":
					_getPrice(res);
					break;
				case res.match[1] == "version":
						res.send(require("./package.json").version);
					break;

				case res.match[1] == "?":
				case res.match[1] == "help":
					res.send(getHelp());
					break;

				default:
					res.send(getHelp());
					break;
			}
		}
	});

	function getHelp(){
		return [
			"bitcoin commands",
				" - add <address> : Attach address to your user",
				" - list : list addresses from the current user",
				" - check <address> : Get balance from the address provided",
				" - balance : Get the balance of the current user",
				" - balance <€ or $>: Get the balance of the current user in the provided currency",
				" - transaction : List latest transaction of the current user",
				" - price : value of bitcoin",
				" - p : alias for price"
				].join("\n\t");
	}

	function _getBalance(res){
		var user = res.message.user.name.toLowerCase();
		var tmp = "";
		var total = 0;
		btc.getBalanceByUser(user, function(err,balances){
			if(err){
				res.send("Cannot get balance for user : "+msgErr, user);
				return;
			}
			data = balances.data;
			for(var i=0; i < data.length; i++){
				tmp += "Adress : [`" + data[i].addr + "`] balance : [`"+ parseFloat(data[i].balance/SATOSHI).toFixed(3) + " BTC`] \n";
				total += data[i].balance;
			}
			tmp += "-------\n";
			tmp += "Total : `" + parseFloat(total/SATOSHI).toFixed(3) + "` BTC over " + data.length + " account(s)";
			res.send(tmp);
		});
	}

	function _getBalanceByCurrency(res){
		var currency = res.match[1].split(" ")[1];

		var user = res.message.user.name.toLowerCase();
		btc.getBalanceByUser(user, function(err,balances){
			var tmp = "";
			var data = balances.data;
			var total = 0;
			var value;

			if(err){
				res.send("Cannot get balance for user :", user);
				return;
			}
			
			for(var i=0; i < data.length; i++){
				value = hu.btcToCurrency(data[i].balance/SATOSHI, currency).value;
				tmp += "Adress : [`" + data[i].addr + "`] balance : [`" + value +" "+ currency +"`] \n";
				total += value;
			}
			
			tmp += "-------\n";
			tmp += "Total : `" + total + currency + "` over " + data.length + " account(s)";
			
			res.send(tmp);
		});
	}

	function _getTransaction(res){
		var user = res.message.user.name.toLowerCase();
		btc.getTransactionByUser(user, function(err,data){
			if(err){
				console.error(err);
				res.send("Can't  get transation for the user :" + user);
				return;
			}
			var m, dateString;
			var tmp = "";
			// get only 10 last transaction
			for(var i = 0; i< data.txs.length && i < 10; i++){
				m = new Date(data.txs[i].time*1000);
				dateString = m.getUTCFullYear() +"/"+
					("0" + (m.getUTCMonth()+1)).slice(-2) +"/"+
					("0" + m.getUTCDate()).slice(-2) + " " +
					("0" + m.getUTCHours()).slice(-2) + ":" +
					("0" + m.getUTCMinutes()).slice(-2) + ":" +
					("0" + m.getUTCSeconds()).slice(-2);
				tmp += "From : [`" + data.txs[i].inputs[0].prev_out.addr + "`] to [`" + data.address + "`] Date " + dateString +"\n";
				console.log("========== ITERATION "+ i + "==================");
			}
			console.log("=====================END=========================");
			
			res.send("List of latest transactions : \n" + tmp);

		});
	}

	function _getTransactionByAddr(res){
		var user = res.message.user.name.toLowerCase();
		var tmp = res.match[1].split(" ");
		var addr = tmp[2];
		btc.getTransactionByAddr(addr, function(err,data){
			if(err){
				console.error(err);
			}
			res.send(data);
		});
	}

	function _getList(res){
		var user = res.message.user.name.toLowerCase();
		var tmp = "";
		hu.listAddrFromUser(user, function(err, data){
			if(err){
				res.send(err);
			}else{
				for(var i = 0; i<data.length; i++){
					tmp += data[i]+"\n";
				}
				res.send(tmp);
			}
		});
	}

	function _deleteAddr(res){
		var user = res.message.user.name.toLowerCase();
		var tmp = res.match[1].split(" ");

		console.log("remove address :", tmp[1], "from user :", user,"[",new Date(), "]");

		if(tmp.length < 2){
			res.send("Syntax error");
			return;
		}
		hu.deleteAddrToUser(tmp[1], user, function(err, data){
			if(err){
				res.send(err);
			}else{
				res.send(data);
			}
		});
	}

	function _addAddr(res){
		var user = res.message.user.name.toLowerCase();
		var tmp = res.match[1].split(" ");
		console.log("Add address :", tmp[1], "to user :", user, "[", new Date(), "]");

		if(tmp.length < 2){
			res.send("Syntax error");
			return;
		}
		hu.addAddrToUser(tmp[1], user, function(err, data){
			if(err){
				res.send(err);
			}else{
				res.send(data);
			}
		});
	}

	function _check(res){
		var tmp = res.match[1].split(" ");
		var addr = tmp[1];
		btc.getBalanceByAddr(addr, function(err, data){
			if(err){
				res.send("Cannot get balance of " + addr);
				return;
			}
			console.log(data.data[0].balance);
			res.send("Balance : `" + data.data[0].balance + "BTC`");
		});
	}
	function _getPrice(res){
		btc.getPrice(function(err, data){
			if(err){
				console.error("Erreur");
				res.send("Can't get price");
				return;
			}
			res.send("Current value of bitcoin : `"+ data[DEFAULT_PRICE_CURRENCY].last + "€" + " ($" + data[SECOND_PRICE_CURRENCY].last + ")`");
		});
	}
}

module.exports = main;
