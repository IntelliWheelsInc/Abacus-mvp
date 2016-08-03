/********************************************
 * SETTERS
 * Helper methods for updating linked objects
 *******************************************/

var _     = require('lodash');
var async = require('async');

var dbService = require('../db');
var generateUniqueID = require('../generateUniqueID');
var dbGetters = require('./getters');

function isValidID(id) {
	if (_.isString(id)) {
		return !_.isEmpty(id);
	} else if (_.isNumber(id)) {
		return id >= 0;
	}

	return false;
}

function getEntryID(entry) {
	if (entry.id || entry._id) {
		var entryID = entry.id || entry._id;
		return isValidID(entryID) ? entryID : null;
	} else {
		return null;
	}
}

 /**
 * Given a list of DB entries, updates their records in the DB
 * If a given entry is new (inferred by absence of an ID field), then a new entry is created for it
 * If a given entry is just a string or number, its inferred to be a ID, and
 * no update is done and the value for the entry is retrieved
 * Returns list of all entry values
 *
 * argsObj = {
 *	 db: <db instance from cloudant module>,
 *	 dbInsert: <(optional) custom insert method, defaults to db.insert>,
 *	 idField: <string representing name for idField>
 *	 entries: <list of entries to update>
 * }
 */
function updateOrInsertAllEntries(argsObj, cb) {
	var db = argsObj.db;
	var dbInsert = argsObj.dbInsert || db.insert; // in special cases (like Designs) can specify another insert function
	var idField = argsObj.idField;
	var entries = argsObj.entries;

	async.map(entries, function (entry, cb) {
		if (_.isObject(entry)) {
			// We're being given the object as a whole
			// Check if it has the id field...if it doesn't then create an entry for it
			if (entry[idField] && isValidID(entry[idField])) {
				var entryID = entry[idField];

				// update the entry
				dbInsert(entry, entryID, function (err, res) {
					if (err) {
						cb(err);
					} else {
						entry._rev = res.rev; // update the revision number
						cb(null, entry); // updated the entry succesfully...return the entry value
					}
				});
			} else {
				// No ID field present, must be a new object so create an entry for it
				dbInsert(entry, function (err, res) {
					if (err) {
						cb(err);
					} else {
						entry._rev = res.rev; // update the revision number
						entry._id = res.id;
						cb(null, entry); // created the entry succesfully...return the entry value
					}
				});
			}
		} else if (_.isString(entry) || _.isNumber(entry)) {
			// We're being given the ID for an object
			var entryID = entry;

			if (!isValidID(entryID)) {
				return cb(new Error(`Bad ID Value: ${entryID}`));
			}

			db.get(entryID, function (err, entryValue) {
				if (err) {
					cb(err);
				} else {
					cb(null, entryValue); // read the entry succesfully...return the entry value
				}
			});
		} else {
			cb(new Error("Bad Entry Value:\n" + JSON.stringify(entry, null, 2)));
		}
	}, cb);
}

// Expose updateOrInsertAllEntries function
exports.updateOrInsertAllEntries = updateOrInsertAllEntries;

// Method to insert a Design instance into the DB
// Design insertion is a special case because if you want to create a new entry,
// The ID for it must be generated by an external generateUniqueID function
function insertDesign(designValue, id, cb) {
	if (_.isFunction(id)) {
		// No ID given, so must create a new entry for the given design
		cb = id;
		id = null;
		generateUniqueID(dbService.designs, function (err, generatedID) {
			if (err) {
				cb(err);
			} else {
				dbService.designs.insert(designValue, generatedID, (err, res) => {
					if (err) {
						cb(err);
					} else {
						// attach revision stamp and id
						designValue._id = res.id;
						designValue._rev = res.rev;
						designValue.id = res.id;
						designValue.rev = res.rev;
						cb(null, designValue);
					}
				});
			}
		});
	} else {
		// An ID is specified, so update the design with that given ID
		dbService.designs.insert(designValue, id, (err, res) => {
			if (err) {
				cb(err);
			} else {
				// attach revision stamp
				designValue._rev = res.rev;
				designValue.rev = res.rev;
				cb(null, designValue);
			}
		});
	}
}

exports.insertDesign = insertDesign;

// Updates all linked Order fields: wheelchairs
function updateLinkedOrderFields(orderObj, cb) {
	var wheelchairs = _.isArray(orderObj.wheelchairs) ? orderObj.wheelchairs : [];
	updateOrInsertAllEntries({
		db: dbService.designs,
		dbInsert: insertDesign,
		idField: '_id',
		entries: wheelchairs
	}, function (err, wheelchairs) {
		if (err) {
			cb(err);
		} else {
			orderObj.wheelchairs = wheelchairs; // set the wheelchairs field appropriately

			cb(null, orderObj);
		}
	});
}

exports.updateLinkedOrderFields = updateLinkedOrderFields;

function getMinimizedOrderEntry(order) {
	var designs = _.isArray(order.wheelchairs) ? order.wheelchairs : [];
	var designIDs = _.reject(_.map(designs, getEntryID), _.isNull);

	var discounts = _.isArray(order.discounts) ? order.discounts : [];
	var discountIDs = _.reject(_.map(discounts, getEntryID), _.isNull);

	var clonedOrder = _.clone(order);
	clonedOrder.wheelchairs = designIDs;
	clonedOrder.discounts = discountIDs;

	return clonedOrder;
}

exports.getMinimizedOrderEntry = getMinimizedOrderEntry;

/**
 * Insert the given order
 * If no id is given, this will create a new order
 *
 * NOTE:
 * DOES NOT update each corresponding order's discounts. It will just set the order.discounts to be an
 * array of IDs for the discounts that were already in the given order.
 * Validation that the discount IDs are actual discount IDs in the DB should be done when the order is being sent
 */
function insertOrder(order, id, cb) {
	if (_.isFunction(id)) {
		// No ID is given, must create a new order entry
		cb = id;
		id = null;

		updateLinkedOrderFields(order, function (err, updatedOrder) {
			if (err) {
				cb(err);
			} else {
				const minOrder = getMinimizedOrderEntry(updatedOrder);
				dbService.orders.insert(minOrder, (err, res) => { // insert the minorder, not the full order
					if (err) {
						cb(err);
					} else {
						// attach the revision stamp and the id
						updatedOrder._rev = res.rev;
						updatedOrder._id = res.id;
						updatedOrder.rev = res.rev;
						updatedOrder.id = res.id;
						cb(null, updatedOrder); // return the full order, not the minOrder
					}
				});
			}
		});
	} else {
		// ID was given, update corresponding record after updating linked records
		updateLinkedOrderFields(order, function (err, updatedOrder) {
			if (err) {
				cb(err);
			} else {
				const minOrder = getMinimizedOrderEntry(updatedOrder);
				// update the order with the given id, but use the minOrder as the DB entry
				dbService.orders.insert(minOrder, id, (err, res) => { // insert the minorder, not the full order
					if (err) {
						cb(err);
					} else {
						updatedOrder._rev = res.rev; // update the revision stamp
						updatedOrder.rev = res.rev;
						cb(null, updatedOrder); // return the full order, not the minOrder
					}
				});
			}
		});
	}
}

exports.insertOrder = insertOrder;

// Updates all linked User fields: orders, savedDesigns, & cart
function updateLinkedUserFields(userObj, cb) {
	var updateOrders = function (cb) {
		var orders = userObj.orders || [];
		updateOrInsertAllEntries({
			db: dbService.orders,
			dbInsert: insertOrder,
			idField: '_id',
			entries: orders
		}, cb);
	};

	var updateSavedDesigns = function (cb) {
		var savedDesigns = userObj.savedDesigns || [];
		updateOrInsertAllEntries({
			db: dbService.designs,
			dbInsert: insertDesign,
			idField: '_id',
			entries: savedDesigns
		}, cb);
	};

	var updateCart = function (cb) {
		var cart = userObj.cart;
		if (_.isString(cart)) {
			// it's just the cart's order id, get the order and return it
			dbService.order.get(cart, cb);
		} else if (_.isNull(cart)) {
			// User doesnt have a cart order yet...just return null for it then
			process.nextTick(function () {
				cb(null, null);
			});
		} else if (_.isObject(cart)) {
			updateOrInsertAllEntries({
				db: dbService.orders,
				dbInsert: insertOrder,
				idField: '_id',
				entries: [cart]
			}, function (err, cartArr) {
				if (err) {
					cb(err);
				} else {
					const cart = _.first(cartArr);
					console.log(cart)
					cb(null, cart);
				}
			});
		} else {
			cb(new Error("Bad Cart Value:\n" + JSON.stringify(cart, null, 2)));
		}
	};

	// Execute all these updates in parallel
	async.parallel({
		'orders': updateOrders,
		'savedDesigns': updateSavedDesigns,
		'cart': updateCart
	}, function (err, results) {
		if (err) {
			cb(err);
		} else {
			userObj.orders =results.orders;
			userObj.savedDesigns = results.savedDesigns;
			userObj.cart = _.isNull(results.cart) ? null : results.cart; // when a user doesnt have a cart, its null. Must check

			cb(null, userObj);
		}
	});
}

exports.updateLinkedUserFields = updateLinkedUserFields;

/**
 * Given a User object with all linked fields completely populater,
 * Returns same user object with linked fields only referencing data via IDs
 */
function getMinimizedUserEntry(userObj) {
	const userOrders       = _.isArray(userObj.orders) ? userObj.orders : [];
	const userSavedDesigns = _.isArray(userObj.savedDesigns) ? userObj.savedDesigns : [];

	const orderIDs       = _.reject(userOrders.map(getEntryID), _.isNull);
	const cartID         = userObj.cart ? getEntryID(userObj.cart) : null;
	const savedDesignIDs = _.reject(userSavedDesigns.map(getEntryID), _.isNull);

	const userCopy = _.clone(userObj);

	userCopy.orders       = orderIDs;
	userCopy.cart         = cartID;
	userCopy.savedDesigns = savedDesignIDs;

	return userCopy;
}

exports.getMinimizedUserEntry = getMinimizedUserEntry;

function insertUser(user, id, cb) {
	if (_.isFunction(id)) {
		// No ID is given, must create a new user entry
		cb = id;
		id = null;

		updateLinkedUserFields(user, function (err, updatedUser) {
			if (err) {
				cb(err);
			} else {
				// only store IDs of linked fields in the user entry
				const minUser = getMinimizedUserEntry(updatedUser);
				// create the new user entry
				dbService.users.insert(minUser, (err, res) => {
					if (err) {
						cb(err);
					} else {
						// attach the revision stamp and the id
						updatedUser._rev = res.rev;
						updatedUser._id = res.id;
						updatedUser.rev = res.rev;
						updatedUser.id = res.id;
						cb(null, updatedUser);
					}
				});
			}
		});
	} else {
		// ID was given, update corresponding record after updating linked records
		updateLinkedUserFields(user, function (err, updatedUser) {
			if (err) {
				cb(err);
			} else {
				// only store IDs of linked fields in the user entry
				const minUser = getMinimizedUserEntry(updatedUser);
				// update the order with the given id
				dbService.users.insert(minUser, id, (err, res) => {
					if (err) {
						cb(err);
					} else {
						updatedUser._rev = res.rev; // update the revision stamp
						updatedUser.rev = res.rev;
						cb(null, updatedUser);
					}
				});
			}
		});
	}
}

exports.insertUser = insertUser;

